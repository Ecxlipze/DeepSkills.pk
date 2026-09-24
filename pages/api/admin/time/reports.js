import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { resolveActor, getTodayDateString } from '../../../../lib/timeTrackingServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // Authenticate actor
  const auth = await resolveActor(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  if (!auth.isAdmin && !auth.isHR) {
    return res.status(403).json({ status: 'error', message: 'Access denied: Admin or HR permissions required.' });
  }

  const mode = req.query.mode || 'summary';
  const today = getTodayDateString();

  // ──────────────────────────────────────────
  // 1. LIVE TEAM PULSE: Who is working right now
  // ──────────────────────────────────────────
  if (mode === 'live') {
    try {
      // 1. Fetch today's shifts
      const { data: shifts, error: sErr } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('date', today);
      if (sErr) throw sErr;

      // 2. Fetch active running timers
      const { data: runningEntries, error: rErr } = await supabase
        .from('staff_time_entries')
        .select('*, staff_time_projects(id, name, department, color)')
        .eq('is_running', true);
      if (rErr) throw rErr;

      // 3. Fetch active users (staff) and teachers for profile metadata
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email, role, cnic, custom_roles(name)')
        .in('status', ['active', 'onboarding']);

      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, name, email, specialization, cnic')
        .in('status', ['Active', 'Onboarding']);

      const activeTimerMap = new Map();
      (runningEntries || []).forEach(e => {
        const key = `${e.actor_type}_${e.actor_id}`;
        activeTimerMap.set(key, e);
      });

      const shiftMap = new Map();
      (shifts || []).forEach(s => {
        const key = `${s.actor_type}_${s.actor_id}`;
        shiftMap.set(key, s);
      });

      // Build complete roster
      const roster = [];

      (users || []).forEach(u => {
        const key = `user_${u.id}`;
        const shift = shiftMap.get(key) || null;
        const activeTimer = activeTimerMap.get(key) || null;

        roster.push({
          id: u.id,
          actor_type: 'user',
          name: u.full_name,
          email: u.email,
          role: u.custom_roles?.name || u.role,
          department: 'Staff',
          shift: shift ? {
            status: shift.status,
            clock_in: shift.clock_in,
            clock_out: shift.clock_out,
            total_work_seconds: shift.total_work_seconds,
            total_break_seconds: shift.total_break_seconds
          } : null,
          active_task: activeTimer ? {
            id: activeTimer.id,
            description: activeTimer.description,
            project: activeTimer.staff_time_projects?.name || 'General',
            project_color: activeTimer.staff_time_projects?.color || '#378ADD',
            start_time: activeTimer.start_time,
            elapsed_seconds: Math.max(0, Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000))
          } : null,
          status: activeTimer ? 'working' : (shift?.status === 'on_break' ? 'on_break' : (shift?.status === 'on_duty' ? 'on_duty' : (shift?.status === 'completed' ? 'completed' : 'off_duty')))
        });
      });

      (teachers || []).forEach(t => {
        const key = `teacher_${t.id}`;
        const shift = shiftMap.get(key) || null;
        const activeTimer = activeTimerMap.get(key) || null;

        roster.push({
          id: t.id,
          actor_type: 'teacher',
          name: t.name,
          email: t.email,
          role: 'Faculty Instructor',
          department: t.specialization || 'Faculty',
          shift: shift ? {
            status: shift.status,
            clock_in: shift.clock_in,
            clock_out: shift.clock_out,
            total_work_seconds: shift.total_work_seconds,
            total_break_seconds: shift.total_break_seconds
          } : null,
          active_task: activeTimer ? {
            id: activeTimer.id,
            description: activeTimer.description,
            project: activeTimer.staff_time_projects?.name || 'Faculty',
            project_color: activeTimer.staff_time_projects?.color || '#8B5CF6',
            start_time: activeTimer.start_time,
            elapsed_seconds: Math.max(0, Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000))
          } : null,
          status: activeTimer ? 'working' : (shift?.status === 'on_break' ? 'on_break' : (shift?.status === 'on_duty' ? 'on_duty' : (shift?.status === 'completed' ? 'completed' : 'off_duty')))
        });
      });

      // Sort: working first, then on duty, on break, completed, off duty
      const statusOrder = { working: 1, on_duty: 2, on_break: 3, completed: 4, off_duty: 5 };
      roster.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

      const stats = {
        totalTeam: roster.length,
        currentlyActive: roster.filter(r => r.status === 'working' || r.status === 'on_duty').length,
        onBreak: roster.filter(r => r.status === 'on_break').length,
        completedToday: roster.filter(r => r.status === 'completed').length
      };

      return res.status(200).json({ status: 'success', stats, roster, today });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // ──────────────────────────────────────────
  // 2. SUMMARY & AGGREGATE REPORTS
  // ──────────────────────────────────────────
  try {
    const { startDate, endDate, department } = req.query;

    // Default range: current month
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const defaultEnd = today;

    const fromDate = startDate || defaultStart;
    const toDate = endDate || defaultEnd;

    // Query time entries in range
    let entriesQuery = supabase
      .from('staff_time_entries')
      .select('*, staff_time_projects(id, name, department, color)')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false });

    const { data: entries, error: eErr } = await entriesQuery;
    if (eErr) throw eErr;

    // Query shifts in range
    let shiftsQuery = supabase
      .from('staff_shifts')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false });

    const { data: shifts, error: sErr } = await shiftsQuery;
    if (sErr) throw sErr;

    // Fetch users & teachers for names
    const { data: users } = await supabase.from('users').select('id, full_name, email, role, custom_roles(name)');
    const { data: teachers } = await supabase.from('teachers').select('id, name, email, specialization');

    const nameMap = new Map();
    (users || []).forEach(u => nameMap.set(`user_${u.id}`, { name: u.full_name, role: u.custom_roles?.name || u.role, dept: 'Staff' }));
    (teachers || []).forEach(t => nameMap.set(`teacher_${t.id}`, { name: t.name, role: 'Faculty', dept: t.specialization || 'Faculty' }));

    // Aggregations
    let totalTaskSeconds = 0;
    const byProject = {};
    const byMember = {};
    const byDate = {};

    (entries || []).forEach(e => {
      const duration = e.duration_seconds || 0;
      totalTaskSeconds += duration;

      // Project breakdown
      const projName = e.staff_time_projects?.name || 'Unassigned';
      const projColor = e.staff_time_projects?.color || '#9ca3af';
      if (!byProject[projName]) byProject[projName] = { name: projName, color: projColor, seconds: 0, count: 0 };
      byProject[projName].seconds += duration;
      byProject[projName].count += 1;

      // Member breakdown
      const actorKey = `${e.actor_type}_${e.actor_id}`;
      const meta = nameMap.get(actorKey) || { name: 'Unknown', role: 'Staff', dept: 'General' };
      if (!byMember[actorKey]) {
        byMember[actorKey] = {
          name: meta.name,
          role: meta.role,
          dept: meta.dept,
          actor_type: e.actor_type,
          actor_id: e.actor_id,
          task_seconds: 0,
          shift_seconds: 0,
          entries_count: 0
        };
      }
      byMember[actorKey].task_seconds += duration;
      byMember[actorKey].entries_count += 1;

      // Date breakdown
      if (!byDate[e.date]) byDate[e.date] = { date: e.date, seconds: 0 };
      byDate[e.date].seconds += duration;
    });

    // Add shift seconds to member breakdown
    let totalShiftSeconds = 0;
    (shifts || []).forEach(s => {
      const actorKey = `${s.actor_type}_${s.actor_id}`;
      const workSecs = s.total_work_seconds || 0;
      totalShiftSeconds += workSecs;

      const meta = nameMap.get(actorKey) || { name: 'Unknown', role: 'Staff', dept: 'General' };
      if (!byMember[actorKey]) {
        byMember[actorKey] = {
          name: meta.name,
          role: meta.role,
          dept: meta.dept,
          actor_type: s.actor_type,
          actor_id: s.actor_id,
          task_seconds: 0,
          shift_seconds: 0,
          entries_count: 0
        };
      }
      byMember[actorKey].shift_seconds += workSecs;
    });

    // If CSV Export requested
    if (mode === 'export') {
      const rows = [
        ['Date', 'Member Name', 'Role', 'Department', 'Project', 'Description', 'Duration (Hours)', 'Duration (HH:MM:SS)', 'Billable']
      ];

      (entries || []).forEach(e => {
        const actorKey = `${e.actor_type}_${e.actor_id}`;
        const meta = nameMap.get(actorKey) || { name: 'Unknown', role: 'Staff', dept: 'General' };
        const hrs = ((e.duration_seconds || 0) / 3600).toFixed(2);
        const s = e.duration_seconds || 0;
        const timeStr = `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
        rows.push([
          e.date,
          `"${meta.name}"`,
          `"${meta.role}"`,
          `"${meta.dept}"`,
          `"${e.staff_time_projects?.name || 'General'}"`,
          `"${(e.description || '').replace(/"/g, '""')}"`,
          hrs,
          timeStr,
          e.billable ? 'Yes' : 'No'
        ]);
      });

      const csvContent = rows.map(r => r.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="DeepSkills_Timesheet_${fromDate}_to_${toDate}.csv"`);
      return res.status(200).send(csvContent);
    }

    return res.status(200).json({
      status: 'success',
      dateRange: { from: fromDate, to: toDate },
      totals: {
        totalTaskHours: +(totalTaskSeconds / 3600).toFixed(2),
        totalShiftHours: +(totalShiftSeconds / 3600).toFixed(2),
        entriesCount: entries.length,
        shiftsCount: shifts.length
      },
      byProject: Object.values(byProject),
      byMember: Object.values(byMember),
      dailyTrends: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
