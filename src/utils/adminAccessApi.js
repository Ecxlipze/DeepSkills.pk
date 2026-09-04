import { supabase } from '../supabaseClient';

export async function getAuthHeaders() {
  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem('deepskill_session_token');
    if (sessionToken) {
      return { 'Authorization': `Bearer ${sessionToken}` };
    }
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return { 'Authorization': `Bearer ${data.session.access_token}` };
    }
  } catch {
    // Ignore Supabase auth lookup failure
  }

  return {};
}

async function callAccessEndpoint(endpoint, payload) {
  const headers = await getAuthHeaders();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Access synchronization failed.');
  }
  return result;
}

export async function syncStudentAccess({ cnic, name, course, batch }) {
  return callAccessEndpoint('/api/admin/student-access.php', {
    action: 'sync',
    cnic,
    name,
    course,
    batch
  });
}

export async function revokeStudentAccess(cnic) {
  return callAccessEndpoint('/api/admin/student-access.php', {
    action: 'revoke',
    cnic
  });
}

export async function syncTeacherAccess({ cnic, name, assignedCourse, batch }) {
  return callAccessEndpoint('/api/admin/teacher-access.php', {
    action: 'sync',
    cnic,
    name,
    assignedCourse,
    batch
  });
}

export async function revokeTeacherAccess(cnic) {
  return callAccessEndpoint('/api/admin/teacher-access.php', {
    action: 'revoke',
    cnic
  });
}

export async function syncStaffAccess({ cnic, name, role, assignedCourse = '', batch = '' }) {
  return callAccessEndpoint('/api/admin/staff-access.php', {
    action: 'sync',
    cnic,
    name,
    role,
    assignedCourse,
    batch
  });
}

export async function revokeStaffAccess(cnic) {
  return callAccessEndpoint('/api/admin/staff-access.php', {
    action: 'revoke',
    cnic
  });
}
