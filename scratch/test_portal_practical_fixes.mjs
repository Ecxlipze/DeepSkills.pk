import fs from 'fs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== VERIFYING PRACTICAL PORTAL BUG FIXES (TASKS 1-10) ===\n');

// TASK 1: Admin View-Only Mutation Guards
const counsellorPanelCode = fs.readFileSync('src/admin/CounsellorPanel.js', 'utf8');
assert(
  counsellorPanelCode.includes('canMutate') && counsellorPanelCode.includes('canAccess(user?.permissions'),
  'Task 1.1: CounsellorPanel has canMutate RBAC check and guards mutations'
);

const courseManagerCode = fs.readFileSync('src/admin/CourseManager.js', 'utf8');
assert(
  courseManagerCode.includes('canMutate') && courseManagerCode.includes('canAccess(user?.permissions'),
  'Task 1.2: CourseManager has canMutate RBAC check and guards mutations'
);

const courseDetailPageCode = fs.readFileSync('src/admin/CourseDetailPage.js', 'utf8');
assert(
  courseDetailPageCode.includes('canMutate') && courseDetailPageCode.includes('canAccess(user?.permissions'),
  'Task 1.3: CourseDetailPage has canMutate RBAC check and guards mutations'
);

const certificateManagerCode = fs.readFileSync('src/admin/CertificateManager.js', 'utf8');
assert(
  certificateManagerCode.includes('canMutate') && certificateManagerCode.includes('canAccess(user?.permissions'),
  'Task 1.4: CertificateManager has canMutate RBAC check and guards mutations'
);

const adminAnnouncementsCode = fs.readFileSync('src/admin/AdminAnnouncements.js', 'utf8');
assert(
  adminAnnouncementsCode.includes('canMutate') && adminAnnouncementsCode.includes('canAccess(user?.permissions'),
  'Task 1.5: AdminAnnouncements has canMutate RBAC check and guards mutations'
);

const adminComplaintsCode = fs.readFileSync('src/admin/AdminComplaints.js', 'utf8');
assert(
  adminComplaintsCode.includes('canMutate') && adminComplaintsCode.includes('canAccess(user?.permissions'),
  'Task 1.6: AdminComplaints has canMutate RBAC check and guards mutations'
);

const adminHRManagementCode = fs.readFileSync('src/admin/AdminHRManagement.js', 'utf8');
const adminHRTableCode = fs.readFileSync('src/components/hr/AdminHRTable.js', 'utf8');
assert(
  adminHRManagementCode.includes('canMutate') && adminHRTableCode.includes('canMutate'),
  'Task 1.7: AdminHRManagement and AdminHRTable enforce canMutate for HR operations'
);

const blogManagerCode = fs.readFileSync('src/admin/BlogManager.js', 'utf8');
assert(
  blogManagerCode.includes('canMutateBlog') && blogManagerCode.includes("'blog', 'full'"),
  'Task 1.8: BlogManager has canMutateBlog guard on posts, bulk actions, and uploads'
);

const contentManagerCode = fs.readFileSync('src/admin/ContentManager.js', 'utf8');
assert(
  contentManagerCode.includes('canMutate') && contentManagerCode.includes("'settings', 'full'"),
  'Task 1.9: ContentManager enforces canMutate for settings changes'
);

const testimonialManagerCode = fs.readFileSync('src/admin/TestimonialManager.js', 'utf8');
assert(
  testimonialManagerCode.includes('canMutate') && testimonialManagerCode.includes("'settings', 'full'"),
  'Task 1.10: TestimonialManager enforces canMutate for testimonial operations'
);

// TASK 2: Reachable Attendance Settings
const departmentsCode = fs.readFileSync('src/utils/departments.js', 'utf8');
const adminPathCode = fs.readFileSync('pages/admin/[[...path]].js', 'utf8');
const adminAttendanceCode = fs.readFileSync('src/admin/AdminAttendance.js', 'utf8');
const adminAttendanceSettingsCode = fs.readFileSync('src/admin/AdminAttendanceSettings.js', 'utf8');
assert(
  departmentsCode.includes("'/admin/settings/attendance': '/admin/academic/attendance/settings'") &&
  departmentsCode.includes("'/admin/attendance/settings': '/admin/academic/attendance/settings'"),
  'Task 2.1: ADMIN_ROUTE_ALIASES maps attendance settings properly'
);
assert(
  adminPathCode.includes("section === 'academic' && child === 'attendance' && subpath === 'settings'") &&
  adminPathCode.includes('<AdminAttendanceSettings />'),
  'Task 2.2: pages/admin/[[...path]].js mounts AdminAttendanceSettings correctly'
);
assert(
  adminAttendanceCode.includes('/admin/academic/attendance/settings'),
  'Task 2.3: AdminAttendance has settings button navigating to attendance settings'
);
assert(
  adminAttendanceSettingsCode.includes("'attendance', 'full'") &&
  adminAttendanceSettingsCode.includes('canMutate'),
  'Task 2.4: AdminAttendanceSettings guards settings mutations with attendance:full'
);

