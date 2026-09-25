import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import PrivatePortalNotice from '../../components/next/PrivatePortalNotice';
import NextPortalGuard from '../../src/components/NextPortalGuard';
import StaffLayout from '../../src/components/StaffLayout';
import { useAuth } from '../../src/context/AuthContext';
import { TasksProvider } from '../../src/context/TasksContext';
import { ComplaintsProvider } from '../../src/context/ComplaintsContext';
import { GroupChatProvider } from '../../src/context/GroupChatContext';
import { AnnouncementsProvider } from '../../src/context/AnnouncementsContext';
import { DepartmentProvider } from '../../src/context/DepartmentContext';

const StaffOnboardingPage = dynamic(() => import('../../src/staff/StaffOnboardingPage'), { ssr: false });
const StaffDashboard = dynamic(() => import('../../src/staff/StaffDashboard'), { ssr: false });
const StaffTasksPage = dynamic(() => import('../../src/staff/StaffTasksPage'), { ssr: false });
const StaffProfilePage = dynamic(() => import('../../src/staff/StaffProfilePage'), { ssr: false });
const TimeTrackerHub = dynamic(() => import('../../src/components/time/TimeTrackerHub'), { ssr: false });

// Department tools (which render in StaffLayout for staff users)
const CounsellorPanel = dynamic(() => import('../../src/admin/CounsellorPanel'), { ssr: false });
const EnrollmentManager = dynamic(() => import('../../src/admin/EnrollmentManager'), { ssr: false });
const StudentManager = dynamic(() => import('../../src/admin/StudentManager'), { ssr: false });
const StudentProfile = dynamic(() => import('../../src/admin/StudentProfile'), { ssr: false });
const AdminFinance = dynamic(() => import('../../src/admin/FinanceManager'), { ssr: false });
const AdminFinanceTransactions = dynamic(() => import('../../src/admin/TransactionHistory'), { ssr: false });
const ReportsSystem = dynamic(() => import('../../src/admin/ReportsSystem'), { ssr: false });
const CourseManager = dynamic(() => import('../../src/admin/CourseManager'), { ssr: false });
const CourseDetailPage = dynamic(() => import('../../src/admin/CourseDetailPage'), { ssr: false });
const AdminAttendancePage = dynamic(() => import('../../src/admin/AdminAttendance'), { ssr: false });
const AdminResults = dynamic(() => import('../../src/admin/AdminResults'), { ssr: false });
const AdminHRManagement = dynamic(() => import('../../src/admin/AdminHRManagement'), { ssr: false });
const TeacherManager = dynamic(() => import('../../src/admin/TeacherManager'), { ssr: false });
const TeacherProfile = dynamic(() => import('../../src/admin/TeacherProfile'), { ssr: false });
const AdminAnnouncements = dynamic(() => import('../../src/admin/AdminAnnouncements'), { ssr: false });
const AdminComplaints = dynamic(() => import('../../src/admin/AdminComplaints'), { ssr: false });
const AdminTasksPage = dynamic(() => import('../../src/admin/AdminTasksPage'), { ssr: false });
const AdminGroupChatsPage = dynamic(() => import('../../src/admin/AdminGroupChatsPage'), { ssr: false });
const BlogManager = dynamic(() => import('../../src/admin/BlogManager'), { ssr: false });
const AdminReferral = dynamic(() => import('../../src/admin/AdminReferral'), { ssr: false });
const TestimonialManager = dynamic(() => import('../../src/admin/TestimonialManager'), { ssr: false });

