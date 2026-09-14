import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const auth = await authorizeAdminOperation(req, null);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  if (auth.role === 'custom') {
    const perms = auth.permissions || {};
    const hasManagementPerm = ['students', 'teachers', 'courses', 'users', 'certificates', 'reports', 'settings']
      .some(k => perms[k] === 'view' || perms[k] === 'full');
    if (!hasManagementPerm) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to view management overview.'
      });
    }
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  try {
    const [
      batchesRes,
      admissionsRes,
      teachersRes,
      coursesRes,
      certificatesRes,
      usersRes
    ] = await Promise.all([
      supabase.from('batches').select('id, course, batch_name, time_shift, status, created_at, capacity, start_date, end_date, start_time, end_time, timing_label, notes').order('created_at', { ascending: false }),
      supabase.from('admissions').select('id, name, course, batch, status, phone, email, submitted_at, approved_at').order('submitted_at', { ascending: false }),
      supabase.from('teachers').select('id, name, cnic, phone, email, specialization, status, created_at').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title, duration, created_at'),
      supabase.from('certificates').select('id, certificate_id, student_name, student_cnic, course, batch, issue_date, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('users').select('id, full_name, email, role, status, created_at').order('created_at', { ascending: false })
    ]);

    const allBatches = batchesRes.data || [];
    const allAdmissions = admissionsRes.data || [];
    const allTeachers = teachersRes.data || [];
    const allCourses = coursesRes.data || [];
    const allCertificates = certificatesRes.data || [];
    const allUsers = usersRes.data || [];

    const activeStudents = allAdmissions.filter(a => (a.status || '').toLowerCase() === 'active');
    const totalStudents = allAdmissions.length;
    const activeTeachers = allTeachers.filter(t => (t.status || '').toLowerCase() === 'active');
    const pendingTeachers = allTeachers.filter(t => (t.status || '').toLowerCase() === 'pending');

    const activeBatches = allBatches.filter(b => {
      const s = (b.status || '').toLowerCase();
      return s === 'active' || s === 'running' || s === 'ongoing' || !s;
    });

    const staffUsers = allUsers.filter(u => (u.role || '').toLowerCase() !== 'student');

    // Batch capacity map
    const studentCountByBatch = new Map();
    activeStudents.forEach(st => {
      if (st.batch) {
        const key = st.batch.trim();
        studentCountByBatch.set(key, (studentCountByBatch.get(key) || 0) + 1);
      }
    });

    const batchCapacityTelemetry = activeBatches.map(b => {
      const batchName = b.batch_name || 'Unnamed Batch';
      const enrolled = studentCountByBatch.get(batchName.trim()) || 0;
      const capacity = Number(b.capacity) || 30;
      const fillRate = Math.min(100, Math.round((enrolled / capacity) * 100));

      let health = 'Optimal';
      if (fillRate >= 100) health = 'Full';
      else if (fillRate >= 80) health = 'Filling Fast';

      return {
        id: b.id,
        batch_name: batchName,
        course: b.course || 'General',
        time_shift: b.time_shift || b.timing_label || 'Regular',
        status: b.status || 'Active',
        capacity,
        enrolled,
        fillRate,
        health,
        start_date: b.start_date || null,
        end_date: b.end_date || null
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        kpis: {
          activeStudentsCount: activeStudents.length,
          totalStudentsCount: totalStudents,
          activeTeachersCount: activeTeachers.length,
          pendingTeachersCount: pendingTeachers.length,
          activeBatchesCount: activeBatches.length,
          totalBatchesCount: allBatches.length,
          certificatesIssuedCount: allCertificates.length,
          systemUsersCount: staffUsers.length || allUsers.length,
          totalCoursesCount: allCourses.length
        },
        batchCapacityTelemetry,
        recentCertificates: allCertificates.slice(0, 5),
        recentTeachers: allTeachers.slice(0, 5),
        recentAdmissions: allAdmissions.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Management Overview API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to aggregate management overview data.'
    });
  }
}
