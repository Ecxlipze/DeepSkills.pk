import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserTie, FaUsers, FaUserPlus, FaFileAlt, FaSignature,
  FaFolder, FaCalendarCheck, FaClock, FaCheckCircle, FaTimesCircle,
  FaExclamationTriangle, FaWhatsapp, FaPhoneAlt, FaSearch, FaFilter,
  FaPlus, FaArrowRight, FaSignInAlt, FaSignOutAlt, FaCoffee,
  FaPlay, FaStop, FaTasks, FaDownload, FaEye, FaTimes, FaEnvelope,
  FaIdCard, FaChalkboardTeacher, FaBriefcase, FaCalendarAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../../components/portal/PortalTheme';
import { supabase } from '../../supabaseClient';
import { formatHourDecimal } from '../../utils/timeTrackingApi';
import {
  fetchAdminHRApplications,
  fetchTeacherLeaves,
  recordTeacherLeave,
  reviewTeacherLeave
} from '../../utils/hrApi';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1240px;
  margin: 0 auto;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.28) 0%, rgba(109, 40, 217, 0.18) 45%, rgba(20, 24, 33, 0.95) 100%);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: ${portalTheme.radii.lg};
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);

  .text-side {
    display: flex;
    flex-direction: column;
    gap: 6px;

    h1 {
      font-size: 1.65rem;
      font-weight: 800;
      margin: 0;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    p {
      margin: 0;
      font-size: 0.92rem;
      color: rgba(255, 255, 255, 0.75);
    }
  }

  .actions-side {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(139, 92, 246, 0.18);
  border: 1px solid rgba(139, 92, 246, 0.45);
  color: #c4b5fd;
  padding: 4px 12px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.8rem;
  font-weight: 700;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #8B5CF6, #7C3AED);
  border: 1px solid rgba(139, 92, 246, 0.6);
  color: #fff;
  padding: 10px 18px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(139, 92, 246, 0.4);
  }
`;

const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  padding: 10px 16px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
  }
`;

const ShiftPunchBar = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 16px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;

  .shift-status-group {
    display: flex;
    align-items: center;
    gap: 14px;

    .icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.3);
      color: #a78bfa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .title {
        font-size: 0.88rem;
        font-weight: 700;
        color: #fff;
      }

      .subtitle {
        font-size: 0.78rem;
        color: ${portalTheme.colors.textMuted};
      }
    }
  }

  .punch-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const PunchBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: ${portalTheme.radii.sm};
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  &.clock-in {
    background: #10B981;
    color: #fff;
    &:hover { background: #059669; }
  }

  &.clock-out {
    background: #EF4444;
    color: #fff;
    &:hover { background: #DC2626; }
  }

  &.break {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #FBBF24;
    &:hover { background: rgba(245, 158, 11, 0.25); }
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const MetricCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${props => props.$alert ? 'rgba(239, 68, 68, 0.4)' : portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.$color || '#8B5CF6'};
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .label {
      font-size: 0.82rem;
      font-weight: 600;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .icon-wrap {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: ${props => `${props.$color || '#8B5CF6'}18`};
      color: ${props => props.$color || '#8B5CF6'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }
  }

  .value {
    font-size: 1.85rem;
    font-weight: 800;
    color: #fff;
    line-height: 1;
  }

  .bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.78rem;
    color: ${portalTheme.colors.textSecondary};

    .badge {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: ${portalTheme.radii.pill};
      font-weight: 700;
      background: ${props => `${props.$color || '#8B5CF6'}22`};
      color: ${props => props.$color || '#8B5CF6'};
      border: 1px solid ${props => `${props.$color || '#8B5CF6'}44`};
    }
  }
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const CardPanel = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .panel-header {
    padding: 18px 22px;
    border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .title-group {
      display: flex;
      align-items: center;
      gap: 10px;

      h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #fff;
      }

      .badge-counter {
        background: rgba(139, 92, 246, 0.2);
        color: #c4b5fd;
        border: 1px solid rgba(139, 92, 246, 0.4);
        padding: 2px 8px;
        border-radius: ${portalTheme.radii.pill};
        font-size: 0.75rem;
        font-weight: 800;
      }
    }

    .tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .panel-body {
    padding: 16px 20px;
    overflow-y: auto;
  }
`;

const TabNav = styled.div`
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  padding: 0 16px;
  gap: 8px;
  overflow-x: auto;
`;

const TabButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#8B5CF6' : 'transparent'};
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textMuted};
  font-size: 0.86rem;
  font-weight: ${props => props.$active ? '700' : '600'};
  padding: 14px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  .count-pill {
    background: ${props => props.$active ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)'};
    color: ${props => props.$active ? '#c4b5fd' : '#94a3b8'};
    padding: 2px 7px;
    border-radius: ${portalTheme.radii.pill};
    font-size: 0.72rem;
  }

  &:hover {
    color: #fff;
  }
`;

const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.md};
  padding: 7px 12px;
  width: 240px;

  svg {
    color: ${portalTheme.colors.textMuted};
    font-size: 0.85rem;
  }

  input {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 0.82rem;
    width: 100%;
    outline: none;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }
`;

const ApplicantItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${portalTheme.radii.md};
  margin-bottom: 10px;
  gap: 14px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateX(2px);
  }

  .applicant-main {
    display: flex;
    align-items: center;
    gap: 14px;

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(109, 40, 217, 0.35) 100%);
      border: 1px solid rgba(139, 92, 246, 0.4);
      color: #c4b5fd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .name-row {
        display: flex;
        align-items: center;
        gap: 8px;

        .name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #fff;
        }

        .type-tag {
          font-size: 0.7rem;
          padding: 1px 7px;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
          background: rgba(139, 92, 246, 0.15);
          color: #c4b5fd;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
      }

      .sub-info {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.78rem;
        color: ${portalTheme.colors.textMuted};

        span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
  }

  .applicant-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
`;

const StatusChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.72rem;
  font-weight: 700;

  &.pending {
    background: rgba(245, 158, 11, 0.15);
    color: #FBBF24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  &.documents_submitted {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }
  &.signed {
    background: rgba(139, 92, 246, 0.18);
    color: #c4b5fd;
    border: 1px solid rgba(139, 92, 246, 0.4);
  }
  &.hired {
    background: rgba(16, 185, 129, 0.15);
    color: #34D399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  &.rejected {
    background: rgba(239, 68, 68, 0.15);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const ActionIconBtn = styled.a`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${portalTheme.colors.textSecondary};
  cursor: pointer;
  text-decoration: none;
  font-size: 0.88rem;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    transform: translateY(-1px);
  }

  &.whatsapp:hover {
    background: rgba(37, 211, 102, 0.2);
    border-color: #25D366;
    color: #25D366;
  }

  &.call:hover {
    background: rgba(56, 189, 248, 0.2);
    border-color: #38BDF8;
    color: #38BDF8;
  }
`;

const MiniBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;

  &.primary {
    background: rgba(139, 92, 246, 0.18);
    border-color: rgba(139, 92, 246, 0.4);
    color: #c4b5fd;
    &:hover { background: rgba(139, 92, 246, 0.3); }
  }

  &.approve {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.35);
    color: #34d399;
    &:hover { background: rgba(16, 185, 129, 0.25); }
  }

  &.reject {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.35);
    color: #f87171;
    &:hover { background: rgba(239, 68, 68, 0.25); }
  }
`;

const ShiftRosterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;

  .member-col {
    display: flex;
    align-items: center;
    gap: 10px;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${props => props.$active ? '#10B981' : '#94a3b8'};
    }

    .name {
      font-size: 0.84rem;
      font-weight: 700;
      color: #fff;
    }

    .time {
      font-size: 0.72rem;
      color: ${portalTheme.colors.textMuted};
    }
  }

  .status-col {
    font-size: 0.74rem;
    font-weight: 700;
    color: ${props => props.$active ? '#34D399' : '#94a3b8'};
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalBox = styled.div`
  background: #141721;
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: ${portalTheme.radii.lg};
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
    padding-bottom: 14px;

    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    button {
      background: transparent;
      border: none;
      color: ${portalTheme.colors.textMuted};
      font-size: 1.1rem;
      cursor: pointer;
      &:hover { color: #fff; }
    }
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;

    label {
      font-size: 0.8rem;
      font-weight: 700;
      color: ${portalTheme.colors.textSecondary};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    input, select, textarea {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid ${portalTheme.colors.borderSubtle};
      border-radius: ${portalTheme.radii.md};
      padding: 10px 14px;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #8B5CF6;
      }
    }
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid ${portalTheme.colors.borderSubtle};
    padding-top: 16px;
  }
`;

export default function HRDashboardView({
  user,
  shift,
  todaySeconds,
  myTasks,
  activeTimer,
  handleShiftPunch,
  handleToggleTimer,
  onRefresh
}) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [hrApplications, setHrApplications] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  // Active Tab
  const [activeTab, setActiveTab] = useState('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [isRecordLeaveOpen, setIsRecordLeaveOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Quick Faculty Form
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    cnic: '',
    phone: '',
    email: '',
    specialization: 'Full Stack Web',
    teaching_mode: 'Onsite',
    monthlySalary: '',
    notes: ''
  });

  // Quick Leave Form
  const [leaveForm, setLeaveForm] = useState({
    teacherId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    leaveType: 'Casual',
    reason: '',
    substituteTeacherId: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().slice(0, 10);

      const [
        teachersRes,
        hrAppsRes,
        jobAppsRes,
        leavesRes,
        shiftsRes,
        usersRes
      ] = await Promise.all([
        supabase.from('teachers').select('*').order('name', { ascending: true }),
        fetchAdminHRApplications().catch(() => []),
        supabase.from('job_applications').select('*').order('created_at', { ascending: false }),
        fetchTeacherLeaves().catch(() => []),
        supabase.from('staff_shifts').select('*').eq('date', todayStr).order('clock_in', { ascending: false }),
        supabase.from('users').select('id, full_name, email, role, custom_roles(name)')
      ]);

      setTeachers(teachersRes.data || []);
      setHrApplications(hrAppsRes || []);
      setJobApplications(jobAppsRes.data || []);
      setLeaves(leavesRes || []);
      setTodayShifts(shiftsRes.data || []);

      const uMap = {};
      (usersRes.data || []).forEach(u => {
        uMap[u.id] = u;
      });
      setUsersMap(uMap);
    } catch (err) {
      console.error('Error loading HR dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Core Metrics
  const stats = useMemo(() => {
    const activeFaculty = teachers.filter(t => (t.status || 'Active').toLowerCase() === 'active').length;
    const totalApps = hrApplications.length + jobApplications.length;
    const pendingReview = hrApplications.filter(a => a.profile?.hr_status === 'pending').length +
      jobApplications.filter(j => (j.status || 'pending').toLowerCase() === 'pending').length;
    const signedReady = hrApplications.filter(a => a.profile?.hr_status === 'signed' || a.signature).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const onLeaveToday = leaves.filter(l =>
      l.status === 'Approved' &&
      l.start_date <= todayStr &&
      l.end_date >= todayStr
    ).length;

    const onDutyToday = todayShifts.length;

    return {
      activeFaculty,
      totalApps,
      pendingReview,
      signedReady,
      onLeaveToday,
      onDutyToday
    };
  }, [teachers, hrApplications, jobApplications, leaves, todayShifts]);

  // Combined and filtered applicant list
  const filteredApplicants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // Map hrApplications to normalized view
    const listA = hrApplications.map(app => ({
      id: app.profile?.id || app.teacher?.id,
      name: app.candidate?.name || app.profile?.full_name || 'Candidate',
      email: app.candidate?.email || app.profile?.personal_email || '',
      phone: app.candidate?.phone || app.profile?.personal_phone || '',
      specialization: app.profile?.specialization || app.candidate?.specialization || 'General',
      status: app.profile?.hr_status || 'pending',
      step: app.profile?.current_step || 1,
      source: 'Internal HR',
      resumeUrl: app.documents?.find(d => d.document_type === 'resume')?.file_url || null,
      created_at: app.profile?.created_at
    }));

    // Map public job_applications
    const listB = jobApplications.map(job => ({
      id: job.id,
      name: job.full_name || 'Applicant',
      email: job.email || '',
      phone: job.phone || '',
      specialization: 'Public Applicant',
      status: job.status || 'pending',
      step: 1,
      source: 'Careers Portal',
      resumeUrl: job.resume_url || null,
      created_at: job.created_at
    }));

    const combined = [...listA, ...listB];

    return combined.filter(item => {
      const matchSearch = !q ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.specialization.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [hrApplications, jobApplications, searchQuery, statusFilter]);

  // Handle Quick Add Faculty
  const handleSaveFaculty = async (e) => {
    e.preventDefault();
    if (!facultyForm.name || !facultyForm.phone) {
      return toast.error('Name and Phone are mandatory.');
    }
    try {
      setSubmittingAction(true);
      const { data: newTeacher, error: tErr } = await supabase
        .from('teachers')
        .insert([{
          name: facultyForm.name,
          cnic: facultyForm.cnic || null,
          phone: facultyForm.phone,
          email: facultyForm.email || null,
          specialization: facultyForm.specialization,
          status: 'Active',
          notes: facultyForm.notes || null,
          added_on: new Date().toISOString().slice(0, 10)
        }])
        .select()
        .single();

      if (tErr) throw tErr;

      // Create matching hr_profile record
      await supabase.from('hr_profiles').insert([{
        teacher_id: newTeacher.id,
        full_name: facultyForm.name,
        cnic: facultyForm.cnic || null,
        personal_phone: facultyForm.phone,
        personal_email: facultyForm.email || null,
        specialization: facultyForm.specialization,
        expected_salary: facultyForm.monthlySalary ? Number(facultyForm.monthlySalary) : null,
        teaching_mode: facultyForm.teaching_mode,
        current_step: 1,
        hr_status: 'pending'
      }]);

      toast.success(`Faculty profile created for ${facultyForm.name}`);
      setIsAddFacultyOpen(false);
      setFacultyForm({
        name: '',
        cnic: '',
        phone: '',
        email: '',
        specialization: 'Full Stack Web',
        teaching_mode: 'Onsite',
        monthlySalary: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      toast.error('Failed to create faculty: ' + (err.message || ''));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Quick Record Leave
  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.teacherId || !leaveForm.startDate || !leaveForm.endDate) {
      return toast.error('Please select teacher and date range.');
    }
    try {
      setSubmittingAction(true);
      await recordTeacherLeave({
        teacherId: leaveForm.teacherId,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        leaveType: leaveForm.leaveType,
        reason: leaveForm.reason || 'Leave requested',
        substituteTeacherId: leaveForm.substituteTeacherId || null,
        status: 'Approved'
      });
      toast.success('Faculty leave record logged successfully');
      setIsRecordLeaveOpen(false);
      setLeaveForm({
        teacherId: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        leaveType: 'Casual',
        reason: '',
        substituteTeacherId: ''
      });
      loadData();
    } catch (err) {
      toast.error('Failed to record leave: ' + (err.message || ''));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Review Leave
  const handleReviewLeaveAction = async (leaveId, newStatus) => {
    try {
      await reviewTeacherLeave(leaveId, newStatus, 'Reviewed from HR Dashboard');
      toast.success(`Leave request ${newStatus.toLowerCase()}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update leave: ' + (err.message || ''));
    }
  };

  return (
    <Container>
      {/* 1. WELCOME BANNER */}
      <WelcomeBanner>
        <div className="text-side">
          <RoleBadge>👔 HR & Faculty Manager Workstation</RoleBadge>
          <h1>Welcome back, {user?.name || user?.full_name || 'HR Lead'} 👋</h1>
          <p>Unified faculty recruitment pipeline, onboarding contracts, credentials, and daily staff attendance.</p>
        </div>
        <div className="actions-side">
          <PrimaryBtn onClick={() => setIsAddFacultyOpen(true)}>
            <FaUserPlus /> Add Faculty
          </PrimaryBtn>
          <SecondaryBtn onClick={() => navigate('/staff/applications')}>
            <FaUsers /> Applications
          </SecondaryBtn>
          <SecondaryBtn onClick={() => navigate('/staff/signatures')}>
            <FaSignature /> Signatures
          </SecondaryBtn>
          <SecondaryBtn onClick={() => setIsRecordLeaveOpen(true)}>
            <FaCalendarCheck /> Record Leave
          </SecondaryBtn>
        </div>
      </WelcomeBanner>

      {/* 2. SHIFT PUNCH & DAILY TRACKER BAR */}
      <ShiftPunchBar>
        <div className="shift-status-group">
          <div className="icon-badge">
            <FaUserTie />
          </div>
          <div className="meta">
            <div className="title">
              {shift?.clock_in ? (
                shift.status === 'on_break' ? (
                  <span style={{ color: '#FBBF24' }}>🟡 Currently on Lunch / Break</span>
                ) : (
                  <span style={{ color: '#34D399' }}>🟢 Clocked In & Active</span>
                )
              ) : (
                <span style={{ color: '#94a3b8' }}>⚪ Shift Not Started</span>
              )}
            </div>
            <div className="subtitle">
              Daily Logged: <strong>{formatHourDecimal(todaySeconds)} hrs</strong>
              {shift?.clock_in && ` • Clocked In: ${new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </div>
          </div>
        </div>

        <div className="punch-actions">
          {!shift?.clock_in && (
            <PunchBtn className="clock-in" onClick={() => handleShiftPunch('clock_in')}>
              <FaSignInAlt /> Clock In
            </PunchBtn>
          )}

          {shift?.clock_in && !shift?.clock_out && (
            <>
              {shift.status !== 'on_break' ? (
                <PunchBtn className="break" onClick={() => handleShiftPunch('break_start')}>
                  <FaCoffee /> Take Break
                </PunchBtn>
              ) : (
                <PunchBtn className="clock-in" onClick={() => handleShiftPunch('break_end')}>
                  <FaPlay /> End Break
                </PunchBtn>
              )}
              <PunchBtn className="clock-out" onClick={() => handleShiftPunch('clock_out')}>
                <FaSignOutAlt /> Clock Out
              </PunchBtn>
            </>
          )}
        </div>
      </ShiftPunchBar>

      {/* 3. EXECUTIVE HR KPIS */}
      <MetricsGrid>
        <MetricCard $color="#8B5CF6">
          <div className="top-row">
            <span className="label">Active Faculty</span>
            <div className="icon-wrap"><FaChalkboardTeacher /></div>
          </div>
          <div className="value">{stats.activeFaculty}</div>
          <div className="bottom-row">
            <span>Onboarded instructors</span>
            <span className="badge">Active Roster</span>
          </div>
        </MetricCard>

        <MetricCard $color="#F59E0B" $alert={stats.pendingReview > 0}>
          <div className="top-row">
            <span className="label">Applications Queue</span>
            <div className="icon-wrap"><FaUsers /></div>
          </div>
          <div className="value">{stats.totalApps}</div>
          <div className="bottom-row">
            <span>{stats.pendingReview} pending review</span>
            <span className="badge">{stats.pendingReview > 0 ? 'Needs Action' : 'Clear'}</span>
          </div>
        </MetricCard>

        <MetricCard $color="#38BDF8">
          <div className="top-row">
            <span className="label">Signed JDs Ready</span>
            <div className="icon-wrap"><FaSignature /></div>
          </div>
          <div className="value">{stats.signedReady}</div>
          <div className="bottom-row">
            <span>Awaiting final activation</span>
            <span className="badge">Pipeline</span>
          </div>
        </MetricCard>

        <MetricCard $color="#10B981">
          <div className="top-row">
            <span className="label">Staff On Duty Today</span>
            <div className="icon-wrap"><FaClock /></div>
          </div>
          <div className="value">{stats.onDutyToday}</div>
          <div className="bottom-row">
            <span>Clocked-in shifts today</span>
            <span className="badge">Present</span>
          </div>
        </MetricCard>

        <MetricCard $color="#EF4444" $alert={stats.onLeaveToday > 0}>
          <div className="top-row">
            <span className="label">On Leave Today</span>
            <div className="icon-wrap"><FaCalendarCheck /></div>
          </div>
          <div className="value">{stats.onLeaveToday}</div>
          <div className="bottom-row">
            <span>Faculty absence logged</span>
            <span className="badge">{stats.onLeaveToday > 0 ? 'Coverage Needed' : 'Full Staff'}</span>
          </div>
        </MetricCard>
      </MetricsGrid>

      {/* 4. MAIN CONTENT WORKSTATION GRID */}
      <ContentLayout>
        {/* Left Column: Tabbed Pipeline & Screening */}
        <CardPanel>
          <TabNav>
            <TabButton
              $active={activeTab === 'applications'}
              onClick={() => setActiveTab('applications')}
            >
              <FaUsers /> Candidate Applications
              <span className="count-pill">{filteredApplicants.length}</span>
            </TabButton>
            <TabButton
              $active={activeTab === 'onboarding'}
              onClick={() => setActiveTab('onboarding')}
            >
              <FaSignature /> Onboarding & JDs
              <span className="count-pill">{stats.signedReady}</span>
            </TabButton>
            <TabButton
              $active={activeTab === 'leaves'}
              onClick={() => setActiveTab('leaves')}
            >
              <FaCalendarCheck /> Leave Requests
              <span className="count-pill">{leaves.filter(l => l.status === 'Pending').length}</span>
            </TabButton>
          </TabNav>

          <div className="panel-header">
            <div className="title-group">
              <h3>
                {activeTab === 'applications' && 'Applicant Screening Pipeline'}
                {activeTab === 'onboarding' && 'Candidate Onboarding & E-Signatures'}
                {activeTab === 'leaves' && 'Faculty Leaves & Coverage Schedule'}
              </h3>
            </div>
            <div className="tools">
              <SearchInputWrap>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search candidate, phone, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchInputWrap>
              {activeTab === 'applications' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="documents_submitted">Docs Submitted</option>
                  <option value="signed">Signed</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </div>
          </div>

          <div className="panel-body">
            {activeTab === 'applications' && (
              <>
                {filteredApplicants.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <FaUsers style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px' }} />
                    <p>No candidates found matching the selected filter.</p>
                  </div>
                ) : (
                  filteredApplicants.slice(0, 8).map((applicant) => {
                    const initials = applicant.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
                    const cleanPhone = (applicant.phone || '').replace(/\D/g, '');
                    const waText = encodeURIComponent(
                      `Assalam-o-Alaikum ${applicant.name},\nDeepSkills HR Department here regarding your application for the ${applicant.specialization} role.`
                    );

                    return (
                      <ApplicantItem key={applicant.id}>
                        <div className="applicant-main">
                          <div className="avatar">{initials}</div>
                          <div className="info">
                            <div className="name-row">
                              <span className="name">{applicant.name}</span>
                              <span className="type-tag">{applicant.source}</span>
                            </div>
                            <div className="sub-info">
                              <span><FaBriefcase /> {applicant.specialization}</span>
                              {applicant.phone && <span><FaPhoneAlt /> {applicant.phone}</span>}
                              {applicant.email && <span><FaEnvelope /> {applicant.email}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="applicant-actions">
                          <StatusChip className={applicant.status.toLowerCase()}>
                            {applicant.status}
                          </StatusChip>

                          {applicant.phone && (
                            <>
                              <ActionIconBtn
                                className="whatsapp"
                                href={`https://wa.me/${cleanPhone}?text=${waText}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat on WhatsApp"
                              >
                                <FaWhatsapp />
                              </ActionIconBtn>
                              <ActionIconBtn
                                className="call"
                                href={`tel:${applicant.phone}`}
                                title="Call Applicant"
                              >
                                <FaPhoneAlt />
                              </ActionIconBtn>
                            </>
                          )}

                          {applicant.resumeUrl && (
                            <ActionIconBtn
                              href={applicant.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="View Resume / CV"
                            >
                              <FaFileAlt />
                            </ActionIconBtn>
                          )}

                          <MiniBtn
                            className="primary"
                            onClick={() => navigate('/staff/applications')}
                          >
                            <FaEye /> Screen
                          </MiniBtn>
                        </div>
                      </ApplicantItem>
                    );
                  })
                )}
                {filteredApplicants.length > 8 && (
                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <MiniBtn className="primary" onClick={() => navigate('/staff/applications')}>
                      View All {filteredApplicants.length} Candidates <FaArrowRight />
                    </MiniBtn>
                  </div>
                )}
              </>
            )}

            {activeTab === 'onboarding' && (
              <>
                {hrApplications.filter(a => a.signature || a.profile?.hr_status === 'signed').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <FaSignature style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px' }} />
                    <p>No candidates currently awaiting onboarding activation.</p>
                  </div>
                ) : (
                  hrApplications
                    .filter(a => a.signature || a.profile?.hr_status === 'signed')
                    .map((app) => (
                      <ApplicantItem key={app.profile?.id}>
                        <div className="applicant-main">
                          <div className="avatar">
                            {(app.candidate?.name || app.profile?.full_name || 'C')[0]}
                          </div>
                          <div className="info">
                            <div className="name-row">
                              <span className="name">{app.candidate?.name || app.profile?.full_name}</span>
                              <span className="type-tag">Step {app.profile?.current_step || 4} of 5</span>
                            </div>
                            <div className="sub-info">
                              <span><FaBriefcase /> {app.profile?.specialization || 'Faculty'}</span>
                              <span><FaSignature /> Contract Signed</span>
                            </div>
                          </div>
                        </div>

                        <div className="applicant-actions">
                          <StatusChip className="signed">Signed</StatusChip>
                          <MiniBtn
                            className="primary"
                            onClick={() => navigate('/staff/signatures')}
                          >
                            Finalize Hiring <FaArrowRight />
                          </MiniBtn>
                        </div>
                      </ApplicantItem>
                    ))
                )}
              </>
            )}

            {activeTab === 'leaves' && (
              <>
                {leaves.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <FaCalendarCheck style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px' }} />
                    <p>No faculty leave records submitted yet.</p>
                  </div>
                ) : (
                  leaves.slice(0, 8).map((leave) => (
                    <ApplicantItem key={leave.id}>
                      <div className="applicant-main">
                        <div className="avatar">
                          {(leave.teacher?.name || 'T')[0]}
                        </div>
                        <div className="info">
                          <div className="name-row">
                            <span className="name">{leave.teacher?.name || 'Faculty Member'}</span>
                            <span className="type-tag">{leave.leave_type || 'Casual'}</span>
                          </div>
                          <div className="sub-info">
                            <span><FaCalendarAlt /> {leave.start_date} to {leave.end_date}</span>
                            {leave.reason && <span>• {leave.reason}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="applicant-actions">
                        <StatusChip className={leave.status === 'Approved' ? 'hired' : (leave.status === 'Pending' ? 'pending' : 'rejected')}>
                          {leave.status}
                        </StatusChip>

                        {leave.status === 'Pending' && (
                          <>
                            <MiniBtn
                              className="approve"
                              onClick={() => handleReviewLeaveAction(leave.id, 'Approved')}
                            >
                              Approve
                            </MiniBtn>
                            <MiniBtn
                              className="reject"
                              onClick={() => handleReviewLeaveAction(leave.id, 'Rejected')}
                            >
                              Reject
                            </MiniBtn>
                          </>
                        )}
                      </div>
                    </ApplicantItem>
                  ))
                )}
              </>
            )}
          </div>
        </CardPanel>

        {/* Right Column: Attendance Telemetry & Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Today's Staff On-Duty */}
          <CardPanel>
            <div className="panel-header">
              <div className="title-group">
                <h3>Today's Staff Clock-Ins</h3>
                <span className="badge-counter">{todayShifts.length}</span>
              </div>
            </div>
            <div className="panel-body" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {todayShifts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <FaClock style={{ fontSize: '1.5rem', opacity: 0.3, marginBottom: '8px' }} />
                  <p>No staff clocked in today yet.</p>
                </div>
              ) : (
                todayShifts.map((s) => {
                  const matchedUser = usersMap[s.user_id || s.actor_id];
                  const displayName = matchedUser?.full_name || 'Staff Member';
                  const roleTag = matchedUser?.custom_roles?.name || matchedUser?.role || 'Staff';
                  const clockInTime = s.clock_in ? new Date(s.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                  const isShiftActive = s.status === 'active' || (!s.clock_out && s.status !== 'completed');

                  return (
                    <ShiftRosterRow key={s.id} $active={isShiftActive}>
                      <div className="member-col">
                        <div className="dot" />
                        <div>
                          <div className="name">{displayName}</div>
                          <div className="time">{roleTag} • In: {clockInTime}</div>
                        </div>
                      </div>
                      <div className="status-col">
                        {isShiftActive ? (s.status === 'on_break' ? 'On Break' : 'On Shift') : 'Finished'}
                      </div>
                    </ShiftRosterRow>
                  );
                })
              )}
            </div>
          </CardPanel>

          {/* HR Operations Shortcuts */}
          <CardPanel>
            <div className="panel-header">
              <div className="title-group">
                <h3>HR Module Shortcuts</h3>
              </div>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/staff/jds')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaFileAlt style={{ color: '#c4b5fd' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>JD Template Library</span>
                </div>
                <FaArrowRight style={{ color: '#8B5CF6', fontSize: '0.8rem' }} />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/staff/signatures')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaSignature style={{ color: '#38bdf8' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Candidate Signatures</span>
                </div>
                <FaArrowRight style={{ color: '#38bdf8', fontSize: '0.8rem' }} />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/staff/files')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaFolder style={{ color: '#34d399' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Hiring Files & Dossiers</span>
                </div>
                <FaArrowRight style={{ color: '#10b981', fontSize: '0.8rem' }} />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/staff/teachers')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaChalkboardTeacher style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Faculty Directory</span>
                </div>
                <FaArrowRight style={{ color: '#fbbf24', fontSize: '0.8rem' }} />
              </div>
            </div>
          </CardPanel>
        </div>
      </ContentLayout>

      {/* 5. MODAL: QUICK ADD FACULTY */}
      {isAddFacultyOpen && (
        <ModalOverlay onClick={() => setIsAddFacultyOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2><FaUserPlus /> Add / Invite Faculty Member</h2>
              <button type="button" onClick={() => setIsAddFacultyOpen(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSaveFaculty}>
              <div className="form-grid-2">
                <div className="form-row">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asfand Yar"
                    value={facultyForm.name}
                    onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>CNIC Number</label>
                  <input
                    type="text"
                    placeholder="35201-XXXXXXX-X"
                    value={facultyForm.cnic}
                    onChange={(e) => setFacultyForm({ ...facultyForm, cnic: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="03XXXXXXXXX"
                    value={facultyForm.phone}
                    onChange={(e) => setFacultyForm({ ...facultyForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="faculty@example.com"
                    value={facultyForm.email}
                    onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Specialization / Track</label>
                  <input
                    type="text"
                    placeholder="e.g. UI/UX Design, MERN Stack"
                    value={facultyForm.specialization}
                    onChange={(e) => setFacultyForm({ ...facultyForm, specialization: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Teaching Mode</label>
                  <select
                    value={facultyForm.teaching_mode}
                    onChange={(e) => setFacultyForm({ ...facultyForm, teaching_mode: e.target.value })}
                  >
                    <option value="Onsite">Onsite</option>
                    <option value="Online">Online</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label>Expected / Honorarium (PKR / Month)</label>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  value={facultyForm.monthlySalary}
                  onChange={(e) => setFacultyForm({ ...facultyForm, monthlySalary: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>Administrative Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Interview cleared for Morning Batch instructor"
                  value={facultyForm.notes}
                  onChange={(e) => setFacultyForm({ ...facultyForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <SecondaryBtn type="button" onClick={() => setIsAddFacultyOpen(false)}>
                  Cancel
                </SecondaryBtn>
                <PrimaryBtn type="submit" disabled={submittingAction}>
                  {submittingAction ? 'Saving...' : 'Add Faculty Member'}
                </PrimaryBtn>
              </div>
            </form>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* 6. MODAL: QUICK RECORD LEAVE */}
      {isRecordLeaveOpen && (
        <ModalOverlay onClick={() => setIsRecordLeaveOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2><FaCalendarCheck /> Record Faculty Leave</h2>
              <button type="button" onClick={() => setIsRecordLeaveOpen(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSaveLeave}>
              <div className="form-row">
                <label>Faculty Member *</label>
                <select
                  required
                  value={leaveForm.teacherId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, teacherId: e.target.value })}
                >
                  <option value="">-- Select Instructor --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialization || 'Instructor'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Leave Type</label>
                  <select
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  >
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Annual">Annual Leave</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Substitute Teacher (Optional)</label>
                  <select
                    value={leaveForm.substituteTeacherId}
                    onChange={(e) => setLeaveForm({ ...leaveForm, substituteTeacherId: e.target.value })}
                  >
                    <option value="">-- None Assigned --</option>
                    {teachers
                      .filter(t => t.id !== leaveForm.teacherId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label>Reason / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Medical emergency, batch coverage arranged"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <SecondaryBtn type="button" onClick={() => setIsRecordLeaveOpen(false)}>
                  Cancel
                </SecondaryBtn>
                <PrimaryBtn type="submit" disabled={submittingAction}>
                  {submittingAction ? 'Recording...' : 'Save Leave Record'}
                </PrimaryBtn>
              </div>
            </form>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
}
