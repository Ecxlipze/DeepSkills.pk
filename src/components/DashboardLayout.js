import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaBars, FaTimes, FaSignOutAlt, FaChevronDown, FaChevronUp,
  FaHome, FaTasks, FaChartLine, FaCertificate,
  FaExclamationCircle, FaUserPlus, FaComments,
  FaWallet, FaUserFriends, FaGraduationCap, FaCalendarCheck, FaGift,
  FaUserGraduate, FaChalkboardTeacher, FaMoneyBillWave, FaBullhorn, FaIdBadge
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { portalTheme } from './portal/PortalTheme';
import logoImg from '../logo.svg';

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: ${portalTheme.colors.bgBase};
  background-image: 
    radial-gradient(circle at 15% 15%, rgba(123, 31, 46, 0.07) 0%, transparent 35%),
    radial-gradient(circle at 85% 85%, rgba(123, 31, 46, 0.05) 0%, transparent 40%);
  color: ${portalTheme.colors.textPrimary};
  overflow: hidden;
  font-family: ${portalTheme.fonts.body};
`;

const SidebarContainer = styled.aside`
  width: 260px;
  background: ${portalTheme.colors.bgSidebar};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  flex-direction: column;
  z-index: 1000;
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
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};

  img {
    height: 36px;
    filter: drop-shadow(0 2px 8px rgba(123, 31, 46, 0.3));
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${portalTheme.colors.textSecondary};
  font-size: 1.3rem;
  cursor: pointer;
  display: none;
  padding: 6px;
  border-radius: ${portalTheme.radii.sm};
  transition: ${portalTheme.transitions.default};

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const NavList = styled.nav`
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* Custom subtle scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const SectionLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${portalTheme.colors.textMuted};
  padding: 14px 12px 6px;
  user-select: none;
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textSecondary};
  background: ${props => props.$active 
    ? 'linear-gradient(90deg, rgba(123, 31, 46, 0.35) 0%, rgba(123, 31, 46, 0.1) 100%)' 
    : 'transparent'};
  border-left: 3px solid ${props => props.$active ? portalTheme.colors.primary : 'transparent'};
  text-decoration: none;
  border-radius: 0 ${portalTheme.radii.sm} ${portalTheme.radii.sm} 0;
  transition: ${portalTheme.transitions.default};
  font-size: 0.9rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  position: relative;

  .icon {
    font-size: 1.05rem;
    color: ${props => props.$active ? '#ff8a99' : portalTheme.colors.textMuted};
    transition: ${portalTheme.transitions.default};
    display: flex;
    align-items: center;
  }

  &:hover {
    color: #fff;
    background: rgba(123, 31, 46, 0.16);

    .icon {
      color: #ff8a99;
    }
  }

  ${props => props.$active && `
    box-shadow: inset 0 0 16px rgba(123, 31, 46, 0.2);
  `}
`;

const NavItemButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: none;
  gap: 12px;
  padding: 10px 14px;
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textSecondary};
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.2)' : 'transparent'};
  border-left: 3px solid ${props => props.$active ? portalTheme.colors.primary : 'transparent'};
  border-radius: 0 ${portalTheme.radii.sm} ${portalTheme.radii.sm} 0;
  transition: ${portalTheme.transitions.default};
  font-size: 0.9rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  font-family: inherit;

  .left {
    display: flex;
    align-items: center;
    gap: 12px;

    .icon {
      font-size: 1.05rem;
      color: ${props => props.$active ? '#ff8a99' : portalTheme.colors.textMuted};
      display: flex;
      align-items: center;
    }
  }

  &:hover {
    color: #fff;
    background: rgba(123, 31, 46, 0.16);

    .icon {
      color: #ff8a99;
    }
  }
`;

const SubNavList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  padding-left: 28px;
  margin-top: 2px;
  gap: 2px;
  overflow: hidden;
`;

