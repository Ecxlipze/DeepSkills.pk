import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaGraduationCap, FaCalendarCheck, FaTasks, FaAward,
  FaBullhorn, FaComments, FaClock, FaSearch, FaFilter,
  FaPlus, FaArrowRight, FaSignInAlt, FaSignOutAlt, FaCoffee,
  FaPlay, FaStop, FaWhatsapp, FaPhoneAlt, FaEye, FaTimes,
  FaCheckCircle, FaExclamationTriangle, FaUsers, FaBook,
  FaSun, FaCloudSun, FaMoon, FaChartBar, FaFileAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../../components/portal/PortalTheme';
import { supabase } from '../../supabaseClient';
import { formatHourDecimal } from '../../utils/timeTrackingApi';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1240px;
  margin: 0 auto;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, rgba(55, 138, 221, 0.28) 0%, rgba(30, 58, 138, 0.2) 45%, rgba(20, 24, 33, 0.95) 100%);
  border: 1px solid rgba(55, 138, 221, 0.4);
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
  background: rgba(55, 138, 221, 0.18);
  border: 1px solid rgba(55, 138, 221, 0.45);
  color: #93c5fd;
  padding: 4px 12px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.8rem;
  font-weight: 700;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #378ADD, #2563EB);
  border: 1px solid rgba(55, 138, 221, 0.6);
  color: #fff;
  padding: 10px 18px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.4);
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
      background: rgba(55, 138, 221, 0.12);
      border: 1px solid rgba(55, 138, 221, 0.3);
      color: #93c5fd;
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
    background: ${props => props.$color || '#378ADD'};
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
      background: ${props => `${props.$color || '#378ADD'}18`};
      color: ${props => props.$color || '#378ADD'};
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
      background: ${props => `${props.$color || '#378ADD'}22`};
      color: ${props => props.$color || '#378ADD'};
      border: 1px solid ${props => `${props.$color || '#378ADD'}44`};
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
        background: rgba(55, 138, 221, 0.2);
        color: #93c5fd;
        border: 1px solid rgba(55, 138, 221, 0.4);
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
  border-bottom: 2px solid ${props => props.$active ? '#378ADD' : 'transparent'};
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textMuted};
  font-size: 0.86rem;
  font-weight: ${props => props.$active ? '700' : '600'};
  padding: 14px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  .count-pill {
    background: ${props => props.$active ? 'rgba(55, 138, 221, 0.3)' : 'rgba(255, 255, 255, 0.08)'};
    color: ${props => props.$active ? '#93c5fd' : '#94a3b8'};
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

const BatchCard = styled.div`
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
    border-color: rgba(55, 138, 221, 0.3);
    transform: translateX(2px);
  }

  .batch-main {
    display: flex;
    align-items: center;
    gap: 14px;

    .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(55, 138, 221, 0.25) 0%, rgba(30, 58, 138, 0.35) 100%);
      border: 1px solid rgba(55, 138, 221, 0.4);
      color: #93c5fd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
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

        .shift-tag {
          font-size: 0.7rem;
          padding: 1px 7px;
          border-radius: 4px;
          font-weight: 700;
          background: rgba(55, 138, 221, 0.15);
          color: #93c5fd;
          border: 1px solid rgba(55, 138, 221, 0.3);
        }
      }

      .sub-info {
        display: flex;
        align-items: center;
        gap: 12px;
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

  .batch-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
`;

const AttendanceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${portalTheme.radii.md};
  margin-bottom: 8px;

  .student-col {
    display: flex;
    align-items: center;
    gap: 10px;

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #93c5fd;
      font-size: 0.8rem;
    }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .name {
        font-size: 0.85rem;
        font-weight: 700;
        color: #fff;
      }
      .batch {
        font-size: 0.72rem;
        color: ${portalTheme.colors.textMuted};
      }
    }
  }

  .status-badge {
    padding: 3px 9px;
    border-radius: ${portalTheme.radii.pill};
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: capitalize;

    &.present {
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    &.late {
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    &.absent {
      background: rgba(239, 68, 68, 0.15);
      color: #F87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    &.excused {
      background: rgba(139, 92, 246, 0.15);
      color: #c4b5fd;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
  }
`;

const ShiftTimetableBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: ${portalTheme.radii.md};
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$border || 'rgba(255, 255, 255, 0.06)'};
  margin-bottom: 10px;

  .shift-top {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .shift-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
    }

    .shift-hours {
      font-size: 0.75rem;
      color: ${portalTheme.colors.textMuted};
      font-weight: 600;
    }
  }

  .shift-batches-count {
    font-size: 0.78rem;
    color: ${portalTheme.colors.textSecondary};
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
    background: rgba(55, 138, 221, 0.18);
    border-color: rgba(55, 138, 221, 0.4);
    color: #93c5fd;
    &:hover { background: rgba(55, 138, 221, 0.3); }
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
  border: 1px solid rgba(55, 138, 221, 0.4);
  border-radius: ${portalTheme.radii.lg};
  width: 100%;
  max-width: 580px;
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
        border-color: #378ADD;
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

export default function AcademicDashboardView({
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
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [resultsList, setResultsList] = useState([]);
  const [tasksCount, setTasksCount] = useState(0);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('batches');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  // Modal
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({
    course: '',
    batch_name: '',
    time_shift: 'Morning (9:00 AM - 12:00 PM)',
    start_date: new Date().toISOString().slice(0, 10),
    capacity: 30,
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, batchesRes, attRes, resRes, tasksRes] = await Promise.all([
        supabase.from('courses').select('*').order('title', { ascending: true }),
        supabase.from('batches').select('*').order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').order('date', { ascending: false }).limit(20),
        supabase.from('results').select('*').order('computed_at', { ascending: false }).limit(20),
        supabase.from('tasks').select('id', { count: 'exact' })
      ]);

      setCourses(coursesRes.data || []);
      setBatches(batchesRes.data || []);
      setAttendanceRecords(attRes.data || []);
      setResultsList(resRes.data || []);
      setTasksCount(tasksRes.count || 0);
    } catch (err) {
      console.error('Error loading academic dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Core Metrics
  const stats = useMemo(() => {
    const activeBatches = batches.filter(b => (b.status || 'Active').toLowerCase() === 'active').length;

    // Overall attendance rate calculation
    const totalAttendance = attendanceRecords.length;
    const presents = attendanceRecords.filter(a => ['present', 'late'].includes((a.status || '').toLowerCase())).length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presents / totalAttendance) * 100) : 92;

    // Pass rate calculation
    const totalResults = resultsList.length;
    const passes = resultsList.filter(r => r.passed).length;
    const passRate = totalResults > 0 ? Math.round((passes / totalResults) * 100) : 85;

    // Shifts
    const morningCount = batches.filter(b => (b.time_shift || '').toLowerCase().includes('morning')).length;
    const afternoonCount = batches.filter(b => (b.time_shift || '').toLowerCase().includes('afternoon')).length;
    const eveningCount = batches.filter(b => (b.time_shift || '').toLowerCase().includes('evening')).length;

    return {
      activeBatches,
      attendanceRate,
      passRate,
      tasksCount,
      shifts: {
        morning: morningCount,
        afternoon: afternoonCount,
        evening: eveningCount
      }
    };
  }, [batches, attendanceRecords, resultsList, tasksCount]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return batches.filter(b => {
      const matchSearch = !q ||
        (b.batch_name || '').toLowerCase().includes(q) ||
        (b.course || '').toLowerCase().includes(q);
      const matchCourse = courseFilter === 'all' || (b.course || '') === courseFilter;
      return matchSearch && matchCourse;
    });
  }, [batches, searchQuery, courseFilter]);

  // Handle Create Batch
  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.course || !batchForm.batch_name) {
      return toast.error('Please enter course and batch name.');
    }
    try {
      setSubmittingBatch(true);
      const { error } = await supabase.from('batches').insert([{
        course: batchForm.course,
        batch_name: batchForm.batch_name,
        time_shift: batchForm.time_shift,
        start_date: batchForm.start_date,
        capacity: Number(batchForm.capacity || 30),
        status: 'Active',
        notes: batchForm.notes || null
      }]);

      if (error) throw error;
      toast.success(`Batch "${batchForm.batch_name}" scheduled successfully`);
      setIsAddBatchOpen(false);
      setBatchForm({
        course: '',
        batch_name: '',
        time_shift: 'Morning (9:00 AM - 12:00 PM)',
        start_date: new Date().toISOString().slice(0, 10),
        capacity: 30,
        notes: ''
      });
      loadData();
    } catch (err) {
      toast.error('Failed to create batch: ' + (err.message || ''));
    } finally {
      setSubmittingBatch(false);
    }
  };

  return (
    <Container>
      {/* 1. WELCOME BANNER */}
      <WelcomeBanner>
        <div className="text-side">
          <RoleBadge>📋 Academic Coordinator Workstation</RoleBadge>
          <h1>Welcome back, {user?.name || user?.full_name || 'Academic Lead'} 👋</h1>
          <p>Class schedules, cohort timetables, student attendance oversight, homework, and exam grading.</p>
        </div>
        <div className="actions-side">
          <PrimaryBtn onClick={() => setIsAddBatchOpen(true)}>
            <FaPlus /> New Batch
          </PrimaryBtn>
          <SecondaryBtn onClick={() => navigate('/staff/attendance')}>
            <FaCalendarCheck /> Attendance
          </SecondaryBtn>
          <SecondaryBtn onClick={() => navigate('/staff/academic/tasks')}>
            <FaTasks /> Tasks & Homework
          </SecondaryBtn>
          <SecondaryBtn onClick={() => navigate('/staff/results')}>
            <FaAward /> Exams & Results
          </SecondaryBtn>
        </div>
      </WelcomeBanner>

      {/* 2. SHIFT ATTENDANCE BAR */}
      <ShiftPunchBar>
        <div className="shift-status-group">
          <div className="icon-badge">
            <FaClock />
          </div>
          <div className="meta">
            <div className="title">
              {shift?.clock_in ? (
                shift.status === 'on_break' ? (
                  <span style={{ color: '#FBBF24' }}>🟡 Currently on Break</span>
                ) : (
                  <span style={{ color: '#34D399' }}>🟢 Clocked In & Active</span>
                )
              ) : (
                <span style={{ color: '#94a3b8' }}>⚪ Shift Not Started</span>
              )}
            </div>
            <div className="subtitle">
              Daily Logged: <strong>{formatHourDecimal(todaySeconds)} hrs</strong>
              {shift?.clock_in && ` • In: ${new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
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

      {/* 3. EXECUTIVE ACADEMIC KPIS */}
      <MetricsGrid>
        <MetricCard $color="#378ADD">
          <div className="top-row">
            <span className="label">Active Batches</span>
            <div className="icon-wrap"><FaGraduationCap /></div>
          </div>
          <div className="value">{stats.activeBatches}</div>
          <div className="bottom-row">
            <span>Running cohorts</span>
            <span className="badge">All Shifts</span>
          </div>
        </MetricCard>

        <MetricCard $color="#10B981">
          <div className="top-row">
            <span className="label">Attendance Rate</span>
            <div className="icon-wrap"><FaCalendarCheck /></div>
          </div>
          <div className="value">{stats.attendanceRate}%</div>
          <div className="bottom-row">
            <span>Verified student presence</span>
            <span className="badge">Good Standing</span>
          </div>
        </MetricCard>

        <MetricCard $color="#F59E0B">
          <div className="top-row">
            <span className="label">Class Shifts Running</span>
            <div className="icon-wrap"><FaClock /></div>
          </div>
          <div className="value">3 Daily</div>
          <div className="bottom-row">
            <span>Morning • Afternoon • Evening</span>
            <span className="badge">Active</span>
          </div>
        </MetricCard>

        <MetricCard $color="#8B5CF6">
          <div className="top-row">
            <span className="label">Course Tracks</span>
            <div className="icon-wrap"><FaBook /></div>
          </div>
          <div className="value">{courses.length}</div>
          <div className="bottom-row">
            <span>Published programs</span>
            <span className="badge">Curriculum</span>
          </div>
        </MetricCard>

        <MetricCard $color="#38BDF8">
          <div className="top-row">
            <span className="label">Batch Pass Rate</span>
            <div className="icon-wrap"><FaAward /></div>
          </div>
          <div className="value">{stats.passRate}%</div>
          <div className="bottom-row">
            <span>Midterm & Final assessments</span>
            <span className="badge">Grading</span>
          </div>
        </MetricCard>
      </MetricsGrid>

      {/* 4. MAIN CONTENT WORKSTATION GRID */}
      <ContentLayout>
        {/* Left Column: Batches & Timetables / Attendance / Exams */}
        <CardPanel>
          <TabNav>
            <TabButton
              $active={activeTab === 'batches'}
              onClick={() => setActiveTab('batches')}
            >
              <FaGraduationCap /> Active Batches & Timetables
              <span className="count-pill">{filteredBatches.length}</span>
            </TabButton>
            <TabButton
              $active={activeTab === 'attendance'}
              onClick={() => setActiveTab('attendance')}
            >
              <FaCalendarCheck /> Attendance Oversight
              <span className="count-pill">{attendanceRecords.length}</span>
            </TabButton>
            <TabButton
              $active={activeTab === 'exams'}
              onClick={() => setActiveTab('exams')}
            >
              <FaAward /> Exams & Standing
              <span className="count-pill">{resultsList.length}</span>
            </TabButton>
          </TabNav>

          <div className="panel-header">
            <div className="title-group">
              <h3>
                {activeTab === 'batches' && 'Cohort Timetable & Pacing'}
                {activeTab === 'attendance' && 'Live Student Attendance Stream'}
                {activeTab === 'exams' && 'Assessment & Examination Ledger'}
              </h3>
            </div>
            <div className="tools">
              <SearchInputWrap>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search batch or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchInputWrap>
              {activeTab === 'batches' && (
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
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
                  <option value="all">All Tracks</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.title}>{c.title}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="panel-body">
            {activeTab === 'batches' && (
              <>
                {filteredBatches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <FaGraduationCap style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px' }} />
                    <p>No batches found matching the search criteria.</p>
                  </div>
                ) : (
                  filteredBatches.slice(0, 10).map((b) => (
                    <BatchCard key={b.id}>
                      <div className="batch-main">
                        <div className="icon-box">
                          <FaGraduationCap />
                        </div>
                        <div className="info">
                          <div className="name-row">
                            <span className="name">{b.batch_name}</span>
                            <span className="shift-tag">{b.time_shift || 'Class Shift'}</span>
                          </div>
                          <div className="sub-info">
                            <span><FaBook /> {b.course}</span>
                            <span><FaClock /> Start: {b.start_date || 'May 2026'}</span>
                            {b.capacity && <span><FaUsers /> Cap: {b.capacity}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="batch-actions">
                        <MiniBtn
                          className="primary"
                          onClick={() => navigate('/staff/attendance')}
                          title="Open Class Attendance"
                        >
                          <FaCalendarCheck /> Attendance
                        </MiniBtn>
                        <MiniBtn
                          className="primary"
                          onClick={() => navigate('/staff/results')}
                          title="View Exam Results"
                        >
                          <FaAward /> Grades
                        </MiniBtn>
                      </div>
                    </BatchCard>
                  ))
                )}
                {filteredBatches.length > 10 && (
                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <MiniBtn className="primary" onClick={() => navigate('/staff/courses')}>
                      View All {filteredBatches.length} Batches <FaArrowRight />
                    </MiniBtn>
                  </div>
                )}
              </>
            )}

            {activeTab === 'attendance' && (
              <>
                {attendanceRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <FaCalendarCheck style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px' }} />
                    <p>No attendance records logged recently.</p>
                  </div>
                ) : (
                  attendanceRecords.map((att) => {
                    const initials = (att.student_name || 'Student').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
                    const statusClass = (att.status || 'present').toLowerCase();

                    return (
                      <AttendanceRow key={att.id}>
                        <div className="student-col">
                          <div className="avatar">{initials}</div>
                          <div className="meta">
                            <span className="name">{att.student_name}</span>
                            <span className="batch">{att.batch_name} • {att.date}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`status-badge ${statusClass}`}>
                            {att.status || 'Present'}
                          </span>
                          <MiniBtn className="primary" onClick={() => navigate('/staff/attendance')}>
                            Verify
                          </MiniBtn>
                        </div>
                      </AttendanceRow>
                    );
                  })
                )}
              </>
            )}

            {activeTab === 'exams' && (
              <>
                {resultsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <FaAward style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px' }} />
                    <p>No examination results computed yet.</p>
                  </div>
                ) : (
                  resultsList.map((res) => (
                    <AttendanceRow key={res.id}>
                      <div className="student-col">
                        <div className="avatar" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                          {res.grade || 'A'}
                        </div>
                        <div className="meta">
                          <span className="name">Exam: {res.exam_type?.toUpperCase() || 'ASSESSMENT'}</span>
                          <span className="batch">Marks: {res.total_marks || 0} • Status: {res.passed ? 'Passed' : 'Needs Review'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`status-badge ${res.passed ? 'present' : 'absent'}`}>
                          Grade {res.grade || 'F'}
                        </span>
                        <MiniBtn className="primary" onClick={() => navigate('/staff/results')}>
                          View Marks
                        </MiniBtn>
                      </div>
                    </AttendanceRow>
                  ))
                )}
              </>
            )}
          </div>
        </CardPanel>

        {/* Right Column: Shift Schedule & Quick Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Daily Shift Timetables */}
          <CardPanel>
            <div className="panel-header">
              <div className="title-group">
                <h3>Daily Cohort Shifts</h3>
              </div>
            </div>
            <div className="panel-body">
              <ShiftTimetableBlock $bg="rgba(245, 158, 11, 0.05)" $border="rgba(245, 158, 11, 0.25)">
                <div className="shift-top">
                  <span className="shift-name" style={{ color: '#FBBF24' }}>
                    <FaSun /> Morning Shift
                  </span>
                  <span className="shift-hours">9:00 AM - 12:00 PM</span>
                </div>
                <div className="shift-batches-count">
                  {stats.shifts.morning} Active Batches • Primary Cohorts
                </div>
              </ShiftTimetableBlock>

              <ShiftTimetableBlock $bg="rgba(56, 189, 248, 0.05)" $border="rgba(56, 189, 248, 0.25)">
                <div className="shift-top">
                  <span className="shift-name" style={{ color: '#38bdf8' }}>
                    <FaCloudSun /> Afternoon Shift
                  </span>
                  <span className="shift-hours">2:00 PM - 5:00 PM</span>
                </div>
                <div className="shift-batches-count">
                  {stats.shifts.afternoon} Active Batches • Skill Labs
                </div>
              </ShiftTimetableBlock>

              <ShiftTimetableBlock $bg="rgba(139, 92, 246, 0.05)" $border="rgba(139, 92, 246, 0.25)">
                <div className="shift-top">
                  <span className="shift-name" style={{ color: '#c4b5fd' }}>
                    <FaMoon /> Evening Shift
                  </span>
                  <span className="shift-hours">6:00 PM - 9:00 PM</span>
                </div>
                <div className="shift-batches-count">
                  {stats.shifts.evening} Active Batches • Professional Cohorts
                </div>
              </ShiftTimetableBlock>
            </div>
          </CardPanel>

          {/* Academic Operations Shortcuts */}
          <CardPanel>
            <div className="panel-header">
              <div className="title-group">
                <h3>Academic Operations</h3>
              </div>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(55, 138, 221, 0.08)',
                  border: '1px solid rgba(55, 138, 221, 0.25)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/staff/courses')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaGraduationCap style={{ color: '#93c5fd' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Courses & Batches</span>
                </div>
                <FaArrowRight style={{ color: '#378ADD', fontSize: '0.8rem' }} />
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
                onClick={() => navigate('/staff/attendance')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaCalendarCheck style={{ color: '#34d399' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Attendance Geofencing</span>
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
                onClick={() => navigate('/staff/academic/tasks')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaTasks style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Tasks & Homework</span>
                </div>
                <FaArrowRight style={{ color: '#fbbf24', fontSize: '0.8rem' }} />
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
                onClick={() => navigate('/staff/results')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaAward style={{ color: '#38bdf8' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Exams & Results</span>
                </div>
                <FaArrowRight style={{ color: '#38bdf8', fontSize: '0.8rem' }} />
              </div>

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
                onClick={() => navigate('/staff/academic/reports')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaChartBar style={{ color: '#c4b5fd' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#fff' }}>Academic Reports</span>
                </div>
                <FaArrowRight style={{ color: '#8B5CF6', fontSize: '0.8rem' }} />
              </div>
            </div>
          </CardPanel>
        </div>
      </ContentLayout>

      {/* 5. MODAL: QUICK ADD BATCH */}
      {isAddBatchOpen && (
        <ModalOverlay onClick={() => setIsAddBatchOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2><FaPlus /> Schedule New Cohort Batch</h2>
              <button type="button" onClick={() => setIsAddBatchOpen(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSaveBatch}>
              <div className="form-row">
                <label>Course Track *</label>
                <select
                  required
                  value={batchForm.course}
                  onChange={(e) => {
                    const selectedCourse = e.target.value;
                    setBatchForm({
                      ...batchForm,
                      course: selectedCourse,
                      batch_name: selectedCourse ? `${selectedCourse} - ${batchForm.time_shift.split(' ')[0]} Batch` : ''
                    });
                  }}
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.title}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full Stack (Laravel) - Morning Batch"
                  value={batchForm.batch_name}
                  onChange={(e) => setBatchForm({ ...batchForm, batch_name: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Class Shift / Timing *</label>
                  <select
                    value={batchForm.time_shift}
                    onChange={(e) => setBatchForm({ ...batchForm, time_shift: e.target.value })}
                  >
                    <option value="Morning (9:00 AM - 12:00 PM)">Morning (9:00 AM - 12:00 PM)</option>
                    <option value="Afternoon (2:00 PM - 5:00 PM)">Afternoon (2:00 PM - 5:00 PM)</option>
                    <option value="Evening (6:00 PM - 9:00 PM)">Evening (6:00 PM - 9:00 PM)</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Classroom Capacity</label>
                  <input
                    type="number"
                    value={batchForm.capacity}
                    onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Start Date</label>
                <input
                  type="date"
                  value={batchForm.start_date}
                  onChange={(e) => setBatchForm({ ...batchForm, start_date: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label>Pacing & Timetable Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Lab 2 reserved, lab equipment checked"
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <SecondaryBtn type="button" onClick={() => setIsAddBatchOpen(false)}>
                  Cancel
                </SecondaryBtn>
                <PrimaryBtn type="submit" disabled={submittingBatch}>
                  {submittingBatch ? 'Saving...' : 'Create Batch'}
                </PrimaryBtn>
              </div>
            </form>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
}
