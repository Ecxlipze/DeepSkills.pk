const fs = require('fs');

const code = `import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useRouter } from 'next/router';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaArrowLeft, FaEdit, FaUserSlash, FaCheckCircle, 
  FaPlus, FaTimes, FaAward, FaDownload, FaUserCheck,
  FaCalendarAlt, FaPhoneAlt, FaEnvelope,
  FaIdCard, FaMapMarkerAlt, FaGraduationCap, FaBriefcase,
  FaMoneyBillWave, FaClock, FaExclamationCircle, FaShieldAlt,
  FaExternalLinkAlt, FaSpinner, FaChevronRight, FaBuilding,
  FaHeartbeat, FaLayerGroup, FaCheck, FaLock
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { syncTeacherAccess } from '../utils/adminAccessApi';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { createExperienceCertificatePdf, downloadBlob } from '../utils/hrPdf';

const spin = keyframes\`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
\`;

const Container = styled.div\`
  padding: 16px 0 40px;
  color: #f8fafc;
\`;

const BreadcrumbNav = styled.div\`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  color: #64748b;
  margin-bottom: 18px;

  span.crumb {
    cursor: pointer;
    transition: color 0.15s;
    &:hover { color: #cbd5e1; }
  }
  .sep {
    font-size: 0.7rem;
    color: #475569;
  }
  .active {
    color: #f1f5f9;
    font-weight: 600;
  }
\`;

const BackButton = styled.button\`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 24px;
  cursor: pointer;
  padding: 8px 14px;
  transition: all 0.2s;
  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.15);
  }
\`;

const Layout = styled.div\`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 26px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
\`;

// SIDEBAR
const SidebarCard = styled.div\`
  background: #111318;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 28px 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: sticky;
  top: 90px;
\`;

const ProfileHeader = styled.div\`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .avatar {
    width: 86px;
    height: 86px;
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 16px;
    background: linear-gradient(135deg, rgba(123, 31, 46, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%);
    border: 2px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 20px rgba(123, 31, 46, 0.25);
  }

  h2 {
    font-size: 1.35rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 6px 0;
    letter-spacing: -0.01em;
  }

  .specialization {
    color: #94a3b8;
    font-size: 0.85rem;
    margin-bottom: 12px;
  }
\`;

const StatusBadge = styled.div\`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: \${props => {
    if (props.$variant === 'success' || props.$active) return 'rgba(16, 185, 129, 0.12)';
    if (props.$variant === 'warning') return 'rgba(245, 158, 11, 0.12)';
    if (props.$variant === 'danger') return 'rgba(239, 68, 68, 0.12)';
    return 'rgba(139, 92, 246, 0.12)';
  }};
  color: \${props => {
    if (props.$variant === 'success' || props.$active) return '#34d399';
    if (props.$variant === 'warning') return '#fbbf24';
    if (props.$variant === 'danger') return '#f87171';
    return '#a78bfa';
  }};
  border: 1px solid \${props => {
    if (props.$variant === 'success' || props.$active) return 'rgba(16, 185, 129, 0.25)';
    if (props.$variant === 'warning') return 'rgba(245, 158, 11, 0.25)';
    if (props.$variant === 'danger') return 'rgba(239, 68, 68, 0.25)';
    return 'rgba(139, 92, 246, 0.25)';
  }};
\`;

const InfoGrid = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
\`;

const InfoRow = styled.div\`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.84rem;

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    font-weight: 500;
  }

  .value {
    color: #f1f5f9;
    font-weight: 600;
    text-align: right;
    word-break: break-word;
    max-width: 170px;
  }
\`;

const BatchChipsSection = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 10px;

  .chip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    font-weight: 700;
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .batch-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 0.78rem;
    color: #cbd5e1;
    font-weight: 600;
  }

  .role-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8b5cf6;
    &.assistant { background: #f59e0b; }
  }
\`;

const ActionButtons = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
\`;

const ActionBtn = styled.button\`
  width: 100%;
  padding: 11px 16px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.edit {
    background: rgba(139, 92, 246, 0.12);
    border-color: rgba(139, 92, 246, 0.28);
    color: #c4b5fd;
    &:hover {
      background: rgba(139, 92, 246, 0.22);
      color: #fff;
    }
  }

  &.status-active {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.25);
    color: #f87171;
    &:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fff;
    }
  }

  &.status-inactive {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.28);
    color: #34d399;
    &:hover {
      background: rgba(16, 185, 129, 0.22);
      color: #fff;
    }
  }

  &.cert {
    background: rgba(123, 31, 46, 0.18);
    border-color: rgba(123, 31, 46, 0.4);
    color: #fda4af;
    &:hover {
      background: rgba(123, 31, 46, 0.32);
      color: #fff;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
\`;

// RIGHT COLUMN / MAIN
const MainContent = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 20px;
\`;

const TabContainer = styled.div\`
  background: #111318;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
\`;

const TabBar = styled.div\`
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 12px;
  overflow-x: auto;
  gap: 4px;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
\`;

const Tab = styled.button\`
  padding: 16px 20px;
  background: none;
  border: none;
  color: \${props => (props.$active ? '#ffffff' : '#64748b')};
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: #e2e8f0;
  }

  .badge {
    font-size: 0.72rem;
    padding: 2px 7px;
    border-radius: 12px;
    background: \${props => (props.$active ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.06)')};
    color: \${props => (props.$active ? '#c4b5fd' : '#94a3b8')};
  }

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, #8b5cf6, #7b1f2e);
    transform: scaleX(\${props => (props.$active ? 1 : 0)});
    transition: transform 0.2s ease;
  }
\`;

const TabBody = styled.div\`
  padding: 26px 28px;
\`;

// OVERVIEW TAB STYLES
const SectionCard = styled.div\`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px 22px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &:last-child {
    margin-bottom: 0;
  }
\`;

const SectionTitle = styled.div\`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;

  .icon {
    color: #a78bfa;
  }

  .tag {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 600;
    color: #64748b;
  }
\`;

const KeyValGrid = styled.div\`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
\`;

const KeyValItem = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .k {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
  }
  .v {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }
\`;

const PipelineProgressCard = styled.div\`
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.15) 0%, rgba(17, 19, 24, 0.9) 100%);
  border: 1px solid rgba(123, 31, 46, 0.3);
  border-radius: 14px;
  padding: 20px 22px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1rem;
    font-weight: 700;
    color: #ffffff;
  }

  .steps-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .step-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 16px;
    font-size: 0.72rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #64748b;

    &.active {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.4);
      color: #c4b5fd;
    }
    &.done {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
  }

  .meter-bar {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #10b981);
    transition: width 0.3s ease;
  }
\`;

// STATS
const StatsGrid = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
\`;

const MiniStat = styled.div\`
  background: rgba(255, 255, 255, 0.03);
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 4px;

  .val {
    font-size: 1.55rem;
    font-weight: 800;
    color: #f8fafc;
  }
  .lab {
    color: #94a3b8;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
\`;

const PerformanceBar = styled.div\`
  margin-bottom: 18px;
  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.86rem;
    color: #cbd5e1;
    font-weight: 500;
  }
  .track {
    height: 8px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #3b82f6);
    width: \${props => props.percent}%;
    transition: width 0.5s ease;
  }
\`;

const TableWrap = styled.div\`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
\`;

const Table = styled.table\`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;

  th {
    padding: 14px 18px;
    color: #94a3b8;
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    white-space: nowrap;
  }

  td {
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #e2e8f0;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }
\`;

// MODALS
const ModalOverlay = styled(motion.div)\`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
\`;

const ModalContent = styled(motion.div)\`
  background: #111318;
  width: 100%;
  max-width: 520px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 28px 30px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 20px;
\`;

const ModalHeader = styled.div\`
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
  }

  button {
    background: none;
    border: none;
    color: #64748b;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: all 0.15s;
    &:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
  }
\`;

const FormGroup = styled.div\`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #94a3b8;
  }

  input, select, textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 12px 14px;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;

    &:focus {
      border-color: #8b5cf6;
    }
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }
\`;

const ModalActionRow = styled.div\`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
\`;

const PrimaryBtn = styled.button\`
  padding: 11px 20px;
  background: linear-gradient(135deg, #7b1f2e 0%, #8b5cf6 100%);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  .spin { animation: \${spin} 1s linear infinite; }
\`;

const SecondaryBtn = styled.button\`
  padding: 11px 18px;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
\`;

const HR_STEPS = [
  { step: 1, label: 'Personal Info' },
  { step: 2, label: 'Documents' },
  { step: 3, label: 'JD Review' },
  { step: 4, label: 'Signature' },
  { step: 5, label: 'Hired & Active' }
];

const TeacherProfile = ({ teacherId }) => {
  const params = useParams();
  const router = useRouter();
  const id = teacherId || params?.id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const canMutate = Boolean(
    user?.role === 'admin' || 
    canAccess(user?.permissions || {}, 'teachers', 'full') || 
    canAccess(user?.permissions || {}, 'hr', 'full')
  );
  
  const [teacher, setTeacher] = useState(null);
  const [hrProfile, setHrProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [processing, setProcessing] = useState(false);

  // Associated Data
  const [assignments, setAssignments] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [salaryConfig, setSalaryConfig] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [batchStudentCounts, setBatchStudentCounts] = useState({});
  const [attendanceStats, setAttendanceStats] = useState({ totalSessions: 0, attendanceRate: 0 });

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageBatchesOpen, setIsManageBatchesOpen] = useState(false);
  const [isSalarySetupOpen, setIsSalarySetupOpen] = useState(false);
  
  // Form values
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [newAssignment, setNewAssignment] = useState({ course: '', batch_id: '', role: 'Main' });
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: '',
    status: 'Active',
    notes: ''
  });

  const fetchTeacherData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [tRes, hrRes, assRes, batchRes, courseRes, salRes, payRes] = await Promise.all([
        supabase.from('teachers').select('*').eq('id', id).single(),
        supabase.from('hr_profiles').select('*').eq('teacher_id', id).maybeSingle(),
        supabase.from('teacher_batches').select('*, batches(*)').eq('teacher_id', id),
        supabase.from('batches').select('*'),
        supabase.from('courses').select('*'),
        supabase.from('teacher_salaries').select('*').eq('teacher_id', id).maybeSingle(),
        supabase.from('payments').select('*').eq('entity_id', id).eq('entity_type', 'teacher').order('paid_date', { ascending: false })
      ]);

      if (tRes.error) throw tRes.error;
      const teacherData = tRes.data;
      setTeacher(teacherData);
      setHrProfile(hrRes.data || null);

      setEditForm({
        name: teacherData.name || '',
        phone: teacherData.phone || '',
        email: teacherData.email || '',
        specialization: teacherData.specialization || '',
        status: teacherData.status || 'Active',
        notes: teacherData.notes || ''
      });

      const teacherAssignments = assRes.data || [];
      setAssignments(teacherAssignments);
      setAllBatches(batchRes.data || []);
      setAllCourses(courseRes.data || []);

      const teacherBatchNames = teacherAssignments
        .map(a => a.batches?.batch_name)
        .filter(Boolean);

      // Tasks & Submissions
      let teacherTasks = [];
      if (teacherBatchNames.length > 0) {
        const { data: tData } = await supabase
          .from('tasks')
          .select('*')
          .in('batch', teacherBatchNames)
          .order('created_at', { ascending: false });
        
        if (tData && tData.length > 0) {
          const taskIds = tData.map(t => t.id);
          const { data: sData } = await supabase
            .from('task_submissions')
            .select('*')
            .in('task_id', taskIds);
          
          teacherTasks = tData.map(t => ({
            ...t,
            submissions: (sData || []).filter(s => s.task_id === t.id)
          }));
        }
      } else if (teacherData.name) {
        const { data: tData } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_by', teacherData.name)
          .order('created_at', { ascending: false });
        teacherTasks = tData || [];
      }
      setTasks(teacherTasks);

      // Complaints
      let teacherComplaints = [];
      if (teacherBatchNames.length > 0) {
        const { data: cData } = await supabase
          .from('complaints')
          .select('*')
          .eq('send_to', 'My Batch Teacher')
          .in('batch', teacherBatchNames)
          .order('created_at', { ascending: false });
        teacherComplaints = cData || [];
      }
      setComplaints(teacherComplaints);

      // Batch Students & Attendance
      if (teacherBatchNames.length > 0) {
        const { data: studentsData } = await supabase
          .from('admissions')
          .select('id, batch, status')
          .in('batch', teacherBatchNames)
          .eq('status', 'Active');
        
        const counts = {};
        (studentsData || []).forEach(s => {
          counts[s.batch] = (counts[s.batch] || 0) + 1;
        });
        setBatchStudentCounts(counts);

        const studentIds = (studentsData || []).map(s => s.id);
        if (studentIds.length > 0) {
          const { data: attData } = await supabase
            .from('attendance')
            .select('status')
            .in('student_id', studentIds);
          
          if (attData && attData.length > 0) {
            const presentCount = attData.filter(a => a.status === 'present' || a.status === 'late').length;
            const rate = Math.round((presentCount / attData.length) * 100);
            setAttendanceStats({ totalSessions: attData.length, attendanceRate: rate });
          } else {
            setAttendanceStats({ totalSessions: 0, attendanceRate: 0 });
          }
        }
      } else {
        setBatchStudentCounts({});
        setAttendanceStats({ totalSessions: 0, attendanceRate: 0 });
      }

      // Salary Config & Payments
      if (salRes.data) {
        setSalaryConfig(salRes.data);
        setMonthlySalary(salRes.data.monthly_amount || 0);
      } else {
        setSalaryConfig(null);
        setMonthlySalary(0);
      }

      setPaymentHistory(payRes.data || []);
    } catch (err) {
      toast.error('Error loading teacher profile: ' + (err.message || ''));
      if (router.asPath?.includes('/admin/hr/')) {
        router.push('/admin/hr/teachers');
      } else {
        navigate('/admin/management/teachers');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate, router]);

  const syncTeacherLoginAccess = async () => {
    if (!teacher?.cnic) return;
    const { data: currentAssignments, error } = await supabase
      .from('teacher_batches')
      .select('batches(batch_name, course)')
      .eq('teacher_id', id);

    if (error) return;

    const assignedBatches = (currentAssignments || []).map(a => a.batches).filter(Boolean);
    const assignedBatchNames = assignedBatches.map(batch => batch.batch_name);
    const assignedCourses = Array.from(new Set(assignedBatches.map(batch => batch.course).filter(Boolean)));

    await syncTeacherAccess({
      cnic: teacher.cnic,
      name: teacher.name,
      assignedCourse: assignedCourses.join(', ') || teacher.specialization || 'Teacher',
      batch: assignedBatchNames.join(', ')
    });
  };

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  // Handler: Save Edited Teacher Details
  const handleSaveTeacherDetails = async (e) => {
    if (e) e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to edit teachers.');
      return;
    }
    setProcessing(true);
    try {
      const { error: tErr } = await supabase
        .from('teachers')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          email: editForm.email,
          specialization: editForm.specialization,
          status: editForm.status,
          notes: editForm.notes
        })
        .eq('id', id);

      if (tErr) throw tErr;

      // Sync allowed_cnics if CNIC exists
      if (teacher.cnic) {
        await syncTeacherAccess({
          cnic: teacher.cnic,
          name: editForm.name,
          assignedCourse: editForm.specialization || 'Teacher'
        });
      }

      // Sync hr_profiles if existing
      if (hrProfile?.id) {
        await supabase
          .from('hr_profiles')
          .update({
            full_name: editForm.name,
            personal_phone: editForm.phone,
            personal_email: editForm.email,
            specialization: editForm.specialization,
            updated_at: new Date().toISOString()
          })
          .eq('id', hrProfile.id);
      }

      toast.success('Teacher details updated successfully!');
      setIsEditModalOpen(false);
      fetchTeacherData();
    } catch (err) {
      toast.error('Failed to update teacher: ' + (err.message || ''));
    } finally {
      setProcessing(false);
    }
  };

  // Handler: Add Batch Assignment
  const handleAddAssignment = async () => {
    if (!canMutate) {
      toast.error('You do not have permission to modify teacher assignments.');
      return;
    }
    if (!newAssignment.batch_id) {
      toast.error('Please select a batch.');
      return;
    }
    
    const isAlreadyAssigned = assignments.some(a => a.batch_id === newAssignment.batch_id);
    if (isAlreadyAssigned) {
      toast.error('Teacher is already assigned to this batch.');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.from('teacher_batches').insert([{
        teacher_id: id,
        batch_id: newAssignment.batch_id,
        role: newAssignment.role
      }]);
      if (error) throw error;
      await syncTeacherLoginAccess();
      toast.success('Batch assigned successfully.');
      setIsManageBatchesOpen(false);
      fetchTeacherData();
      setNewAssignment({ course: '', batch_id: '', role: 'Main' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handler: Remove Batch Assignment
  const removeAssignment = async (assId, batchName) => {
    if (!canMutate) {
      toast.error('You do not have permission to modify teacher assignments.');
      return;
    }
    if (!window.confirm(\`Remove \${teacher.name} from \${batchName}?\`)) return;
    try {
      await supabase.from('teacher_batches').delete().eq('id', assId);
      await syncTeacherLoginAccess();
      toast.success('Batch assignment removed.');
      fetchTeacherData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handler: Toggle Status
  const toggleStatus = async () => {
    if (!canMutate) {
      toast.error('You do not have permission to modify teacher status.');
      return;
    }
    const nextStatus = teacher.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(\`Are you sure you want to mark this faculty member as \${nextStatus}?\`)) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('teachers').update({ status: nextStatus }).eq('id', id);
      if (error) throw error;
      await syncTeacherLoginAccess();
      setTeacher(prev => ({ ...prev, status: nextStatus }));
      toast.success(\`Teacher marked as \${nextStatus}.\`);
      fetchTeacherData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handler: Update Salary
  const handleUpdateSalary = async () => {
    if (!canMutate) {
      toast.error('You do not have permission to update salary.');
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.from('teacher_salaries').upsert({
        teacher_id: id,
        monthly_amount: monthlySalary,
        effective_from: new Date().toISOString().split('T')[0]
      }, { onConflict: 'teacher_id' });

      if (error) throw error;
      toast.success('Salary configuration updated.');
      setIsSalarySetupOpen(false);
      fetchTeacherData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handler: Generate Experience Certificate
  const handleGenerateExpCert = async () => {
    try {
      const assignedBatches = (assignments || []).map(a => a.batches).filter(Boolean);
      const taughtCourses = Array.from(new Set(assignedBatches.map(b => b.course).filter(Boolean)));
      
      const doc = await createExperienceCertificatePdf({
        teacher,
        specialization: teacher?.specialization,
        coursesTaught: taughtCourses,
        startDate: teacher?.added_on || teacher?.created_at ? new Date(teacher.added_on || teacher.created_at).toLocaleDateString('en-GB') : 'N/A',
        endDate: teacher?.status === 'Inactive' ? new Date().toLocaleDateString('en-GB') : null,
        adminNote: \`Recognized for instructional leadership and student mentorship in \${taughtCourses.join(', ') || teacher?.specialization || 'Technical Training'}.\`
      });

      const fileName = \`DeepSkills_ExpCert_\${(teacher?.name || 'Faculty').replace(/\\\\s+/g, '_')}.pdf\`;
      doc.save(fileName);
      toast.success('Experience certificate generated and downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate experience certificate: ' + (err.message || 'Error'));
    }
  };

  // Performance calculations
  const initials = useMemo(() => {
    if (!teacher?.name) return 'DS';
    return teacher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [teacher?.name]);

  const totalTasks = tasks.length;
  const totalSubmissions = tasks.reduce((sum, t) => sum + (t.submissions?.length || 0), 0);
  const gradedSubmissions = tasks.reduce((sum, t) => sum + (t.submissions?.filter(s => s.status === 'Graded').length || 0), 0);
  const gradingRate = totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 100;
  
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Closed' || c.status === 'Resolved').length;
  const complaintResolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

  const totalStudents = Object.values(batchStudentCounts).reduce((sum, count) => sum + count, 0);
  const qualityScore = Math.min(100, Math.round(
    (gradingRate * 0.4) + 
    (complaintResolutionRate * 0.3) + 
    ((attendanceStats.attendanceRate || 85) * 0.3)
  ));

  const isFromHrSection = router.asPath?.includes('/admin/hr/');

  if (loading) {
    return (
      <AdminLayout>
        <Container style={{ textAlign: 'center', paddingTop: '100px' }}>
          <FaSpinner className="spin" style={{ fontSize: '2rem', color: '#8b5cf6', marginBottom: '14px' }} />
          <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Loading faculty profile & HR records...</div>
        </Container>
      </AdminLayout>
    );
  }

  if (!teacher) {
    return (
      <AdminLayout>
        <Container style={{ textAlign: 'center', paddingTop: '80px' }}>
          <h2 style={{ color: '#f87171' }}>Teacher Not Found</h2>
          <p style={{ color: '#94a3b8' }}>The requested teacher record does not exist or has been removed.</p>
          <BackButton onClick={() => router.push(isFromHrSection ? '/admin/hr/teachers' : '/admin/management/teachers')}>
            <FaArrowLeft /> Back to Directory
          </BackButton>
        </Container>
      </AdminLayout>
    );
  }

  const currentStepNum = hrProfile?.current_step || (teacher.status === 'Active' ? 5 : 1);

  return (
    <AdminLayout>
      <Container>
        {/* BREADCRUMB */}
        <BreadcrumbNav>
          <span className="crumb" onClick={() => router.push('/admin/dashboard')}>Admin</span>
          <span className="sep"><FaChevronRight /></span>
          {isFromHrSection ? (
            <>
              <span className="crumb" onClick={() => router.push('/admin/hr/teachers')}>HR Management</span>
              <span className="sep"><FaChevronRight /></span>
            </>
          ) : (
            <>
              <span className="crumb" onClick={() => router.push('/admin/management/teachers')}>Management</span>
              <span className="sep"><FaChevronRight /></span>
            </>
          )}
          <span className="crumb" onClick={() => router.push(isFromHrSection ? '/admin/hr/teachers' : '/admin/management/teachers')}>Teachers</span>
          <span className="sep"><FaChevronRight /></span>
          <span className="active">{teacher.name}</span>
        </BreadcrumbNav>

        {/* BACK BUTTON */}
        <BackButton
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else if (isFromHrSection) {
              router.push('/admin/hr/teachers');
            } else {
              router.push('/admin/management/teachers');
            }
          }}
        >
          <FaArrowLeft /> Back to Teachers
        </BackButton>

        <Layout>
          {/* LEFT SIDEBAR CARD */}
          <SidebarCard>
            <ProfileHeader>
              <div className="avatar">{initials}</div>
              <h2>{teacher.name}</h2>
              <div className="specialization">{teacher.specialization || 'Faculty Member'}</div>
              <StatusBadge $variant={teacher.status === 'Active' ? 'success' : teacher.status === 'Pending' ? 'warning' : 'danger'}>
                {teacher.status === 'Active' ? <FaCheckCircle /> : <FaExclamationCircle />}
                {teacher.status || 'Active'}
              </StatusBadge>
            </ProfileHeader>

            <InfoGrid>
              <InfoRow>
                <span className="label"><FaPhoneAlt /> Phone</span>
                <span className="value">{teacher.phone || hrProfile?.personal_phone || '—'}</span>
              </InfoRow>
              <InfoRow>
                <span className="label"><FaIdCard /> CNIC</span>
                <span className="value">{teacher.cnic || '—'}</span>
              </InfoRow>
              <InfoRow>
                <span className="label"><FaEnvelope /> Email</span>
                <span className="value" style={{ fontSize: '0.78rem' }}>{teacher.email || hrProfile?.personal_email || '—'}</span>
              </InfoRow>
              <InfoRow>
                <span className="label"><FaBriefcase /> Experience</span>
                <span className="value">{hrProfile?.years_experience ? \`\${hrProfile.years_experience} Years\` : 'Not specified'}</span>
              </InfoRow>
              <InfoRow>
                <span className="label"><FaCalendarAlt /> Joined</span>
                <span className="value">
                  {teacher.added_on || teacher.created_at ? new Date(teacher.added_on || teacher.created_at).toLocaleDateString('en-GB') : '—'}
                </span>
              </InfoRow>
            </InfoGrid>

            <BatchChipsSection>
              <div className="chip-header">
                <span>Active Batches ({assignments.length})</span>
              </div>
              <div className="chip-list">
                {assignments.map(a => (
                  <div className="batch-chip" key={a.id}>
                    <span className={\`role-dot \${a.role === 'Assistant' ? 'assistant' : ''}\`} />
                    <span>{a.batches?.batch_name || 'Batch'}</span>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>No batches assigned</span>
                )}
              </div>
            </BatchChipsSection>

            {/* STREAMLINED ACTION BUTTONS (NO DEAD BUTTONS) */}
            {canMutate ? (
              <ActionButtons>
                <ActionBtn className="edit" onClick={() => setIsEditModalOpen(true)}>
                  <FaEdit /> Edit Profile
                </ActionBtn>
                
                <ActionBtn 
                  className={teacher.status === 'Active' ? 'status-active' : 'status-inactive'} 
                  onClick={toggleStatus}
                  disabled={processing}
                >
                  {teacher.status === 'Active' ? (
                    <><FaUserSlash /> Mark Inactive</>
                  ) : (
                    <><FaCheckCircle /> Activate Faculty</>
                  )}
                </ActionBtn>

                <ActionBtn className="cert" onClick={handleGenerateExpCert}>
                  <FaAward /> Experience Certificate
                </ActionBtn>
              </ActionButtons>
            ) : (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
                <FaShieldAlt style={{ marginRight: '6px' }} /> View-only privileges
              </div>
            )}
          </SidebarCard>

          {/* RIGHT MAIN AREA */}
          <MainContent>
            <TabContainer>
              <TabBar>
                {[
                  { key: 'Overview', label: 'Overview & HR', count: null },
                  { key: 'Batches', label: 'Batches', count: assignments.length },
                  { key: 'Performance', label: 'Performance', count: null },
                  { key: 'Tasks', label: 'Tasks', count: tasks.length },
                  { key: 'Complaints', label: 'Complaints', count: complaints.length },
                  { key: 'Finance', label: 'Finance & Salary', count: null }
                ].map(t => (
                  <Tab 
                    key={t.key} 
                    $active={activeTab === t.key} 
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                    {t.count !== null && <span className="badge">{t.count}</span>}
                  </Tab>
                ))}
              </TabBar>

              <TabBody>
                {/* 1. OVERVIEW & HR TAB */}
                {activeTab === 'Overview' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* HR Pipeline Tracker */}
                    <PipelineProgressCard>
                      <div className="top-row">
                        <div className="title-group">
                          <FaUserCheck style={{ color: '#c4b5fd' }} />
                          <span>HR Onboarding Pipeline</span>
                        </div>
                        <StatusBadge $variant={hrProfile?.hr_status === 'hired' ? 'success' : hrProfile?.hr_status === 'rejected' ? 'danger' : 'info'}>
                          {hrProfile?.hr_status ? \`Status: \${hrProfile.hr_status.toUpperCase()}\` : 'Status: ACTIVE FACULTY'}
                        </StatusBadge>
                      </div>

                      <div className="steps-pills">
                        {HR_STEPS.map(s => {
                          const isDone = s.step < currentStepNum || hrProfile?.hr_status === 'hired';
                          const isCur = s.step === currentStepNum && hrProfile?.hr_status !== 'hired';
                          return (
                            <div 
                              key={s.step} 
                              className={\`step-pill \${isDone ? 'done' : isCur ? 'active' : ''}\`}
                            >
                              {isDone ? <FaCheck style={{ fontSize: '0.65rem' }} /> : isCur ? <FaClock style={{ fontSize: '0.65rem' }} /> : <FaLock style={{ fontSize: '0.65rem' }} />}
                              <span>{s.step}. {s.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="meter-bar">
                        <div 
                          className="meter-fill" 
                          style={{ width: \`\${hrProfile?.hr_status === 'hired' ? 100 : Math.min(100, currentStepNum * 20)}%\` }} 
                        />
                      </div>
                    </PipelineProgressCard>

                    {/* Academic & Professional Info */}
                    <SectionCard>
                      <SectionTitle>
                        <FaGraduationCap className="icon" />
                        <span>Professional & Academic Background</span>
                      </SectionTitle>
                      <KeyValGrid>
                        <KeyValItem>
                          <span className="k">Specialization / Discipline</span>
                          <span className="v">{teacher.specialization || hrProfile?.specialization || 'General Instruction'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Years of Teaching Experience</span>
                          <span className="v">{hrProfile?.years_experience ? \`\${hrProfile.years_experience} Years\` : 'Not provided'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Last Employer / Institution</span>
                          <span className="v">{hrProfile?.last_employer || '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Teaching Mode Preference</span>
                          <span className="v">{hrProfile?.teaching_mode || 'Onsite'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Expected Compensation</span>
                          <span className="v">{hrProfile?.expected_salary ? \`PKR \${Number(hrProfile.expected_salary).toLocaleString()} / Month\` : '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">LinkedIn / Portfolio</span>
                          <span className="v">
                            {hrProfile?.linkedin ? (
                              <a href={hrProfile.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                View Profile <FaExternalLinkAlt style={{ fontSize: '0.75rem' }} />
                              </a>
                            ) : '—'}
                          </span>
                        </KeyValItem>
                      </KeyValGrid>
                    </SectionCard>

                    {/* Contact & Residential Details */}
                    <SectionCard>
                      <SectionTitle>
                        <FaMapMarkerAlt className="icon" />
                        <span>Contact & Residential Details</span>
                      </SectionTitle>
                      <KeyValGrid>
                        <KeyValItem>
                          <span className="k">Primary Contact Phone</span>
                          <span className="v">{teacher.phone || hrProfile?.personal_phone || '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Official / Personal Email</span>
                          <span className="v">{teacher.email || hrProfile?.personal_email || '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Current Residential Address</span>
                          <span className="v">{hrProfile?.current_address || '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Permanent Address</span>
                          <span className="v">{hrProfile?.permanent_address || '—'}</span>
                        </KeyValItem>
                      </KeyValGrid>
                    </SectionCard>

                    {/* Emergency Contact */}
                    <SectionCard>
                      <SectionTitle>
                        <FaHeartbeat className="icon" style={{ color: '#f59e0b' }} />
                        <span>Emergency & Next-of-Kin Contact</span>
                      </SectionTitle>
                      <KeyValGrid>
                        <KeyValItem>
                          <span className="k">Contact Person Name</span>
                          <span className="v">{hrProfile?.emergency_name || '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Relationship</span>
                          <span className="v">{hrProfile?.emergency_relationship || '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Emergency Phone Number</span>
                          <span className="v">{hrProfile?.emergency_phone || '—'}</span>
                        </KeyValItem>
                        <KeyValItem>
                          <span className="k">Joining Date</span>
                          <span className="v">
                            {hrProfile?.available_to_join || (teacher.added_on ? new Date(teacher.added_on).toLocaleDateString('en-GB') : '—')}
                          </span>
                        </KeyValItem>
                      </KeyValGrid>
                    </SectionCard>

                    {/* Admin Internal Notes */}
                    {teacher.notes && (
                      <SectionCard>
                        <SectionTitle>
                          <FaShieldAlt className="icon" />
                          <span>Administrative Notes</span>
                        </SectionTitle>
                        <div style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6', background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '8px' }}>
                          {teacher.notes}
                        </div>
                      </SectionCard>
                    )}
                  </motion.div>
                )}

                {/* 2. BATCHES TAB */}
                {activeTab === 'Batches' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                      <h4 style={{ margin: 0, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                        Assigned Batches & Classrooms ({assignments.length})
                      </h4>
                      {canMutate && (
                        <PrimaryBtn onClick={() => setIsManageBatchesOpen(true)}>
                          <FaPlus /> Assign New Batch
                        </PrimaryBtn>
                      )}
                    </div>

                    <TableWrap>
                      <Table>
                        <thead>
                          <tr>
                            <th>Batch Name</th>
                            <th>Course</th>
                            <th>Role</th>
                            <th>Shift / Timing</th>
                            <th>Enrolled Students</th>
                            {canMutate && <th style={{ textAlign: 'right' }}>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map(a => {
                            const batchName = a.batches?.batch_name || 'Batch';
                            const studentCount = batchStudentCounts[batchName] || 0;
                            return (
                              <tr key={a.id}>
                                <td style={{ fontWeight: '700', color: '#fff' }}>{batchName}</td>
                                <td style={{ color: '#cbd5e1' }}>{a.batches?.course || '—'}</td>
                                <td>
                                  <StatusBadge $variant={a.role === 'Main' ? 'info' : 'warning'}>
                                    {a.role || 'Main'} Teacher
                                  </StatusBadge>
                                </td>
                                <td style={{ color: '#94a3b8' }}>{a.batches?.time_shift || a.batches?.timing_label || 'Regular'}</td>
                                <td style={{ fontWeight: '600', color: '#10b981' }}>{studentCount} active students</td>
                                {canMutate && (
                                  <td style={{ textAlign: 'right' }}>
                                    <button 
                                      onClick={() => removeAssignment(a.id, batchName)}
                                      style={{ 
                                        background: 'rgba(239, 68, 68, 0.1)', 
                                        border: '1px solid rgba(239, 68, 68, 0.25)', 
                                        color: '#f87171', 
                                        padding: '5px 12px', 
                                        borderRadius: '6px', 
                                        cursor: 'pointer', 
                                        fontSize: '0.78rem',
                                        fontWeight: '600',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          {assignments.length === 0 && (
                            <tr>
                              <td colSpan={canMutate ? 6 : 5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                No batches currently assigned to this faculty member.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </TableWrap>
                  </motion.div>
                )}

                {/* 3. PERFORMANCE TAB */}
                {activeTab === 'Performance' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Faculty Quality & Compliance Index Banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(123,31,46,0.18), rgba(17,19,24,0.95))',
                      border: '1px solid rgba(123,31,46,0.35)',
                      borderRadius: '14px',
                      padding: '22px 24px',
                      marginBottom: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(123,31,46,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fda4af',
                            fontSize: '1.3rem',
                            border: '1px solid rgba(123,31,46,0.4)'
                          }}>
                            <FaAward />
                          </div>
                          <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              Faculty Quality & Compliance Index
                              <StatusBadge $variant={qualityScore >= 85 ? 'success' : qualityScore >= 70 ? 'info' : 'warning'}>
                                {qualityScore >= 85 ? 'Exemplary Rating' : qualityScore >= 70 ? 'Good Standing' : 'Review Required'}
                              </StatusBadge>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '3px' }}>
                              Composite metric factoring grading turnaround, attendance consistency, and ticket health.
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', lineHeight: 1 }}>
                              {qualityScore}<span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>/100</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Rating</div>
                          </div>
                          <PrimaryBtn type="button" onClick={handleGenerateExpCert}>
                            <FaDownload /> Experience Certificate
                          </PrimaryBtn>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        paddingTop: '14px',
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaCheckCircle style={{ color: gradingRate >= 70 ? '#34d399' : '#fbbf24' }} />
                          <span>Grading Pace: <strong>{gradingRate}% Completed</strong></span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaCheckCircle style={{ color: (attendanceStats?.attendanceRate || 0) >= 75 ? '#34d399' : '#fbbf24' }} />
                          <span>Student Presence: <strong>{attendanceStats?.attendanceRate || 0}% Avg</strong></span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaCheckCircle style={{ color: complaintResolutionRate >= 80 ? '#34d399' : '#fbbf24' }} />
                          <span>Complaint Health: <strong>{complaintResolutionRate}% Resolved</strong></span>
                        </div>
                      </div>
                    </div>

                    <StatsGrid>
                      <MiniStat>
                        <div className="val">{gradingRate}%</div>
                        <div className="lab">Task Grading ({gradedSubmissions}/{totalSubmissions})</div>
                      </MiniStat>
                      <MiniStat>
                        <div className="val">{complaintResolutionRate}%</div>
                        <div className="lab">Complaints Solved ({resolvedComplaints}/{totalComplaints})</div>
                      </MiniStat>
                      <MiniStat>
                        <div className="val">{totalStudents}</div>
                        <div className="lab">Active Enrolled Students</div>
                      </MiniStat>
                    </StatsGrid>

                    <PerformanceBar percent={attendanceStats.attendanceRate}>
                      <div className="header">
                        <span>Student Batch Attendance</span>
                        <span>{attendanceStats.attendanceRate}% ({attendanceStats.totalSessions} sessions logged)</span>
                      </div>
                      <div className="track"><div className="fill" /></div>
                    </PerformanceBar>

                    <PerformanceBar percent={Math.min(100, Math.round((totalTasks / 10) * 100))}>
                      <div className="header">
                        <span>Curriculum Tasks Assigned</span>
                        <span>{totalTasks} Total Tasks</span>
                      </div>
                      <div className="track"><div className="fill" /></div>
                    </PerformanceBar>
                  </motion.div>
                )}

                {/* 4. TASKS TAB */}
                {activeTab === 'Tasks' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ marginBottom: '18px' }}>
                      <h4 style={{ margin: 0, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                        Assigned Tasks & Submissions ({tasks.length})
                      </h4>
                    </div>

                    <TableWrap>
                      <Table>
                        <thead>
                          <tr>
                            <th>Task Title</th>
                            <th>Batch / Course</th>
                            <th>Category</th>
                            <th>Due Date</th>
                            <th>Submissions</th>
                            <th>Grading Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => {
                            const subCount = t.submissions?.length || 0;
                            const gradedCount = t.submissions?.filter(s => s.status === 'Graded').length || 0;
                            return (
                              <tr key={t.id}>
                                <td style={{ fontWeight: '600', color: '#fff' }}>{t.title}</td>
                                <td>
                                  <div>{t.course}</div>
                                  <div style={{ color: '#8b5cf6', fontSize: '0.78rem' }}>{t.batch}</div>
                                </td>
                                <td>{t.category || 'Assignment'}</td>
                                <td>{t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB') : '—'}</td>
                                <td>{subCount} submitted</td>
                                <td>
                                  <StatusBadge $variant={gradedCount === subCount && subCount > 0 ? 'success' : gradedCount > 0 ? 'info' : 'warning'}>
                                    {gradedCount}/{subCount} Graded
                                  </StatusBadge>
                                </td>
                              </tr>
                            );
                          })}
                          {tasks.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                No tasks assigned by this faculty member yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </TableWrap>
                  </motion.div>
                )}

                {/* 5. COMPLAINTS TAB */}
                {activeTab === 'Complaints' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ marginBottom: '18px' }}>
                      <h4 style={{ margin: 0, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                        Student Inquiries & Complaints ({complaints.length})
                      </h4>
                    </div>

                    <TableWrap>
                      <Table>
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Student CNIC</th>
                            <th>Batch</th>
                            <th>Status</th>
                            <th>Date Raised</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complaints.map(c => (
                            <tr key={c.id}>
                              <td>
                                <div style={{ fontWeight: '600', color: '#fff' }}>{c.subject}</div>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '300px' }}>
                                  {c.description?.substring(0, 60)}{c.description?.length > 60 ? '...' : ''}
                                </div>
                              </td>
                              <td style={{ color: '#cbd5e1' }}>{c.student_cnic}</td>
                              <td style={{ color: '#8b5cf6' }}>{c.batch}</td>
                              <td>
                                <StatusBadge $variant={c.status === 'Closed' || c.status === 'Resolved' ? 'success' : c.status === 'In Progress' ? 'info' : 'warning'}>
                                  {c.status}
                                </StatusBadge>
                              </td>
                              <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                                {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '—'}
                              </td>
                            </tr>
                          ))}
                          {complaints.length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                No student complaints recorded for this instructor.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </TableWrap>
                  </motion.div>
                )}

                {/* 6. FINANCE & SALARY TAB */}
                {activeTab === 'Finance' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
                      <StatsGrid style={{ flex: 1, marginBottom: 0 }}>
                        <MiniStat>
                          <div className="val">PKR {salaryConfig?.monthly_amount ? Number(salaryConfig.monthly_amount).toLocaleString() : '0'}</div>
                          <div className="lab">Monthly Base Salary</div>
                        </MiniStat>
                        <MiniStat>
                          <div className="val">{paymentHistory.length}</div>
                          <div className="lab">Disbursed Payments</div>
                        </MiniStat>
                      </StatsGrid>
                      {canMutate && (
                        <PrimaryBtn onClick={() => setIsSalarySetupOpen(true)}>
                          <FaEdit /> Setup / Edit Salary
                        </PrimaryBtn>
                      )}
                    </div>

                    <h4 style={{ marginBottom: '14px', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                      Payment & Disbursement History
                    </h4>

                    <TableWrap>
                      <Table>
                        <thead>
                          <tr>
                            <th>Month / Description</th>
                            <th>Amount</th>
                            <th>Paid Date</th>
                            <th>Payment Method</th>
                            <th>Reference Number</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.map(p => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: '600' }}>{p.description || 'Monthly Salary'}</td>
                              <td style={{ fontWeight: '700', color: '#10b981' }}>PKR {Number(p.amount || 0).toLocaleString()}</td>
                              <td>{p.paid_date ? new Date(p.paid_date).toLocaleDateString('en-GB') : '—'}</td>
                              <td style={{ textTransform: 'capitalize' }}>{p.method?.replace('_', ' ') || 'Bank Transfer'}</td>
                              <td style={{ color: '#64748b' }}>{p.reference_number || '—'}</td>
                            </tr>
                          ))}
                          {paymentHistory.length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                No payment disbursement records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </TableWrap>
                  </motion.div>
                )}
              </TabBody>
            </TabContainer>
          </MainContent>
        </Layout>
      </Container>

      {/* MODALS */}
      <AnimatePresence>
        {/* 1. EDIT TEACHER PROFILE MODAL */}
        {isEditModalOpen && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalContent initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }}>
              <ModalHeader>
                <h3>Edit Teacher Profile</h3>
                <button type="button" onClick={() => setIsEditModalOpen(false)}><FaTimes /></button>
              </ModalHeader>

              <form onSubmit={handleSaveTeacherDetails} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FormGroup>
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <label>Specialization / Subject</label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    placeholder="e.g. Full Stack Development, Flutter, AI"
                  />
                </FormGroup>

                <FormGroup>
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </FormGroup>

                <FormGroup>
                  <label>Administrative Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Internal HR notes or remarks..."
                  />
                </FormGroup>

                <ModalActionRow>
                  <SecondaryBtn type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</SecondaryBtn>
                  <PrimaryBtn type="submit" disabled={processing}>
                    {processing ? <><FaSpinner className="spin" /> Saving...</> : 'Save Changes'}
                  </PrimaryBtn>
                </ModalActionRow>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* 2. MANAGE / ASSIGN BATCHES MODAL */}
        {isManageBatchesOpen && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalContent initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }}>
              <ModalHeader>
                <h3>Assign Batch to Teacher</h3>
                <button type="button" onClick={() => setIsManageBatchesOpen(false)}><FaTimes /></button>
              </ModalHeader>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FormGroup>
                  <label>Course</label>
                  <select 
                    value={newAssignment.course} 
                    onChange={e => setNewAssignment({ ...newAssignment, course: e.target.value, batch_id: '' })}
                  >
                    <option value="">Select Course</option>
                    {allCourses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                  </select>
                </FormGroup>

                <FormGroup>
                  <label>Batch</label>
                  <select 
                    value={newAssignment.batch_id} 
                    onChange={e => setNewAssignment({ ...newAssignment, batch_id: e.target.value })}
                    disabled={!newAssignment.course}
                  >
                    <option value="">Select Batch</option>
                    {allBatches
                      .filter(b => b.course === newAssignment.course)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.batch_name} ({b.time_shift || 'Regular'})
                        </option>
                      ))}
                  </select>
                </FormGroup>

                <FormGroup>
                  <label>Faculty Role</label>
                  <select 
                    value={newAssignment.role} 
                    onChange={e => setNewAssignment({ ...newAssignment, role: e.target.value })}
                  >
                    <option value="Main">Main Teacher</option>
                    <option value="Assistant">Assistant Teacher</option>
                  </select>
                </FormGroup>

                <ModalActionRow>
                  <SecondaryBtn type="button" onClick={() => setIsManageBatchesOpen(false)}>Cancel</SecondaryBtn>
                  <PrimaryBtn type="button" onClick={handleAddAssignment} disabled={processing || !newAssignment.batch_id}>
                    {processing ? <><FaSpinner className="spin" /> Assigning...</> : 'Confirm Assignment'}
                  </PrimaryBtn>
                </ModalActionRow>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* 3. SETUP SALARY MODAL */}
        {isSalarySetupOpen && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalContent initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }}>
              <ModalHeader>
                <h3>Setup Faculty Compensation</h3>
                <button type="button" onClick={() => setIsSalarySetupOpen(false)}><FaTimes /></button>
              </ModalHeader>

              <div style={{ padding: '12px 14px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', color: '#c4b5fd', fontSize: '0.84rem', lineHeight: '1.5' }}>
                Set the fixed monthly base compensation for this teacher. This automatically syncs across Payroll, Finance Manager, and HR reporting.
              </div>

              <FormGroup>
                <label>Monthly Salary (PKR) *</label>
                <input 
                  type="number" 
                  min="0"
                  step="1000"
                  value={monthlySalary} 
                  onChange={(e) => setMonthlySalary(parseInt(e.target.value, 10) || 0)} 
                />
              </FormGroup>

              <ModalActionRow>
                <SecondaryBtn type="button" onClick={() => setIsSalarySetupOpen(false)}>Cancel</SecondaryBtn>
                <PrimaryBtn type="button" onClick={handleUpdateSalary} disabled={processing}>
                  {processing ? <><FaSpinner className="spin" /> Saving...</> : 'Save Salary'}
                </PrimaryBtn>
              </ModalActionRow>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default TeacherProfile;
`;

fs.writeFileSync('src/admin/TeacherProfile.js', code, 'utf8');
console.log('TeacherProfile.js created successfully!');
