import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  FaBullhorn, FaThumbtack, FaEdit, FaTrash,
  FaPaperclip, FaTimes, FaPlus, FaToggleOn, FaToggleOff,
  FaCalendarAlt, FaBroadcastTower, FaBullseye, FaSearch,
  FaFilter, FaUndo, FaWhatsapp, FaEye, FaUsers,
  FaDownload, FaSync, FaCheckCircle, FaExclamationTriangle,
  FaInfoCircle, FaChevronDown, FaTable, FaTasks,
  FaAward, FaComments, FaBookOpen, FaChartBar,
  FaCalendarCheck, FaExclamationCircle
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import AnnouncementCard from '../components/AnnouncementCard';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { downloadCsv } from '../utils/csvExport';

// ──────────────────────────────────────────
// Styled Components (DeepSkills Glassmorphic)
// ──────────────────────────────────────────

const Container = styled.div`
  padding: 10px 0 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
`;

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
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => props.$active ? '#c084fc' : '#94a3b8'};
  border: 1px solid ${props => props.$active ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
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
    background: rgba(168, 85, 247, 0.2);
    color: #fff;
    border-color: rgba(168, 85, 247, 0.5);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  .title-area {
    h1 {
      font-size: 1.7rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    p {
      color: #94a3b8;
      font-size: 0.88rem;
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
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
  border: 1px solid transparent;

  &.primary {
    background: #7B1F2E;
    color: #fff;
    &:hover { background: #942637; box-shadow: 0 4px 14px rgba(123, 31, 46, 0.4); }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #cbd5e1;
    border-color: rgba(255, 255, 255, 0.1);
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;

    .icon-box {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: ${props => props.$accentBg || 'rgba(123, 31, 46, 0.15)'};
      color: ${props => props.$accentColor || '#ff8a99'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
    }

    .pill {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.03);
      padding: 3px 8px;
      border-radius: 6px;
    }
  }

  h4 {
    font-size: 0.78rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }

  .value {
    font-size: 1.65rem;
    font-weight: 800;
    color: #fff;
    line-height: 1.2;
  }

  .sub {
    font-size: 0.78rem;
    color: #64748b;
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border-radius: 14px;
  padding: 16px 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;

  .filter-top {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;

    @media (max-width: 900px) {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
    box-sizing: border-box;

    svg.search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      font-size: 0.88rem;
      pointer-events: none;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      background: #0d0f12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 38px 10px 38px;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      transition: all 0.2s;

      &::placeholder {
        color: #64748b;
      }

      &:focus {
        border-color: #7B1F2E;
        box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.25);
      }
    }

    .clear-search-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s;

      &:hover {
        color: #fff;
      }
    }
  }

  .dropdown-cluster {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    @media (max-width: 900px) {
      width: 100%;
    }
  }

  .select-wrap {
    position: relative;
    min-width: 140px;
    box-sizing: border-box;

    @media (max-width: 640px) {
      flex: 1;
      min-width: 130px;
    }

    select {
      width: 100%;
      box-sizing: border-box;
      background: #0d0f12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 32px 10px 12px;
      color: #fff;
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      transition: all 0.2s;

      &:focus {
        border-color: #7B1F2E;
      }

      option {
        background: #111318;
        color: #fff;
      }
    }

    .select-arrow {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      pointer-events: none;
      font-size: 0.75rem;
    }
  }

  .reset-filters-btn {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: all 0.2s;
    box-sizing: border-box;
    flex-shrink: 0;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fff;
    }

    @media (max-width: 900px) {
      width: 100%;
      justify-content: center;
    }
  }

  .filter-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    width: 100%;
    box-sizing: border-box;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    @media (max-width: 640px) {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
  }

  .view-toggle-group {
    display: inline-flex;
    align-items: center;
    background: #0d0f12;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
    box-sizing: border-box;

    @media (max-width: 640px) {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    button {
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      border: 1px solid transparent;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      white-space: nowrap;

      &:hover { color: #fff; }

      &.active {
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border-color: rgba(168, 85, 247, 0.4);
        box-shadow: 0 2px 8px rgba(168, 85, 247, 0.25);
      }
    }
  }

  .count-meta {
    font-size: 0.82rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const TableCard = styled.div`
  background: #111318;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 14px 18px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  th {
    font-size: 0.76rem;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 0.5px;
    background: #0e1014;
    white-space: nowrap;
  }

  td {
    font-size: 0.86rem;
    color: #cbd5e1;
    vertical-align: middle;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }

  tr:last-child td {
    border: none;
  }
`;

const PriorityBadge = styled.span`
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;

  &.urgent {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  &.normal {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  &.info {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }
`;

const AudiencePill = styled.span`
  font-size: 0.78rem;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const ReadCountBtn = styled.button`
  background: rgba(56, 189, 248, 0.1);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.25);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;

  &:hover {
    background: rgba(56, 189, 248, 0.2);
    color: #fff;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
`;

const ActionIconBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  &.whatsapp:hover {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.4);
  }

  &.pin:hover {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.4);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.4);
  }
`;

// ─── Modal Styles ───

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
  overflow-y: auto;
`;

const ModalCard = styled(motion.div)`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: ${props => props.$wide ? '820px' : '640px'};
  padding: 26px;
  color: #fff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  position: relative;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 22px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    button {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      &:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
    }
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
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

  input, textarea, select {
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 10px 14px;
    color: #fff;
    font-size: 0.88rem;
    outline: none;
    font-family: inherit;
    transition: all 0.2s;

    &:focus {
      border-color: #7B1F2E;
      box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.25);
    }
  }

  textarea {
    min-height: 120px;
    resize: vertical;
    line-height: 1.6;
  }
`;

const MultiSelectGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  max-height: 140px;
  overflow-y: auto;
  padding: 4px;
  background: #090a0d;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;

  .chip {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: #94a3b8;
    transition: all 0.15s ease;

    &.selected {
      background: rgba(123, 31, 46, 0.25);
      color: #ff8a99;
      border-color: #7B1F2E;
    }

    &:hover {
      color: #fff;
    }
  }
`;

const ReachPreviewCard = styled.div`
  background: rgba(56, 189, 248, 0.06);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.84rem;
  color: #38bdf8;
  display: flex;
  align-items: center;
  gap: 10px;
`;

// ──────────────────────────────────────────
// Component Implementation
// ──────────────────────────────────────────

const AdminAnnouncements = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'announcements', 'full');

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [telemetry, setTelemetry] = useState({ total: 0, active: 0, pinned: 0, totalReads: 0, engagementRate: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [filterAudience, setFilterAudience] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'feed'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    body: '',
    priority: 'normal',
    audienceType: 'broadcast',
    audienceRoles: ['student', 'teacher'],
    audienceCourses: [],
    audienceBatches: [],
    isPinned: false,
    scheduleFor: false,
    scheduledAt: '',
    attachments: []
  });

  // Reader Inspection Modal State
  const [selectedForReads, setSelectedForReads] = useState(null);
  const [readerList, setReaderList] = useState([]);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [readerSearch, setReaderSearch] = useState('');

  // Safe Token Resolver
  const getAuthToken = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const t = localStorage.getItem('token');
    if (t && typeof t === 'string' && t.trim() && t !== 'undefined' && t !== 'null') {
      return t.trim();
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) return data.session.access_token;
    } catch {
      // Ignore fallback
    }
    return null;
  }, []);

  // Safe Client-Side Supabase Fallback Loader
  const loadFromSupabase = useCallback(async () => {
    try {
      const [annRes, readsRes, bRes, cRes, admRes, tRes] = await Promise.all([
        supabase.from('announcements').select(`*, announcement_attachments(*)`).order('is_pinned', { ascending: false }).order('posted_at', { ascending: false }),
        supabase.from('announcement_reads').select('announcement_id, user_id, read_at'),
        supabase.from('batches').select('batch_name').order('batch_name', { ascending: true }),
        supabase.from('courses').select('title').order('title', { ascending: true }),
        supabase.from('admissions').select('id, name, cnic, status').in('status', ['Active', 'Graduated']),
        supabase.from('teachers').select('id, name, cnic, status').eq('status', 'Active')
      ]);

      const aList = annRes.data || [];
      const rList = readsRes.data || [];
      const readMap = new Map();
      rList.forEach(r => readMap.set(r.announcement_id, (readMap.get(r.announcement_id) || 0) + 1));

      const enriched = aList.map(a => ({
        ...a,
        body: a.body || a.content || '',
        priority: a.priority || 'normal',
        attachments_count: (a.announcement_attachments || []).length,
        reads_count: readMap.get(a.id) || 0
      }));

      setAnnouncements(enriched);
      setBatches((bRes.data || []).map(b => b.batch_name));
      setCourses((cRes.data || []).map(c => c.title));

      const totalAudience = (admRes.data || []).length + (tRes.data || []).length;
      setTelemetry({
        total: enriched.length,
        active: enriched.filter(a => a.is_active !== false).length,
        pinned: enriched.filter(a => !!a.is_pinned).length,
        totalReads: rList.length,
        engagementRate: enriched.length > 0 && totalAudience > 0 ? Math.min(100, Math.round((rList.length / (enriched.length * totalAudience)) * 100)) : 0
      });
    } catch (err) {
      console.error('Direct Supabase fetch fallback error:', err);
      toast.error('Failed to load announcements feed.');
    }
  }, []);

  // Main Fetch Function
  const fetchData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const token = await getAuthToken();
      let usedApi = false;

      if (token) {
        try {
          const res = await fetch('/api/admin/academic/announcements', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          });
          const json = await res.json();
          if (res.ok && json.status === 'success') {
            const d = json.data || {};
            setAnnouncements(d.announcements || []);
            setTelemetry(d.telemetry || { total: 0, active: 0, pinned: 0, totalReads: 0, engagementRate: 0 });
            if (d.meta) {
              setBatches(d.meta.batches || []);
              setCourses(d.meta.courses || []);
            }
            usedApi = true;
          }
        } catch {
          // Fall through to client Supabase fallback
        }
      }

      if (!usedApi) {
        await loadFromSupabase();
      }

      if (showToast) toast.success('Announcements feed refreshed!');
    } catch (err) {
      console.warn('Announcements fetch error:', err);
      await loadFromSupabase();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthToken, loadFromSupabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Postgres Changes Subscription
  useEffect(() => {
    const channel = supabase
      .channel('academic-announcements-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTitle = (a.title || '').toLowerCase().includes(q);
        const matchesBody = (a.body || '').toLowerCase().includes(q);
        const matchesAuthor = (a.posted_by_name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody && !matchesAuthor) return false;
      }

      if (filterAudience !== 'all' && (a.audience_type || 'broadcast') !== filterAudience) return false;
      if (filterRole !== 'all' && !(a.audience_roles || []).includes(filterRole)) return false;
      if (filterPriority !== 'all' && (a.priority || 'normal') !== filterPriority) return false;

      if (filterStatus !== 'all') {
        if (filterStatus === 'active' && a.is_active === false) return false;
        if (filterStatus === 'inactive' && a.is_active !== false) return false;
        if (filterStatus === 'pinned' && !a.is_pinned) return false;
        if (filterStatus === 'scheduled' && (!a.scheduled_at || new Date(a.scheduled_at) <= new Date())) return false;
      }

      return true;
    });
  }, [announcements, search, filterAudience, filterRole, filterPriority, filterStatus]);

  // Form Reset
  const resetForm = () => {
    setForm({
      title: '',
      body: '',
      priority: 'normal',
      audienceType: 'broadcast',
      audienceRoles: ['student', 'teacher'],
      audienceCourses: [],
      audienceBatches: [],
      isPinned: false,
      scheduleFor: false,
      scheduledAt: '',
      attachments: []
    });
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    if (!canMutate) {
      toast.error('You do not have permission to post announcements.');
      return;
    }
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (a) => {
    if (!canMutate) {
      toast.error('You do not have permission to edit announcements.');
      return;
    }
    setForm({
      title: a.title,
      body: a.body || a.content || '',
      priority: a.priority || 'normal',
      audienceType: a.audience_type || 'broadcast',
      audienceRoles: a.audience_roles || ['student', 'teacher'],
      audienceCourses: a.audience_courses || [],
      audienceBatches: a.audience_batches || [],
      isPinned: !!a.is_pinned,
      scheduleFor: !!a.scheduled_at && new Date(a.scheduled_at) > new Date(),
      scheduledAt: a.scheduled_at ? new Date(a.scheduled_at).toISOString().slice(0, 16) : '',
      attachments: (a.announcement_attachments || []).map(att => ({
        file_name: att.file_name,
        file_url: att.file_url,
        file_size: att.file_size
      }))
    });
    setEditingId(a.id);
    setShowCreateModal(true);
  };

  // Submit Handler
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to post announcements.');
      return;
    }
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Announcement title and body are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
        audience_type: form.audienceType,
        audience_roles: form.audienceRoles,
        audience_courses: form.audienceType === 'targeted' ? form.audienceCourses : null,
        audience_batches: form.audienceType === 'targeted' ? form.audienceBatches : null,
        is_pinned: form.isPinned,
        scheduled_at: form.scheduleFor && form.scheduledAt ? form.scheduledAt : null,
        attachments: form.attachments
      };

      const token = await getAuthToken();
      let saved = false;

      if (token) {
        try {
          const res = await fetch('/api/admin/academic/announcements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              action: editingId ? 'update' : 'create',
              announcement_id: editingId,
              ...payload
            })
          });
          const json = await res.json();
          if (res.ok && json.status === 'success') {
            saved = true;
          }
        } catch {
          // Fall through to client fallback
        }
      }

      if (!saved) {
        // Direct Supabase Fallback
        if (editingId) {
          const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('announcements').insert([{
            ...payload,
            posted_by_name: user?.name || 'Administrator',
            posted_by_role: 'admin',
            is_active: true,
            posted_at: new Date().toISOString()
          }]);
          if (error) throw error;
        }
      }

      toast.success(editingId ? 'Announcement updated successfully.' : 'Announcement published successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Save announcement error:', err);
      toast.error(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (a) => {
    if (!canMutate) {
      toast.error('You do not have permission to pin announcements.');
      return;
    }
    const nextPinned = !a.is_pinned;
    try {
      const token = await getAuthToken();
      if (token) {
        await fetch('/api/admin/academic/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'toggle_pin', announcement_id: a.id, is_pinned: nextPinned })
        });
      } else {
        await supabase.from('announcements').update({ is_pinned: nextPinned }).eq('id', a.id);
      }
      toast.success(nextPinned ? 'Announcement pinned to top.' : 'Announcement unpinned.');
      fetchData();
    } catch {
      toast.error('Failed to update pin status.');
    }
  };

  // Toggle Active (Archive / Restore)
  const handleToggleActive = async (a) => {
    if (!canMutate) {
      toast.error('You do not have permission to modify announcements.');
      return;
    }
    const nextActive = a.is_active === false ? true : false;
    try {
      const token = await getAuthToken();
      if (token) {
        await fetch('/api/admin/academic/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'toggle_active', announcement_id: a.id, is_active: nextActive })
        });
      } else {
        await supabase.from('announcements').update({ is_active: nextActive }).eq('id', a.id);
      }
      toast.success(nextActive ? 'Announcement activated.' : 'Announcement archived.');
      fetchData();
    } catch {
      toast.error('Failed to update announcement state.');
    }
  };

  // Delete Permanently
  const handleDelete = async (a) => {
    if (!canMutate) {
      toast.error('You do not have permission to delete announcements.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete "${a.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      const token = await getAuthToken();
      if (token) {
        await fetch('/api/admin/academic/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'delete', announcement_id: a.id })
        });
      } else {
        await supabase.from('announcements').delete().eq('id', a.id);
      }
      toast.success('Announcement deleted permanently.');
      fetchData();
    } catch {
      toast.error('Failed to delete announcement.');
    }
  };

  // Open Reader Audit Modal
  const handleOpenReaders = async (a) => {
    setSelectedForReads(a);
    setLoadingReaders(true);
    setReaderSearch('');
    try {
      const token = await getAuthToken();
      let readers = [];
      if (token) {
        const res = await fetch(`/api/admin/academic/announcements?announcement_id=${a.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json.status === 'success') {
          readers = json.data?.readers || [];
        }
      }

      if (!readers.length) {
        const [rRes, admRes] = await Promise.all([
          supabase.from('announcement_reads').select('user_id, read_at').eq('announcement_id', a.id),
          supabase.from('admissions').select('id, name, cnic, batch, course, phone')
        ]);
        const sMap = new Map((admRes.data || []).map(s => [String(s.id), s]));
        const sCnicMap = new Map((admRes.data || []).map(s => [String(s.cnic), s]));

        readers = (rRes.data || []).map(r => {
          const s = sMap.get(String(r.user_id)) || sCnicMap.get(String(r.user_id));
          return {
            user_id: r.user_id,
            read_at: r.read_at,
            name: s ? s.name : 'Registered Student',
            role: 'student',
            cnic: s?.cnic || null,
            batch: s?.batch || null,
            course: s?.course || null,
            phone: s?.phone || null
          };
        });
      }
      setReaderList(readers);
    } catch (err) {
      console.error('Reader audit fetch error:', err);
      toast.error('Failed to load read receipts.');
    } finally {
      setLoadingReaders(false);
    }
  };

  // 1-Click WhatsApp Broadcast Generator
  const handleWhatsAppBroadcast = (a) => {
    const priorityEmoji = a.priority === 'urgent' ? '[URGENT NOTICE]' : '[CAMPUS BULLETIN]';
    const cleanBody = (a.body || a.content || '').slice(0, 240);
    const portalUrl = 'https://deepskills.pk/student/announcements';
    const text = encodeURIComponent(
      `*${priorityEmoji} ${a.title}*\n\n` +
      `${cleanBody}${(a.body || '').length > 240 ? '...' : ''}\n\n` +
      `Posted by: ${a.posted_by_name || 'DeepSkills Academic Directorate'}\n` +
      `View official bulletin on student portal:\n${portalUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!announcements.length) {
      toast.error('No announcements to export.');
      return;
    }
    const rows = announcements.map(a => ({
      Title: a.title,
      Priority: a.priority || 'normal',
      AudienceType: a.audience_type || 'broadcast',
      TargetRoles: (a.audience_roles || []).join('; '),
      TargetBatches: (a.audience_batches || []).join('; ') || 'All Batches',
      TargetCourses: (a.audience_courses || []).join('; ') || 'All Courses',
      ReadsCount: a.reads_count || 0,
      PostedBy: a.posted_by_name || 'Admin',
      PostedAt: a.posted_at ? new Date(a.posted_at).toLocaleString() : '',
      Status: a.is_active !== false ? 'Active' : 'Archived',
      IsPinned: a.is_pinned ? 'Yes' : 'No'
    }));
    downloadCsv(rows, `DeepSkills_Announcements_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Announcements registry exported to CSV.');
  };

  // Filtered Reader List in Modal
  const filteredReaders = useMemo(() => {
    if (!readerSearch.trim()) return readerList;
    const q = readerSearch.trim().toLowerCase();
    return readerList.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.cnic || '').includes(q) ||
      (r.batch || '').toLowerCase().includes(q)
    );
  }, [readerList, readerSearch]);

  const hasActiveFilters = search || filterAudience !== 'all' || filterRole !== 'all' || filterPriority !== 'all' || filterStatus !== 'all';

  return (
    <AdminLayout>
      <Container>
        {/* Navigation Ribbon */}
        <SubNavRibbon>
          <NavChip onClick={() => router.push('/admin/academic')}>
            <FaChartBar /> Academic Hub
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/attendance')}>
            <FaCalendarCheck /> Attendance
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/tasks')}>
            <FaTasks /> Tasks & Homework
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/results')}>
            <FaAward /> Exams & Results
          </NavChip>
          <NavChip $active onClick={() => router.push('/admin/academic/announcements')}>
            <FaBullhorn /> Announcements
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/complaints')}>
            <FaComments /> Grievances
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/chats')}>
            <FaComments /> Group Chats
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/reports')}>
            <FaBookOpen /> Academic Reports
          </NavChip>
        </SubNavRibbon>

        {/* Header Bar */}
        <Header>
          <div className="title-area">
            <h1><FaBullhorn style={{ color: '#7B1F2E' }} /> Academic Broadcasts & Announcements Hub</h1>
            <p>Publish institutional bulletins, batch notices, emergency alerts, and student/faculty advisories</p>
          </div>
          <div className="action-cluster">
            {canMutate && (
              <HeaderBtn className="primary" onClick={handleOpenCreate}>
                <FaPlus /> New Announcement
              </HeaderBtn>
            )}
            <HeaderBtn className="secondary" onClick={handleExportCSV}>
              <FaDownload /> Export CSV
            </HeaderBtn>
            <HeaderBtn className="secondary" onClick={() => fetchData(true)} disabled={refreshing}>
              <FaSync className={refreshing ? 'fa-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </HeaderBtn>
          </div>
        </Header>

        {/* Telemetry KPI Cards */}
        <StatsGrid>
          <StatCard $accentBg="rgba(55, 138, 221, 0.15)" $accentColor="#378ADD">
            <div className="card-top">
              <div className="icon-box"><FaBullhorn /></div>
              <span className="pill">All Time</span>
            </div>
            <h4>Total Bulletins</h4>
            <div className="value">{telemetry.total}</div>
            <div className="sub">Published notices</div>
          </StatCard>

          <StatCard $accentBg="rgba(16, 185, 129, 0.15)" $accentColor="#10b981">
            <div className="card-top">
              <div className="icon-box"><FaCheckCircle /></div>
              <span className="pill" style={{ color: '#34d399' }}>Live Now</span>
            </div>
            <h4>Active Notices</h4>
            <div className="value" style={{ color: '#34d399' }}>{telemetry.active}</div>
            <div className="sub">Visible in candidate feeds</div>
          </StatCard>

          <StatCard $accentBg="rgba(245, 158, 11, 0.15)" $accentColor="#f59e0b">
            <div className="card-top">
              <div className="icon-box"><FaThumbtack /></div>
              <span className="pill" style={{ color: '#fbbf24' }}>Top Priority</span>
            </div>
            <h4>Pinned Notices</h4>
            <div className="value" style={{ color: '#fbbf24' }}>{telemetry.pinned}</div>
            <div className="sub">Pinned to feed header</div>
          </StatCard>

          <StatCard $accentBg="rgba(168, 85, 247, 0.15)" $accentColor="#a855f7">
            <div className="card-top">
              <div className="icon-box"><FaEye /></div>
              <span className="pill">Read Receipts</span>
            </div>
            <h4>Total Reads</h4>
            <div className="value" style={{ color: '#c084fc' }}>{telemetry.totalReads}</div>
            <div className="sub">Audience acknowledgments</div>
          </StatCard>
        </StatsGrid>

        {/* Filter and View Mode Toolbar */}
        <FilterCard>
          <div className="filter-top">
            <div className="search-wrap">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search bulletins by title, content keyword, or author..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="clear-search-btn" onClick={() => setSearch('')} title="Clear search">
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            <div className="dropdown-cluster">
              <div className="select-wrap">
                <select value={filterAudience} onChange={e => setFilterAudience(e.target.value)} aria-label="Filter by Audience">
                  <option value="all">All Audiences</option>
                  <option value="broadcast">Campus Broadcast</option>
                  <option value="targeted">Targeted Scope</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>

              <div className="select-wrap">
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} aria-label="Filter by Role">
                  <option value="all">All Roles</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Teachers Only</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>

              <div className="select-wrap">
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} aria-label="Filter by Priority">
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="info">Info</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>

              <div className="select-wrap">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by Status">
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="pinned">Pinned Only</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="inactive">Archived</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearch('');
                    setFilterAudience('all');
                    setFilterRole('all');
                    setFilterPriority('all');
                    setFilterStatus('all');
                  }}
                  title="Reset all filters"
                >
                  <FaUndo size={11} /> Reset Filters
                </button>
              )}
            </div>
          </div>

          <div className="filter-bottom">
            <div className="view-toggle-group">
              <button
                type="button"
                className={viewMode === 'table' ? 'active' : ''}
                onClick={() => setViewMode('table')}
              >
                <FaTable size={12} /> Notice Register Table
              </button>
              <button
                type="button"
                className={viewMode === 'feed' ? 'active' : ''}
                onClick={() => setViewMode('feed')}
              >
                <FaEye size={12} /> Live Feed Preview
              </button>
            </div>

            <div className="count-meta">
              Showing <strong>{filteredAnnouncements.length}</strong> of {announcements.length} bulletin{announcements.length !== 1 ? 's' : ''}
            </div>
          </div>
        </FilterCard>

        {/* View 1: Notice Register Table */}
        {viewMode === 'table' && (
          filteredAnnouncements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b', background: '#111318', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <FaBullhorn size={42} style={{ marginBottom: '16px', color: '#7B1F2E' }} />
              <h3 style={{ color: '#fff', margin: '0 0 8px' }}>No announcements found</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {hasActiveFilters ? 'Try adjusting your search criteria or clearing filters.' : 'Click "New Announcement" to publish your first bulletin.'}
              </p>
            </div>
          ) : (
            <TableCard>
              <Table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Title & Bulletin Details</th>
                    <th>Target Audience</th>
                    <th>Engagement</th>
                    <th>Author & Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map(a => {
                    const isUrgent = a.priority === 'urgent';
                    const isInfo = a.priority === 'info';
                    const isPinned = !!a.is_pinned;
                    const isActive = a.is_active !== false;

                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isPinned && <FaThumbtack style={{ color: '#fbbf24' }} title="Pinned to top" />}
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isActive ? '#34d399' : '#64748b'
                            }} title={isActive ? 'Active Notice' : 'Archived Notice'} />
                          </div>
                        </td>
                        <td>
                          <PriorityBadge className={isUrgent ? 'urgent' : isInfo ? 'info' : 'normal'}>
                            {isUrgent && <FaExclamationTriangle size={10} />}
                            {isInfo && <FaInfoCircle size={10} />}
                            {!isUrgent && !isInfo && <FaBullhorn size={10} />}
                            {a.priority || 'normal'}
                          </PriorityBadge>
                        </td>
                        <td style={{ maxWidth: '300px' }}>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem', marginBottom: '3px' }}>
                            {a.title}
                          </div>
                          <div style={{
                            fontSize: '0.78rem',
                            color: '#94a3b8',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {a.body || a.content || '—'}
                          </div>
                          {(a.announcement_attachments || []).length > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FaPaperclip size={9} /> {a.announcement_attachments.length} attachment{a.announcement_attachments.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          <AudiencePill>
                            {a.audience_type === 'broadcast' ? (
                              <><FaBroadcastTower style={{ color: '#378ADD' }} /> Campus Broadcast</>
                            ) : (
                              <><FaBullseye style={{ color: '#c084fc' }} /> {(a.audience_batches || a.audience_courses || []).join(', ') || 'Targeted'}</>
                            )}
                          </AudiencePill>
                        </td>
                        <td>
                          <ReadCountBtn onClick={() => handleOpenReaders(a)} title="View reader acknowledgments">
                            <FaEye size={11} /> {a.reads_count || 0} Reads
                          </ReadCountBtn>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>{a.posted_by_name || 'Admin'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {a.posted_at ? new Date(a.posted_at).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td>
                          <ActionGroup>
                            <ActionIconBtn
                              className="whatsapp"
                              onClick={() => handleWhatsAppBroadcast(a)}
                              title="Forward bulletin via WhatsApp to cohort coordinators"
                            >
                              <FaWhatsapp />
                            </ActionIconBtn>

                            <ActionIconBtn
                              onClick={() => handleOpenReaders(a)}
                              title="Audit read receipts and candidate engagement"
                            >
                              <FaUsers />
                            </ActionIconBtn>

                            {canMutate && (
                              <>
                                <ActionIconBtn
                                  className="pin"
                                  onClick={() => handleTogglePin(a)}
                                  title={isPinned ? 'Unpin bulletin' : 'Pin bulletin to top'}
                                >
                                  <FaThumbtack style={{ color: isPinned ? '#fbbf24' : undefined }} />
                                </ActionIconBtn>

                                <ActionIconBtn
                                  onClick={() => handleOpenEdit(a)}
                                  title="Edit announcement"
                                >
                                  <FaEdit />
                                </ActionIconBtn>

                                <ActionIconBtn
                                  onClick={() => handleToggleActive(a)}
                                  title={isActive ? 'Archive announcement' : 'Reactivate announcement'}
                                >
                                  {isActive ? <FaToggleOn style={{ color: '#34d399' }} /> : <FaToggleOff />}
                                </ActionIconBtn>

                                <ActionIconBtn
                                  className="danger"
                                  onClick={() => handleDelete(a)}
                                  title="Delete permanently"
                                >
                                  <FaTrash />
                                </ActionIconBtn>
                              </>
                            )}
                          </ActionGroup>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableCard>
          )
        )}

        {/* View 2: Live Feed Preview (How Candidates See Notices) */}
        {viewMode === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredAnnouncements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: '#111318', borderRadius: '14px' }}>
                <FaBullhorn size={36} style={{ color: '#7B1F2E', marginBottom: '12px' }} />
                <h3>No active announcements</h3>
              </div>
            ) : (
              filteredAnnouncements.map(a => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  isRead={false}
                  onMarkRead={() => {}}
                />
              ))
            )}
          </div>
        )}

        {/* ─── Modal 1: Create / Edit Announcement ─── */}
        <AnimatePresence>
          {showCreateModal && (
            <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)}>
              <ModalCard
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                $wide
              >
                <div className="modal-header">
                  <h3>
                    <FaBullhorn style={{ color: '#7B1F2E' }} />
                    {editingId ? 'Edit Institutional Announcement' : 'Publish New Campus Bulletin'}
                  </h3>
                  <button type="button" onClick={() => setShowCreateModal(false)}><FaTimes /></button>
                </div>

                <form onSubmit={handleSaveAnnouncement} className="modal-body">
                  <FormGroup>
                    <label>Announcement Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Midterm Examination Schedule & Advisory — Spring Session"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      maxLength={120}
                      required
                    />
                  </FormGroup>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <FormGroup>
                      <label>Priority Level</label>
                      <select
                        value={form.priority}
                        onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      >
                        <option value="normal">Normal Notice</option>
                        <option value="urgent">Urgent / High Priority</option>
                        <option value="info">Informational Bulletin</option>
                      </select>
                    </FormGroup>

                    <FormGroup>
                      <label>Audience Scope</label>
                      <select
                        value={form.audienceType}
                        onChange={e => setForm(f => ({ ...f, audienceType: e.target.value }))}
                      >
                        <option value="broadcast">Campus-Wide Broadcast (Everyone)</option>
                        <option value="targeted">Targeted Courses & Cohorts</option>
                      </select>
                    </FormGroup>
                  </div>

                  <FormGroup>
                    <label>Recipient Roles</label>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={form.audienceRoles.includes('student')}
                          onChange={() => {
                            setForm(f => ({
                              ...f,
                              audienceRoles: f.audienceRoles.includes('student')
                                ? f.audienceRoles.filter(r => r !== 'student')
                                : [...f.audienceRoles, 'student']
                            }));
                          }}
                        /> Enrolled Students
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={form.audienceRoles.includes('teacher')}
                          onChange={() => {
                            setForm(f => ({
                              ...f,
                              audienceRoles: f.audienceRoles.includes('teacher')
                                ? f.audienceRoles.filter(r => r !== 'teacher')
                                : [...f.audienceRoles, 'teacher']
                            }));
                          }}
                        /> Faculty & Instructors
                      </label>
                    </div>
                  </FormGroup>

                  {form.audienceType === 'targeted' && (
                    <>
                      <FormGroup>
                        <label>Target Courses ({form.audienceCourses.length} selected)</label>
                        <MultiSelectGroup>
                          {courses.map(c => {
                            const isSelected = form.audienceCourses.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                className={`chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setForm(f => ({
                                    ...f,
                                    audienceCourses: isSelected ? f.audienceCourses.filter(x => x !== c) : [...f.audienceCourses, c]
                                  }));
                                }}
                              >
                                {c}
                              </button>
                            );
                          })}
                        </MultiSelectGroup>
                      </FormGroup>

                      <FormGroup>
                        <label>Target Cohorts / Batches ({form.audienceBatches.length} selected)</label>
                        <MultiSelectGroup>
                          {batches.map(b => {
                            const isSelected = form.audienceBatches.includes(b);
                            return (
                              <button
                                key={b}
                                type="button"
                                className={`chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setForm(f => ({
                                    ...f,
                                    audienceBatches: isSelected ? f.audienceBatches.filter(x => x !== b) : [...f.audienceBatches, b]
                                  }));
                                }}
                              >
                                {b}
                              </button>
                            );
                          })}
                        </MultiSelectGroup>
                      </FormGroup>
                    </>
                  )}

                  <FormGroup>
                    <label>Bulletin Content *</label>
                    <textarea
                      placeholder="Write the full announcement message, syllabus updates, or advisory here..."
                      value={form.body}
                      onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                      required
                    />
                  </FormGroup>

                  {/* Reach Preview Estimator */}
                  <ReachPreviewCard>
                    <FaBroadcastTower size={16} />
                    <span>
                      {form.audienceType === 'broadcast'
                        ? 'Broadcasting to all active student admissions and registered faculty members.'
                        : `Targeted to ${form.audienceRoles.join(' & ')} across ${form.audienceBatches.length || 'all'} batches and ${form.audienceCourses.length || 'all'} courses.`}
                    </span>
                  </ReachPreviewCard>

                  {/* Pin & Schedule Settings */}
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={form.isPinned}
                        onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))}
                      />
                      <FaThumbtack style={{ color: '#fbbf24' }} /> Pin to Top of Feeds
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={form.scheduleFor}
                        onChange={e => setForm(f => ({ ...f, scheduleFor: e.target.checked }))}
                      />
                      <FaCalendarAlt /> Schedule for Later
                    </label>
                  </div>

                  {form.scheduleFor && (
                    <FormGroup>
                      <label>Publication Date & Time</label>
                      <input
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                        required={form.scheduleFor}
                      />
                    </FormGroup>
                  )}

                  <div className="modal-footer">
                    <HeaderBtn type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </HeaderBtn>
                    <HeaderBtn type="submit" className="primary" disabled={saving}>
                      <FaBullhorn /> {saving ? 'Publishing...' : (editingId ? 'Update Announcement' : 'Publish Announcement')}
                    </HeaderBtn>
                  </div>
                </form>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* ─── Modal 2: Read Receipts Audit ─── */}
        <AnimatePresence>
          {selectedForReads && (
            <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedForReads(null)}>
              <ModalCard
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                $wide
              >
                <div className="modal-header">
                  <div>
                    <h3><FaUsers style={{ color: '#38bdf8' }} /> Read Receipts & Engagement Audit</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#94a3b8' }}>
                      Bulletin: <strong>{selectedForReads.title}</strong>
                    </p>
                  </div>
                  <button type="button" onClick={() => setSelectedForReads(null)}><FaTimes /></button>
                </div>

                <div className="modal-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                      Total Readers: <strong style={{ color: '#38bdf8' }}>{readerList.length}</strong> acknowledgment{readerList.length !== 1 ? 's' : ''}
                    </div>

                    <div style={{ position: 'relative', width: '220px' }}>
                      <input
                        type="text"
                        placeholder="Search reader name or CNIC..."
                        value={readerSearch}
                        onChange={e => setReaderSearch(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#090a0d',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          color: '#fff',
                          fontSize: '0.82rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {loadingReaders ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <FaSync className="fa-spin" style={{ marginBottom: '8px', fontSize: '1.2rem' }} />
                      <p style={{ margin: 0 }}>Auditing candidate read receipts...</p>
                    </div>
                  ) : filteredReaders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#0e1014', borderRadius: '10px' }}>
                      <FaExclamationCircle size={32} style={{ marginBottom: '8px', color: '#64748b' }} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        {readerSearch ? 'No matching readers found.' : 'No candidate acknowledgments recorded yet.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                      <Table>
                        <thead>
                          <tr>
                            <th>Recipient Name</th>
                            <th>Role</th>
                            <th>CNIC</th>
                            <th>Cohort / Batch</th>
                            <th>Acknowledged At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReaders.map((r, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600, color: '#fff' }}>{r.name}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: r.role === 'student' ? 'rgba(55,138,221,0.15)' : 'rgba(34,197,94,0.15)',
                                  color: r.role === 'student' ? '#38bdf8' : '#4ade80'
                                }}>
                                  {r.role}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{r.cnic || '—'}</td>
                              <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{r.batch || r.course || 'Campus'}</td>
                              <td style={{ fontSize: '0.8rem', color: '#34d399' }}>
                                {r.read_at ? new Date(r.read_at).toLocaleString() : 'Recent'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <HeaderBtn className="primary" onClick={() => setSelectedForReads(null)}>
                    Close
                  </HeaderBtn>
                </div>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </AdminLayout>
  );
};

export default AdminAnnouncements;
