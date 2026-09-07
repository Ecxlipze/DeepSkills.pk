import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import PrivatePortalNotice from '../../components/next/PrivatePortalNotice';
import NextPortalGuard from '../../src/components/NextPortalGuard';
import { TasksProvider } from '../../src/context/TasksContext';
import { ComplaintsProvider } from '../../src/context/ComplaintsContext';
import { GroupChatProvider } from '../../src/context/GroupChatContext';
import { AnnouncementsProvider } from '../../src/context/AnnouncementsContext';
import { DepartmentProvider } from '../../src/context/DepartmentContext';
import { useAuth } from '../../src/context/AuthContext';
import { getFirstAccessibleAdminPath } from '../../src/utils/permissions';
import {
  getDepartmentNav,
  getDepartmentRouteAccess,
  normalizeAdminPath
} from '../../src/utils/departments';

const AdminLogin = dynamic(() => import('../../src/admin/Login'), { ssr: false });
const AdminDashboard = dynamic(() => import('../../src/admin/Dashboard'), { ssr: false });
const StudentManager = dynamic(() => import('../../src/admin/StudentManager'), { ssr: false });
const StudentProfile = dynamic(() => import('../../src/admin/StudentProfile'), { ssr: false });
const AdminUserManagement = dynamic(() => import('../../src/admin/AdminUserManagement'), { ssr: false });
const AdminActivityLogsPage = dynamic(() => import('../../src/admin/AdminActivityLogsPage'), { ssr: false });
const TeacherManager = dynamic(() => import('../../src/admin/TeacherManager'), { ssr: false });
const TeacherProfile = dynamic(() => import('../../src/admin/TeacherProfile'), { ssr: false });
const CourseManager = dynamic(() => import('../../src/admin/CourseManager'), { ssr: false });
const CourseDetailPage = dynamic(() => import('../../src/admin/CourseDetailPage'), { ssr: false });
const EnrollmentManager = dynamic(() => import('../../src/admin/EnrollmentManager'), { ssr: false });
const CounsellorPanel = dynamic(() => import('../../src/admin/CounsellorPanel'), { ssr: false });
const AdminAttendancePage = dynamic(() => import('../../src/admin/AdminAttendance'), { ssr: false });
const CertificateManager = dynamic(() => import('../../src/admin/CertificateManager'), { ssr: false });
const AdminHRManagement = dynamic(() => import('../../src/admin/AdminHRManagement'), { ssr: false });
const AdminAnnouncements = dynamic(() => import('../../src/admin/AdminAnnouncements'), { ssr: false });
const AdminComplaints = dynamic(() => import('../../src/admin/AdminComplaints'), { ssr: false });
const AdminFinance = dynamic(() => import('../../src/admin/FinanceManager'), { ssr: false });
const AdminFinanceTransactions = dynamic(() => import('../../src/admin/TransactionHistory'), { ssr: false });
const AdminReferral = dynamic(() => import('../../src/admin/AdminReferral'), { ssr: false });
const AdminResults = dynamic(() => import('../../src/admin/AdminResults'), { ssr: false });
const BlogManager = dynamic(() => import('../../src/admin/BlogManager'), { ssr: false });
const TestimonialManager = dynamic(() => import('../../src/admin/TestimonialManager'), { ssr: false });
const MediaLibrary = dynamic(() => import('../../src/admin/MediaLibrary'), { ssr: false });
const ContentManager = dynamic(() => import('../../src/admin/ContentManager'), { ssr: false });
const MediaPageManager = dynamic(() => import('../../src/admin/MediaPageManager'), { ssr: false });
const AdminAttendanceSettings = dynamic(() => import('../../src/admin/AdminAttendanceSettings'), { ssr: false });
const ReportsSystem = dynamic(() => import('../../src/admin/ReportsSystem'), { ssr: false });
const AdminTasksPage = dynamic(() => import('../../src/admin/AdminTasksPage'), { ssr: false });
const AdminGroupChatsPage = dynamic(() => import('../../src/admin/AdminGroupChatsPage'), { ssr: false });
const DepartmentPlaceholder = dynamic(() => import('../../src/admin/DepartmentPlaceholder'), { ssr: false });