const SubNavItem = styled(Link)`
  padding: 8px 12px;
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textMuted};
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: ${portalTheme.transitions.default};
  border-left: 1px solid ${props => props.$active ? portalTheme.colors.primary : 'rgba(255,255,255,0.08)'};
  border-radius: 0 ${portalTheme.radii.sm} ${portalTheme.radii.sm} 0;

  &:hover {
    color: #fff;
    border-left-color: portalTheme.colors.primary;
    background: rgba(123, 31, 46, 0.1);
  }
`;

const SidebarFooter = styled.div`
  padding: 16px;
  border-top: 1px solid ${portalTheme.colors.borderSubtle};
  background: rgba(0, 0, 0, 0.2);
`;

const UserMiniCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: ${portalTheme.radii.md};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${portalTheme.colors.borderSubtle};

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: ${portalTheme.colors.primaryGradient};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.95rem;
    box-shadow: 0 2px 8px rgba(123, 31, 46, 0.4);
    flex-shrink: 0;
  }

  .details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;

    .name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role {
      font-size: 0.72rem;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  min-width: 0;
`;

const TopHeader = styled.header`
  height: 68px;
  background: ${portalTheme.colors.bgTopbar};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
  z-index: 10;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const MenuToggle = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  display: none;
  width: 38px;
  height: 38px;
  border-radius: ${portalTheme.radii.sm};
  align-items: center;
  justify-content: center;
  transition: ${portalTheme.transitions.default};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  @media (max-width: 768px) {
    display: flex;
  }
`;

const BreadcrumbNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;

  .portal-tag {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    padding: 3px 8px;
    border-radius: ${portalTheme.radii.pill};
    background: ${portalTheme.colors.primaryLight};
    color: #ff8a99;
    border: 1px solid rgba(123, 31, 46, 0.3);
  }

  .sep {
    color: ${portalTheme.colors.textDim};
  }

  .page-name {
    color: ${portalTheme.colors.textPrimary};
    font-weight: 600;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const LogoutBtn = styled.button`
  background: rgba(123, 31, 46, 0.12);
  color: #ff8a99;
  border: 1px solid rgba(123, 31, 46, 0.28);
  padding: 8px 14px;
  border-radius: ${portalTheme.radii.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: ${portalTheme.transitions.default};

  &:hover {
    background: ${portalTheme.colors.primary};
    color: #fff;
    border-color: ${portalTheme.colors.primary};
    box-shadow: 0 0 16px rgba(123, 31, 46, 0.4);
  }

  @media (max-width: 600px) {
    .text {
      display: none;
    }
    padding: 8px;
  }
`;

const ContentArea = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  position: relative;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }

  /* Custom smooth scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
  }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 999;
`;

const NavDropdownGroup = ({ item, location, closeSidebar }) => {
  const isAnyChildActive = item.subItems?.some(sub => location.pathname === sub.path);
  const [isOpen, setIsOpen] = useState(isAnyChildActive);

  return (
    <>
      <NavItemButton onClick={() => setIsOpen(!isOpen)} $active={isAnyChildActive}>
        <div className="left">
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </div>
        {isOpen ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
      </NavItemButton>
      <AnimatePresence>
        {isOpen && (
          <SubNavList
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {item.subItems.map((sub, idx) => (
              <SubNavItem 
                key={idx} 
                to={sub.path} 
                $active={location.pathname === sub.path}
                onClick={closeSidebar}
              >
                {sub.label}
              </SubNavItem>
            ))}
          </SubNavList>
        )}
      </AnimatePresence>
    </>
  );
};

export const DashboardLayout = ({ children, navItems }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Structured categorized nav items based on role
  const getCategorizedNavItems = () => {
    if (!user) return [];

    if (user.role === 'student') {
      if (user.status === 'Graduated') {
        return [
          { section: 'OVERVIEW' },
          { label: 'Dashboard', path: '/student/dashboard', icon: <FaHome /> },
          { section: 'ACADEMICS' },
          { label: 'Progress', path: '/student/progress', icon: <FaChartLine /> },
          { label: 'Results (Mid Term)', path: '/student/results/midterm', icon: <FaGraduationCap /> },
          { label: 'Results (Final Term)', path: '/student/results/finalterm', icon: <FaGraduationCap /> },
          { section: 'CREDENTIALS' },
          { label: 'Certificate', path: '/student/certificate', icon: <FaCertificate /> },
          { section: 'COMMUNITY' },
          { label: 'Announcements', path: '/student/announcements', icon: <FaBullhorn /> },
          { section: 'ACCOUNT' },
          { label: 'Finance', path: '/student/finance', icon: <FaWallet /> },
          { label: 'New Enrollment', path: '/student/new-enrollment', icon: <FaUserPlus /> },
          { label: 'Referral Program', path: '/student/referral', icon: <FaUserFriends /> }
        ];
      }

      return [
        { section: 'OVERVIEW' },
        { label: 'Dashboard', path: '/student/dashboard', icon: <FaHome /> },
        { section: 'ACADEMICS' },
        { label: 'Tasks & Assignments', path: '/student/tasks', icon: <FaTasks /> },
        { label: 'Course Progress', path: '/student/progress', icon: <FaChartLine /> },
        { label: 'Attendance', path: '/student/attendance', icon: <FaCalendarCheck /> },
        { label: 'Results (Mid Term)', path: '/student/results/midterm', icon: <FaGraduationCap /> },
        { label: 'Results (Final Term)', path: '/student/results/finalterm', icon: <FaGraduationCap /> },
        { section: 'CREDENTIALS' },
        { label: 'Certificate', path: '/student/certificate', icon: <FaCertificate /> },
        { section: 'COMMUNICATION' },
        { label: 'Group Chat', path: '/student/group-chat', icon: <FaComments /> },
        { label: 'Announcements', path: '/student/announcements', icon: <FaBullhorn /> },
        { label: 'Complaints', path: '/student/complaints', icon: <FaExclamationCircle /> },
        { section: 'ACCOUNT & REWARDS' },
        { label: 'Finance & Fees', path: '/student/finance', icon: <FaWallet /> },
        { label: 'New Enrollment', path: '/student/new-enrollment', icon: <FaUserPlus /> },
        { label: 'Referral Program', path: '/student/referral', icon: <FaUserFriends /> }
      ];
    }

    if (user.role === 'teacher') {
      return [
        { section: 'OVERVIEW' },
        { label: 'Dashboard', path: '/teacher/dashboard', icon: <FaHome /> },
        { section: 'TEACHING' },
        { 
          label: 'Tasks', 
          icon: <FaTasks />, 
          subItems: [
            { label: 'Assign Task', path: '/teacher/tasks/assign' },
            { label: 'View Tasks', path: '/teacher/tasks/view' }
          ]
        },
        { label: 'Group Chat', path: '/teacher/group-chat', icon: <FaComments /> },
        { section: 'COMMUNICATION' },
        { label: 'Announcements', path: '/teacher/announcements', icon: <FaBullhorn /> },
        { label: 'Complaints', path: '/teacher/complaints', icon: <FaExclamationCircle /> },
        { section: 'CAREER & PAYROLL' },
        { label: 'My HR Profile', path: '/teacher/hr', icon: <FaIdBadge /> },
        { label: 'Salary & Finance', path: '/teacher/finance', icon: <FaWallet /> },
        { label: 'Referral Program', path: '/teacher/referral', icon: <FaUserFriends /> }
      ];
    }

    if (user.role === 'admin') {
      return [
        { section: 'DASHBOARD' },
        { label: 'Dashboard', path: '/admin/dashboard', icon: <FaHome /> },
        { label: 'Admissions', path: '/admin/admissions', icon: <FaUserPlus /> },
        { label: 'Students', path: '/admin/management/students', icon: <FaUserGraduate /> },
        { label: 'Teachers', path: '/admin/management/teachers', icon: <FaChalkboardTeacher /> },
        { label: 'Attendance', path: '/admin/academic/attendance', icon: <FaCalendarCheck /> },
        { label: 'Complaints', path: '/admin/academic/complaints', icon: <FaExclamationCircle /> },
        { label: 'Certificates', path: '/admin/management/certificates', icon: <FaCertificate /> },
        { label: 'Finance', path: '/admin/finance', icon: <FaMoneyBillWave /> },
        { label: 'Referral Program', path: '/admin/management/referral', icon: <FaGift /> },
        { label: 'Exam Results', path: '/admin/academic/results', icon: <FaGraduationCap /> }
      ];
    }

    return [];
  };

  const finalNavItems = navItems || getCategorizedNavItems();

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return 'Overview';
    if (p.includes('/tasks')) return 'Tasks & Assignments';
    if (p.includes('/progress')) return 'Course Progress';
    if (p.includes('/attendance')) return 'Attendance';
    if (p.includes('/results')) return 'Exam Results';
    if (p.includes('/certificate')) return 'Certificates';
    if (p.includes('/complaints')) return 'Complaints & Support';
    if (p.includes('/announcements')) return 'Announcements';
    if (p.includes('/group-chat')) return 'Group Chat';
    if (p.includes('/finance')) return 'Finance';
    if (p.includes('/new-enrollment')) return 'New Enrollment';
    if (p.includes('/referral')) return 'Referral Program';
    if (p.includes('/hr')) return 'HR Profile';
    return 'Portal';
  };

  return (
    <LayoutContainer>
      <AnimatePresence>
        {sidebarOpen && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <SidebarContainer $isOpen={sidebarOpen}>
        <SidebarHeader>
          <Link to="/">
            <img src={logoImg} alt="DeepSkills" />
          </Link>
          <CloseBtn onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <FaTimes />
          </CloseBtn>
        </SidebarHeader>

        <NavList>
          {finalNavItems.map((item, index) => {
            if (item.section) {
              return <SectionLabel key={`sec-${index}`}>{item.section}</SectionLabel>;
            }
            if (item.subItems) {
              return (
                <NavDropdownGroup 
                  key={`drop-${index}`} 
                  item={item} 
                  location={location} 
                  closeSidebar={() => setSidebarOpen(false)} 
                />
              );
            }
            return (
              <NavItem 
                key={`nav-${index}`} 
                to={item.path} 
                $active={location.pathname === item.path}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavItem>
            );
          })}
        </NavList>

        <SidebarFooter>
          <UserMiniCard>
            <div className="avatar">
              {(user?.name || user?.full_name || 'U')[0]?.toUpperCase()}
            </div>
            <div className="details">
              <span className="name">{user?.name || user?.full_name || 'User'}</span>
              <span className="role">{user?.role || 'Member'}</span>
            </div>
          </UserMiniCard>
        </SidebarFooter>
      </SidebarContainer>

      <MainContent>
        <TopHeader>
          <HeaderLeft>
            <MenuToggle onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <FaBars />
            </MenuToggle>
            <BreadcrumbNav>
              <span className="portal-tag">{user?.role || 'Portal'}</span>
              <span className="sep">/</span>
              <span className="page-name">{getPageTitle()}</span>
            </BreadcrumbNav>
          </HeaderLeft>

          <UserInfo>
            <NotificationBell />
            <LogoutBtn onClick={handleLogout} title="Log Out">
              <FaSignOutAlt />
              <span className="text">Logout</span>
            </LogoutBtn>
          </UserInfo>
        </TopHeader>

        <ContentArea>
          {children}
        </ContentArea>
      </MainContent>
    </LayoutContainer>
  );
};

export default DashboardLayout;
