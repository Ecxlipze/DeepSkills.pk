import { getSupabaseServerClient } from './supabaseServer.js';
import { validatePortalSession, normalizeCnic, MODULE_KEYS } from './portalAuthServer.js';

export function getTodayDateString() {
  // Returns YYYY-MM-DD in local time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Resolves the authenticated actor (user or teacher) from the authorization header.
 */
export async function resolveActor(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false, status: 401, message: 'Authentication token required.' };
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 500, message: 'Database service unavailable.' };
  }

  // 1. Check if token is a Supabase JWT (Super Admin)
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const { data: jwtData, error: jwtErr } = await supabase.auth.getUser(token);
      if (!jwtErr && jwtData?.user) {
        // Find matching record in users table or create virtual admin
        const email = jwtData.user.email;
        const { data: userRows } = await supabase
          .from('users')
          .select('id, full_name, email, role, cnic')
          .eq('email', email)
          .limit(1);

        const dbUser = userRows?.[0];
        return {
          ok: true,
          actorType: 'user',
          actorId: dbUser?.id || jwtData.user.id,
          name: dbUser?.full_name || 'Super Admin',
          email: email || '',
          role: 'admin',
          isAdmin: true,
          isHR: true,
          cnic: dbUser?.cnic || '',
          permissions: MODULE_KEYS.reduce((acc, k) => { acc[k] = 'full'; return acc; }, {})
        };
      }
    } catch {
      // Fall through to portal session check
    }
  }

  // 2. Check portal session (teacher, admin, or custom staff)
  const portalAuth = await validatePortalSession(supabase, token);
  if (!portalAuth.ok) {
    return { ok: false, status: portalAuth.status, message: portalAuth.message };
  }

  const session = portalAuth.session;
  const normCnic = normalizeCnic(session.cnic);

  if (session.role === 'teacher') {
    const { data: teachers, error: tErr } = await supabase
      .from('teachers')
      .select('id, name, email, cnic, status, specialization')
      .eq('cnic', normCnic)
      .limit(1);

    if (tErr || !teachers?.[0]) {
      return { ok: false, status: 404, message: 'Teacher profile not found.' };
    }

    const teacher = teachers[0];
    return {
      ok: true,
      actorType: 'teacher',
      actorId: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: 'teacher',
      specialization: teacher.specialization,
      isAdmin: false,
      isHR: false,
      cnic: normCnic,
      permissions: {}
    };
  }

  // Staff (admin or custom role)
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, full_name, email, cnic, role, status, custom_roles(name, permissions)')
    .eq('cnic', normCnic)
    .limit(1);

  if (uErr || !users?.[0]) {
    return { ok: false, status: 404, message: 'Staff profile not found.' };
  }

  const staffUser = users[0];
  const permissions = staffUser.role === 'admin'
    ? MODULE_KEYS.reduce((acc, k) => { acc[k] = 'full'; return acc; }, {})
    : (staffUser.custom_roles?.permissions || {});

  const isAdmin = staffUser.role === 'admin' || permissions.dashboard === 'full';
  const isHR = isAdmin || permissions.hr === 'full' || permissions.time_tracking === 'full';

  return {
    ok: true,
    actorType: 'user',
    actorId: staffUser.id,
    name: staffUser.full_name,
    email: staffUser.email,
    role: staffUser.role,
    customRoleName: staffUser.custom_roles?.name || null,
    isAdmin,
    isHR,
    cnic: normCnic,
    permissions
  };
}

// ──────────────────────────────────────────
// Shift & Daily Attendance Functions
// ──────────────────────────────────────────

export async function getTodayShift(supabase, actorType, actorId, date = getTodayDateString()) {
  const { data: shifts, error } = await supabase
    .from('staff_shifts')
    .select('*')
    .eq('actor_type', actorType)
    .eq('actor_id', actorId)
    .eq('date', date)
    .limit(1);

  if (error) throw error;
  const shift = shifts?.[0] || null;
  if (!shift) return null;

  // Calculate live work seconds if currently on duty
  let currentWorkSeconds = shift.total_work_seconds || 0;
  if (shift.status === 'on_duty' && shift.clock_in) {
    const elapsed = Math.floor((Date.now() - new Date(shift.clock_in).getTime()) / 1000);
    currentWorkSeconds = Math.max(0, elapsed - (shift.total_break_seconds || 0));
  } else if (shift.status === 'on_break' && shift.clock_in && shift.break_start) {
    const elapsedBeforeBreak = Math.floor((new Date(shift.break_start).getTime() - new Date(shift.clock_in).getTime()) / 1000);
    currentWorkSeconds = Math.max(0, elapsedBeforeBreak - (shift.total_break_seconds || 0));
  }

  return {
    ...shift,
    current_work_seconds: currentWorkSeconds
  };
}

