import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome, FaClock, FaTasks, FaUserTie, FaSignOutAlt, FaBars, FaTimes,
  FaBullhorn, FaComments, FaClipboardList, FaPlus, FaUsers, FaMoneyBillWave,
  FaGraduationCap, FaCalendarCheck, FaFileAlt, FaAward, FaIdBadge, FaStop
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { portalTheme } from './portal/PortalTheme';
import NotificationBell from './NotificationBell';
import logoImg from '../logo.svg';
import {
  getAuthToken,
  fetchTrackerData,
  stopTaskTimer,
  formatSeconds
} from '../utils/timeTrackingApi';

const LayoutWrapper = styled.div`
  display: flex;
  height: 100vh;
  background-color: ${portalTheme.colors.bgBase};
  background-image: 
    radial-gradient(circle at 10% 15%, rgba(123, 31, 46, 0.08) 0%, transparent 35%),
    radial-gradient(circle at 90% 85%, rgba(123, 31, 46, 0.06) 0%, transparent 40%);
  color: ${portalTheme.colors.textPrimary};
  overflow: hidden;
  font-family: ${portalTheme.fonts.body};
`;

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 998;
`;

const Sidebar = styled.aside`
  width: 260px;
  background: ${portalTheme.colors.bgSidebar};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  flex-direction: column;
  z-index: 999;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px;
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0.8);
    transform: translateX(${props => props.$isOpen ? '0' : '-100%'});
  }
`;

const SidebarHeader = styled.div`
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};

  img {
    height: 32px;
    filter: drop-shadow(0 2px 8px rgba(123, 31, 46, 0.3));
  }
`;

const PortalTag = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #378ADD;
  background: rgba(55, 138, 221, 0.12);
  border: 1px solid rgba(55, 138, 221, 0.3);
  padding: 2px 8px;
  border-radius: ${portalTheme.radii.pill};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${portalTheme.colors.textSecondary};
  font-size: 1.25rem;
  cursor: pointer;
  display: none;
  padding: 6px;
  border-radius: ${portalTheme.radii.sm};

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const UserMiniProfile = styled.div`
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(123, 31, 46, 0.4), rgba(55, 138, 221, 0.4));
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;

    .name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .role-badge {
      font-size: 0.72rem;
      color: #378ADD;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      font-weight: 600;
    }
  }
`;

const NavArea = styled.nav`
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const SectionHeader = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${portalTheme.colors.textMuted};
  padding: 14px 12px 6px;
`;

const NavItemLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: ${portalTheme.radii.md};
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textSecondary};
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.25)' : 'transparent'};
  border: 1px solid ${props => props.$active ? 'rgba(123, 31, 46, 0.5)' : 'transparent'};
  font-size: 0.88rem;
  font-weight: ${props => props.$active ? '700' : '500'};
  text-decoration: none;
  transition: all 0.2s ease;

  svg {
    font-size: 1.05rem;
    color: ${props => props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.45)'};
    transition: color 0.2s;
  }

  &:hover {
    color: #fff;
    background: ${props => props.$active ? 'rgba(123, 31, 46, 0.35)' : 'rgba(255, 255, 255, 0.04)'};
    svg {
      color: #7B1F2E;
    }
  }
`;

const SidebarFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid ${portalTheme.colors.borderSubtle};
`;

const LogoutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${portalTheme.radii.md};
  color: ${portalTheme.colors.textMuted};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
    border-color: rgba(239, 68, 68, 0.3);
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Topbar = styled.header`
  height: 64px;
  background: ${portalTheme.colors.bgTopbar};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 10;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const TopbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const MenuToggle = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  display: none;
  width: 36px;
  height: 36px;
  border-radius: ${portalTheme.radii.sm};
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  color: ${portalTheme.colors.textMuted};
  font-weight: 600;

  .portal-tag {
    color: #94a3b8;
  }

  .sep {
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.75rem;
  }

  .parent {
    color: #cbd5e1;
  }

  .current {
    color: #fff;
    font-weight: 700;
  }
