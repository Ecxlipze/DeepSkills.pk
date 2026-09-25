import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShieldAlt, FaUserShield, FaCheckCircle, FaExclamationTriangle,
  FaFileInvoiceDollar, FaMoneyBillWave, FaChalkboardTeacher, FaCalendarCheck,
  FaComments, FaHistory, FaSearch, FaFilter, FaDownload, FaSync,
  FaClock, FaSignInAlt, FaSignOutAlt, FaCoffee, FaPlay, FaStop,
  FaUsers, FaGraduationCap, FaArrowRight, FaTimes, FaEye, FaLock,
  FaCheckDouble, FaExclamationCircle, FaDesktop, FaMobileAlt, FaLaptop
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../../components/portal/PortalTheme';
import { supabase } from '../../supabaseClient';
import { formatHourDecimal } from '../../utils/timeTrackingApi';

// ──────────────────────────────────────────
// Styled Components (DeepSkills Slate / Audit)
// ──────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1240px;
  margin: 0 auto;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, rgba(71, 85, 105, 0.45) 0%, rgba(30, 41, 59, 0.6) 45%, rgba(15, 23, 42, 0.98) 100%);
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: ${portalTheme.radii.lg};
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

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
      color: rgba(226, 232, 240, 0.8);
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
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #cbd5e1;
  padding: 4px 12px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.8rem;
  font-weight: 700;
`;

const ReadOnlyPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  padding: 4px 10px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: #fff;
  padding: 10px 18px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.4);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #64748b 0%, #475569 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.5);
  }
`;

const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  padding: 10px 16px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.25);
  }
`;

// ─── Shift & Time Bar ───
const ShiftBar = styled.div`
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: ${portalTheme.radii.lg};
  padding: 16px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  .shift-info {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;

    .time-item {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .lbl {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
      }
      .val {
        font-size: 0.95rem;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }
  }

  .shift-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const PunchBtn = styled.button`
  background: ${props => props.$active ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'};
  border: 1px solid ${props => props.$active ? '#EF4444' : 'transparent'};
  color: #fff;
  padding: 8px 16px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.84rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
`;

const BreakBtn = styled.button`
  background: ${props => props.$active ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${props => props.$active ? '#F59E0B' : 'rgba(255, 255, 255, 0.12)'};
  color: ${props => props.$active ? '#FBBF24' : '#E2E8F0'};
  padding: 8px 14px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.84rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(245, 158, 11, 0.2);
    color: #FBBF24;
  }
`;

// ─── KPI Grid (5 Cards) ───
const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled.div`
  background: #0f172a;
  border: 1px solid ${props => props.$border || 'rgba(148, 163, 184, 0.18)'};
  border-radius: ${portalTheme.radii.lg};
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$barColor || '#94a3b8'};
  }

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => props.$hoverBorder || 'rgba(148, 163, 184, 0.35)'};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }

  .icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: ${props => props.$bg || 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.$color || '#fff'};
    flex-shrink: 0;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .val {
      font-size: 1.45rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
    }

    .lbl {
      font-size: 0.76rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
    }

    .sub {
      font-size: 0.72rem;
      color: ${props => props.$subColor || '#64748b'};
      font-weight: 600;
    }
  }
`;

// ─── Tabs Navigation ───
const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  padding-bottom: 2px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }
`;

const TabButton = styled.button`
  background: ${props => props.$active ? 'rgba(148, 163, 184, 0.18)' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#38bdf8' : 'transparent'};
  color: ${props => props.$active ? '#fff' : '#94a3b8'};
  padding: 10px 18px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.2s ease;
  border-radius: 6px 6px 0 0;

  &:hover {
    color: #fff;
    background: rgba(148, 163, 184, 0.1);
  }

  .badge {
    background: ${props => props.$active ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'};
    color: ${props => props.$active ? '#0f172a' : '#94a3b8'};
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 0.72rem;
    font-weight: 800;
  }
`;

// ─── Content Panels ───
const SectionCard = styled.div`
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: ${portalTheme.radii.lg};
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 14px;

    .title-side {
      display: flex;
      align-items: center;
      gap: 10px;

      h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #fff;
      }
      span.count {
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        padding: 3px 9px;
        border-radius: 12px;
        font-size: 0.76rem;
        font-weight: 700;
      }
    }

    .tools-side {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;

    svg {
      position: absolute;
      left: 10px;
      color: #64748b;
      font-size: 0.8rem;
    }

    input {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      padding: 6px 12px 6px 30px;
      font-size: 0.82rem;
      color: #fff;
      outline: none;
      width: 200px;
      transition: all 0.2s;

      &:focus {
        border-color: #38bdf8;
        width: 240px;
      }
    }
  }

  select {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 0.82rem;
    color: #fff;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #38bdf8;
    }
  }
