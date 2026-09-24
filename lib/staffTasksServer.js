import { getSupabaseServerClient } from './supabaseServer.js';
import { resolveActor } from './timeTrackingServer.js';
import smtp from './smtp.cjs';

export const JIRA_STAGES = [
  { id: 'todo', label: 'To Do', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.25)' },
  { id: 'in_progress', label: 'In Progress', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.25)' },
  { id: 'in_review', label: 'In Review', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' },
  { id: 'done', label: 'Done', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' }
];

export const JIRA_PRIORITIES = [
  { id: 'lowest', label: 'Lowest', color: '#94A3B8', icon: '🔽' },
  { id: 'low', label: 'Low', color: '#38BDF8', icon: '🔽' },
  { id: 'medium', label: 'Medium', color: '#FBBF24', icon: '➖' },
  { id: 'high', label: 'High', color: '#F97316', icon: '🔼' },
  { id: 'highest', label: 'Highest', color: '#EF4444', icon: '🔺' }
];

/**
 * Lists staff tasks for Jira Board and Timeline views
 */
export async function listStaffTasks(supabase, actor, filters = {}) {
  let query = supabase
    .from('staff_tasks')
    .select('*, staff_time_projects(id, name, department, color)')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }

  if (filters.assigneeId) {
    if (filters.assigneeId === 'my') {
      query = query.eq('assignee_id', actor.actorId);
    } else if (filters.assigneeId === 'unassigned') {
      query = query.is('assignee_id', null);
    } else {
      query = query.eq('assignee_id', filters.assigneeId);
    }
  }

  if (filters.department && filters.department !== 'all') {
    query = query.eq('department', filters.department);
  }

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  if (filters.search) {
    const s = filters.search.trim();
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,task_key.ilike.%${s}%`);
  }

  const { data: tasks, error } = await query;
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('[listStaffTasks] Notice: staff_tasks table not yet created. Run migration 20260925010000_staff_jira_tasks_and_time_linking.sql');
      return [];
    }
    throw error;
  }

  // Check currently running timer for the actor
  const { data: runningTimer } = await supabase
    .from('staff_time_entries')
    .select('id, task_id, start_time')
    .eq('actor_type', actor.actorType)
    .eq('actor_id', actor.actorId)
    .eq('is_running', true)
    .maybeSingle();

  const enriched = (tasks || []).map((t) => {
    const isRunning = Boolean(runningTimer && runningTimer.task_id === t.id);
    const runningSince = isRunning ? runningTimer.start_time : null;
    const runningElapsed = isRunning ? Math.max(0, Math.floor((Date.now() - new Date(runningSince).getTime()) / 1000)) : 0;
    const totalWithRunning = (t.total_logged_seconds || 0) + runningElapsed;

    // Timeline calculation
    const isOverdue = t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date(new Date().toDateString());
    const isDueToday = t.due_date && t.status !== 'done' && new Date(t.due_date).toDateString() === new Date().toDateString();

    return {
      ...t,
      is_running: isRunning,
      running_since: runningSince,
      running_elapsed_seconds: runningElapsed,
      current_total_logged_seconds: totalWithRunning,
      is_overdue: isOverdue,
      is_due_today: isDueToday
    };
  });

  return enriched;
}

/**
 * Creates a new task on the Jira board
 */
export async function createStaffTask(supabase, actor, taskData) {
  const title = (taskData.title || '').trim();
  if (!title) {
    throw new Error('Task title is required.');
  }

  // Count existing tasks to generate sequential key if DB default didn't trigger
  const { count } = await supabase.from('staff_tasks').select('*', { count: 'exact', head: true });
  const nextKey = `DS-${(count || 0) + 101}`;

  let assigneeName = taskData.assignee_name || actor.name || 'Unassigned';
  let assigneeEmail = taskData.assignee_email || actor.email || '';

  if (taskData.assignee_id && taskData.assignee_id !== actor.actorId && !taskData.assignee_name) {
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', taskData.assignee_id)
        .maybeSingle();
      if (userRow) {
        assigneeName = userRow.full_name || userRow.email;
        assigneeEmail = userRow.email;
      }
    } catch (_) {}
  }

  const payload = {
    task_key: taskData.task_key || nextKey,
    title,
    description: (taskData.description || '').trim(),
    status: taskData.status || 'todo',
    priority: taskData.priority || 'medium',
    department: taskData.department || 'Operations',
    project_id: taskData.project_id || null,
    assignee_id: taskData.assignee_id || actor.actorId,
    assignee_type: taskData.assignee_type || actor.actorType,
    assignee_name: assigneeName,
    assignee_email: assigneeEmail,
    creator_id: actor.actorId,
    creator_name: actor.name || 'Staff Member',
    start_date: taskData.start_date || new Date().toISOString().slice(0, 10),
    due_date: taskData.due_date || null,
    estimated_hours: Number(taskData.estimated_hours) || 0,
    total_logged_seconds: 0,
    order_index: Number(taskData.order_index) || 0,
    tags: Array.isArray(taskData.tags) ? taskData.tags : [],
    subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
    attachments: Array.isArray(taskData.attachments) ? taskData.attachments : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('staff_tasks')
    .insert([payload])
    .select('*, staff_time_projects(id, name, department, color)')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates task fields (status, priority, dates, estimates, assignee, subtasks, attachments)
 */
export async function updateStaffTask(supabase, actor, taskId, updates) {
  if (!taskId) throw new Error('Task ID required.');

  const allowedFields = [
    'title', 'description', 'status', 'priority', 'department',
    'project_id', 'assignee_id', 'assignee_type', 'assignee_name',
    'assignee_email', 'start_date', 'due_date', 'estimated_hours',
    'order_index', 'tags', 'subtasks', 'attachments'
  ];

  const payload = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in updates) {
      payload[key] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('staff_tasks')
    .update(payload)
    .eq('id', taskId)
    .select('*, staff_time_projects(id, name, department, color)')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a task
 */
export async function deleteStaffTask(supabase, actor, taskId) {
  if (!taskId) throw new Error('Task ID required.');

  // Unlink any time entries rather than hard deleting time logs
  await supabase
    .from('staff_time_entries')
    .update({ task_id: null })
    .eq('task_id', taskId);

  const { error } = await supabase
    .from('staff_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
  return { success: true, message: 'Task deleted' };
}

/**
 * Reorders tasks in a column on the Kanban board
 */
export async function reorderStaffTasks(supabase, actor, { columnStatus, taskIds = [] }) {
  if (!columnStatus || !Array.isArray(taskIds)) {
    throw new Error('Invalid reorder payload.');
  }

  const now = new Date().toISOString();
  const updates = taskIds.map((id, index) =>
    supabase
      .from('staff_tasks')
      .update({ status: columnStatus, order_index: index, updated_at: now })
      .eq('id', id)
  );

  await Promise.all(updates);
  return { success: true };
}

/**
 * Retrieves full time tracking breakdown for a task
 */
export async function getTaskTimeDetails(supabase, taskId) {
  if (!taskId) throw new Error('Task ID required.');

  const { data: task, error: tErr } = await supabase
    .from('staff_tasks')
    .select('*, staff_time_projects(id, name, department, color)')
    .eq('id', taskId)
    .single();

  if (tErr) throw tErr;

  const { data: entries, error: eErr } = await supabase
    .from('staff_time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('start_time', { ascending: false });

  if (eErr) throw eErr;

  const totalSeconds = (entries || [])
    .filter(e => !e.is_running)
    .reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);

  return {
    task,
    total_seconds: totalSeconds,
    entries: entries || []
  };
}

/**
 * Lists staff and admins who can be assigned to tasks
 */
export async function listAssignableStaff(supabase) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, custom_roles(name)')
      .in('role', ['admin', 'custom'])
      .order('full_name', { ascending: true });

    if (error) return [];
    return (users || []).map(u => ({
      id: u.id,
      name: u.full_name || u.email,
      email: u.email,
      roleName: u.custom_roles?.name || (u.role === 'admin' ? 'Administrator' : 'Staff')
    }));
  } catch {
    return [];
  }
}

/**
 * Adds a subtask / checklist item to a task
 */
export async function addTaskSubtask(supabase, actor, taskId, title) {
  if (!taskId) throw new Error('Task ID required.');
  const trimmed = (title || '').trim();
  if (!trimmed) throw new Error('Subtask title is required.');

  const { data: task, error: fetchErr } = await supabase
    .from('staff_tasks')
    .select('subtasks')
    .eq('id', taskId)
    .single();

  if (fetchErr) throw fetchErr;

  const current = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const newSubtask = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: trimmed,
    done: false,
    created_at: new Date().toISOString()
  };

  const updatedSubtasks = [...current, newSubtask];
  return updateStaffTask(supabase, actor, taskId, { subtasks: updatedSubtasks });
}

/**
 * Toggles done state of a subtask
 */
export async function toggleTaskSubtask(supabase, actor, taskId, subtaskId) {
  if (!taskId || !subtaskId) throw new Error('Task ID and Subtask ID required.');

  const { data: task, error: fetchErr } = await supabase
    .from('staff_tasks')
    .select('subtasks')
    .eq('id', taskId)
    .single();

  if (fetchErr) throw fetchErr;

  const current = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const updatedSubtasks = current.map(item =>
    item.id === subtaskId ? { ...item, done: !item.done, completed_at: !item.done ? new Date().toISOString() : null } : item
  );

  return updateStaffTask(supabase, actor, taskId, { subtasks: updatedSubtasks });
}

/**
 * Deletes a subtask item from a task
 */
export async function deleteTaskSubtask(supabase, actor, taskId, subtaskId) {
  if (!taskId || !subtaskId) throw new Error('Task ID and Subtask ID required.');

  const { data: task, error: fetchErr } = await supabase
    .from('staff_tasks')
    .select('subtasks')
    .eq('id', taskId)
    .single();

  if (fetchErr) throw fetchErr;

  const current = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const updatedSubtasks = current.filter(item => item.id !== subtaskId);

  return updateStaffTask(supabase, actor, taskId, { subtasks: updatedSubtasks });
}

/**
 * Attaches a file metadata to a task
 */
export async function addTaskAttachment(supabase, actor, taskId, attachmentMeta) {
  if (!taskId) throw new Error('Task ID required.');
  if (!attachmentMeta?.name || !attachmentMeta?.url) {
    throw new Error('Attachment name and URL are required.');
  }

  const { data: task, error: fetchErr } = await supabase
    .from('staff_tasks')
    .select('attachments')
    .eq('id', taskId)
    .single();

  if (fetchErr) throw fetchErr;

  const current = Array.isArray(task?.attachments) ? task.attachments : [];
  const newAttachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: attachmentMeta.name,
    url: attachmentMeta.url,
    path: attachmentMeta.path || null,
    size: Number(attachmentMeta.size) || 0,
    type: attachmentMeta.type || 'application/octet-stream',
    uploaded_at: new Date().toISOString(),
    uploaded_by: actor?.name || 'Staff'
  };

  const updatedAttachments = [...current, newAttachment];
  return updateStaffTask(supabase, actor, taskId, { attachments: updatedAttachments });
}

/**
 * Removes an attachment from a task
 */
export async function deleteTaskAttachment(supabase, actor, taskId, attachmentId) {
  if (!taskId || !attachmentId) throw new Error('Task ID and Attachment ID required.');

  const { data: task, error: fetchErr } = await supabase
    .from('staff_tasks')
    .select('attachments')
    .eq('id', taskId)
    .single();

  if (fetchErr) throw fetchErr;

  const current = Array.isArray(task?.attachments) ? task.attachments : [];
  const updatedAttachments = current.filter(item => item.id !== attachmentId);

  return updateStaffTask(supabase, actor, taskId, { attachments: updatedAttachments });
}

/**
 * Checks for overdue tasks and creates in-app bell notifications and email alerts
 */
export async function checkAndNotifyOverdueTasks(supabase) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: overdueTasks, error } = await supabase
    .from('staff_tasks')
    .select('id, task_key, title, status, due_date, assignee_id, assignee_type, assignee_name, assignee_email')
    .lt('due_date', todayStr)
    .neq('status', 'done')
    .not('assignee_id', 'is', null);

  if (error || !overdueTasks || overdueTasks.length === 0) {
    return { count: 0, notified: [] };
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const newlyNotified = [];

  for (const task of overdueTasks) {
    if (!task.assignee_id) continue;
    const taskKey = task.task_key;

    // Suppress duplicate alerts in 24 hours
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', String(task.assignee_id))
      .eq('type', 'task_overdue')
      .ilike('title', `%${taskKey}%`)
      .gte('created_at', oneDayAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      continue;
    }

    const title = `Overdue Task: [${task.task_key}] ${task.title}`;
    const message = `Task "${task.title}" is overdue (due: ${task.due_date}). Please review, update progress, or log hours.`;
    const role = task.assignee_type === 'teacher' ? 'teacher' : (task.assignee_type === 'custom' ? 'custom' : 'admin');

    const { data: createdNotif } = await supabase
      .from('notifications')
      .insert([{
        user_id: String(task.assignee_id),
        role,
        type: 'task_overdue',
        title,
        message,
        link: '/staff/tasks',
        is_read: false,
        email_sent: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .maybeSingle();

    if (task.assignee_email) {
      try {
        if (smtp && typeof smtp.smtpConfig === 'function' && typeof smtp.sendEmail === 'function') {
          smtp.smtpConfig();
          const emailBody = {
            to: task.assignee_email,
            subject: `DeepSkills Alert: Overdue Task [${task.task_key}]`,
            text: `${title}\n\n${message}\n\nAccess your portal at https://deepskills.pk/staff/tasks`,
            html: `<html><body style="font-family:Arial,sans-serif;color:#222"><h3>DeepSkills Staff Alert</h3><p>Dear ${task.assignee_name || 'Team Member'},</p><p><strong>${title}</strong></p><p>${message}</p><p><a href="https://deepskills.pk/staff/tasks">Open Task Board</a></p></body></html>`
          };
          await smtp.sendEmail(emailBody);
          if (createdNotif?.id) {
            await supabase.from('notifications').update({ email_sent: true }).eq('id', createdNotif.id);
          }
        }
      } catch (err) {
        console.warn(`[checkAndNotifyOverdueTasks] Email notification failed for ${task.assignee_email}:`, err.message);
      }
    }

    newlyNotified.push(task.task_key);
  }

  return { count: newlyNotified.length, notified: newlyNotified };
}

