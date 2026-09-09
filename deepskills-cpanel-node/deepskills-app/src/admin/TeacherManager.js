import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaFilter, FaPlus, FaTimes, FaEye,
  FaWhatsapp, FaCopy, FaCheckCircle, FaUserPlus, FaPaperPlane
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { syncTeacherAccess } from '../utils/adminAccessApi';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

const Container = styled.div`
  padding: 20px 0;
  color: #fff;
`;

const PageHeader = styled.div`
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }

  .title-block {
    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 5px;
      color: #fff;
      @media (max-width: 600px) { font-size: 1.5rem; }
    }
    p {
      color: #888;
      font-size: 0.95rem;
    }
  }
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #7B1F2E;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(123, 31, 46, 0.3);

  &:hover {
    background: #9b283b;
    transform: translateY(-2px);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const StatCard = styled.div`
  background: #111318;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 5px;

  .label {
    color: #888;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${props => props.color || '#fff'};
  }
`;

const FilterSection = styled.div`
  background: #111318;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 20px;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 15px;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  
  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #555;
    font-size: 0.9rem;
  }

  input, select {
    width: 100%;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px 12px 10px 35px;
    color: #fff;
    outline: none;
    transition: all 0.2s;

    &:focus {
      border-color: #7B1F2E;
      background: #000;
    }
  }
`;

const TableContainer = styled.div`
  background: #111318;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th {
    padding: 15px 20px;
    background: rgba(255, 255, 255, 0.02);
    color: #888;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;

    &:hover { color: #fff; }

    &.mobile-hide {
      @media (max-width: 1000px) { display: none; }
    }
  }

  td {
    padding: 15px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    vertical-align: middle;

    &.mobile-hide {
      @media (max-width: 1000px) { display: none; }
    }
  }

  tbody tr {
    transition: all 0.2s;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.02); }
  }
`;

const TeacherInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .avatar {
    width: 38px;
    height: 38px;
    background: transparent;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    color: #fff;
    border: 2px solid #378ADD;
  }

  .details {
    .name { font-weight: 600; color: #fff; }
    .email { font-size: 0.8rem; color: #666; }
  }
`;

const StatusBadge = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => props.$active ? 'rgba(46, 204, 113, 0.1)' : 'rgba(107, 114, 128, 0.1)'};
  color: ${props => props.$active ? '#2ecc71' : '#9ca3af'};
  border: 1px solid ${props => props.$active ? 'rgba(46, 204, 113, 0.2)' : 'rgba(107, 114, 128, 0.2)'};
`;

const BatchPill = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: rgba(55, 138, 221, 0.1);
  color: #378ADD;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 2px;
  border: 1px solid rgba(55, 138, 221, 0.2);
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111318;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 30px;
  position: relative;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  h3 { font-size: 1.2rem; }
  button { 
    background: none; border: none; color: #555; cursor: pointer; 
    &:hover { color: #fff; }
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: #888; }
  input, select, textarea {
    width: 100%;
    background: #0a0a0a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 12px;
    color: #fff;
    outline: none;
    &:focus { border-color: #7B1F2E; }
  }
`;

const MultiSelectContainer = styled.div`
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 10px;
  max-height: 150px;
  overflow-y: auto;
`;

const MultiSelectItem = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #fff;
  &:hover { background: rgba(255,255,255,0.05); }
  input { width: auto; margin: 0; cursor: pointer; }
`;

const ModeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.02);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 550px) {
    grid-template-columns: 1fr;
  }
`;

const ModeButton = styled.button`
  background: ${p => p.$active ? 'rgba(123, 31, 46, 0.25)' : 'transparent'};
  color: ${p => p.$active ? '#FF7B90' : '#888'};
  border: 1px solid ${p => p.$active ? 'rgba(123, 31, 46, 0.5)' : 'transparent'};
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
  margin-bottom: 18px;
  line-height: 1.45;
`;

const SuccessCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 20px 10px;

  .details-box {
    width: 100%;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    font-size: 0.85rem;
    color: #cbd5e1;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    margin-top: 10px;
  }

  .whatsapp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #25D366;
    color: #fff;
    text-decoration: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.9rem;
    transition: background 0.2s;
    &:hover { background: #20ba59; }
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    transition: background 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.1); }
  }

  .done-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 8px;
    &:hover { color: #fff; }
  }
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