const ADMIN_ROUTE_ACCESS = {
  dashboard: { allowedRoles: ['admin', 'custom'], permissionKey: 'dashboard' },
  admissions: { allowedRoles: ['admin', 'custom'], permissionKey: 'students' },
  counsellor: { allowedRoles: ['admin', 'custom'], permissionKey: 'counsellor' },
  students: { allowedRoles: ['admin', 'custom'], permissionKey: 'students' },
  users: { allowedRoles: ['admin', 'custom'], permissionKey: 'users' },
  teachers: { allowedRoles: ['admin', 'custom'], permissionKey: 'teachers' },
  courses: { allowedRoles: ['admin', 'custom'], permissionKey: 'courses' },
  batches: { allowedRoles: ['admin', 'custom'], permissionKey: 'courses' },
  attendance: { allowedRoles: ['admin', 'custom'], permissionKey: 'attendance' },
  certificates: { allowedRoles: ['admin', 'custom'], permissionKey: 'results' },
  hr: { allowedRoles: ['admin', 'custom'], permissionKey: 'hr' },
  announcements: { allowedRoles: ['admin', 'custom'], permissionKey: 'announcements' },
  complaints: { allowedRoles: ['admin', 'custom'], permissionKey: 'complaints' },
  finance: { allowedRoles: ['admin', 'custom'], permissionKey: 'finance' },
  referral: { allowedRoles: ['admin', 'custom'], permissionKey: 'referral' },
  reports: { allowedRoles: ['admin', 'custom'], permissionKey: 'reports' },
  results: { allowedRoles: ['admin', 'custom'], permissionKey: 'results' },
  blog: { allowedRoles: ['admin', 'custom'], permissionKey: 'blog' },
  tasks: { allowedRoles: ['admin', 'custom'], permissionKey: 'tasks' },
  chats: { allowedRoles: ['admin', 'custom'], permissionKey: 'tasks' },
  settings: { allowedRoles: ['admin', 'custom'], permissionKey: 'settings' }
};

function DepartmentHubRedirect({ departmentId, currentPath }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    const navItems = getDepartmentNav(user, departmentId) || [];
    const target = navItems.find((item) => item.path && item.path !== currentPath && !item.section);
    if (target?.path) {
      router.replace(target.path);
    } else {
      const fallback = getFirstAccessibleAdminPath(user?.permissions) || '/admin/dashboard';
      router.replace(fallback);
    }
  }, [departmentId, currentPath, loading, user, router]);

  return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>
      Redirecting to accessible module...
    </div>
  );
}