`;

const resolveStaffBreadcrumb = (pathname = '') => {
  const clean = (pathname || '').replace(/\/$/, '');
  if (clean === '/staff' || clean === '/staff/dashboard') {
    return { section: null, page: 'Dashboard' };
  }
  if (clean.startsWith('/staff/time-tracker')) {
    return { section: 'Workspace', page: 'Time & Attendance' };
  }
  if (clean.startsWith('/staff/tasks')) {
    return { section: 'Workspace', page: 'Jira Tasks & Timeline' };
  }
  if (clean.startsWith('/staff/inquiries') || clean.startsWith('/staff/counsellor/inquiries')) {
    return { section: 'Department Tools', page: 'Inquiries & Leads' };
  }
  if (clean.startsWith('/staff/enroll') || clean.startsWith('/staff/counsellor/enroll')) {
    return { section: 'Department Tools', page: 'Enroll Student' };
  }
  if (clean.startsWith('/staff/students')) {
    const isDetail = clean !== '/staff/students';
    return { section: 'Student Directory', page: isDetail ? 'Student Profile' : null };
  }
  if (clean.startsWith('/staff/fees') || clean.startsWith('/staff/finance/fees')) {
    return { section: 'Finance', page: 'Student Fees' };
  }
  if (clean.startsWith('/staff/transactions') || clean.startsWith('/staff/finance/transactions')) {
    return { section: 'Finance', page: 'Transactions' };
  }
  if (clean.startsWith('/staff/courses')) {
    const isDetail = clean !== '/staff/courses';
    return { section: 'Courses & Batches', page: isDetail ? 'Course Details' : null };
  }
  if (clean.startsWith('/staff/attendance')) {
    return { section: 'Academics', page: 'Academic Attendance' };
  }
  if (clean.startsWith('/staff/results')) {
    return { section: 'Academics', page: 'Results & Exams' };
  }
  if (clean.startsWith('/staff/applications')) {
    return { section: 'HR', page: 'Job Applications' };
  }
  if (clean.startsWith('/staff/jds')) {
    return { section: 'HR', page: 'JDs & Contracts' };
  }
  if (clean.startsWith('/staff/teachers')) {
    const isDetail = clean !== '/staff/teachers';
    return { section: 'Faculty Directory', page: isDetail ? 'Teacher Profile' : null };
  }
  if (clean.startsWith('/staff/announcements')) {
    return { section: 'Communication', page: 'Announcements' };
  }
  if (clean.startsWith('/staff/complaints')) {
    return { section: 'Communication', page: 'Grievances & Tickets' };
  }
  if (clean.startsWith('/staff/profile') || clean.startsWith('/staff/leaves')) {
    return { section: 'Personal', page: 'Profile & Leaves' };
  }

  const segments = clean.replace('/staff/', '').split('/').filter(Boolean);
  const formatted = segments.map((seg) => {
    if (seg.length > 15 && /[0-9a-f]{8}-/i.test(seg)) return 'Details';
    return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  });
  return { section: formatted[0] || 'Dashboard', page: formatted[1] || null };
};

const timerPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

const GlobalTimerPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: ${portalTheme.radii.pill};
  padding: 4px 10px;
  font-size: 0.78rem;
  color: #fff;
  animation: ${timerPulse} 2s infinite;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
  }

  .task-key {
    font-family: monospace;
    font-weight: 700;
    color: #38BDF8;
  }

  .desc {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.85);

    @media (max-width: 640px) {
      display: none;
    }
  }

  .timer {
    font-family: monospace;
    font-weight: 800;
    color: #34D399;
  }

  .stop-btn {
    background: #EF4444;
    border: none;
    color: #fff;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    transition: all 0.15s;

    &:hover {
      background: #DC2626;
    }
  }
`;

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ContentArea = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
  }
