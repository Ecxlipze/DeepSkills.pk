import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

console.log('=== VERIFYING 8 HIGH-IMPACT PORTAL BUG FIXES ===\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. Result Calculation 10x Error
// -------------------------------------------------------------
test('Fix 1: resultUtils.js calculation math (10x error resolved)', () => {
  const code = fs.readFileSync('src/utils/resultUtils.js', 'utf8');
  // Strip export keywords and top supabase import to run pure functions in VM context
  const cleanCode = code
    .replace(/import\s+.*?;/g, '')
    .replace(/export\s+function/g, 'function')
    .replace(/export\s+async\s+function/g, 'async function');

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(cleanCode + '\nthis.calcResult = calcResult;', sandbox);
  const calcResult = sandbox.calcResult;

  // Midterm: 20% attendance, 30% assignment, 30% quiz, 20% task completion
  const perfectAttendance = [{ status: 'present' }];
  const perfectTasks = [
    { category: 'Assignment', marksObtained: 100, totalMarks: 100, status: 'Submitted' },
    { category: 'Quiz', marksObtained: 100, totalMarks: 100, status: 'Submitted' },
    { category: 'Task', marksObtained: 100, totalMarks: 100, status: 'Submitted' }
  ];

  const result = calcResult(perfectAttendance, perfectTasks, 'midterm');

  assert.strictEqual(result.breakdown.attendance, 20, `Attendance marks should be 20, got ${result.breakdown.attendance}`);
  assert.strictEqual(result.breakdown.assignment, 30, `Assignment marks should be 30, got ${result.breakdown.assignment}`);
  assert.strictEqual(result.breakdown.quiz, 30, `Quiz marks should be 30, got ${result.breakdown.quiz}`);
  assert.strictEqual(result.breakdown.taskCompletion, 20, `Task completion marks should be 20, got ${result.breakdown.taskCompletion}`);
  assert.strictEqual(result.total, 100, `Total marks should be 100, got ${result.total}`);
  assert.strictEqual(result.grade, 'A+', `Grade should be A+, got ${result.grade}`);
  assert.strictEqual(result.remarks, 'Outstanding', `Remarks should be Outstanding, got ${result.remarks}`);
  assert.strictEqual(result.passed, true, `Student should pass`);

  // Verify half-attendance (50% of 20 = 10 marks, NOT 1.0)
  const halfAttendance = [{ status: 'present' }, { status: 'absent' }];
  const halfResult = calcResult(halfAttendance, [], 'midterm');
  assert.strictEqual(halfResult.breakdown.attendance, 10, `50% attendance with 20% weight should be 10, got ${halfResult.breakdown.attendance}`);
});

// -------------------------------------------------------------
// 2. Teacher Finance null crash
// -------------------------------------------------------------
test('Fix 2: TeacherFinance.js null guards and empty state', () => {
  const code = fs.readFileSync('src/teacher/TeacherFinance.js', 'utf8');
  assert.ok(code.includes('const [error, setError] = useState(false);'), 'Tracks error state');
  assert.ok(code.includes('if (error || !financeData)'), 'Provides fallback for null/empty financeData');
  assert.ok(code.includes('Salary information has not been configured yet'), 'User-friendly message for unconfigured salary');
  assert.ok(code.includes('Number(financeData?.monthlyAmount || 0).toLocaleString()'), 'Guards monthlyAmount access');
  assert.ok(code.includes('(financeData?.history || []).map'), 'Guards history.map access');
  assert.ok(code.includes('(financeData?.history || []).length'), 'Guards history.length check');
});

// -------------------------------------------------------------
// 3. Student Dashboard Batch Chat broken route
// -------------------------------------------------------------
test('Fix 3: StudentDashboard.js links to /student/group-chat not /student/chats', () => {
  const code = fs.readFileSync('src/StudentDashboard.js', 'utf8');
  assert.ok(!code.includes('/student/chats'), 'Does not contain broken /student/chats route');
  assert.ok(code.includes('to="/student/group-chat"'), 'Contains valid /student/group-chat route');
});

// -------------------------------------------------------------
// 4. Teacher /teacher/tasks root route
// -------------------------------------------------------------
test('Fix 4: pages/teacher/[[...path]].js handles root /teacher/tasks', () => {
  const code = fs.readFileSync('pages/teacher/[[...path]].js', 'utf8');
  assert.ok(code.includes("if (section === 'tasks' && !child) return <ViewTasks />;"), 'Routes bare /teacher/tasks to ViewTasks');
});

// -------------------------------------------------------------
// 5. Student admission .single() failures
// -------------------------------------------------------------
test('Fix 5: No unsafe .single() queries on admissions by cnic', () => {
  const files = [
    'src/StudentDashboard.js',
    'src/student/StudentAttendance.js',
    'src/student/NewEnrollment.js',
    'src/context/TasksContext.js'
  ];

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const badPattern = /\.from\(['"]admissions['"]\)[\s\S]*?\.eq\(['"]cnic['"][\s\S]*?\.single\(\)/;
    assert.ok(!badPattern.test(code), `${file} should not use .single() when looking up admissions by cnic`);
  }
});

// -------------------------------------------------------------
// 6. Admin User Management mutation permissions
// -------------------------------------------------------------
test('Fix 6: AdminUserManagement.js enforces canMutate for RBAC view-only users', () => {
  const code = fs.readFileSync('src/admin/AdminUserManagement.js', 'utf8');
  assert.ok(code.includes('canAccess'), 'Imports canAccess');
  assert.ok(code.includes("canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'users', 'full')"), 'Computes canMutate');
  assert.ok(code.includes('if (!canMutate) {') && code.includes('toast.error'), 'Guards saveUser and saveRole handlers with canMutate check');
  assert.ok(code.includes('{canMutate && <PrimaryButton'), 'Hides Add User button from view-only users');
  assert.ok(code.includes('{canMutate && <SecondaryButton onClick={() => setShowRolePanel(true)}>'), 'Hides Manage Roles from view-only users');
  assert.ok(code.includes('{canMutate && <SmallButton onClick={() => runBulk'), 'Hides bulk mutation buttons from view-only users');
});

// -------------------------------------------------------------
// 7. Teacher HR API BOLA
// -------------------------------------------------------------
test('Fix 7: Teacher HR API validates session token and prevents BOLA', () => {
  const phpCode = fs.readFileSync('public/api/hr/teacher.php', 'utf8');
  assert.ok(phpCode.includes('_otp_common.php'), 'Requires _otp_common.php');
  assert.ok(phpCode.includes('portal_require_session'), 'Calls portal_require_session');
  assert.ok(phpCode.includes("portal_require_session(['teacher']"), 'Restricts to teacher role');
  assert.ok(phpCode.includes('Authorization'), 'Includes Authorization in CORS headers');

  const jsCode = fs.readFileSync('src/utils/hrApi.js', 'utf8');
  assert.ok(jsCode.includes('deepskill_session_token'), 'Retrieves session token in hrApi.js');
  assert.ok(jsCode.includes('Authorization'), 'Sends Authorization header in teacherHrRequest');
});

// -------------------------------------------------------------
// 8. Custom staff Group Chat access
// -------------------------------------------------------------
test('Fix 8: GroupChatContext.js supports custom staff with tasks permission', () => {
  const code = fs.readFileSync('src/context/GroupChatContext.js', 'utf8');
  assert.ok(code.includes('canAccess'), 'Imports canAccess');
  assert.ok(code.includes("user?.role === 'custom' && canAccess(user?.permissions || {}, 'tasks', 'view')"), 'Allows custom staff with tasks permission');
  assert.ok(code.includes('hasAdminChatAccess'), 'Uses hasAdminChatAccess for batch loading and memoization');
  assert.ok(code.includes("['teacher', 'admin', 'custom'].includes(user.role)"), 'Includes custom role in staff check for messaging');
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('🎉 ALL 8 TARGETED FIX VERIFICATIONS PASSED!\n');
}