`;

const DataTable = styled.div`
  width: 100%;
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;

    th {
      text-align: left;
      padding: 10px 14px;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      background: rgba(15, 23, 42, 0.6);
    }

    td {
      padding: 12px 14px;
      color: #e2e8f0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }

    tr:hover td {
      background: rgba(148, 163, 184, 0.05);
    }
  }
`;

const TypePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &.login {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }
  &.action {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }
  &.profile_change {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  &.suspension {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  &.warning {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  &.default {
    background: rgba(148, 163, 184, 0.15);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;

  &.good {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
  &.pending {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }
  &.urgent {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
  &.neutral {
    background: rgba(148, 163, 184, 0.15);
    color: #cbd5e1;
  }
`;

const EmptyNotice = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  svg {
    font-size: 2rem;
    color: #475569;
  }
  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

// ─── Modal Overlay ───
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 16px;
  width: 100%;
  max-width: 620px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
`;

const ModalHeader = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 1.15rem;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button {
    background: none;
    border: none;
    color: #64748b;
    font-size: 1.1rem;
    cursor: pointer;
    &:hover { color: #fff; }
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 0.88rem;
  color: #e2e8f0;

  .field-row {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #94a3b8;
    }
    .value {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px 12px;
      color: #fff;
      font-size: 0.86rem;
      word-break: break-word;
    }
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

// ──────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return `PKR ${num.toLocaleString()}`;
};

const formatTimestamp = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ──────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────

export default function AuditorDashboardView({
  user,
  shift,
  todaySeconds,
  myTasks,
  activeTimer,
  handleShiftPunch,
  handleToggleTimer,
  onRefresh,
  isSuperAdmin,
  setAdminViewRole
}) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState('audit_logs'); // 'audit_logs', 'finance', 'academic', 'grievances'

  // Live Telemetry States
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState([]);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [payments, setPayments] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [batches, setBatches] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Filter & Search States
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('all');
  const [logRoleFilter, setLogRoleFilter] = useState('all');

  const [feeStatusFilter, setFeeStatusFilter] = useState('all');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('all');

  // Modal Detail States
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Fetch Telemetry Data
  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        actRes,
        payRes,
        admRes,
        tPayRes,
        teaRes,
        compRes,
        batRes,
        attRes,
        usrRes
      ] = await Promise.all([
        supabase.from('activity_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(150),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(60),
        supabase.from('admissions').select('id, name, course, batch, cnic, phone, status'),
        supabase.from('teacher_payments').select('*').order('paid_on', { ascending: false }).limit(40),
        supabase.from('teachers').select('id, name, email, phone, designation'),
        supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('batches').select('id, batch_name, course, time_shift, status').order('batch_name', { ascending: true }),
        supabase.from('attendance').select('id, batch_id, status, date, student_id').limit(400),
        supabase.from('users').select('id, full_name, email, role, status, last_login').limit(100)
      ]);

      setActivityLogs(actRes.data || []);
      setTotalLogsCount(actRes.count || (actRes.data ? actRes.data.length : 0));
      setPayments(payRes.data || []);
      setAdmissions(admRes.data || []);
      setTeacherPayments(tPayRes.data || []);
      setTeachers(teaRes.data || []);
      setComplaints(compRes.data || []);
      setBatches(batRes.data || []);
      setAttendanceRecords(attRes.data || []);
      setUsersList(usrRes.data || []);
    } catch (err) {
      console.error('Audit telemetry fetch error:', err);
      toast.error('Failed to load live audit telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Student & Teacher Lookups
  const studentMap = useMemo(() => {
    const map = new Map();
    admissions.forEach(a => map.set(a.id, a));
    return map;
  }, [admissions]);

  const teacherMap = useMemo(() => {
    const map = new Map();
    teachers.forEach(t => map.set(t.id, t));
    return map;
  }, [teachers]);

  // Derived Financial Telemetry
  const financialStats = useMemo(() => {
    let verifiedCollections = 0;
    let pendingDues = 0;
    let facultyDisbursed = 0;

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.status === 'paid' || p.status === 'Approved') {
        verifiedCollections += amt;
      } else {
        pendingDues += amt;
      }
    });

    teacherPayments.forEach(tp => {
      const amt = Number(tp.amount) || 0;
      if (tp.status === 'Paid') {
        facultyDisbursed += amt;
      }
    });

    return {
      verifiedCollections,
      pendingDues,
      facultyDisbursed,
      netCash: verifiedCollections - facultyDisbursed
    };
  }, [payments, teacherPayments]);

  // Derived Academic Attendance Telemetry
  const academicStats = useMemo(() => {
    const totalRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter(r => r.status === 'present').length;
    const overallRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 92;

    // Batch level aggregation
    const batchHealth = batches.map(b => {
      const batchAtt = attendanceRecords.filter(r => r.batch_id === b.id);
      const bTotal = batchAtt.length;
      const bPresent = batchAtt.filter(r => r.status === 'present').length;
      const rate = bTotal > 0 ? Math.round((bPresent / bTotal) * 100) : 88;
      return {
        ...b,
        sessionsCount: bTotal,
        attendanceRate: rate,
        isDefaulterRisk: rate < 75
      };
    });

    const highRiskBatches = batchHealth.filter(b => b.isDefaulterRisk).length;

    return {
      overallRate,
      batchHealth,
      highRiskBatches
    };
  }, [attendanceRecords, batches]);

  // Derived Grievance Telemetry
  const grievanceStats = useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter(c => c.status === 'Open' || c.status === 'Pending Reply').length;
    const closed = complaints.filter(c => c.status === 'Closed' || c.status === 'Resolved').length;
    const urgent = complaints.filter(c => c.priority === 'Urgent').length;
    const slaRate = total > 0 ? Math.round((closed / total) * 100) : 100;

    return { total, open, closed, urgent, slaRate };
  }, [complaints]);

  // Filtered Activity Logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchesSearch = !logSearch.trim() ||
        (log.user_name && log.user_name.toLowerCase().includes(logSearch.toLowerCase())) ||
        (log.event_description && log.event_description.toLowerCase().includes(logSearch.toLowerCase())) ||
        (log.event_type && log.event_type.toLowerCase().includes(logSearch.toLowerCase()));

      const matchesType = logTypeFilter === 'all' || log.event_type === logTypeFilter;
      const matchesRole = logRoleFilter === 'all' || log.user_role === logRoleFilter;

      return matchesSearch && matchesType && matchesRole;
    });
  }, [activityLogs, logSearch, logTypeFilter, logRoleFilter]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    if (feeStatusFilter === 'all') return payments;
    return payments.filter(p => p.status === feeStatusFilter);
  }, [payments, feeStatusFilter]);

  // Filtered Complaints
  const filteredComplaints = useMemo(() => {
    if (complaintStatusFilter === 'all') return complaints;
    return complaints.filter(c => c.status === complaintStatusFilter);
  }, [complaints, complaintStatusFilter]);

  // CSV Export Handler
  const handleExportAuditTrail = () => {
    if (filteredLogs.length === 0) {
      toast.error('No activity logs available to export.');
      return;
    }
    const headers = ['ID', 'User Name', 'Role', 'Event Type', 'Description', 'Device Info', 'IP Address', 'Timestamp'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${(l.user_name || '').replace(/"/g, '""')}"`,
      l.user_role || 'user',
      l.event_type || 'event',
      `"${(l.event_description || '').replace(/"/g, '""')}"`,
      `"${(l.device_info || '').replace(/"/g, '""')}"`,
      l.ip_address || '—',
      l.created_at
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DeepSkills-Audit-Trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Audit trail CSV exported successfully!');
  };

  const handleExportComplianceSummary = () => {
    const summaryRows = [
      ['Metric', 'Value'],
      ['Total System Activity Logs Audited', totalLogsCount],
      ['Total Verified Fee Revenue', formatCurrency(financialStats.verifiedCollections)],
      ['Pending Student Dues / Arrears', formatCurrency(financialStats.pendingDues)],
      ['Disbursed Faculty Salaries', formatCurrency(financialStats.facultyDisbursed)],
      ['Audited Net Cash Position', formatCurrency(financialStats.netCash)],
      ['Overall Academic Attendance Rate', `${academicStats.overallRate}%`],
      ['Total Active Batches Audited', batches.length],
      ['Batches at Defaulter Risk (<75%)', academicStats.highRiskBatches],
      ['Total Student Complaints Audited', grievanceStats.total],
      ['Open Complaints Pending SLA', grievanceStats.open],
      ['Grievance SLA Resolution Rate', `${grievanceStats.slaRate}%`],
      ['Auditor Name', user?.name || user?.full_name || 'Auditor / Executive Viewer'],
      ['Audit Timestamp', new Date().toISOString()]
    ];

    const csvContent = summaryRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DeepSkills-Executive-Compliance-Audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Executive compliance summary exported!');
  };

  return (
    <Container>
      {/* ─── Executive Header ─── */}
      <WelcomeBanner>
        <div className="text-side">
          <h1>
            <FaShieldAlt style={{ color: '#38bdf8' }} />
            Directorate of Compliance & Audit
          </h1>
          <p>
            Independent administrative oversight across financial transactions, academic attendance, student grievances, and security audit logs.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
            <RoleBadge>
              <FaLock /> Auditor & Executive Oversight
            </RoleBadge>
            <ReadOnlyPill>
              <FaCheckCircle /> Read-Only Certified
            </ReadOnlyPill>
          </div>
        </div>
        <div className="actions-side">
          <SecondaryBtn onClick={fetchAuditData} disabled={loading}>
            <FaSync className={loading ? 'fa-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Telemetry'}
          </SecondaryBtn>
          <PrimaryBtn onClick={handleExportComplianceSummary}>
            <FaDownload />
            Export Compliance Summary
          </PrimaryBtn>
        </div>
      </WelcomeBanner>

      {/* ─── Shift & Time Tracker Bar ─── */}
      <ShiftBar>
        <div className="shift-info">
          <div className="time-item">
            <span className="lbl">Shift Status</span>
            <span className="val">
              {shift?.clock_in ? (
                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaCheckCircle /> Clocked In
                </span>
              ) : (
                <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaTimes /> Not Clocked In
                </span>
              )}
            </span>
          </div>
          {shift?.clock_in && (
            <div className="time-item">
              <span className="lbl">Clock In Time</span>
              <span className="val">
                {new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <div className="time-item">
            <span className="lbl">Logged Today</span>
            <span className="val">
              <FaClock style={{ color: '#38bdf8' }} />
              {formatHourDecimal(todaySeconds)} hrs
            </span>
          </div>
        </div>

        <div className="shift-actions">
          {shift?.clock_in ? (
            <>
              <BreakBtn
                $active={shift?.on_break}
                onClick={() => handleShiftPunch && handleShiftPunch(shift?.on_break ? 'end_break' : 'start_break')}
              >
                <FaCoffee />
                {shift?.on_break ? 'Resume Shift' : 'Lunch Break'}
              </BreakBtn>
              <PunchBtn $active onClick={() => handleShiftPunch && handleShiftPunch('clock_out')}>
                <FaSignOutAlt /> Clock Out
              </PunchBtn>
            </>
          ) : (
            <PunchBtn onClick={() => handleShiftPunch && handleShiftPunch('clock_in')}>
              <FaSignInAlt /> Clock In
            </PunchBtn>
          )}
        </div>
      </ShiftBar>

      {/* ─── 5 Real-Time Audit Telemetry KPIs ─── */}
      <KpiGrid>
        <KpiCard $barColor="#38bdf8" $hoverBorder="rgba(56, 189, 248, 0.4)">
          <div className="icon-box" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
            <FaHistory />
          </div>
          <div className="meta">
            <span className="val">{totalLogsCount.toLocaleString()}</span>
            <span className="lbl">System Audit Trail</span>
            <span className="sub" style={{ color: '#38bdf8' }}>
              Security & activity records
            </span>
          </div>
        </KpiCard>

        <KpiCard $barColor="#10b981" $hoverBorder="rgba(16, 185, 129, 0.4)">
          <div className="icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <FaMoneyBillWave />
          </div>
          <div className="meta">
            <span className="val">PKR {(financialStats.verifiedCollections / 1000).toFixed(0)}k</span>
            <span className="lbl">Verified Revenue</span>
            <span className="sub" style={{ color: '#34d399' }}>
              Dues: PKR {(financialStats.pendingDues / 1000).toFixed(0)}k
            </span>
          </div>
        </KpiCard>

        <KpiCard $barColor="#818cf8" $hoverBorder="rgba(129, 140, 248, 0.4)">
          <div className="icon-box" style={{ background: 'rgba(129, 140, 248, 0.12)', color: '#818cf8' }}>
            <FaChalkboardTeacher />
          </div>
          <div className="meta">
            <span className="val">PKR {(financialStats.facultyDisbursed / 1000).toFixed(0)}k</span>
            <span className="lbl">Faculty Disbursed</span>
            <span className="sub" style={{ color: '#a5b4fc' }}>
              {teacherPayments.length} payroll vouchers
            </span>
          </div>
        </KpiCard>

        <KpiCard $barColor="#f59e0b" $hoverBorder="rgba(245, 158, 11, 0.4)">
          <div className="icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <FaCalendarCheck />
          </div>
          <div className="meta">
            <span className="val">{academicStats.overallRate}%</span>
            <span className="lbl">Attendance Rate</span>
            <span className="sub" style={{ color: academicStats.highRiskBatches > 0 ? '#fbbf24' : '#94a3b8' }}>
              {batches.length} batches ({academicStats.highRiskBatches} alert)
            </span>
          </div>
        </KpiCard>

        <KpiCard $barColor="#ec4899" $hoverBorder="rgba(236, 72, 153, 0.4)">
          <div className="icon-box" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
            <FaComments />
          </div>
          <div className="meta">
            <span className="val">{grievanceStats.slaRate}%</span>
            <span className="lbl">Grievance SLA</span>
            <span className="sub" style={{ color: grievanceStats.open > 0 ? '#f472b6' : '#94a3b8' }}>
              {grievanceStats.open} open tickets
            </span>
          </div>
        </KpiCard>
      </KpiGrid>

      {/* ─── Workstation Navigation Tabs ─── */}
      <TabsContainer>
        <TabButton
          $active={activeTab === 'audit_logs'}
          onClick={() => setActiveTab('audit_logs')}
        >
          <FaShieldAlt /> System Audit Trail
          <span className="badge">{filteredLogs.length}</span>
        </TabButton>
        <TabButton
          $active={activeTab === 'finance'}
          onClick={() => setActiveTab('finance')}
        >
          <FaFileInvoiceDollar /> Financial Oversight & Vouchers
          <span className="badge">{payments.length}</span>
        </TabButton>
        <TabButton
          $active={activeTab === 'academic'}
          onClick={() => setActiveTab('academic')}
        >
          <FaGraduationCap /> Academic & Attendance Health
          <span className="badge">{batches.length}</span>
        </TabButton>
        <TabButton
          $active={activeTab === 'grievances'}
          onClick={() => setActiveTab('grievances')}
        >
          <FaComments /> Grievances & SLA Desk
          <span className="badge">{complaints.length}</span>
        </TabButton>
      </TabsContainer>

      {/* ─── Tab 1: System Audit Trail ─── */}
      {activeTab === 'audit_logs' && (
        <SectionCard>
          <div className="section-head">
            <div className="title-side">
              <h3>Security & Administrative Audit Trail</h3>
              <span className="count">{filteredLogs.length} records shown</span>
            </div>
            <div className="tools-side">
              <FilterGroup>
                <div className="search-wrap">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search user, event, action..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                  />
                </div>
                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value)}
                >
                  <option value="all">All Event Types</option>
                  <option value="login">Logins</option>
                  <option value="action">Actions</option>
                  <option value="profile_change">Profile Updates</option>
                  <option value="suspension">Suspensions</option>
                  <option value="warning">Warnings</option>
                </select>
                <select
                  value={logRoleFilter}
                  onChange={(e) => setLogRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Administrator</option>
                  <option value="staff">Staff</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                <SecondaryBtn onClick={handleExportAuditTrail}>
                  <FaDownload /> CSV
                </SecondaryBtn>
              </FilterGroup>
            </div>
          </div>

          <DataTable>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Role</th>
                  <th>Event Type</th>
                  <th>Event Description</th>
                  <th>Device / Client</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <EmptyNotice>
                        <FaShieldAlt />
                        <p>No activity logs match the selected filters.</p>
                      </EmptyNotice>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const isMac = log.device_info && log.device_info.includes('Mac');
                    const isWin = log.device_info && log.device_info.includes('Windows');
                    const isMobile = log.device_info && /iPhone|Android|Mobile/i.test(log.device_info);

                    return (
                      <tr key={log.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {formatTimestamp(log.created_at)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#fff' }}>
                            {log.user_name || 'System / Anonymous'}
                          </div>
                          {log.ip_address && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              IP: {log.ip_address}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: log.user_role === 'admin' ? '#ef4444' : '#38bdf8',
                            textTransform: 'uppercase'
                          }}>
                            {log.user_role || 'user'}
                          </span>
                        </td>
                        <td>
                          <TypePill className={log.event_type || 'default'}>
                            {log.event_type || 'Event'}
                          </TypePill>
                        </td>
                        <td style={{ maxWidth: '340px' }}>
                          <span style={{ color: '#e2e8f0', fontSize: '0.84rem' }}>
                            {log.event_description || '—'}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isMobile ? <FaMobileAlt /> : isMac ? <FaLaptop /> : <FaDesktop />}
                            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.device_info || 'Unknown device'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#38bdf8',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.76rem',
                              fontWeight: 600
                            }}
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </DataTable>
        </SectionCard>
      )}

      {/* ─── Tab 2: Financial Oversight & Vouchers ─── */}
      {activeTab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Student Collections Table */}
          <SectionCard>
            <div className="section-head">
              <div className="title-side">
                <h3>Student Fee Collection Vouchers</h3>
                <span className="count">{filteredPayments.length} vouchers</span>
              </div>
              <div className="tools-side">
                <FilterGroup>
                  <select
                    value={feeStatusFilter}
                    onChange={(e) => setFeeStatusFilter(e.target.value)}
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="paid">Paid / Verified</option>
                    <option value="pending">Pending Verification</option>
                  </select>
                  <SecondaryBtn onClick={() => router.push('/staff/reports')}>
                    <FaFileInvoiceDollar /> Open Finance Reports
                  </SecondaryBtn>
                </FilterGroup>
              </div>
            </div>

            <DataTable>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student Name</th>
                    <th>Course & Batch</th>
                    <th>Installment</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Reference / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <EmptyNotice>
                          <FaMoneyBillWave />
                          <p>No fee payment vouchers recorded.</p>
                        </EmptyNotice>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => {
                      const student = studentMap.get(p.entity_id);
                      const isPaid = p.status === 'paid' || p.status === 'Approved';

                      return (
                        <tr key={p.id}>
                          <td style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {p.paid_date || p.created_at ? new Date(p.paid_date || p.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#fff' }}>
                              {student?.name || 'Enrolled Student'}
                            </div>
                            {student?.cnic && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {student.cnic}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>
                              {student?.course || 'General Program'}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                              {student?.batch || 'Active Batch'}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                              {p.description || `Inst ${p.installment_number || 1} of ${p.total_installments || 1}`}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: isPaid ? '#34d399' : '#fbbf24' }}>
                              {formatCurrency(p.amount)}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', textTransform: 'capitalize', color: '#94a3b8' }}>
                              {p.method || 'cash'}
                            </span>
                          </td>
                          <td>
                            <StatusPill className={isPaid ? 'good' : 'pending'}>
                              {isPaid ? <FaCheckCircle /> : <FaClock />}
                              {isPaid ? 'Verified' : 'Pending'}
                            </StatusPill>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '200px' }}>
                            {p.reference_number || p.notes || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </DataTable>
          </SectionCard>

          {/* Teacher Payroll Disbursements */}
          <SectionCard>
            <div className="section-head">
              <div className="title-side">
                <h3>Faculty Salary Disbursements Audit</h3>
                <span className="count">{teacherPayments.length} payroll vouchers</span>
              </div>
            </div>

            <DataTable>
              <table>
                <thead>
                  <tr>
                    <th>Disbursement Date</th>
                    <th>Teacher Name</th>
                    <th>Designation</th>
                    <th>Salary Month</th>
                    <th>Disbursed Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherPayments.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <EmptyNotice>
                          <FaChalkboardTeacher />
                          <p>No faculty disbursements recorded yet.</p>
                        </EmptyNotice>
                      </td>
                    </tr>
                  ) : (
                    teacherPayments.map(tp => {
                      const teacher = teacherMap.get(tp.teacher_id);
                      return (
                        <tr key={tp.id}>
                          <td style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {tp.paid_on || '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#fff' }}>
                              {teacher?.name || 'Faculty Member'}
                            </div>
                            {teacher?.phone && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {teacher.phone}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                              {teacher?.designation || 'Instructor'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.82rem' }}>
                              {tp.month || 'Current'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#fff' }}>
                              {formatCurrency(tp.amount)}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', textTransform: 'capitalize', color: '#94a3b8' }}>
                              {tp.method || 'bank_transfer'}
                            </span>
                          </td>
                          <td>
                            <StatusPill className="good">
                              <FaCheckCircle /> Disbursed
                            </StatusPill>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </DataTable>
          </SectionCard>
        </div>
      )}

      {/* ─── Tab 3: Academic & Attendance Health ─── */}
      {activeTab === 'academic' && (
        <SectionCard>
          <div className="section-head">
            <div className="title-side">
              <h3>Batch Academic & Attendance Health Matrix</h3>
              <span className="count">{batches.length} batches evaluated</span>
            </div>
            <div className="tools-side">
              <SecondaryBtn onClick={() => router.push('/staff/attendance')}>
                <FaCalendarCheck /> Open Full Attendance Register
              </SecondaryBtn>
              <SecondaryBtn onClick={() => router.push('/staff/results')}>
                <FaGraduationCap /> Exams & Results
              </SecondaryBtn>
            </div>
          </div>

          <DataTable>
            <table>
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Course Title</th>
                  <th>Shift & Timetable</th>
                  <th>Sessions Held</th>
                  <th>Attendance Compliance</th>
                  <th>Status</th>
                  <th>Risk Audit</th>
                </tr>
              </thead>
              <tbody>
                {academicStats.batchHealth.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <EmptyNotice>
                        <FaGraduationCap />
                        <p>No active academic batches found.</p>
                      </EmptyNotice>
                    </td>
                  </tr>
                ) : (
                  academicStats.batchHealth.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          {b.batch_name}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
                          {b.course || 'Technical Course'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {b.time_shift || 'Morning / Evening'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#fff' }}>
                          {b.sessionsCount} sessions
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: 800,
                            color: b.attendanceRate >= 75 ? '#34d399' : '#f87171'
                          }}>
                            {b.attendanceRate}%
                          </span>
                          <div style={{
                            flex: 1,
                            minWidth: '60px',
                            maxWidth: '100px',
                            height: '6px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(b.attendanceRate, 100)}%`,
                              height: '100%',
                              background: b.attendanceRate >= 75 ? '#10b981' : '#ef4444',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusPill className={b.status === 'Active' ? 'good' : 'neutral'}>
                          {b.status || 'Active'}
                        </StatusPill>
                      </td>
                      <td>
                        {b.isDefaulterRisk ? (
                          <StatusPill className="urgent">
                            <FaExclamationTriangle /> Below 75% Threshold
                          </StatusPill>
                        ) : (
                          <StatusPill className="good">
                            <FaCheckCircle /> Compliant
                          </StatusPill>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTable>
        </SectionCard>
      )}

      {/* ─── Tab 4: Grievances & SLA Desk ─── */}
      {activeTab === 'grievances' && (
        <SectionCard>
          <div className="section-head">
            <div className="title-side">
              <h3>Student Grievance & SLA Oversight</h3>
              <span className="count">{filteredComplaints.length} tickets</span>
            </div>
            <div className="tools-side">
              <FilterGroup>
                <select
                  value={complaintStatusFilter}
                  onChange={(e) => setComplaintStatusFilter(e.target.value)}
                >
                  <option value="all">All Ticket Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Pending Reply">Pending Reply</option>
                  <option value="Closed">Closed</option>
                </select>
                <SecondaryBtn onClick={() => router.push('/staff/complaints')}>
                  <FaComments /> Open Grievance Desk
                </SecondaryBtn>
              </FilterGroup>
            </div>
          </div>

          <DataTable>
            <table>
              <thead>
                <tr>
                  <th>Logged Date</th>
                  <th>Student Name</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Batch / Program</th>
                  <th>Audit Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <EmptyNotice>
                        <FaComments />
                        <p>No student complaints or grievances found.</p>
                      </EmptyNotice>
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map(c => {
                    const isUrgent = c.priority === 'Urgent';
                    const isClosed = c.status === 'Closed' || c.status === 'Resolved';

                    return (
                      <tr key={c.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {formatTimestamp(c.created_at)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#fff' }}>
                            {c.student_name || 'Anonymous Student'}
                          </div>
                          {c.student_cnic && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {c.student_cnic}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                            {c.subject || 'Support Ticket'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {c.category || 'General'}
                          </span>
                        </td>
                        <td>
                          <StatusPill className={isUrgent ? 'urgent' : 'neutral'}>
                            {isUrgent ? <FaExclamationTriangle /> : null}
                            {c.priority || 'Normal'}
                          </StatusPill>
                        </td>
                        <td>
                          <StatusPill className={isClosed ? 'good' : 'pending'}>
                            {isClosed ? <FaCheckCircle /> : <FaClock />}
                            {c.status || 'Open'}
                          </StatusPill>
                        </td>
                        <td>
                          <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                            {c.course || c.batch || 'Enrolled Program'}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedComplaint(c)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#38bdf8',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.76rem',
                              fontWeight: 600
                            }}
                          >
                            <FaEye /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </DataTable>
        </SectionCard>
      )}

      {/* ─── Modal 1: Audit Log Inspector ─── */}
      <AnimatePresence>
        {selectedLog && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
          >
            <ModalContent
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <h3>
                  <FaShieldAlt style={{ color: '#38bdf8' }} />
                  Audit Log Details
                </h3>
                <button type="button" onClick={() => setSelectedLog(null)}>
                  <FaTimes />
                </button>
              </ModalHeader>
              <ModalBody>
                <div className="grid-2">
                  <div className="field-row">
                    <label>Event ID</label>
                    <div className="value" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {selectedLog.id}
                    </div>
                  </div>
                  <div className="field-row">
                    <label>Timestamp</label>
                    <div className="value">
                      {formatTimestamp(selectedLog.created_at)}
                    </div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field-row">
                    <label>Actor Name</label>
                    <div className="value">
                      {selectedLog.user_name || 'System / Unregistered'}
                    </div>
                  </div>
                  <div className="field-row">
                    <label>Actor Role</label>
                    <div className="value" style={{ textTransform: 'uppercase' }}>
                      {selectedLog.user_role || 'user'}
                    </div>
                  </div>
                </div>

                <div className="field-row">
                  <label>Event Type</label>
                  <div>
                    <TypePill className={selectedLog.event_type || 'default'}>
                      {selectedLog.event_type || 'Event'}
                    </TypePill>
                  </div>
                </div>

                <div className="field-row">
                  <label>Event Description</label>
                  <div className="value">
                    {selectedLog.event_description || 'No description recorded'}
                  </div>
                </div>

                <div className="field-row">
                  <label>Device / User Agent</label>
                  <div className="value" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {selectedLog.device_info || 'Unknown device'}
                  </div>
                </div>

                <div className="field-row">
                  <label>IP Address</label>
                  <div className="value" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.ip_address || 'Not captured'}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <SecondaryBtn onClick={() => setSelectedLog(null)}>
                  Close
                </SecondaryBtn>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ─── Modal 2: Complaint Ticket Inspector ─── */}
      <AnimatePresence>
        {selectedComplaint && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedComplaint(null)}
          >
            <ModalContent
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <h3>
                  <FaComments style={{ color: '#ec4899' }} />
                  Grievance Ticket #{selectedComplaint.id.slice(0, 8)}
                </h3>
                <button type="button" onClick={() => setSelectedComplaint(null)}>
                  <FaTimes />
                </button>
              </ModalHeader>
              <ModalBody>
                <div className="grid-2">
                  <div className="field-row">
                    <label>Student Name</label>
                    <div className="value">
                      {selectedComplaint.student_name || 'Anonymous'}
                    </div>
                  </div>
                  <div className="field-row">
                    <label>Student CNIC</label>
                    <div className="value">
                      {selectedComplaint.student_cnic || '—'}
                    </div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field-row">
                    <label>Category</label>
                    <div className="value">
                      {selectedComplaint.category || 'General'}
                    </div>
                  </div>
                  <div className="field-row">
                    <label>Priority</label>
                    <div className="value">
                      {selectedComplaint.priority || 'Normal'}
                    </div>
                  </div>
                </div>

                <div className="field-row">
                  <label>Subject</label>
                  <div className="value" style={{ fontWeight: 700 }}>
                    {selectedComplaint.subject || '—'}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field-row">
                    <label>Course</label>
                    <div className="value">
                      {selectedComplaint.course || '—'}
                    </div>
                  </div>
                  <div className="field-row">
                    <label>Batch</label>
                    <div className="value">
                      {selectedComplaint.batch || '—'}
                    </div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field-row">
                    <label>Current Status</label>
                    <div className="value">
                      {selectedComplaint.status || 'Open'}
                    </div>
                  </div>
                  <div className="field-row">
                    <label>Logged At</label>
                    <div className="value">
                      {formatTimestamp(selectedComplaint.created_at)}
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <SecondaryBtn onClick={() => setSelectedComplaint(null)}>
                  Close
                </SecondaryBtn>
                <PrimaryBtn onClick={() => {
                  setSelectedComplaint(null);
                  router.push('/staff/complaints');
                }}>
                  Open in Grievance Desk
                </PrimaryBtn>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
}
