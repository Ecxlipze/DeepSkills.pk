import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import {
  FaClock, FaTasks, FaUserTie, FaCheckCircle, FaCoffee,
  FaSignInAlt, FaSignOutAlt, FaBullhorn, FaArrowRight, FaClipboardList,
  FaPlay, FaStop, FaCalendarAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import StaffLayout from '../components/StaffLayout';
import { portalTheme } from '../components/portal/PortalTheme';
import { useAuth } from '../context/AuthContext';
import {
  getAuthToken,
  fetchTodayShift,
  postShiftAction,
  fetchTrackerData,
  startTaskTimer,
  stopTaskTimer,
  formatSeconds,
  formatHourDecimal
} from '../utils/timeTrackingApi';
import { fetchStaffTasks } from '../utils/staffTasksApi';
import CounsellorDashboardView from './dashboards/CounsellorDashboardView';
import FinanceDashboardView from './dashboards/FinanceDashboardView';
import HRDashboardView from './dashboards/HRDashboardView';
import AcademicDashboardView from './dashboards/AcademicDashboardView';
import MarketingDashboardView from './dashboards/MarketingDashboardView';
import AuditorDashboardView from './dashboards/AuditorDashboardView';

const DashboardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.4) 0%, rgba(24, 27, 38, 0.9) 100%);
  border: 1px solid rgba(123, 31, 46, 0.5);
  border-radius: ${portalTheme.radii.lg};
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  .text-side {
    display: flex;
    flex-direction: column;
    gap: 6px;

    h1 {
      font-size: 1.6rem;
      font-weight: 800;
      margin: 0;
      color: #fff;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
      color: ${portalTheme.colors.textSecondary};
    }
  }

  .role-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(55, 138, 221, 0.15);
    border: 1px solid rgba(55, 138, 221, 0.35);
    color: #60A5FA;
    padding: 6px 14px;
    border-radius: ${portalTheme.radii.pill};
    font-size: 0.82rem;
    font-weight: 700;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  .icon {
    width: 46px;
    height: 46px;
    border-radius: ${portalTheme.radii.md};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    background: ${props => props.$bg || 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.$color || '#fff'};
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .val {
      font-size: 1.45rem;
      font-weight: 800;
      color: #fff;
    }

    .lbl {
      font-size: 0.78rem;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`;

const QuickActionBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 18px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(123, 31, 46, 0.3);
    border-color: rgba(123, 31, 46, 0.6);
    color: #fff;
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    a {
      font-size: 0.8rem;
      color: #378ADD;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const ShiftStatusBanner = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${portalTheme.radii.md};
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;

  .info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .status-text {
      font-size: 0.85rem;
      font-weight: 700;
      color: ${props => props.$color || '#fff'};
    }

    .time-text {
      font-size: 1.3rem;
      font-family: monospace;
      font-weight: 800;
      color: #fff;
    }
  }

  .buttons {
    display: flex;
    gap: 8px;
  }
`;

const MiniBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: ${portalTheme.radii.sm};
  border: none;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  background: ${props => props.$variant === 'green' ? 'linear-gradient(135deg, #10B981, #059669)' : (props.$variant === 'amber' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#EF4444')};
  color: #fff;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
`;

export default function StaffDashboard() {
  const { user } = useAuth();
  const [shift, setShift] = useState(null);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [myTasks, setMyTasks] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);

  const loadDashboardData = async () => {
    try {
      const token = await getAuthToken(user);
      if (!token) return;

      const [sData, tData, tasks] = await Promise.all([
        fetchTodayShift(token).catch(() => ({ shift: null })),
        fetchTrackerData(token, { date: new Date().toISOString().slice(0, 10) }).catch(() => ({ totalSeconds: 0, activeTimer: null })),
        fetchStaffTasks(token, { assigneeId: 'my' }).catch(() => [])
      ]);

      if (sData.shift) setShift(sData.shift);
      setTodaySeconds(tData.totalSeconds || 0);
      setActiveTimer(tData.activeTimer || null);
      setMyTasks((tasks || []).filter(t => t.status !== 'done').slice(0, 4));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const handleToggleTimer = async (task) => {
    try {
      const token = await getAuthToken(user);
      const isRunning = Boolean(activeTimer && activeTimer.task_id === task.id);
      if (isRunning) {
        await stopTaskTimer(token, activeTimer.id);
        toast.success(`Stopped tracking ${task.task_key}`);
      } else {
        await startTaskTimer(token, {
          projectId: task.project_id,
          taskId: task.id,
          description: task.title,
          billable: false
        });
        toast.success(`Started tracking ${task.task_key}`);
      }
      loadDashboardData();
    } catch (err) {
      toast.error('Timer action failed');
    }
  };

  const handleShiftPunch = async (action) => {
    try {
      const token = await getAuthToken(user);
      const res = await postShiftAction(token, action);
      setShift(res.shift);
      toast.success(res.message || 'Shift updated');
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const roleName =
    user?.customRoleName ||
    user?.roleName ||
    user?.custom_roles?.name ||
    (user?.role === 'custom' ? (user?.designation || 'Staff Member') : (user?.role || 'Staff Member'));

  const isSuperAdmin = user?.role === 'admin';
  const isCounsellor =
    (user?.customRoleName && /counsellor/i.test(user.customRoleName)) ||
    (user?.roleName && /counsellor/i.test(user.roleName)) ||
    (user?.custom_roles?.name && /counsellor/i.test(user.custom_roles.name)) ||
    (user?.permissions?.counsellor === 'full' && user?.permissions?.finance !== 'full' && user?.permissions?.attendance !== 'full');

  const isFinanceOfficer =
    (user?.customRoleName && /finance/i.test(user.customRoleName)) ||
    (user?.roleName && /finance/i.test(user.roleName)) ||
    (user?.custom_roles?.name && /finance/i.test(user.custom_roles.name)) ||
    (user?.permissions?.finance === 'full' && user?.permissions?.counsellor !== 'full' && user?.permissions?.attendance !== 'full');

  const isHRManager =
    (user?.customRoleName && /hr|faculty manager/i.test(user.customRoleName)) ||
    (user?.roleName && /hr|faculty manager/i.test(user.roleName)) ||
    (user?.custom_roles?.name && /hr|faculty manager/i.test(user.custom_roles.name)) ||
    (user?.permissions?.hr === 'full' && user?.permissions?.counsellor !== 'full' && user?.permissions?.finance !== 'full');

  const isAcademicCoordinator =
    (user?.customRoleName && /academic/i.test(user.customRoleName)) ||
    (user?.roleName && /academic/i.test(user.roleName)) ||
    (user?.custom_roles?.name && /academic/i.test(user.custom_roles.name)) ||
    (user?.permissions?.courses === 'full' && user?.permissions?.attendance === 'full' && user?.permissions?.finance !== 'full');

  const isMarketingSpecialist =
    (user?.customRoleName && /marketing|media|outreach/i.test(user.customRoleName)) ||
    (user?.roleName && /marketing|media|outreach/i.test(user.roleName)) ||
    (user?.custom_roles?.name && /marketing|media|outreach/i.test(user.custom_roles.name)) ||
    (user?.permissions?.blog === 'full' && user?.permissions?.announcements === 'full' && user?.permissions?.finance !== 'full');

  const isAuditor =
    (user?.customRoleName && /auditor|executive viewer|compliance/i.test(user.customRoleName)) ||
    (user?.roleName && /auditor|executive viewer|compliance/i.test(user.roleName)) ||
    (user?.custom_roles?.name && /auditor|executive viewer|compliance/i.test(user.custom_roles.name)) ||
    user?.custom_role_id === '07cf8bb6-1b3a-4db0-b5f4-50ec38b8eeb7' ||
    (user?.permissions?.reports === 'full' && user?.permissions?.complaints === 'view' && user?.permissions?.finance === 'view');

  const [adminViewRole, setAdminViewRole] = useState('auto');

  const showCounsellorDashboard = isCounsellor || (isSuperAdmin && adminViewRole === 'counsellor');
  const showFinanceDashboard = isFinanceOfficer || (isSuperAdmin && adminViewRole === 'finance');
  const showHRDashboard = isHRManager || (isSuperAdmin && adminViewRole === 'hr');
  const showAcademicDashboard = isAcademicCoordinator || (isSuperAdmin && adminViewRole === 'academic');
  const showMarketingDashboard = isMarketingSpecialist || (isSuperAdmin && adminViewRole === 'marketing');
  const showAuditorDashboard = isAuditor || (isSuperAdmin && adminViewRole === 'auditor');

  if (showFinanceDashboard) {
    return (
      <StaffLayout>
        {isSuperAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#34D399' }}>👑 <strong>Super Admin Mode:</strong> Previewing Finance Officer Workstation</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAdminViewRole('counsellor')}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Counsellor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('hr')}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                HR View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('academic')}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Academic View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('marketing')}
                style={{
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#F472B6',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Marketing View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('auditor')}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Auditor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('general')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Standard View
              </button>
            </div>
          </div>
        )}
        <FinanceDashboardView
          user={user}
          shift={shift}
          todaySeconds={todaySeconds}
          myTasks={myTasks}
          activeTimer={activeTimer}
          handleShiftPunch={handleShiftPunch}
          handleToggleTimer={handleToggleTimer}
          onRefresh={loadDashboardData}
        />
      </StaffLayout>
    );
  }

  if (showCounsellorDashboard) {
    return (
      <StaffLayout>
        {isSuperAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#FBBF24' }}>👑 <strong>Super Admin Mode:</strong> Previewing Admission Counsellor Workstation</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAdminViewRole('finance')}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Finance View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('hr')}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                HR View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('academic')}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Academic View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('marketing')}
                style={{
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#F472B6',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Marketing View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('auditor')}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Auditor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('general')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Standard View
              </button>
            </div>
          </div>
        )}
        <CounsellorDashboardView
          user={user}
          shift={shift}
          todaySeconds={todaySeconds}
          myTasks={myTasks}
          activeTimer={activeTimer}
          handleShiftPunch={handleShiftPunch}
          handleToggleTimer={handleToggleTimer}
          onRefresh={loadDashboardData}
        />
      </StaffLayout>
    );
  }

  if (showHRDashboard) {
    return (
      <StaffLayout>
        {isSuperAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#c4b5fd' }}>👑 <strong>Super Admin Mode:</strong> Previewing HR & Faculty Manager Workstation</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAdminViewRole('counsellor')}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Counsellor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('finance')}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Finance View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('academic')}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Academic View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('marketing')}
                style={{
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#F472B6',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Marketing View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('auditor')}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Auditor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('general')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Standard View
              </button>
            </div>
          </div>
        )}
        <HRDashboardView
          user={user}
          shift={shift}
          todaySeconds={todaySeconds}
          myTasks={myTasks}
          activeTimer={activeTimer}
          handleShiftPunch={handleShiftPunch}
          handleToggleTimer={handleToggleTimer}
          onRefresh={loadDashboardData}
        />
      </StaffLayout>
    );
  }

  if (showAcademicDashboard) {
    return (
      <StaffLayout>
        {isSuperAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#93c5fd' }}>👑 <strong>Super Admin Mode:</strong> Previewing Academic Coordinator Workstation</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAdminViewRole('counsellor')}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Counsellor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('finance')}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Finance View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('hr')}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                HR View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('marketing')}
                style={{
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#F472B6',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Marketing View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('auditor')}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Auditor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('general')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Standard View
              </button>
            </div>
          </div>
        )}
        <AcademicDashboardView
          user={user}
          shift={shift}
          todaySeconds={todaySeconds}
          myTasks={myTasks}
          activeTimer={activeTimer}
          handleShiftPunch={handleShiftPunch}
          handleToggleTimer={handleToggleTimer}
          onRefresh={loadDashboardData}
        />
      </StaffLayout>
    );
  }

  if (showMarketingDashboard) {
    return (
      <StaffLayout>
        {isSuperAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(236, 72, 153, 0.12)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#f472b6' }}>👑 <strong>Super Admin Mode:</strong> Previewing Marketing & Media Specialist Workstation</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAdminViewRole('counsellor')}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Counsellor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('finance')}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Finance View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('hr')}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                HR View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('academic')}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Academic View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('auditor')}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Auditor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('general')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Standard View
              </button>
            </div>
          </div>
        )}
        <MarketingDashboardView
          user={user}
          shift={shift}
          todaySeconds={todaySeconds}
          myTasks={myTasks}
          activeTimer={activeTimer}
          handleShiftPunch={handleShiftPunch}
          handleToggleTimer={handleToggleTimer}
          onRefresh={loadDashboardData}
        />
      </StaffLayout>
    );
  }

  if (showAuditorDashboard) {
    return (
      <StaffLayout>
        {isSuperAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(71, 85, 105, 0.25)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#cbd5e1' }}>👑 <strong>Super Admin Mode:</strong> Previewing Auditor & Executive Viewer Workstation</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAdminViewRole('counsellor')}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Counsellor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('finance')}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Finance View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('hr')}
                style={{
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                HR View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('academic')}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Academic View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('marketing')}
                style={{
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#F472B6',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Marketing View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('general')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Standard View
              </button>
            </div>
          </div>
        )}
        <AuditorDashboardView
          user={user}
          shift={shift}
          todaySeconds={todaySeconds}
          myTasks={myTasks}
          activeTimer={activeTimer}
          handleShiftPunch={handleShiftPunch}
          handleToggleTimer={handleToggleTimer}
          onRefresh={loadDashboardData}
          isSuperAdmin={isSuperAdmin}
          setAdminViewRole={setAdminViewRole}
        />
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <DashboardWrapper>
        {isSuperAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(55, 138, 221, 0.12)',
            border: '1px solid rgba(55, 138, 221, 0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#93C5FD' }}>👑 <strong>Super Admin:</strong> Switch to test staff role workstations</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAdminViewRole('counsellor')}
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Counsellor View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('finance')}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Finance View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('hr')}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                HR View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('academic')}
                style={{
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Academic View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('marketing')}
                style={{
                  background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Marketing View
              </button>
              <button
                type="button"
                onClick={() => setAdminViewRole('auditor')}
                style={{
                  background: 'linear-gradient(135deg, #64748B, #475569)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                Auditor View
              </button>
            </div>
          </div>
        )}
        {/* ── WELCOME BANNER ── */}
        <WelcomeBanner>
          <div className="text-side">
            <h1>{getGreeting()}, {user?.name || user?.full_name || 'Team Member'} 👋</h1>
            <p>Welcome to your DeepSkills Staff Workspace. Manage your daily shift, track task hours, and coordinate department activities.</p>
          </div>
          <div className="role-pill">
            <FaUserTie /> {roleName}
          </div>
        </WelcomeBanner>

        {/* ── STAT TILES ── */}
        <StatsGrid>
          <StatCard $bg="rgba(16, 185, 129, 0.15)" $color="#34D399">
            <div className="icon"><FaClock /></div>
            <div className="meta">
              <span className="val">{formatHourDecimal(todaySeconds)}h</span>
              <span className="lbl">Task Hours Today</span>
            </div>
          </StatCard>

          <StatCard $bg="rgba(55, 138, 221, 0.15)" $color="#60A5FA">
            <div className="icon"><FaCheckCircle /></div>
            <div className="meta">
              <span className="val">
                {shift?.status === 'on_duty' ? 'On Duty' : (shift?.status === 'on_break' ? 'On Break' : (shift?.status === 'completed' ? 'Completed' : 'Not In'))}
              </span>
              <span className="lbl">Shift Attendance</span>
            </div>
          </StatCard>

          <StatCard $bg="rgba(245, 158, 11, 0.15)" $color="#FBBF24">
            <div className="icon"><FaTasks /></div>
            <div className="meta">
              <span className="val">Active</span>
              <span className="lbl">Work Status</span>
            </div>
          </StatCard>
        </StatsGrid>

        {/* ── QUICK ACTION LINKS ── */}
        <ActionRow>
          <QuickActionBtn to="/staff/time-tracker">
            <FaClock /> Open Time Tracker
          </QuickActionBtn>
          <QuickActionBtn to="/staff/tasks">
            <FaTasks /> My Tasks & To-Dos
          </QuickActionBtn>
          <QuickActionBtn to="/staff/announcements">
            <FaBullhorn /> Campus Announcements
          </QuickActionBtn>
        </ActionRow>

        {/* ── TWO COLUMN SECTION ── */}
        <TwoColumnGrid>
          <Card>
            <div className="card-header">
              <h3><FaClock /> Today's Shift Attendance</h3>
              <Link to="/staff/time-tracker">Full Hub <FaArrowRight /></Link>
            </div>

            <ShiftStatusBanner $color={shift?.status === 'on_duty' ? '#10B981' : (shift?.status === 'on_break' ? '#F59E0B' : '#9ca3af')}>
              <div className="info">
                <span className="status-text">
                  {shift?.status === 'on_duty' && '• Currently On Duty'}
                  {shift?.status === 'on_break' && '• Currently On Lunch / Tea Break'}
                  {shift?.status === 'completed' && '✓ Shift Finished for Today'}
                  {!shift && 'Shift Attendance: Not Clocked In'}
                </span>
                <span className="time-text">
                  {shift?.clock_in
                    ? `Clock in: ${new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not clocked in yet'}
                </span>
              </div>

              <div className="buttons">
                {!shift && (
                  <MiniBtn $variant="green" onClick={() => handleShiftPunch('clock-in')}>
                    <FaSignInAlt /> Clock In
                  </MiniBtn>
                )}
                {shift && shift.status === 'on_duty' && (
                  <>
                    <MiniBtn $variant="amber" onClick={() => handleShiftPunch('break-start')}>
                      <FaCoffee /> Break
                    </MiniBtn>
                    <MiniBtn $variant="red" onClick={() => handleShiftPunch('clock-out')}>
                      <FaSignOutAlt /> Clock Out
                    </MiniBtn>
                  </>
                )}
                {shift && shift.status === 'on_break' && (
                  <>
                    <MiniBtn $variant="green" onClick={() => handleShiftPunch('break-end')}>
                      Resume
                    </MiniBtn>
                    <MiniBtn $variant="red" onClick={() => handleShiftPunch('clock-out')}>
                      Clock Out
                    </MiniBtn>
                  </>
                )}
              </div>
            </ShiftStatusBanner>
          </Card>

          <Card>
            <div className="card-header">
              <h3><FaTasks /> My Active Tasks</h3>
              <Link to="/staff/tasks">Jira Board <FaArrowRight /></Link>
            </div>

            {myTasks.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: portalTheme.colors.textMuted, fontSize: '0.85rem' }}>
                <FaTasks style={{ fontSize: '1.8rem', opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0 }}>No active tasks assigned to you right now.</p>
                <Link to="/staff/tasks" style={{ color: '#38BDF8', fontSize: '0.8rem', marginTop: '6px', display: 'inline-block' }}>
                  + Create task on Jira Board
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myTasks.map((t) => {
                  const isRunning = Boolean(activeTimer && activeTimer.task_id === t.id);
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: portalTheme.radii.sm,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700 }}>
                            {t.task_key}
                          </span>
                          {t.due_date && (
                            <span style={{ fontSize: '0.7rem', color: t.is_overdue ? '#EF4444' : portalTheme.colors.textMuted }}>
                              <FaCalendarAlt style={{ marginRight: '3px', fontSize: '0.65rem' }} />
                              {t.due_date}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleTimer(t)}
                        style={{
                          background: isRunning ? '#EF4444' : '#10B981',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {isRunning ? <FaStop /> : <FaPlay />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TwoColumnGrid>
      </DashboardWrapper>
    </StaffLayout>
  );
}
