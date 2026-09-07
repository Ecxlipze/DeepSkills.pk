import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminHRTable from '../components/hr/AdminHRTable';
import AdminHRDrawer from '../components/hr/AdminHRDrawer';
import AdminJDComposer from '../components/hr/AdminJDComposer';
import AdminFinalizeHiringModal from '../components/hr/AdminFinalizeHiringModal';
import {
  createJDDraft,
  fetchAdminHRApplications,
  fetchJDTemplates,
  finalizeHiring,
  rejectApplication,
  sendJD,
  fetchTeacherLeaves,
  recordTeacherLeave,
  reviewTeacherLeave
} from '../utils/hrApi';
import {
  createAcceptanceLetterPdf,
  createHiringFilePdf,
  createExperienceCertificatePdf
} from '../utils/hrPdf';
import { syncTeacherAccess } from '../utils/adminAccessApi';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { supabase } from '../supabaseClient';
import {
  FaHome,
  FaClipboardList,
  FaFileAlt,
  FaSignature,
  FaFolder,
  FaUsers,
  FaCog,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaDownload,
  FaSearch,
  FaFilter,
  FaArrowRight,
  FaEye,
  FaExclamationTriangle,
  FaFilePdf,
  FaCheck,
  FaWhatsapp,
  FaAward,
  FaCalendarCheck,
  FaPlus,
  FaTimes,
  FaUserCheck,
  FaUserTimes,
  FaCopy,
  FaPaperPlane,
  FaUserPlus,
  FaPhoneAlt,
  FaEnvelope,
  FaIdCard
} from 'react-icons/fa';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #fff;
  padding-bottom: 40px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
  overflow-x: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  .title-block {
    h1 {
      font-size: 1.8rem;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;

      svg {
        color: #8B5CF6;
      }
    }

    p {
      color: #94a3b8;
      font-size: 0.92rem;
      margin: 0;
    }
  }
`;

const NavTabs = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
  overflow-x: auto;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabButton = styled.button`
  background: ${p => p.$active ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${p => p.$active ? '#a78bfa' : '#94a3b8'};
  border: 1px solid ${p => p.$active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: #fff;
    border-color: rgba(139, 92, 246, 0.3);
  }

  .badge {
    background: ${p => p.$active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)'};
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid ${p => p.$highlight ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;

  ${p => p.$highlight && `
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.12);
  `}

  .label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }

  .value {
    font-size: 1.8rem;
    font-weight: 800;
    color: ${p => p.$color || '#fff'};
    line-height: 1.1;
  }

  .sub {
    font-size: 0.74rem;
    color: #64748b;
  }
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const CardPanel = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;

  @media (max-width: 600px) {
    padding: 16px 14px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px;

    h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
      svg {
        color: #8B5CF6;
        font-size: 0.95rem;
      }
    }

    button, a {
      background: none;
      border: none;
      color: #a78bfa;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0;
      &:hover {
        color: #c4b5fd;
        text-decoration: underline;
      }
    }
  }
`;

const PipelineFunnel = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FunnelStep = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${p => p.$active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  box-sizing: border-box;

  .step-num {
    font-size: 0.7rem;
    font-weight: 800;
    color: #8B5CF6;
    text-transform: uppercase;
  }

  .step-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  .step-count {
    font-size: 1.3rem;
    font-weight: 800;
    color: #fff;
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 14px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 640px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
`;

const Filters = FilterCard;

const SearchInputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: ${p => p.$fullWidth ? '100%' : '460px'};
  box-sizing: border-box;

  @media (max-width: 640px) {
    max-width: 100%;
    min-width: 100%;
    width: 100%;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    pointer-events: none;
    font-size: 0.9rem;
    transition: color 0.2s ease;
  }

  &:focus-within .search-icon {
    color: #a78bfa;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.03);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 10px 38px 10px 38px;
    font-size: 0.88rem;
    transition: all 0.2s ease;
    outline: none;

    &::placeholder {
      color: #64748b;
      font-size: 0.84rem;
    }

    &:hover {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.05);
    }

    &:focus {
      outline: none;
      border-color: #8B5CF6;
      background: rgba(139, 92, 246, 0.06);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
    }
  }

  .clear-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #94a3b8;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
  }
