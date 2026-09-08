import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  FaCalendarCheck, FaCalendarAlt, FaDownload, FaFilePdf, FaSearch,
  FaEdit, FaLock, FaUnlock, FaCog, FaCheckCircle, FaTimesCircle,
  FaClock, FaExclamationTriangle, FaUndo, FaWhatsapp, FaBell,
  FaUserGraduate, FaQrcode, FaCamera, FaBarcode, FaArrowRight,
  FaTimes, FaSave, FaExclamationCircle, FaChartLine
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { createAttendanceRegisterPdf } from '../utils/attendancePdf';
import { Skeleton, SkeletonCard } from '../components/Skeleton';

// ─── Styled Components ───

const Container = styled.div`
  padding: 16px 0 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// Sub-Module Navigation Ribbon
const SubNavRibbon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 6px;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
`;

const NavChip = styled.button`
  background: ${props => props.$active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => props.$active ? '#38bdf8' : '#94a3b8'};
  border: 1px solid ${props => props.$active ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
  padding: 7px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(56, 189, 248, 0.2);
    color: #fff;
    border-color: rgba(56, 189, 248, 0.5);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 22px 26px;

  .title-area {
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
    }
  }

  .action-cluster {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const HeaderBtn = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.primary {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    color: #fff;
    &:hover { filter: brightness(1.15); transform: translateY(-1px); }
  }

  &.pdf {
    background: rgba(123, 31, 46, 0.15);
    color: #f87171;
    border-color: rgba(123, 31, 46, 0.35);
    &:hover { background: rgba(123, 31, 46, 0.3); color: #fff; transform: translateY(-1px); }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
    border-color: rgba(255, 255, 255, 0.1);
    &:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  }

  &.kiosk {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.3);
    &:hover { background: rgba(16, 185, 129, 0.25); color: #fff; transform: translateY(-1px); }
  }
`;

const TabNav = styled.div`
  display: flex;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 6px;
  gap: 6px;
  overflow-x: auto;
`;

const MainTab = styled.button`
  flex: 1;
  min-width: 170px;
  padding: 12px 18px;
  border-radius: 10px;
  border: none;
  background: ${props => props.$active ? 'rgba(56, 189, 248, 0.15)' : 'transparent'};
  color: ${props => props.$active ? '#38bdf8' : '#888'};
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: ${props => props.$active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)'};
  }
`;

const Card = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 24px;
`;

const FilterBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 22px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }

  select, input {
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9px;
    padding: 10px 12px;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #38bdf8;
    }
  }
`;