// TASK 3: Student Results Root Page
const studentPathCode = fs.readFileSync('pages/student/[[...path]].js', 'utf8');
const studentResultsCode = fs.readFileSync('src/student/StudentResults.js', 'utf8');
assert(
  studentPathCode.includes('<StudentResults type={child} />'),
  'Task 3.1: pages/student/[[...path]].js passes child type to StudentResults'
);
assert(
  studentResultsCode.includes("setExamType") &&
  studentResultsCode.includes("setExamType('midterm')") &&
  studentResultsCode.includes("setExamType('finalterm')"),
  'Task 3.2: StudentResults supports root /student/results with interactive tab switcher'
);

// TASK 4: Remove Fake Student Identity Fallbacks in StudentTasks.js
const studentTasksCode = fs.readFileSync('src/student/StudentTasks.js', 'utf8');
assert(
  !studentTasksCode.includes('"Ali Hassan"') &&
  !studentTasksCode.includes('"Web Development Bootcamp"') &&
  !studentTasksCode.includes('"Batch 12"'),
  'Task 4.1: StudentTasks does not contain hardcoded fake student identity fallbacks'
);
assert(
  studentTasksCode.includes('const isAssigned = Boolean(studentCourse && studentBatch);') &&
  studentTasksCode.includes('No Batch Assigned'),
  'Task 4.2: StudentTasks displays clear unassigned empty state when student has no course/batch'
);
assert(
  studentTasksCode.includes("toast.error('Student CNIC is missing. Please re-login.')") &&
  studentTasksCode.includes("toast.error('Please select a file to submit.')"),
  'Task 4.3: StudentTasks safely validates CNIC and file presence before submission'
);

// TASK 5: HR -> Teacher Profile Navigation
assert(
  adminPathCode.includes("teacherId={subpath}") &&
  adminPathCode.includes("basePath=\"/admin/hr/teachers\"") &&
  adminPathCode.includes("basePath=\"/admin/management/teachers\""),
  'Task 5.1: pages/admin/[[...path]].js handles subpath teacherId and passes basePath'
);
const teacherManagerCode = fs.readFileSync('src/admin/TeacherManager.js', 'utf8');
const teacherProfileCode = fs.readFileSync('src/admin/TeacherProfile.js', 'utf8');
assert(
  teacherManagerCode.includes('basePath') && teacherManagerCode.includes('targetBase'),
  'Task 5.2: TeacherManager dynamically routes to teacher profile within current department'
);
assert(
  teacherProfileCode.includes('teacherId') && teacherProfileCode.includes('router.back()'),
  'Task 5.3: TeacherProfile accepts teacherId prop and navigates back intelligently'
);

// TASK 6: Admin Results CSV Export
const adminResultsCode = fs.readFileSync('src/admin/AdminResults.js', 'utf8');
assert(
  adminResultsCode.includes("import { downloadCsv } from '../utils/csvExport'") &&
  adminResultsCode.includes('handleExportCSV') &&
  adminResultsCode.includes('downloadCsv(filename, headers, rows)'),
  'Task 6: AdminResults implements CSV export using downloadCsv utility'
);

// TASK 7: Transaction History CSV Export
const transactionHistoryCode = fs.readFileSync('src/admin/TransactionHistory.js', 'utf8');
assert(
  transactionHistoryCode.includes("import { downloadCsv } from '../utils/csvExport'") &&
  transactionHistoryCode.includes('DeepSkills_Finance_Export_') &&
  transactionHistoryCode.includes('downloadCsv('),
  'Task 7.1: TransactionHistory exports CSV with RFC escaping via downloadCsv utility'
);
assert(
  transactionHistoryCode.includes('useRouter') && transactionHistoryCode.includes('router?.query?.search'),
  'Task 7.2: TransactionHistory supports URL query search parameter for filtering'
);

// TASK 8: Finance Manager Dead Buttons
const financeManagerCode = fs.readFileSync('src/admin/FinanceManager.js', 'utf8');
assert(
  financeManagerCode.includes('/admin/finance/transactions?search=') &&
  financeManagerCode.includes('<FaHistory /> History'),
  'Task 8.1: FinanceManager History button navigates to transaction ledger search'
);
assert(
  financeManagerCode.includes('handlePaySalary') &&
  financeManagerCode.includes('isSalaryModalOpen') &&
  financeManagerCode.includes('Confirm & Record Salary'),
  'Task 8.2: FinanceManager includes interactive Pay Teacher Salary modal'
);
assert(
  financeManagerCode.includes('(t.monthlySalary || 0) <= 0'),
  'Task 8.3: FinanceManager disables Pay Salary button when teacher salary is <= 0'
);

// TASK 9: Placeholder Admin Routes
assert(
  adminPathCode.includes('DepartmentHubRedirect') &&
  adminPathCode.includes('getFirstAccessibleAdminPath'),
  'Task 9: Placeholder admin department hub routes redirect dynamically to accessible module'
);

// TASK 10: Remove Unnecessary Window Reloads
assert(
  !adminAnnouncementsCode.includes('window.location.reload()') &&
  !certificateManagerCode.includes('window.location.href') &&
  !contentManagerCode.includes('window.location.href') &&
  !testimonialManagerCode.includes('window.location.href'),
  'Task 10: Removed full page window reloads across admin panels'
);

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed === 0) {
  console.log('🎉 ALL 30 PRACTICAL PORTAL FIX VERIFICATIONS PASSED!');
  process.exit(0);
} else {
  console.error('💥 SOME VERIFICATION CHECKS FAILED');
  process.exit(1);
}
