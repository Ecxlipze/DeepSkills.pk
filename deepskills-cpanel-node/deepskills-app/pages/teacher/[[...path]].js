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

const TeacherDashboard = dynamic(() => import('../../src/TeacherDashboard'), { ssr: false });
const TeacherComplaints = dynamic(() => import('../../src/teacher/TeacherComplaints'), { ssr: false });
const TeacherFinance = dynamic(() => import('../../src/teacher/TeacherFinance'), { ssr: false });
const TeacherGroupChat = dynamic(() => import('../../src/teacher/TeacherGroupChat'), { ssr: false });
const TeacherAnnouncements = dynamic(() => import('../../src/teacher/TeacherAnnouncements'), { ssr: false });
const TeacherHRPage = dynamic(() => import('../../src/teacher/TeacherHRPage'), { ssr: false });
const AssignTask = dynamic(() => import('../../src/teacher/AssignTask'), { ssr: false });
const ViewTasks = dynamic(() => import('../../src/teacher/ViewTasks'), { ssr: false });
const ReferralPage = dynamic(() => import('../../src/components/ReferralPage'), { ssr: false });
const TeacherStudents = dynamic(() => import('../../src/teacher/TeacherStudents'), { ssr: false });
const TeacherAttendance = dynamic(() => import('../../src/teacher/TeacherAttendance'), { ssr: false });

function getTeacherPage(path = []) {
  const [section, child] = path;

  if (!section || section === 'dashboard') return <TeacherDashboard />;
  if (section === 'students') return <TeacherStudents />;
  if (section === 'attendance') return <TeacherAttendance />;
  if (section === 'complaints') return <TeacherComplaints />;
  if (section === 'finance') return <TeacherFinance />;
  if (section === 'referral') return <ReferralPage />;
  if (section === 'group-chat') return <TeacherGroupChat />;
  if (section === 'announcements') return <TeacherAnnouncements />;
  if (section === 'hr') return <TeacherHRPage />;
  if (section === 'tasks' && !child) return <ViewTasks />;
  if (section === 'tasks' && child === 'assign') return <AssignTask />;
  if (section === 'tasks' && child === 'view') return <ViewTasks />;

  return <PrivatePortalNotice area="Teacher" />;
}

function TeacherProviders({ children }) {
  return (
    <TasksProvider>
      <ComplaintsProvider>
        <GroupChatProvider>
          <AnnouncementsProvider>
            <Toaster position="top-right" />
            {children}
          </AnnouncementsProvider>
        </GroupChatProvider>
      </ComplaintsProvider>
    </TasksProvider>
  );
}

export default function TeacherPortal() {
  const router = useRouter();
  const path = Array.isArray(router.query.path) ? router.query.path : [];

  return (
    <TeacherProviders>
      <Head>
        <title>Teacher Portal | DeepSkills</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <NextPortalGuard allowedRoles={['teacher']}>
        {getTeacherPage(path)}
      </NextPortalGuard>
    </TeacherProviders>
  );
}