function getAdminPage(path = []) {
  const [section, child] = path;
  const subpath = path.slice(2).join('/');

  if (!section) return <AdminLogin />;
  if (section === 'dashboard') return <AdminDashboard />;
  if (section === 'admissions') return <EnrollmentManager />;
  if (section === 'counsellor') {
    return <CounsellorPanel initialView={child || 'overview'} />;
  }
  if (section === 'students') return child ? <StudentProfile studentId={child} /> : <StudentManager />;
  if (section === 'users') return child === 'activity' ? <AdminActivityLogsPage /> : <AdminUserManagement />;
  if (section === 'teachers') return child ? <TeacherProfile teacherId={child} /> : <TeacherManager />;
  if (section === 'courses') return child ? <CourseDetailPage courseId={child} /> : <CourseManager />;
  if (section === 'batches') return <CourseManager />;
  if (section === 'attendance') return <AdminAttendancePage />;
  if (section === 'tasks') return <AdminTasksPage />;
  if (section === 'chats') return <AdminGroupChatsPage />;
  if (section === 'certificates') return <CertificateManager />;
  if (section === 'hr') {
    if (child === 'teachers' && subpath) return <TeacherProfile teacherId={subpath} />;
    return <AdminHRManagement initialView={child || 'overview'} />;
  }
  if (section === 'announcements') return <AdminAnnouncements />;
  if (section === 'complaints') return <AdminComplaints />;
  if (section === 'finance') {
    if (child === 'transactions') return <AdminFinanceTransactions />;
    if (child === 'referrals') return <AdminReferral />;
    if (child === 'reports') return <ReportsSystem mode="finance" />;
    if (child === 'settings') return <DepartmentHubRedirect departmentId="finance" currentPath="/admin/finance/settings" />;
    return <AdminFinance initialTab={child || 'overview'} />;
  }
  if (section === 'referral') return <AdminReferral />;
  if (section === 'reports') return <ReportsSystem mode="master" />;
  if (section === 'results') return <AdminResults />;
  if (section === 'blog') return <BlogManager />;

  if (section === 'academic') {
    if (!child) return <DepartmentHubRedirect departmentId="academic" currentPath="/admin/academic" />;
    if (child === 'attendance') return subpath === 'settings' ? <AdminAttendanceSettings /> : <AdminAttendancePage />;
    if (child === 'results') return <AdminResults />;
    if (child === 'announcements') return <AdminAnnouncements />;
    if (child === 'complaints') return <AdminComplaints />;
    if (child === 'tasks') return <AdminTasksPage />;
    if (child === 'chats') return <AdminGroupChatsPage />;
    if (child === 'reports') return <ReportsSystem mode="academic" />;
  }

  if (section === 'management') {
    if (!child) return <DepartmentHubRedirect departmentId="management" currentPath="/admin/management" />;
    if (child === 'students') return subpath ? <StudentProfile studentId={subpath} /> : <StudentManager />;
    if (child === 'teachers') return subpath ? <TeacherProfile teacherId={subpath} /> : <TeacherManager basePath="/admin/management/teachers" />;
    if (child === 'courses') return subpath ? <CourseDetailPage courseId={subpath} /> : <CourseManager />;
    if (child === 'referral') return <AdminReferral />;
    if (child === 'certificates') return <CertificateManager />;
    if (child === 'blog') return <BlogManager />;
    if (child === 'media') return <MediaLibrary />;
    if (child === 'users') return subpath === 'activity' ? <AdminActivityLogsPage /> : <AdminUserManagement />;
    if (child === 'reports') return <ReportsSystem mode="master" />;
    if (child === 'settings') return <ContentManager />;
  }

  if (section === 'settings') {
    if (child === 'testimonials') return <TestimonialManager />;
    if (child === 'media') return <MediaLibrary />;
    if (child === 'content') return <ContentManager />;
    if (child === 'media-page') return <MediaPageManager />;
    if (child === 'attendance') return <AdminAttendanceSettings />;
  }

  return <PrivatePortalNotice area="Admin" />;
}

function getAdminAccess(path = []) {
  const [section, child] = path;
  const subpath = path.slice(2).join('/');
  const pathname = `/admin/${path.join('/')}`.replace(/\/$/, '');
  if (section === 'academic' && child === 'attendance' && subpath === 'settings') {
    return { allowedRoles: ['admin', 'custom'], permissionKey: 'attendance' };
  }
  if (section === 'hr' && child === 'teachers') {
    return { allowedRoles: ['admin', 'custom'], permissionKey: 'hr' };
  }
  if (['academic', 'management'].includes(section)) {
    return getDepartmentRouteAccess(pathname);
  }
  if (section === 'counsellor') {
    return { allowedRoles: ['admin', 'custom'], permissionKey: 'counsellor' };
  }
  if (section === 'settings' && child === 'attendance') {
    return { allowedRoles: ['admin', 'custom'], permissionKey: 'attendance' };
  }
  return ADMIN_ROUTE_ACCESS[section] || null;
}

function AdminProviders({ children }) {
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

export default function AdminPortal() {
  const router = useRouter();
  const rawPath = Array.isArray(router.query.path) ? router.query.path : [];
  const normalized = normalizeAdminPath(`/admin/${rawPath.join('/')}`);
  const path = normalized === '/admin' ? [] : normalized.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  const access = getAdminAccess(path);

  if (!path[0]) {
    return <AdminProviders>{getAdminPage(path)}</AdminProviders>;
  }

  return (
    <AdminProviders>
      <Head>
        <title>Admin Portal | DeepSkills</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <NextPortalGuard
        allowedRoles={access?.allowedRoles || ['admin']}
        permissionKey={access?.permissionKey}
        departmentId={access?.departmentId}
        loginPath="/admin"
      >
        {getAdminPage(path)}
      </NextPortalGuard>
    </AdminProviders>
  );
}
