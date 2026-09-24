import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlay, FaStop, FaPlus, FaTrash, FaEdit, FaCoffee, FaSignInAlt,
  FaSignOutAlt, FaCalendarAlt, FaClock, FaCheckCircle, FaExclamationCircle,
  FaTags, FaTable, FaListUl, FaUndo
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../portal/PortalTheme';
import {
  getAuthToken,
  fetchTodayShift,
  postShiftAction,
  fetchTrackerData,
  startTaskTimer,
  stopTaskTimer,
  logManualTime,
  updateTimeEntry,
  deleteTimeEntry,
  fetchProjects,
  formatSeconds,
  formatHourDecimal
} from '../../utils/timeTrackingApi';
import { fetchStaffTasks } from '../../utils/staffTasksApi';
import DatePicker from '../DatePicker';

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

const HubWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  color: ${portalTheme.colors.textPrimary};
  font-family: ${portalTheme.fonts?.body || 'inherit'};
`;

const HubHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  h1 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #fff 30%, rgba(255, 255, 255, 0.7));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    margin: 0;
    font-size: 0.88rem;
    color: ${portalTheme.colors.textSecondary};
  }
`;

const TabButtonGroup = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: ${portalTheme.radii.md};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  gap: 4px;
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: ${portalTheme.radii.sm};
  border: none;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.45)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textSecondary};
  border: 1px solid ${props => props.$active ? 'rgba(123, 31, 46, 0.8)' : 'transparent'};

  &:hover {
    color: #fff;
    background: ${props => props.$active ? 'rgba(123, 31, 46, 0.55)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

// ──────────────────────────────────────────
// SHIFT ATTENDANCE CARD
// ──────────────────────────────────────────

const ShiftCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${props => props.$onDuty ? 'rgba(16, 185, 129, 0.3)' : (props.$onBreak ? 'rgba(245, 158, 11, 0.3)' : portalTheme.colors.borderSubtle)};
  border-radius: ${portalTheme.radii.lg};
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(12px);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$onDuty ? 'linear-gradient(90deg, #10B981, #059669)' : (props.$onBreak ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'transparent')};
  }
`;

const ShiftStatusArea = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ShiftBadge = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.06)'};
  color: ${props => props.$color || '#9ca3af'};
  border: 1px solid ${props => props.$border || 'rgba(255, 255, 255, 0.1)'};
  animation: ${props => props.$pulse ? pulseGlow : 'none'} 2s infinite;
`;

const ShiftInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  .status-label {
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: ${props => props.$color || portalTheme.colors.textMuted};
  }

  .shift-timer {
    font-size: 1.6rem;
    font-weight: 800;
    font-family: monospace;
    letter-spacing: 0.04em;
    color: #fff;
  }

  .shift-notes {
    font-size: 0.8rem;
    color: ${portalTheme.colors.textSecondary};
  }
`;

const ShiftActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  background: ${props => props.$variant === 'green'
    ? 'linear-gradient(135deg, #10B981, #059669)'
    : (props.$variant === 'amber'
      ? 'linear-gradient(135deg, #F59E0B, #D97706)'
      : (props.$variant === 'red'
        ? 'linear-gradient(135deg, #EF4444, #DC2626)'
        : 'rgba(255, 255, 255, 0.08)'))};
  color: #fff;
  box-shadow: ${props => props.$variant === 'green' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : (props.$variant === 'red' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : 'none')};

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ──────────────────────────────────────────
// CLOCKIFY TASK TRACKER BAR
// ──────────────────────────────────────────

const TrackerBarCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
`;

