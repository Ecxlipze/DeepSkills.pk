import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminHRTable from '../components/hr/AdminHRTable';
import AdminHRDrawer from '../components/hr/AdminHRDrawer';
import AdminJDComposer from '../components/hr/AdminJDComposer';
import AdminFinalizeHiringModal from '../components/hr/AdminFinalizeHiringModal';
import AdminJDTemplateModal from '../components/hr/AdminJDTemplateModal';
import {
  createJDDraft,
  fetchAdminHRApplications,
  fetchJDTemplates,
  createJDTemplate,
  updateJDTemplate,
  deleteJDTemplate,
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
import { createUser, fetchRoles } from '../utils/userManagementApi';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { supabase } from '../supabaseClient';
import {
  AdminModal,
  AdminModalHeader,
  AdminModalBody,
  AdminModalFooter,
  FormField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminButton,
  FormGrid,
  DepartmentWelcomeBanner
} from '../components/portal';
import DatePicker from '../components/DatePicker';
import {
  validateRequired,
  validateEmail,
  validateCnic,
  validatePhone,
  validateNumber,
  validateDateRange,
  validateForm,
  formatCnic,
  formatPhone
} from '../utils/formValidation';
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
  FaIdCard,
  FaBolt,
  FaEdit,
  FaTrashAlt,
  FaMapMarkerAlt,
  FaBriefcase
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
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
  overflow-x: auto;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const TabButton = styled.button`
  background: ${p => p.$active ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${p => p.$active ? '#a78bfa' : '#94a3b8'};
  border: 1px solid ${p => p.$active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  flex-shrink: 0;
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
    padding: 1px 6px;
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
  const target = (
    application.profile.designation ||
    application.profile.department ||
    application.profile.specialization ||
    application.teacher?.specialization ||
    ''
  ).toLowerCase();

  return (
    templates.find((t) => (t.title_template && target.includes(t.title_template.toLowerCase())) && t.employment_type === employmentType) ||
    templates.find((t) => (t.specialization && target.includes(t.specialization.toLowerCase())) && t.employment_type === employmentType) ||
    templates.find((t) => (t.title_template && target.includes(t.title_template.toLowerCase()))) ||
    templates.find((t) => (t.specialization && target.includes(t.specialization.toLowerCase()))) ||
    templates.find((t) => (t.specialization || '').toLowerCase() === (application.profile.specialization || '').toLowerCase() && t.employment_type === employmentType) ||
    templates.find((t) => (t.specialization || '').toLowerCase() === (application.profile.specialization || '').toLowerCase()) ||
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
  const [rolesList, setRolesList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [candidateTypeFilter, setCandidateTypeFilter] = useState('all');
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

  // JD Template management states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Teacher / Staff modal states
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [addTeacherMode, setAddTeacherMode] = useState('invite');
  const [inviteSuccessData, setInviteSuccessData] = useState(null);
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [addTeacherForm, setAddTeacherForm] = useState({
    employee_type: 'faculty',
    name: '',
    cnic: '',
    phone: '',
    email: '',
    specialization: '',
    department: 'Admissions',
    role_id: '',
    custom_role_name: '',
    salary_type: 'fixed',
    salary: '',
    course_id: '',
    selectedBatches: [],
    notes: ''
  });
  const [addTeacherErrors, setAddTeacherErrors] = useState({});

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
  const [leaveErrors, setLeaveErrors] = useState({});
  const [reviewLeaveTarget, setReviewLeaveTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');
  const [substituteTeacherId, setSubstituteTeacherId] = useState('');
  const [substituteNotes, setSubstituteNotes] = useState('');
  const [reviewErrors, setReviewErrors] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [apps, jdTemplates, leavesData, teachersRes, coursesRes, batchesRes, assignmentsRes, rolesData] = await Promise.all([
        fetchAdminHRApplications(),
        fetchJDTemplates(),
        fetchTeacherLeaves(),
        supabase.from('teachers').select('*').order('name'),
        supabase.from('courses').select('*'),
        supabase.from('batches').select('*'),
        supabase.from('teacher_batches').select('*, batches(batch_name, course)'),
        fetchRoles().catch(() => [])
      ]);
      setApplications(apps || []);
      setTemplates(jdTemplates || []);
      setLeaves(leavesData || []);
      setRolesList(rolesData || []);

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
    const facultyCount = applications.filter((a) => !a.isStaff).length;
    const staffCount = applications.filter((a) => a.isStaff).length;
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
      facultyCount,
      staffCount,
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
    const haystack = `${application.teacher?.name || ''} ${application.profile.full_name || ''} ${application.profile.cnic || ''} ${application.profile.specialization || ''} ${application.profile.designation || ''} ${application.profile.department || ''} ${application.profile.email || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || application.profile.hr_status === statusFilter;
    const matchesType = candidateTypeFilter === 'all' ||
      (candidateTypeFilter === 'staff' ? application.isStaff : !application.isStaff);
    return matchesSearch && matchesStatus && matchesType;
  }), [applications, search, statusFilter, candidateTypeFilter]);

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

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((tpl) => {
      const matchSpec = (tpl.specialization || '').toLowerCase().includes(q);
      const matchTitle = (tpl.title_template || '').toLowerCase().includes(q);
      const matchEmp = (tpl.employment_type || '').toLowerCase().includes(q);
      return matchSpec || matchTitle || matchEmp;
    });
  }, [templates, templateSearch]);

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
      const delivery = await sendJD(composerApplication.profile.id, {
        ...draft,
        templateId: composerTemplateId
      });
      toast.success('JD is available in the teacher portal.');
      if (delivery?.warning) toast.error(delivery.warning);
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to send JD.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddTemplate = () => {
    setSelectedTemplateForEdit(null);
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl) => {
    setSelectedTemplateForEdit(tpl);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (templatePayload) => {
    if (!canMutate) {
      toast.error('You do not have permission to manage JD templates.');
      return;
    }
    setSavingTemplate(true);
    try {
      if (selectedTemplateForEdit?.id) {
        await updateJDTemplate(selectedTemplateForEdit.id, templatePayload);
        toast.success('JD Template updated successfully!');
      } else {
        await createJDTemplate(templatePayload);
        toast.success('New JD Template created successfully!');
      }
      setIsTemplateModalOpen(false);
      const updated = await fetchJDTemplates();
      setTemplates(updated || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save JD template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tpl) => {
    if (!canMutate) {
      toast.error('You do not have permission to archive JD templates.');
      return;
    }
    const tplTitle = tpl.title_template ? tpl.title_template.replace('{{specialization}}', tpl.specialization) : tpl.specialization;
    if (!window.confirm(`Are you sure you want to archive the "${tplTitle}" template?`)) {
      return;
    }
    try {
      await deleteJDTemplate(tpl.id);
      toast.success('Template archived.');
      const updated = await fetchJDTemplates();
      setTemplates(updated || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to archive template.');
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

      const delivery = await finalizeHiring({
        application: selectedApplication,
        adminNote,
        acceptanceBlob,
        hiringBlob
      });

      toast.success(`${selectedApplication.teacher?.name || selectedApplication.profile.full_name} has been officially hired and connected to Finance.`);
      if (delivery?.warning) toast.error(delivery.warning);
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
      const delivery = await rejectApplication(application.profile.id, reason.trim());
      if (delivery?.warning) toast.error(delivery.warning);
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
    const { isValid, errors: valErrors } = validateForm(newLeaveForm, {
      teacherId: [(v) => validateRequired(v, 'Instructor')],
      startDate: [(v) => validateRequired(v, 'Start Date')],
      endDate: [
        (v) => validateRequired(v, 'End Date'),
        (v) => validateDateRange(newLeaveForm.startDate, v)
      ],
      reason: [(v) => validateRequired(v, 'Reason')]
    });
    if (!isValid) {
      setLeaveErrors(valErrors);
      toast.error('Please resolve the highlighted errors in the form.');
      return;
    }
    setLeaveErrors({});
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
    if (reviewAction === 'reject' && !String(substituteNotes || '').trim()) {
      setReviewErrors({ substituteNotes: 'Rejection reason is required' });
      toast.error('Please enter a rejection reason.');
      return;
    }
    setReviewErrors({});
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
    const formatted = formatCnic(e.target.value);
    setAddTeacherForm({ ...addTeacherForm, cnic: formatted });
    if (addTeacherErrors.cnic) setAddTeacherErrors(prev => ({ ...prev, cnic: null }));
  };

  const handleAddTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to add teachers.');
      return;
    }
    const { isValid, errors: valErrors } = validateForm(addTeacherForm, {
      name: [(v) => validateRequired(v, 'Full Name')],
      cnic: [(v) => validateCnic(v)],
      phone: [(v) => validatePhone(v, 'WhatsApp / Phone Number', true, { min: 10, max: 13 })],
      email: [(v) => validateEmail(v, 'Official Email Address', true)],
      salary: [(v) => {
        if (!v) return null;
        if (addTeacherForm.salary_type === 'percentage') {
          return validateNumber(v, { min: 1, max: 100, fieldName: 'Revenue Share Percentage' });
        }
        return validateNumber(v, { min: 0, integer: true, fieldName: 'Fixed Monthly Salary' });
      }]
    });
    if (!isValid) {
      setAddTeacherErrors(valErrors);
      toast.error('Please resolve the highlighted errors in the form.');
      return;
    }
    setAddTeacherErrors({});
    setAddingTeacher(true);

    const isPercentage = addTeacherForm.salary_type === 'percentage';
    const parsedSalary = addTeacherForm.salary && !isNaN(parseFloat(addTeacherForm.salary))
      ? parseFloat(addTeacherForm.salary)
      : null;
    const compensationNote = isPercentage && parsedSalary
      ? `[Compensation: ${parsedSalary}% Revenue Share]`
      : null;
    const finalTeacherNotes = [compensationNote, addTeacherForm.notes].filter(Boolean).join(' | ');

    try {
      const cleanDigits = String(addTeacherForm.cnic).replace(/\D/g, '');
      const formatted = cleanDigits.length === 13 ? `${cleanDigits.slice(0, 5)}-${cleanDigits.slice(5, 12)}-${cleanDigits.slice(12)}` : addTeacherForm.cnic;
      const variants = Array.from(new Set([formatted, cleanDigits]));

      const { data: existingTeacher } = await supabase.from('teachers').select('id, name').in('cnic', variants).limit(1);
      if (existingTeacher && existingTeacher.length > 0) {
        toast.error(`A teacher with CNIC ${addTeacherForm.cnic} is already registered ("${existingTeacher[0].name}"). CNIC must be unique across all roles.`);
        return;
      }

      const { data: existingStaff } = await supabase.from('users').select('id, full_name, role').in('cnic', variants).limit(1);
      if (existingStaff && existingStaff.length > 0) {
        toast.error(`Cannot register candidate: CNIC ${addTeacherForm.cnic} is already registered to staff member "${existingStaff[0].full_name}" (${existingStaff[0].role}). A CNIC must be unique across all roles.`);
        return;
      }

      const { data: existingStudent } = await supabase.from('admissions').select('id, name').in('cnic', variants).limit(1);
      if (existingStudent && existingStudent.length > 0) {
        toast.error(`Cannot register candidate: CNIC ${addTeacherForm.cnic} is already registered to student "${existingStudent[0].name}". A CNIC must be unique across all roles.`);
        return;
      }

      const { data: existingAllowed } = await supabase.from('allowed_cnics').select('role, name').in('cnic', variants).limit(1);
      if (existingAllowed && existingAllowed.length > 0) {
        toast.error(`Cannot register candidate: CNIC ${addTeacherForm.cnic} is already active in login access as ${existingAllowed[0].role} ("${existingAllowed[0].name}").`);
        return;
      }

      if (addTeacherForm.employee_type === 'staff') {
        const selectedRole = rolesList.find(r => r.id === addTeacherForm.role_id);
        const roleName = selectedRole?.name || addTeacherForm.custom_role_name || addTeacherForm.department || 'Administrative Staff';

        if (addTeacherMode === 'invite') {
          // 1. Create staff user with status 'onboarding' (which syncs to allowed_cnics)
          const userPayload = {
            fullName: addTeacherForm.name,
            cnic: addTeacherForm.cnic,
            phone: addTeacherForm.phone,
            email: addTeacherForm.email,
            roleValue: selectedRole ? `custom-role:${selectedRole.id}` : 'custom',
            customRoleId: selectedRole ? selectedRole.id : null,
            status: 'onboarding',
            accountNotes: [addTeacherForm.department ? `Department: ${addTeacherForm.department}` : '', addTeacherForm.notes].filter(Boolean).join(' | ')
          };

          const newUser = await createUser(userPayload, user);

          // 2. Upsert into hr_profiles with department & designation
          try {
            await supabase.from('hr_profiles').upsert({
              user_id: newUser.id,
              employee_type: 'staff',
              full_name: addTeacherForm.name,
              cnic: addTeacherForm.cnic,
              personal_phone: addTeacherForm.phone,
              personal_email: addTeacherForm.email,
              department: addTeacherForm.department || 'General Administration',
              designation: roleName,
              specialization: roleName,
              expected_salary: parsedSalary ? Math.round(parsedSalary) : null,
              current_step: 1,
              hr_status: 'pending',
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
          } catch (hrErr) {
            console.warn('HR profile sync notice:', hrErr);
          }

          const loginUrl = `${window.location.origin}/login`;
          const onboardingUrl = `${window.location.origin}/staff/onboarding`;
          const waText = `Assalam-o-Alaikum ${addTeacherForm.name},\n\nWelcome to DeepSkills! Your administrative staff onboarding account is ready.\n\nPosition: ${roleName} (${addTeacherForm.department || 'Administration'})\n\nLogin Instructions:\n1. Open portal: ${loginUrl}\n2. Enter your CNIC: ${addTeacherForm.cnic}\n3. Enter the 6-digit OTP sent to your email (${addTeacherForm.email})\n4. Complete your verification and profile submission at ${onboardingUrl}.\n\nOnce reviewed and approved by HR, your administrative portal access and permissions will unlock automatically.\n\nDeepSkills HR & Administration`;
          const waUrl = getTeacherWhatsAppUrl(addTeacherForm.phone, waText);

          setInviteSuccessData({
            name: addTeacherForm.name,
            phone: addTeacherForm.phone,
            cnic: addTeacherForm.cnic,
            email: addTeacherForm.email,
            roleName,
            isStaff: true,
            loginUrl,
            onboardingUrl,
            waUrl
          });

          toast.success('Staff candidate registered! Login authorized via CNIC & Email OTP.');
          await load();
        } else {
          // Direct staff creation & activation
          const userPayload = {
            fullName: addTeacherForm.name,
            cnic: addTeacherForm.cnic,
            phone: addTeacherForm.phone,
            email: addTeacherForm.email,
            roleValue: selectedRole ? `custom-role:${selectedRole.id}` : 'custom',
            customRoleId: selectedRole ? selectedRole.id : null,
            status: 'active',
            accountNotes: [addTeacherForm.department ? `Department: ${addTeacherForm.department}` : '', addTeacherForm.notes].filter(Boolean).join(' | ')
          };

          const newUser = await createUser(userPayload, user);

          try {
            await supabase.from('hr_profiles').upsert({
              user_id: newUser.id,
              employee_type: 'staff',
              full_name: addTeacherForm.name,
              cnic: addTeacherForm.cnic,
              personal_phone: addTeacherForm.phone,
              personal_email: addTeacherForm.email,
              department: addTeacherForm.department || 'General Administration',
              designation: roleName,
              specialization: roleName,
              expected_salary: parsedSalary ? Math.round(parsedSalary) : null,
              current_step: 5,
              hr_status: 'hired',
              hired_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
          } catch (hrSyncErr) {
            console.warn('HR profile sync notice:', hrSyncErr);
          }

          toast.success('Staff member created and activated with administrative permissions!');
          setIsAddTeacherOpen(false);
          await load();
          setAddTeacherForm({
            employee_type: 'faculty',
            name: '',
            cnic: '',
            phone: '',
            email: '',
            specialization: '',
            department: 'Admissions',
            role_id: '',
            custom_role_name: '',
            salary_type: 'fixed',
            salary: '',
            course_id: '',
            selectedBatches: [],
            notes: ''
          });
        }
        return;
      }

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
            notes: finalTeacherNotes || null
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
            expected_salary: parsedSalary ? Math.round(parsedSalary) : null,
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

        // Auto-connect fixed salary into teacher_salaries for Finance department
        if (!isPercentage && parsedSalary && parsedSalary > 0) {
          try {
            await supabase.from('teacher_salaries').upsert({
              teacher_id: teacherRecord.id,
              monthly_amount: parsedSalary,
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
            notes: finalTeacherNotes || null
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
            expected_salary: parsedSalary ? Math.round(parsedSalary) : null,
            current_step: 5,
            hr_status: 'hired',
            hired_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'teacher_id' });
        } catch (hrSyncErr) {
          console.warn('HR profile sync notice:', hrSyncErr);
        }

        if (!isPercentage && parsedSalary && parsedSalary > 0) {
          try {
            await supabase.from('teacher_salaries').upsert({
              teacher_id: newTeacher.id,
              monthly_amount: parsedSalary,
              effective_from: new Date().toISOString().split('T')[0]
            }, { onConflict: 'teacher_id' });
          } catch (salErr) {
            console.warn('Teacher salary record notice:', salErr);
          }
        }

        toast.success('Teacher added & synced with HR profiles successfully!');
        setIsAddTeacherOpen(false);
        await load();
        setAddTeacherForm({
          employee_type: 'faculty',
          name: '',
          cnic: '',
          phone: '',
          email: '',
          specialization: '',
          department: 'Admissions',
          role_id: '',
          custom_role_name: '',
          salary_type: 'fixed',
          salary: '',
          course_id: '',
          selectedBatches: [],
          notes: ''
        });
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
              <FaUsers /> HR & Unified Hiring Portal
            </h1>
            <p>Onboard faculty & administrative staff, manage contracts, track leave absence, and issue verified dossiers.</p>
          </div>
          {canMutate && (
            <AdminButton
              variant="primary"
              onClick={() => {
                setIsAddTeacherOpen(true);
                setInviteSuccessData(null);
              }}
              style={{
                padding: '10px 18px',
                fontWeight: '700',
                fontSize: '0.88rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <FaUserPlus /> Invite / Add Candidate
            </AdminButton>
          )}
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
                <DepartmentWelcomeBanner
                  user={user}
                  departmentLabel="HR & Faculty Workstation"
                  subtitle="Unified staff and faculty talent pipeline, automated contract signatures, credentials, and daily attendance leaves."
                  color="#8B5CF6"
                  metrics={[
                    {
                      label: "Pending Applications",
                      value: stats.pending,
                      alert: stats.pending > 0,
                      badge: stats.pending > 0 ? "Review Needed" : "All Clear",
                      sub: stats.pending > 0 ? "Awaiting initial dossier action" : "All candidate files screened",
                      onClick: () => navigate('/admin/hr/applications')
                    },
                    {
                      label: "Signed Contracts Ready",
                      value: stats.signed,
                      alert: stats.signed > 0,
                      badge: stats.signed > 0 ? "Ready to Hire" : "In Pipeline",
                      sub: stats.signed > 0 ? "Awaiting final onboarding activation" : "No pending activations",
                      onClick: () => navigate('/admin/hr/signatures')
                    },
                    {
                      label: "Staff On Leave Today",
                      value: leaveStats.onLeaveToday,
                      alert: leaveStats.onLeaveToday > 0,
                      badge: leaveStats.onLeaveToday > 0 ? "Coverage Active" : "Full Attendance",
                      sub: leaveStats.onLeaveToday > 0 ? "Faculty leaves logged today" : "All teachers present",
                      onClick: () => navigate('/admin/hr/leaves')
                    },
                    {
                      label: "Active Hired Staff",
                      value: stats.hired,
                      alert: false,
                      badge: "Active Roster",
                      sub: "Onboarded faculty and staff",
                      onClick: () => navigate('/admin/hr/teachers')
                    }
                  ]}
                  quickActions={[
                    ...(canMutate ? [{
                      label: "Add Faculty / Staff",
                      icon: <FaPlus />,
                      primary: true,
                      onClick: () => { setAddTeacherMode('invite'); setIsAddTeacherOpen(true); }
                    }] : []),
                    {
                      label: "Candidate Applications",
                      icon: <FaUsers />,
                      primary: false,
                      onClick: () => navigate('/admin/hr/applications')
                    },
                    ...(canMutate ? [{
                      label: "JD Templates",
                      icon: <FaFileAlt />,
                      primary: false,
                      onClick: () => navigate('/admin/hr/jds')
                    }] : [])
                  ]}
                />

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
                        placeholder="Search candidate by name, CNIC, specialization, designation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button type="button" className="clear-btn" onClick={() => setSearch('')} title="Clear search">
                          <FaTimes />
                        </button>
                      )}
                    </SearchInputWrap>
                    <Select value={candidateTypeFilter} onChange={(e) => setCandidateTypeFilter(e.target.value)}>
                      <option value="all">All Employee Types ({applications.length})</option>
                      <option value="faculty">Faculty / Teachers ({stats.facultyCount})</option>
                      <option value="staff">Administrative Staff ({stats.staffCount})</option>
                    </Select>
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
                    {(search || statusFilter !== 'all' || candidateTypeFilter !== 'all') && (
                      <button
                        type="button"
                        className="reset-link"
                        onClick={() => { setSearch(''); setStatusFilter('all'); setCandidateTypeFilter('all'); }}
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
                  <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <FaFolder style={{ color: '#8B5CF6' }} /> Standard & Custom JD Templates
                        <Badge $bg="rgba(139, 92, 246, 0.15)" $color="#c4b5fd" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          {templates.length} Active
                        </Badge>
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Pre-configured role profiles & custom blueprints for faculty job descriptions
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <SearchInputWrap style={{ minWidth: '220px', maxWidth: '300px' }}>
                        <FaSearch className="search-icon" />
                        <input
                          placeholder="Search templates..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                        />
                        {templateSearch && (
                          <button type="button" className="clear-btn" onClick={() => setTemplateSearch('')} title="Clear search">
                            <FaTimes />
                          </button>
                        )}
                      </SearchInputWrap>

                      {canMutate && (
                        <Button $primary onClick={handleOpenAddTemplate} style={{ whiteSpace: 'nowrap' }}>
                          <FaPlus /> Add Template
                        </Button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginTop: '16px' }}>
                    {filteredTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <strong style={{ color: '#f8fafc', fontSize: '1rem', display: 'block', lineHeight: 1.3 }}>
                              {tpl.title_template ? tpl.title_template.replace('{{specialization}}', tpl.specialization) : tpl.specialization}
                            </strong>
                            <div style={{ fontSize: '0.8rem', color: '#a78bfa', marginTop: '2px', fontWeight: 500 }}>
                              {tpl.specialization}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <Badge $bg="rgba(139, 92, 246, 0.12)" $color="#c4b5fd">{tpl.employment_type || 'Full-time'}</Badge>
                            {tpl.location_mode && (
                              <Badge $bg="rgba(59, 130, 246, 0.12)" $color="#93c5fd">{tpl.location_mode}</Badge>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0, 0, 0, 0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Working Hours:</span>
                            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{tpl.working_hours || 'Batch timings'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Reporting To:</span>
                            <span style={{ color: '#cbd5e1' }}>{tpl.reporting_to || 'Academic Director'}</span>
                          </div>
                          {tpl.department && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Department:</span>
                              <span style={{ color: '#cbd5e1' }}>{tpl.department}</span>
                            </div>
                          )}
                        </div>

                        {tpl.responsibilities && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>Key Responsibilities:</div>
                            <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.45, color: '#94a3b8' }}>
                              {(Array.isArray(tpl.responsibilities) ? tpl.responsibilities : [String(tpl.responsibilities)])
                                .slice(0, 2)
                                .map((resp, i) => (
                                  <li key={i}>{resp}</li>
                                ))}
                            </ul>
                          </div>
                        )}

                        {canMutate && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <Button
                              style={{ flex: 1, padding: '7px 12px', fontSize: '0.78rem' }}
                              onClick={() => handleOpenEditTemplate(tpl)}
                            >
                              <FaEdit /> Edit Template
                            </Button>
                            <Button
                              $danger
                              style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                              onClick={() => handleDeleteTemplate(tpl)}
                              title="Archive template"
                            >
                              <FaTrashAlt />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                        <FaFolder style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }} />
                        <div>{templateSearch ? 'No JD templates matching your search.' : 'No active templates available.'}</div>
                        {canMutate && !templateSearch && (
                          <Button $primary style={{ marginTop: '12px' }} onClick={handleOpenAddTemplate}>
                            <FaPlus /> Create First Template
                          </Button>
                        )}
                      </div>
                    )}
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
      <AdminModal
        isOpen={recordLeaveOpen}
        onClose={() => { setRecordLeaveOpen(false); setLeaveErrors({}); }}
        maxWidth="560px"
      >
        <AdminModalHeader
          icon={FaCalendarCheck}
          title="Record Teacher Leave"
          subtitle="Log scheduled or emergency instructor absence and manage approvals"
          onClose={() => { setRecordLeaveOpen(false); setLeaveErrors({}); }}
        />
        <AdminModalBody>
          <form id="record-leave-form" onSubmit={handleRecordLeaveSubmit} noValidate>
            <FormField label="Instructor" required error={leaveErrors.teacherId}>
              <AdminSelect
                value={newLeaveForm.teacherId}
                onChange={(e) => {
                  setNewLeaveForm({ ...newLeaveForm, teacherId: e.target.value });
                  if (leaveErrors.teacherId) setLeaveErrors(prev => ({ ...prev, teacherId: null }));
                }}
                hasError={Boolean(leaveErrors.teacherId)}
              >
                <option value="">Select Instructor</option>
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'Teacher'})</option>
                ))}
              </AdminSelect>
            </FormField>

            <FormGrid columns="1fr 1fr" gap="12px" style={{ marginTop: '14px' }}>
              <FormField label="Start Date" required error={leaveErrors.startDate}>
                <DatePicker
                  value={newLeaveForm.startDate}
                  max={newLeaveForm.endDate || undefined}
                  onChange={(e) => {
                    setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value });
                    if (leaveErrors.startDate) setLeaveErrors(prev => ({ ...prev, startDate: null }));
                  }}
                  hasError={Boolean(leaveErrors.startDate)}
                  aria-label="Leave Start Date"
                />
              </FormField>
              <FormField label="End Date" required error={leaveErrors.endDate}>
                <DatePicker
                  value={newLeaveForm.endDate}
                  min={newLeaveForm.startDate || undefined}
                  onChange={(e) => {
                    setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value });
                    if (leaveErrors.endDate) setLeaveErrors(prev => ({ ...prev, endDate: null }));
                  }}
                  hasError={Boolean(leaveErrors.endDate)}
                  aria-label="Leave End Date"
                />
              </FormField>
            </FormGrid>

            <div style={{ marginTop: '14px' }}>
              <FormField label="Leave Type">
                <AdminSelect
                  value={newLeaveForm.leaveType}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, leaveType: e.target.value })}
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Emergency">Emergency Leave</option>
                  <option value="Maternity/Paternity">Maternity/Paternity</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </AdminSelect>
              </FormField>
            </div>

            <div style={{ marginTop: '14px' }}>
              <FormField label="Reason" required error={leaveErrors.reason}>
                <AdminTextarea
                  placeholder="State reason for absence..."
                  value={newLeaveForm.reason}
                  onChange={(e) => {
                    setNewLeaveForm({ ...newLeaveForm, reason: e.target.value });
                    if (leaveErrors.reason) setLeaveErrors(prev => ({ ...prev, reason: null }));
                  }}
                  hasError={Boolean(leaveErrors.reason)}
                  rows={3}
                />
              </FormField>
            </div>

            <div style={{ marginTop: '14px' }}>
              <FormField label="HR Notes (Optional)">
                <AdminInput
                  placeholder="Administrative notes..."
                  value={newLeaveForm.adminNotes}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, adminNotes: e.target.value })}
                />
              </FormField>
            </div>
          </form>
        </AdminModalBody>
        <AdminModalFooter>
          <AdminButton variant="secondary" onClick={() => { setRecordLeaveOpen(false); setLeaveErrors({}); }}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" form="record-leave-form" disabled={submitting}>
            {submitting ? 'Recording...' : 'Record & Approve Leave'}
          </AdminButton>
        </AdminModalFooter>
      </AdminModal>

      {/* REVIEW / APPROVE LEAVE MODAL */}
      <AdminModal
        isOpen={Boolean(reviewLeaveTarget)}
        onClose={() => { setReviewLeaveTarget(null); setReviewErrors({}); }}
        maxWidth="560px"
      >
        <AdminModalHeader
          icon={reviewAction === 'approve' ? FaCheckCircle : FaTimesCircle}
          title={reviewAction === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
          subtitle={`Review absence request for ${reviewLeaveTarget?.teacher?.name || 'Instructor'}`}
          onClose={() => { setReviewLeaveTarget(null); setReviewErrors({}); }}
        />
        <AdminModalBody>
          {reviewLeaveTarget && (
            <form id="review-leave-form" onSubmit={handleReviewLeaveSubmit} noValidate>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                marginBottom: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ marginBottom: '4px' }}><strong>Instructor:</strong> {reviewLeaveTarget.teacher?.name}</div>
                <div style={{ marginBottom: '4px' }}><strong>Dates:</strong> {reviewLeaveTarget.start_date} → {reviewLeaveTarget.end_date}</div>
                <div><strong>Reason:</strong> {reviewLeaveTarget.reason}</div>
              </div>

              {reviewAction === 'approve' && (
                <>
                  <FormField label="Assign Substitute Instructor (Optional)">
                    <AdminSelect
                      value={substituteTeacherId}
                      onChange={(e) => setSubstituteTeacherId(e.target.value)}
                    >
                      <option value="">No Substitute Needed</option>
                      {teachersList.filter((t) => t.id !== reviewLeaveTarget.teacher_id).map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'Teacher'})</option>
                      ))}
                    </AdminSelect>
                  </FormField>
                  <div style={{ marginTop: '14px' }}>
                    <FormField label="Substitute Instructions / Batch Notice">
                      <AdminTextarea
                        placeholder="Enter instructions for classes during this period..."
                        value={substituteNotes}
                        onChange={(e) => setSubstituteNotes(e.target.value)}
                        rows={3}
                      />
                    </FormField>
                  </div>
                </>
              )}

              {reviewAction === 'reject' && (
                <FormField label="Rejection Reason" required error={reviewErrors.substituteNotes}>
                  <AdminTextarea
                    placeholder="Enter reason for rejecting this leave request..."
                    value={substituteNotes}
                    onChange={(e) => {
                      setSubstituteNotes(e.target.value);
                      if (reviewErrors.substituteNotes) setReviewErrors(prev => ({ ...prev, substituteNotes: null }));
                    }}
                    hasError={Boolean(reviewErrors.substituteNotes)}
                    rows={3}
                  />
                </FormField>
              )}
            </form>
          )}
        </AdminModalBody>
        <AdminModalFooter>
          <AdminButton variant="secondary" onClick={() => { setReviewLeaveTarget(null); setReviewErrors({}); }}>
            Cancel
          </AdminButton>
          <AdminButton
            variant={reviewAction === 'approve' ? 'primary' : 'danger'}
            type="submit"
            form="review-leave-form"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : reviewAction === 'approve' ? 'Approve Leave' : 'Confirm Rejection'}
          </AdminButton>
        </AdminModalFooter>
      </AdminModal>

      {/* ADD TEACHER MODAL */}
      <AdminModal
        isOpen={isAddTeacherOpen}
        onClose={() => {
          setIsAddTeacherOpen(false);
          setInviteSuccessData(null);
          setAddTeacherErrors({});
        }}
        maxWidth="680px"
      >
        {inviteSuccessData ? (
          <>
            <AdminModalHeader
              icon={FaCheckCircle}
              title={inviteSuccessData.isStaff ? "Staff Invitation Ready" : "Faculty Invitation Ready"}
              subtitle={inviteSuccessData.isStaff ? "Staff onboarding account initialized and verification link generated" : "Instructor account initialized and invitation link generated"}
              onClose={() => {
                setIsAddTeacherOpen(false);
                setInviteSuccessData(null);
                setAddTeacherErrors({});
              }}
            />
            <AdminModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '18px', padding: '6px 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.14)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  fontSize: '2rem',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.2)'
                }}>
                  <FaCheck />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', color: '#fff', fontWeight: '700' }}>
                    {inviteSuccessData.isStaff ? "Administrative Staff Account Provisioned" : "Faculty Account Provisioned"}
                  </h3>
                  <p style={{ margin: '0', fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.5', maxWidth: '480px' }}>
                    Account registered for <strong style={{ color: '#fff' }}>{inviteSuccessData.name}</strong> ({inviteSuccessData.roleName || (inviteSuccessData.isStaff ? 'Staff' : 'Faculty')}). The candidate can authenticate using their CNIC with OTP, and complete digital onboarding.
                  </p>
                </div>

                <div style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  textAlign: 'left',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Candidate Onboarding Portal</span>
                      <strong style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{inviteSuccessData.onboardingUrl}</strong>
                    </div>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => {
                        navigator.clipboard.writeText(inviteSuccessData.onboardingUrl);
                        toast.success('Onboarding portal URL copied!');
                      }}
                    >
                      <FaCopy /> Copy
                    </AdminButton>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>National CNIC</span>
                      <strong style={{ color: '#38bdf8', fontSize: '0.95rem', fontFamily: 'monospace' }}>{inviteSuccessData.cnic}</strong>
                    </div>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => {
                        navigator.clipboard.writeText(inviteSuccessData.cnic);
                        toast.success('CNIC copied!');
                      }}
                    >
                      <FaCopy /> Copy
                    </AdminButton>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registered OTP Email</span>
                      <strong style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{inviteSuccessData.email}</strong>
                    </div>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => {
                        navigator.clipboard.writeText(inviteSuccessData.email);
                        toast.success('Email copied!');
                      }}
                    >
                      <FaCopy /> Copy
                    </AdminButton>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
                  {inviteSuccessData.waUrl && (
                    <AdminButton
                      type="button"
                      variant="primary"
                      onClick={() => window.open(inviteSuccessData.waUrl, '_blank')}
                      style={{
                        padding: '13px',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        background: '#25D366',
                        borderColor: '#25D366',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(37, 211, 102, 0.25)'
                      }}
                    >
                      <FaWhatsapp style={{ fontSize: '1.2rem' }} /> Dispatch Invitation on WhatsApp
                    </AdminButton>
                  )}
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteSuccessData.onboardingUrl);
                      toast.success('Onboarding link copied to clipboard!');
                    }}
                    style={{ padding: '12px', justifyContent: 'center' }}
                  >
                    <FaCopy /> Copy Candidate Self-Onboarding Link
                  </AdminButton>
                </div>
              </div>
            </AdminModalBody>
            <AdminModalFooter>
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsAddTeacherOpen(false);
                  setInviteSuccessData(null);
                  setAddTeacherErrors({});
                  setAddTeacherForm({
                    employee_type: 'faculty',
                    name: '',
                    cnic: '',
                    phone: '',
                    email: '',
                    specialization: '',
                    department: 'Admissions',
                    role_id: '',
                    custom_role_name: '',
                    salary_type: 'fixed',
                    salary: '',
                    course_id: '',
                    selectedBatches: [],
                    notes: ''
                  });
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Done & Close
              </AdminButton>
            </AdminModalFooter>
          </>
        ) : (
          <>
            <AdminModalHeader
              icon={FaUserPlus}
              title={addTeacherForm.employee_type === 'staff' ? "Add Administrative Staff" : "Add Faculty Instructor"}
              subtitle={addTeacherForm.employee_type === 'staff' ? "Register staff candidates into the HR recruitment pipeline or activate them directly" : "Register instructors into the HR recruitment pipeline or activate them directly"}
              onClose={() => {
                setIsAddTeacherOpen(false);
                setInviteSuccessData(null);
                setAddTeacherErrors({});
              }}
            />
            <AdminModalBody>
              {/* Employee Type Selector: Faculty vs Staff */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '5px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                marginBottom: '14px'
              }}>
                <button
                  type="button"
                  onClick={() => setAddTeacherForm(prev => ({ ...prev, employee_type: 'faculty' }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: addTeacherForm.employee_type === 'faculty' ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
                    background: addTeacherForm.employee_type === 'faculty' ? 'rgba(139, 92, 246, 0.22)' : 'transparent',
                    color: addTeacherForm.employee_type === 'faculty' ? '#c4b5fd' : '#94a3b8'
                  }}
                >
                  <FaUsers size={14} />
                  <span>Faculty (Teaching)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddTeacherForm(prev => ({ ...prev, employee_type: 'staff', salary_type: 'fixed' }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: addTeacherForm.employee_type === 'staff' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                    background: addTeacherForm.employee_type === 'staff' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                    color: addTeacherForm.employee_type === 'staff' ? '#38bdf8' : '#94a3b8'
                  }}
                >
                  <FaBriefcase size={14} />
                  <span>Administrative Staff</span>
                </button>
              </div>

              {/* Segmented Mode Selector */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '5px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                marginBottom: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => setAddTeacherMode('invite')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '11px 14px',
                    borderRadius: '9px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: addTeacherMode === 'invite' ? '1px solid rgba(139, 92, 246, 0.45)' : '1px solid transparent',
                    background: addTeacherMode === 'invite' ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
                    color: addTeacherMode === 'invite' ? '#c4b5fd' : '#94a3b8'
                  }}
                >
                  <FaPaperPlane size={13} />
                  <span>HR Invite Link</span>
                  <span style={{
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: addTeacherMode === 'invite' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                    color: addTeacherMode === 'invite' ? '#34d399' : '#64748b',
                    padding: '2px 7px',
                    borderRadius: '20px',
                    fontWeight: '800'
                  }}>
                    Recommended
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddTeacherMode('direct')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '11px 14px',
                    borderRadius: '9px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: addTeacherMode === 'direct' ? '1px solid rgba(234, 179, 8, 0.45)' : '1px solid transparent',
                    background: addTeacherMode === 'direct' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                    color: addTeacherMode === 'direct' ? '#fde047' : '#94a3b8'
                  }}
                >
                  <FaBolt size={13} />
                  <span>Direct LMS Activation</span>
                  <span style={{
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: addTeacherMode === 'direct' ? 'rgba(234, 179, 8, 0.22)' : 'rgba(255, 255, 255, 0.06)',
                    color: addTeacherMode === 'direct' ? '#fde047' : '#64748b',
                    padding: '2px 7px',
                    borderRadius: '20px',
                    fontWeight: '800'
                  }}>
                    Fast-Track
                  </span>
                </button>
              </div>

              {/* Informational Workflow Banner */}
              {addTeacherMode === 'invite' ? (
                <div style={{
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.22)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '0.82rem',
                  color: '#ddd6fe',
                  lineHeight: '1.5',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <FaPaperPlane style={{ color: '#a78bfa', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#fff' }}>Candidate Self-Onboarding:</strong> Register initial contact information. The candidate automatically receives a digital acceptance letter and onboarding portal link to verify CNIC, upload documents, and submit credentials at {addTeacherForm.employee_type === 'staff' ? '/staff/onboarding' : '/teacher/hr'}.
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.25)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '0.82rem',
                  color: '#fef08a',
                  lineHeight: '1.5',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <FaBolt style={{ color: '#facc15', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#fff' }}>Immediate Provisioning:</strong> {addTeacherForm.employee_type === 'staff' ? 'Bypasses candidate self-service documentation. Instantly creates the staff account and unlocks administrative portal permissions.' : 'Bypasses candidate self-service documentation. Instantly creates the instructor record, enables teaching portal login, and links them to designated cohorts.'}
                  </div>
                </div>
              )}

              <form id="add-teacher-form" onSubmit={handleAddTeacherSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <FormGrid columns="1fr 1fr" gap="14px">
                  <FormField label="Full Name" required error={addTeacherErrors.name}>
                    <AdminInput
                      value={addTeacherForm.name}
                      onChange={(e) => {
                        setAddTeacherForm({ ...addTeacherForm, name: e.target.value });
                        if (addTeacherErrors.name) setAddTeacherErrors(prev => ({ ...prev, name: null }));
                      }}
                      hasError={Boolean(addTeacherErrors.name)}
                      placeholder="e.g. Muhammad Ahmed"
                    />
                  </FormField>

                  <FormField label="CNIC Number" required error={addTeacherErrors.cnic} hint="13-digit format: XXXXX-XXXXXXX-X">
                    <AdminInput
                      maxLength={15}
                      value={addTeacherForm.cnic}
                      onChange={handleTeacherCnicChange}
                      hasError={Boolean(addTeacherErrors.cnic)}
                      placeholder="XXXXX-XXXXXXX-X"
                    />
                  </FormField>
                </FormGrid>

                <FormGrid columns="1fr 1fr" gap="14px">
                  <FormField label="WhatsApp / Phone Number" required error={addTeacherErrors.phone} hint="Max 13 characters (e.g. 03001234567 or +923001234567)">
                    <AdminInput
                      maxLength={13}
                      value={addTeacherForm.phone}
                      onChange={(e) => {
                        setAddTeacherForm({ ...addTeacherForm, phone: formatPhone(e.target.value, 13) });
                        if (addTeacherErrors.phone) setAddTeacherErrors(prev => ({ ...prev, phone: null }));
                      }}
                      onBlur={(e) => {
                        const err = validatePhone(e.target.value, 'WhatsApp / Phone Number', true, { min: 10, max: 13 });
                        if (err) setAddTeacherErrors(prev => ({ ...prev, phone: err }));
                      }}
                      hasError={Boolean(addTeacherErrors.phone)}
                      placeholder="03XXXXXXXXX or +923XXXXXXXXX"
                    />
                  </FormField>

                  <FormField label="Official Email Address" required error={addTeacherErrors.email} hint="Required for OTP authentication">
                    <AdminInput
                      type="email"
                      value={addTeacherForm.email}
                      onChange={(e) => {
                        setAddTeacherForm({ ...addTeacherForm, email: e.target.value });
                        if (addTeacherErrors.email) setAddTeacherErrors(prev => ({ ...prev, email: null }));
                      }}
                      onBlur={(e) => {
                        const err = validateEmail(e.target.value, 'Official Email Address', true);
                        if (err) setAddTeacherErrors(prev => ({ ...prev, email: err }));
                      }}
                      hasError={Boolean(addTeacherErrors.email)}
                      placeholder="user@deepskills.pk"
                    />
                  </FormField>
                </FormGrid>

                {addTeacherForm.employee_type === 'staff' ? (
                  <>
                    <FormGrid columns="1fr 1fr" gap="14px">
                      <FormField label="Department" required>
                        <AdminSelect
                          value={addTeacherForm.department}
                          onChange={(e) => setAddTeacherForm({ ...addTeacherForm, department: e.target.value })}
                        >
                          <option value="Admissions">Admissions & Outreach</option>
                          <option value="Finance">Finance & Accounts</option>
                          <option value="Academics">Academic Coordination</option>
                          <option value="Human Resources">Human Resources & Faculty</option>
                          <option value="Marketing">Marketing & Media</option>
                          <option value="Quality Assurance">Quality Assurance / Audit</option>
                          <option value="Operations">Operations & Campus</option>
                        </AdminSelect>
                      </FormField>

                      <FormField label="Staff Role / Designation" required hint="Determines admin portal module access">
                        <AdminSelect
                          value={addTeacherForm.role_id}
                          onChange={(e) => setAddTeacherForm({ ...addTeacherForm, role_id: e.target.value })}
                        >
                          <option value="">Select Role / Designation...</option>
                          {rolesList.filter(r => !['student', 'teacher'].includes(r.name?.toLowerCase())).map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </AdminSelect>
                      </FormField>
                    </FormGrid>

                    <FormField
                      label={addTeacherMode === 'invite' ? 'Expected Monthly Salary (PKR)' : 'Agreed Monthly Salary (PKR)'}
                      error={addTeacherErrors.salary}
                      hint="Gross fixed monthly compensation in PKR"
                    >
                      <AdminInput
                        type="number"
                        min={0}
                        step="1000"
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                        }}
                        value={addTeacherForm.salary}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) return;
                          setAddTeacherForm({ ...addTeacherForm, salary: val });
                          if (addTeacherErrors.salary) setAddTeacherErrors(prev => ({ ...prev, salary: null }));
                        }}
                        hasError={Boolean(addTeacherErrors.salary)}
                        placeholder="e.g. 75000"
                      />
                    </FormField>
                  </>
                ) : (
                  <>
                    <FormGrid columns="1fr 1fr" gap="14px">
                      <FormField label="Specialization Domain" hint="Subject area or track">
                        <AdminInput
                          value={addTeacherForm.specialization}
                          onChange={(e) => setAddTeacherForm({ ...addTeacherForm, specialization: e.target.value })}
                          placeholder="e.g. Full Stack Web Development, UI/UX"
                        />
                      </FormField>

                      <FormField
                        label={
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span>{addTeacherForm.salary_type === 'percentage' ? (addTeacherMode === 'invite' ? 'Expected Share (%)' : 'Agreed Share (%)') : (addTeacherMode === 'invite' ? 'Expected Salary (PKR)' : 'Agreed Salary (PKR)')}</span>
                            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddTeacherForm({ ...addTeacherForm, salary_type: 'fixed', salary: '' });
                                  if (addTeacherErrors.salary) setAddTeacherErrors(prev => ({ ...prev, salary: null }));
                                }}
                                style={{
                                  border: 'none',
                                  background: addTeacherForm.salary_type === 'fixed' ? '#8b5cf6' : 'transparent',
                                  color: addTeacherForm.salary_type === 'fixed' ? '#fff' : '#94a3b8',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Fixed (PKR)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddTeacherForm({ ...addTeacherForm, salary_type: 'percentage', salary: '' });
                                  if (addTeacherErrors.salary) setAddTeacherErrors(prev => ({ ...prev, salary: null }));
                                }}
                                style={{
                                  border: 'none',
                                  background: addTeacherForm.salary_type === 'percentage' ? '#8b5cf6' : 'transparent',
                                  color: addTeacherForm.salary_type === 'percentage' ? '#fff' : '#94a3b8',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                % Share
                              </button>
                            </div>
                          </div>
                        }
                        error={addTeacherErrors.salary}
                        hint={addTeacherForm.salary_type === 'percentage' ? 'Cohort revenue share percentage (1% - 100%)' : 'Gross fixed monthly compensation in PKR'}
                      >
                        <AdminInput
                          type="number"
                          min={addTeacherForm.salary_type === 'percentage' ? 1 : 0}
                          max={addTeacherForm.salary_type === 'percentage' ? 100 : undefined}
                          step={addTeacherForm.salary_type === 'percentage' ? '1' : '1000'}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          value={addTeacherForm.salary}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== '') {
                              const num = Number(val);
                              if (num < 0) return;
                              if (addTeacherForm.salary_type === 'percentage' && num > 100) return;
                            }
                            setAddTeacherForm({ ...addTeacherForm, salary: val });
                            if (addTeacherErrors.salary) setAddTeacherErrors(prev => ({ ...prev, salary: null }));
                          }}
                          hasError={Boolean(addTeacherErrors.salary)}
                          placeholder={addTeacherForm.salary_type === 'percentage' ? 'e.g. 30' : 'e.g. 85000'}
                        />
                      </FormField>
                    </FormGrid>

                    {addTeacherMode === 'direct' && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fde047' }}>
                            Curriculum Cohort Allocation
                          </span>
                        </div>

                        <FormField label="Primary Teaching Course" hint="Select course to view its assigned batches">
                          <AdminSelect
                            value={addTeacherForm.course_id}
                            onChange={(e) => setAddTeacherForm({ ...addTeacherForm, course_id: e.target.value })}
                          >
                            <option value="">Choose Course Program...</option>
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                          </AdminSelect>
                        </FormField>

                        {addTeacherForm.course_id && (
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                              Assign Batches & Teaching Role:
                            </span>
                            {(() => {
                              const selectedCourse = courses.find((c) => c.id === addTeacherForm.course_id);
                              const matchingBatches = batches.filter((b) => b.course === selectedCourse?.title);

                              if (matchingBatches.length === 0) {
                                return (
                                  <div style={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    color: '#64748b',
                                    fontSize: '0.82rem',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '8px',
                                    border: '1px dashed rgba(255, 255, 255, 0.08)'
                                  }}>
                                    No active cohort batches found for {selectedCourse?.title}.
                                  </div>
                                );
                              }

                              return (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  paddingRight: '4px'
                                }}>
                                  {matchingBatches.map((b) => {
                                    const isSelected = addTeacherForm.selectedBatches.find((sb) => sb.batch_id === b.id);
                                    return (
                                      <div
                                        key={b.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '10px 14px',
                                          borderRadius: '8px',
                                          background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                          border: isSelected ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontSize: '0.85rem', color: isSelected ? '#fff' : '#cbd5e1', fontWeight: isSelected ? '600' : '400' }}>
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
                                            style={{ accentColor: '#8b5cf6', width: '16px', height: '16px', cursor: 'pointer' }}
                                          />
                                          <span>{b.batch_name}</span>
                                        </label>
                                        {isSelected && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#a78bfa' }}>Role:</span>
                                            <AdminSelect
                                              style={{ width: '140px', padding: '5px 8px', fontSize: '0.8rem' }}
                                              value={isSelected.role}
                                              onChange={(e) => {
                                                setAddTeacherForm({
                                                  ...addTeacherForm,
                                                  selectedBatches: addTeacherForm.selectedBatches.map((sb) => sb.batch_id === b.id ? { ...sb, role: e.target.value } : sb)
                                                });
                                              }}
                                            >
                                              <option value="Main">Lead Instructor</option>
                                              <option value="Assistant">Assistant</option>
                                            </AdminSelect>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <FormField label={addTeacherMode === 'invite' ? 'Candidate Interview & Assessment Notes (Optional)' : 'Administrative Onboarding Notes (Optional)'}>
                  <AdminTextarea
                    rows={3}
                    value={addTeacherForm.notes}
                    onChange={(e) => setAddTeacherForm({ ...addTeacherForm, notes: e.target.value })}
                    placeholder="Enter interview feedback, technical ratings, availability commitments..."
                  />
                </FormField>
              </form>
            </AdminModalBody>
            <AdminModalFooter>
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsAddTeacherOpen(false);
                  setInviteSuccessData(null);
                  setAddTeacherErrors({});
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="submit"
                variant="primary"
                form="add-teacher-form"
                disabled={addingTeacher}
                style={addTeacherMode === 'direct' ? { background: '#d97706', borderColor: '#d97706' } : {}}
              >
                {addingTeacher
                  ? 'Processing...'
                  : addTeacherMode === 'invite'
                    ? (
                      <>
                        <FaPaperPlane size={13} /> Generate & Send Invite
                      </>
                    )
                    : (
                      <>
                        <FaBolt size={13} /> {addTeacherForm.employee_type === 'staff' ? 'Directly Activate Staff' : 'Directly Activate Faculty'}
                      </>
                    )}
              </AdminButton>
            </AdminModalFooter>
          </>
        )}
      </AdminModal>

      {/* DRAWERS & MODALS */}
      <AdminHRDrawer
        open={drawerOpen}
        application={selectedApplication}
        onClose={() => setDrawerOpen(false)}
        onOpenComposer={(app) => {
          setDrawerOpen(false);
          openComposer(app);
        }}
        onOpenFinalize={(app) => {
          setDrawerOpen(false);
          openFinalize(app);
        }}
        onReject={(app) => handleReject(app)}
        onDownloadAcceptance={(app) => handleDownloadAcceptance(app)}
        canMutate={canMutate}
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

      <AdminJDTemplateModal
        open={isTemplateModalOpen}
        template={selectedTemplateForEdit}
        onClose={() => setIsTemplateModalOpen(false)}
        onSave={handleSaveTemplate}
        loading={savingTemplate}
      />
    </AdminLayout>
  );
};

export default AdminHRManagement;
