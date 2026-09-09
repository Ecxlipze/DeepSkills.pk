import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { 
  FaHome, FaTasks, FaChartLine, FaCertificate, 
  FaExclamationCircle, FaUserPlus, FaComments, 
  FaWallet, FaUserFriends, FaGraduationCap, FaUpload, FaTimes
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Card = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  padding: 25px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
`;

const SectionTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
`;

// Stats Row
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const StatCard = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 25px;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #fff;
`;

const ProgressBar = styled.div`
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  width: 100%;
  margin-top: 10px;
  overflow: hidden;

  div {
    height: 100%;
    background: #4da6ff;
    width: ${props => props.progress}%;
    border-radius: 10px;
    transition: width 1s ease-in-out;
  }
`;

// Task Cards
const TaskGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const TaskCard = styled.div`
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(123, 31, 46, 0.5);
    transform: translateY(-2px);
  }
`;

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
`;

const TaskTitle = styled.h4`
  margin: 0;
  color: #fff;
  font-size: 1.1rem;
`;

const CategoryBadge = styled.span`
  background: rgba(123, 31, 46, 0.2);
  color: #ff4d6d;
  border: 1px solid rgba(123, 31, 46, 0.4);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
`;

const TaskDesc = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TaskFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 15px;
  border-top: 1px dashed rgba(255,255,255,0.1);
`;

const DueDate = styled.div`
  font-size: 0.85rem;
  color: ${props => props.$overdue ? '#ff4d6d' : '#ccc'};
  font-weight: ${props => props.$overdue ? 'bold' : 'normal'};
`;

const StatusBadge = styled.span`
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 600;
  
  ${({ $status }) => {
    switch($status) {
      case 'Graded': return 'background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);';
      case 'Submitted': return 'background: rgba(55, 138, 221, 0.15); color: #378ADD; border: 1px solid rgba(55, 138, 221, 0.3);';
      case 'Overdue': return 'background: rgba(211, 47, 47, 0.15); color: #f44336; border: 1px solid rgba(211, 47, 47, 0.3);';
      case 'Pending': return 'background: rgba(255, 152, 0, 0.15); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3);';
      default: return 'background: #333; color: #fff;';
    }
  }}
`;

const SubmitBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #9c273a;
  }
`;

// Filter Bar
const FilterBar = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 5px;
`;

const FilterBtn = styled.button`
  background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.05)'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.7)'};
  border: 1px solid ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  }
`;

// List View
const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const TaskListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

// Modal
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  
  h3 { margin: 0; color: #fff; }
`;

const ModalBody = styled.div`
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const UploadArea = styled.div`
  border: 2px dashed rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    border-color: #7B1F2E;
    background: rgba(123, 31, 46, 0.05);
  }

  input {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    opacity: 0; cursor: pointer;
  }