const TrackerModeSwitch = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 10px;

  .mode-tabs {
    display: flex;
    gap: 14px;
    font-size: 0.84rem;
    font-weight: 600;

    button {
      background: none;
      border: none;
      color: ${portalTheme.colors.textMuted};
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      position: relative;
      transition: color 0.2s;

      &.active {
        color: #fff;
        &::after {
          content: '';
          position: absolute;
          bottom: -11px;
          left: 0;
          right: 0;
          height: 2px;
          background: #7B1F2E;
        }
      }

      &:hover {
        color: #fff;
      }
    }
  }

  .today-badge {
    font-size: 0.8rem;
    color: ${portalTheme.colors.textSecondary};
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const TrackerInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const DescriptionInput = styled.input`
  flex: 1;
  min-width: 240px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${portalTheme.radii.sm};
  padding: 10px 14px;
  color: #fff;
  font-size: 0.92rem;
  outline: none;
  transition: ${portalTheme.transitions.default};

  &:focus {
    border-color: rgba(123, 31, 46, 0.8);
    background: rgba(255, 255, 255, 0.07);
    box-shadow: 0 0 10px rgba(123, 31, 46, 0.25);
  }

  &::placeholder {
    color: ${portalTheme.colors.textMuted};
  }
`;

const ProjectSelect = styled.select`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${portalTheme.radii.sm};
  padding: 10px 14px;
  color: #fff;
  font-size: 0.88rem;
  outline: none;
  cursor: pointer;
  max-width: 260px;

  option {
    background: #11131a;
    color: #fff;
  }

  &:focus {
    border-color: rgba(123, 31, 46, 0.8);
  }
`;

const LiveDigitalCounter = styled.div`
  font-family: monospace;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: ${props => props.$running ? '#34D399' : '#fff'};
  min-width: 110px;
  text-align: center;
  text-shadow: ${props => props.$running ? '0 0 12px rgba(52, 211, 153, 0.4)' : 'none'};
`;

const StartStopBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 110px;
  padding: 10px 20px;
  border-radius: ${portalTheme.radii.sm};
  font-size: 0.92rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => props.$running
    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
    : 'linear-gradient(135deg, #10B981, #059669)'};
  color: #fff;
  box-shadow: ${props => props.$running
    ? '0 4px 14px rgba(239, 68, 68, 0.4)'
    : '0 4px 14px rgba(16, 185, 129, 0.4)'};

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.1);
  }
`;

const ManualFieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  align-items: center;

  label {
    font-size: 0.72rem;
    text-transform: uppercase;
    color: ${portalTheme.colors.textMuted};
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: 4px;
  }

  input {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: ${portalTheme.radii.sm};
    padding: 8px 12px;
    color: #fff;
    font-size: 0.86rem;
    outline: none;

    &:focus {
      border-color: rgba(123, 31, 46, 0.8);
    }
  }
`;

// ──────────────────────────────────────────
// ACTIVITY LOG & TIMESHEET VIEWS
// ──────────────────────────────────────────

const ContentCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .meta-badge {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 4px 12px;
    border-radius: ${portalTheme.radii.pill};
    font-size: 0.82rem;
    color: ${portalTheme.colors.textSecondary};
    font-weight: 600;
  }
`;

const EntryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const EntryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${portalTheme.radii.md};
  padding: 12px 18px;
  transition: all 0.2s ease;
  flex-wrap: wrap;
  gap: 12px;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
  }
`;

const EntryLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 240px;
`;

const ProjectTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: ${props => props.$color || '#9ca3af'};
  background: ${props => `${props.$color || '#9ca3af'}18`};
  border: 1px solid ${props => `${props.$color || '#9ca3af'}35`};
  padding: 3px 10px;
  border-radius: ${portalTheme.radii.pill};
  white-space: nowrap;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$color || '#9ca3af'};
  }
`;

const EntryDesc = styled.span`
  font-size: 0.9rem;
  color: #fff;
  font-weight: 500;
`;

const EntryRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const DurationBadge = styled.span`
  font-family: monospace;
  font-size: 0.94rem;
  font-weight: 700;
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: ${portalTheme.radii.sm};
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${portalTheme.colors.textMuted};
  cursor: pointer;
  padding: 6px;
  border-radius: ${portalTheme.radii.sm};
  transition: all 0.2s;

  &:hover {
    color: ${props => props.$danger ? '#EF4444' : '#fff'};
    background: rgba(255, 255, 255, 0.06);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  color: ${portalTheme.colors.textMuted};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  svg {
    font-size: 2.2rem;
    opacity: 0.4;
  }

  p {
    margin: 0;
    font-size: 0.92rem;
  }
`;

// ──────────────────────────────────────────
// WEEKLY TIMESHEET GRID
// ──────────────────────────────────────────

const TimesheetTableWrapper = styled.div`
  overflow-x: auto;
  border-radius: ${portalTheme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const TimesheetTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  text-align: left;

  th, td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    border-right: 1px solid rgba(255, 255, 255, 0.04);
  }

  th {
    background: rgba(255, 255, 255, 0.03);
    color: ${portalTheme.colors.textSecondary};
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
  }

  td.number-cell {
    font-family: monospace;
    font-weight: 600;
    text-align: center;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }

  tfoot td {
    background: rgba(255, 255, 255, 0.04);
    font-weight: 800;
    color: #fff;
  }
`;

