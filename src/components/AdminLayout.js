import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaChevronDown, FaChevronRight, FaBars, FaTimes, FaSignOutAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useComplaints } from '../context/ComplaintsContext';
import { useDepartment } from '../context/DepartmentContext';
import {
  DEPARTMENTS,
  getDepartmentByPath,
  getDepartmentNav,
  getDepartmentTitle,
  normalizeAdminPath
} from '../utils/departments';
import NotificationBell from './NotificationBell';
import { portalTheme } from './portal/PortalTheme';
import logoImg from '../logo.svg';

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
  padding: 20px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};

  img {
    height: 36px;
    filter: drop-shadow(0 2px 8px rgba(123, 31, 46, 0.3));
  }
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

const DepartmentHeader = styled.div`
  padding: 14px 18px;
  background: linear-gradient(135deg, ${props => `${props.$color}18`} 0%, rgba(255, 255, 255, 0.02) 100%);
  border-bottom: 1px solid ${props => `${props.$color}30`};
  display: flex;
  align-items: center;
  gap: 10px;

  .icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: ${portalTheme.radii.sm};
    background: ${props => `${props.$color}25`};
    border: 1px solid ${props => `${props.$color}40`};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    box-shadow: 0 0 10px ${props => `${props.$color}25`};
  }

  .text {
    display: flex;
    flex-direction: column;
    overflow: hidden;

    small {
      color: ${portalTheme.colors.textMuted};
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    strong {
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const NavList = styled.nav`
  flex: 1;
  padding: 14px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const NavLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${portalTheme.colors.textMuted};
  padding: 14px 10px 6px;
  user-select: none;
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textSecondary};
  background: ${props => props.$active 
    ? `linear-gradient(90deg, ${props.$accent || portalTheme.colors.primary}30 0%, ${props.$accent || portalTheme.colors.primary}08 100%)` 
    : 'transparent'};
  border-left: 3px solid ${props => props.$active ? (props.$accent || portalTheme.colors.primary) : 'transparent'};
  text-decoration: none;
  border-radius: 0 ${portalTheme.radii.sm} ${portalTheme.radii.sm} 0;
  transition: ${portalTheme.transitions.default};
  font-size: 0.88rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  position: relative;

  .content-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .icon {
      font-size: 1rem;
      color: ${props => props.$active ? (props.$accent || '#ff8a99') : portalTheme.colors.textMuted};
      transition: ${portalTheme.transitions.default};
      display: flex;
      align-items: center;
    }
  }

  &:hover {
    color: #fff;
    background: ${props => `${props.$accent || portalTheme.colors.primary}18`};

    .icon {
      color: ${props => props.$accent || '#ff8a99'};
    }
  }

  .red-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
  }
`;

const DropdownContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  padding-left: 28px;
  margin-top: 2px;
  gap: 2px;
  overflow: hidden;
`;

const DropdownItem = styled(Link)`
  padding: 8px 12px;
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textMuted};
  text-decoration: none;
  font-size: 0.84rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: ${portalTheme.transitions.default};
  border-left: 1px solid ${props => props.$active ? portalTheme.colors.primary : 'rgba(255,255,255,0.08)'};
  border-radius: 0 ${portalTheme.radii.sm} ${portalTheme.radii.sm} 0;

  &:hover {
    color: #fff;
    background: rgba(123, 31, 46, 0.1);
    border-left-color: ${portalTheme.colors.primary};
  }
`;

const SidebarFooter = styled.div`
  padding: 16px;
  border-top: 1px solid ${portalTheme.colors.borderSubtle};
  background: rgba(0, 0, 0, 0.2);
`;

const UserBadge = styled.div`
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

  .info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;

    p {
      font-size: 0.85rem;
      font-weight: 600;
      color: #fff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    span {
      font-size: 0.72rem;
      color: ${portalTheme.colors.textMuted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  min-width: 0;
`;

const Topbar = styled.header`
  min-height: 68px;
  background: ${portalTheme.colors.bgTopbar};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  flex-shrink: 0;
  z-index: 10;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 10px 16px;
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

const BreadcrumbArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Breadcrumbs = styled.div`
  font-size: 0.72rem;
  color: ${portalTheme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
`;

const PageTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
`;

const DepartmentSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px;
  border-radius: ${portalTheme.radii.pill};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  overflow-x: auto;
  max-width: 100%;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1024px) {
    order: 3;
    width: 100%;
    justify-content: flex-start;
  }
`;

const DeptPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: ${portalTheme.transitions.default};
  border: 1px solid ${props => props.$active ? `${props.$color}60` : 'transparent'};
  background: ${props => props.$active ? `${props.$color}25` : 'transparent'};
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textMuted};

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$color};
    box-shadow: ${props => props.$active ? `0 0 8px ${props.$color}` : 'none'};
  }

  &:hover {
    color: #fff;
    background: ${props => `${props.$color}18`};
  }
`;

const TopbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LogoutBtn = styled.button`
  background: rgba(123, 31, 46, 0.12);
  color: #ff8a99;
  border: 1px solid rgba(123, 31, 46, 0.28);
  padding: 8px 12px;
  border-radius: ${portalTheme.radii.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  transition: ${portalTheme.transitions.default};

  &:hover {
    background: ${portalTheme.colors.primary};
    color: #fff;
    border-color: ${portalTheme.colors.primary};
    box-shadow: 0 0 16px rgba(123, 31, 46, 0.4);
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

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
  }
`;

export const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { visibleDepartments, activeDepartment, setActiveDepartment } = useDepartment();
  const { complaints } = useComplaints();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    courses: location.pathname.includes('/courses'),
    attendance: location.pathname.includes('/attendance'),
    finance: location.pathname.includes('/finance'),
    settings: location.pathname.includes('/settings')
  });

  const hasOpenComplaints = complaints.some(c => c.status === 'Open');

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const badges = {
    openComplaints: hasOpenComplaints,
    newInquiries: false,
    pendingHR: false,
    pendingPayouts: false
  };

  const normalizedPath = normalizeAdminPath(location.pathname);
  const currentDepartment = getDepartmentByPath(normalizedPath);
  const activeDepartmentMeta = DEPARTMENTS.find((department) => department.id === (currentDepartment?.id || activeDepartment)) || DEPARTMENTS[0];
  const navItems = getDepartmentNav(user, activeDepartmentMeta.id, badges);
  const routeMeta = getDepartmentTitle(normalizedPath);

  const handleDepartmentSwitch = (department) => {
    setActiveDepartment(department.id);
    navigate(department.path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <LayoutWrapper>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <Overlay 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
        )}
      </AnimatePresence>

      <Sidebar $isOpen={isMobileMenuOpen}>
        <SidebarHeader>
          <Link to="/">
            <img src={logoImg} alt="DeepSkills Admin" />
          </Link>
          <CloseButton onClick={() => setIsMobileMenuOpen(false)}>
            <FaTimes />
          </CloseButton>
        </SidebarHeader>

        <DepartmentHeader $color={activeDepartmentMeta.color}>
          <div className="icon-wrap">
            {activeDepartmentMeta.icon}
          </div>
          <div className="text">
            <small>Department</small>
            <strong>{activeDepartmentMeta.label}</strong>
          </div>
        </DepartmentHeader>

        <NavList>
          {navItems.map((item, idx) => {
            if (item.section) {
              return <NavLabel key={`label-${idx}`}>{item.section}</NavLabel>;
            }

            if (item.type === 'dropdown') {
              const isChildActive = item.items.some(child => location.pathname === child.path);
              return (
                <div key={`dropdown-${idx}`}>
                  <NavItem 
                    as="div" 
                    onClick={item.onToggle} 
                    $active={isChildActive}
                    $accent={activeDepartmentMeta.color}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="content-left">
                      <span className="icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.isOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                  </NavItem>
                  <AnimatePresence>
                    {item.isOpen && (
                      <DropdownContent
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        {item.items.map((child, cIdx) => (
                          <DropdownItem 
                            key={`child-${cIdx}`} 
                            to={child.path} 
                            $active={location.pathname === child.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {child.label}
                          </DropdownItem>
                        ))}
                      </DropdownContent>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            const isActive = normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`);
            return (
              <NavItem 
                key={`nav-${idx}`} 
                to={item.path} 
                $active={isActive}
                $accent={activeDepartmentMeta.color}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="content-left">
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && <span className="red-dot" />}
              </NavItem>
            );
          })}
        </NavList>

        <SidebarFooter>
          <UserBadge>
            <div className="avatar">{user?.name?.[0] || 'A'}</div>
            <div className="info">
              <p>{user?.name || 'Administrator'}</p>
              <span>{user?.email || 'admin@deepskills.pk'}</span>
            </div>
          </UserBadge>
        </SidebarFooter>
      </Sidebar>

      <MainArea>
        <Topbar>
          <TopbarLeft>
            <MenuToggle onClick={() => setIsMobileMenuOpen(true)}>
              <FaBars />
            </MenuToggle>
            <BreadcrumbArea>
              <Breadcrumbs>{routeMeta.breadcrumbs || 'Admin / Portal'}</Breadcrumbs>
              <PageTitle>{routeMeta.title || 'Dashboard'}</PageTitle>
            </BreadcrumbArea>
          </TopbarLeft>

          <DepartmentSelector>
            {visibleDepartments.map((department) => {
              const isActive = activeDepartmentMeta.id === department.id;
              return (
                <DeptPill
                  key={department.id}
                  type="button"
                  $active={isActive}
                  $color={department.color}
                  onClick={() => handleDepartmentSwitch(department)}
                >
                  <span className="dot" />
                  <span>{department.icon}</span>
                  <span>{department.shortLabel || department.label}</span>
                </DeptPill>
              );
            })}
          </DepartmentSelector>

          <TopbarRight>
            <NotificationBell />
            <LogoutBtn onClick={handleLogout} title="Log Out">
              <FaSignOutAlt />
              <span>Logout</span>
            </LogoutBtn>
          </TopbarRight>
        </Topbar>

        <ContentArea>
          {children}
        </ContentArea>
      </MainArea>
    </LayoutWrapper>
  );
};

export default AdminLayout;