export async function clockInShift(supabase, actorType, actorId, notes = '') {
  const today = getTodayDateString();
  const existing = await getTodayShift(supabase, actorType, actorId, today);
  if (existing) {
    if (existing.status === 'completed') {
      throw new Error('Shift for today is already completed.');
    }
    return existing;
  }

  const nowIso = new Date().toISOString();
  const payload = {
    actor_type: actorType,
    actor_id: actorId,
    user_id: actorType === 'user' ? actorId : null,
    teacher_id: actorType === 'teacher' ? actorId : null,
    date: today,
    clock_in: nowIso,
    status: 'on_duty',
    total_break_seconds: 0,
    total_work_seconds: 0,
    notes: notes || null
  };

  const { data, error } = await supabase
    .from('staff_shifts')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function startShiftBreak(supabase, actorType, actorId) {
  const today = getTodayDateString();
  const shift = await getTodayShift(supabase, actorType, actorId, today);
  if (!shift) throw new Error('No active shift found for today. Please clock in first.');
  if (shift.status === 'on_break') throw new Error('Already on break.');
  if (shift.status === 'completed') throw new Error('Shift already completed.');

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('staff_shifts')
    .update({
      status: 'on_break',
      break_start: nowIso,
      updated_at: nowIso
    })
    .eq('id', shift.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function endShiftBreak(supabase, actorType, actorId) {
  const today = getTodayDateString();
  const shift = await getTodayShift(supabase, actorType, actorId, today);
  if (!shift) throw new Error('No active shift found for today.');
  if (shift.status !== 'on_break' || !shift.break_start) throw new Error('Not currently on break.');

  const now = new Date();
  const breakStart = new Date(shift.break_start);
  const breakDuration = Math.max(0, Math.floor((now.getTime() - breakStart.getTime()) / 1000));
  const newTotalBreak = (shift.total_break_seconds || 0) + breakDuration;

  const { data, error } = await supabase
    .from('staff_shifts')
    .update({
      status: 'on_duty',
      break_start: null,
      total_break_seconds: newTotalBreak,
      updated_at: now.toISOString()
    })
    .eq('id', shift.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function clockOutShift(supabase, actorType, actorId) {
  const today = getTodayDateString();
  const shift = await getTodayShift(supabase, actorType, actorId, today);
  if (!shift) throw new Error('No active shift found for today. Please clock in first.');
  if (shift.status === 'completed') throw new Error('Shift is already completed.');

  const now = new Date();
  let totalBreakSeconds = shift.total_break_seconds || 0;

  // If clocking out while on break, finalize that break period
  if (shift.status === 'on_break' && shift.break_start) {
    const breakDuration = Math.max(0, Math.floor((now.getTime() - new Date(shift.break_start).getTime()) / 1000));
    totalBreakSeconds += breakDuration;
  }

  const clockInTime = new Date(shift.clock_in).getTime();
  const totalElapsed = Math.max(0, Math.floor((now.getTime() - clockInTime) / 1000));
  const totalWorkSeconds = Math.max(0, totalElapsed - totalBreakSeconds);

  const { data, error } = await supabase
    .from('staff_shifts')
    .update({
      status: 'completed',
      clock_out: now.toISOString(),
      break_start: null,
      total_break_seconds: totalBreakSeconds,
      total_work_seconds: totalWorkSeconds,
      updated_at: now.toISOString()
    })
    .eq('id', shift.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────
// Clockify-style Task Time Tracking Functions
// ──────────────────────────────────────────

export async function recalculateTaskLoggedTime(supabase, taskId) {
  if (!taskId) return 0;
  try {
    const { data: entries } = await supabase
      .from('staff_time_entries')
      .select('duration_seconds')
      .eq('task_id', taskId)
      .eq('is_running', false);

    const totalSeconds = (entries || []).reduce((acc, row) => acc + (Number(row.duration_seconds) || 0), 0);

    await supabase
      .from('staff_tasks')
      .update({ total_logged_seconds: totalSeconds, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    return totalSeconds;
  } catch (err) {
    console.warn('[recalculateTaskLoggedTime] Notice:', err.message);
    return 0;
  }
}

export async function getActiveTimer(supabase, actorType, actorId) {
  const { data, error } = await supabase
    .from('staff_time_entries')
    .select('*, staff_time_projects(id, name, department, color), staff_tasks(id, task_key, title, status, priority)')
    .eq('actor_type', actorType)
    .eq('actor_id', actorId)
    .eq('is_running', true)
    .order('start_time', { ascending: false })
    .limit(1);

  if (error) throw error;
  const active = data?.[0] || null;
  if (!active) return null;

  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000));
  return {
    ...active,
    elapsed_seconds: elapsed
  };
}

export async function startTaskTimer(supabase, actorType, actorId, { projectId, taskId = null, description, billable = false }) {
  const now = new Date();
  const today = getTodayDateString();

  // Stop any currently running timer for this user/teacher
  await stopActiveTimer(supabase, actorType, actorId);

  // If starting a timer on a 'todo' task, advance it to 'in_progress'
  if (taskId) {
    try {
      const { data: task } = await supabase.from('staff_tasks').select('id, status').eq('id', taskId).maybeSingle();
      if (task && task.status === 'todo') {
        await supabase.from('staff_tasks').update({ status: 'in_progress', updated_at: now.toISOString() }).eq('id', taskId);
      }
    } catch (_) {}
  }

  const payload = {
    actor_type: actorType,
    actor_id: actorId,
    user_id: actorType === 'user' ? actorId : null,
    teacher_id: actorType === 'teacher' ? actorId : null,
    project_id: projectId || null,
    task_id: taskId || null,
    description: (description || '').trim(),
    start_time: now.toISOString(),
    end_time: null,
    duration_seconds: 0,
    is_running: true,
    date: today,
    billable: Boolean(billable),
    status: 'approved'
  };

  const { data, error } = await supabase
    .from('staff_time_entries')
    .insert([payload])
    .select('*, staff_time_projects(id, name, department, color), staff_tasks(id, task_key, title, status, priority)')
    .single();

  if (error) throw error;
  return data;
}

export async function stopActiveTimer(supabase, actorType, actorId, entryId = null) {
  const now = new Date();
  let query = supabase
    .from('staff_time_entries')
    .select('*')
    .eq('actor_type', actorType)
    .eq('actor_id', actorId)
    .eq('is_running', true);

  if (entryId) {
    query = query.eq('id', entryId);
  }

  const { data: entries, error } = await query;
  if (error) throw error;
  if (!entries || entries.length === 0) return null;

  const target = entries[0];
  const startTime = new Date(target.start_time).getTime();
  const duration = Math.max(0, Math.floor((now.getTime() - startTime) / 1000));

  const { data: updated, error: uErr } = await supabase
    .from('staff_time_entries')
    .update({
      end_time: now.toISOString(),
      duration_seconds: duration,
      is_running: false,
      updated_at: now.toISOString()
    })
    .eq('id', target.id)
    .select('*, staff_time_projects(id, name, department, color), staff_tasks(id, task_key, title, status, priority)')
    .single();

  if (uErr) throw uErr;

  if (target.task_id) {
    await recalculateTaskLoggedTime(supabase, target.task_id);
  }

  return updated;
}

export async function createManualTimeEntry(supabase, actorType, actorId, {
  projectId,
  taskId = null,
  description,
  date,
  startTime,
  endTime,
  durationSeconds,
  billable = false
}) {
  const entryDate = date || getTodayDateString();
  let startIso = null;
  let endIso = null;
  let duration = Math.max(0, Math.floor(Number(durationSeconds) || 0));

  if (startTime && endTime) {
    startIso = new Date(`${entryDate}T${startTime}:00`).toISOString();
    endIso = new Date(`${entryDate}T${endTime}:00`).toISOString();
    const diff = Math.max(0, Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000));
    if (diff > 0) duration = diff;
  } else if (!startIso) {
    const now = new Date();
    startIso = now.toISOString();
    endIso = new Date(now.getTime() + duration * 1000).toISOString();
  }

  const payload = {
    actor_type: actorType,
    actor_id: actorId,
    user_id: actorType === 'user' ? actorId : null,
    teacher_id: actorType === 'teacher' ? actorId : null,
    project_id: projectId || null,
    task_id: taskId || null,
    description: (description || '').trim(),
    start_time: startIso,
    end_time: endIso,
    duration_seconds: duration,
    is_running: false,
    date: entryDate,
    billable: Boolean(billable),
    status: 'approved'
  };

  const { data, error } = await supabase
    .from('staff_time_entries')
    .insert([payload])
    .select('*, staff_time_projects(id, name, department, color), staff_tasks(id, task_key, title, status, priority)')
    .single();

  if (error) throw error;

  if (taskId) {
    await recalculateTaskLoggedTime(supabase, taskId);
  }

  return data;
}

export async function getTimeEntries(supabase, actorType, actorId, { startDate, endDate, date, taskId } = {}) {
  let query = supabase
    .from('staff_time_entries')
    .select('*, staff_time_projects(id, name, department, color), staff_tasks(id, task_key, title, status, priority)')
    .eq('actor_type', actorType)
    .eq('actor_id', actorId)
    .order('start_time', { ascending: false });

  if (taskId) {
    query = query.eq('task_id', taskId);
  }
  if (date) {
    query = query.eq('date', date);
  } else {
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
