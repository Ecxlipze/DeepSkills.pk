const API_BASE = '/api/time';

export async function getAuthToken(user = null) {
  if (user?.sessionToken) return user.sessionToken;
  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem('deepskill_session_token');
    if (sessionToken) return sessionToken;
    try {
      const module = await import('../supabaseClient');
      const { data } = await module.supabase.auth.getSession();
      if (data?.session?.access_token) return data.session.access_token;
    } catch {}
  }
  return null;
}

function authHeader(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function fetchTodayShift(token) {
  const res = await fetch(`${API_BASE}/shift`, {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch shift status');
  return data;
}

export async function postShiftAction(token, action, notes = '') {
  const res = await fetch(`${API_BASE}/shift`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ action, notes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to perform ${action}`);
  return data;
}

export async function fetchTrackerData(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/tracker?${query}`, {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch time entries');
  return data;
}

export async function startTaskTimer(token, { projectId, taskId, description, billable }) {
  const res = await fetch(`${API_BASE}/tracker`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'start', projectId, taskId, description, billable })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start timer');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('deepskills_timer_change', { detail: data }));
  }
  return data;
}

export async function stopTaskTimer(token, entryId = null) {
  const res = await fetch(`${API_BASE}/tracker`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'stop', entryId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to stop timer');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('deepskills_timer_change', { detail: data }));
  }
  return data;
}

export async function logManualTime(token, payload) {
  const res = await fetch(`${API_BASE}/tracker`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ action: 'manual', ...payload })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to log manual time');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('deepskills_timer_change', { detail: data }));
  }
  return data;
}

export async function updateTimeEntry(token, payload) {
  const res = await fetch(`${API_BASE}/tracker`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update entry');
  return data;
}

export async function deleteTimeEntry(token, id) {
  const res = await fetch(`${API_BASE}/tracker?id=${id}`, {
    method: 'DELETE',
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete entry');
  return data;
}

export async function fetchProjects(token) {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch projects');
  return data.projects || [];
}

export async function fetchLiveTeamPulse(token) {
  const res = await fetch('/api/admin/time/reports?mode=live', {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch team pulse');
  return data;
}

export async function fetchTimeReports(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/admin/time/reports?${query}`, {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch reports');
  return data;
}

export function formatSeconds(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatHourDecimal(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  return (s / 3600).toFixed(2);
}