`;

const InStaffLayoutContext = React.createContext(false);

export default function StaffLayout({ children }) {
  const isInStaffLayout = React.useContext(InStaffLayoutContext);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global active timer in topbar
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef(null);

  const fetchActiveTimer = async () => {
    try {
      const token = await getAuthToken(user);
      if (!token) return;
      const data = await fetchTrackerData(token).catch(() => ({ activeTimer: null }));
      if (data.activeTimer) {
        setActiveTimer(data.activeTimer);
        setTimerSeconds(data.activeTimer.elapsed_seconds || 0);
      } else {
        setActiveTimer(null);
        setTimerSeconds(0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchActiveTimer();
    const handleTimerChange = () => fetchActiveTimer();
    if (typeof window !== 'undefined') {
      window.addEventListener('deepskills_timer_change', handleTimerChange);
      return () => {
        window.removeEventListener('deepskills_timer_change', handleTimerChange);
      };
    }
  }, [user]);

  useEffect(() => {
    if (activeTimer) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTimer]);

  const handleStopGlobalTimer = async () => {
    try {
      const token = await getAuthToken(user);
      await stopTaskTimer(token, activeTimer?.id);
      setActiveTimer(null);
      setTimerSeconds(0);
      toast.success('Timer stopped');
    } catch (err) {
      toast.error('Failed to stop timer');
    }
  };

  if (isInStaffLayout) {
    return <>{children}</>;
  }

  const permissions = user?.permissions || {};
  const pathname = location.pathname;
  const crumb = resolveStaffBreadcrumb(pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine user initials
  const initials = (user?.name || user?.full_name || 'Staff')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Resolved human-readable role name (never raw 'custom')
  const resolvedRoleName =
    user?.customRoleName ||
    user?.roleName ||
    user?.custom_roles?.name ||
    (user?.role === 'custom' ? (user?.designation || 'Staff Member') : (user?.role || 'Staff Member'));

  // Dynamic department links based on custom role permissions
  const isSuperAdmin = user?.role === 'admin';
  const hasCounsellor = isSuperAdmin || (permissions.counsellor && permissions.counsellor !== 'none');
  const hasFinance = isSuperAdmin || (permissions.finance && permissions.finance !== 'none');
  const hasCourses = isSuperAdmin || (permissions.courses && permissions.courses !== 'none');
  const hasAttendance = isSuperAdmin || (permissions.attendance && permissions.attendance !== 'none');
  const hasResults = isSuperAdmin || (permissions.results && permissions.results !== 'none');
  const hasHR = isSuperAdmin || (permissions.hr && permissions.hr !== 'none');
  const hasTeachers = isSuperAdmin || (permissions.teachers && permissions.teachers !== 'none');
  const hasStudents = isSuperAdmin || (permissions.students && permissions.students !== 'none');
  const hasAnnouncements = isSuperAdmin || (permissions.announcements && permissions.announcements !== 'none');
  const hasComplaints = isSuperAdmin || (permissions.complaints && permissions.complaints !== 'none');
  const hasDepartmentTools = hasCounsellor || hasFinance || hasCourses || hasAttendance || hasResults || hasHR || hasTeachers || hasStudents;

  return (
    <InStaffLayoutContext.Provider value={true}>
      <LayoutWrapper>
        <AnimatePresence>
          {mobileMenuOpen && (
            <Overlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        <Sidebar $isOpen={mobileMenuOpen}>
          <SidebarHeader>
            <img src={logoImg} alt="DeepSkills" />
            <PortalTag>Staff Portal</PortalTag>
            <CloseButton onClick={() => setMobileMenuOpen(false)}>
              <FaTimes />
            </CloseButton>
          </SidebarHeader>

          <UserMiniProfile>
            <div className="avatar">{initials}</div>
            <div className="meta">
              <span className="name">{user?.name || user?.full_name || 'Staff Member'}</span>
              <span className="role-badge">{resolvedRoleName}</span>
            </div>
          </UserMiniProfile>

          <NavArea>
            <SectionHeader>Workspace</SectionHeader>
            <NavItemLink to="/staff/dashboard" $active={pathname === '/staff/dashboard' || pathname === '/staff'}>
              <FaHome /> Dashboard
            </NavItemLink>
            <NavItemLink to="/staff/time-tracker" $active={pathname === '/staff/time-tracker'}>
              <FaClock /> Time & Attendance
            </NavItemLink>
            <NavItemLink to="/staff/tasks" $active={pathname === '/staff/tasks'}>
              <FaTasks /> Jira Tasks & Timeline
            </NavItemLink>

            {/* Department Workstation Items */}
            {hasDepartmentTools && (
              <>
                <SectionHeader>Department Tools</SectionHeader>
                {hasCounsellor && (
                  <>
                    <NavItemLink to="/staff/inquiries" $active={pathname === '/staff/inquiries' || pathname === '/staff/counsellor/inquiries'}>
                      <FaClipboardList /> Inquiries & Leads
                    </NavItemLink>
                    <NavItemLink to="/staff/enroll" $active={pathname === '/staff/enroll' || pathname === '/staff/counsellor/enroll'}>
                      <FaPlus /> Enroll Student
                    </NavItemLink>
                  </>
                )}
                {(hasStudents || hasCounsellor) && (
                  <NavItemLink to="/staff/students" $active={pathname.startsWith('/staff/students')}>
                    <FaUsers /> Student Directory
                  </NavItemLink>
                )}
                {hasFinance && (
                  <>
                    <NavItemLink to="/staff/fees" $active={pathname === '/staff/fees' || pathname === '/staff/finance/fees'}>
                      <FaMoneyBillWave /> Student Fees
                    </NavItemLink>
                    <NavItemLink to="/staff/transactions" $active={pathname === '/staff/transactions' || pathname === '/staff/finance/transactions'}>
                      <FaMoneyBillWave /> Transactions
                    </NavItemLink>
                  </>
                )}
                {hasCourses && (
                  <NavItemLink to="/staff/courses" $active={pathname.startsWith('/staff/courses')}>
                    <FaGraduationCap /> Courses & Batches
                  </NavItemLink>
                )}
                {hasAttendance && (
                  <NavItemLink to="/staff/attendance" $active={pathname === '/staff/attendance'}>
                    <FaCalendarCheck /> Academic Attendance
                  </NavItemLink>
                )}
                {hasResults && (
                  <NavItemLink to="/staff/results" $active={pathname === '/staff/results'}>
                    <FaAward /> Results & Exams
                  </NavItemLink>
                )}
                {hasHR && (
                  <>
                    <NavItemLink to="/staff/applications" $active={pathname === '/staff/applications'}>
                      <FaIdBadge /> Job Applications
                    </NavItemLink>
                    <NavItemLink to="/staff/jds" $active={pathname === '/staff/jds'}>
                      <FaFileAlt /> JDs & Contracts
                    </NavItemLink>
                  </>
                )}
                {(hasTeachers || hasHR) && (
                  <NavItemLink to="/staff/teachers" $active={pathname.startsWith('/staff/teachers')}>
                    <FaUserTie /> Faculty Directory
                  </NavItemLink>
                )}
              </>
            )}

            {(hasAnnouncements || hasComplaints) && (
              <>
                <SectionHeader>Communication</SectionHeader>
                {hasAnnouncements && (
                  <NavItemLink to="/staff/announcements" $active={pathname === '/staff/announcements'}>
                    <FaBullhorn /> Announcements
                  </NavItemLink>
                )}
                {hasComplaints && (
                  <NavItemLink to="/staff/complaints" $active={pathname === '/staff/complaints'}>
                    <FaComments /> Grievances & Tickets
                  </NavItemLink>
                )}
              </>
            )}

            <SectionHeader>Personal</SectionHeader>
            <NavItemLink to="/staff/profile" $active={pathname === '/staff/profile' || pathname === '/staff/leaves'}>
              <FaUserTie /> Profile & Leaves
            </NavItemLink>
          </NavArea>

          <SidebarFooter>
            <LogoutButton onClick={handleLogout}>
              <FaSignOutAlt /> Sign Out
            </LogoutButton>
          </SidebarFooter>
        </Sidebar>

        <MainContent>
          <Topbar>
            <TopbarLeft>
              <MenuToggle onClick={() => setMobileMenuOpen(true)}>
                <FaBars />
              </MenuToggle>
              <Breadcrumb>
                <span className="portal-tag">Staff Portal</span>
                {crumb.section && (
                  <>
                    <span className="sep">/</span>
                    <span className={crumb.page ? 'parent' : 'current'}>
                      {crumb.section}
                    </span>
                  </>
                )}
                {crumb.page && (
                  <>
                    <span className="sep">/</span>
                    <span className="current">{crumb.page}</span>
                  </>
                )}
              </Breadcrumb>
            </TopbarLeft>

            <TopbarRight>
              {activeTimer && (
                <GlobalTimerPill>
                  <span className="dot" />
                  {activeTimer.staff_tasks?.task_key && (
                    <span className="task-key">[{activeTimer.staff_tasks.task_key}]</span>
                  )}
                  <span className="desc">
                    {activeTimer.description || activeTimer.staff_tasks?.title || activeTimer.staff_time_projects?.name || 'Task'}
                  </span>
                  <span className="timer">{formatSeconds(timerSeconds)}</span>
                  <button className="stop-btn" onClick={handleStopGlobalTimer} title="Stop Timer">
                    <FaStop /> Stop
                  </button>
                </GlobalTimerPill>
              )}
              <NotificationBell />
            </TopbarRight>
          </Topbar>

          <ContentArea>
            {children}
          </ContentArea>
        </MainContent>
      </LayoutWrapper>
    </InStaffLayoutContext.Provider>
  );
}