export default function TimeTrackerHub({ portalArea = 'Staff', user = null }) {
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' | 'timesheet'
  const [trackerMode, setTrackerMode] = useState('timer'); // 'timer' | 'manual'
  const [loading, setLoading] = useState(true);

  // Shift state
  const [shift, setShift] = useState(null);
  const [shiftSeconds, setShiftSeconds] = useState(0);

  // Task timer state
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [entries, setEntries] = useState([]);
  const [totalTodaySeconds, setTotalTodaySeconds] = useState(0);

  // Manual entry state
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('10:30');
  const [manualHours, setManualHours] = useState('1.5');

  // Timesheet state (last 7 days)
  const [weekEntries, setWeekEntries] = useState([]);

  // Live timer interval refs
  const shiftIntervalRef = useRef(null);
  const taskIntervalRef = useRef(null);

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken(user);
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch projects & tasks
      const [projs, staffTasks] = await Promise.all([
        fetchProjects(token).catch(() => []),
        fetchStaffTasks(token).catch(() => [])
      ]);
      setProjects(projs);
      setTasks(staffTasks);
      if (projs.length > 0 && !selectedProject) {
        setSelectedProject(projs[0].id);
      }

      // Fetch today's shift
      const shiftData = await fetchTodayShift(token).catch(() => ({ shift: null }));
      if (shiftData.shift) {
        setShift(shiftData.shift);
        setShiftSeconds(shiftData.shift.current_work_seconds || shiftData.shift.total_work_seconds || 0);
      } else {
        setShift(null);
        setShiftSeconds(0);
      }

      // Fetch today's tracker entries
      const today = new Date().toISOString().slice(0, 10);
      const trackerRes = await fetchTrackerData(token, { date: today }).catch(() => ({ entries: [], activeTimer: null }));
      setEntries(trackerRes.entries || []);
      setTotalTodaySeconds(trackerRes.totalSeconds || 0);

      if (trackerRes.activeTimer) {
        setActiveTimer(trackerRes.activeTimer);
        setTimerSeconds(trackerRes.activeTimer.elapsed_seconds || 0);
        setTaskDescription(trackerRes.activeTimer.description || '');
        if (trackerRes.activeTimer.project_id) {
          setSelectedProject(trackerRes.activeTimer.project_id);
        }
        if (trackerRes.activeTimer.task_id) {
          setSelectedTask(trackerRes.activeTimer.task_id);
        }
      } else {
        setActiveTimer(null);
        setTimerSeconds(0);
      }

      // Fetch week's data for timesheet
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      const weekRes = await fetchTrackerData(token, {
        startDate: weekStart.toISOString().slice(0, 10),
        endDate: today
      }).catch(() => ({ entries: [] }));
      setWeekEntries(weekRes.entries || []);

    } catch (err) {
      console.error('Failed to load time tracker data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Interval for live Task Timer
  useEffect(() => {
    if (activeTimer) {
      taskIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (taskIntervalRef.current) clearInterval(taskIntervalRef.current);
    }
    return () => {
      if (taskIntervalRef.current) clearInterval(taskIntervalRef.current);
    };
  }, [activeTimer]);

  // Interval for Shift Timer
  useEffect(() => {
    if (shift && shift.status === 'on_duty') {
      shiftIntervalRef.current = setInterval(() => {
        setShiftSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (shiftIntervalRef.current) clearInterval(shiftIntervalRef.current);
    }
    return () => {
      if (shiftIntervalRef.current) clearInterval(shiftIntervalRef.current);
    };
  }, [shift]);

  // Shift Actions
  const handleShiftAction = async (action) => {
    try {
      const token = await getAuthToken(user);
      const res = await postShiftAction(token, action);
      toast.success(res.message || 'Shift updated');
      setShift(res.shift);
      if (action === 'clock-out') {
        setShiftSeconds(res.shift.total_work_seconds || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  // Task Timer Actions
  const handleStartTimer = async () => {
    try {
      const token = await getAuthToken(user);
      const res = await startTaskTimer(token, {
        projectId: selectedProject,
        taskId: selectedTask || null,
        description: taskDescription,
        billable: false
      });
      setActiveTimer(res.entry);
      setTimerSeconds(0);
      toast.success('Task timer started!');
    } catch (err) {
      toast.error(err.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    try {
      const token = await getAuthToken(user);
      const res = await stopTaskTimer(token, activeTimer?.id);
      toast.success(`Logged ${formatSeconds(res.entry.duration_seconds)} for this task!`);
      setActiveTimer(null);
      setTimerSeconds(0);
      setTaskDescription('');
      setSelectedTask('');
      loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Failed to stop timer');
    }
  };

  const handleLogManualTime = async () => {
    try {
      const token = await getAuthToken(user);
      const durationSecs = Math.round((parseFloat(manualHours) || 0) * 3600);
      if (durationSecs <= 0) {
        toast.error('Please enter valid hours');
        return;
      }

      await logManualTime(token, {
        projectId: selectedProject,
        taskId: selectedTask || null,
        description: taskDescription,
        date: manualDate,
        durationSeconds: durationSecs,
        billable: false
      });

      toast.success('Time entry logged!');
      setTaskDescription('');
      setSelectedTask('');
      loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Failed to log time');
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;
    try {
      const token = await getAuthToken(user);
      await deleteTimeEntry(token, id);
      toast.success('Entry removed');
      loadInitialData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete entry');
    }
  };

  // Timesheet grid calculations
  const timesheetMatrix = useMemo(() => {
    // Generate array of last 7 days YYYY-MM-DD
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const projectsMap = {};

    (weekEntries || []).forEach(e => {
      const projName = e.staff_time_projects?.name || 'General Tasks';
      const projColor = e.staff_time_projects?.color || '#378ADD';
      if (!projectsMap[projName]) {
        projectsMap[projName] = {
          name: projName,
          color: projColor,
          days: {},
          total: 0
        };
        days.forEach(d => { projectsMap[projName].days[d] = 0; });
      }
      const dur = e.duration_seconds || 0;
      if (projectsMap[projName].days[e.date] !== undefined) {
        projectsMap[projName].days[e.date] += dur;
      }
      projectsMap[projName].total += dur;
    });

    const dayTotals = {};
    days.forEach(d => {
      dayTotals[d] = (weekEntries || [])
        .filter(e => e.date === d)
        .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    });

    const grandTotal = Object.values(dayTotals).reduce((a, b) => a + b, 0);

    return { days, rows: Object.values(projectsMap), dayTotals, grandTotal };
  }, [weekEntries]);

  return (
    <HubWrapper>
      {/* ── HEADER ── */}
      <HubHeader>
        <HeaderTitleGroup>
          <h1>{portalArea} Time & Attendance Hub</h1>
          <p>Clock in for your daily shift, track real-time task durations, and view your weekly timesheet.</p>
        </HeaderTitleGroup>

        <TabButtonGroup>
          <TabButton
            $active={activeTab === 'tracker'}
            onClick={() => setActiveTab('tracker')}
          >
            <FaClock /> Time Tracker
          </TabButton>
          <TabButton
            $active={activeTab === 'timesheet'}
            onClick={() => setActiveTab('timesheet')}
          >
            <FaTable /> Weekly Timesheet
          </TabButton>
        </TabButtonGroup>
      </HubHeader>

      {/* ── DAILY SHIFT ATTENDANCE CARD ── */}
      <ShiftCard
        $onDuty={shift?.status === 'on_duty'}
        $onBreak={shift?.status === 'on_break'}
      >
        <ShiftStatusArea>
          <ShiftBadge
            $pulse={shift?.status === 'on_duty'}
            $bg={shift?.status === 'on_duty' ? 'rgba(16, 185, 129, 0.15)' : (shift?.status === 'on_break' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)')}
            $color={shift?.status === 'on_duty' ? '#10B981' : (shift?.status === 'on_break' ? '#F59E0B' : '#9ca3af')}
            $border={shift?.status === 'on_duty' ? 'rgba(16, 185, 129, 0.4)' : (shift?.status === 'on_break' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)')}
          >
            {shift?.status === 'on_duty' && <FaClock />}
            {shift?.status === 'on_break' && <FaCoffee />}
            {shift?.status === 'completed' && <FaCheckCircle />}
            {(!shift || shift?.status === 'absent') && <FaSignInAlt />}
          </ShiftBadge>

          <ShiftInfo $color={shift?.status === 'on_duty' ? '#10B981' : (shift?.status === 'on_break' ? '#F59E0B' : portalTheme.colors.textMuted)}>
            <span className="status-label">
              {shift?.status === 'on_duty' && '• Currently On Duty (Shift Active)'}
              {shift?.status === 'on_break' && '• On Lunch / Tea Break'}
              {shift?.status === 'completed' && '✓ Today\'s Shift Completed'}
              {!shift && 'Shift Attendance: Not Clocked In Yet'}
            </span>
            <span className="shift-timer">
              {formatSeconds(shiftSeconds)}
            </span>
            <span className="shift-notes">
              {shift?.clock_in && `Clocked in at ${new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              {shift?.total_break_seconds > 0 && ` • Total Break: ${Math.round(shift.total_break_seconds / 60)} mins`}
            </span>
          </ShiftInfo>
        </ShiftStatusArea>

        <ShiftActionButtons>
          {!shift && (
            <ActionBtn $variant="green" onClick={() => handleShiftAction('clock-in')}>
              <FaSignInAlt /> Clock In for Shift
            </ActionBtn>
          )}

          {shift && shift.status === 'on_duty' && (
            <>
              <ActionBtn $variant="amber" onClick={() => handleShiftAction('break-start')}>
                <FaCoffee /> Take Break
              </ActionBtn>
              <ActionBtn $variant="red" onClick={() => handleShiftAction('clock-out')}>
                <FaSignOutAlt /> Clock Out
              </ActionBtn>
            </>
          )}

          {shift && shift.status === 'on_break' && (
            <>
              <ActionBtn $variant="green" onClick={() => handleShiftAction('break-end')}>
                <FaUndo /> Resume Work
              </ActionBtn>
              <ActionBtn $variant="red" onClick={() => handleShiftAction('clock-out')}>
                <FaSignOutAlt /> Clock Out
              </ActionBtn>
            </>
          )}

          {shift && shift.status === 'completed' && (
            <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>
              ✓ Shift logged ({formatHourDecimal(shift.total_work_seconds)} hrs)
            </span>
          )}
        </ShiftActionButtons>
      </ShiftCard>

      {/* ── TRACKER VIEW OR TIMESHEET VIEW ── */}
      {activeTab === 'tracker' ? (
        <>
          {/* ── CLOCKIFY TASK TRACKER BAR ── */}
          <TrackerBarCard>
            <TrackerModeSwitch>
              <div className="mode-tabs">
                <button
                  type="button"
                  className={trackerMode === 'timer' ? 'active' : ''}
                  onClick={() => setTrackerMode('timer')}
                >
                  <FaClock /> Timer
                </button>
                <button
                  type="button"
                  className={trackerMode === 'manual' ? 'active' : ''}
                  onClick={() => setTrackerMode('manual')}
                >
                  <FaPlus /> Manual Log
                </button>
              </div>

              <div className="today-badge">
                <FaCalendarAlt /> {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </TrackerModeSwitch>

            <TrackerInputRow>
              <DescriptionInput
                type="text"
                placeholder="What are you working on?"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                disabled={Boolean(activeTimer)}
              />

              <ProjectSelect
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={Boolean(activeTimer)}
              >
                <option value="">Select Project / Activity...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.department}] {p.name}
                  </option>
                ))}
              </ProjectSelect>

              <ProjectSelect
                value={selectedTask}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTask(val);
                  const matched = tasks.find(t => t.id === val);
                  if (matched) {
                    if (!taskDescription) setTaskDescription(matched.title);
                    if (matched.project_id) setSelectedProject(matched.project_id);
                  }
                }}
                disabled={Boolean(activeTimer)}
              >
                <option value="">(Optional) Link Jira Task...</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.task_key}] {t.title}
                  </option>
                ))}
              </ProjectSelect>

              {trackerMode === 'timer' ? (
                <>
                  <LiveDigitalCounter $running={Boolean(activeTimer)}>
                    {formatSeconds(timerSeconds)}
                  </LiveDigitalCounter>

                  {activeTimer ? (
                    <StartStopBtn $running={true} onClick={handleStopTimer}>
                      <FaStop /> Stop
                    </StartStopBtn>
                  ) : (
                    <StartStopBtn $running={false} onClick={handleStartTimer}>
                      <FaPlay /> Start
                    </StartStopBtn>
                  )}
                </>
              ) : (
                <StartStopBtn $running={false} onClick={handleLogManualTime}>
                  <FaPlus /> Log Time
                </StartStopBtn>
              )}
            </TrackerInputRow>

            {trackerMode === 'manual' && (
              <ManualFieldRow>
                <div>
                  <label>Date</label>
                  <DatePicker
                    value={manualDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setManualDate(e.target.value)}
                    aria-label="Date"
                  />
                </div>
                <div>
                  <label>Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.1"
                    placeholder="e.g. 1.5"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                  />
                </div>
              </ManualFieldRow>
            )}
          </TrackerBarCard>

          {/* ── TODAY'S ACTIVITY LOG ── */}
          <ContentCard>
            <SectionHeader>
              <h2><FaListUl /> Today's Time Entries</h2>
              <div className="meta-badge">
                Today's Total: <strong>{formatSeconds(totalTodaySeconds)}</strong> ({formatHourDecimal(totalTodaySeconds)} hrs)
              </div>
            </SectionHeader>

            {entries.length === 0 ? (
              <EmptyState>
                <FaClock />
                <p>No time entries recorded for today yet.</p>
                <span style={{ fontSize: '0.82rem' }}>Start the timer above or use Manual Log to add tasks.</span>
              </EmptyState>
            ) : (
              <EntryList>
                {entries.map(entry => {
                  const proj = entry.staff_time_projects;
                  return (
                    <EntryRow key={entry.id}>
                      <EntryLeft>
                        {entry.staff_tasks && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#38BDF8',
                            background: 'rgba(56, 189, 248, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {entry.staff_tasks.task_key}
                          </span>
                        )}
                        <ProjectTag $color={proj?.color}>
                          <span className="dot" />
                          {proj?.name || 'General'}
                        </ProjectTag>
                        <EntryDesc>{entry.description || '(No description)'}</EntryDesc>
                      </EntryLeft>

                      <EntryRight>
                        <span style={{ fontSize: '0.8rem', color: portalTheme.colors.textMuted }}>
                          {entry.start_time && new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {entry.end_time && ` - ${new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                        <DurationBadge>
                          {formatSeconds(entry.duration_seconds)}
                        </DurationBadge>
                        <IconButton
                          $danger={true}
                          title="Delete entry"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <FaTrash />
                        </IconButton>
                      </EntryRight>
                    </EntryRow>
                  );
                })}
              </EntryList>
            )}
          </ContentCard>
        </>
      ) : (
        /* ── WEEKLY TIMESHEET GRID ── */
        <ContentCard>
          <SectionHeader>
            <h2><FaTable /> 7-Day Timesheet Matrix</h2>
            <div className="meta-badge">
              Weekly Total: <strong>{formatHourDecimal(timesheetMatrix.grandTotal)} hrs</strong>
            </div>
          </SectionHeader>

          {timesheetMatrix.rows.length === 0 ? (
            <EmptyState>
              <FaTable />
              <p>No timesheet records found for the past 7 days.</p>
            </EmptyState>
          ) : (
            <TimesheetTableWrapper>
              <TimesheetTable>
                <thead>
                  <tr>
                    <th>Project / Activity</th>
                    {timesheetMatrix.days.map(d => {
                      const dateObj = new Date(d);
                      return (
                        <th key={d} style={{ textAlign: 'center' }}>
                          {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}
                        </th>
                      );
                    })}
                    <th style={{ textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheetMatrix.rows.map(row => (
                    <tr key={row.name}>
                      <td>
                        <ProjectTag $color={row.color}>
                          <span className="dot" />
                          {row.name}
                        </ProjectTag>
                      </td>
                      {timesheetMatrix.days.map(d => {
                        const sec = row.days[d] || 0;
                        return (
                          <td key={d} className="number-cell" style={{ color: sec > 0 ? '#fff' : portalTheme.colors.textMuted }}>
                            {sec > 0 ? `${formatHourDecimal(sec)}h` : '-'}
                          </td>
                        );
                      })}
                      <td className="number-cell" style={{ color: '#34D399', fontWeight: 700 }}>
                        {formatHourDecimal(row.total)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Daily Total</td>
                    {timesheetMatrix.days.map(d => (
                      <td key={d} className="number-cell">
                        {timesheetMatrix.dayTotals[d] > 0 ? `${formatHourDecimal(timesheetMatrix.dayTotals[d])}h` : '-'}
                      </td>
                    ))}
                    <td className="number-cell" style={{ color: '#34D399' }}>
                      {formatHourDecimal(timesheetMatrix.grandTotal)}h
                    </td>
                  </tr>
                </tfoot>
              </TimesheetTable>
            </TimesheetTableWrapper>
          )}
        </ContentCard>
      )}
    </HubWrapper>
  );
}