`;

// Nav items handled by DashboardLayout

const StudentTasks = () => {
  const { user } = useAuth();
  const { tasks, submitTask } = useTasks();
  
  const studentName = user?.name || "";
  const studentCnic = user?.cnic || "";
  const studentCourse = user?.assigned_course || "";
  const studentBatch = user?.batch || "";
  const isAssigned = Boolean(studentCourse && studentBatch);

  const [filter, setFilter] = useState('All');
  const [selectedTaskToSubmit, setSelectedTaskToSubmit] = useState(null);
  const [fileToSubmit, setFileToSubmit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const todayString = new Date().toISOString().split('T')[0];

  // Filter tasks for this student's course & batch
  const myTasks = isAssigned ? tasks.filter(t => t.course === studentCourse && t.batch === studentBatch) : [];

  // Helper to determine student status on a task
  const getStatus = (task) => {
    const sub = task.submissions?.find(s => s.cnic === studentCnic);
    if (sub) {
      if (sub.status === 'Graded') return 'Graded';
      return 'Submitted';
    }
    const isOverdue = new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
    if (isOverdue) return 'Overdue';
    return 'Pending';
  };

  const tasksWithStatus = myTasks.map(t => {
    const sub = t.submissions?.find(s => s.cnic === studentCnic);
    return {
      ...t,
      status: getStatus(t),
      mySubmission: sub
    };
  });
  
  const todayTasks = tasksWithStatus.filter(t => t.dueDate === todayString);
  const pendingCount = tasksWithStatus.filter(t => t.status === 'Pending').length;
  const completedCount = tasksWithStatus.filter(t => t.status === 'Submitted' || t.status === 'Graded').length;
  const progressPercent = myTasks.length > 0 ? Math.round((completedCount / myTasks.length) * 100) : 0;

  const filteredTasks = tasksWithStatus.filter(t => {
    if (filter === 'All') return true;
    return t.status === filter;
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileToSubmit(e.target.files[0]);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedTaskToSubmit) return;
    if (!studentCnic) {
      toast.error('Student CNIC is missing. Please re-login.');
      return;
    }
    if (!fileToSubmit) {
      toast.error('Please select a file to submit.');
      return;
    }
    setIsSubmitting(true);
    
    try {
      // Sanitize the strings for a safe file name
      const safeStudentName = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
      const safeBatch = (studentBatch || 'Batch').replace(/[^a-zA-Z0-9]/g, '_');
      const safeTaskName = selectedTaskToSubmit.title.replace(/[^a-zA-Z0-9]/g, '_');
      const customFileName = `${safeStudentName}_${safeBatch}_${safeTaskName}`;

      await submitTask(selectedTaskToSubmit.id, {
        studentName: studentName || 'Student',
        cnic: studentCnic,
        file: fileToSubmit,
        customFileName
      });

      setSelectedTaskToSubmit(null);
      setFileToSubmit(null);
      toast.success("Task submitted successfully!");
    } catch (err) {
      toast.error(err?.message || "Failed to submit task");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAssigned) {
    return (
      <DashboardLayout>
        <Container>
          <Card initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <SectionTitle>Assigned Tasks</SectionTitle>
            <div style={{ color: 'rgba(255,255,255,0.6)', padding: '30px 0', textAlign: 'center' }}>
              <FaExclamationCircle style={{ fontSize: '2.5rem', color: '#ff9800', marginBottom: '12px' }} /><br />
              <strong style={{ color: '#fff', fontSize: '1.1rem' }}>No Batch Assigned</strong>
              <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                You are currently not enrolled in an active course batch. Tasks will appear here once you are assigned to a batch.
              </p>
            </div>
          </Card>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container>
        
        {/* Top Stats */}
        <StatsGrid>
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <StatLabel>Today's Task Status</StatLabel>
            <StatValue style={{ color: pendingCount > 0 ? '#ff9800' : '#4caf50' }}>
              {pendingCount > 0 ? `${pendingCount} Pending` : 'All Done'}
            </StatValue>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatLabel>Overall Task Progress</StatLabel>
            <StatValue>{progressPercent}%</StatValue>
            <ProgressBar progress={progressPercent}><div></div></ProgressBar>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatLabel>Total Completed</StatLabel>
            <StatValue>{completedCount}</StatValue>
          </StatCard>
        </StatsGrid>

        {/* Today's Tasks */}
        <Card initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <SectionTitle>Today's Tasks</SectionTitle>
          {todayTasks.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No tasks due today.</div>
          ) : (
            <TaskGrid>
              {todayTasks.map(task => (
                <TaskCard key={task.id}>
                  <TaskHeader>
                    <TaskTitle>{task.title}</TaskTitle>
                    <CategoryBadge>{task.category}</CategoryBadge>
                  </TaskHeader>
                  <TaskDesc>{task.description}</TaskDesc>
                  <TaskFooter>
                    <DueDate $overdue={task.status === 'Overdue'}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </DueDate>
                    {task.status === 'Pending' ? (
                      <SubmitBtn onClick={() => setSelectedTaskToSubmit(task)}>Submit Task</SubmitBtn>
                    ) : task.status === 'Graded' ? (
                      <StatusBadge $status="Graded">
                        Graded: {task.mySubmission?.marksObtained ?? '-'} / {task.totalMarks || 100}
                      </StatusBadge>
                    ) : (
                      <StatusBadge $status={task.status}>{task.status}</StatusBadge>
                    )}
                  </TaskFooter>
                </TaskCard>
              ))}
            </TaskGrid>
          )}
        </Card>

        {/* All Tasks */}
        <Card initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <SectionTitle style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              All Assigned Tasks
            </SectionTitle>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
              Showing tasks for:<br/>
              <strong style={{ color: '#fff' }}>{studentCourse}</strong> - <strong style={{ color: '#fff' }}>{studentBatch}</strong>
            </div>
          </div>
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />
          
          <FilterBar>
            {['All', 'Pending', 'Submitted', 'Graded', 'Overdue'].map(f => (
              <FilterBtn 
                key={f} 
                $active={filter === f} 
                onClick={() => setFilter(f)}
              >
                {f}
              </FilterBtn>
            ))}
          </FilterBar>

          <TaskList>
            {filteredTasks.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic', padding: '20px 0' }}>No tasks found for this filter.</div>
            ) : (
              filteredTasks.map(task => (
                <TaskListItem key={task.id}>
                  <div style={{ flex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{task.title}</strong>
                      <CategoryBadge>{task.category}</CategoryBadge>
                    </div>
                    <DueDate $overdue={task.status === 'Overdue'}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </DueDate>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
                    {task.status === 'Graded' ? (
                      <StatusBadge $status="Graded">
                        Graded: {task.mySubmission?.marksObtained ?? '-'} / {task.totalMarks || 100}
                      </StatusBadge>
                    ) : (
                      <StatusBadge $status={task.status}>{task.status}</StatusBadge>
                    )}
                    {task.status === 'Pending' && (
                      <SubmitBtn onClick={() => setSelectedTaskToSubmit(task)}>Submit</SubmitBtn>
                    )}
                    {(task.status === 'Submitted' || task.status === 'Graded') && (
                      <span 
                        onClick={() => {
                          const mySub = task.mySubmission || task.submissions.find(s => s.cnic === studentCnic);
                          if (mySub?.fileUrl && mySub.fileUrl.startsWith('http')) {
                            window.open(mySub.fileUrl, '_blank');
                          } else {
                            alert(`File preview not available for older submissions.`);
                          }
                        }}
                        style={{ color: '#4da6ff', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        View Submission
                      </span>
                    )}
                  </div>
                </TaskListItem>
              ))
            )}
          </TaskList>
        </Card>

      </Container>

      {/* Submit Task Modal */}
      <AnimatePresence>
        {selectedTaskToSubmit && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedTaskToSubmit(null); setFileToSubmit(null); }}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <h3>Submit: {selectedTaskToSubmit.title}</h3>
                <button 
                  onClick={() => { setSelectedTaskToSubmit(null); setFileToSubmit(null); }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <FaTimes size={18} />
                </button>
              </ModalHeader>
              <ModalBody>
                <p style={{ color: '#ccc', fontSize: '0.9rem', margin: 0 }}>
                  Please upload your assignment file below.
                </p>
                <UploadArea>
                  <input type="file" onChange={handleFileChange} />
                  <FaUpload size={30} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }} />
                  {fileToSubmit ? (
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{fileToSubmit.name}</div>
                  ) : (
                    <div>Click or drag file here to upload</div>
                  )}
                  <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>Max 10MB (ZIP, PDF, DOCX)</div>
                </UploadArea>
                <SubmitBtn onClick={handleSubmitTask} disabled={isSubmitting} style={{ width: '100%', padding: '12px' }}>
                  {isSubmitting ? 'Uploading...' : 'Submit Assignment'}
                </SubmitBtn>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
};

export default StudentTasks;