`;

const Select = styled.select`
  background: #111318;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.86rem;
  cursor: pointer;
  outline: none;
  box-sizing: border-box;
  max-width: 100%;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-color: #8B5CF6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
  }

  option {
    background: #111318;
    color: #fff;
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const FilterMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 0.82rem;
  flex-wrap: wrap;
  box-sizing: border-box;

  .counter {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.25);
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .reset-link {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 0.78rem;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    white-space: nowrap;
    transition: color 0.15s ease;
    &:hover {
      color: #fff;
    }
  }

  @media (max-width: 900px) {
    justify-content: space-between;
    width: 100%;
  }
`;

const FilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  box-sizing: border-box;

  @media (max-width: 900px) {
    width: 100%;
    justify-content: space-between;
  }

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const TableWrap = styled.div`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;

  th, td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #fff;
    font-size: 0.88rem;
  }

  th {
    color: #8e97a8;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.01);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  background: ${p => p.$bg || 'rgba(139, 92, 246, 0.14)'};
  color: ${p => p.$color || '#a78bfa'};
  border: 1px solid ${p => p.$border || 'rgba(139, 92, 246, 0.25)'};
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${({ $danger, $primary, $success, $whatsapp }) => {
    if ($whatsapp) return '#25D366';
    if ($danger) return 'transparent';
    if ($success) return '#10b981';
    if ($primary) return '#8B5CF6';
    return 'rgba(255, 255, 255, 0.04)';
  }};
  color: ${({ $danger, $whatsapp }) => {
    if ($whatsapp) return '#fff';
    if ($danger) return '#ef4444';
    return '#fff';
  }};
  border: 1px solid ${({ $danger, $success, $primary, $whatsapp }) => {
    if ($whatsapp) return '#25D366';
    if ($danger) return 'rgba(239, 68, 68, 0.4)';
    if ($success) return '#10b981';
    if ($primary) return '#8B5CF6';
    return 'rgba(255, 255, 255, 0.12)';
  }};
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    opacity: 0.88;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 20px;
`;

const ModalCard = styled.div`
  width: min(600px, 100%);
  background: #111318;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 24px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 16px;

  h2 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    svg { color: #8B5CF6; }
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    color: #94a3b8;
    font-weight: 600;

    input, select, textarea {
      background: #0a0a0a;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.88rem;
      &:focus { outline: none; border-color: #8B5CF6; }
    }

    textarea {
      min-height: 80px;
      resize: vertical;
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
`;

const ModeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.02);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 550px) {
    grid-template-columns: 1fr;
  }
`;

const ModeButton = styled.button`
  background: ${p => p.$active ? 'rgba(139, 92, 246, 0.22)' : 'transparent'};
  color: ${p => p.$active ? '#c4b5fd' : '#94a3b8'};
  border: 1px solid ${p => p.$active ? 'rgba(139, 92, 246, 0.5)' : 'transparent'};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    color: #fff;
  }
`;

const InfoBox = styled.div`
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 0.82rem;
  color: #c4b5fd;
  margin-bottom: 14px;
  line-height: 1.45;
`;

const getTeacherWhatsAppUrl = (phone, text) => {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;
  let intlPhone = clean;
  if (clean.startsWith('0')) {
    intlPhone = `92${clean.slice(1)}`;
  } else if (!clean.startsWith('92') && clean.length === 10) {
    intlPhone = `92${clean}`;
  }
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
};

const findTemplateForApplication = (templates, application, employmentType) => {
  const specialization = application.profile.specialization || application.teacher?.specialization || 'Generic';
  return (
    templates.find((template) => template.specialization === specialization && template.employment_type === employmentType) ||
    templates.find((template) => template.specialization === specialization) ||
    templates.find((template) => /generic/i.test(template.specialization)) ||
    templates[0] ||
    null
  );
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const AdminHRManagement = ({ initialView }) => {
  const { user } = useAuth();
  const canMutate = Boolean(user?.role === 'admin' || canAccess(user?.permissions || {}, 'hr', 'full'));
  const location = useLocation();
  const navigate = useNavigate();

  const pathSegment = location.pathname.split('/')[3];
  const activeView = initialView || pathSegment || 'overview';

  const [applications, setApplications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jdSearch, setJdSearch] = useState('');
  const [jdStatusFilter, setJdStatusFilter] = useState('all');
  const [sigSearch, setSigSearch] = useState('');
  const [sigStatusFilter, setSigStatusFilter] = useState('all');
  const [filesSearch, setFilesSearch] = useState('');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherCourseFilter, setTeacherCourseFilter] = useState('all');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [composerApplication, setComposerApplication] = useState(null);
  const [composerTemplateId, setComposerTemplateId] = useState('');
  const [composerDraft, setComposerDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(null);

  // Teacher modal states
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [addTeacherMode, setAddTeacherMode] = useState('invite');
  const [inviteSuccessData, setInviteSuccessData] = useState(null);
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [addTeacherForm, setAddTeacherForm] = useState({
    name: '',
    cnic: '',
    phone: '',
    email: '',
    specialization: '',
    salary: '',
    course_id: '',
    selectedBatches: [],
    notes: ''
  });

  // Leave modals
  const [recordLeaveOpen, setRecordLeaveOpen] = useState(false);
  const [newLeaveForm, setNewLeaveForm] = useState({
    teacherId: '',
    startDate: '',
    endDate: '',
    leaveType: 'Casual',
    reason: '',
    adminNotes: ''
  });
  const [reviewLeaveTarget, setReviewLeaveTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');
  const [substituteTeacherId, setSubstituteTeacherId] = useState('');
  const [substituteNotes, setSubstituteNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [apps, jdTemplates, leavesData, teachersRes, coursesRes, batchesRes, assignmentsRes] = await Promise.all([
        fetchAdminHRApplications(),
        fetchJDTemplates(),
        fetchTeacherLeaves(),
        supabase.from('teachers').select('*').order('name'),
        supabase.from('courses').select('*'),
        supabase.from('batches').select('*'),
        supabase.from('teacher_batches').select('*, batches(batch_name, course)')
      ]);
      setApplications(apps || []);
      setTemplates(jdTemplates || []);
      setLeaves(leavesData || []);

      const teacherList = (teachersRes.data || []).map(t => ({
        ...t,
        assignments: (assignmentsRes.data || []).filter(a => a.teacher_id === t.id)
      }));
      setTeachersList(teacherList);
      setCourses(coursesRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load HR records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.profile.hr_status === 'pending').length;
    const jdSent = applications.filter((a) => a.profile.hr_status === 'jd_sent').length;
    const jdApproved = applications.filter((a) => a.jd?.teacher_status === 'approved').length;
    const changesRequested = applications.filter((a) => a.jd?.teacher_status === 'changes_requested').length;
    const signed = applications.filter((a) => a.profile.hr_status === 'signed' || a.signature).length;
    const hired = applications.filter((a) => a.profile.hr_status === 'hired').length;
    const rejected = applications.filter((a) => a.profile.hr_status === 'rejected').length;

    const step1 = applications.filter((a) => a.profile.step === 1).length;
    const step2 = applications.filter((a) => a.profile.step === 2).length;
    const step3 = applications.filter((a) => a.profile.step === 3).length;
    const step4 = applications.filter((a) => a.profile.step === 4).length;
    const step5 = applications.filter((a) => a.profile.step >= 5 || a.profile.hr_status === 'hired').length;

    return {
      total,
      pending,
      jdSent,
      jdApproved,
      changesRequested,
      signed,
      hired,
      rejected,
      step1,
      step2,
      step3,
      step4,
      step5
    };
  }, [applications]);

  const leaveStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === 'Pending').length;
    const approved = leaves.filter((l) => l.status === 'Approved').length;
    const onLeaveToday = leaves.filter((l) => (
      l.status === 'Approved' && l.start_date <= today && l.end_date >= today
    )).length;

    return { total, pending, approved, onLeaveToday };
  }, [leaves]);

  const filteredApplications = useMemo(() => applications.filter((application) => {
    const haystack = `${application.teacher?.name || ''} ${application.profile.full_name || ''} ${application.profile.cnic || ''} ${application.profile.specialization || ''} ${application.profile.email || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || application.profile.hr_status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [applications, search, statusFilter]);

  const applicationsWithJds = useMemo(() => applications.filter((a) => a.jd || a.profile.step >= 3), [applications]);
  const filteredJds = useMemo(() => {
    return applicationsWithJds.filter((app) => {
      const teacherName = app.teacher?.name || app.profile.full_name || '';
      const spec = app.profile.specialization || app.jd?.position_title || '';
      const empType = app.jd?.employment_type || '';
      const haystack = `${teacherName} ${spec} ${empType}`.toLowerCase();
      const matchesSearch = !jdSearch || haystack.includes(jdSearch.toLowerCase());
      
      let matchesStatus = true;
      if (jdStatusFilter === 'approved') matchesStatus = app.jd?.teacher_status === 'approved';
      else if (jdStatusFilter === 'changes_requested') matchesStatus = app.jd?.teacher_status === 'changes_requested';
      else if (jdStatusFilter === 'sent') matchesStatus = Boolean(app.jd?.is_sent_to_teacher && app.jd?.teacher_status !== 'approved');
      else if (jdStatusFilter === 'draft') matchesStatus = !app.jd?.is_sent_to_teacher;
      
      return matchesSearch && matchesStatus;
    });
  }, [applicationsWithJds, jdSearch, jdStatusFilter]);

  const applicationsWithSignatures = useMemo(() => applications.filter((a) => a.signature || a.profile.step >= 4), [applications]);
  const filteredSignatures = useMemo(() => {
    return applicationsWithSignatures.filter((app) => {
      const teacherName = app.teacher?.name || app.profile.full_name || '';
      const cnic = app.profile.cnic || '';
      const spec = app.profile.specialization || '';
      const haystack = `${teacherName} ${cnic} ${spec}`.toLowerCase();
      const matchesSearch = !sigSearch || haystack.includes(sigSearch.toLowerCase());
      const isHired = app.profile.hr_status === 'hired';
      const matchesStatus = sigStatusFilter === 'all' 
        ? true 
        : sigStatusFilter === 'hired' ? isHired : !isHired;
      return matchesSearch && matchesStatus;
    });
  }, [applicationsWithSignatures, sigSearch, sigStatusFilter]);

  const hiredApplications = useMemo(() => applications.filter((a) => a.profile.hr_status === 'hired' || a.profile.step >= 5), [applications]);
  const filteredFiles = useMemo(() => {
    return hiredApplications.filter((app) => {
      const teacherName = app.teacher?.name || app.profile.full_name || '';
      const cnic = app.profile.cnic || '';
      const spec = app.profile.specialization || '';
      const email = app.profile.email || app.teacher?.email || '';
      const haystack = `${teacherName} ${cnic} ${spec} ${email}`.toLowerCase();
      return !filesSearch || haystack.includes(filesSearch.toLowerCase());
    });
  }, [hiredApplications, filesSearch]);

  const filteredLeaves = useMemo(() => leaves.filter((l) => {
    const teacherName = l.teacher?.name || '';
    const haystack = `${teacherName} ${l.leave_type || ''} ${l.reason || ''} ${l.substitute_teacher_name || ''}`.toLowerCase();
    const matchesSearch = !leaveSearch || haystack.includes(leaveSearch.toLowerCase());
    const matchesStatus = leaveStatusFilter === 'all' || l.status === leaveStatusFilter;
    return matchesSearch && matchesStatus;
  }), [leaves, leaveSearch, leaveStatusFilter]);

  const openComposer = (application) => {
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    const employmentType = application.jd?.employment_type || 'Full-time';
    const template = findTemplateForApplication(templates, application, employmentType);
    const draft = template
      ? createJDDraft(application.profile, template, { employmentType, workingHours: template.working_hours })
      : null;

    setComposerApplication(application);
    setComposerTemplateId(template?.id || '');
    setComposerDraft(draft);
    setComposerOpen(true);
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template || !composerApplication) return;
    const draft = createJDDraft(composerApplication.profile, template, {
      employmentType: template.employment_type,
      workingHours: template.working_hours
    });
    setComposerTemplateId(templateId);
    setComposerDraft(draft);
  };

  const handleSendJd = async (draft) => {
    if (!composerApplication) return;
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    setSubmitting(true);
    try {
      await sendJD(composerApplication.profile.id, {
        ...draft,
        templateId: composerTemplateId
      });
      toast.success('JD sent to teacher.');
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to send JD.');
    } finally {
      setSubmitting(false);
    }
  };

  const openFinalize = (application) => {
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    setSelectedApplication(application);
    setFinalizeOpen(true);
  };

  const handleFinalize = async (adminNote) => {
    if (!selectedApplication) return;
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    setSubmitting(true);
    try {
      const date = new Date().toLocaleDateString();
      const acceptanceBlob = await createAcceptanceLetterPdf({
        teacher: selectedApplication.profile,
        jd: selectedApplication.jd,
        signature: selectedApplication.signature,
        adminNote,
        date
      });
      const hiringBlob = await createHiringFilePdf({
        teacher: selectedApplication.profile,
        documents: selectedApplication.documents,
        jd: selectedApplication.jd,
        signature: selectedApplication.signature,
        adminNote,
        date
      });

      await finalizeHiring({
        application: selectedApplication,
        adminNote,
        acceptanceBlob,
        hiringBlob
      });

      toast.success(`${selectedApplication.teacher?.name || selectedApplication.profile.full_name} has been officially hired and connected to Finance.`);
      setFinalizeOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to finalize hiring.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (application) => {
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    const reason = window.prompt('Enter rejection reason');
    if (!reason?.trim()) return;
    setSubmitting(true);
    try {
      await rejectApplication(application.profile.id, reason.trim());
      toast.success('Application rejected.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to reject application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAcceptance = async (application) => {
    try {
      setGeneratingPdf(application.profile.id + '-acceptance');
      const blob = await createAcceptanceLetterPdf({
        teacher: application.profile,
        jd: application.jd,
        signature: application.signature,
        adminNote: 'Officially approved onboarding letter.',
        date: new Date().toLocaleDateString()
      });
      const name = (application.teacher?.name || application.profile.full_name || 'Teacher').replace(/\s+/g, '_');
      downloadBlob(blob, `Acceptance_Letter_${name}.pdf`);
      toast.success('Acceptance letter downloaded.');
    } catch (err) {
      toast.error('Failed to generate acceptance letter: ' + err.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownloadHiringFile = async (application) => {
    try {
      setGeneratingPdf(application.profile.id + '-hiring');
      const blob = await createHiringFilePdf({
        teacher: application.profile,
        documents: application.documents,
        jd: application.jd,
        signature: application.signature,
        adminNote: 'Final hiring dossier and signed terms.',
        date: new Date().toLocaleDateString()
      });
      const name = (application.teacher?.name || application.profile.full_name || 'Teacher').replace(/\s+/g, '_');
      downloadBlob(blob, `Hiring_File_${name}.pdf`);
      toast.success('Complete hiring file downloaded.');
    } catch (err) {
      toast.error('Failed to generate hiring dossier: ' + err.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownloadExperienceCert = async (app) => {
    try {
      setGeneratingPdf(app.profile.id + '-exp');
      const teacherObj = app.teacher || { name: app.profile.full_name, cnic: app.profile.cnic };
      const courses = [app.profile.specialization, app.jd?.position_title].filter(Boolean);
      const blob = await createExperienceCertificatePdf({
        teacher: { ...teacherObj, full_name: app.profile.full_name || app.teacher?.name, cnic: app.profile.cnic },
        specialization: app.profile.specialization,
        coursesTaught: courses,
        startDate: app.profile.hired_at || app.profile.created_at,
        endDate: new Date().toISOString(),
        adminNote: 'Completed service with dedication and student satisfaction.',
        date: new Date().toLocaleDateString()
      });
      const safeName = (app.teacher?.name || app.profile.full_name || 'Teacher').replace(/\s+/g, '_');
      downloadBlob(blob, `Experience_Certificate_${safeName}.pdf`);
      toast.success('Experience Certificate downloaded.');
    } catch (err) {
      toast.error('Failed to generate Experience Certificate: ' + err.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Leave Handlers
  const handleRecordLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!newLeaveForm.teacherId || !newLeaveForm.startDate || !newLeaveForm.endDate || !newLeaveForm.reason) {
      return toast.error('Please fill all required fields');
    }
    setSubmitting(true);
    try {
      await recordTeacherLeave({
        teacherId: newLeaveForm.teacherId,
        startDate: newLeaveForm.startDate,
        endDate: newLeaveForm.endDate,
        leaveType: newLeaveForm.leaveType,
        reason: newLeaveForm.reason,
        adminNotes: newLeaveForm.adminNotes,
        status: 'Approved',
        reviewedBy: user?.name || 'HR'
      });
      toast.success('Teacher leave recorded and approved.');
      setRecordLeaveOpen(false);
      setNewLeaveForm({ teacherId: '', startDate: '', endDate: '', leaveType: 'Casual', reason: '', adminNotes: '' });
      await load();
    } catch (err) {
      toast.error('Failed to record leave: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!reviewLeaveTarget) return;
    setSubmitting(true);
    try {
      await reviewTeacherLeave(reviewLeaveTarget.id, {
        status: reviewAction === 'approve' ? 'Approved' : 'Rejected',
        substituteTeacherId: substituteTeacherId || null,
        substituteNotes,
        adminNotes: reviewAction === 'approve' ? 'Approved by HR.' : 'Request rejected by HR.',
        reviewedBy: user?.name || 'HR'
      });
      toast.success(`Leave request ${reviewAction === 'approve' ? 'approved' : 'rejected'}.`);
      setReviewLeaveTarget(null);
      setSubstituteTeacherId('');
      setSubstituteNotes('');
      await load();
    } catch (err) {
      toast.error('Failed to update leave: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const teacherStats = useMemo(() => {
    const total = teachersList.length;
    const active = teachersList.filter((t) => (t.status || 'Active') === 'Active').length;
    const inactive = teachersList.filter((t) => t.status === 'Inactive').length;
    const batchesCovered = new Set(teachersList.flatMap((t) => (t.assignments || []).map((a) => a.batch_id))).size;
    return { total, active, inactive, batchesCovered };
  }, [teachersList]);

  const filteredTeachers = useMemo(() => {
    return teachersList.filter((t) => {
      const searchLower = teacherSearch.toLowerCase();
      const matchesSearch = !teacherSearch ||
        (t.name || '').toLowerCase().includes(searchLower) ||
        (t.cnic || '').includes(teacherSearch) ||
        (t.email || '').toLowerCase().includes(searchLower) ||
        (t.phone || '').includes(teacherSearch) ||
        (t.specialization || '').toLowerCase().includes(searchLower);

      const matchesStatus = teacherStatusFilter === 'all' || (t.status || 'Active') === teacherStatusFilter;

      const matchesCourse = teacherCourseFilter === 'all' ||
        (t.assignments || []).some((a) => {
          const b = batches.find((batch) => batch.id === a.batch_id);
          return b?.course === teacherCourseFilter;
        });

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [teachersList, teacherSearch, teacherStatusFilter, teacherCourseFilter, batches]);

  const handleTeacherCnicChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13, 14);
    setAddTeacherForm({ ...addTeacherForm, cnic: val });
  };

  const handleAddTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to add teachers.');
      return;
    }
    setAddingTeacher(true);
    try {
      if (addTeacherMode === 'invite') {
        // 1. Create teacher record in 'teachers' table with status: 'Pending'
        const { data: teacherRecord, error: tErr } = await supabase
          .from('teachers')
          .upsert([{
            name: addTeacherForm.name,
            cnic: addTeacherForm.cnic,
            phone: addTeacherForm.phone,
            email: addTeacherForm.email,
            specialization: addTeacherForm.specialization,
            status: 'Pending',
            notes: addTeacherForm.notes
          }], { onConflict: 'cnic' })
          .select()
          .single();

        if (tErr) throw tErr;

        // 2. Authorize login in allowed_cnics so teacher can receive email OTP at /login
        await syncTeacherAccess({
          cnic: addTeacherForm.cnic,
          name: addTeacherForm.name,
          assignedCourse: addTeacherForm.specialization || 'Teacher'
        });

        // 3. Upsert into hr_profiles
        try {
          const hrProfilePayload = {
            teacher_id: teacherRecord.id,
            cnic: addTeacherForm.cnic,
            full_name: addTeacherForm.name,
            personal_phone: addTeacherForm.phone,
            personal_email: addTeacherForm.email,
            specialization: addTeacherForm.specialization || null,
            expected_salary: addTeacherForm.salary ? parseInt(addTeacherForm.salary, 10) : null,
            current_step: 1,
            hr_status: 'pending',
            updated_at: new Date().toISOString()
          };
          const { error: hrErr } = await supabase
            .from('hr_profiles')
            .upsert(hrProfilePayload, { onConflict: 'teacher_id' });

          if (hrErr) {
            console.warn('HR profile creation notice:', hrErr);
          }
        } catch (hrProfileErr) {
          console.warn('HR profile sync notice:', hrProfileErr);
        }

        // Auto-connect salary into teacher_salaries for Finance department
        if (addTeacherForm.salary && !isNaN(parseFloat(addTeacherForm.salary))) {
          try {
            await supabase.from('teacher_salaries').upsert({
              teacher_id: teacherRecord.id,
              monthly_amount: parseFloat(addTeacherForm.salary),
              effective_from: new Date().toISOString().split('T')[0]
            }, { onConflict: 'teacher_id' });
          } catch (salErr) {
            console.warn('Teacher salary record notice:', salErr);
          }
        }

        const loginUrl = `${window.location.origin}/login`;
        const waText = `Assalam-o-Alaikum ${addTeacherForm.name},\n\nWelcome to DeepSkills! Your faculty onboarding account is ready.\n\nLogin Instructions:\n1. Open portal: ${loginUrl}\n2. Enter your CNIC: ${addTeacherForm.cnic}\n3. Enter the 6-digit OTP sent to your email (${addTeacherForm.email})\n4. Complete your profile and document upload at /teacher/hr.\n\nOnce reviewed and approved by HR, your full teaching dashboard and assigned batches will unlock automatically.\n\nDeepSkills HR Department`;
        const waUrl = getTeacherWhatsAppUrl(addTeacherForm.phone, waText);

        setInviteSuccessData({
          name: addTeacherForm.name,
          phone: addTeacherForm.phone,
          cnic: addTeacherForm.cnic,
          email: addTeacherForm.email,
          loginUrl,
          onboardingUrl: `${window.location.origin}/teacher/hr`,
          waUrl
        });

        toast.success('Instructor registered! Login authorized via CNIC & Email OTP.');
        await load();
      } else {
        const { data: newTeacher, error: tError } = await supabase
          .from('teachers')
          .insert([{
            name: addTeacherForm.name,
            cnic: addTeacherForm.cnic,
            phone: addTeacherForm.phone,
            email: addTeacherForm.email,
            specialization: addTeacherForm.specialization,
            status: 'Active',
            notes: addTeacherForm.notes
          }])
          .select()
          .single();

        if (tError) throw tError;

        const assignedBatches = addTeacherForm.selectedBatches
          .map(selected => batches.find(batch => batch.id === selected.batch_id))
          .filter(Boolean);
        const assignedBatchNames = assignedBatches.map(batch => batch.batch_name);
        const assignedCourses = Array.from(new Set(assignedBatches.map(batch => batch.course).filter(Boolean)));

        await syncTeacherAccess({
          cnic: addTeacherForm.cnic,
          name: addTeacherForm.name,
          assignedCourse: assignedCourses.join(', '),
          batch: assignedBatchNames.join(', ')
        });

        if (addTeacherForm.selectedBatches.length > 0) {
          const batchInserts = addTeacherForm.selectedBatches.map(b => ({
            teacher_id: newTeacher.id,
            batch_id: b.batch_id,
            role: b.role
          }));
          await supabase.from('teacher_batches').insert(batchInserts);
        }

        try {
          await supabase.from('hr_profiles').upsert({
            teacher_id: newTeacher.id,
            cnic: addTeacherForm.cnic,
            full_name: addTeacherForm.name,
            personal_phone: addTeacherForm.phone,
            personal_email: addTeacherForm.email,
            specialization: addTeacherForm.specialization || null,
            expected_salary: addTeacherForm.salary ? parseInt(addTeacherForm.salary, 10) : null,
            current_step: 5,
            hr_status: 'hired',
            hired_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'teacher_id' });
        } catch (hrSyncErr) {
          console.warn('HR profile sync notice:', hrSyncErr);
        }

        if (addTeacherForm.salary && !isNaN(parseFloat(addTeacherForm.salary))) {
          try {
            await supabase.from('teacher_salaries').upsert({
              teacher_id: newTeacher.id,
              monthly_amount: parseFloat(addTeacherForm.salary),
              effective_from: new Date().toISOString().split('T')[0]
            }, { onConflict: 'teacher_id' });
          } catch (salErr) {
            console.warn('Teacher salary record notice:', salErr);
          }
        }

        toast.success('Teacher added & synced with HR profiles successfully!');
        setIsAddTeacherOpen(false);
        await load();
        setAddTeacherForm({ name: '', cnic: '', phone: '', email: '', specialization: '', salary: '', course_id: '', selectedBatches: [], notes: '' });
      }
    } catch (err) {
      toast.error('Failed to process teacher: ' + err.message);
    } finally {
      setAddingTeacher(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FaHome />, path: '/admin/hr' },
    { id: 'applications', label: 'Applications', icon: <FaClipboardList />, path: '/admin/hr/applications', count: stats.total },
    { id: 'jds', label: 'JD Management', icon: <FaFileAlt />, path: '/admin/hr/jds', count: applicationsWithJds.length },
    { id: 'signatures', label: 'Signatures', icon: <FaSignature />, path: '/admin/hr/signatures', count: applicationsWithSignatures.length },
    { id: 'files', label: 'Hiring Files', icon: <FaFolder />, path: '/admin/hr/files', count: hiredApplications.length },
    { id: 'leaves', label: 'Leaves & Absence', icon: <FaCalendarCheck />, path: '/admin/hr/leaves', count: leaveStats.pending },
    { id: 'teachers', label: 'All Teachers', icon: <FaUsers />, path: '/admin/hr/teachers', count: teachersList.length },
    { id: 'settings', label: 'HR Settings', icon: <FaCog />, path: '/admin/hr/settings' }
  ];

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div className="title-block">
            <h1>
              <FaUsers /> HR & Teacher Hiring Portal
            </h1>
            <p>Onboard faculty, manage contracts, track leave absence, and issue verified teacher dossiers.</p>
          </div>
        </Header>

        {/* TOP VIEW TABS */}
        <NavTabs>
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <TabButton
                key={item.id}
                $active={isActive}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.count === 'number' && (
                  <span className="badge">{item.count}</span>
                )}
              </TabButton>
            );
          })}
        </NavTabs>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <FaClock style={{ fontSize: '1.8rem', marginBottom: '10px' }} />
            <div>Loading HR records...</div>
          </div>
        ) : (
          <>
            {/* VIEW 1: OVERVIEW DASHBOARD */}
            {activeView === 'overview' && (
              <>
                <StatsGrid>
                  <StatCard $color="#8B5CF6">
                    <span className="label">Total Applicants</span>
                    <span className="value">{stats.total}</span>
                    <span className="sub">All-time applications</span>
                  </StatCard>
                  <StatCard $color="#f59e0b" $highlight={stats.pending > 0}>
                    <span className="label">Pending Review</span>
                    <span className="value">{stats.pending}</span>
                    <span className="sub">Awaiting initial action</span>
                  </StatCard>
                  <StatCard $color="#3b82f6">
                    <span className="label">JDs Sent</span>
                    <span className="value">{stats.jdSent}</span>
                    <span className="sub">Out for teacher review</span>
                  </StatCard>
                  <StatCard $color="#a855f7" $highlight={stats.signed > 0}>
                    <span className="label">Signed Contracts</span>
                    <span className="value">{stats.signed}</span>
                    <span className="sub">Ready for final hire</span>
                  </StatCard>
                  <StatCard $color="#10b981">
                    <span className="label">Officially Hired</span>
                    <span className="value">{stats.hired}</span>
                    <span className="sub">Active onboarded teachers</span>
                  </StatCard>
                  <StatCard $color="#f59e0b" $highlight={leaveStats.onLeaveToday > 0}>
                    <span className="label">On Leave Today</span>
                    <span className="value">{leaveStats.onLeaveToday}</span>
                    <span className="sub">Absence coverage active</span>
                  </StatCard>
                </StatsGrid>

                {/* 5-STAGE HIRING FUNNEL */}
                <CardPanel>
                  <div className="panel-header">
                    <h3><FaFilter /> Automated Hiring Pipeline Stages</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Live candidate distribution across 5 steps</span>
                  </div>
                  <PipelineFunnel>
                    <FunnelStep $active={stats.step1 > 0}>
                      <span className="step-num">Step 1</span>
                      <span className="step-name">Profile & Info</span>
                      <span className="step-count">{stats.step1}</span>
                    </FunnelStep>
                    <FunnelStep $active={stats.step2 > 0}>
                      <span className="step-num">Step 2</span>
                      <span className="step-name">Documents</span>
                      <span className="step-count">{stats.step2}</span>
                    </FunnelStep>
                    <FunnelStep $active={stats.step3 > 0}>
                      <span className="step-num">Step 3</span>
                      <span className="step-name">JD Review</span>
                      <span className="step-count">{stats.step3}</span>
                    </FunnelStep>
                    <FunnelStep $active={stats.step4 > 0}>
                      <span className="step-num">Step 4</span>
                      <span className="step-name">Signature</span>
                      <span className="step-count">{stats.step4}</span>
                    </FunnelStep>
                    <FunnelStep $active={stats.step5 > 0}>
                      <span className="step-num">Step 5</span>
                      <span className="step-name">Hired & Complete</span>
                      <span className="step-count">{stats.step5}</span>
                    </FunnelStep>
                  </PipelineFunnel>
                </CardPanel>

                <DashboardGrid>
                  {/* URGENT ACTIONS */}
                  <CardPanel>
                    <div className="panel-header">
                      <h3><FaExclamationTriangle style={{ color: '#f59e0b' }} /> Action Needed</h3>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Items requiring immediate HR sign-off</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {applications.filter((a) => (a.signature && a.profile.hr_status !== 'hired') || a.jd?.teacher_status === 'changes_requested' || a.profile.hr_status === 'pending').slice(0, 5).map((app) => (
                        <div
                          key={app.profile.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div>
                            <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>
                              {app.teacher?.name || app.profile.full_name}
                            </strong>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              {app.profile.specialization || 'Instructor'} • CNIC: {app.profile.cnic || 'N/A'}
                            </div>
                            {app.jd?.teacher_status === 'changes_requested' && (
                              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>
                                Teacher requested JD modification: &quot;{app.jd.teacher_notes || 'Please review salary or hours'}&quot;
                              </div>
                            )}
                          </div>
                          <div>
                            {app.signature && app.profile.hr_status !== 'hired' ? (
                              <Button $success onClick={() => openFinalize(app)}>
                                <FaCheckCircle /> Finalize
                              </Button>
                            ) : app.jd?.teacher_status === 'changes_requested' ? (
                              <Button $primary onClick={() => openComposer(app)}>
                                <FaFileAlt /> Update JD
                              </Button>
                            ) : (
                              <Button onClick={() => { setSelectedApplication(app); setDrawerOpen(true); }}>
                                <FaEye /> Review
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {applications.filter((a) => (a.signature && a.profile.hr_status !== 'hired') || a.jd?.teacher_status === 'changes_requested' || a.profile.hr_status === 'pending').length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                          <FaCheckCircle style={{ color: '#10b981', fontSize: '1.4rem', marginBottom: '8px' }} />
                          <div>No urgent pending actions! All applications are processed.</div>
                        </div>
                      )}
                    </div>
                  </CardPanel>

                  {/* QUICK SHORTCUTS */}
                  <CardPanel>
                    <div className="panel-header">
                      <h3><FaFolder /> HR Operations Shortcuts</h3>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Standard workflows</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          padding: '14px',
                          background: 'rgba(139, 92, 246, 0.04)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate('/admin/hr/applications')}
                      >
                        <div>
                          <strong style={{ color: '#c4b5fd', fontSize: '0.9rem' }}>Candidate Applications</strong>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Review submissions, credentials, and verification steps</div>
                        </div>
                        <FaArrowRight style={{ color: '#8B5CF6' }} />
                      </div>

                      <div
                        style={{
                          padding: '14px',
                          background: 'rgba(59, 130, 246, 0.04)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate('/admin/hr/leaves')}
                      >
                        <div>
                          <strong style={{ color: '#93c5fd', fontSize: '0.9rem' }}>Leaves & Absence Management</strong>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Track instructor leaves and assign substitute teachers</div>
                        </div>
                        <FaArrowRight style={{ color: '#3b82f6' }} />
                      </div>

                      <div
                        style={{
                          padding: '14px',
                          background: 'rgba(16, 185, 129, 0.04)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate('/admin/hr/files')}
                      >
                        <div>
                          <strong style={{ color: '#6ee7b7', fontSize: '0.9rem' }}>Hiring Files & Dossiers</strong>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Download generated PDF acceptance letters and archives</div>
                        </div>
                        <FaArrowRight style={{ color: '#10b981' }} />
                      </div>

                      <div
                        style={{
                          padding: '14px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate('/admin/hr/teachers')}
                      >
                        <div>
                          <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>All Active Teachers</strong>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>View instructor profiles, assigned batches, and attendance</div>
                        </div>
                        <FaArrowRight style={{ color: '#94a3b8' }} />
                      </div>
                    </div>
                  </CardPanel>
                </DashboardGrid>
              </>
            )}

            {/* VIEW 2: CANDIDATE APPLICATIONS */}
            {activeView === 'applications' && (
              <>
                <FilterCard>
                  <FilterGroup>
                    <SearchInputWrap>
                      <FaSearch className="search-icon" />
                      <input
                        placeholder="Search applicant by name, CNIC, specialization..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button type="button" className="clear-btn" onClick={() => setSearch('')} title="Clear search">
                          <FaTimes />
                        </button>
                      )}
                    </SearchInputWrap>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All Statuses ({applications.length})</option>
                      <option value="pending">Pending ({stats.pending})</option>
                      <option value="jd_sent">JD Sent ({stats.jdSent})</option>
                      <option value="jd_approved">JD Approved ({stats.jdApproved})</option>
                      <option value="signed">Signed ({stats.signed})</option>
                      <option value="hired">Officially Hired ({stats.hired})</option>
                      <option value="rejected">Rejected ({stats.rejected})</option>
                    </Select>
                  </FilterGroup>

                  <FilterMeta>
                    <span className="counter">
                      Showing {filteredApplications.length} of {applications.length} Candidates
                    </span>
                    {(search || statusFilter !== 'all') && (
                      <button
                        type="button"
                        className="reset-link"
                        onClick={() => { setSearch(''); setStatusFilter('all'); }}
                      >
                        Reset filters
                      </button>
                    )}
                  </FilterMeta>
                </FilterCard>

                <AdminHRTable
                  applications={filteredApplications}
                  canMutate={canMutate}
                  onView={(application) => {
                    setSelectedApplication(application);
                    setDrawerOpen(true);
                  }}
                  onCreateJd={openComposer}
                  onFinalize={openFinalize}
                  onReject={handleReject}
                />
              </>
            )}

            {/* VIEW 3: JD MANAGEMENT */}
            {activeView === 'jds' && (
              <>
                <StatsGrid>
                  <StatCard $color="#8B5CF6">
                    <span className="label">Total JDs</span>
                    <span className="value">{applicationsWithJds.length}</span>
                    <span className="sub">Candidates with generated JDs</span>
                  </StatCard>
                  <StatCard $color="#10b981">
                    <span className="label">Teacher Approved</span>
                    <span className="value">{stats.jdApproved}</span>
                    <span className="sub">Accepted without amendments</span>
                  </StatCard>
                  <StatCard $color="#ef4444" $highlight={stats.changesRequested > 0}>
                    <span className="label">Changes Requested</span>
                    <span className="value">{stats.changesRequested}</span>
                    <span className="sub">Requires review/re-drafting</span>
                  </StatCard>
                  <StatCard $color="#94a3b8">
                    <span className="label">Templates Available</span>
                    <span className="value">{templates.length}</span>
                    <span className="sub">Standard JD blueprints</span>
                  </StatCard>
                </StatsGrid>

                <FilterCard>
                  <FilterGroup>
                    <SearchInputWrap>
                      <FaSearch className="search-icon" />
                      <input
                        placeholder="Search JDs by teacher name, specialization..."
                        value={jdSearch}
                        onChange={(e) => setJdSearch(e.target.value)}
                      />
                      {jdSearch && (
                        <button type="button" className="clear-btn" onClick={() => setJdSearch('')} title="Clear search">
                          <FaTimes />
                        </button>
                      )}
                    </SearchInputWrap>
                    <Select value={jdStatusFilter} onChange={(e) => setJdStatusFilter(e.target.value)}>
                      <option value="all">All JD Statuses ({applicationsWithJds.length})</option>
                      <option value="approved">Teacher Approved ({stats.jdApproved})</option>
                      <option value="changes_requested">Changes Requested ({stats.changesRequested})</option>
                      <option value="sent">Sent to Teacher</option>
                      <option value="draft">Drafts</option>
                    </Select>
                  </FilterGroup>

                  <FilterMeta>
                    <span className="counter">
                      Showing {filteredJds.length} of {applicationsWithJds.length} JDs
                    </span>
                    {(jdSearch || jdStatusFilter !== 'all') && (
                      <button
                        type="button"
                        className="reset-link"
                        onClick={() => { setJdSearch(''); setJdStatusFilter('all'); }}
                      >
                        Reset filters
                      </button>
                    )}
                  </FilterMeta>
                </FilterCard>

                <CardPanel>
                  <div className="panel-header">
                    <h3><FaFileAlt /> Candidate Job Descriptions</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Review status of sent terms, feedback, and 1-click WhatsApp dispatch</span>
                  </div>

                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Employment Type</th>
                          <th>Salary / Rate</th>
                          <th>Working Hours</th>
                          <th>Teacher Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJds.map((app) => {
                          const status = app.jd?.teacher_status;
                          let badgeBg = 'rgba(148, 163, 184, 0.1)';
                          let badgeColor = '#94a3b8';
                          let label = 'Draft';

                          if (status === 'approved') {
                            badgeBg = 'rgba(16, 185, 129, 0.15)';
                            badgeColor = '#10b981';
                            label = 'Approved';
                          } else if (status === 'changes_requested') {
                            badgeBg = 'rgba(239, 68, 68, 0.15)';
                            badgeColor = '#ef4444';
                            label = 'Changes Requested';
                          } else if (app.jd?.is_sent_to_teacher) {
                            badgeBg = 'rgba(59, 130, 246, 0.15)';
                            badgeColor = '#60a5fa';
                            label = 'Sent / In Review';
                          }

                          const teacherPhone = app.teacher?.phone || app.profile.phone;
                          const teacherName = app.teacher?.name || app.profile.full_name || 'Instructor';
                          const spec = app.profile.specialization || app.jd?.position_title || 'Course';
                          const jdWhatsAppUrl = getTeacherWhatsAppUrl(
                            teacherPhone,
                            `Assalam-o-Alaikum ${teacherName},\nYour teaching terms & Job Description for ${spec} at DeepSkills have been prepared. Please review and approve the terms in your portal:\nhttps://deepskills.pk/teacher/hr\n\nBest regards,\nDeepSkills Human Resources`
                          );

                          return (
                            <tr key={app.profile.id}>
                              <td>
                                <div>
                                  <strong style={{ color: '#f1f5f9' }}>{teacherName}</strong>
                                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                    {spec}
                                  </div>
                                </div>
                              </td>
                              <td>{app.jd?.employment_type || 'Full-time'}</td>
                              <td>
                                {app.jd?.salary ? `PKR ${Number(app.jd.salary).toLocaleString()}` : 'Not Specified'}
                              </td>
                              <td>{app.jd?.working_hours || 'Standard'}</td>
                              <td>
                                <Badge $bg={badgeBg} $color={badgeColor}>
                                  {label}
                                </Badge>
                                {status === 'changes_requested' && app.jd?.teacher_notes && (
                                  <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px', maxWidth: '280px' }}>
                                    &quot;{app.jd.teacher_notes}&quot;
                                  </div>
                                )}
                              </td>
                              <td>
                                <ActionRow>
                                  <Button onClick={() => { setSelectedApplication(app); setDrawerOpen(true); }}>
                                    <FaEye /> View
                                  </Button>
                                  {canMutate && (
                                    <Button $primary onClick={() => openComposer(app)}>
                                      <FaFileAlt /> {app.jd ? 'Edit JD' : 'Compose JD'}
                                    </Button>
                                  )}
                                  {jdWhatsAppUrl && (
                                    <Button
                                      as="a"
                                      href={jdWhatsAppUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      $whatsapp
                                      title="Send JD review link to teacher on WhatsApp"
                                    >
                                      <FaWhatsapp /> WhatsApp
                                    </Button>
                                  )}
                                </ActionRow>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredJds.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                              {jdSearch || jdStatusFilter !== 'all' ? 'No job descriptions matching your search.' : 'No job descriptions generated yet.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </TableWrap>
                </CardPanel>

                {/* TEMPLATES LIBRARY */}
                <CardPanel>
                  <div className="panel-header">
                    <h3><FaFolder /> Standard JD Templates</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Pre-configured role profiles</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>{tpl.title || tpl.specialization}</strong>
                          <Badge>{tpl.employment_type || 'Full-time'}</Badge>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Specialization: <span style={{ color: '#e2e8f0' }}>{tpl.specialization}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Working Hours: <span style={{ color: '#e2e8f0' }}>{tpl.working_hours || '40 hrs/week'}</span>
                        </div>
                        {tpl.responsibilities && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
                            {Array.isArray(tpl.responsibilities) ? tpl.responsibilities.slice(0, 2).join(', ') + '...' : String(tpl.responsibilities).slice(0, 80) + '...'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardPanel>
              </>
            )}

            {/* VIEW 4: SIGNATURES HUB */}
            {activeView === 'signatures' && (
              <>
                <StatsGrid>
                  <StatCard $color="#8B5CF6">
                    <span className="label">Total Signatures</span>
                    <span className="value">{applicationsWithSignatures.length}</span>
                    <span className="sub">Contracts digitally signed</span>
                  </StatCard>
                  <StatCard $color="#f59e0b" $highlight={stats.signed > 0}>
                    <span className="label">Awaiting Finalization</span>
                    <span className="value">{applicationsWithSignatures.filter((a) => a.profile.hr_status !== 'hired').length}</span>
                    <span className="sub">Ready for official hire</span>
                  </StatCard>
                  <StatCard $color="#10b981">
                    <span className="label">Completed Hires</span>
                    <span className="value">{stats.hired}</span>
                    <span className="sub">Hired with verified signature</span>
                  </StatCard>
                </StatsGrid>

                <FilterCard>
                  <FilterGroup>
                    <SearchInputWrap>
                      <FaSearch className="search-icon" />
                      <input
                        placeholder="Search signatures by teacher name, CNIC..."
                        value={sigSearch}
                        onChange={(e) => setSigSearch(e.target.value)}
                      />
                      {sigSearch && (
                        <button type="button" className="clear-btn" onClick={() => setSigSearch('')} title="Clear search">
                          <FaTimes />
                        </button>
                      )}
                    </SearchInputWrap>
                    <Select value={sigStatusFilter} onChange={(e) => setSigStatusFilter(e.target.value)}>
                      <option value="all">All Statuses ({applicationsWithSignatures.length})</option>
                      <option value="awaiting">Awaiting Hire ({applicationsWithSignatures.filter((a) => a.profile.hr_status !== 'hired').length})</option>
                      <option value="hired">Officially Hired ({stats.hired})</option>
                    </Select>
                  </FilterGroup>

                  <FilterMeta>
                    <span className="counter">
                      Showing {filteredSignatures.length} of {applicationsWithSignatures.length} Signatures
                    </span>
                    {(sigSearch || sigStatusFilter !== 'all') && (
                      <button
                        type="button"
                        className="reset-link"
                        onClick={() => { setSigSearch(''); setSigStatusFilter('all'); }}
                      >
                        Reset filters
                      </button>
                    )}
                  </FilterMeta>
                </FilterCard>

                <CardPanel>
                  <div className="panel-header">
                    <h3><FaSignature /> Digitally Signed Teacher Contracts</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Verify digital signature submissions and execute hires</span>
                  </div>

                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>CNIC</th>
                          <th>Signed Date</th>
                          <th>Signature Preview</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSignatures.map((app) => {
                          const isHired = app.profile.hr_status === 'hired';
                          const sigData = app.signature?.signature_data || app.signature?.signature_url;
                          const signedDate = app.signature?.signed_at
                            ? new Date(app.signature.signed_at).toLocaleDateString()
                            : 'Submitted';

                          const teacherPhone = app.teacher?.phone || app.profile.phone;
                          const teacherName = app.teacher?.name || app.profile.full_name || 'Instructor';
                          const signWhatsAppUrl = getTeacherWhatsAppUrl(
                            teacherPhone,
                            `Assalam-o-Alaikum ${teacherName},\nWe have received your digitally signed teaching agreement. DeepSkills HR is finalizing your onboarding dossier.`
                          );

                          return (
                            <tr key={app.profile.id}>
                              <td>
                                <div>
                                  <strong style={{ color: '#f1f5f9' }}>{teacherName}</strong>
                                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{app.profile.specialization || 'Teacher'}</div>
                                </div>
                              </td>
                              <td>{app.profile.cnic || 'N/A'}</td>
                              <td>
                                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                                  <FaClock style={{ marginRight: '4px' }} />
                                  {signedDate}
                                </span>
                              </td>
                              <td>
                                {sigData ? (
                                  <div style={{
                                    background: '#fff',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    maxWidth: '120px',
                                    maxHeight: '40px'
                                  }}>
                                    {sigData.startsWith('data:image') || sigData.startsWith('http') ? (
                                      <img src={sigData} alt="Signature" style={{ maxHeight: '30px', maxWidth: '100px', objectFit: 'contain' }} />
                                    ) : (
                                      <span style={{ color: '#000', fontStyle: 'italic', fontSize: '0.85rem' }}>{sigData}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>On file</span>
                                )}
                              </td>
                              <td>
                                {isHired ? (
                                  <Badge $bg="rgba(16, 185, 129, 0.15)" $color="#10b981">
                                    <FaCheckCircle /> Hired
                                  </Badge>
                                ) : (
                                  <Badge $bg="rgba(245, 158, 11, 0.15)" $color="#f59e0b">
                                    <FaClock /> Awaiting Hire
                                  </Badge>
                                )}
                              </td>
                              <td>
                                <ActionRow>
                                  <Button onClick={() => { setSelectedApplication(app); setDrawerOpen(true); }}>
                                    <FaEye /> View
                                  </Button>
                                  {!isHired && canMutate && (
                                    <Button $success onClick={() => openFinalize(app)}>
                                      <FaCheckCircle /> Finalize & Hire
                                    </Button>
                                  )}
                                  {signWhatsAppUrl && (
                                    <Button
                                      as="a"
                                      href={signWhatsAppUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      $whatsapp
                                      title="WhatsApp teacher regarding contract"
                                    >
                                      <FaWhatsapp /> WhatsApp
                                    </Button>
                                  )}
                                </ActionRow>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredSignatures.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                              {sigSearch || sigStatusFilter !== 'all' ? 'No signatures matching your search.' : 'No signatures recorded yet. When teachers sign their contracts, they will appear here.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </TableWrap>
                </CardPanel>
              </>
            )}

            {/* VIEW 5: HIRING FILES & ARCHIVE */}
            {activeView === 'files' && (
              <>
                <StatsGrid>
                  <StatCard $color="#10b981">
                    <span className="label">Hired Teachers</span>
                    <span className="value">{hiredApplications.length}</span>
                    <span className="sub">Complete employee dossiers</span>
                  </StatCard>
                  <StatCard $color="#8B5CF6">
                    <span className="label">Acceptance Letters</span>
                    <span className="value">{hiredApplications.length}</span>
                    <span className="sub">Official issuance ready</span>
                  </StatCard>
                  <StatCard $color="#3b82f6">
                    <span className="label">Document Packs</span>
                    <span className="value">
                      {hiredApplications.reduce((acc, a) => acc + (a.documents?.length || 0), 0)}
                    </span>
                    <span className="sub">Total verified credentials</span>
                  </StatCard>
                </StatsGrid>

                <FilterCard>
                  <FilterGroup>
                    <SearchInputWrap $fullWidth>
                      <FaSearch className="search-icon" />
                      <input
                        placeholder="Search dossiers by teacher name, CNIC, email..."
                        value={filesSearch}
                        onChange={(e) => setFilesSearch(e.target.value)}
                      />
                      {filesSearch && (
                        <button type="button" className="clear-btn" onClick={() => setFilesSearch('')} title="Clear search">
                          <FaTimes />
                        </button>
                      )}
                    </SearchInputWrap>
                  </FilterGroup>

                  <FilterMeta>
                    <span className="counter">
                      Showing {filteredFiles.length} of {hiredApplications.length} Dossiers
                    </span>
                    {filesSearch && (
                      <button
                        type="button"
                        className="reset-link"
                        onClick={() => setFilesSearch('')}
                      >
                        Reset search
                      </button>
                    )}
                  </FilterMeta>
                </FilterCard>

                <CardPanel>
                  <div className="panel-header">
                    <h3><FaFolder /> Teacher Dossiers & Hiring Documents</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1-Click download official PDF letters, hiring archives, and experience certificates</span>
                  </div>

                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>CNIC</th>
                          <th>Specialization</th>
                          <th>Verified Docs</th>
                          <th>Official PDF Documents</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFiles.map((app) => {
                          const isGenerating = generatingPdf?.startsWith(app.profile.id);
                          const teacherPhone = app.teacher?.phone || app.profile.phone;
                          const teacherName = app.teacher?.name || app.profile.full_name || 'Instructor';
                          const hiredWhatsAppUrl = getTeacherWhatsAppUrl(
                            teacherPhone,
                            `Assalam-o-Alaikum ${teacherName},\nCongratulations and welcome to DeepSkills! Your official Acceptance Letter and onboarding file are finalized. Please log in to your teacher portal to view assigned batches:\nhttps://deepskills.pk/teacher`
                          );

                          return (
                            <tr key={app.profile.id}>
                              <td>
                                <div>
                                  <strong style={{ color: '#f1f5f9' }}>{teacherName}</strong>
                                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{app.profile.email || app.teacher?.email || 'No email'}</div>
                                </div>
                              </td>
                              <td>{app.profile.cnic || 'N/A'}</td>
                              <td>{app.profile.specialization || 'Instructor'}</td>
                              <td>
                                <Badge $bg="rgba(59, 130, 246, 0.15)" $color="#60a5fa">
                                  {app.documents?.length || 0} Documents
                                </Badge>
                              </td>
                              <td>
                                <ActionRow>
                                  <Button
                                    $primary
                                    disabled={isGenerating}
                                    onClick={() => handleDownloadAcceptance(app)}
                                    title="Download Acceptance Letter PDF"
                                  >
                                    <FaFilePdf /> Acceptance
                                  </Button>
                                  <Button
                                    $success
                                    disabled={isGenerating}
                                    onClick={() => handleDownloadHiringFile(app)}
                                    title="Download Complete Hiring Dossier PDF"
                                  >
                                    <FaDownload /> Dossier
                                  </Button>
                                  <Button
                                    disabled={isGenerating}
                                    onClick={() => handleDownloadExperienceCert(app)}
                                    style={{ borderColor: 'rgba(139, 92, 246, 0.4)', color: '#c4b5fd' }}
                                    title="Issue & Download Experience Certificate PDF"
                                  >
                                    <FaAward /> Experience Cert
                                  </Button>
                                  {hiredWhatsAppUrl && (
                                    <Button
                                      as="a"
                                      href={hiredWhatsAppUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      $whatsapp
                                      title="WhatsApp Acceptance details to teacher"
                                    >
                                      <FaWhatsapp />
                                    </Button>
                                  )}
                                </ActionRow>
                              </td>
                              <td>
                                <Button onClick={() => { setSelectedApplication(app); setDrawerOpen(true); }}>
                                  <FaEye /> Full Dossier
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredFiles.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                              {filesSearch ? 'No teacher dossiers matching your search.' : 'No finalized teacher dossiers yet. Once a candidate is finalized, their complete PDF dossier will be available here.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </TableWrap>
                </CardPanel>
              </>
            )}

            {/* VIEW 6: TEACHER LEAVES & ABSENCE */}
            {activeView === 'leaves' && (
              <>
                <StatsGrid>
                  <StatCard $color="#8B5CF6">
                    <span className="label">Total Leave Requests</span>
                    <span className="value">{leaveStats.total}</span>
                    <span className="sub">All time recorded leaves</span>
                  </StatCard>
                  <StatCard $color="#f59e0b" $highlight={leaveStats.pending > 0}>
                    <span className="label">Pending Approvals</span>
                    <span className="value">{leaveStats.pending}</span>
                    <span className="sub">Awaiting HR review</span>
                  </StatCard>
                  <StatCard $color="#10b981">
                    <span className="label">Approved Leaves</span>
                    <span className="value">{leaveStats.approved}</span>
                    <span className="sub">Substitute coverage arranged</span>
                  </StatCard>
                  <StatCard $color="#ef4444" $highlight={leaveStats.onLeaveToday > 0}>
                    <span className="label">On Leave Today</span>
                    <span className="value">{leaveStats.onLeaveToday}</span>
                    <span className="sub">Instructors absent today</span>
                  </StatCard>
                </StatsGrid>

                <FilterCard>
                  <FilterGroup>
                    <SearchInputWrap>
                      <FaSearch className="search-icon" />
                      <input
                        placeholder="Search leaves by teacher, reason, type..."
                        value={leaveSearch}
                        onChange={(e) => setLeaveSearch(e.target.value)}
                      />
                      {leaveSearch && (
                        <button type="button" className="clear-btn" onClick={() => setLeaveSearch('')} title="Clear search">
                          <FaTimes />
                        </button>
                      )}
                    </SearchInputWrap>
                    <Select value={leaveStatusFilter} onChange={(e) => setLeaveStatusFilter(e.target.value)}>
                      <option value="all">All Leaves ({leaves.length})</option>
                      <option value="Pending">Pending Review ({leaveStats.pending})</option>
                      <option value="Approved">Approved ({leaveStats.approved})</option>
                      <option value="Rejected">Rejected</option>
                    </Select>
                  </FilterGroup>

                  <FilterActions>
                    <FilterMeta>
                      <span className="counter">
                        Showing {filteredLeaves.length} of {leaves.length} Leaves
                      </span>
                      {(leaveSearch || leaveStatusFilter !== 'all') && (
                        <button
                          type="button"
                          className="reset-link"
                          onClick={() => { setLeaveSearch(''); setLeaveStatusFilter('all'); }}
                        >
                          Reset filters
                        </button>
                      )}
                    </FilterMeta>

                    {canMutate && (
                      <Button $primary onClick={() => setRecordLeaveOpen(true)} style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>
                        <FaPlus /> Record Teacher Leave
                      </Button>
                    )}
                  </FilterActions>
                </FilterCard>

                <CardPanel>
                  <div className="panel-header">
                    <h3><FaCalendarCheck /> Faculty Absence & Leave Log</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Review leave requests and assign substitute instructors</span>
                  </div>

                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>Leave Type</th>
                          <th>Duration</th>
                          <th>Reason</th>
                          <th>Substitute Teacher</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaves.map((leave) => {
                          const status = leave.status || 'Pending';
                          let bg = 'rgba(245, 158, 11, 0.15)';
                          let col = '#f59e0b';
                          if (status === 'Approved') { bg = 'rgba(16, 185, 129, 0.15)'; col = '#10b981'; }
                          if (status === 'Rejected') { bg = 'rgba(239, 68, 68, 0.15)'; col = '#ef4444'; }

                          const diffDays = Math.max(1, Math.round((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1);

                          return (
                            <tr key={leave.id}>
                              <td>
                                <div>
                                  <strong style={{ color: '#f1f5f9' }}>{leave.teacher?.name || 'Instructor'}</strong>
                                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{leave.teacher?.specialization || 'Faculty'}</div>
                                </div>
                              </td>
                              <td>
                                <Badge>{leave.leave_type || 'Casual'}</Badge>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.84rem', color: '#f1f5f9' }}>
                                  {leave.start_date} → {leave.end_date}
                                </div>
                                <small style={{ color: '#94a3b8' }}>{diffDays} day{diffDays > 1 ? 's' : ''}</small>
                              </td>
                              <td>
                                <div style={{ maxWidth: '240px', fontSize: '0.84rem', color: '#cbd5e1' }}>
                                  {leave.reason}
                                </div>
                              </td>
                              <td>
                                {leave.substitute ? (
                                  <div>
                                    <strong style={{ color: '#60a5fa', fontSize: '0.85rem' }}>{leave.substitute.name}</strong>
                                    {leave.substitute_notes && (
                                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{leave.substitute_notes}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>None assigned</span>
                                )}
                              </td>
                              <td>
                                <Badge $bg={bg} $color={col}>
                                  {status}
                                </Badge>
                              </td>
                              <td>
                                {status === 'Pending' && canMutate ? (
                                  <ActionRow>
                                    <Button
                                      $success
                                      onClick={() => {
                                        setReviewLeaveTarget(leave);
                                        setReviewAction('approve');
                                        setSubstituteTeacherId(leave.substitute_teacher_id || '');
                                        setSubstituteNotes(leave.substitute_notes || '');
                                      }}
                                    >
                                      <FaCheck /> Approve
                                    </Button>
                                    <Button
                                      $danger
                                      onClick={() => {
                                        setReviewLeaveTarget(leave);
                                        setReviewAction('reject');
                                      }}
                                    >
                                      <FaTimes /> Reject
                                    </Button>
                                  </ActionRow>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    Reviewed by {leave.reviewed_by || 'HR'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredLeaves.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                              {leaveSearch || leaveStatusFilter !== 'all' ? 'No leave records matching your search.' : 'No leave records found. Teachers requesting leave will appear here.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </TableWrap>
                </CardPanel>
              </>
            )}

            {/* VIEW 7: HR SETTINGS & CONFIGURATION */}
            {activeView === 'settings' && (
              <DashboardGrid>
                <CardPanel>
                  <div className="panel-header">
                    <h3><FaCog /> HR Policies & Defaults</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Standard contractual guidelines</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>Full-Time Employment Term</strong>
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
                        Standard 40 hours per week schedule (Monday – Friday), 3 months initial probation with KPI evaluation.
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>Part-Time & Visiting Faculty Term</strong>
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
                        Hourly or batch-based compensation structure with mandatory syllabus adherence and attendance logs.
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>Mandatory Verification Documents</strong>
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
                        Clear CNIC front & back, highest academic degree verification, recent photograph, and previous teaching experience letters.
                      </div>
                    </div>
                  </div>
                </CardPanel>

                <CardPanel>
                  <div className="panel-header">
                    <h3><FaCheckCircle /> Automated Hiring Workflow</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>How DeepSkills onboards instructors</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { step: '1', title: 'Teacher Profile', desc: 'Candidate fills personal and educational credentials.' },
                      { step: '2', title: 'Document Upload', desc: 'Candidate submits CNIC, degrees, and certificates.' },
                      { step: '3', title: 'JD Drafting & Review', desc: 'HR generates job description; teacher reviews and accepts terms.' },
                      { step: '4', title: 'Digital Signature', desc: 'Teacher signs the formal contract via canvas signature.' },
                      { step: '5', title: 'Official Finalization & Salary Sync', desc: 'HR issues Acceptance Letter and auto-connects salary to Finance Department.' }
                    ].map((st) => (
                      <div key={st.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#8B5CF6',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {st.step}
                        </div>
                        <div>
                          <strong style={{ color: '#f1f5f9', fontSize: '0.88rem' }}>{st.title}</strong>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{st.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardPanel>
              </DashboardGrid>
            )}

            {/* VIEW 8: ALL TEACHERS DIRECTORY */}
            {activeView === 'teachers' && (
              <>
                <StatsGrid>
                  <StatCard $color="#8B5CF6">
                    <span className="label">Total Faculty</span>
                    <span className="value">{teacherStats.total}</span>
                    <span className="sub">Registered instructors</span>
                  </StatCard>
                  <StatCard $color="#10b981">
                    <span className="label">Active Faculty</span>
                    <span className="value">{teacherStats.active}</span>
                    <span className="sub">Currently assigned & teaching</span>
                  </StatCard>
                  <StatCard $color="#f59e0b" $highlight={leaveStats.onLeaveToday > 0}>
                    <span className="label">On Leave Today</span>
                    <span className="value">{leaveStats.onLeaveToday}</span>
                    <span className="sub">{teacherStats.inactive} total inactive</span>
                  </StatCard>
                  <StatCard $color="#3b82f6">
                    <span className="label">Batches Covered</span>
                    <span className="value">{teacherStats.batchesCovered}</span>
                    <span className="sub">Active course sections</span>
                  </StatCard>
                </StatsGrid>

                <FilterCard>
                  <FilterGroup>
                    <SearchInputWrap>
                      <FaSearch className="search-icon" />
                      <input
                        placeholder="Search teachers by name, CNIC, email, specialization..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                      />
                      {teacherSearch && (
                        <button type="button" className="clear-btn" onClick={() => setTeacherSearch('')} title="Clear search">
                          <FaTimes />
                        </button>
                      )}
                    </SearchInputWrap>
                    <Select value={teacherCourseFilter} onChange={(e) => setTeacherCourseFilter(e.target.value)}>
                      <option value="all">All Courses ({courses.length})</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.title}>{c.title}</option>
                      ))}
                    </Select>
                    <Select value={teacherStatusFilter} onChange={(e) => setTeacherStatusFilter(e.target.value)}>
                      <option value="all">All Statuses ({teachersList.length})</option>
                      <option value="Active">Active ({teacherStats.active})</option>
                      <option value="Inactive">Inactive ({teacherStats.inactive})</option>
                    </Select>
                  </FilterGroup>

                  <FilterMeta>
                    <span className="counter">
                      Showing {filteredTeachers.length} of {teachersList.length} Faculty Members
                    </span>
                    {(teacherSearch || teacherCourseFilter !== 'all' || teacherStatusFilter !== 'all') && (
                      <button
                        type="button"
                        className="reset-link"
                        onClick={() => {
                          setTeacherSearch('');
                          setTeacherCourseFilter('all');
                          setTeacherStatusFilter('all');
                        }}
                      >
                        Reset filters
                      </button>
                    )}
                  </FilterMeta>
                </FilterCard>

                <CardPanel>
                  <div className="panel-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <FaUsers style={{ color: '#8B5CF6' }} /> Faculty Teachers Directory
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Academic faculty members, course batch assignments, and linked HR profiles
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {canMutate && (
                        <Button
                          $primary
                          onClick={() => {
                            setIsAddTeacherOpen(true);
                            setInviteSuccessData(null);
                          }}
                          style={{
                            padding: '9px 18px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <FaUserPlus /> Add Teacher
                        </Button>
                      )}
                    </div>
                  </div>

                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <th style={{ minWidth: '220px' }}>Teacher</th>
                          <th style={{ minWidth: '190px' }}>Contact Details</th>
                          <th style={{ minWidth: '200px' }}>Assigned Batches</th>
                          <th style={{ minWidth: '130px' }}>HR Pipeline</th>
                          <th style={{ minWidth: '100px' }}>Status</th>
                          <th style={{ minWidth: '180px', textAlign: 'right', paddingRight: '22px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeachers.map((teacher) => {
                          const initials = teacher.name
                            ? teacher.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                            : '??';

                          const hrApp = applications.find((a) =>
                            (teacher.cnic && a.profile.cnic === teacher.cnic) ||
                            (teacher.email && a.profile.email?.toLowerCase() === teacher.email.toLowerCase())
                          );

                          const directWaUrl = getTeacherWhatsAppUrl(
                            teacher.phone,
                            `Assalam-o-Alaikum ${teacher.name},\nDeepSkills HR Department here regarding your teaching schedule and portal updates.`
                          );

                          return (
                            <tr key={teacher.id}>
                              <td>
                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                  onClick={() => navigate(`/admin/hr/teachers/${teacher.id}`)}
                                  title="View teacher profile"
                                >
                                  <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '11px',
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(123, 31, 46, 0.22) 100%)',
                                    color: '#c4b5fd',
                                    border: '1px solid rgba(139, 92, 246, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.88rem',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                                  }}>
                                    {initials}
                                  </div>
                                  <div>
                                    <strong style={{ color: '#fff', fontSize: '0.92rem', display: 'block', transition: 'color 0.15s' }}>
                                      {teacher.name}
                                    </strong>
                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                                      {teacher.specialization || 'General Faculty'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.82rem', color: '#f1f5f9' }}>
                                    <FaPhoneAlt style={{ fontSize: '0.68rem', color: '#8B5CF6', flexShrink: 0 }} />
                                    <span>{teacher.phone || 'No phone'}</span>
                                  </div>
                                  {teacher.email && (
                                    <div
                                      style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.76rem', color: '#94a3b8', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      title={teacher.email}
                                    >
                                      <FaEnvelope style={{ fontSize: '0.68rem', color: '#64748b', flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{teacher.email}</span>
                                    </div>
                                  )}
                                  {teacher.cnic && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.72rem', color: '#a78bfa', fontFamily: 'monospace' }}>
                                      <FaIdCard style={{ fontSize: '0.68rem', color: '#8B5CF6', flexShrink: 0 }} />
                                      <span>{teacher.cnic}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '280px' }}>
                                  {(teacher.assignments && teacher.assignments.length > 0) ? (
                                    teacher.assignments.map((a) => (
                                      <span
                                        key={a.id}
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.04)',
                                          border: '1px solid rgba(255, 255, 255, 0.08)',
                                          borderRadius: '8px',
                                          padding: '4px 9px',
                                          fontSize: '0.75rem',
                                          color: '#cbd5e1',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px'
                                        }}
                                      >
                                        <span style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          background: a.role === 'Main' ? '#8B5CF6' : '#38bdf8'
                                        }} />
                                        <span>{a.batches?.batch_name || 'Batch'}</span>
                                        <span style={{
                                          color: a.role === 'Main' ? '#c4b5fd' : '#7dd3fc',
                                          fontWeight: 700,
                                          fontSize: '0.7rem'
                                        }}>
                                          ({a.role || 'Main'})
                                        </span>
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                                      No batches assigned
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {hrApp ? (
                                  <Badge
                                    $bg={hrApp.profile.hr_status === 'hired' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)'}
                                    $color={hrApp.profile.hr_status === 'hired' ? '#34d399' : '#fbbf24'}
                                    $border={hrApp.profile.hr_status === 'hired' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(245, 158, 11, 0.28)'}
                                  >
                                    {hrApp.profile.hr_status === 'hired' ? (
                                      <><FaCheckCircle style={{ fontSize: '0.7rem' }} /> Onboarded</>
                                    ) : (
                                      <><FaClock style={{ fontSize: '0.7rem' }} /> Step {hrApp.profile.step}</>
                                    )}
                                  </Badge>
                                ) : (
                                  <Badge $bg="rgba(148, 163, 184, 0.12)" $color="#94a3b8" $border="rgba(148, 163, 184, 0.22)">
                                    <FaUserCheck style={{ fontSize: '0.7rem' }} /> Direct Active
                                  </Badge>
                                )}
                              </td>
                              <td>
                                <Badge
                                  $bg={teacher.status === 'Active' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                                  $color={teacher.status === 'Active' ? '#10b981' : '#f87171'}
                                  $border={teacher.status === 'Active' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'}
                                >
                                  <span style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: teacher.status === 'Active' ? '#10b981' : '#ef4444',
                                    boxShadow: teacher.status === 'Active' ? '0 0 6px rgba(16, 185, 129, 0.5)' : 'none',
                                    display: 'inline-block'
                                  }} />
                                  {teacher.status || 'Active'}
                                </Badge>
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: '22px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'nowrap' }}>
                                  <Button
                                    onClick={() => navigate(`/admin/hr/teachers/${teacher.id}`)}
                                    title="View Teacher Profile & Academic History"
                                    style={{
                                      background: 'rgba(139, 92, 246, 0.1)',
                                      border: '1px solid rgba(139, 92, 246, 0.3)',
                                      color: '#c4b5fd',
                                      height: '34px',
                                      padding: '0 12px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      borderRadius: '8px'
                                    }}
                                  >
                                    <FaEye /> View
                                  </Button>
                                  {hrApp && (
                                    <Button
                                      disabled={generatingPdf?.startsWith(hrApp.profile.id)}
                                      onClick={() => handleDownloadExperienceCert(hrApp)}
                                      title="Download Official Experience Certificate"
                                      style={{
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        color: '#fcd34d',
                                        height: '34px',
                                        padding: '0 12px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        borderRadius: '8px'
                                      }}
                                    >
                                      <FaAward /> Cert
                                    </Button>
                                  )}
                                  {directWaUrl && (
                                    <Button
                                      as="a"
                                      href={directWaUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Message Teacher on WhatsApp"
                                      style={{
                                        width: '34px',
                                        height: '34px',
                                        minWidth: '34px',
                                        padding: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(37, 211, 102, 0.12)',
                                        border: '1px solid rgba(37, 211, 102, 0.35)',
                                        color: '#25D366',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem'
                                      }}
                                    >
                                      <FaWhatsapp />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredTeachers.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#64748b' }}>
                                  <FaUsers />
                                </div>
                                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.95rem' }}>
                                  {teacherSearch || teacherCourseFilter !== 'all' || teacherStatusFilter !== 'all'
                                    ? 'No faculty members match your search filters.'
                                    : 'No faculty teachers registered yet.'}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '360px' }}>
                                  {teacherSearch || teacherCourseFilter !== 'all' || teacherStatusFilter !== 'all'
                                    ? 'Try adjusting your search criteria or resetting filters.'
                                    : 'Click the Add Teacher button to onboard new faculty.'}
                                </div>
                                {(teacherSearch || teacherCourseFilter !== 'all' || teacherStatusFilter !== 'all') ? (
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setTeacherSearch('');
                                      setTeacherCourseFilter('all');
                                      setTeacherStatusFilter('all');
                                    }}
                                    style={{ marginTop: '6px' }}
                                  >
                                    Reset filters
                                  </Button>
                                ) : canMutate ? (
                                  <Button
                                    $primary
                                    onClick={() => {
                                      setIsAddTeacherOpen(true);
                                      setInviteSuccessData(null);
                                    }}
                                    style={{ marginTop: '6px' }}
                                  >
                                    <FaUserPlus /> Add Faculty Member
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </TableWrap>
                </CardPanel>
              </>
            )}
          </>
        )}
      </Container>

      {/* RECORD LEAVE MODAL */}
      {recordLeaveOpen && (
        <ModalOverlay onClick={() => setRecordLeaveOpen(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <h2><FaCalendarCheck /> Record Teacher Leave</h2>
            <form onSubmit={handleRecordLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label>
                Instructor:
                <select
                  value={newLeaveForm.teacherId}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, teacherId: e.target.value })}
                  required
                >
                  <option value="">Select Instructor</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'Teacher'})</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Start Date:
                  <input
                    type="date"
                    value={newLeaveForm.startDate}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value })}
                    required
                  />
                </label>
                <label>
                  End Date:
                  <input
                    type="date"
                    value={newLeaveForm.endDate}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label>
                Leave Type:
                <select
                  value={newLeaveForm.leaveType}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, leaveType: e.target.value })}
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Emergency">Emergency Leave</option>
                  <option value="Maternity/Paternity">Maternity/Paternity</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </label>

              <label>
                Reason:
                <textarea
                  placeholder="State reason for absence..."
                  value={newLeaveForm.reason}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })}
                  required
                />
              </label>

              <label>
                HR Notes (Optional):
                <input
                  placeholder="Administrative notes..."
                  value={newLeaveForm.adminNotes}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, adminNotes: e.target.value })}
                />
              </label>

              <div className="modal-actions">
                <Button type="button" onClick={() => setRecordLeaveOpen(false)}>Cancel</Button>
                <Button type="submit" $primary disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record & Approve Leave'}
                </Button>
              </div>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* REVIEW / APPROVE LEAVE MODAL */}
      {reviewLeaveTarget && (
        <ModalOverlay onClick={() => setReviewLeaveTarget(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <h2>
              {reviewAction === 'approve' ? <FaCheckCircle style={{ color: '#10b981' }} /> : <FaTimesCircle style={{ color: '#ef4444' }} />}
              {reviewAction === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </h2>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', fontSize: '0.88rem' }}>
              <div><strong>Instructor:</strong> {reviewLeaveTarget.teacher?.name}</div>
              <div><strong>Dates:</strong> {reviewLeaveTarget.start_date} → {reviewLeaveTarget.end_date}</div>
              <div><strong>Reason:</strong> {reviewLeaveTarget.reason}</div>
            </div>

            <form onSubmit={handleReviewLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reviewAction === 'approve' && (
                <>
                  <label>
                    Assign Substitute Instructor (Optional):
                    <select
                      value={substituteTeacherId}
                      onChange={(e) => setSubstituteTeacherId(e.target.value)}
                    >
                      <option value="">No Substitute Needed</option>
                      {teachersList.filter((t) => t.id !== reviewLeaveTarget.teacher_id).map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'Teacher'})</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Substitute Instructions / Batch Notice:
                    <textarea
                      placeholder="Enter instructions for classes during this period..."
                      value={substituteNotes}
                      onChange={(e) => setSubstituteNotes(e.target.value)}
                    />
                  </label>
                </>
              )}

              {reviewAction === 'reject' && (
                <label>
                  Rejection Reason:
                  <textarea
                    placeholder="Enter reason for rejecting this leave request..."
                    value={substituteNotes}
                    onChange={(e) => setSubstituteNotes(e.target.value)}
                    required
                  />
                </label>
              )}

              <div className="modal-actions">
                <Button type="button" onClick={() => setReviewLeaveTarget(null)}>Cancel</Button>
                <Button
                  type="submit"
                  $success={reviewAction === 'approve'}
                  $danger={reviewAction === 'reject'}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : reviewAction === 'approve' ? 'Approve Leave' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ADD TEACHER MODAL */}
      {isAddTeacherOpen && (
        <ModalOverlay onClick={() => { setIsAddTeacherOpen(false); setInviteSuccessData(null); }}>
          <ModalCard onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>
              {inviteSuccessData ? <><FaCheckCircle style={{ color: '#10b981' }} /> Faculty Invitation Ready</> : <><FaUserPlus /> Add Faculty Instructor</>}
            </h2>

            {inviteSuccessData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', padding: '10px 0' }}>
                <div style={{ color: '#10b981', fontSize: '2.6rem' }}>
                  <FaCheckCircle />
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
                  Faculty Onboarding Link Generated
                </div>
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  Account registered for <strong>{inviteSuccessData.name}</strong>. Instructor can log in using CNIC with OTP sent to their email, and complete their onboarding.
                </p>
                <div style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  textAlign: 'left',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Login Portal:</span>
                    <strong style={{ color: '#cbd5e1' }}>{inviteSuccessData.loginUrl}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Login CNIC:</span>
                    <strong style={{ color: '#cbd5e1' }}>{inviteSuccessData.cnic}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>OTP Email:</span>
                    <strong style={{ color: '#cbd5e1' }}>{inviteSuccessData.email}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
                  {inviteSuccessData.waUrl && (
                    <Button
                      as="a"
                      href={inviteSuccessData.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      $whatsapp
                      style={{ padding: '12px', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem' }}
                    >
                      <FaWhatsapp style={{ fontSize: '1.1rem' }} /> Send Invite via WhatsApp
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteSuccessData.onboardingUrl);
                      toast.success('Onboarding link copied!');
                    }}
                    style={{ padding: '12px', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                  >
                    <FaCopy /> Copy Onboarding Link
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsAddTeacherOpen(false);
                      setInviteSuccessData(null);
                      setAddTeacherForm({ name: '', cnic: '', phone: '', email: '', specialization: '', salary: '', course_id: '', selectedBatches: [], notes: '' });
                    }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer' }}
                  >
                    Done & Close
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <ModeSelector>
                  <ModeButton
                    type="button"
                    $active={addTeacherMode === 'invite'}
                    onClick={() => setAddTeacherMode('invite')}
                  >
                    <FaPaperPlane /> Invite to HR Pipeline (Recommended)
                  </ModeButton>
                  <ModeButton
                    type="button"
                    $active={addTeacherMode === 'direct'}
                    onClick={() => setAddTeacherMode('direct')}
                  >
                    <FaUserPlus /> Direct Staff Activation
                  </ModeButton>
                </ModeSelector>

                {addTeacherMode === 'invite' ? (
                  <InfoBox>
                    <strong>Standard HR Hiring Workflow:</strong> Register candidate details and immediately send them a secure WhatsApp/Web link to fill their digital profile, credentials, documents, and acceptance letter.
                  </InfoBox>
                ) : (
                  <InfoBox style={{ background: 'rgba(234, 179, 8, 0.08)', borderColor: 'rgba(234, 179, 8, 0.25)', color: '#fde047' }}>
                    <strong>Immediate Direct Activation:</strong> Bypasses candidate self-onboarding. Instantly provisions LMS portal login, assigns batches, and synchronizes a completed record into HR Files.
                  </InfoBox>
                )}

                <form onSubmit={handleAddTeacherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label>
                      Full Name*
                      <input
                        required
                        value={addTeacherForm.name}
                        onChange={(e) => setAddTeacherForm({ ...addTeacherForm, name: e.target.value })}
                        placeholder="e.g. Dr. Muhammad Ahmed"
                      />
                    </label>
                    <label>
                      CNIC Number*
                      <input
                        required
                        maxLength={15}
                        value={addTeacherForm.cnic}
                        onChange={handleTeacherCnicChange}
                        placeholder="XXXXX-XXXXXXX-X"
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label>
                      Phone Number*
                      <input
                        required
                        value={addTeacherForm.phone}
                        onChange={(e) => setAddTeacherForm({ ...addTeacherForm, phone: e.target.value })}
                        placeholder="03XXXXXXXXX"
                      />
                    </label>
                    <label>
                      Email Address*
                      <input
                        required
                        type="email"
                        value={addTeacherForm.email}
                        onChange={(e) => setAddTeacherForm({ ...addTeacherForm, email: e.target.value })}
                        placeholder="instructor@deepskills.pk"
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label>
                      Specialization / Subject Domain
                      <input
                        value={addTeacherForm.specialization}
                        onChange={(e) => setAddTeacherForm({ ...addTeacherForm, specialization: e.target.value })}
                        placeholder="e.g. Full Stack Web Development, UI/UX"
                      />
                    </label>
                    <label>
                      {addTeacherMode === 'invite' ? 'Expected Monthly Salary (PKR)' : 'Agreed Monthly Salary (PKR)'}
                      <input
                        type="number"
                        value={addTeacherForm.salary}
                        onChange={(e) => setAddTeacherForm({ ...addTeacherForm, salary: e.target.value })}
                        placeholder="e.g. 80000"
                      />
                    </label>
                  </div>

                  {addTeacherMode === 'direct' && (
                    <>
                      <label>
                        Assign Course (Filters Batches)
                        <select
                          value={addTeacherForm.course_id}
                          onChange={(e) => setAddTeacherForm({ ...addTeacherForm, course_id: e.target.value })}
                        >
                          <option value="">Select Course</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </label>

                      {addTeacherForm.course_id && (
                        <label>
                          Select Batches & Roles
                          <div style={{
                            background: '#0a0a0a',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '10px',
                            maxHeight: '140px',
                            overflowY: 'auto'
                          }}>
                            {batches.filter((b) => {
                              const selectedCourse = courses.find((c) => c.id === addTeacherForm.course_id);
                              return b.course === selectedCourse?.title;
                            }).map((b) => {
                              const isSelected = addTeacherForm.selectedBatches.find((sb) => sb.batch_id === b.id);
                              return (
                                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                                    <input
                                      type="checkbox"
                                      checked={!!isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          if (!addTeacherForm.selectedBatches.find((sb) => sb.batch_id === b.id)) {
                                            setAddTeacherForm({
                                              ...addTeacherForm,
                                              selectedBatches: [...addTeacherForm.selectedBatches, { batch_id: b.id, role: 'Main' }]
                                            });
                                          }
                                        } else {
                                          setAddTeacherForm({
                                            ...addTeacherForm,
                                            selectedBatches: addTeacherForm.selectedBatches.filter((sb) => sb.batch_id !== b.id)
                                          });
                                        }
                                      }}
                                    />
                                    {b.batch_name}
                                  </label>
                                  {isSelected && (
                                    <select
                                      style={{ width: '110px', padding: '4px 6px', fontSize: '0.78rem' }}
                                      value={isSelected.role}
                                      onChange={(e) => {
                                        setAddTeacherForm({
                                          ...addTeacherForm,
                                          selectedBatches: addTeacherForm.selectedBatches.map((sb) => sb.batch_id === b.id ? { ...sb, role: e.target.value } : sb)
                                        });
                                      }}
                                    >
                                      <option value="Main">Main</option>
                                      <option value="Assistant">Assistant</option>
                                    </select>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </label>
                      )}
                    </>
                  )}

                  <label>
                    {addTeacherMode === 'invite' ? 'Interview & Candidate Notes (Optional)' : 'Admin Notes (Optional)'}
                    <textarea
                      rows="2"
                      value={addTeacherForm.notes}
                      onChange={(e) => setAddTeacherForm({ ...addTeacherForm, notes: e.target.value })}
                      placeholder="Notes regarding candidate interview, past experience..."
                    />
                  </label>

                  <div className="modal-actions">
                    <Button
                      type="button"
                      onClick={() => {
                        setIsAddTeacherOpen(false);
                        setInviteSuccessData(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      $primary
                      disabled={addingTeacher}
                      style={{ padding: '10px 20px', fontWeight: '700' }}
                    >
                      {addingTeacher ? 'Processing...' : addTeacherMode === 'invite' ? 'Generate & Send Onboarding Invite' : 'Directly Activate Teacher'}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </ModalCard>
        </ModalOverlay>
      )}

      {/* DRAWERS & MODALS */}
      <AdminHRDrawer
        open={drawerOpen}
        application={selectedApplication}
        onClose={() => setDrawerOpen(false)}
      />

      <AdminJDComposer
        open={composerOpen}
        templates={templates}
        initialDraft={composerDraft}
        initialTemplateId={composerTemplateId}
        onClose={() => setComposerOpen(false)}
        onTemplateChange={handleTemplateChange}
        onSend={handleSendJd}
        loading={submitting}
      />

      <AdminFinalizeHiringModal
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        onSubmit={handleFinalize}
        loading={submitting}
      />
    </AdminLayout>
  );
};

export default AdminHRManagement;
