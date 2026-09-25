import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { 
  FaTasks, FaExclamationCircle, FaUpload, FaTimes,
  FaGithub, FaExternalLinkAlt, FaDownload, FaCommentDots, 
  FaStar, FaSearch, FaCheckCircle, FaClock, FaLink, FaFileAlt, FaRedo
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
  display: flex;
  align-items: center;
  gap: 10px;
`;

// Stats Row
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
`;

const StatCard = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 22px;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatValue = styled.div`
  font-size: 1.85rem;
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
    transition: width 0.8s ease-in-out;
  }
`;

// Task Cards
const TaskGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

const TaskCard = styled.div`
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
`;

const TaskDesc = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TeacherAttachment = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 6px;
  color: #4da6ff;
  font-size: 0.8rem;
  text-decoration: none;
  width: fit-content;
  transition: all 0.2s;

  &:hover {
    background: rgba(77, 166, 255, 0.15);
    border-color: #4da6ff;
    color: #fff;
  }
`;

const FeedbackBox = styled.div`
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 0.85rem;
  color: #d1fae5;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TaskFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px dashed rgba(255,255,255,0.1);
`;

const DueDate = styled.div`
  font-size: 0.85rem;
  color: ${props => props.$overdue ? '#ff4d6d' : 'rgba(255,255,255,0.6)'};
  font-weight: ${props => props.$overdue ? 'bold' : 'normal'};
  display: flex;
  align-items: center;
  gap: 5px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
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

const PrimaryBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #9c273a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryBtn = styled.button`
  background: rgba(255,255,255,0.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255,255,255,0.15);
  }
`;

// Filter & Search Controls
const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const FilterBtn = styled.button`
  background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.05)'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.7)'};
  border: 1px solid ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  padding: 6px 14px;
  border-radius: 50px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  }
`;

const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 6px 12px;
  gap: 8px;
  min-width: 220px;

  input {
    background: none;
    border: none;
    outline: none;
    color: #fff;
    font-size: 0.85rem;
    width: 100%;

    &::placeholder {
      color: rgba(255,255,255,0.4);
    }
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
  padding: 16px 20px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.08);
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
  background: rgba(0,0,0,0.85);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #121212;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  
  h3 { margin: 0; color: #fff; font-size: 1.15rem; }
`;

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const TabSwitcher = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
`;

const TabBtn = styled.button`
  background: ${props => props.$active ? '#7B1F2E' : 'transparent'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.6)'};
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.82rem;
    color: rgba(255,255,255,0.7);
    font-weight: 500;
  }

  input, textarea {
    background: #080808;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    padding: 10px 14px;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #7B1F2E;
    }
  }

  textarea {
    resize: vertical;
    min-height: 70px;
  }
`;

const UploadArea = styled.div`
  border: 2px dashed rgba(255,255,255,0.25);
  border-radius: 8px;
  padding: 32px 20px;
  text-align: center;
  color: rgba(255,255,255,0.65);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    border-color: #7B1F2E;
    background: rgba(123, 31, 46, 0.08);
  }

  input {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    opacity: 0; cursor: pointer;
  }
`;

const SubmissionDetailsCard = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;

  span:first-child {
    color: rgba(255,255,255,0.5);
  }
  span:last-child {
    color: #fff;
    font-weight: 500;
  }
`;

