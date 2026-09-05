/**
 * Real RBAC Verification Test
 * Tests production exports directly from src/utils/permissions.js and src/utils/departments.js
 */

import {
  MODULE_KEYS,
  ADMIN_FULL_PERMISSIONS,
  canAccess,
  getFirstAccessibleAdminPath,
  resolvePermissions,
  buildAdminSidebar
} from '../src/utils/permissions.js';

import {
  DEPARTMENTS,
  DEPARTMENT_NAV,
  ADMIN_ROUTE_ALIASES,
  normalizeAdminPath,
  canAccessDepartment,
  getVisibleDepartments,
  getDepartmentByPath,
  getDepartmentRouteAccess,
  getDepartmentNav
} from '../src/utils/departments.js';

let passCount = 0;
let failCount = 0;

function assert(name, condition, details = '') {
  if (condition) {
    passCount++;
    console.log(`  [PASS] ${name}`);
  } else {
    failCount++;
    console.error(`  [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
  }
}

console.log('========================================================');
console.log('=== REAL RBAC PRODUCTION CODE VERIFICATION SUITE ======');
console.log('========================================================\n');

// 1. Module Keys & Standard RBAC structure
console.log('--- 1. Module Keys & RBAC Model ---');
assert('Exactly 17 permission keys registered in MODULE_KEYS', MODULE_KEYS.length === 17);
assert("Contains 'students'", MODULE_KEYS.includes('students'));
assert("Contains 'counsellor'", MODULE_KEYS.includes('counsellor'));
assert("Contains 'attendance'", MODULE_KEYS.includes('attendance'));
assert("Contains 'tasks'", MODULE_KEYS.includes('tasks'));
assert("Contains 'results'", MODULE_KEYS.includes('results'));
assert("Contains 'finance'", MODULE_KEYS.includes('finance'));
assert("Contains 'hr'", MODULE_KEYS.includes('hr'));
assert("Contains 'users'", MODULE_KEYS.includes('users'));

// 2. CanAccess: students:none vs students:view vs students:full
console.log('\n--- 2. Production canAccess() Matrix ---');
const permsNone = { students: 'none' };
const permsView = { students: 'view' };
const permsFull = { students: 'full' };

assert("students:none -> canAccess(view) is FALSE", canAccess(permsNone, 'students', 'view') === false);
assert("students:none -> canAccess(full) is FALSE", canAccess(permsNone, 'students', 'full') === false);

assert("students:view -> canAccess(view) is TRUE (view allowed)", canAccess(permsView, 'students', 'view') === true);
assert("students:view -> canAccess(full) is FALSE (mutations blocked)", canAccess(permsView, 'students', 'full') === false);

assert("students:full -> canAccess(view) is TRUE", canAccess(permsFull, 'students', 'view') === true);
assert("students:full -> canAccess(full) is TRUE (mutations allowed)", canAccess(permsFull, 'students', 'full') === true);

// 3. Nested Route Resolution (/admin/management/students/:id & aliases)
console.log('\n--- 3. Nested Route Resolution ---');
const studentUuid = '5eaba283-ddb3-4837-ae01-35dbefd41826';
const nestedRoute = `/admin/management/students/${studentUuid}`;
const legacyNestedRoute = `/admin/students/${studentUuid}`;

const normNested = normalizeAdminPath(nestedRoute);
assert("normalizeAdminPath preserves /admin/management/students/:id", normNested === nestedRoute);

const normLegacy = normalizeAdminPath(legacyNestedRoute);
assert("normalizeAdminPath rewrites legacy /admin/students/:id to /admin/management/students/:id", normLegacy === nestedRoute);

const accessNested = getDepartmentRouteAccess(nestedRoute);
assert("getDepartmentRouteAccess on nested student route resolves permissionKey 'students'", accessNested.permissionKey === 'students');
assert("getDepartmentRouteAccess on nested student route resolves departmentId 'management'", accessNested.departmentId === 'management');
assert("allowedRoles includes 'admin' and 'custom'", accessNested.allowedRoles.includes('admin') && accessNested.allowedRoles.includes('custom'));

const accessLegacy = getDepartmentRouteAccess(legacyNestedRoute);
assert("getDepartmentRouteAccess on legacy route resolves permissionKey 'students'", accessLegacy.permissionKey === 'students');

// Test other nested routes
const teacherUuid = '0a171623-96cf-46c8-b8dc-6164db3b2b6c';
assert("Nested teacher route resolves permissionKey 'teachers'", getDepartmentRouteAccess(`/admin/management/teachers/${teacherUuid}`).permissionKey === 'teachers');
assert("Legacy teacher route rewrites and resolves 'teachers'", getDepartmentRouteAccess(`/admin/teachers/${teacherUuid}`).permissionKey === 'teachers');

// 4. Department & Sub-route Coverage
console.log('\n--- 4. Department & Sub-route Route Access ---');
const routeExpectations = [
  { path: '/admin/dashboard', expectedKey: undefined, superAdminOnly: true },
  { path: '/admin/counsellor', expectedKey: 'counsellor', dept: 'counsellor' },
  { path: '/admin/counsellor/inquiries', expectedKey: 'counsellor', dept: 'counsellor' },
  { path: '/admin/counsellor/enroll', expectedKey: 'counsellor', dept: 'counsellor' },
  { path: '/admin/hr', expectedKey: 'hr', dept: 'hr' },
  { path: '/admin/hr/applications', expectedKey: 'hr', dept: 'hr' },
  { path: '/admin/finance', expectedKey: 'finance', dept: 'finance' },
  { path: '/admin/finance/transactions', expectedKey: 'finance', dept: 'finance' },
  { path: '/admin/academic/attendance', expectedKey: 'attendance', dept: 'academic' },
  { path: '/admin/academic/tasks', expectedKey: 'tasks', dept: 'academic' },
  { path: '/admin/academic/results', expectedKey: 'results', dept: 'academic' },
  { path: '/admin/academic/announcements', expectedKey: 'announcements', dept: 'academic' },
  { path: '/admin/academic/complaints', expectedKey: 'complaints', dept: 'academic' },
  { path: '/admin/academic/chats', expectedKey: 'tasks', dept: 'academic' },
  { path: '/admin/management/students', expectedKey: 'students', dept: 'management' },
  { path: '/admin/management/teachers', expectedKey: 'teachers', dept: 'management' },
  { path: '/admin/management/courses', expectedKey: 'courses', dept: 'management' },
  { path: '/admin/management/users', expectedKey: 'users', dept: 'management' },
  { path: '/admin/management/blog', expectedKey: 'blog', dept: 'management' },
  { path: '/admin/management/reports', expectedKey: 'reports', dept: 'management' },
  { path: '/admin/management/referral', expectedKey: 'referral', dept: 'management' }
];

for (const exp of routeExpectations) {
  const res = getDepartmentRouteAccess(exp.path);
  if (exp.superAdminOnly) {
    assert(`${exp.path} is superAdminOnly (role 'admin' only)`, res.allowedRoles.length === 1 && res.allowedRoles[0] === 'admin');
  } else {
    assert(`${exp.path} maps to permissionKey '${exp.expectedKey}' in department '${exp.dept}'`, res.permissionKey === exp.expectedKey && res.departmentId === exp.dept);
  }
}

// 5. Department Visibility for Custom Roles
console.log('\n--- 5. Department Visibility & canAccessDepartment ---');
const userAttendanceOnly = { role: 'custom', permissions: { attendance: 'view' } };
const userManagementOnly = { role: 'custom', permissions: { students: 'view' } };

assert("Custom user with attendance:view can access 'academic' department", canAccessDepartment(userAttendanceOnly, 'academic') === true);
assert("Custom user with attendance:view CANNOT access 'management' department", canAccessDepartment(userAttendanceOnly, 'management') === false);
assert("Custom user with attendance:view CANNOT access 'finance' department", canAccessDepartment(userAttendanceOnly, 'finance') === false);
assert("Custom user with attendance:view CANNOT access 'all' (superAdminOnly)", canAccessDepartment(userAttendanceOnly, 'all') === false);

assert("Custom user with students:view can access 'management' department", canAccessDepartment(userManagementOnly, 'management') === true);
assert("Custom user with students:view CANNOT access 'academic' department", canAccessDepartment(userManagementOnly, 'academic') === false);

// 6. First Accessible Admin Path
console.log('\n--- 6. First Accessible Admin Path Resolution ---');
assert("Attendance-only user first path is /admin/academic/attendance", getFirstAccessibleAdminPath({ attendance: 'view' }) === '/admin/academic/attendance');
assert("Tasks-only user first path is /admin/academic/tasks", getFirstAccessibleAdminPath({ tasks: 'view' }) === '/admin/academic/tasks');
assert("Students-only user first path is /admin/management/students", getFirstAccessibleAdminPath({ students: 'view' }) === '/admin/management/students');
assert("Finance-only user first path is /admin/finance", getFirstAccessibleAdminPath({ finance: 'view' }) === '/admin/finance');
assert("Empty permissions falls back to /login", getFirstAccessibleAdminPath({}) === '/login');

console.log('\n========================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('========================================================');

if (failCount > 0) {
  process.exit(1);
}
process.exit(0);
