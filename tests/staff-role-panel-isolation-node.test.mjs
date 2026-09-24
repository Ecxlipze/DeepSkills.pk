import test from 'node:test';
import assert from 'node:assert/strict';
import { mapAdminPathToStaffPath, isStaffRoute, isStaffUser } from '../lib/staffRouting.js';
import { BUILTIN_ROLE_NAMES, getRoleLabel } from '../src/utils/permissions.js';
import { buildUserPayload } from '../lib/portalAuthServer.js';

test('BUILTIN_ROLE_NAMES does not expose raw custom', () => {
  assert.equal(BUILTIN_ROLE_NAMES.custom, 'Staff Member');
});

test('getRoleLabel resolves custom role name and avoids literal custom', () => {
  assert.equal(getRoleLabel('custom', 'Admission Counsellor'), 'Admission Counsellor');
  assert.equal(getRoleLabel('custom', 'Senior Accountant'), 'Senior Accountant');
  assert.equal(getRoleLabel('custom', null), 'Staff Member');
  assert.equal(getRoleLabel('custom', undefined), 'Staff Member');
  assert.equal(getRoleLabel('admin'), 'Admin');
  assert.equal(getRoleLabel('teacher'), 'Teacher');
  assert.equal(getRoleLabel('student'), 'Student');
});

test('mapAdminPathToStaffPath keeps staff in /staff namespace', () => {
  // Counsellor routes
  assert.equal(mapAdminPathToStaffPath('/admin/counsellor/inquiries'), '/staff/inquiries');
  assert.equal(mapAdminPathToStaffPath('/admin/counsellor'), '/staff/inquiries');
  assert.equal(mapAdminPathToStaffPath('/admin/counsellor/enroll'), '/staff/enroll');
  assert.equal(mapAdminPathToStaffPath('/admin/admissions'), '/staff/enroll');
  assert.equal(mapAdminPathToStaffPath('/admin/counsellor/students'), '/staff/students');
  assert.equal(mapAdminPathToStaffPath('/admin/management/students/abc-123'), '/staff/students/abc-123');

  // Finance routes
  assert.equal(mapAdminPathToStaffPath('/admin/finance'), '/staff/fees');
  assert.equal(mapAdminPathToStaffPath('/admin/finance/fees'), '/staff/fees');
  assert.equal(mapAdminPathToStaffPath('/admin/finance/transactions'), '/staff/transactions');

  // Academic routes
  assert.equal(mapAdminPathToStaffPath('/admin/academic/attendance'), '/staff/attendance');
  assert.equal(mapAdminPathToStaffPath('/admin/attendance'), '/staff/attendance');
  assert.equal(mapAdminPathToStaffPath('/admin/academic/tasks'), '/staff/tasks');
  assert.equal(mapAdminPathToStaffPath('/admin/academic/results'), '/staff/results');
  assert.equal(mapAdminPathToStaffPath('/admin/courses'), '/staff/courses');
  assert.equal(mapAdminPathToStaffPath('/admin/management/courses/course-99'), '/staff/courses/course-99');
  assert.equal(mapAdminPathToStaffPath('/admin/academic/announcements'), '/staff/announcements');
  assert.equal(mapAdminPathToStaffPath('/admin/academic/complaints'), '/staff/complaints');

  // HR routes
  assert.equal(mapAdminPathToStaffPath('/admin/hr/applications'), '/staff/applications');
  assert.equal(mapAdminPathToStaffPath('/admin/hr/jds'), '/staff/jds');
  assert.equal(mapAdminPathToStaffPath('/admin/hr/teachers'), '/staff/teachers');
  assert.equal(mapAdminPathToStaffPath('/admin/hr/teachers/teach-1'), '/staff/teachers/teach-1');

  // Time tracker & dashboard
  assert.equal(mapAdminPathToStaffPath('/admin/time-tracker'), '/staff/time-tracker');
  assert.equal(mapAdminPathToStaffPath('/admin/dashboard'), '/staff/dashboard');
  assert.equal(mapAdminPathToStaffPath('/admin'), '/staff/dashboard');

  // Preserves query strings
  assert.equal(mapAdminPathToStaffPath('/admin/counsellor/inquiries?action=new'), '/staff/inquiries?action=new');
  assert.equal(mapAdminPathToStaffPath('/admin/finance/transactions?search=John'), '/staff/transactions?search=John');
});

test('isStaffRoute and isStaffUser identification', () => {
  assert.equal(isStaffRoute('/staff'), true);
  assert.equal(isStaffRoute('/staff/dashboard'), true);
  assert.equal(isStaffRoute('/staff/inquiries'), true);
  assert.equal(isStaffRoute('/admin/dashboard'), false);
  assert.equal(isStaffRoute('/teacher/dashboard'), false);

  assert.equal(isStaffUser({ role: 'custom' }), true);
  assert.equal(isStaffUser({ role: 'admin' }), false);
  assert.equal(isStaffUser({ role: 'teacher' }), false);
  assert.equal(isStaffUser({ role: 'student' }), false);
  assert.equal(isStaffUser(null), false);
});

test('buildUserPayload populates roleName and customRoleName for custom staff', async () => {
  // Mock Supabase client
  const mockSupabase = {
    from: (table) => {
      if (table === 'allowed_cnics') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({
                data: [{ cnic: '35202-1234567-1', role: 'custom', name: 'Zainab Bibi' }]
              })
            })
          })
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({
                data: [{
                  id: 'user-123',
                  cnic: '35202-1234567-1',
                  full_name: 'Zainab Bibi',
                  email: 'zainab@deepskills.pk',
                  phone: '03001234567',
                  role: 'custom',
                  status: 'active',
                  custom_role_id: 'role-counsellor-id',
                  custom_roles: {
                    id: 'role-counsellor-id',
                    name: 'Admission Counsellor',
                    color: 'blue',
                    icon: '🎓',
                    permissions: { counsellor: 'full', students: 'view' }
                  }
                }]
              })
            })
          })
        };
      }
      if (table === 'hr_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null })
            })
          })
        };
      }
      return {};
    }
  };

  const payload = await buildUserPayload(mockSupabase, '35202-1234567-1');
  assert.equal(payload.role, 'custom');
  assert.equal(payload.roleName, 'Admission Counsellor');
  assert.equal(payload.customRoleName, 'Admission Counsellor');
  assert.equal(payload.custom_roles.name, 'Admission Counsellor');
  assert.equal(payload.permissions.counsellor, 'full');
});
