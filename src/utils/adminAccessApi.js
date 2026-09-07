import { supabase } from '../supabaseClient';

export async function getAuthHeaders() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('deepskill_user');
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.authType === 'supabase_admin' || parsed?.role === 'admin') {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          return { 'Authorization': `Bearer ${data.session.access_token}` };
        }
      }
    } catch {
      // Continue to session token
    }

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
  const cleanEndpoint = endpoint.replace(/\.php$/i, '');
  let response;

  try {
    response = await fetch(cleanEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });
    if (response.status !== 404) {
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Access synchronization failed.');
      }
      return result;
    }
  } catch (err) {
    if (!err.message?.includes('404')) {
      throw err;
    }
  }

  // Fallback to PHP endpoint if Next route returns 404
  const phpResponse = await fetch(`${cleanEndpoint}.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(payload)
  });

  const phpResult = await phpResponse.json().catch(() => ({}));
  if (!phpResponse.ok || phpResult.status === 'error') {
    throw new Error(phpResult.message || 'Access synchronization failed.');
  }
  return phpResult;
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
