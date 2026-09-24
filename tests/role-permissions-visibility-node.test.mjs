import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessDepartment,
  getVisibleDepartments,
  getDepartmentNav,
  getDefaultDepartmentPath
} from '../src/utils/departments.js';

test('canAccessDepartment enforces strict role boundaries', () => {
  const adminUser = { role: 'admin', permissions: {} };
  const counsellorUser = {
    role: 'custom',
    permissions: { counsellor: 'full', students: 'view', courses: 'view', announcements: 'view', referral: 'full' }
  };
  const financeUser = {
    role: 'custom',
    permissions: { finance: 'full', reports: 'full', students: 'view', courses: 'view' }
  };
  const marketingUser = {
    role: 'custom',
    permissions: { blog: 'full', announcements: 'full', referral: 'full', courses: 'view' }
  };

  // Admin can access all
  assert.equal(canAccessDepartment(adminUser, 'all'), true);
  assert.equal(canAccessDepartment(adminUser, 'counsellor'), true);
  assert.equal(canAccessDepartment(adminUser, 'hr'), true);
  assert.equal(canAccessDepartment(adminUser, 'finance'), true);

  // Counsellor user cannot access Super Admin (all), HR, Finance
  assert.equal(canAccessDepartment(counsellorUser, 'all'), false);
  assert.equal(canAccessDepartment(counsellorUser, 'hr'), false);
  assert.equal(canAccessDepartment(counsellorUser, 'finance'), false);
  assert.equal(canAccessDepartment(counsellorUser, 'counsellor'), true);

  // Finance user cannot access Counsellor, HR, Super Admin (all)
  assert.equal(canAccessDepartment(financeUser, 'all'), false);
  assert.equal(canAccessDepartment(financeUser, 'counsellor'), false);
  assert.equal(canAccessDepartment(financeUser, 'hr'), false);
  assert.equal(canAccessDepartment(financeUser, 'finance'), true);

  // Marketing user cannot access HR, Finance, Counsellor
  assert.equal(canAccessDepartment(marketingUser, 'hr'), false);
  assert.equal(canAccessDepartment(marketingUser, 'finance'), false);
  assert.equal(canAccessDepartment(marketingUser, 'counsellor'), false);
});

test('getVisibleDepartments only yields departments with accessible modules', () => {
  const hrUser = {
    role: 'custom',
    permissions: { hr: 'full', teachers: 'full', attendance: 'view', reports: 'view', complaints: 'view' }
  };

  const visibleDepts = getVisibleDepartments(hrUser).map((d) => d.id);
  assert.equal(visibleDepts.includes('hr'), true);
  assert.equal(visibleDepts.includes('academic'), true); // has attendance, complaints, reports
  assert.equal(visibleDepts.includes('counsellor'), false);
  assert.equal(visibleDepts.includes('finance'), false);
  assert.equal(visibleDepts.includes('all'), false);
});

test('getDepartmentNav completely removes inaccessible items and orphan section headers', () => {
  const marketingUser = {
    role: 'custom',
    permissions: { blog: 'full', announcements: 'full', referral: 'full', courses: 'view' }
  };

  const managementNav = getDepartmentNav(marketingUser, 'management');

  // Should contain Courses, Referral, Blog
  const labels = managementNav.map((item) => item.label || item.section);
  assert.equal(labels.includes('Courses & Batches'), true);
  assert.equal(labels.includes('Referral Program'), true);
  assert.equal(labels.includes('Blog'), true);

  // Must completely hide forbidden items
  assert.equal(labels.includes('Students'), false);
  assert.equal(labels.includes('Teachers'), false);
  assert.equal(labels.includes('User Management'), false);
  assert.equal(labels.includes('Reports'), false);
  assert.equal(labels.includes('Settings'), false);

  // SYSTEM section header must be pruned because all items under it are hidden
  assert.equal(labels.includes('SYSTEM'), false);

  // MANAGEMENT section header should remain because Courses, Referral, Blog are visible under it
  assert.equal(labels.includes('MANAGEMENT'), true);
});

test('getDefaultDepartmentPath targets the first accessible child route', () => {
  const marketingUser = {
    role: 'custom',
    permissions: { blog: 'full', announcements: 'full', referral: 'full', courses: 'view' }
  };

  const defaultPath = getDefaultDepartmentPath(marketingUser);
  // Academic -> Announcements, or Management -> Courses
  assert.equal(['/admin/academic/announcements', '/admin/management/courses'].includes(defaultPath), true);
  // Never default to a restricted overview
  assert.notEqual(defaultPath, '/admin/academic');
  assert.notEqual(defaultPath, '/admin/management');
  assert.notEqual(defaultPath, '/admin/dashboard');

  const counsellorUser = {
    role: 'custom',
    permissions: { counsellor: 'full', students: 'view', courses: 'view', referral: 'full' }
  };
  const counsellorDefaultPath = getDefaultDepartmentPath(counsellorUser);
  assert.equal(counsellorDefaultPath, '/admin/counsellor');
});

test('authorizeAdminOperation allows view permission on GET and enforces full on mutations', async () => {
  const { authorizeAdminOperation } = await import('../lib/portalAuthServer.js');

  const viewerUser = {
    id: 'user-viewer-1',
    role: 'custom',
    status: 'active',
    permissions: { attendance: 'view', counsellor: 'full' }
  };

  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: viewerUser.id, app_metadata: {} } } })
    },
    from: () => ({
      select: () => ({
        ilike: () => ({
          limit: async () => ({ data: [viewerUser] })
        }),
        eq: () => ({
          limit: async () => ({ data: [viewerUser] }),
          maybeSingle: async () => ({ data: viewerUser })
        })
      })
    })
  };

  const fakeJwt = 'header.payload.signature';

  // GET request should succeed for user with 'view' permission
  const getReq = {
    method: 'GET',
    headers: { authorization: `Bearer ${fakeJwt}` },
    __supabase: mockSupabase
  };
  const getAuth = await authorizeAdminOperation(getReq, 'attendance');
  assert.equal(getAuth.ok, true);

  // POST request should fail for user with only 'view' permission
  const postReq = {
    method: 'POST',
    headers: { authorization: `Bearer ${fakeJwt}` },
    __supabase: mockSupabase
  };
  const postAuth = await authorizeAdminOperation(postReq, 'attendance');
  assert.equal(postAuth.ok, false);
  assert.equal(postAuth.status, 403);
  assert.match(postAuth.message, /requires full on attendance/i);

  // GET request should fail for user with 'none' on attendance
  const noPermUser = {
    id: 'user-none-1',
    role: 'custom',
    status: 'active',
    permissions: { attendance: 'none', counsellor: 'full' }
  };
  const mockSupabaseNoPerm = {
    auth: {
      getUser: async () => ({ data: { user: { id: noPermUser.id, app_metadata: {} } } })
    },
    from: () => ({
      select: () => ({
        ilike: () => ({
          limit: async () => ({ data: [noPermUser] })
        }),
        eq: () => ({
          limit: async () => ({ data: [noPermUser] }),
          maybeSingle: async () => ({ data: noPermUser })
        })
      })
    })
  };
  const noPermGetReq = {
    method: 'GET',
    headers: { authorization: `Bearer ${fakeJwt}` },
    __supabase: mockSupabaseNoPerm
  };
  const noPermGetAuth = await authorizeAdminOperation(noPermGetReq, 'attendance');
  assert.equal(noPermGetAuth.ok, false);
  assert.equal(noPermGetAuth.status, 403);
  assert.match(noPermGetAuth.message, /requires view on attendance/i);
});