function resolveStaffView(path = []) {
  if (!path.length) return { section: 'dashboard', param: null };
  const [first, second, third] = path;

  // Aliases for /staff/counsellor/*
  if (first === 'counsellor') {
    if (second === 'enroll') return { section: 'enroll', param: third };
    if (second === 'admissions') return { section: 'admissions', param: third };
    if (second === 'students') return { section: 'students', param: third };
    if (second === 'performance') return { section: 'inquiries', param: 'performance' };
    if (second === 'overview') return { section: 'inquiries', param: 'overview' };
    return { section: 'inquiries', param: third || second };
  }
  if (first === 'admissions') return { section: 'admissions', param: second };
  if (first === 'performance') return { section: 'inquiries', param: 'performance' };
  if (first === 'overview') return { section: 'inquiries', param: 'overview' };

  // Aliases for /staff/finance/*
  if (first === 'finance') {
    if (second === 'transactions') return { section: 'transactions', param: third };
    if (second === 'salaries') return { section: 'salaries', param: third };
    if (second === 'reports') return { section: 'reports', param: third };
    if (second === 'fees') return { section: 'fees', param: third };
    return { section: 'fees', param: third || second };
  }
  if (first === 'salaries') return { section: 'salaries', param: second };
  if (first === 'reports') return { section: 'reports', param: second };
  if (first === 'transactions') return { section: 'transactions', param: second };

  // Aliases for /staff/academic/*
  if (first === 'academic') {
    if (second === 'attendance') return { section: 'attendance', param: third };
    if (second === 'tasks' || second === 'homework' || second === 'assignments') return { section: 'academic-tasks', param: third };
    if (second === 'results' || second === 'exams') return { section: 'results', param: third };
    if (second === 'announcements') return { section: 'announcements', param: third };
    if (second === 'complaints') return { section: 'complaints', param: third };
    if (second === 'chats' || second === 'group-chats') return { section: 'chats', param: third };
    if (second === 'reports') return { section: 'academic-reports', param: third };
    return { section: 'attendance', param: third || second };
  }
  if (first === 'homework' || first === 'assignments' || first === 'academic-tasks') return { section: 'academic-tasks', param: second };
  if (first === 'chats' || first === 'group-chats') return { section: 'chats', param: second };
  if (first === 'academic-reports') return { section: 'academic-reports', param: second };

  // Aliases for /staff/management/*
  if (first === 'management') {
    if (second === 'courses') return { section: 'courses', param: third };
    if (second === 'students') return { section: 'students', param: third };
    if (second === 'teachers') return { section: 'teachers', param: third };
    return { section: 'courses', param: third || second };
  }

  // Aliases for /staff/hr/*
  if (first === 'hr') {
    if (second === 'applications') return { section: 'applications', param: third };
    if (second === 'jds') return { section: 'jds', param: third };
    if (second === 'signatures') return { section: 'signatures', param: third };
    if (second === 'files') return { section: 'files', param: third };
    if (second === 'leaves') return { section: 'hr-leaves', param: third };
    if (second === 'teachers') return { section: 'teachers', param: third };
    return { section: 'applications', param: third || second };
  }
  if (first === 'signatures') return { section: 'signatures', param: second };
  if (first === 'files' || first === 'hiring-files') return { section: 'files', param: second };
  if (first === 'leaves-management') return { section: 'hr-leaves', param: second };

  // Aliases for /staff/marketing/*
  if (first === 'marketing') {
    if (second === 'blog' || second === 'articles') return { section: 'blog', param: third };
    if (second === 'announcements' || second === 'broadcasts') return { section: 'announcements', param: third };
    if (second === 'referrals' || second === 'referral') return { section: 'referrals', param: third };
    if (second === 'testimonials') return { section: 'testimonials', param: third };
    if (second === 'leads' || second === 'inquiries') return { section: 'inquiries', param: third };
    return { section: 'announcements', param: third || second };
  }
  if (first === 'blog' || first === 'articles') return { section: 'blog', param: second };
  if (first === 'referrals' || first === 'referral') return { section: 'referrals', param: second };
  if (first === 'testimonials') return { section: 'testimonials', param: second };
  if (first === 'campaigns') return { section: 'announcements', param: second };

  // Aliases for /staff/audit/* and /staff/auditor/*
  if (first === 'audit' || first === 'auditor' || first === 'audit-logs' || first === 'activity-logs') {
    if (second === 'complaints') return { section: 'complaints', param: third };
    if (second === 'reports') return { section: 'reports', param: third };
    if (second === 'finance' || second === 'fees') return { section: 'fees', param: third };
    if (second === 'attendance') return { section: 'attendance', param: third };
    return { section: 'dashboard', param: 'audit_logs' };
  }

  return { section: first, param: second };
}

