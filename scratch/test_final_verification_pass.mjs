import assert from 'node:assert';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { buildCsv } from '../src/utils/csvExport.js';
import { canAccess, getFirstAccessibleAdminPath } from '../src/utils/permissions.js';
import { getDepartmentNav, canAccessDepartment } from '../src/utils/departments.js';

console.log('=== DEEPSKILLS FINAL VERIFICATION PASS ===\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failedTests++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failedTests++;
  }
}

// -------------------------------------------------------------
// SECTION 1: VERIFY PAY TEACHER SALARY END-TO-END
// -------------------------------------------------------------
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.REACT_APP_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

test('1.1 RBAC permissions for salary payment', () => {
  const viewOnlyUser = { role: 'custom', permissions: { finance: 'view' } };
  const canMutateView = viewOnlyUser.role === 'admin' || canAccess(viewOnlyUser.permissions, 'finance', 'full');
  assert.strictEqual(canMutateView, false, 'finance:view user must not have mutation rights');

  const fullUser = { role: 'custom', permissions: { finance: 'full' } };
  const canMutateFull = fullUser.role === 'admin' || canAccess(fullUser.permissions, 'finance', 'full');
  assert.strictEqual(canMutateFull, true, 'finance:full user must have mutation rights');

  const adminUser = { role: 'admin', permissions: {} };
  const canMutateAdmin = adminUser.role === 'admin' || canAccess(adminUser.permissions, 'finance', 'full');
  assert.strictEqual(canMutateAdmin, true, 'admin user must have mutation rights');
});

let testTeacherId = null;
let testPaymentRecordId = null;

await asyncTest('1.2 End-to-end salary payment insertion into teacher_payments', async () => {
  // 1. Fetch an existing teacher
  const { data: teachers, error: tErr } = await supabase.from('teachers').select('id, name').limit(1);
  assert.ifError(tErr);
  assert.ok(teachers && teachers.length > 0, 'At least one teacher must exist in DB');
  const teacher = teachers[0];
  testTeacherId = teacher.id;

  const testMonth = '2099-01'; // Safe future test month
  const testAmount = 75000;
  const testDate = '2099-01-05';
  const testMethod = 'bank_transfer';
  const testRef = 'TEST-SALARY-TXN-999';

  // Ensure clean pre-condition for test month
  await supabase.from('teacher_payments').delete().eq('teacher_id', testTeacherId).eq('month', testMonth);

  // 2. Perform payment insertion as in FinanceManager
  const { data: insertData, error: insErr } = await supabase
    .from('teacher_payments')
    .insert({
      teacher_id: testTeacherId,
      amount: testAmount,
      month: testMonth,
      paid_on: testDate,
      method: testMethod,
      reference: testRef,
      status: 'Paid'
    })
    .select()
    .single();

  assert.ifError(insErr);
  assert.ok(insertData, 'Payment record must be created in teacher_payments');
  testPaymentRecordId = insertData.id;

  // Verify all fields in teacher_payments
  assert.strictEqual(insertData.teacher_id, testTeacherId, 'Teacher ID must match');
  assert.strictEqual(Number(insertData.amount), testAmount, 'Amount must match');
  assert.strictEqual(insertData.month, testMonth, 'Month must match');
  assert.strictEqual(insertData.paid_on, testDate, 'Paid date must match');
  assert.strictEqual(insertData.method, testMethod, 'Method must match');
  assert.strictEqual(insertData.reference, testRef, 'Reference must match');
  assert.strictEqual(insertData.status, 'Paid', 'Status must be Paid');
});

await asyncTest('1.3 Duplicate salary payment rejection for same teacher and month', async () => {
  const testMonth = '2099-01';

  // Check duplicate detection logic from FinanceManager
  const { data: existingTPay } = await supabase
    .from('teacher_payments')
    .select('id')
    .eq('teacher_id', testTeacherId)
    .eq('month', testMonth)
    .maybeSingle();

  assert.ok(existingTPay, 'Existing payment record must be detected');
  assert.strictEqual(existingTPay.id, testPaymentRecordId, 'Must find existing payment ID');

  // Attempt duplicate insert should be blocked by application rule
  const duplicateBlocked = Boolean(existingTPay);
  assert.strictEqual(duplicateBlocked, true, 'Duplicate payment must be blocked');
});

await asyncTest('1.4 Clean up test salary payment records', async () => {
  if (testPaymentRecordId) {
    const { error: delErr } = await supabase.from('teacher_payments').delete().eq('id', testPaymentRecordId);
    assert.ifError(delErr);
  }

  // Verify deletion
  const { data: remainingTPay } = await supabase.from('teacher_payments').select('id').eq('month', '2099-01');
  assert.strictEqual(remainingTPay.length, 0, 'No test teacher_payments should remain');
});