const BatchBanner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;

  .batch-meta {
    h3 {
      margin: 0 0 4px;
      font-size: 1.15rem;
      color: #fff;
    }
    p {
      margin: 0;
      font-size: 0.84rem;
      color: #94a3b8;
    }
  }

  .batch-stats {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;

    .stat-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      .val { font-size: 1.25rem; font-weight: 800; color: #fff; }
      .lbl { font-size: 0.72rem; text-transform: uppercase; color: #888; font-weight: 700; }
    }
  }
`;

const QuickBulkBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;

  .bulk-title {
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }

  .btn-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const BulkBtn = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  border: 1px solid transparent;

  &.present {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.25);
    &:hover { background: rgba(16, 185, 129, 0.22); color: #fff; }
  }

  &.late {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.25);
    &:hover { background: rgba(245, 158, 11, 0.22); color: #fff; }
  }

  &.absent {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.25);
    &:hover { background: rgba(239, 68, 68, 0.22); color: #fff; }
  }

  &.reset {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    border-color: rgba(255, 255, 255, 0.1);
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;

  th {
    padding: 13px 16px;
    background: rgba(255, 255, 255, 0.025);
    color: #94a3b8;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  td {
    padding: 13px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.015);
  }
`;

const StatusChipGroup = styled.div`
  display: inline-flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
`;

const StatusChip = styled.button`
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;

  background: ${props => {
    if (!props.$active) return 'transparent';
    if (props.$val === 'present') return '#10b981';
    if (props.$val === 'late') return '#f59e0b';
    if (props.$val === 'absent') return '#ef4444';
    if (props.$val === 'excused') return '#38bdf8';
    return '#64748b';
  }};

  color: ${props => props.$active ? '#fff' : '#64748b'};

  &:hover {
    color: #fff;
    background: ${props => props.$active ? '' : 'rgba(255, 255, 255, 0.06)'};
  }
`;

const AvatarCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.76rem;
  font-weight: 800;

  &.good { background: rgba(16, 185, 129, 0.12); color: #10b981; }
  &.warning { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
  &.critical { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
  &.info { background: rgba(56, 189, 248, 0.12); color: #38bdf8; }
  &.muted { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .label { font-size: 0.78rem; text-transform: uppercase; font-weight: 800; color: #888; }
  .val { font-size: 1.9rem; font-weight: 800; color: #fff; }
  .sub { font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 6px; }
`;

const SheetFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  .lock-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    color: #cbd5e1;
    cursor: pointer;
    input { cursor: pointer; }
  }

  .save-cluster {
    display: flex;
    gap: 10px;
  }
`;

const PulseIndicator = keyframes`
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
`;

const LiveBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.76rem;
  font-weight: 800;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    animation: ${PulseIndicator} 2s infinite ease-in-out;
  }
`;

const KioskContainer = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const QrBox = styled.div`
  background: #090a0d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;

  .qr-frame {
    background: #fff;
    padding: 16px;
    border-radius: 14px;
    box-shadow: 0 0 25px rgba(56, 189, 248, 0.15);
    img {
      width: 220px;
      height: 220px;
      display: block;
    }
  }

  .clock {
    font-family: monospace;
    font-size: 1.6rem;
    font-weight: 800;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    padding: 8px 18px;
    border-radius: 10px;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 520px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 26px;
  color: #fff;

  h3 { margin: 0 0 6px; font-size: 1.3rem; }
  p { color: #888; margin: 0 0 20px; font-size: 0.88rem; }
  textarea, select {
    width: 100%;
    background: #08090c;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: #fff;
    padding: 12px;
    margin-bottom: 16px;
    outline: none;
    font-size: 0.9rem;
  }
  textarea { min-height: 100px; resize: vertical; }
`;

function getInitials(name) {
  if (!name) return 'DS';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeCsv(val) {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ─── Main Component ───

export default function AdminAttendance() {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'attendance', 'full');

  // Main navigation tabs
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet', 'matrix', 'defaulters', 'kiosk'
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data Store
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [stats, setStats] = useState({ overallRate: 0, totalSessions: 0, atRiskCount: 0, perfectCount: 0 });
  const [sheetRecords, setSheetRecords] = useState([]);
  const [sheetLocked, setSheetLocked] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);

  // Kiosk State
  const [kioskInput, setKioskInput] = useState('');
  const [kioskHistory, setKioskHistory] = useState([]);
  const [kioskProcessing, setKioskProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const kioskInputRef = useRef(null);

  // Override Modal
  const [overrideRecord, setOverrideRecord] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('present');
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  // Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Attendance Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      let url = `/api/admin/academic/attendance?month=${selectedMonth}&date=${selectedDate}`;
      if (selectedBatchId) url += `&batch_id=${encodeURIComponent(selectedBatchId)}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          const d = json.data || {};
          setBatches(d.batches || []);
          setSessions(d.sessions || []);
          setStudents(d.students || []);
          setDefaulters(d.defaulters || []);
          setStats(d.stats || {});

          if (d.batches?.length > 0 && !selectedBatchId) {
            setSelectedBatchId(d.batches[0].id);
          }

          if (d.dailySheet) {
            setSheetRecords(d.dailySheet.students || []);
            setSheetLocked(Boolean(d.dailySheet.isLocked));
          }
          return;
        }
      }

      // Client Fallback: Direct Supabase Queries
      const { data: bList } = await supabase.from('batches').select('*').order('batch_name');
      setBatches(bList || []);
      const activeBatchId = selectedBatchId || bList?.[0]?.id;
      if (!selectedBatchId && activeBatchId) setSelectedBatchId(activeBatchId);

      const targetBatch = bList?.find(b => b.id === activeBatchId);

      const { data: sList } = await supabase
        .from('admissions')
        .select('id, name, cnic, phone, email, course, batch, photo_url')
        .in('status', ['Active', 'Graduated'])
        .eq('batch', targetBatch?.batch_name || '');

      const { data: attList } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate)
        .eq('batch_id', activeBatchId);

      const attMap = {};
      (attList || []).forEach(r => { attMap[r.student_id] = r; });

      const mappedSheet = (sList || []).map(s => {
        const rec = attMap[s.id];
        return {
          student_id: s.id,
          student_name: s.name,
          student_cnic: s.cnic,
          phone: s.phone,
          status: rec?.status || 'unmarked',
          reason: rec?.absence_reason || '',
          is_locked: Boolean(rec?.is_locked),
          history_pct: 100
        };
      });

      setSheetRecords(mappedSheet);
      setSheetLocked(attList?.length > 0 && attList.every(r => r.is_locked));
    } catch (err) {
      console.warn('Fallback attendance fetch error:', err);
      toast.error('Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedDate, selectedBatchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Active Batch Object
  const currentBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId || b.batch_name === selectedBatchId) || batches[0] || {};
  }, [batches, selectedBatchId]);

  // Daily Sheet Student Filter
  const filteredSheetRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sheetRecords;
    return sheetRecords.filter(r =>
      String(r.student_name || '').toLowerCase().includes(q) ||
      String(r.student_cnic || '').includes(q)
    );
  }, [sheetRecords, searchQuery]);

  // Compute Daily Sheet Counts
  const sheetCounts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let unmarked = 0;

    sheetRecords.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
      else unmarked++;
    });

    const markedTotal = present + late + absent + excused;
    const rate = markedTotal > 0 ? Math.round(((present + late) / markedTotal) * 100) : 0;
    return { present, late, absent, excused, unmarked, total: sheetRecords.length, rate };
  }, [sheetRecords]);

  // Bulk Sheet Actions
  const handleMarkAll = (status) => {
    setSheetRecords(prev => prev.map(r => ({ ...r, status })));
    toast.success(`Marked all as ${status.toUpperCase()}`);
  };

  const handleUpdateStudentStatus = (studentId, status) => {
    setSheetRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, status } : r));
  };

  const handleUpdateStudentReason = (studentId, reason) => {
    setSheetRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, reason } : r));
  };

  // Save Bulk Sheet
  const handleSaveBulkSheet = async (shouldLock = false) => {
    if (!canMutate) {
      toast.error('You do not have permission to modify attendance.');
      return;
    }
    if (!selectedBatchId) {
      toast.error('Please select a batch.');
      return;
    }

    setSavingSheet(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const payload = {
        action: 'save_bulk',
        batch_id: selectedBatchId,
        date: selectedDate,
        records: sheetRecords,
        is_locked: shouldLock
      };

      const res = await fetch('/api/admin/academic/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Failed to save attendance.');
      }

      toast.success(shouldLock ? 'Attendance saved & locked successfully!' : 'Attendance draft saved!');
      setSheetLocked(shouldLock);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setSavingSheet(false);
    }
  };

  // Kiosk Check-In Handler
  const handleKioskCheckin = async (e) => {
    if (e) e.preventDefault();
    const id = kioskInput.trim();
    if (!id) return;

    setKioskProcessing(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'kiosk_checkin',
          identifier: id,
          batch_id: selectedBatchId,
          date: selectedDate
        })
      });

      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Student not recognized.');
      }

      const checkin = json.data || {};
      toast.success(`${checkin.student?.name} marked ${checkin.status?.toUpperCase()}!`, {
        duration: 3000
      });

      setKioskHistory(prev => [checkin, ...prev.slice(0, 9)]);
      setKioskInput('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Check-in failed.');
    } finally {
      setKioskProcessing(false);
      kioskInputRef.current?.focus();
    }
  };

  // Toggle Session Lock
  const handleToggleLock = async (date, batchId, isLocked) => {
    if (!canMutate) {
      toast.error('You do not have permission to lock/unlock sessions.');
      return;
    }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'toggle_lock',
          date,
          batch_id: batchId,
          is_locked: isLocked
        })
      });

      if (!res.ok) throw new Error('Lock update failed.');
      toast.success(isLocked ? 'Session locked.' : 'Session unlocked.');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update lock.');
    }
  };

  // Send Low-Attendance Warning
  const handleSendWarning = async (defaulter) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'send_warning',
          student_id: defaulter.id,
          student_name: defaulter.name,
          student_cnic: defaulter.cnic,
          student_phone: defaulter.phone,
          course: defaulter.course,
          batch: defaulter.batch,
          attendance_pct: defaulter.pct,
          absent_count: defaulter.absent
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to send alert.');

      toast.success(`Warning dispatched to ${defaulter.name}`);
      if (json.whatsappUrl) {
        window.open(json.whatsappUrl, '_blank');
      }
    } catch (err) {
      toast.error(err.message || 'Warning dispatch failed.');
    }
  };

  // Single Override Save
  const handleSaveOverride = async () => {
    if (!overrideRecord || !overrideReason.trim()) {
      toast.error('Please enter an override reason.');
      return;
    }
    setSavingOverride(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'override',
          attendance_id: overrideRecord.id,
          status: overrideStatus,
          reason: overrideReason
        })
      });

      if (!res.ok) throw new Error('Failed to save override.');
      toast.success('Override recorded.');
      setOverrideRecord(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Override failed.');
    } finally {
      setSavingOverride(false);
    }
  };

  // Export PDF Register
  const handleExportPdf = async () => {
    try {
      toast.loading('Compiling Monthly Attendance Register PDF...', { id: 'att-pdf' });
      const doc = await createAttendanceRegisterPdf({
        batch: currentBatch,
        month: selectedMonth,
        students,
        sessions,
        stats,
        generatedBy: user?.name || 'Academic Directorate'
      });
      doc.save(`DeepSkills-Attendance-Register-${currentBatch.batch_name || 'All'}-${selectedMonth}.pdf`);
      toast.success('Attendance Register PDF downloaded!', { id: 'att-pdf' });
    } catch (err) {
      toast.error('Failed to generate PDF: ' + err.message, { id: 'att-pdf' });
    }
  };

  // Export CSV Register
  const handleExportCsv = () => {
    try {
      const headers = ['#', 'Student Name', 'CNIC', 'Course', 'Batch', 'Present', 'Late', 'Absent', 'Excused', 'Total Days', 'Attendance %', 'Status'];
      const rows = students.map((s, idx) => [
        idx + 1,
        s.name,
        s.cnic,
        s.course,
        s.batch,
        s.present,
        s.late,
        s.absent,
        s.excused,
        s.total,
        `${s.pct}%`,
        s.pct >= 75 ? 'Eligible' : 'Defaulter'
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${currentBatch.batch_name || 'all'}-${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Attendance CSV exported!');
    } catch (err) {
      toast.error('CSV export failed: ' + err.message);
    }
  };

  return (
    <AdminLayout>
      <Container>
        {/* Academic Sub-Module Ribbon */}
        <SubNavRibbon>
          <NavChip onClick={() => router.push('/admin/academic')}>
            <FaChartLine /> Academic Hub
          </NavChip>
          <NavChip $active onClick={() => router.push('/admin/academic/attendance')}>
            <FaCalendarCheck /> Attendance
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/tasks')}>
            Tasks & Homework
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/results')}>
            Exams & Results
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/announcements')}>
            Announcements
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/complaints')}>
            Grievances
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/chats')}>
            Group Chats
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/reports')}>
            Academic Reports
          </NavChip>
        </SubNavRibbon>

        {/* Header Bar */}
        <Header>
          <div className="title-area">
            <h1>
              <FaCalendarCheck style={{ color: '#38bdf8' }} /> Attendance Directorate
            </h1>
            <p>Batch-wide bulk daily sheets, classroom kiosk station, monthly matrix audit, and student defaulter alerts.</p>
          </div>

          <div className="action-cluster">
            <HeaderBtn
              className={activeTab === 'kiosk' ? 'primary' : 'kiosk'}
              onClick={() => setActiveTab(activeTab === 'kiosk' ? 'sheet' : 'kiosk')}
            >
              <FaQrcode /> {activeTab === 'kiosk' ? 'Exit Kiosk' : 'Kiosk Mode'}
            </HeaderBtn>
            <HeaderBtn className="pdf" onClick={handleExportPdf}>
              <FaFilePdf /> PDF Register
            </HeaderBtn>
            <HeaderBtn className="secondary" onClick={handleExportCsv}>
              <FaDownload /> CSV
            </HeaderBtn>
            <HeaderBtn className="secondary" onClick={() => router.push('/admin/academic/attendance/settings')}>
              <FaCog /> Settings
            </HeaderBtn>
          </div>
        </Header>

        {/* Main Tab Navigation */}
        <TabNav>
          <MainTab $active={activeTab === 'sheet'} onClick={() => setActiveTab('sheet')}>
            <FaEdit /> Daily Bulk Sheet
          </MainTab>
          <MainTab $active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')}>
            <FaCalendarAlt /> Monthly Register & Sessions
          </MainTab>
          <MainTab $active={activeTab === 'defaulters'} onClick={() => setActiveTab('defaulters')}>
            <FaExclamationTriangle /> Defaulters & Warnings ({defaulters.length})
          </MainTab>
          <MainTab $active={activeTab === 'kiosk'} onClick={() => setActiveTab('kiosk')}>
            <FaQrcode /> QR & Kiosk Check-In
          </MainTab>
        </TabNav>

        {/* ─── TAB 1: DAILY BULK ATTENDANCE SHEET ─── */}
        {activeTab === 'sheet' && (
          <Card>
            {/* Filter Bar */}
            <FilterBar>
              <FormGroup>
                <label>Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <label>Select Batch</label>
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name} — {b.course} ({b.time_shift || 'Shift'})
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup>
                <label>Search Student</label>
                <input
                  placeholder="Filter student name or CNIC..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </FormGroup>
            </FilterBar>

            {/* Batch Status Banner */}
            <BatchBanner>
              <div className="batch-meta">
                <h3>
                  {currentBatch.batch_name || 'Selected Cohort'}
                  {sheetLocked && (
                    <StatusBadge className="muted" style={{ marginLeft: 10 }}>
                      <FaLock size={10} /> Locked Session
                    </StatusBadge>
                  )}
                </h3>
                <p>{currentBatch.course} • Shift: {currentBatch.time_shift || currentBatch.timing_label || 'Regular'}</p>
              </div>

              <div className="batch-stats">
                <div className="stat-pill">
                  <span className="val" style={{ color: '#38bdf8' }}>{sheetCounts.total}</span>
                  <span className="lbl">Enrolled</span>
                </div>
                <div className="stat-pill">
                  <span className="val" style={{ color: '#10b981' }}>{sheetCounts.present}</span>
                  <span className="lbl">Present</span>
                </div>
                <div className="stat-pill">
                  <span className="val" style={{ color: '#f59e0b' }}>{sheetCounts.late}</span>
                  <span className="lbl">Late</span>
                </div>
                <div className="stat-pill">
                  <span className="val" style={{ color: '#ef4444' }}>{sheetCounts.absent}</span>
                  <span className="lbl">Absent</span>
                </div>
                <div className="stat-pill">
                  <span className="val" style={{ color: '#94a3b8' }}>{sheetCounts.unmarked}</span>
                  <span className="lbl">Unmarked</span>
                </div>
                <div className="stat-pill">
                  <span className="val" style={{ color: '#a855f7' }}>{sheetCounts.rate}%</span>
                  <span className="lbl">Attendance %</span>
                </div>
              </div>
            </BatchBanner>

            {/* Bulk Actions Ribbon */}
            <QuickBulkBar>
              <div className="bulk-title">Batch Mark Actions:</div>
              <div className="btn-group">
                <BulkBtn className="present" onClick={() => handleMarkAll('present')}>
                  <FaCheckCircle /> Mark All Present
                </BulkBtn>
                <BulkBtn className="late" onClick={() => handleMarkAll('late')}>
                  <FaClock /> Mark All Late
                </BulkBtn>
                <BulkBtn className="absent" onClick={() => handleMarkAll('absent')}>
                  <FaTimesCircle /> Mark All Absent
                </BulkBtn>
                <BulkBtn className="reset" onClick={() => handleMarkAll('unmarked')}>
                  <FaUndo /> Reset / Unmark All
                </BulkBtn>
              </div>
            </QuickBulkBar>

            {/* Daily Sheet Table */}
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Student Details</th>
                    <th>Attendance Standing</th>
                    <th>Mark Status</th>
                    <th>Notes / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan="5"><Skeleton height="35px" /></td>
                      </tr>
                    ))
                  ) : filteredSheetRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No enrolled students found matching the selected batch.
                      </td>
                    </tr>
                  ) : (
                    filteredSheetRecords.map((st, idx) => (
                      <tr key={st.student_id}>
                        <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <AvatarCircle>{getInitials(st.student_name)}</AvatarCircle>
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{st.student_name}</div>
                              <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {st.student_cnic}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge className={st.history_pct >= 80 ? 'good' : st.history_pct >= 75 ? 'info' : st.history_pct >= 60 ? 'warning' : 'critical'}>
                            {st.history_pct}% Overall
                          </StatusBadge>
                        </td>
                        <td>
                          <StatusChipGroup>
                            <StatusChip
                              $active={st.status === 'present'}
                              $val="present"
                              onClick={() => handleUpdateStudentStatus(st.student_id, 'present')}
                            >
                              <FaCheckCircle size={10} /> Present
                            </StatusChip>
                            <StatusChip
                              $active={st.status === 'late'}
                              $val="late"
                              onClick={() => handleUpdateStudentStatus(st.student_id, 'late')}
                            >
                              <FaClock size={10} /> Late
                            </StatusChip>
                            <StatusChip
                              $active={st.status === 'absent'}
                              $val="absent"
                              onClick={() => handleUpdateStudentStatus(st.student_id, 'absent')}
                            >
                              <FaTimesCircle size={10} /> Absent
                            </StatusChip>
                            <StatusChip
                              $active={st.status === 'excused'}
                              $val="excused"
                              onClick={() => handleUpdateStudentStatus(st.student_id, 'excused')}
                            >
                              Excused
                            </StatusChip>
                          </StatusChipGroup>
                        </td>
                        <td>
                          <input
                            style={{
                              background: '#08090c',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: 6,
                              padding: '6px 10px',
                              color: '#fff',
                              fontSize: '0.82rem',
                              width: '100%',
                              minWidth: 140
                            }}
                            placeholder="Reason if absent / late..."
                            value={st.reason || ''}
                            onChange={e => handleUpdateStudentReason(st.student_id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrap>

            {/* Footer Actions */}
            <SheetFooter>
              <label className="lock-check">
                <input
                  type="checkbox"
                  checked={sheetLocked}
                  onChange={e => setSheetLocked(e.target.checked)}
                />
                <FaLock size={12} style={{ color: sheetLocked ? '#f59e0b' : '#64748b' }} />
                Lock session after saving (prevents further modification)
              </label>

              <div className="save-cluster">
                <HeaderBtn
                  className="secondary"
                  onClick={() => handleSaveBulkSheet(false)}
                  disabled={savingSheet}
                >
                  <FaSave /> {savingSheet ? 'Saving...' : 'Save Draft'}
                </HeaderBtn>
                <HeaderBtn
                  className="primary"
                  onClick={() => handleSaveBulkSheet(sheetLocked)}
                  disabled={savingSheet}
                >
                  <FaSave /> {savingSheet ? 'Saving...' : sheetLocked ? 'Save & Lock Session' : 'Save Register'}
                </HeaderBtn>
              </div>
            </SheetFooter>
          </Card>
        )}

        {/* ─── TAB 2: MONTHLY REGISTER & SESSIONS ─── */}
        {activeTab === 'matrix' && (
          <div>
            {/* KPI Cards */}
            <StatsGrid>
              <StatCard>
                <div className="label">Monthly Average Attendance</div>
                <div className="val" style={{ color: '#10b981' }}>{stats.overallRate}%</div>
                <div className="sub"><FaChartLine style={{ color: '#10b981' }} /> Cohort Wide</div>
              </StatCard>
              <StatCard>
                <div className="label">Total Sessions Held</div>
                <div className="val">{stats.totalSessions}</div>
                <div className="sub"><FaCalendarAlt /> Conducted This Month</div>
              </StatCard>
              <StatCard>
                <div className="label">Defaulters / At-Risk</div>
                <div className="val" style={{ color: '#ef4444' }}>{stats.atRiskCount}</div>
                <div className="sub"><FaExclamationTriangle style={{ color: '#ef4444' }} /> Under 75% Threshold</div>
              </StatCard>
              <StatCard>
                <div className="label">Perfect Attendance</div>
                <div className="val" style={{ color: '#a855f7' }}>{stats.perfectCount}</div>
                <div className="sub"><FaCheckCircle style={{ color: '#a855f7' }} /> 100% Attendance Rate</div>
              </StatCard>
            </StatsGrid>

            {/* Filter Controls */}
            <FilterBar>
              <FormGroup>
                <label>Filter Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <label>Filter Batch</label>
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                >
                  <option value="">All Running Batches</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batch_name} ({b.course})</option>
                  ))}
                </select>
              </FormGroup>
            </FilterBar>

            {/* Sessions Register Table */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Conducted Session Registers</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{sessions.length} Recorded Sessions</span>
              </div>

              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Batch & Course</th>
                      <th>Present</th>
                      <th>Late</th>
                      <th>Absent</th>
                      <th>Excused</th>
                      <th>Attendance %</th>
                      <th>Lock Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No sessions recorded for {selectedMonth}.
                        </td>
                      </tr>
                    ) : (
                      sessions.map(s => (
                        <tr key={s.key}>
                          <td style={{ fontWeight: 700 }}>{s.date}</td>
                          <td style={{ color: '#94a3b8' }}>{s.day}</td>
                          <td>
                            <strong>{s.batch}</strong>
                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{s.course}</div>
                          </td>
                          <td style={{ color: '#10b981', fontWeight: 700 }}>{s.present}</td>
                          <td style={{ color: '#f59e0b', fontWeight: 700 }}>{s.late}</td>
                          <td style={{ color: '#ef4444', fontWeight: 700 }}>{s.absent}</td>
                          <td style={{ color: '#38bdf8' }}>{s.excused}</td>
                          <td>
                            <StatusBadge className={s.rate >= 80 ? 'good' : s.rate >= 75 ? 'info' : 'warning'}>
                              {s.rate}%
                            </StatusBadge>
                          </td>
                          <td>
                            <StatusBadge className={s.isLocked ? 'muted' : 'warning'}>
                              {s.isLocked ? <FaLock size={10} /> : <FaUnlock size={10} />}
                              {s.isLocked ? 'Locked' : 'Unlocked'}
                            </StatusBadge>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                style={{
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#fff',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                onClick={() => handleToggleLock(s.date, s.batchId, !s.isLocked)}
                              >
                                {s.isLocked ? <FaUnlock size={10} /> : <FaLock size={10} />}
                                {s.isLocked ? 'Unlock' : 'Lock'}
                              </button>
                              <button
                                style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#38bdf8',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                onClick={() => {
                                  setSelectedDate(s.date);
                                  setSelectedBatchId(s.batchId);
                                  setActiveTab('sheet');
                                }}
                              >
                                <FaEdit size={10} /> Open Sheet
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </TableWrap>
            </Card>
          </div>
        )}

        {/* ─── TAB 3: DEFAULTERS & AT-RISK STUDENTS ─── */}
        {activeTab === 'defaulters' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FaExclamationTriangle style={{ color: '#ef4444' }} /> Student Attendance Defaulters Roster
                </h3>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                  Students below the mandatory 75% attendance threshold are classified as examination defaulters.
                </p>
              </div>

              {defaulters.length > 0 && (
                <HeaderBtn
                  className="pdf"
                  onClick={() => {
                    defaulters.forEach(d => handleSendWarning(d));
                  }}
                >
                  <FaBell /> Send In-App Warnings to All ({defaulters.length})
                </HeaderBtn>
              )}
            </div>

            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Batch & Program</th>
                    <th>Contact Phone</th>
                    <th>Attended / Total</th>
                    <th>Absences</th>
                    <th>Attendance %</th>
                    <th>Defaulter Status</th>
                    <th>Action Triggers</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#10b981' }}>
                        <FaCheckCircle size={30} style={{ display: 'block', margin: '0 auto 10px', color: '#10b981' }} />
                        <strong>Excellent! Zero attendance defaulters recorded in this period.</strong>
                      </td>
                    </tr>
                  ) : (
                    defaulters.map((d, idx) => (
                      <tr key={d.id}>
                        <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <AvatarCircle style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
                              {getInitials(d.name)}
                            </AvatarCircle>
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{d.name}</div>
                              <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>{d.cnic}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{d.batch || 'Main Batch'}</div>
                          <small style={{ color: '#64748b' }}>{d.course}</small>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{d.phone || '—'}</td>
                        <td>{d.present + d.late} of {d.total}</td>
                        <td style={{ color: '#ef4444', fontWeight: 800 }}>{d.absent}</td>
                        <td>
                          <StatusBadge className={d.pct < 60 ? 'critical' : 'warning'}>
                            {d.pct}%
                          </StatusBadge>
                        </td>
                        <td>
                          <StatusBadge className={d.pct < 60 ? 'critical' : 'warning'}>
                            {d.pct < 60 ? 'Critical Defaulter' : 'At Risk'}
                          </StatusBadge>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              style={{
                                background: 'rgba(34, 197, 94, 0.15)',
                                border: '1px solid rgba(34, 197, 94, 0.35)',
                                color: '#4ade80',
                                padding: '6px 12px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                              onClick={() => handleSendWarning(d)}
                              title="Send Official WhatsApp Notice"
                            >
                              <FaWhatsapp size={12} /> WhatsApp Alert
                            </button>
                            <button
                              style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                color: '#38bdf8',
                                padding: '6px 10px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              onClick={() => router.push(`/admin/management/students/${d.id}`)}
                            >
                              <FaUserGraduate size={10} /> Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Card>
        )}

        {/* ─── TAB 4: QR & KIOSK CHECK-IN STATION ─── */}
        {activeTab === 'kiosk' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FaQrcode style={{ color: '#38bdf8' }} /> Classroom & Campus Check-In Station
                </h3>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Students scan their QR code on their mobile app or present their physical barcode ID card.
                </p>
              </div>

              <LiveBadge>
                <div className="dot" /> Kiosk Active & Listening
              </LiveBadge>
            </div>

            <KioskContainer>
              {/* Left Column: Rotating Session QR Code */}
              <QrBox>
                <div className="clock">{currentTime || '10:00:00 AM'}</div>
                <div className="qr-frame">
                  {/* Dynamic SVG / QR image representation */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`deepskills://attendance?batch=${selectedBatchId}&date=${selectedDate}`)}`}
                    alt="Classroom Check-In QR Code"
                  />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#fff' }}>
                    {currentBatch.batch_name || 'Active Batch'}
                  </h4>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                    Scan with DeepSkills Student App to mark presence
                  </p>
                </div>
              </QrBox>

              {/* Right Column: Rapid Keypad & Recent Check-Ins */}
              <div>
                {/* Rapid Scanner Input */}
                <form onSubmit={handleKioskCheckin} style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                    Barcode Scanner / CNIC Keypad Input:
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <FaBarcode style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        ref={kioskInputRef}
                        style={{
                          width: '100%',
                          background: '#090a0d',
                          border: '2px solid rgba(56, 189, 248, 0.4)',
                          borderRadius: 10,
                          padding: '14px 14px 14px 42px',
                          color: '#fff',
                          fontSize: '1.05rem',
                          outline: 'none',
                          boxShadow: '0 0 15px rgba(56, 189, 248, 0.1)'
                        }}
                        placeholder="Scan barcode or type 13-digit CNIC..."
                        value={kioskInput}
                        onChange={e => setKioskInput(e.target.value)}
                        disabled={kioskProcessing}
                        autoFocus
                      />
                    </div>
                    <HeaderBtn
                      type="submit"
                      className="primary"
                      disabled={kioskProcessing || !kioskInput.trim()}
                      style={{ padding: '0 24px' }}
                    >
                      <FaArrowRight /> {kioskProcessing ? 'Verifying...' : 'Check In'}
                    </HeaderBtn>
                  </div>
                </form>

                {/* Recent Check-Ins Stream */}
                <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Live Check-In Activity Ticker:
                  </h4>

                  {kioskHistory.length === 0 ? (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: 10, padding: 30, textAlign: 'center', color: '#64748b' }}>
                      Waiting for student check-ins...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {kioskHistory.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <AvatarCircle style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                              {getInitials(item.student?.name)}
                            </AvatarCircle>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.student?.name}</div>
                              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                {item.student?.course} • {item.student?.batch}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <StatusBadge className={item.status === 'present' ? 'good' : 'warning'}>
                              {item.status === 'present' ? <FaCheckCircle size={9} /> : <FaClock size={9} />}
                              {item.status?.toUpperCase()}
                            </StatusBadge>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>{item.timestamp}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </KioskContainer>
          </Card>
        )}

        {/* ─── OVERRIDE MODAL ─── */}
        {overrideRecord && (
          <ModalOverlay onClick={() => setOverrideRecord(null)}>
            <Modal onClick={e => e.stopPropagation()}>
              <h3>Admin Attendance Override</h3>
              <p>Correcting attendance record for {overrideRecord.student_name} on {overrideRecord.date}</p>

              <label style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                New Status:
              </label>
              <select value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)}>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="excused">Excused</option>
              </select>

              <label style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Reason for Correction (Required for audit log):
              </label>
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Explain why this record is being modified..."
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <HeaderBtn className="secondary" onClick={() => setOverrideRecord(null)} disabled={savingOverride}>
                  Cancel
                </HeaderBtn>
                <HeaderBtn className="primary" onClick={handleSaveOverride} disabled={savingOverride}>
                  {savingOverride ? 'Saving...' : 'Save Correction'}
                </HeaderBtn>
              </div>
            </Modal>
          </ModalOverlay>
        )}
      </Container>
    </AdminLayout>
  );
}