function getStaffPage(path = [], user = null) {
  const { section, param } = resolveStaffView(path);

  if (!section || section === 'dashboard') return <StaffDashboard />;
  if (section === 'onboarding') return <StaffOnboardingPage />;
  if (section === 'tasks') return <StaffTasksPage />;
  if (section === 'profile') return <StaffProfilePage />;

  if (section === 'time-tracker') {
    return (
      <StaffLayout>
        <TimeTrackerHub portalArea="Staff" user={user} />
      </StaffLayout>
    );
  }

  // Counsellor workstation
  if (section === 'inquiries') return <CounsellorPanel initialView={param || 'inquiries'} />;
  if (section === 'enroll') return <EnrollmentManager />;
  if (section === 'admissions') return <EnrollmentManager />;
  if (section === 'students') {
    if (param && param !== 'students') {
      return <StudentProfile studentId={param} />;
    }
    return <StudentManager />;
  }

  // Finance workstation
  if (section === 'fees') return <AdminFinance initialTab="fees" />;
  if (section === 'salaries') return <AdminFinance initialTab="teachers" />;
  if (section === 'transactions') return <AdminFinanceTransactions />;
  if (section === 'reports') return <ReportsSystem mode="finance" />;

  // Academic workstation
  if (section === 'courses') {
    if (param && param !== 'courses') {
      return <CourseDetailPage courseId={param} />;
    }
    return <CourseManager />;
  }
  if (section === 'attendance') return <AdminAttendancePage />;
  if (section === 'academic-tasks') return <AdminTasksPage />;
  if (section === 'results') return <AdminResults />;
  if (section === 'academic-reports') return <ReportsSystem mode="academic" />;

  // HR workstation
  if (section === 'applications') return <AdminHRManagement initialView="applications" />;
  if (section === 'jds') return <AdminHRManagement initialView="jds" />;
  if (section === 'signatures') return <AdminHRManagement initialView="signatures" />;
  if (section === 'files') return <AdminHRManagement initialView="files" />;
  if (section === 'hr-leaves' || section === 'leaves') {
    if (user?.role === 'admin' || (user?.permissions?.hr && user.permissions.hr !== 'none')) {
      return <AdminHRManagement initialView="leaves" />;
    }
    return <StaffProfilePage />;
  }
  if (section === 'teachers') {
    if (param && param !== 'teachers') {
      return <TeacherProfile teacherId={param} />;
    }
    return <TeacherManager />;
  }

  // Communication
  if (section === 'announcements') return <AdminAnnouncements />;
  if (section === 'complaints') return <AdminComplaints />;
  if (section === 'chats') return <AdminGroupChatsPage />;

  // Marketing & Media workstation
  if (section === 'blog') return <BlogManager />;
  if (section === 'referrals') return <AdminReferral />;
  if (section === 'testimonials') return <TestimonialManager />;

  return <PrivatePortalNotice area="Staff" />;
}

function StaffProviders({ children }) {
  return (
    <TasksProvider>
      <ComplaintsProvider>
        <GroupChatProvider>
          <AnnouncementsProvider>
            <DepartmentProvider>
              <Toaster position="top-right" />
              {children}
            </DepartmentProvider>
          </AnnouncementsProvider>
        </GroupChatProvider>
      </ComplaintsProvider>
    </TasksProvider>
  );
}

export default function StaffPortal() {
  const router = useRouter();
  const { user } = useAuth();
  const path = Array.isArray(router.query.path) ? router.query.path : [];
  const { section } = resolveStaffView(path);

  const pageTitle = section
    ? `${section.charAt(0).toUpperCase() + section.slice(1)} | Staff Portal | DeepSkills`
    : 'Staff Portal | DeepSkills';

  return (
    <StaffProviders>
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <NextPortalGuard allowedRoles={['admin', 'custom']}>
        {getStaffPage(path, user)}
      </NextPortalGuard>
    </StaffProviders>
  );
}