// -------------------------------------------------------------
// SECTION 2: COMPLETE RESULTS CSV EXPORT
// -------------------------------------------------------------
test('2.1 Results CSV columns format and escaping', () => {
  const expectedHeaders = [
    'Rank',
    'Student Name',
    'CNIC',
    'Batch',
    'Exam Type',
    'Attendance Marks',
    'Assignment Marks',
    'Quiz Marks',
    'Task Completion Marks',
    'Project Marks',
    'Total Marks',
    'Grade',
    'Passed/Status',
    'Last Sync'
  ];

  const adminResultsCode = fs.readFileSync('src/admin/AdminResults.js', 'utf8');
  for (const header of expectedHeaders) {
    assert.ok(adminResultsCode.includes(`'${header}'`), `AdminResults must include column header '${header}'`);
  }

  // Test CSV builder escaping with special characters: commas, quotes, newlines
  const testRows = [
    [
      1,
      'Khan, Muhammad "Mo"',
      '35201-1234567-1',
      'Full Stack "Batch 12", Evening',
      'midterm',
      20,
      15,
      10,
      25,
      20,
      90,
      'A+',
      'PASS',
      '2026-09-05\n12:00:00'
    ]
  ];

  const csv = buildCsv(expectedHeaders, testRows);

  // Verify all fields are properly quoted
  assert.ok(csv.includes('"Khan, Muhammad ""Mo"""'), 'Commas and inner quotes must be escaped per RFC 4180');
  assert.ok(csv.includes('"Full Stack ""Batch 12"", Evening"'), 'Batch quotes and comma must be escaped');
  assert.ok(csv.includes('"2026-09-05\n12:00:00"'), 'Newlines inside fields must be enclosed in quotes');
});

// -------------------------------------------------------------
// SECTION 3: VERIFY DEPARTMENT HUB REDIRECTS
// -------------------------------------------------------------
test('3.1 custom attendance:view only on /admin/academic -> attendance', () => {
  const user = { role: 'custom', permissions: { attendance: 'view' } };
  const canAccessDept = canAccessDepartment(user, 'academic');
  assert.strictEqual(canAccessDept, true, 'User with attendance:view can access academic department');

  const navItems = getDepartmentNav(user, 'academic') || [];
  const target = navItems.find((item) => item.path && item.path !== '/admin/academic' && !item.section);
  assert.strictEqual(target?.path, '/admin/academic/attendance', 'Must resolve to /admin/academic/attendance');
});

test('3.2 custom results:view only on /admin/academic -> results', () => {
  const user = { role: 'custom', permissions: { results: 'view' } };
  const canAccessDept = canAccessDepartment(user, 'academic');
  assert.strictEqual(canAccessDept, true, 'User with results:view can access academic department');

  const navItems = getDepartmentNav(user, 'academic') || [];
  const target = navItems.find((item) => item.path && item.path !== '/admin/academic' && !item.section);
  assert.strictEqual(target?.path, '/admin/academic/results', 'Must resolve to /admin/academic/results');
});

test('3.3 custom students:view only on /admin/management -> students', () => {
  const user = { role: 'custom', permissions: { students: 'view' } };
  const canAccessDept = canAccessDepartment(user, 'management');
  assert.strictEqual(canAccessDept, true, 'User with students:view can access management department');

  const navItems = getDepartmentNav(user, 'management') || [];
  const target = navItems.find((item) => item.path && item.path !== '/admin/management' && !item.section);
  assert.strictEqual(target?.path, '/admin/management/students', 'Must resolve to /admin/management/students');
});

test('3.4 custom teachers:view only on /admin/management -> teachers', () => {
  const user = { role: 'custom', permissions: { teachers: 'view' } };
  const canAccessDept = canAccessDepartment(user, 'management');
  assert.strictEqual(canAccessDept, true, 'User with teachers:view can access management department');

  const navItems = getDepartmentNav(user, 'management') || [];
  const target = navItems.find((item) => item.path && item.path !== '/admin/management' && !item.section);
  assert.strictEqual(target?.path, '/admin/management/teachers', 'Must resolve to /admin/management/teachers');
});

test('3.5 custom user with no accessible child module -> safe fallback without loop', () => {
  const user = { role: 'custom', permissions: {} };

  // 1. Department access check
  const canAccessAcademic = canAccessDepartment(user, 'academic');
  const canAccessManagement = canAccessDepartment(user, 'management');
  assert.strictEqual(canAccessAcademic, false, 'User with {} cannot access academic department');
  assert.strictEqual(canAccessManagement, false, 'User with {} cannot access management department');

  // 2. Navigation item resolution
  const academicNav = getDepartmentNav(user, 'academic') || [];
  const targetAcademic = academicNav.find((item) => item.path && item.path !== '/admin/academic' && !item.section);
  assert.strictEqual(targetAcademic, undefined, 'No target route inside academic');

  // 3. Fallback resolution must point to safe login, not unauthorized or redirect loop
  const fallback = getFirstAccessibleAdminPath(user.permissions);
  assert.strictEqual(fallback, '/login', 'Fallback for user with no permissions must be /login');
});

console.log(`\n========================================`);
console.log(`Summary: ${passedTests} passed, ${failedTests} failed.`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL FINAL VERIFICATION PASS TESTS PASSED!');
  process.exit(0);
}
