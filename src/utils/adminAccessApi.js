import { requestJson } from './requestJson';
import { supabase } from '../supabaseClient';

export async function getAuthHeaders() {
  if (typeof window !== 'undefined') {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return { 'Authorization': `Bearer ${data.session.access_token}` };
      }
    } catch (_) {}

    try {
      const stored = localStorage.getItem('deepskill_user');
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.sessionToken) {
        return { 'Authorization': `Bearer ${parsed.sessionToken}` };
      }
      if (parsed?.token) {
        return { 'Authorization': `Bearer ${parsed.token}` };
      }
    } catch (_) {}

    const sessionToken = localStorage.getItem('deepskill_session_token') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('token');
    if (sessionToken) {
      return { 'Authorization': `Bearer ${sessionToken}` };
    }
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return { 'Authorization': `Bearer ${data.session.access_token}` };
    }
  } catch (_) {}

  return {};
}

async function callAccessEndpoint(endpoint, payload) {
  return requestJson(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() }, body: JSON.stringify(payload)
  });
}

export async function syncStudentAccess({ cnic, name, course, batch }) {
  return callAccessEndpoint('/api/admin/student-access', {
    action: 'sync',
    cnic,
    name,
    course,
    batch
  });
}

export async function revokeStudentAccess(cnic) {
  return callAccessEndpoint('/api/admin/student-access', {
    action: 'revoke',
    cnic
  });
}

export async function syncTeacherAccess({ cnic, name, assignedCourse, batch }) {
  return callAccessEndpoint('/api/admin/teacher-access', {
    action: 'sync',
    cnic,
    name,
    assignedCourse,
    batch
  });
}

export async function revokeTeacherAccess(cnic) {
  return callAccessEndpoint('/api/admin/teacher-access', {
    action: 'revoke',
    cnic
  });
}

export async function syncStaffAccess({ cnic, name, role, assignedCourse = '', batch = '' }) {
  return callAccessEndpoint('/api/admin/staff-access', {
    action: 'sync',
    cnic,
    name,
    role,
    assignedCourse,
    batch
  });
}

export async function revokeStaffAccess(cnic) {
  return callAccessEndpoint('/api/admin/staff-access', {
    action: 'revoke',
    cnic
  });
}
