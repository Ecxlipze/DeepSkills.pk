import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  FaTasks, FaSearch, FaDownload, FaEye, FaTimes, FaCheckCircle,
  FaClock, FaChalkboardTeacher, FaCalendarAlt, FaFileAlt, FaPlus,
  FaTrash, FaEdit, FaWhatsapp, FaBell, FaPaperclip, FaUndo,
  FaAward, FaUserGraduate, FaExclamationTriangle, FaChartLine, FaSave
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { Skeleton, SkeletonCard } from '../components/Skeleton';

// ─── Styled Components ───

const Container = styled.div`
  padding: 16px 0 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// Academic Sub-Module Ribbon
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
  padding: 10px 18px;
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
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
    &:hover { filter: brightness(1.15); transform: translateY(-1px); }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
    border-color: rgba(255, 255, 255, 0.1);
    &:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  }

  &.warning {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.3);
    &:hover { background: rgba(34, 197, 94, 0.25); color: #fff; transform: translateY(-1px); }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 4px;
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

const ViewSwitcher = styled.div`
  display: flex;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 5px;
  gap: 6px;
`;

const ViewTab = styled.button`
  flex: 1;
  padding: 11px 18px;
  border-radius: 10px;
  border: none;
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.15)' : 'transparent'};
  color: ${props => props.$active ? '#c084fc' : '#888'};
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
    background: ${props => props.$active ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)'};
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }

  .search-input {
    position: relative;
    input {
      width: 100%;
      background: #090a0d;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 14px 10px 38px;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      &:focus { border-color: #a855f7; }
    }
    svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
    }
  }

  select {
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.88rem;
    outline: none;
    cursor: pointer;
    &:focus { border-color: #a855f7; }
  }
`;

const Card = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 24px;
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
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.015);
  }
`;

const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  .track {
    flex: 1;
    min-width: 70px;
    max-width: 110px;
    height: 7px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;

    .fill {
      height: 100%;
      background: ${props => props.$pct >= 80 ? '#10b981' : props.$pct >= 50 ? '#38bdf8' : '#f59e0b'};
      border-radius: 999px;
      width: ${props => Math.min(100, Math.max(0, props.$pct || 0))}%;
    }
  }

  .pct {
    font-size: 0.8rem;
    font-weight: 700;
    color: #cbd5e1;
    white-space: nowrap;
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.76rem;
  font-weight: 800;

  &.graded { background: rgba(16, 185, 129, 0.12); color: #10b981; }
  &.submitted { background: rgba(56, 189, 248, 0.12); color: #38bdf8; }
  &.late { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
  &.pending { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
  &.muted { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }
`;

const CategoryBadge = styled.span`
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  margin-left: 8px;
`;

const AvatarCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

// Matrix Banner
const TaskBanner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 14px;
  padding: 18px 24px;
  margin-bottom: 22px;

  .task-meta {
    h3 {
      margin: 0 0 6px;
      font-size: 1.25rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    p {
      margin: 0;
      font-size: 0.85rem;
      color: #94a3b8;
    }
  }

  .matrix-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;

    .pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      .val { font-size: 1.25rem; font-weight: 800; color: #fff; }
      .lbl { font-size: 0.72rem; text-transform: uppercase; color: #888; font-weight: 700; }
    }
  }
`;

const MatrixNav = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const MatrixTabBtn = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.$active ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)'};
  color: ${props => props.$active ? '#c084fc' : '#94a3b8'};
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(168, 85, 247, 0.2);
    color: #fff;
  }
`;

// Modal Styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalCard = styled(motion.div)`
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
`;

const ModalHeader = styled.div`
  padding: 20px 26px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #fff; }
  button.close {
    background: none; border: none; color: #888; font-size: 1.2rem; cursor: pointer;
    &:hover { color: #fff; }
  }
`;

const ModalBody = styled.div`
  padding: 24px 26px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;

  label {
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #94a3b8;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 6px;
  }

  input, select, textarea {
    width: 100%;
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 11px 14px;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    &:focus { border-color: #a855f7; }
  }

  textarea { min-height: 90px; resize: vertical; }

  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    @media (max-width: 600px) { grid-template-columns: 1fr; }
  }
`;

const ModalFooter = styled.div`
  padding: 16px 26px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const FileChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #cbd5e1;

  button {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
  }
`;

function getInitials(name) {
  if (!name) return 'ST';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Main Component ───

export default function AdminTasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'tasks', 'full');

  // View state: 'directory' or 'matrix'
  const [currentView, setCurrentView] = useState('directory');
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    course: 'all',
    batch: 'all',
    category: 'all'
  });

  // Data Store
  const [tasks, setTasks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrolledCounts, setEnrolledCounts] = useState({});
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalSubmissions: 0,
    gradedSubmissions: 0,
    evaluationRate: 0,
    pendingEvaluations: 0
  });

  // Matrix View State
  const [selectedTask, setSelectedTask] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [matrixFilter, setMatrixFilter] = useState('all'); // 'all', 'submitted', 'graded', 'pending', 'late'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);

  // Create Assignment Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'Assignment',
    course: '',
    batch: 'All Batches',
    targetBatches: [],
    dueDate: '',
    totalMarks: 100,
    description: '',
    files: []
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // Grading Form State
  const [gradeScore, setGradeScore] = useState('');
  const [gradeLetter, setGradeLetter] = useState('A');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Fetch Tasks Data
  const fetchData = useCallback(async (taskIdToSelect = null) => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      let url = `/api/admin/academic/tasks?course=${filters.course}&batch=${filters.batch}&category=${filters.category}&search=${encodeURIComponent(filters.search)}`;
      if (taskIdToSelect) url += `&task_id=${encodeURIComponent(taskIdToSelect)}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          const d = json.data || {};
          setTasks(d.tasks || []);
          setBatches(d.batches || []);
          setCourses(d.courses || []);
          setEnrolledCounts(d.enrolledCounts || {});
          setStats(d.stats || {});

          if (d.selectedTaskMatrix) {
            setSelectedTask(d.selectedTaskMatrix.task);
            setMatrixData(d.selectedTaskMatrix);
          } else if (d.tasks?.length > 0 && !selectedTask) {
            setSelectedTask(d.tasks[0]);
          }
          return;
        }
      }

      // Client Fallback: Direct Supabase Queries
      const [tRes, sRes, bRes, admRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('task_submissions').select('*').order('submitted_at', { ascending: false }),
        supabase.from('batches').select('id, batch_name, course, time_shift, status'),
        supabase.from('admissions').select('id, name, cnic, phone, email, course, batch').in('status', ['Active', 'Graduated'])
      ]);

      const tList = tRes.data || [];
      const sList = sRes.data || [];
      const bList = bRes.data || [];
      const admList = admRes.data || [];

      setTasks(tList);
      setBatches(bList);
      setCourses(Array.from(new Set(bList.map(b => b.course).filter(Boolean))));

      const counts = {};
      admList.forEach(a => { if (a.batch) counts[a.batch] = (counts[a.batch] || 0) + 1; });
      setEnrolledCounts(counts);

      const graded = sList.filter(s => s.status === 'Graded' || s.marks_obtained !== null).length;
      setStats({
        totalTasks: tList.length,
        totalSubmissions: sList.length,
        gradedSubmissions: graded,
        evaluationRate: sList.length > 0 ? Math.round((graded / sList.length) * 100) : 0,
        pendingEvaluations: sList.length - graded
      });

      if (tList.length > 0 && !selectedTask) {
        setSelectedTask(tList[0]);
      }
    } catch (err) {
      console.warn('Fallback tasks fetch error:', err);
      toast.error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedTask]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Tracking Matrix for a specific task
  const handleOpenMatrix = (task) => {
    setSelectedTask(task);
    setCurrentView('matrix');
    fetchData(task.id);
  };

  // Filtered Matrix Students
  const filteredMatrixStudents = useMemo(() => {
    if (!matrixData?.students) return [];
    let list = matrixData.students;

    if (matrixFilter === 'submitted') {
      list = list.filter(s => s.status === 'Submitted');
    } else if (matrixFilter === 'graded') {
      list = list.filter(s => s.status.startsWith('Graded'));
    } else if (matrixFilter === 'pending') {
      list = list.filter(s => s.status === 'Pending');
    } else if (matrixFilter === 'late') {
      list = list.filter(s => s.is_late);
    }

    return list;
  }, [matrixData, matrixFilter]);

  // Handle Create Assignment Submit
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to create assignments.');
      return;
    }
    if (!createForm.title.trim() || !createForm.course || !createForm.dueDate) {
      toast.error('Please enter assignment title, course, and due date.');
      return;
    }

    setCreatingTask(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      let uploadedFileUrls = [];

      // Upload any local files to task_files bucket
      if (createForm.files && createForm.files.length > 0) {
        for (const file of createForm.files) {
          const fileExt = file.name.split('.').pop();
          const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `assignments/${cleanName}`;

          const { error: upErr } = await supabase.storage
            .from('task_files')
            .upload(filePath, file);

          if (!upErr) {
            const { data: pUrl } = supabase.storage.from('task_files').getPublicUrl(filePath);
            uploadedFileUrls.push({ name: file.name, url: pUrl.publicUrl, size: file.size });
          }
        }
      }

      const payload = {
        action: 'create_task',
        title: createForm.title,
        category: createForm.category,
        course: createForm.course,
        batch: createForm.batch,
        batches: createForm.batch === 'All Batches'
          ? batches.filter(b => b.course === createForm.course).map(b => b.batch_name)
          : [createForm.batch],
        due_date: createForm.dueDate,
        total_marks: createForm.totalMarks,
        description: createForm.description,
        file_url: uploadedFileUrls[0]?.url || null,
        file_urls: uploadedFileUrls
      };

      const res = await fetch('/api/admin/academic/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Failed to create assignment.');
      }

      toast.success('Assignment created & broadcasted successfully!');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        category: 'Assignment',
        course: '',
        batch: 'All Batches',
        targetBatches: [],
        dueDate: '',
        totalMarks: 100,
        description: '',
        files: []
      });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Assignment creation failed.');
    } finally {
      setCreatingTask(false);
    }
  };

  // Open Grade Modal
  const handleOpenGradeModal = (studentRow) => {
    setGradingSubmission(studentRow);
    setGradeScore(studentRow.marks_obtained !== null ? String(studentRow.marks_obtained) : '');
    setGradeLetter(studentRow.grade || 'A');
    setGradeFeedback(studentRow.feedback || '');
    setShowGradeModal(true);
  };

  // Save Evaluation
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to evaluate assignments.');
      return;
    }
    if (!gradingSubmission?.submission_id) {
      toast.error('No submission found to evaluate.');
      return;
    }

    const scoreNum = Number(gradeScore);
    if (isNaN(scoreNum) || scoreNum < 0) {
      toast.error('Please enter a valid numeric score.');
      return;
    }

    setSubmittingGrade(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'grade_submission',
          submission_id: gradingSubmission.submission_id,
          marks_obtained: scoreNum,
          grade: gradeLetter,
          feedback: gradeFeedback
        })
      });

      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Failed to save evaluation.');
      }

      toast.success('Evaluation saved & student notified!');
      setShowGradeModal(false);
      setGradingSubmission(null);
      if (selectedTask) fetchData(selectedTask.id);
      else fetchData();
    } catch (err) {
      toast.error(err.message || 'Evaluation failed.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  // Send WhatsApp Reminder
  const handleSendReminder = async (studentItem) => {
    if (!selectedTask) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'send_reminders',
          task_id: selectedTask.id,
          student_ids: [studentItem.student_id]
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to dispatch reminder.');

      const rem = json.reminders?.[0];
      if (rem?.whatsappUrl) {
        window.open(rem.whatsappUrl, '_blank');
      }
      toast.success(`Reminder sent to ${studentItem.student_name}`);
    } catch (err) {
      toast.error(err.message || 'Reminder dispatch failed.');
    }
  };

  // Send Bulk Reminders
  const handleSendBulkReminders = async () => {
    if (!selectedTask) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'send_reminders',
          task_id: selectedTask.id
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to dispatch bulk reminders.');

      toast.success(json.message || 'Reminders dispatched!');
    } catch (err) {
      toast.error(err.message || 'Bulk reminder dispatch failed.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!canMutate) {
      toast.error('You do not have permission to delete assignments.');
      return;
    }
    if (!confirm(`Are you sure you want to delete assignment "${taskTitle}"? All student submissions will be deleted.`)) {
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('/api/admin/academic/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'delete_task',
          task_id: taskId
        })
      });

      if (!res.ok) throw new Error('Failed to delete task.');
      toast.success('Assignment deleted.');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Deletion failed.');
    }
  };

  return (
    <AdminLayout>
      <Container>
        {/* Sub-Module Navigation Ribbon */}
        <SubNavRibbon>
          <NavChip onClick={() => router.push('/admin/academic')}>
            <FaChartLine /> Academic Hub
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/attendance')}>
            <FaCalendarAlt /> Attendance
          </NavChip>
          <NavChip $active onClick={() => router.push('/admin/academic/tasks')}>
            <FaTasks /> Tasks & Homework
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/results')}>
            <FaAward /> Exams & Results
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

        {/* Top Header */}
        <Header>
          <div className="title-area">
            <h1>
              <FaTasks style={{ color: '#c084fc' }} /> Tasks & Homework Directorate
            </h1>
            <p>Batch-wide assignment creator, multi-file attachment manager, live submission tracking matrix, and rubric evaluations.</p>
          </div>

          <div className="action-cluster">
            {canMutate && (
              <HeaderBtn className="primary" onClick={() => setShowCreateModal(true)}>
                <FaPlus /> New Assignment
              </HeaderBtn>
            )}
            <HeaderBtn className="secondary" onClick={() => fetchData()}>
              <FaUndo /> Refresh
            </HeaderBtn>
          </div>
        </Header>

        {/* Executive Telemetry KPI Cards */}
        <StatsGrid>
          <StatCard>
            <div className="label">Total Tasks Created</div>
            <div className="val">{stats.totalTasks}</div>
            <div className="sub"><FaTasks style={{ color: '#c084fc' }} /> Across All Programs</div>
          </StatCard>

          <StatCard>
            <div className="label">Student Submissions</div>
            <div className="val" style={{ color: '#38bdf8' }}>{stats.totalSubmissions}</div>
            <div className="sub"><FaFileAlt style={{ color: '#38bdf8' }} /> Total Works Received</div>
          </StatCard>

          <StatCard>
            <div className="label">Evaluation Rate</div>
            <div className="val" style={{ color: '#10b981' }}>{stats.evaluationRate}%</div>
            <div className="sub"><FaCheckCircle style={{ color: '#10b981' }} /> {stats.gradedSubmissions} Graded With Feedback</div>
          </StatCard>

          <StatCard>
            <div className="label">Pending Evaluations</div>
            <div className="val" style={{ color: '#f59e0b' }}>{stats.pendingEvaluations}</div>
            <div className="sub"><FaClock style={{ color: '#f59e0b' }} /> Awaiting Grading</div>
          </StatCard>
        </StatsGrid>

        {/* View Switcher Tabs */}
        <ViewSwitcher>
          <ViewTab
            $active={currentView === 'directory'}
            onClick={() => setCurrentView('directory')}
          >
            <FaTasks /> Assignments Directory ({tasks.length})
          </ViewTab>
          <ViewTab
            $active={currentView === 'matrix'}
            onClick={() => {
              setCurrentView('matrix');
              if (selectedTask) fetchData(selectedTask.id);
            }}
          >
            <FaEye /> Live Submission Tracking Matrix {selectedTask && `— ${selectedTask.title}`}
          </ViewTab>
        </ViewSwitcher>

        {/* ─── VIEW 1: ASSIGNMENTS DIRECTORY ─── */}
        {currentView === 'directory' && (
          <div>
            {/* Filter Bar */}
            <FilterCard style={{ marginBottom: 20 }}>
              <div className="search-input">
                <FaSearch />
                <input
                  placeholder="Search assignment title, instructor, or keywords..."
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>

              <select
                value={filters.course}
                onChange={e => setFilters(f => ({ ...f, course: e.target.value }))}
              >
                <option value="all">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={filters.batch}
                onChange={e => setFilters(f => ({ ...f, batch: e.target.value }))}
              >
                <option value="all">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.batch_name}>{b.batch_name}</option>
                ))}
              </select>

              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              >
                <option value="all">All Categories</option>
                <option value="Assignment">Assignment</option>
                <option value="Homework">Homework</option>
                <option value="Quiz">Quiz</option>
                <option value="Project">Project</option>
                <option value="Lab Task">Lab Task</option>
              </select>
            </FilterCard>

            {/* Assignments Table Card */}
            <Card>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Assignment Brief</th>
                      <th>Course & Batch</th>
                      <th>Assigned By</th>
                      <th>Due Date</th>
                      <th>Submissions Velocity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}><td colSpan="6"><Skeleton height="35px" /></td></tr>
                      ))
                    ) : tasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No assignments found matching these filter criteria.
                        </td>
                      </tr>
                    ) : (
                      tasks.map(task => {
                        const enrolled = enrolledCounts[task.batch] || 0;
                        const isOverdue = task.due_date && new Date(task.due_date).getTime() < Date.now();

                        return (
                          <tr key={task.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                                {task.title}
                                <CategoryBadge>{task.category}</CategoryBadge>
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>
                                Max Marks: {task.total_marks || 100} • Created: {new Date(task.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{task.course}</div>
                              <div style={{ color: '#c084fc', fontSize: '0.8rem', fontWeight: 600 }}>{task.batch}</div>
                            </td>
                            <td style={{ color: '#cbd5e1' }}>{task.assigned_by || 'Instructor'}</td>
                            <td>
                              <div style={{ color: isOverdue ? '#ef4444' : '#cbd5e1', fontWeight: isOverdue ? 700 : 500 }}>
                                {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </div>
                              {isOverdue && (
                                <span style={{ color: '#ef4444', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <FaClock size={10} /> Passed
                                </span>
                              )}
                            </td>
                            <td>
                              <ProgressBar $pct={task.submissions_count && enrolled ? Math.round((task.submissions_count / enrolled) * 100) : 0}>
                                <div className="track"><div className="fill" /></div>
                                <span className="pct">
                                  {enrolled > 0 ? `${task.submissions_count || 0} / ${enrolled}` : 'Active'}
                                </span>
                              </ProgressBar>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  style={{
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    border: '1px solid rgba(168, 85, 247, 0.35)',
                                    color: '#c084fc',
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                  onClick={() => handleOpenMatrix(task)}
                                >
                                  <FaEye size={11} /> Track Matrix
                                </button>

                                {canMutate && (
                                  <button
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      color: '#f87171',
                                      padding: '6px 10px',
                                      borderRadius: 8,
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    onClick={() => handleDeleteTask(task.id, task.title)}
                                    title="Delete Assignment"
                                  >
                                    <FaTrash size={11} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </TableWrap>
            </Card>
          </div>
        )}

        {/* ─── VIEW 2: LIVE SUBMISSION TRACKING MATRIX ─── */}
        {currentView === 'matrix' && (
          <div>
            {/* Selected Task Banner */}
            <TaskBanner>
              <div className="task-meta">
                <h3>
                  {selectedTask?.title || 'Selected Assignment'}
                  <CategoryBadge>{selectedTask?.category || 'Assignment'}</CategoryBadge>
                </h3>
                <p>
                  Program: {selectedTask?.course} • Batch: {selectedTask?.batch} • Max Marks: {selectedTask?.total_marks || 100} • Due: {selectedTask?.due_date ? new Date(selectedTask.due_date).toLocaleString() : 'No Deadline'}
                </p>
              </div>

              <div className="matrix-stats">
                <div className="pill">
                  <span className="val" style={{ color: '#38bdf8' }}>{matrixData?.totalEnrolled ?? 0}</span>
                  <span className="lbl">Enrolled</span>
                </div>
                <div className="pill">
                  <span className="val" style={{ color: '#10b981' }}>{matrixData?.submittedCount ?? 0}</span>
                  <span className="lbl">Submitted</span>
                </div>
                <div className="pill">
                  <span className="val" style={{ color: '#a855f7' }}>{matrixData?.gradedCount ?? 0}</span>
                  <span className="lbl">Graded</span>
                </div>
                <div className="pill">
                  <span className="val" style={{ color: '#ef4444' }}>{matrixData?.pendingCount ?? 0}</span>
                  <span className="lbl">Missing</span>
                </div>
                <div className="pill">
                  <span className="val" style={{ color: '#f59e0b' }}>{matrixData?.lateCount ?? 0}</span>
                  <span className="lbl">Late</span>
                </div>
              </div>

              {matrixData?.pendingCount > 0 && canMutate && (
                <HeaderBtn className="warning" onClick={handleSendBulkReminders}>
                  <FaWhatsapp /> Send Reminders to All Pending ({matrixData.pendingCount})
                </HeaderBtn>
              )}
            </TaskBanner>

            {/* Matrix Filters */}
            <MatrixNav>
              <MatrixTabBtn
                $active={matrixFilter === 'all'}
                onClick={() => setMatrixFilter('all')}
              >
                All Enrolled Students ({matrixData?.totalEnrolled ?? 0})
              </MatrixTabBtn>
              <MatrixTabBtn
                $active={matrixFilter === 'submitted'}
                onClick={() => setMatrixFilter('submitted')}
              >
                Submitted ({matrixData?.submittedCount ?? 0})
              </MatrixTabBtn>
              <MatrixTabBtn
                $active={matrixFilter === 'graded'}
                onClick={() => setMatrixFilter('graded')}
              >
                Graded ({matrixData?.gradedCount ?? 0})
              </MatrixTabBtn>
              <MatrixTabBtn
                $active={matrixFilter === 'pending'}
                onClick={() => setMatrixFilter('pending')}
              >
                Pending / Missing ({matrixData?.pendingCount ?? 0})
              </MatrixTabBtn>
              <MatrixTabBtn
                $active={matrixFilter === 'late'}
                onClick={() => setMatrixFilter('late')}
              >
                Late Submissions ({matrixData?.lateCount ?? 0})
              </MatrixTabBtn>
            </MatrixNav>

            {/* Matrix Student Table Card */}
            <Card>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Student Identity</th>
                      <th>Program & Batch</th>
                      <th>Submission Status</th>
                      <th>Turn-In Time</th>
                      <th>Attached Work</th>
                      <th>Score & Grade</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i}><td colSpan="8"><Skeleton height="35px" /></td></tr>
                      ))
                    ) : filteredMatrixStudents.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No student records match this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredMatrixStudents.map((st, idx) => (
                        <tr key={st.student_id}>
                          <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <AvatarCircle>{getInitials(st.student_name)}</AvatarCircle>
                              <div>
                                <div style={{ fontWeight: 700, color: '#fff' }}>{st.student_name}</div>
                                <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                  {st.student_cnic}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{st.course}</div>
                            <small style={{ color: '#c084fc' }}>{st.batch}</small>
                          </td>
                          <td>
                            <StatusPill className={
                              st.status.startsWith('Graded') ? 'graded' :
                              st.status === 'Submitted' ? 'submitted' :
                              st.status === 'Late' ? 'late' : 'pending'
                            }>
                              {st.status === 'Graded' && <FaCheckCircle size={10} />}
                              {st.status === 'Submitted' && <FaClock size={10} />}
                              {st.status === 'Late' && <FaClock size={10} />}
                              {st.status === 'Pending' && <FaExclamationTriangle size={10} />}
                              {st.status}
                            </StatusPill>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                            {st.submitted_at ? new Date(st.submitted_at).toLocaleString() : '—'}
                          </td>
                          <td>
                            {st.file_url ? (
                              <a
                                href={st.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  color: '#38bdf8',
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.78rem',
                                  textDecoration: 'none',
                                  fontWeight: 600
                                }}
                              >
                                <FaDownload size={10} /> View Work
                              </a>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>No File</span>
                            )}
                          </td>
                          <td>
                            {st.marks_obtained !== null && st.marks_obtained !== undefined ? (
                              <div>
                                <span style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                                  {st.marks_obtained}
                                </span>
                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}> / {st.total_marks}</span>
                                {st.grade && (
                                  <span style={{ marginLeft: 6, color: '#c084fc', fontWeight: 700 }}>
                                    ({st.grade})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#64748b' }}>—</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {st.status !== 'Pending' ? (
                                <button
                                  style={{
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    color: '#c084fc',
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                  onClick={() => handleOpenGradeModal(st)}
                                >
                                  <FaEdit size={10} /> {st.marks_obtained !== null ? 'Re-Grade' : 'Grade'}
                                </button>
                              ) : (
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
                                    gap: 5
                                  }}
                                  onClick={() => handleSendReminder(st)}
                                >
                                  <FaWhatsapp size={11} /> Remind
                                </button>
                              )}
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

        {/* ─── MODAL 1: BATCH-WIDE ASSIGNMENT CREATOR ─── */}
        <AnimatePresence>
          {showCreateModal && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            >
              <ModalCard
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={e => e.stopPropagation()}
              >
                <ModalHeader>
                  <h3>Create & Broadcast New Assignment</h3>
                  <button className="close" onClick={() => setShowCreateModal(false)}>
                    <FaTimes />
                  </button>
                </ModalHeader>

                <form onSubmit={handleCreateAssignment}>
                  <ModalBody>
                    <div>
                      <label>Assignment Title *</label>
                      <input
                        required
                        placeholder="e.g. Project Phase 1: Database Architecture"
                        value={createForm.title}
                        onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>

                    <div className="row-2">
                      <div>
                        <label>Category</label>
                        <select
                          value={createForm.category}
                          onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                        >
                          <option value="Assignment">Assignment</option>
                          <option value="Homework">Homework</option>
                          <option value="Quiz">Quiz</option>
                          <option value="Project">Project</option>
                          <option value="Lab Task">Lab Task</option>
                        </select>
                      </div>

                      <div>
                        <label>Total Maximum Marks</label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={createForm.totalMarks}
                          onChange={e => setCreateForm(f => ({ ...f, totalMarks: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="row-2">
                      <div>
                        <label>Academic Course *</label>
                        <select
                          required
                          value={createForm.course}
                          onChange={e => setCreateForm(f => ({ ...f, course: e.target.value }))}
                        >
                          <option value="">Select Course...</option>
                          {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label>Target Batch</label>
                        <select
                          value={createForm.batch}
                          onChange={e => setCreateForm(f => ({ ...f, batch: e.target.value }))}
                        >
                          <option value="All Batches">All Batches (Broadcast)</option>
                          {batches
                            .filter(b => !createForm.course || b.course === createForm.course)
                            .map(b => (
                              <option key={b.id} value={b.batch_name}>{b.batch_name}</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label>Due Date & Submission Cutoff *</label>
                      <input
                        type="datetime-local"
                        required
                        value={createForm.dueDate}
                        onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label>Problem Statement & Instructions</label>
                      <textarea
                        placeholder="Provide detailed instructions, requirements, evaluation criteria, and submission format guidelines..."
                        value={createForm.description}
                        onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label>Attach Problem Files (PDF, ZIP, DOCX)</label>
                      <input
                        type="file"
                        multiple
                        onChange={e => {
                          const newFiles = Array.from(e.target.files || []);
                          setCreateForm(f => ({ ...f, files: [...f.files, ...newFiles] }));
                        }}
                      />
                      {createForm.files.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                          {createForm.files.map((file, i) => (
                            <FileChip key={i}>
                              <FaPaperclip size={10} />
                              <span>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                              <button
                                type="button"
                                onClick={() => setCreateForm(f => ({ ...f, files: f.files.filter((_, idx) => idx !== i) }))}
                              >
                                <FaTimes size={10} />
                              </button>
                            </FileChip>
                          ))}
                        </div>
                      )}
                    </div>
                  </ModalBody>

                  <ModalFooter>
                    <HeaderBtn
                      type="button"
                      className="secondary"
                      onClick={() => setShowCreateModal(false)}
                      disabled={creatingTask}
                    >
                      Cancel
                    </HeaderBtn>
                    <HeaderBtn
                      type="submit"
                      className="primary"
                      disabled={creatingTask}
                    >
                      <FaSave /> {creatingTask ? 'Broadcasting...' : 'Publish & Broadcast'}
                    </HeaderBtn>
                  </ModalFooter>
                </form>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* ─── MODAL 2: RUBRIC GRADING & EVALUATION ─── */}
        <AnimatePresence>
          {showGradeModal && gradingSubmission && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGradeModal(false)}
            >
              <ModalCard
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={e => e.stopPropagation()}
              >
                <ModalHeader>
                  <div>
                    <h3>Evaluate Submission: {gradingSubmission.student_name}</h3>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>
                      {gradingSubmission.student_cnic} • {selectedTask?.title}
                    </div>
                  </div>
                  <button className="close" onClick={() => setShowGradeModal(false)}>
                    <FaTimes />
                  </button>
                </ModalHeader>

                <form onSubmit={handleSaveGrade}>
                  <ModalBody>
                    {/* Submission Metadata */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase' }}>Turned-In At</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {gradingSubmission.submitted_at ? new Date(gradingSubmission.submitted_at).toLocaleString() : '—'}
                          </div>
                        </div>

                        {gradingSubmission.file_url ? (
                          <a
                            href={gradingSubmission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: '0.85rem',
                              textDecoration: 'none',
                              fontWeight: 700
                            }}
                          >
                            <FaDownload /> Download Submitted File
                          </a>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No Attachment</span>
                        )}
                      </div>
                    </div>

                    {/* Marks & Grade Letter */}
                    <div className="row-2">
                      <div>
                        <label>Marks Obtained (Max {gradingSubmission.total_marks || 100}) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max={gradingSubmission.total_marks || 100}
                          placeholder="e.g. 85"
                          value={gradeScore}
                          onChange={e => {
                            const val = e.target.value;
                            setGradeScore(val);
                            const max = gradingSubmission.total_marks || 100;
                            const pct = (Number(val) / max) * 100;
                            if (pct >= 85) setGradeLetter('A+');
                            else if (pct >= 75) setGradeLetter('A');
                            else if (pct >= 65) setGradeLetter('B');
                            else if (pct >= 50) setGradeLetter('C');
                            else setGradeLetter('F');
                          }}
                        />
                      </div>

                      <div>
                        <label>Calculated Grade</label>
                        <select
                          value={gradeLetter}
                          onChange={e => setGradeLetter(e.target.value)}
                        >
                          <option value="A+">A+ (Distinction)</option>
                          <option value="A">A (Excellent)</option>
                          <option value="B">B (Good)</option>
                          <option value="C">C (Satisfactory)</option>
                          <option value="D">D (Pass)</option>
                          <option value="F">F (Fail)</option>
                        </select>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div>
                      <label>Instructor Feedback & Evaluation Remarks</label>
                      <textarea
                        placeholder="Write constructive evaluation notes, areas of improvement, or commendable strengths in the submission..."
                        value={gradeFeedback}
                        onChange={e => setGradeFeedback(e.target.value)}
                      />
                    </div>
                  </ModalBody>

                  <ModalFooter>
                    <HeaderBtn
                      type="button"
                      className="secondary"
                      onClick={() => setShowGradeModal(false)}
                      disabled={submittingGrade}
                    >
                      Cancel
                    </HeaderBtn>
                    <HeaderBtn
                      type="submit"
                      className="primary"
                      disabled={submittingGrade}
                    >
                      <FaSave /> {submittingGrade ? 'Recording...' : 'Save Grade & Notify Student'}
                    </HeaderBtn>
                  </ModalFooter>
                </form>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

      </Container>
    </AdminLayout>
  );
}
