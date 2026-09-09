import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';
import { createBatchNotifications } from '../../../../src/utils/notifications.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  // RBAC Authorization
  const auth = await authorizeAdminOperation(req, 'announcements');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // ──────────────────────────────────────────
  // GET: Fetch Announcements, Stats, and Reader Audit
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { search, audience_type, role, priority, status, announcement_id } = req.query;

      // 1. Fetch Batches & Courses for Meta
      const [batchesRes, coursesRes, admissionsRes, teachersRes] = await Promise.all([
        supabase.from('batches').select('id, batch_name, course, time_shift, status').order('batch_name', { ascending: true }),
        supabase.from('courses').select('id, title').order('title', { ascending: true }),
        supabase.from('admissions').select('id, name, cnic, phone, email, course, batch, status').in('status', ['Active', 'Graduated']),
        supabase.from('teachers').select('id, name, cnic, phone, email, status').eq('status', 'Active')
      ]);

      const batches = batchesRes.data || [];
      const courses = coursesRes.data || [];
      const admissions = admissionsRes.data || [];
      const teachers = teachersRes.data || [];

      // 2. Fetch Announcements with Attachments
      const { data: allAnnouncements, error: annErr } = await supabase
        .from('announcements')
        .select(`*, announcement_attachments(*)`)
        .order('is_pinned', { ascending: false })
        .order('posted_at', { ascending: false });

      if (annErr) throw annErr;

      // 3. Fetch Read Receipts
      const { data: allReads, error: readErr } = await supabase
        .from('announcement_reads')
        .select('announcement_id, user_id, read_at');

      const reads = allReads || [];

      // Map read counts by announcement id
      const readCountMap = new Map();
      reads.forEach(r => {
        readCountMap.set(r.announcement_id, (readCountMap.get(r.announcement_id) || 0) + 1);
      });

      // 4. Enrich announcements
      let enriched = (allAnnouncements || []).map(a => {
        const bodyContent = a.body || a.content || '';
        const atts = a.announcement_attachments || [];
        const readCount = readCountMap.get(a.id) || 0;
        return {
          ...a,
          body: bodyContent,
          priority: a.priority || 'normal',
          attachments_count: atts.length,
          reads_count: readCount
        };
      });

      // 5. Apply filters
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        enriched = enriched.filter(a =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.body || '').toLowerCase().includes(q) ||
          (a.posted_by_name || '').toLowerCase().includes(q)
        );
      }

      if (audience_type && audience_type !== 'all') {
        enriched = enriched.filter(a => (a.audience_type || 'broadcast') === audience_type);
      }

      if (role && role !== 'all') {
        enriched = enriched.filter(a => (a.audience_roles || []).includes(role));
      }

      if (priority && priority !== 'all') {
        enriched = enriched.filter(a => (a.priority || 'normal') === priority);
      }

      if (status && status !== 'all') {
        if (status === 'active') enriched = enriched.filter(a => a.is_active !== false);
        if (status === 'inactive') enriched = enriched.filter(a => a.is_active === false);
        if (status === 'pinned') enriched = enriched.filter(a => !!a.is_pinned);
        if (status === 'scheduled') enriched = enriched.filter(a => a.scheduled_at && new Date(a.scheduled_at) > new Date());
      }

      // 6. Detailed Readers list if requested
      let readerDetails = null;
      if (announcement_id) {
        const targetReads = reads.filter(r => r.announcement_id === announcement_id);
        const studentMap = new Map(admissions.map(s => [String(s.id), s]));
        const studentCnicMap = new Map(admissions.map(s => [String(s.cnic), s]));
        const teacherMap = new Map(teachers.map(t => [String(t.id), t]));
        const teacherCnicMap = new Map(teachers.map(t => [String(t.cnic), t]));

        readerDetails = targetReads.map(r => {
          const uId = String(r.user_id || '');
          const s = studentMap.get(uId) || studentCnicMap.get(uId);
          const t = teacherMap.get(uId) || teacherCnicMap.get(uId);

          return {
            user_id: r.user_id,
            read_at: r.read_at,
            name: s ? s.name : (t ? t.name : 'Registered Member'),
            role: s ? 'student' : (t ? 'teacher' : 'user'),
            cnic: s ? s.cnic : (t ? t.cnic : null),
            batch: s ? s.batch : null,
            course: s ? s.course : null,
            phone: s ? s.phone : (t ? t.phone : null)
          };
        });
      }

      // 7. Telemetry KPIs
      const totalCount = (allAnnouncements || []).length;
      const activeCount = (allAnnouncements || []).filter(a => a.is_active !== false).length;
      const pinnedCount = (allAnnouncements || []).filter(a => !!a.is_pinned).length;
      const totalReads = reads.length;
      const potentialAudience = admissions.length + teachers.length;
      const engagementRate = totalCount > 0 && potentialAudience > 0
        ? Math.min(100, Math.round((totalReads / (totalCount * potentialAudience)) * 100))
        : 0;

      return res.status(200).json({
        status: 'success',
        data: {
          announcements: enriched,
          readers: readerDetails,
          telemetry: {
            total: totalCount,
            active: activeCount,
            pinned: pinnedCount,
            totalReads,
            engagementRate
          },
          meta: {
            batches: batches.map(b => b.batch_name),
            courses: courses.map(c => c.title),
            totalEnrolledStudents: admissions.length,
            totalTeachers: teachers.length
          }
        }
      });
    } catch (err) {
      console.error('API /admin/academic/announcements GET error:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to load announcements.' });
    }
  }

  // ──────────────────────────────────────────
  // POST: Mutations (Create, Update, Pin, Delete, Reads)
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { action } = req.body || {};

    // Action 1: Create Announcement
    if (action === 'create') {
      try {
        const {
          title, body, priority = 'normal', audience_type = 'broadcast',
          audience_courses = [], audience_batches = [], audience_roles = ['student', 'teacher'],
          is_pinned = false, scheduled_at = null, attachments = []
        } = req.body;

        if (!title || !title.trim()) {
          return res.status(400).json({ status: 'error', message: 'Announcement title is required.' });
        }
        if (!body || !body.trim()) {
          return res.status(400).json({ status: 'error', message: 'Announcement body is required.' });
        }

        const newRecord = {
          title: title.trim(),
          body: body.trim(),
          posted_by_name: auth.user?.name || 'Administrator',
          posted_by_role: 'admin',
          audience_type,
          audience_courses: audience_type === 'targeted' ? audience_courses : null,
          audience_batches: audience_type === 'targeted' ? audience_batches : null,
          audience_roles: audience_roles && audience_roles.length > 0 ? audience_roles : ['student', 'teacher'],
          priority: ['urgent', 'normal', 'info'].includes(priority) ? priority : 'normal',
          is_pinned: !!is_pinned,
          is_active: true,
          scheduled_at: scheduled_at || null,
          posted_at: new Date().toISOString()
        };

        const { data: created, error: createErr } = await supabase
          .from('announcements')
          .insert([newRecord])
          .select()
          .single();

        if (createErr) throw createErr;

        // Insert attachments if provided
        if (Array.isArray(attachments) && attachments.length > 0) {
          const attRows = attachments.map(att => ({
            announcement_id: created.id,
            file_name: att.file_name || 'Attachment',
            file_size: att.file_size || '',
            file_url: att.file_url,
            file_type: att.file_type || ''
          }));
          await supabase.from('announcement_attachments').insert(attRows);
        }

        // Trigger in-app notifications if broadcast is live now
        const isLiveNow = !created.scheduled_at || new Date(created.scheduled_at) <= new Date();
        if (isLiveNow) {
          try {
            const roles = created.audience_roles || [];
            const notifTitle = created.priority === 'urgent' ? `[URGENT] ${created.title}` : created.title;
            const notifMsg = `New announcement posted by ${created.posted_by_name}: "${created.title}"`;

            if (roles.includes('student')) {
              const { data: allStudents } = await supabase
                .from('admissions')
                .select('id, batch, course')
                .eq('status', 'Active');

              let targetStudents = allStudents || [];
              if (created.audience_type === 'targeted') {
                const bList = created.audience_batches || [];
                const cList = created.audience_courses || [];
                targetStudents = targetStudents.filter(s => bList.includes(s.batch) || cList.includes(s.course));
              }

              if (targetStudents.length > 0) {
                await createBatchNotifications(targetStudents.map(s => s.id), {
                  role: 'student',
                  type: 'announcement',
                  title: notifTitle,
                  message: notifMsg,
                  link: '/student/announcements'
                });
              }
            }

            if (roles.includes('teacher')) {
              const { data: allTeachers } = await supabase
                .from('teachers')
                .select('id')
                .eq('status', 'Active');

              if (allTeachers && allTeachers.length > 0) {
                await createBatchNotifications(allTeachers.map(t => t.id), {
                  role: 'teacher',
                  type: 'announcement',
                  title: notifTitle,
                  message: notifMsg,
                  link: '/teacher/announcements'
                });
              }
            }
          } catch (notifErr) {
            console.warn('Non-fatal in-app notification dispatch error:', notifErr.message);
          }
        }

        return res.status(200).json({
          status: 'success',
          message: 'Announcement published successfully.',
          data: created
        });
      } catch (err) {
        console.error('API create announcement error:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to create announcement.' });
      }
    }

    // Action 2: Update Announcement
    if (action === 'update') {
      try {
        const {
          announcement_id, title, body, priority = 'normal',
          audience_type = 'broadcast', audience_courses = [], audience_batches = [],
          audience_roles = ['student', 'teacher'], is_pinned, scheduled_at, attachments
        } = req.body;

        if (!announcement_id) {
          return res.status(400).json({ status: 'error', message: 'announcement_id is required.' });
        }

        const updatePayload = {
          title: title.trim(),
          body: body.trim(),
          priority: ['urgent', 'normal', 'info'].includes(priority) ? priority : 'normal',
          audience_type,
          audience_courses: audience_type === 'targeted' ? audience_courses : null,
          audience_batches: audience_type === 'targeted' ? audience_batches : null,
          audience_roles: audience_roles && audience_roles.length > 0 ? audience_roles : ['student', 'teacher'],
          is_pinned: is_pinned !== undefined ? !!is_pinned : undefined,
          scheduled_at: scheduled_at !== undefined ? (scheduled_at || null) : undefined
        };

        const { data: updated, error: updateErr } = await supabase
          .from('announcements')
          .update(updatePayload)
          .eq('id', announcement_id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        if (Array.isArray(attachments)) {
          await supabase.from('announcement_attachments').delete().eq('announcement_id', announcement_id);
          if (attachments.length > 0) {
            const attRows = attachments.map(att => ({
              announcement_id,
              file_name: att.file_name || 'Attachment',
              file_size: att.file_size || '',
              file_url: att.file_url,
              file_type: att.file_type || ''
            }));
            await supabase.from('announcement_attachments').insert(attRows);
          }
        }

        return res.status(200).json({
          status: 'success',
          message: 'Announcement updated successfully.',
          data: updated
        });
      } catch (err) {
        console.error('API update announcement error:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to update announcement.' });
      }
    }

    // Action 3: Toggle Pin
    if (action === 'toggle_pin') {
      try {
        const { announcement_id, is_pinned } = req.body;
        if (!announcement_id) {
          return res.status(400).json({ status: 'error', message: 'announcement_id is required.' });
        }

        const { data, error } = await supabase
          .from('announcements')
          .update({ is_pinned: !!is_pinned })
          .eq('id', announcement_id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({
          status: 'success',
          message: is_pinned ? 'Announcement pinned to top.' : 'Announcement unpinned.',
          data
        });
      } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to toggle pin.' });
      }
    }

    // Action 4: Toggle Active
    if (action === 'toggle_active') {
      try {
        const { announcement_id, is_active } = req.body;
        if (!announcement_id) {
          return res.status(400).json({ status: 'error', message: 'announcement_id is required.' });
        }

        const { data, error } = await supabase
          .from('announcements')
          .update({ is_active: !!is_active })
          .eq('id', announcement_id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({
          status: 'success',
          message: is_active ? 'Announcement activated.' : 'Announcement archived.',
          data
        });
      } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to toggle active state.' });
      }
    }

    // Action 5: Delete Permanently
    if (action === 'delete') {
      try {
        const { announcement_id } = req.body;
        if (!announcement_id) {
          return res.status(400).json({ status: 'error', message: 'announcement_id is required.' });
        }

        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', announcement_id);

        if (error) throw error;
        return res.status(200).json({
          status: 'success',
          message: 'Announcement deleted permanently.'
        });
      } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to delete announcement.' });
      }
    }

    // Action 6: Detailed Reader Audit
    if (action === 'get_reads') {
      try {
        const { announcement_id } = req.body;
        if (!announcement_id) {
          return res.status(400).json({ status: 'error', message: 'announcement_id is required.' });
        }

        const [readsRes, admissionsRes, teachersRes] = await Promise.all([
          supabase.from('announcement_reads').select('user_id, read_at').eq('announcement_id', announcement_id),
          supabase.from('admissions').select('id, name, cnic, phone, email, course, batch'),
          supabase.from('teachers').select('id, name, cnic, phone, email')
        ]);

        const targetReads = readsRes.data || [];
        const admissions = admissionsRes.data || [];
        const teachers = teachersRes.data || [];

        const studentMap = new Map(admissions.map(s => [String(s.id), s]));
        const studentCnicMap = new Map(admissions.map(s => [String(s.cnic), s]));
        const teacherMap = new Map(teachers.map(t => [String(t.id), t]));
        const teacherCnicMap = new Map(teachers.map(t => [String(t.cnic), t]));

        const readers = targetReads.map(r => {
          const uId = String(r.user_id || '');
          const s = studentMap.get(uId) || studentCnicMap.get(uId);
          const t = teacherMap.get(uId) || teacherCnicMap.get(uId);

          return {
            user_id: r.user_id,
            read_at: r.read_at,
            name: s ? s.name : (t ? t.name : 'Registered Member'),
            role: s ? 'student' : (t ? 'teacher' : 'user'),
            cnic: s ? s.cnic : (t ? t.cnic : null),
            batch: s ? s.batch : null,
            course: s ? s.course : null,
            phone: s ? s.phone : (t ? t.phone : null)
          };
        });

        return res.status(200).json({
          status: 'success',
          data: readers
        });
      } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to fetch readers.' });
      }
    }

    return res.status(400).json({ status: 'error', message: 'Invalid action specified.' });
  }
}
