import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaArrowLeft, FaEdit, FaUserSlash, FaCheckCircle, 
  FaTimesCircle, FaPlus, FaTimes
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { syncTeacherAccess } from '../utils/adminAccessApi';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

const Container = styled.div`
  padding: 20px 0;
  color: #fff;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #888;
  background: none;
  border: none;
  font-size: 0.9rem;
  margin-bottom: 25px;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
  &:hover { color: #fff; }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 30px;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

// LEFT COLUMN
const SidebarCard = styled.div`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 30px;
  height: fit-content;
  position: sticky;
  top: 100px;
`;

const ProfileHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 30px;

  .avatar {
    width: 80px;
    height: 80px;
    background: transparent;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 15px;
    border: 4px solid #378ADD;
  }

  h2 { font-size: 1.4rem; margin-bottom: 5px; }
  .specialization { color: #888; font-size: 0.9rem; margin-bottom: 15px; }
`;

const StatusBadge = styled.div`
  display: inline-block;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    if (props.$variant === 'success' || props.$active) return 'rgba(46, 204, 113, 0.12)';
    if (props.$variant === 'warning') return 'rgba(245, 158, 11, 0.12)';
    if (props.$variant === 'danger') return 'rgba(239, 68, 68, 0.12)';
    if (props.$variant === 'info') return 'rgba(55, 138, 221, 0.12)';
    return 'rgba(107, 114, 128, 0.12)';
  }};
  color: ${props => {
    if (props.$variant === 'success' || props.$active) return '#2ecc71';
    if (props.$variant === 'warning') return '#f59e0b';
    if (props.$variant === 'danger') return '#ef4444';
    if (props.$variant === 'info') return '#378ADD';
    return '#9ca3af';
  }};
  border: 1px solid ${props => {
    if (props.$variant === 'success' || props.$active) return 'rgba(46, 204, 113, 0.25)';
    if (props.$variant === 'warning') return 'rgba(245, 158, 11, 0.25)';
    if (props.$variant === 'danger') return 'rgba(239, 68, 68, 0.25)';
    if (props.$variant === 'info') return 'rgba(55, 138, 221, 0.25)';
    return 'rgba(107, 114, 128, 0.25)';
  }};
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  .label { color: #666; }
  .value { color: #fff; font-weight: 500; }
`;

const AssignedBatches = styled.div`
  margin-bottom: 30px;
  h4 { font-size: 0.8rem; text-transform: uppercase; color: #555; margin-bottom: 15px; }
  .batch-list { display: flex; flex-direction: column; gap: 8px; }
`;

const BatchItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.02);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    .name { font-weight: 600; }
    .role { color: #378ADD; font-size: 0.75rem; }
  }

  button {
    background: none; border: none; color: #555; cursor: pointer;
    &:hover { color: #e74c3c; }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  
  &.edit { background: transparent; border: 1px solid #3498db; color: #3498db; &:hover { background: rgba(52, 152, 219, 0.1); } }
  &.batches { background: transparent; border: 1px solid #9b59b6; color: #9b59b6; &:hover { background: rgba(155, 89, 182, 0.1); } }
  &.status { background: transparent; border: 1px solid ${props => props.$active ? '#95a5a6' : '#2ecc71'}; color: ${props => props.$active ? '#95a5a6' : '#2ecc71'}; &:hover { background: ${props => props.$active ? 'rgba(149, 165, 166, 0.1)' : 'rgba(46, 204, 113, 0.1)'}; } }
  &.revoke { background: transparent; border: 1px solid #e74c3c; color: #e74c3c; &:hover { background: rgba(231, 76, 60, 0.1); } }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// RIGHT COLUMN
const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TabContainer = styled.div`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
`;

const TabBar = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 10px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button`
  padding: 18px 25px;
  background: none; border: none;
  color: ${props => props.$active ? '#378ADD' : '#888'};
  font-weight: 600; font-size: 0.9rem;
  cursor: pointer; position: relative;
  transition: all 0.2s; white-space: nowrap;

  &:after {
    content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 3px;
    background: #378ADD; transform: scaleX(${props => props.$active ? 1 : 0});
    transition: transform 0.2s;
  }
  &:hover { color: #fff; }
`;

const TabBody = styled.div` padding: 30px; `;

// TAB COMPONENTS
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const MiniStat = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: 20px; border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
  .val { font-size: 1.6rem; font-weight: 700; color: #fff; margin-bottom: 5px; }
  .lab { color: #666; font-size: 0.8rem; text-transform: uppercase; }
`;

const PerformanceBar = styled.div`
  margin-bottom: 20px;
  .header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
  .track { height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
  .fill { height: 100%; background: #378ADD; width: ${props => props.percent}%; transition: width 0.5s ease; }
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;
  th { padding: 15px; color: #666; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); }
  td { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.03); }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111318; width: 100%; max-width: 500px; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1); padding: 30px; position: relative;
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;
  h3 { font-size: 1.2rem; }
  button { background: none; border: none; color: #555; cursor: pointer; &:hover { color: #fff; } }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: #888; }
  input, select, textarea {
    width: 100%; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 12px; color: #fff; outline: none;
    &:focus { border-color: #378ADD; }
  }
`;

const SubmitBtn = styled.button`
  width: 100%; padding: 14px; background: #378ADD; color: #fff; border: none;
  border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 10px;
  &:hover { background: #2a6db0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const TeacherProfile = ({ teacherId }) => {
  const params = useParams();
  const router = useRouter();
  const id = teacherId || params?.id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const canMutate = Boolean(user?.role === 'admin' || canAccess(user?.permissions || {}, 'teachers', 'full') || canAccess(user?.permissions || {}, 'hr', 'full'));
  
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Performance');
  const [processing, setProcessing] = useState(false);

  // Data
  const [assignments, setAssignments] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [salaryConfig, setSalaryConfig] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [batchStudentCounts, setBatchStudentCounts] = useState({});
  const [attendanceStats, setAttendanceStats] = useState({ totalSessions: 0, attendanceRate: 0 });

  // Modals
  const [isManageBatchesOpen, setIsManageBatchesOpen] = useState(false);
  const [isSalarySetupOpen, setIsSalarySetupOpen] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [newAssignment, setNewAssignment] = useState({ course: '', batch_id: '', role: 'Main' });

  const fetchTeacherData = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('teachers').select('*').eq('id', id).single();
      if (error) throw error;
      setTeacher(data);

      const [assRes, batchRes, courseRes] = await Promise.all([
        supabase.from('teacher_batches').select('*, batches(*)').eq('teacher_id', id),
        supabase.from('batches').select('*'),
        supabase.from('courses').select('*')
      ]);

      const teacherAssignments = assRes.data || [];
      setAssignments(teacherAssignments);
      setAllBatches(batchRes.data || []);
      setAllCourses(courseRes.data || []);

      const teacherBatchNames = teacherAssignments
        .map(a => a.batches?.batch_name)
        .filter(Boolean);

      // 1. Fetch Tasks & Submissions
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
      } else if (data.name) {
        const { data: tData } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_by', data.name)
          .order('created_at', { ascending: false });
        teacherTasks = tData || [];
      }
      setTasks(teacherTasks);

      // 2. Fetch Complaints addressed to teacher
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

      // 3. Batch Student Counts & Attendance
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
      
      // Fetch Salary Config
      const { data: salary } = await supabase.from('teacher_salaries').select('*').eq('teacher_id', id).single();
      if (salary) {
        setSalaryConfig(salary);
        setMonthlySalary(salary.monthly_amount);
      }

      // Fetch Payment History
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('entity_id', id)
        .eq('entity_type', 'teacher')
        .order('paid_date', { ascending: false });
      setPaymentHistory(payments || []);
    } catch (err) {
      toast.error("Error loading teacher profile");
      navigate('/admin/management/teachers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const syncTeacherLoginAccess = async () => {
    const { data: currentAssignments, error } = await supabase
      .from('teacher_batches')
      .select('batches(batch_name, course)')
      .eq('teacher_id', id);

    if (error) throw error;

    const assignedBatches = (currentAssignments || []).map(a => a.batches).filter(Boolean);
    const assignedBatchNames = assignedBatches.map(batch => batch.batch_name);
    const assignedCourses = Array.from(new Set(assignedBatches.map(batch => batch.course).filter(Boolean)));

    await syncTeacherAccess({
      cnic: teacher.cnic,
      name: teacher.name,
      assignedCourse: assignedCourses.join(', '),
      batch: assignedBatchNames.join(', ')
    });
  };

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  const handleAddAssignment = async () => {
    if (!canMutate) {
      toast.error("You do not have permission to modify teacher assignments.");
      return;
    }
    if (!newAssignment.batch_id) return;
    
    // Check if teacher is already assigned to this batch
    const isAlreadyAssigned = assignments.some(a => a.batch_id === newAssignment.batch_id);
    if (isAlreadyAssigned) {
      toast.error("Teacher is already assigned to this batch");
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
      toast.success("Batch assigned successfully");
      fetchTeacherData();
      setNewAssignment({ course: '', batch_id: '', role: 'Main' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const removeAssignment = async (assId, batchName, role) => {
    if (!canMutate) {
      toast.error("You do not have permission to modify teacher assignments.");
      return;
    }
    // Safety check for last main teacher could be added here
    if (!window.confirm(`Remove ${teacher.name} from ${batchName}?`)) return;
    try {
      await supabase.from('teacher_batches').delete().eq('id', assId);
      await syncTeacherLoginAccess();
      toast.success("Assignment removed");
      fetchTeacherData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async () => {
    if (!canMutate) {
      toast.error("You do not have permission to modify teacher status.");
      return;
    }
    const newStatus = teacher.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Mark as ${newStatus}?`)) return;
    try {
      await supabase.from('teachers').update({ status: newStatus }).eq('id', id);
      setTeacher({ ...teacher, status: newStatus });
      toast.success(`Teacher marked as ${newStatus}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateSalary = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.from('teacher_salaries').upsert({
        teacher_id: id,
        monthly_amount: monthlySalary,
        effective_from: new Date().toISOString().split('T')[0]
      }, { onConflict: 'teacher_id' });

      if (error) throw error;
      toast.success("Salary configuration updated");
      setIsSalarySetupOpen(false);
      fetchTeacherData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <AdminLayout><Container style={{textAlign:'center',paddingTop:'100px'}}>Loading...</Container></AdminLayout>;

  const initials = (teacher.name || 'Teacher').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const totalTasks = tasks.length;
  const totalSubmissions = tasks.reduce((sum, t) => sum + (t.submissions?.length || 0), 0);
  const gradedSubmissions = tasks.reduce((sum, t) => sum + (t.submissions?.filter(s => s.status === 'Graded').length || 0), 0);
  const gradingRate = totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 100;
  
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Closed' || c.status === 'Resolved').length;
  const complaintResolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 100;

  const totalStudents = Object.values(batchStudentCounts).reduce((sum, count) => sum + count, 0);

  return (
    <AdminLayout>
      <Container>
        <BackButton
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else if (router.asPath?.includes('/admin/hr/')) {
              router.push('/admin/hr/teachers');
            } else {
              router.push('/admin/management/teachers');
            }
          }}
        >
          <FaArrowLeft /> Back to Teachers
        </BackButton>
        <Layout>
          {/* SIDEBAR */}
          <SidebarCard>
            <ProfileHeader>
              <div className="avatar">{initials}</div>
              <h2>{teacher.name}</h2>
              <div className="specialization">{teacher.specialization}</div>
              <StatusBadge $variant={teacher.status === 'Active' ? 'success' : 'danger'}>{teacher.status}</StatusBadge>
            </ProfileHeader>

            <InfoGrid>
              <InfoRow><span className="label">Phone</span><span className="value">{teacher.phone}</span></InfoRow>
              <InfoRow><span className="label">CNIC</span><span className="value">{teacher.cnic}</span></InfoRow>
              <InfoRow><span className="label">Email</span><span className="value" style={{ fontSize: '0.75rem' }}>{teacher.email}</span></InfoRow>
              <InfoRow><span className="label">Experience</span><span className="value">{teacher.experience_years} Years</span></InfoRow>
              <InfoRow><span className="label">Joined</span><span className="value">{new Date(teacher.created_at).toLocaleDateString()}</span></InfoRow>
            </InfoGrid>

            <AssignedBatches>
              <h4>Assigned Batches ({assignments.length})</h4>
              <div className="batch-list">
                {assignments.map(a => (
                  <BatchItem key={a.id}>
                    <div>
                      <span className="name">{a.batches?.batch_name}</span>
                      <span className="role">{a.role} Teacher</span>
                    </div>
                    <button onClick={() => removeAssignment(a.id, a.batches?.batch_name)}><FaTimes /></button>
                  </BatchItem>
                ))}
              </div>
            </AssignedBatches>

            {canMutate ? (
              <ActionButtons>
                <Button className="edit"><FaEdit /> Edit Details</Button>
                <Button className="batches" onClick={() => setIsManageBatchesOpen(true)}><FaPlus /> Manage Batches</Button>
                <Button className="status" $active={teacher.status === 'Active'} onClick={toggleStatus}>
                  {teacher.status === 'Active' ? <><FaUserSlash /> Mark Inactive</> : <><FaCheckCircle /> Mark Active</>}
                </Button>
                <Button className="revoke"><FaTimesCircle /> Revoke Access</Button>
              </ActionButtons>
            ) : (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#888', fontSize: '0.8rem', textAlign: 'center', marginTop: '15px' }}>
                Read-only view
              </div>
            )}
          </SidebarCard>

          {/* CONTENT */}
          <MainContent>
            <TabContainer>
              <TabBar>
                {['Performance', 'Tasks', 'Complaints', 'Batches', 'Finance'].map(t => (
                  <Tab key={t} $active={activeTab === t} onClick={() => setActiveTab(t)}>{t}</Tab>
                ))}
              </TabBar>

              <TabBody>
                {activeTab === 'Performance' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}>
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
                        <div className="lab">Active Students Enrolled</div>
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
                        <span>Assigned Tasks</span>
                        <span>{totalTasks} Total Tasks</span>
                      </div>
                      <div className="track"><div className="fill" /></div>
                    </PerformanceBar>
                  </motion.div>
                )}

                {activeTab === 'Tasks' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                        Assigned Tasks & Submissions ({tasks.length})
                      </h4>
                    </div>
                    <div style={{ background: '#0a0a0a', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Table>
                        <thead>
                          <tr>
                            <th>Task Title</th>
                            <th>Batch / Course</th>
                            <th>Category</th>
                            <th>Due Date</th>
                            <th>Submissions</th>
                            <th>Graded</th>
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
                                  <div style={{ color: '#378ADD', fontSize: '0.8rem' }}>{t.batch}</div>
                                </td>
                                <td>{t.category}</td>
                                <td>{new Date(t.due_date).toLocaleDateString()}</td>
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
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#555' }}>No tasks assigned by this teacher.</td></tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'Complaints' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                        Complaints Addressed to Instructor ({complaints.length})
                      </h4>
                    </div>
                    <div style={{ background: '#0a0a0a', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
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
                                <div style={{ fontSize: '0.8rem', color: '#888' }}>{c.description?.substring(0, 60)}{c.description?.length > 60 ? '...' : ''}</div>
                              </td>
                              <td style={{ color: '#aaa' }}>{c.student_cnic}</td>
                              <td style={{ color: '#378ADD' }}>{c.batch}</td>
                              <td>
                                <StatusBadge $variant={c.status === 'Closed' || c.status === 'Resolved' ? 'success' : c.status === 'In Progress' ? 'info' : 'warning'}>
                                  {c.status}
                                </StatusBadge>
                              </td>
                              <td style={{ color: '#666', fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                          {complaints.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#555' }}>No complaints received for this teacher.</td></tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'Batches' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                        Assigned Batches & Classes ({assignments.length})
                      </h4>
                      <SubmitBtn 
                        style={{ width: 'auto', padding: '8px 16px', marginTop: 0, fontSize: '0.85rem' }}
                        onClick={() => setIsManageBatchesOpen(true)}
                      >
                        <FaPlus /> Assign New Batch
                      </SubmitBtn>
                    </div>
                    <div style={{ background: '#0a0a0a', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Table>
                        <thead>
                          <tr>
                            <th>Batch Name</th>
                            <th>Course</th>
                            <th>Role</th>
                            <th>Shift / Timing</th>
                            <th>Enrolled Students</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map(a => {
                            const batchName = a.batches?.batch_name;
                            const studentCount = batchStudentCounts[batchName] || 0;
                            return (
                              <tr key={a.id}>
                                <td style={{ fontWeight: '700', color: '#fff' }}>{batchName}</td>
                                <td style={{ color: '#ccc' }}>{a.batches?.course}</td>
                                <td>
                                  <StatusBadge $variant={a.role === 'Main' ? 'info' : 'warning'}>
                                    {a.role} Teacher
                                  </StatusBadge>
                                </td>
                                <td style={{ color: '#888' }}>{a.batches?.time_shift || a.batches?.timing_label || 'Regular'}</td>
                                <td style={{ fontWeight: '600', color: '#10B981' }}>{studentCount} active students</td>
                                <td>
                                  <button 
                                    onClick={() => removeAssignment(a.id, batchName)}
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {assignments.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#555' }}>No batches currently assigned to this teacher.</td></tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'Finance' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                      <StatsGrid style={{ flex: 1, marginBottom: 0 }}>
                        <MiniStat>
                          <div className="val">Rs. {salaryConfig?.monthly_amount.toLocaleString() || '0'}</div>
                          <div className="lab">Monthly Salary</div>
                        </MiniStat>
                        <MiniStat>
                          <div className="val">{paymentHistory.length}</div>
                          <div className="lab">Payments Made</div>
                        </MiniStat>
                      </StatsGrid>
                      <SubmitBtn 
                        style={{ width: '200px', marginTop: 0, marginLeft: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} 
                        onClick={() => setIsSalarySetupOpen(true)}
                      >
                        <FaEdit /> Setup Salary
                      </SubmitBtn>
                    </div>

                    <h4 style={{ marginBottom: '15px', color: '#888', textTransform: 'uppercase', fontSize: '0.8rem' }}>Payment History</h4>
                    <div style={{ background: '#0a0a0a', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Table>
                        <thead>
                          <tr>
                            <th>Month/Description</th>
                            <th>Amount</th>
                            <th>Paid Date</th>
                            <th>Method</th>
                            <th>Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.map(p => (
                            <tr key={p.id}>
                              <td>{p.description}</td>
                              <td style={{ fontWeight: '700', color: '#10B981' }}>Rs. {p.amount.toLocaleString()}</td>
                              <td>{p.paid_date}</td>
                              <td style={{ textTransform: 'capitalize' }}>{p.method?.replace('_', ' ')}</td>
                              <td style={{ color: '#6b7280' }}>{p.reference_number || '—'}</td>
                            </tr>
                          ))}
                          {paymentHistory.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#555' }}>No payment records found.</td></tr>
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </motion.div>
                )}
              </TabBody>
            </TabContainer>
          </MainContent>
        </Layout>
      </Container>

      {/* MODALS */}
      <AnimatePresence>
        {isManageBatchesOpen && (
          <ModalOverlay initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <ModalContent initial={{y:20}} animate={{y:0}}>
              <ModalHeader><h3>Manage Batches</h3><button onClick={() => setIsManageBatchesOpen(false)}><FaTimes /></button></ModalHeader>
              <FormGroup>
                <label>Course</label>
                <select value={newAssignment.course} onChange={e => setNewAssignment({...newAssignment, course: e.target.value})}>
                  <option value="">Select Course</option>
                  {allCourses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                </select>
              </FormGroup>
              <FormGroup>
                <label>Batch</label>
                <select value={newAssignment.batch_id} onChange={e => setNewAssignment({...newAssignment, batch_id: e.target.value})}>
                  <option value="">Select Batch</option>
                  {allBatches.filter(b => b.course === newAssignment.course).map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                </select>
              </FormGroup>
              <FormGroup>
                <label>Role</label>
                <select value={newAssignment.role} onChange={e => setNewAssignment({...newAssignment, role: e.target.value})}>
                  <option value="Main">Main Teacher</option>
                  <option value="Assistant">Assistant Teacher</option>
                </select>
              </FormGroup>
              <SubmitBtn onClick={handleAddAssignment} disabled={processing}>{processing ? "Assigning..." : "Add Assignment"}</SubmitBtn>
            </ModalContent>
          </ModalOverlay>
        )}
        {isSalarySetupOpen && (
          <ModalOverlay initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <ModalContent initial={{y:20}} animate={{y:0}}>
              <ModalHeader>
                <h3>Setup Teacher Salary</h3>
                <button onClick={() => setIsSalarySetupOpen(false)}><FaTimes /></button>
              </ModalHeader>
              <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(55, 138, 221, 0.1)', borderRadius: '10px', color: '#378ADD', fontSize: '0.9rem' }}>
                Set the fixed monthly salary for this teacher. This will be used for system-wide reporting.
              </div>
              <FormGroup>
                <label>Monthly Salary (PKR)</label>
                <input 
                  type="number" 
                  value={monthlySalary} 
                  onChange={(e) => setMonthlySalary(parseInt(e.target.value))} 
                />
              </FormGroup>
              <SubmitBtn onClick={handleUpdateSalary} disabled={processing}>
                {processing ? "Saving..." : "Save Configuration"}
              </SubmitBtn>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default TeacherProfile;