const StudentTasks = () => {
  const { user } = useAuth();
  const { tasks, submitTask } = useTasks();
  
  const studentName = user?.name || "";
  const studentCnic = user?.cnic || "";
  const studentCourse = user?.assigned_course || "";
  const studentBatch = user?.batch || "";
  const isAssigned = Boolean(studentCourse && studentBatch);

  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Submission modal state
  const [selectedTaskToSubmit, setSelectedTaskToSubmit] = useState(null);
  const [submissionTab, setSubmissionTab] = useState('url'); // 'url' | 'file'
  const [projectUrl, setProjectUrl] = useState('');
  const [fileToSubmit, setFileToSubmit] = useState(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View submission modal state
  const [viewingSubmission, setViewingSubmission] = useState(null);
  
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
  const gradedCount = tasksWithStatus.filter(t => t.status === 'Graded').length;
  const completedCount = tasksWithStatus.filter(t => t.status === 'Submitted' || t.status === 'Graded').length;
  const progressPercent = myTasks.length > 0 ? Math.round((completedCount / myTasks.length) * 100) : 0;

  const filteredTasks = tasksWithStatus.filter(t => {
    // Status filter
    if (filter !== 'All' && t.status !== filter) return false;
    // Search keyword
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCategory = t.category?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCategory;
    }
    return true;
  });

  const handleOpenSubmit = (task) => {
    setSelectedTaskToSubmit(task);
    // Preset if previously submitted
    if (task.mySubmission?.fileUrl) {
      if (task.mySubmission.fileUrl.startsWith('http')) {
        setProjectUrl(task.mySubmission.fileUrl);
        setSubmissionTab('url');
      } else {
        setSubmissionTab('file');
      }
    } else {
      setProjectUrl('');
      setSubmissionTab('url');
    }
    setFileToSubmit(null);
    setStudentNotes('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileToSubmit(e.target.files[0]);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedTaskToSubmit) return;
    if (!studentCnic) {
      toast.error('Student CNIC session not found. Please log in again.');
      return;
    }

    if (submissionTab === 'url') {
      const trimmedUrl = projectUrl.trim();
      if (!trimmedUrl) {
        toast.error('Please enter your project or GitHub repository URL.');
        return;
      }
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        toast.error('Please enter a valid URL starting with http:// or https://');
        return;
      }
    } else {
      if (!fileToSubmit) {
        toast.error('Please choose a file (.zip, .pdf, .docx) to upload.');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const safeStudentName = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
      const safeBatch = (studentBatch || 'Batch').replace(/[^a-zA-Z0-9]/g, '_');
      const safeTaskName = selectedTaskToSubmit.title.replace(/[^a-zA-Z0-9]/g, '_');
      const customFileName = `${safeStudentName}_${safeBatch}_${safeTaskName}`;

      const payload = {
        studentName: studentName || 'Student',
        cnic: studentCnic,
        customFileName,
        notes: studentNotes.trim() || undefined
      };

      if (submissionTab === 'url') {
        payload.fileUrl = projectUrl.trim();
      } else {
        payload.file = fileToSubmit;
      }

      await submitTask(selectedTaskToSubmit.id, payload);

      toast.success("Assignment submitted successfully!");
      setSelectedTaskToSubmit(null);
      setFileToSubmit(null);
      setProjectUrl('');
      setStudentNotes('');
    } catch (err) {
      toast.error(err?.message || "Failed to submit assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAssigned) {
    return (
      <DashboardLayout>
        <Container>
          <Card initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <SectionTitle><FaTasks /> Assigned Tasks & Coursework</SectionTitle>
            <div style={{ color: 'rgba(255,255,255,0.6)', padding: '40px 0', textAlign: 'center' }}>
              <FaExclamationCircle style={{ fontSize: '2.5rem', color: '#ff9800', marginBottom: '14px' }} /><br />
              <strong style={{ color: '#fff', fontSize: '1.2rem' }}>No Batch Assigned</strong>
              <p style={{ marginTop: '8px', fontSize: '0.9rem', maxWidth: '500px', margin: '8px auto 0' }}>
                You are currently not assigned to an active batch cohort. Once the Academic Coordinator schedules your batch, your coursework and deadlines will populate automatically here.
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
            <StatLabel>Today's Tasks</StatLabel>
            <StatValue style={{ color: todayTasks.length > 0 ? '#ff9800' : '#4caf50' }}>
              {todayTasks.length > 0 ? `${todayTasks.length} Due Today` : 'None Due'}
            </StatValue>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatLabel>Course Completion</StatLabel>
            <StatValue>{progressPercent}%</StatValue>
            <ProgressBar progress={progressPercent}><div></div></ProgressBar>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatLabel>Pending Submissions</StatLabel>
            <StatValue style={{ color: pendingCount > 0 ? '#ff9800' : '#fff' }}>{pendingCount}</StatValue>
          </StatCard>

          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <StatLabel>Graded Assignments</StatLabel>
            <StatValue style={{ color: '#10B981' }}>{gradedCount} / {myTasks.length}</StatValue>
          </StatCard>
        </StatsGrid>

        {/* Today's Tasks */}
        <Card initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <SectionTitle><FaClock style={{ color: '#ff9800' }} /> Due Today</SectionTitle>
          {todayTasks.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', padding: '10px 0' }}>
              🎉 No tasks scheduled for today. You are fully caught up!
            </div>
          ) : (
            <TaskGrid>
              {todayTasks.map(task => (
                <TaskCard key={task.id}>
                  <TaskHeader>
                    <TaskTitle>{task.title}</TaskTitle>
                    <CategoryBadge>{task.category}</CategoryBadge>
                  </TaskHeader>
                  <TaskDesc>{task.description}</TaskDesc>

                  {task.fileUrl && (
                    <TeacherAttachment href={task.fileUrl} target="_blank" rel="noopener noreferrer">
                      <FaDownload size={11} /> Assignment Brief / Resources
                    </TeacherAttachment>
                  )}

                  {task.status === 'Graded' && task.mySubmission?.feedback && (
                    <FeedbackBox>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                        <FaCommentDots size={12} color="#10B981" /> Teacher Feedback:
                      </div>
                      <div>"{task.mySubmission.feedback}"</div>
                    </FeedbackBox>
                  )}

                  <TaskFooter>
                    <DueDate $overdue={task.status === 'Overdue'}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </DueDate>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {task.status === 'Pending' || task.status === 'Overdue' ? (
                        <PrimaryBtn onClick={() => handleOpenSubmit(task)}>
                          <FaUpload size={12} /> Submit
                        </PrimaryBtn>
                      ) : task.status === 'Graded' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <StatusBadge $status="Graded">
                            <FaStar size={11} /> {task.mySubmission?.marksObtained ?? '-'} / {task.totalMarks || 100}
                          </StatusBadge>
                          <SecondaryBtn onClick={() => setViewingSubmission({ task, submission: task.mySubmission })}>
                            Review
                          </SecondaryBtn>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <StatusBadge $status="Submitted">
                            <FaCheckCircle size={11} /> Submitted
                          </StatusBadge>
                          <SecondaryBtn onClick={() => setViewingSubmission({ task, submission: task.mySubmission })}>
                            View
                          </SecondaryBtn>
                        </div>
                      )}
                    </div>
                  </TaskFooter>
                </TaskCard>
              ))}
            </TaskGrid>
          )}
        </Card>

        {/* All Tasks */}
        <Card initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <SectionTitle style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '4px' }}>
                <FaTasks style={{ color: '#ff4d6d' }} /> All Coursework & Assignments
              </SectionTitle>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                Course: <strong style={{ color: '#fff' }}>{studentCourse}</strong> &bull; Batch: <strong style={{ color: '#fff' }}>{studentBatch}</strong>
              </div>
            </div>
            
            <SearchInputWrap>
              <FaSearch size={13} color="rgba(255,255,255,0.4)" />
              <input 
                type="text" 
                placeholder="Search tasks by title..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </SearchInputWrap>
          </div>
          
          <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '18px 0' }} />
          
          <ControlsRow>
            <FilterBar>
              {[
                { id: 'All', label: `All (${myTasks.length})` },
                { id: 'Pending', label: `Pending (${pendingCount})` },
                { id: 'Submitted', label: `Submitted (${tasksWithStatus.filter(t => t.status === 'Submitted').length})` },
                { id: 'Graded', label: `Graded (${gradedCount})` },
                { id: 'Overdue', label: `Overdue (${tasksWithStatus.filter(t => t.status === 'Overdue').length})` }
              ].map(item => (
                <FilterBtn 
                  key={item.id} 
                  $active={filter === item.id} 
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </FilterBtn>
              ))}
            </FilterBar>
          </ControlsRow>

          <TaskList>
            {filteredTasks.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', padding: '30px 0', textAlign: 'center' }}>
                No assignments match the selected filter.
              </div>
            ) : (
              filteredTasks.map(task => {
                const sub = task.mySubmission;
                return (
                  <TaskListItem key={task.id}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{task.title}</strong>
                        <CategoryBadge>{task.category}</CategoryBadge>
                        {task.assignedBy && (
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                            by {task.assignedBy}
                          </span>
                        )}
                      </div>
                      
                      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>
                        {task.description}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <DueDate $overdue={task.status === 'Overdue'}>
                          <FaClock size={11} /> Due: {new Date(task.dueDate).toLocaleDateString()}
                        </DueDate>
                        
                        {task.fileUrl && (
                          <TeacherAttachment href={task.fileUrl} target="_blank" rel="noopener noreferrer">
                            <FaDownload size={10} /> Brief File
                          </TeacherAttachment>
                        )}
                      </div>

                      {task.status === 'Graded' && sub?.feedback && (
                        <FeedbackBox style={{ marginTop: '4px' }}>
                          <span style={{ fontWeight: 'bold' }}>💬 Evaluator Feedback:</span>
                          <span>"{sub.feedback}"</span>
                        </FeedbackBox>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {task.status === 'Graded' ? (
                        <>
                          <StatusBadge $status="Graded">
                            <FaStar size={11} /> {sub?.marksObtained ?? '-'} / {task.totalMarks || 100}
                            {sub?.grade ? ` (${sub.grade})` : ''}
                          </StatusBadge>
                          <SecondaryBtn onClick={() => setViewingSubmission({ task, submission: sub })}>
                            <FaExternalLinkAlt size={10} /> Review Grade
                          </SecondaryBtn>
                        </>
                      ) : task.status === 'Submitted' ? (
                        <>
                          <StatusBadge $status="Submitted">
                            <FaCheckCircle size={11} /> Submitted
                          </StatusBadge>
                          <SecondaryBtn onClick={() => setViewingSubmission({ task, submission: sub })}>
                            <FaExternalLinkAlt size={10} /> View Work
                          </SecondaryBtn>
                          <SecondaryBtn onClick={() => handleOpenSubmit(task)} title="Update submission">
                            <FaRedo size={10} /> Re-Submit
                          </SecondaryBtn>
                        </>
                      ) : (
                        <>
                          <StatusBadge $status={task.status}>{task.status}</StatusBadge>
                          <PrimaryBtn onClick={() => handleOpenSubmit(task)}>
                            <FaUpload size={11} /> Submit Work
                          </PrimaryBtn>
                        </>
                      )}
                    </div>
                  </TaskListItem>
                );
              })
            )}
          </TaskList>
        </Card>

      </Container>

      {/* Submit Assignment Modal */}
      <AnimatePresence>
        {selectedTaskToSubmit && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedTaskToSubmit(null); setFileToSubmit(null); }}
          >
            <ModalContent
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <div>
                  <h3 style={{ margin: 0 }}>Submit Assignment</h3>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {selectedTaskToSubmit.title}
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedTaskToSubmit(null); setFileToSubmit(null); }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                >
                  <FaTimes size={18} />
                </button>
              </ModalHeader>
              
              <ModalBody>
                <TabSwitcher>
                  <TabBtn 
                    $active={submissionTab === 'url'} 
                    onClick={() => setSubmissionTab('url')}
                  >
                    <FaGithub size={14} /> Repository / URL
                  </TabBtn>
                  <TabBtn 
                    $active={submissionTab === 'file'} 
                    onClick={() => setSubmissionTab('file')}
                  >
                    <FaUpload size={14} /> File Archive
                  </TabBtn>
                </TabSwitcher>

                {submissionTab === 'url' ? (
                  <InputGroup>
                    <label>Project Repository or Live URL *</label>
                    <input 
                      type="url" 
                      placeholder="e.g. https://github.com/username/project or Figma link"
                      value={projectUrl}
                      onChange={e => setProjectUrl(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      Supports GitHub, GitLab, Vercel, Netlify, Google Drive, or Figma share links.
                    </span>
                  </InputGroup>
                ) : (
                  <InputGroup>
                    <label>Select Assignment File *</label>
                    <UploadArea>
                      <input type="file" onChange={handleFileChange} />
                      <FaUpload size={28} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }} />
                      {fileToSubmit ? (
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{fileToSubmit.name}</div>
                      ) : (
                        <div>Click or drag archive file here to upload</div>
                      )}
                      <div style={{ fontSize: '0.78rem', marginTop: '6px', color: 'rgba(255,255,255,0.4)' }}>
                        Accepted: .zip, .pdf, .docx, .tar.gz (Max 10MB)
                      </div>
                    </UploadArea>
                  </InputGroup>
                )}

                <InputGroup>
                  <label>Student Notes / Comments (Optional)</label>
                  <textarea 
                    placeholder="Mention any prerequisites, credentials, or remarks for your instructor..."
                    value={studentNotes}
                    onChange={e => setStudentNotes(e.target.value)}
                  />
                </InputGroup>

                <PrimaryBtn 
                  onClick={handleSubmitTask} 
                  disabled={isSubmitting} 
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  {isSubmitting ? 'Uploading & Submitting...' : 'Confirm Submission'}
                </PrimaryBtn>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* View Submission Details Modal */}
      <AnimatePresence>
        {viewingSubmission && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingSubmission(null)}
          >
            <ModalContent
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <div>
                  <h3 style={{ margin: 0 }}>Submission Review</h3>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {viewingSubmission.task.title}
                  </div>
                </div>
                <button 
                  onClick={() => setViewingSubmission(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                >
                  <FaTimes size={18} />
                </button>
              </ModalHeader>

              <ModalBody>
                <SubmissionDetailsCard>
                  <DetailRow>
                    <span>Status</span>
                    <StatusBadge $status={viewingSubmission.submission?.status || 'Submitted'}>
                      {viewingSubmission.submission?.status || 'Submitted'}
                    </StatusBadge>
                  </DetailRow>

                  <DetailRow>
                    <span>Submitted At</span>
                    <span>
                      {viewingSubmission.submission?.submittedAt 
                        ? new Date(viewingSubmission.submission.submittedAt).toLocaleString()
                        : 'Recorded'}
                    </span>
                  </DetailRow>

                  <DetailRow>
                    <span>Total Marks</span>
                    <span>{viewingSubmission.task.totalMarks || 100}</span>
                  </DetailRow>

                  {viewingSubmission.submission?.marksObtained !== null && viewingSubmission.submission?.marksObtained !== undefined && (
                    <DetailRow>
                      <span>Marks Awarded</span>
                      <span style={{ color: '#10B981', fontWeight: 'bold' }}>
                        {viewingSubmission.submission.marksObtained} / {viewingSubmission.task.totalMarks || 100}
                        {viewingSubmission.submission.grade ? ` (${viewingSubmission.submission.grade})` : ''}
                      </span>
                    </DetailRow>
                  )}
                </SubmissionDetailsCard>

                {viewingSubmission.submission?.feedback && (
                  <FeedbackBox>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                      <FaCommentDots size={12} color="#10B981" /> Instructor Review & Feedback:
                    </div>
                    <div style={{ marginTop: '4px', lineHeight: 1.45 }}>
                      "{viewingSubmission.submission.feedback}"
                    </div>
                  </FeedbackBox>
                )}

                {viewingSubmission.submission?.fileUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>Attached Submission Link / Asset:</label>
                    <a 
                      href={viewingSubmission.submission.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(77, 166, 255, 0.1)',
                        border: '1px solid rgba(77, 166, 255, 0.3)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        color: '#4da6ff',
                        textDecoration: 'none',
                        fontSize: '0.88rem'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                        {viewingSubmission.submission.fileUrl}
                      </span>
                      <FaExternalLinkAlt size={12} />
                    </a>
                  </div>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    No file or URL linked to this submission record.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {viewingSubmission.task.status !== 'Graded' && (
                    <PrimaryBtn 
                      onClick={() => {
                        const targetTask = viewingSubmission.task;
                        setViewingSubmission(null);
                        handleOpenSubmit(targetTask);
                      }}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <FaRedo size={12} /> Update / Re-submit
                    </PrimaryBtn>
                  )}
                  <SecondaryBtn 
                    onClick={() => setViewingSubmission(null)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Close
                  </SecondaryBtn>
                </div>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
};

export default StudentTasks;