const SubmitBtn = styled.button`
  width: 100%;
  padding: 14px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:hover { background: #9b283b; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const TeacherManager = ({ basePath }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'teachers', 'full') || canAccess(user?.permissions || {}, 'hr', 'full');
  const targetBase = basePath || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/hr') ? '/admin/hr/teachers' : '/admin/management/teachers');
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Dual-mode state
  const [addMode, setAddMode] = useState('invite');
  const [inviteSuccessData, setInviteSuccessData] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    course: 'All',
    status: 'All'
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    cnic: '',
    phone: '',
    email: '',
    specialization: '',
    salary: '',
    course_id: '',
    selectedBatches: [], // [{batch_id, role}]
    notes: ''
  });

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes, bRes] = await Promise.all([
        supabase.from('teachers').select('*'),
        supabase.from('courses').select('*'),
        supabase.from('batches').select('*')
      ]);

      if (tRes.error && tRes.error.code !== 'PGRST116') {
        console.error("Teachers table error:", tRes.error);
      }

      const { data: assignments } = await supabase.from('teacher_batches').select('*, batches(batch_name)');
      
      const teacherList = (tRes.data || []).map(t => ({
        ...t,
        assignments: assignments?.filter(a => a.teacher_id === t.id) || []
      }));

      setTeachers(teacherList);
      setCourses(cRes.data || []);
      setBatches(bRes.data || []);
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCnicChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13, 14);
    setFormData({ ...formData, cnic: val });
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error("You do not have permission to add teachers.");
      return;
    }
    setProcessing(true);
    try {
      if (addMode === 'invite') {
        // Mode A: Invite into HR Pipeline
        // 1. Create teacher record in 'teachers' table with status: 'Pending'
        const { data: teacherRecord, error: tErr } = await supabase
          .from('teachers')
          .upsert([{
            name: formData.name,
            cnic: formData.cnic,
            phone: formData.phone,
            email: formData.email,
            specialization: formData.specialization,
            status: 'Pending',
            notes: formData.notes
          }], { onConflict: 'cnic' })
          .select()
          .single();

        if (tErr) throw tErr;

        // 2. Authorize login in allowed_cnics so teacher can receive email OTP at /login
        await syncTeacherAccess({
          cnic: formData.cnic,
          name: formData.name,
          assignedCourse: formData.specialization || 'Teacher'
        });

        // 3. Upsert into hr_profiles
        try {
          const hrProfilePayload = {
            teacher_id: teacherRecord.id,
            cnic: formData.cnic,
            full_name: formData.name,
            personal_phone: formData.phone,
            personal_email: formData.email,
            specialization: formData.specialization || null,
            expected_salary: formData.salary ? parseInt(formData.salary, 10) : null,
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
        if (formData.salary && !isNaN(parseFloat(formData.salary))) {
          try {
            await supabase.from('teacher_salaries').upsert({
              teacher_id: teacherRecord.id,
              monthly_amount: parseFloat(formData.salary),
              effective_from: new Date().toISOString().split('T')[0]
            }, { onConflict: 'teacher_id' });
          } catch (salErr) {
            console.warn('Teacher salary record notice:', salErr);
          }
        }

        const loginUrl = `${window.location.origin}/login`;
        const waText = `Assalam-o-Alaikum ${formData.name},\n\nWelcome to DeepSkills! Your faculty onboarding account is ready.\n\nLogin Instructions:\n1. Open portal: ${loginUrl}\n2. Enter your CNIC: ${formData.cnic}\n3. Enter the 6-digit OTP sent to your email (${formData.email})\n4. Complete your profile and document upload at /teacher/hr.\n\nOnce reviewed and approved by HR, your full teaching dashboard and assigned batches will unlock automatically.\n\nDeepSkills HR Department`;
        const waUrl = getTeacherWhatsAppUrl(formData.phone, waText);

        setInviteSuccessData({
          name: formData.name,
          phone: formData.phone,
          cnic: formData.cnic,
          email: formData.email,
          loginUrl,
          onboardingUrl: `${window.location.origin}/teacher/hr`,
          waUrl
        });

        toast.success("Instructor registered! Login authorized via CNIC & Email OTP.");
        fetchInitialData();
      } else {
        // Mode B: Direct Staff Activation
        // 1. Create Teacher
        const { data: newTeacher, error: tError } = await supabase
          .from('teachers')
          .insert([{
            name: formData.name,
            cnic: formData.cnic,
            phone: formData.phone,
            email: formData.email,
            specialization: formData.specialization,
            status: 'Active',
            notes: formData.notes
          }])
          .select()
          .single();

        if (tError) throw tError;

        const assignedBatches = formData.selectedBatches
          .map(selected => batches.find(batch => batch.id === selected.batch_id))
          .filter(Boolean);
        const assignedBatchNames = assignedBatches.map(batch => batch.batch_name);
        const assignedCourses = Array.from(new Set(assignedBatches.map(batch => batch.course).filter(Boolean)));

        // 2. Add/Update teacher access (Upsert via authorized server API)
        await syncTeacherAccess({
          cnic: formData.cnic,
          name: formData.name,
          assignedCourse: assignedCourses.join(', '),
          batch: assignedBatchNames.join(', ')
        });

        // 3. Add Batch Assignments
        if (formData.selectedBatches.length > 0) {
          const batchInserts = formData.selectedBatches.map(b => ({
            teacher_id: newTeacher.id,
            batch_id: b.batch_id,
            role: b.role
          }));
          await supabase.from('teacher_batches').insert(batchInserts);
        }

        // 4. Synchronize into hr_profiles so teacher immediately appears in HR management, files, & certificates
        try {
          await supabase.from('hr_profiles').upsert({
            teacher_id: newTeacher.id,
            cnic: formData.cnic,
            full_name: formData.name,
            personal_phone: formData.phone,
            personal_email: formData.email,
            specialization: formData.specialization || null,
            expected_salary: formData.salary ? parseInt(formData.salary, 10) : null,
            current_step: 5,
            hr_status: 'hired',
            hired_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'teacher_id' });
        } catch (hrSyncErr) {
          console.warn("HR profile sync notice:", hrSyncErr);
        }

        // 5. If salary entered, upsert into teacher_salaries
        if (formData.salary && !isNaN(parseFloat(formData.salary))) {
          try {
            await supabase.from('teacher_salaries').upsert({
              teacher_id: newTeacher.id,
              monthly_amount: parseFloat(formData.salary),
              effective_from: new Date().toISOString().split('T')[0]
            }, { onConflict: 'teacher_id' });
          } catch (salErr) {
            console.warn("Teacher salary record notice:", salErr);
          }
        }

        toast.success("Teacher added & synced with HR profiles successfully!");
        setIsAddModalOpen(false);
        fetchInitialData();
        setFormData({ name: '', cnic: '', phone: '', email: '', specialization: '', salary: '', course_id: '', selectedBatches: [], notes: '' });
      }
    } catch (err) {
      toast.error("Failed to process teacher: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const searchMatch = !filters.search || 
        t.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.cnic.includes(filters.search) ||
        t.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.phone.includes(filters.search);
      
      const statusMatch = filters.status === 'All' || t.status === filters.status;
      
      // Course filter check (if any assigned batch belongs to the course)
      const courseMatch = filters.course === 'All' || 
        t.assignments.some(a => {
          const batch = batches.find(b => b.id === a.batch_id);
          return batch?.course === filters.course;
        });

      return searchMatch && statusMatch && courseMatch;
    });
  }, [teachers, filters, batches]);

  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.status === 'Active').length,
    inactive: teachers.filter(t => t.status === 'Inactive').length,
    batches: Array.from(new Set(teachers.flatMap(t => t.assignments.map(a => a.batch_id)))).length
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AdminLayout>
      <Container>
        <PageHeader>
          <div className="title-block">
            <h1>Teachers</h1>
            <p>Manage all teachers and their batch assignments</p>
          </div>
          {canMutate && (
            <AddBtn onClick={() => { setIsAddModalOpen(true); setInviteSuccessData(null); }}>
              <FaPlus /> Add Teacher
            </AddBtn>
          )}
        </PageHeader>

        <StatsGrid>
          <StatCard><span className="label">Total Teachers</span><span className="value">{stats.total}</span></StatCard>
          <StatCard color="#2ecc71"><span className="label">Active</span><span className="value">{stats.active}</span></StatCard>
          <StatCard color="#9ca3af"><span className="label">Inactive</span><span className="value">{stats.inactive}</span></StatCard>
          <StatCard color="#378ADD"><span className="label">Batches Covered</span><span className="value">{stats.batches}</span></StatCard>
        </StatsGrid>

        <FilterSection>
          <FilterGrid>
            <InputWrapper>
              <FaSearch />
              <input 
                type="text" 
                placeholder="Search name, cnic, email, phone..." 
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </InputWrapper>
            <InputWrapper>
              <FaFilter />
              <select value={filters.course} onChange={e => setFilters({...filters, course: e.target.value})}>
                <option value="All">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
              </select>
            </InputWrapper>
            <InputWrapper>
              <FaFilter />
              <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </InputWrapper>
          </FilterGrid>
        </FilterSection>

        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th className="mobile-hide">CNIC</th>
                <th className="mobile-hide">Phone</th>
                <th className="mobile-hide">Specialization</th>
                <th>Batches</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#555' }}>Loading...</td></tr>
              ) : filteredTeachers.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#555' }}>No teachers found</td></tr>
              ) : (
                filteredTeachers.map(teacher => (
                  <tr key={teacher.id} onClick={() => navigate(`${targetBase}/${teacher.id}`)}>
                    <td>
                      <TeacherInfo>
                        <div className="avatar">{getInitials(teacher.name)}</div>
                        <div className="details">
                          <div className="name">{teacher.name}</div>
                          <div className="email">{teacher.email}</div>
                          <div className="mobile-only" style={{ display: 'none', fontSize: '0.75rem', color: '#666' }}>
                            {teacher.specialization}
                          </div>
                        </div>
                      </TeacherInfo>
                      <style>{`
                        @media (max-width: 1000px) {
                          .mobile-only { display: block !important; }
                        }
                      `}</style>
                    </td>
                    <td className="mobile-hide"><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '4px' }}>{teacher.cnic}</code></td>
                    <td className="mobile-hide">{teacher.phone}</td>
                    <td className="mobile-hide">{teacher.specialization}</td>
                    <td>
                      {teacher.assignments.map(a => (
                        <BatchPill key={a.id}>
                          {a.batches?.batch_name} ({a.role})
                        </BatchPill>
                      ))}
                    </td>
                    <td><StatusBadge $active={teacher.status === 'Active'}>{teacher.status}</StatusBadge></td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`${targetBase}/${teacher.id}`); }}
                        style={{ background: 'none', border: 'none', color: '#378ADD', cursor: 'pointer' }}
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableContainer>

        <AnimatePresence>
          {isAddModalOpen && (
            <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModalContent initial={{ y: 20 }} animate={{ y: 0 }}>
                <ModalHeader>
                  <h3>{inviteSuccessData ? "Faculty Invitation Ready" : "Add Faculty Instructor"}</h3>
                  <button onClick={() => { setIsAddModalOpen(false); setInviteSuccessData(null); }}><FaTimes /></button>
                </ModalHeader>

                {inviteSuccessData ? (
                  <SuccessCard>
                    <div style={{ color: '#25D366', fontSize: '2.5rem' }}>
                      <FaCheckCircle />
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
                      Faculty Onboarding Link Generated
                    </div>
                    <p style={{ margin: '0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                      Account registered for <strong>{inviteSuccessData.name}</strong>. Instructor can log in using CNIC with OTP sent to their email, and complete their onboarding.
                    </p>
                    <div className="details-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>Login Portal:</span>
                        <strong style={{ color: '#cbd5e1' }}>{inviteSuccessData.loginUrl}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>Login CNIC:</span>
                        <strong style={{ color: '#cbd5e1' }}>{inviteSuccessData.cnic}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>OTP Email:</span>
                        <strong style={{ color: '#cbd5e1' }}>{inviteSuccessData.email}</strong>
                      </div>
                    </div>
                    <div className="actions">
                      {inviteSuccessData.waUrl && (
                        <a 
                          className="whatsapp-btn" 
                          href={inviteSuccessData.waUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <FaWhatsapp style={{ fontSize: '1.1rem' }} /> Send Invite via WhatsApp
                        </a>
                      )}
                      <button 
                        type="button" 
                        className="copy-btn" 
                        onClick={() => {
                          navigator.clipboard.writeText(inviteSuccessData.onboardingUrl);
                          toast.success("Onboarding link copied!");
                        }}
                      >
                        <FaCopy /> Copy Onboarding Link
                      </button>
                      <button 
                        type="button" 
                        className="done-btn" 
                        onClick={() => {
                          setInviteSuccessData(null);
                          setIsAddModalOpen(false);
                          setFormData({ name: '', cnic: '', phone: '', email: '', specialization: '', salary: '', course_id: '', selectedBatches: [], notes: '' });
                        }}
                      >
                        Done & Close
                      </button>
                    </div>
                  </SuccessCard>
                ) : (
                  <>
                    <ModeSelector>
                      <ModeButton 
                        type="button" 
                        $active={addMode === 'invite'} 
                        onClick={() => setAddMode('invite')}
                      >
                        <FaPaperPlane /> Invite to HR Pipeline (Recommended)
                      </ModeButton>
                      <ModeButton 
                        type="button" 
                        $active={addMode === 'direct'} 
                        onClick={() => setAddMode('direct')}
                      >
                        <FaUserPlus /> Direct Staff Activation
                      </ModeButton>
                    </ModeSelector>

                    {addMode === 'invite' ? (
                      <InfoBox>
                        <strong>Standard HR Hiring Workflow:</strong> Register candidate details and immediately send them a secure WhatsApp/Web link to fill their digital profile, credentials, documents, and acceptance letter.
                      </InfoBox>
                    ) : (
                      <InfoBox style={{ background: 'rgba(234, 179, 8, 0.08)', borderColor: 'rgba(234, 179, 8, 0.25)', color: '#fde047' }}>
                        <strong>Immediate Direct Activation:</strong> Bypasses teacher self-onboarding. Instantly provisions LMS portal login, assigns batches, and synchronizes a completed record into HR Files.
                      </InfoBox>
                    )}

                    <form onSubmit={handleAddTeacher}>
                      <FormGridModal>
                        <FormGroup>
                          <label>Full Name*</label>
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dr. Muhammad Ahmed" />
                        </FormGroup>
                        <FormGroup>
                          <label>CNIC Number*</label>
                          <input required maxLength={15} value={formData.cnic} onChange={handleCnicChange} placeholder="XXXXX-XXXXXXX-X" />
                        </FormGroup>
                        <FormGroup>
                          <label>Phone Number*</label>
                          <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="03XXXXXXXXX" />
                        </FormGroup>
                        <FormGroup>
                          <label>Email Address*</label>
                          <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="instructor@deepskills.pk" />
                        </FormGroup>
                        <FormGroup style={{ gridColumn: 'span 2' }}>
                          <label>Specialization / Subject Domain</label>
                          <input value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})} placeholder="e.g. Frontend Development, UI/UX" />
                        </FormGroup>
                        <FormGroup style={{ gridColumn: 'span 2' }}>
                          <label>{addMode === 'invite' ? 'Expected Monthly Salary (PKR)' : 'Agreed Monthly Salary (PKR)'}</label>
                          <input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} placeholder="e.g. 80000" />
                        </FormGroup>

                        {addMode === 'direct' && (
                          <>
                            <FormGroup style={{ gridColumn: 'span 2' }}>
                              <label>Assign Course (Filters Batches)</label>
                              <select value={formData.course_id} onChange={e => setFormData({...formData, course_id: e.target.value})}>
                                <option value="">Select Course</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                              </select>
                            </FormGroup>
                            
                            {formData.course_id && (
                              <FormGroup style={{ gridColumn: 'span 2' }}>
                                <label>Select Batches</label>
                                <MultiSelectContainer>
                                  {batches.filter(b => {
                                    const selectedCourse = courses.find(c => c.id === formData.course_id);
                                    return b.course === selectedCourse?.title;
                                  }).map(b => {
                                    const isSelected = formData.selectedBatches.find(sb => sb.batch_id === b.id);
                                    return (
                                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <MultiSelectItem>
                                          <input 
                                            type="checkbox" 
                                            checked={!!isSelected} 
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                if (!formData.selectedBatches.find(sb => sb.batch_id === b.id)) {
                                                  setFormData({...formData, selectedBatches: [...formData.selectedBatches, { batch_id: b.id, role: 'Main' }]});
                                                }
                                              } else {
                                                setFormData({...formData, selectedBatches: formData.selectedBatches.filter(sb => sb.batch_id !== b.id)});
                                              }
                                            }}
                                          />
                                          {b.batch_name}
                                        </MultiSelectItem>
                                        {isSelected && (
                                          <select 
                                            style={{ width: '120px', padding: '4px', fontSize: '0.8rem' }}
                                            value={isSelected.role}
                                            onChange={(e) => {
                                              setFormData({
                                                ...formData,
                                                selectedBatches: formData.selectedBatches.map(sb => sb.batch_id === b.id ? { ...sb, role: e.target.value } : sb)
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
                                </MultiSelectContainer>
                              </FormGroup>
                            )}
                          </>
                        )}

                        <FormGroup style={{ gridColumn: 'span 2' }}>
                          <label>{addMode === 'invite' ? 'Interview & Candidate Notes (Optional)' : 'Admin Notes (Optional)'}</label>
                          <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any additional notes or qualifications..." />
                        </FormGroup>
                      </FormGridModal>
                      <SubmitBtn type="submit" disabled={processing}>
                        {processing ? "Processing..." : addMode === 'invite' ? "Generate & Send Onboarding Invite" : "Directly Activate Teacher"}
                      </SubmitBtn>
                    </form>
                  </>
                )}
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </AdminLayout>
  );
};

const FormGridModal = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

export default TeacherManager;
