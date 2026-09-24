import { getAuthToken } from './timeTrackingApi.js';

const API_BASE = '/api/tasks';

function authHeader(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function fetchStaffTasks(token, filters = {}) {
  const data = await fetchStaffTasksData(token, filters);
  return data.tasks || [];
}

export async function fetchStaffTasksData(token, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      params.append(k, v);
    }
  });
  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch tasks');
  return {
    tasks: data.tasks || [],
    assignees: data.assignees || []
  };
}

export async function fetchTaskDetails(token, taskId) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch task details');
  return data;
}

export async function createStaffTask(token, payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create task');
  return data.task;
}

export async function updateStaffTask(token, taskId, payload) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update task');
  return data.task;
}

export async function deleteStaffTask(token, taskId) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    method: 'DELETE',
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete task');
  return data;
}

export async function reorderStaffTasks(token, { columnStatus, taskIds }) {
  const res = await fetch(`${API_BASE}/reorder`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ columnStatus, taskIds })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reorder tasks');
  return data;
}

export async function addTaskSubtaskApi(token, taskId, title) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'add_subtask', title })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add subtask');
  return data.task;
}

export async function toggleTaskSubtaskApi(token, taskId, subtaskId) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'toggle_subtask', subtaskId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to toggle subtask');
  return data.task;
}

export async function deleteTaskSubtaskApi(token, taskId, subtaskId) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'delete_subtask', subtaskId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete subtask');
  return data.task;
}

export async function addTaskAttachmentApi(token, taskId, attachment) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'add_attachment', attachment })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add attachment');
  return data.task;
}

export async function deleteTaskAttachmentApi(token, taskId, attachmentId) {
  const res = await fetch(`${API_BASE}/${taskId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'delete_attachment', attachmentId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete attachment');
  return data.task;
}

export async function checkOverdueTasksApi(token) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'check_overdue' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to check overdue tasks');
  return data;
}

export function generateJiraCsv(tasks = []) {
  const headers = [
    'Issue Key',
    'Summary',
    'Status',
    'Priority',
    'Department',
    'Project',
    'Assignee',
    'Assignee Email',
    'Start Date',
    'Due Date',
    'Is Overdue',
    'Original Estimate (Hours)',
    'Time Spent (HH:MM:SS)',
    'Time Spent (Decimal Hours)',
    'Variance Hours (Actual - Est)',
    'Checklist / Subtasks Progress',
    'Attachments Count',
    'Created Date'
  ];

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = (tasks || []).map(t => {
    const totalSecs = t.current_total_logged_seconds || t.total_logged_seconds || 0;
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const timeSpentHms = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const decimalHours = (totalSecs / 3600).toFixed(2);
    const est = Number(t.estimated_hours) || 0;
    const variance = (parseFloat(decimalHours) - est).toFixed(2);
    const varianceStr = parseFloat(variance) > 0 ? `+${variance}` : variance;

    const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
    const doneSubtasks = subtasks.filter(s => s.done).length;
    const subtaskProgress = subtasks.length > 0
      ? `${doneSubtasks}/${subtasks.length} (${Math.round((doneSubtasks / subtasks.length) * 100)}%)`
      : 'None';

    const attachmentsCount = Array.isArray(t.attachments) ? t.attachments.length : 0;
    const isOverdue = t.is_overdue ? 'YES' : 'NO';

    return [
      escapeCell(t.task_key),
      escapeCell(t.title),
      escapeCell((t.status || 'todo').toUpperCase().replace('_', ' ')),
      escapeCell((t.priority || 'medium').toUpperCase()),
      escapeCell(t.department || 'Operations'),
      escapeCell(t.staff_time_projects?.name || 'General'),
      escapeCell(t.assignee_name || 'Unassigned'),
      escapeCell(t.assignee_email || ''),
      escapeCell(t.start_date || ''),
      escapeCell(t.due_date || ''),
      escapeCell(isOverdue),
      escapeCell(est.toFixed(2)),
      escapeCell(timeSpentHms),
      escapeCell(decimalHours),
      escapeCell(varianceStr),
      escapeCell(subtaskProgress),
      escapeCell(attachmentsCount),
      escapeCell(t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : '')
    ].join(',');
  });

  return [headers.map(escapeCell).join(','), ...rows].join('\r\n');
}

export function downloadJiraCsv(tasks = [], customFilename) {
  const filename = customFilename || `deepskills-tasks-report-${new Date().toISOString().slice(0, 10)}.csv`;
  const csvData = generateJiraCsv(tasks);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

