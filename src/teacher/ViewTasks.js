import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { supabase } from '../supabaseClient';
import { 
  FaTimes, FaEdit, FaTrash, FaCheckCircle, 
  FaExclamationCircle, FaExternalLinkAlt, FaStar,
  FaCommentDots, FaAward, FaCopy, FaSave, FaSearch
} from 'react-icons/fa';
import DatePicker from '../components/DatePicker';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Card = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h2`
  color: #fff;
  margin-top: 0;
  margin-bottom: 25px;
  font-size: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  th {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  td {
    color: #ccc;
    font-size: 0.92rem;
    vertical-align: middle;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
`;

const Badge = styled.span`
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  margin-left: 8px;
  background: rgba(123, 31, 46, 0.2);
  color: #ff4d6d;
  border: 1px solid rgba(123, 31, 46, 0.4);
`;

const ActionBtn = styled.button`
  background: rgba(77, 166, 255, 0.1);
  color: #4da6ff;
  border: 1px solid rgba(77, 166, 255, 0.3);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #4da6ff;
    color: #000;
  }

  &.grade {
    background: #7B1F2E;
    border-color: #9c273a;
    color: #fff;
    &:hover { background: #9c273a; }
  }
`;

const IconButton = styled.button`
  background: transparent;
  color: ${props => props.danger ? '#ff4d6d' : '#4da6ff'};
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 6px;
  margin-left: 8px;
  opacity: 0.8;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    font-weight: 600;
  }

  input, select, textarea {
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #0a0a0a;
    color: #fff;
    font-size: 0.92rem;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #7B1F2E;
    }
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }
`;

const SubmitBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;

  &:hover {
    background: #9c273a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
`;

// Modal Styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 26px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  
  h3 { margin: 0; color: #fff; font-size: 1.2rem; }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  &:hover { color: #fff; }
`;

const ModalBody = styled.div`
  padding: 24px 26px;
  overflow-y: auto;
`;

const StatusPill = styled.span`
  padding: 3px 8px;
  border-radius: 50px;
  font-size: 0.74rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: ${props => props.$status === 'Graded' ? 'rgba(16, 185, 129, 0.15)' : props.$danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(55, 138, 221, 0.15)'}; 
  color: ${props => props.$status === 'Graded' ? '#10b981' : props.$danger ? '#ef4444' : '#378ADD'}; 
  border: 1px solid ${props => props.$status === 'Graded' ? 'rgba(16, 185, 129, 0.3)' : props.$danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(55, 138, 221, 0.3)'};
`;

const ModalTabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
`;

const ModalTabBtn = styled.button`
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.25)' : 'rgba(255, 255, 255, 0.04)'};
  color: ${props => props.$active ? '#ff4d6d' : '#888'};
  border: 1px solid ${props => props.$active ? 'rgba(123, 31, 46, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;

  &:hover {
    color: #fff;
    background: rgba(123, 31, 46, 0.15);
  }
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`;

const FeedbackChip = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
  border-radius: 50px;
  padding: 4px 10px;
  font-size: 0.74rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(123, 31, 46, 0.2);
    border-color: #ff4d6d;
    color: #fff;
  }
`;

const PRESET_FEEDBACKS = [
  "🌟 Excellent clean code structure & git commits.",
  "👍 Good implementation, meets core requirements.",
  "⚠️ Please review responsive layout on mobile screens.",
  "💡 Add proper error handling and input validation.",
  "🔄 Resubmission requested to meet specifications."
];

const ViewTasks = () => {
  const { user } = useAuth();
  const { tasks, deleteTask, updateTask, gradeSubmission } = useTasks();
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalTab, setModalTab] = useState('submitted');
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);
  
  // Evaluation Drawer / Modal State
  const [evaluatingSubmission, setEvaluatingSubmission] = useState(null);
  const [evalMarks, setEvalMarks] = useState('');
  const [evalGrade, setEvalGrade] = useState('A');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  // Edit task modal state
  const [editingTask, setEditingTask] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '', category: '', description: '', dueDate: ''
  });

  const teacherName = user?.name || '';
  const myTasks = useMemo(() => {
    return tasks.filter((task) => task.assignedBy === teacherName);
  }, [tasks, teacherName]);

  useEffect(() => {
    if (!selectedTask) return;
    const refreshedTask = tasks.find((task) => task.id === selectedTask.id);
    if (refreshedTask) setSelectedTask(refreshedTask);
  }, [tasks, selectedTask]);

  useEffect(() => {
    if (!selectedTask?.batch) {
      setBatchStudents([]);
      return;
    }
    const fetchEnrolledStudents = async () => {
      setLoadingBatchStudents(true);
      try {
        const { data } = await supabase
          .from('admissions')
          .select('id, name, cnic, phone, email')
          .eq('batch', selectedTask.batch)
          .eq('status', 'Active');
        setBatchStudents(data || []);
      } catch (err) {
        console.error("Error fetching batch students:", err);
      } finally {
        setLoadingBatchStudents(false);
      }
    };
    fetchEnrolledStudents();
  }, [selectedTask]);

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date(new Date().setHours(0,0,0,0));
  };

  const handleDelete = async (task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"? This will also remove all student submissions.`)) {
      try {
        await deleteTask(task.id);
        toast.success("Task deleted.");
      } catch (err) {
        toast.error("Failed to delete task.");
      }
    }
  };

  const openEditModal = (task) => {
    setEditFormData({
      title: task.title,
      category: task.category,
      description: task.description,
      dueDate: task.dueDate
    });
    setEditingTask(task);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateTask(editingTask.id, editFormData);
      toast.success("Task updated successfully!");
      setEditingTask(null);
    } catch (err) {
      toast.error("Failed to update task.");
    }
  };

  // Open Evaluation Modal
  const openEvaluation = (sub) => {
    setEvaluatingSubmission(sub);
    const existingMarks = sub.marksObtained !== null && sub.marksObtained !== undefined ? String(sub.marksObtained) : '';
    setEvalMarks(existingMarks);
    setEvalFeedback(sub.feedback || '');
    
    // Auto-compute or preset grade
    if (sub.grade) {
      setEvalGrade(sub.grade);
    } else if (existingMarks !== '' && selectedTask?.totalMarks) {
      const pct = (Number(existingMarks) / Number(selectedTask.totalMarks)) * 100;
      if (pct >= 90) setEvalGrade('A+');
      else if (pct >= 80) setEvalGrade('A');
      else if (pct >= 70) setEvalGrade('B');
      else if (pct >= 60) setEvalGrade('C');
      else setEvalGrade('F');
    } else {
      setEvalGrade('A');
    }
  };

  // Recalculate grade when marks change
  const handleMarksChange = (val) => {
    setEvalMarks(val);
    if (val !== '' && selectedTask?.totalMarks) {
      const pct = (Number(val) / Number(selectedTask.totalMarks)) * 100;
      if (pct >= 90) setEvalGrade('A+');
      else if (pct >= 80) setEvalGrade('A');
      else if (pct >= 70) setEvalGrade('B');
      else if (pct >= 60) setEvalGrade('C');
      else setEvalGrade('F');
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evaluatingSubmission) return;
    if (evalMarks === '') {
      toast.error("Please enter the marks awarded.");
      return;
    }

    const marksNum = Number(evalMarks);
    const maxMarks = Number(selectedTask?.totalMarks || 100);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }

    setIsGrading(true);
    try {
      await gradeSubmission(
        evaluatingSubmission.id,
        marksNum,
        evalFeedback.trim() || null,
        evalGrade
      );
      toast.success(`Evaluated ${evaluatingSubmission.studentName}: ${marksNum} marks (${evalGrade})`);
      setEvaluatingSubmission(null);
    } catch (err) {
      toast.error(err?.message || "Failed to save grade.");
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <DashboardLayout>
      <Container>
        <Card initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Title>
            <span>Assigned Tasks & Coursework</span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>
              Faculty: <strong style={{ color: '#fff' }}>{teacherName}</strong>
            </span>
          </Title>
          
          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th>Task Info</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Submissions</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <EmptyState>You haven't assigned any tasks yet.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  myTasks.map(task => (
                    <tr key={task.id}>
                      <td>
                        <strong style={{ color: '#fff' }}>{task.title}</strong>
                        <Badge>{task.category}</Badge>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{task.course}</div>
                        <div style={{ color: '#7B1F2E', fontSize: '0.8rem', fontWeight: 'bold' }}>{task.batch}</div>
                      </td>
                      <td style={{ color: isOverdue(task.dueDate) ? '#ff4d6d' : '#ccc' }}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td>
                        <strong>{task.submissions.length}</strong> submitted
                      </td>
                      <td>
                        <ActionBtn onClick={() => setSelectedTask(task)}>
                          View Submissions
                        </ActionBtn>
                        <IconButton onClick={() => openEditModal(task)} title="Edit Task">
                          <FaEdit />
                        </IconButton>
                        <IconButton danger onClick={() => handleDelete(task)} title="Delete Task">
                          <FaTrash />
                        </IconButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </StyledTable>
          </TableWrapper>
        </Card>
      </Container>

      {/* Submissions List Modal */}
      <AnimatePresence>
        {selectedTask && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTask(null)}
          >
            <ModalContent
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <div>
                  <h3>Submissions: {selectedTask.title}</h3>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    Batch: {selectedTask.batch} &bull; Total Marks: {selectedTask.totalMarks || 100}
                  </div>
                </div>
                <CloseBtn onClick={() => setSelectedTask(null)}><FaTimes /></CloseBtn>
              </ModalHeader>
              <ModalBody>
                {(() => {
                  const submittedCnics = new Set((selectedTask.submissions || []).map(s => s.cnic));
                  const nonSubmitters = batchStudents.filter(s => !submittedCnics.has(s.cnic));

                  return (
                    <>
                      <ModalTabs>
                        <ModalTabBtn 
                          $active={modalTab === 'submitted'} 
                          onClick={() => setModalTab('submitted')}
                        >
                          <FaCheckCircle style={{ marginRight: '6px' }} />
                          Submitted ({selectedTask.submissions.length})
                        </ModalTabBtn>
                        <ModalTabBtn 
                          $active={modalTab === 'pending'} 
                          onClick={() => setModalTab('pending')}
                        >
                          <FaExclamationCircle style={{ marginRight: '6px' }} />
                          Not Submitted ({nonSubmitters.length})
                        </ModalTabBtn>
                      </ModalTabs>

                      {modalTab === 'submitted' ? (
                        selectedTask.submissions.length === 0 ? (
                          <EmptyState>No submissions yet.</EmptyState>
                        ) : (
                          <TableWrapper>
                            <StyledTable>
                              <thead>
                                <tr>
                                  <th>Student</th>
                                  <th>Submitted At</th>
                                  <th>Work Link / File</th>
                                  <th>Marks & Grade</th>
                                  <th>Evaluation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedTask.submissions.map((sub, i) => (
                                  <tr key={i}>
                                    <td>
                                      <div style={{ color: '#fff', fontWeight: '600' }}>{sub.studentName}</div>
                                      <small style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{sub.cnic}</small>
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                      {new Date(sub.submittedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td>
                                      {sub.fileUrl ? (
                                        <a
                                          href={sub.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color: '#4da6ff',
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontSize: '0.85rem'
                                          }}
                                        >
                                          <FaExternalLinkAlt size={11} /> Open Submission
                                        </a>
                                      ) : (
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No link</span>
                                      )}
                                    </td>
                                    <td>
                                      {sub.status === 'Graded' && sub.marksObtained !== null && sub.marksObtained !== undefined ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <strong style={{ color: '#10B981', fontSize: '1rem' }}>
                                            {sub.marksObtained} / {selectedTask.totalMarks || 100}
                                          </strong>
                                          {sub.grade && (
                                            <StatusPill $status="Graded">{sub.grade}</StatusPill>
                                          )}
                                        </div>
                                      ) : (
                                        <StatusPill $status="Submitted">Pending Grade</StatusPill>
                                      )}
                                    </td>
                                    <td>
                                      <ActionBtn 
                                        className="grade"
                                        onClick={() => openEvaluation(sub)}
                                      >
                                        <FaStar size={11} /> {sub.status === 'Graded' ? 'Edit Grade' : 'Grade & Review'}
                                      </ActionBtn>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </StyledTable>
                          </TableWrapper>
                        )
                      ) : (
                        nonSubmitters.length === 0 ? (
                          <EmptyState style={{ color: '#4caf50' }}>
                            All active students in {selectedTask.batch} have submitted! 🎉
                          </EmptyState>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                              <ActionBtn 
                                onClick={() => {
                                  const text = `Pending Submissions for "${selectedTask.title}" (${selectedTask.batch}):\n` + 
                                    nonSubmitters.map(s => `- ${s.name} (${s.phone || s.email || s.cnic})`).join('\n');
                                  navigator.clipboard.writeText(text);
                                  toast.success("Pending students list copied to clipboard!");
                                }}
                              >
                                <FaCopy /> Copy Missing List
                              </ActionBtn>
                            </div>
                            <TableWrapper>
                              <StyledTable>
                                <thead>
                                  <tr>
                                    <th>Student Name</th>
                                    <th>CNIC</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {nonSubmitters.map((s, i) => (
                                    <tr key={i}>
                                      <td style={{ color: '#fff', fontWeight: '500' }}>{s.name}</td>
                                      <td>{s.cnic}</td>
                                      <td>{s.phone || '—'}</td>
                                      <td style={{ fontSize: '0.85rem' }}>{s.email || '—'}</td>
                                      <td>
                                        <StatusPill $danger={isOverdue(selectedTask.dueDate)}>
                                          {isOverdue(selectedTask.dueDate) ? 'Overdue' : 'Pending'}
                                        </StatusPill>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </StyledTable>
                            </TableWrapper>
                          </>
                        )
                      )}
                    </>
                  );
                })()}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Grade & Review Evaluation Drawer / Modal */}
      <AnimatePresence>
        {evaluatingSubmission && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEvaluatingSubmission(null)}
          >
            <ModalContent
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '620px' }}
            >
              <ModalHeader>
                <div>
                  <h3 style={{ margin: 0 }}>Grade & Review Submission</h3>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {evaluatingSubmission.studentName} &bull; {selectedTask?.title}
                  </div>
                </div>
                <CloseBtn onClick={() => setEvaluatingSubmission(null)}><FaTimes /></CloseBtn>
              </ModalHeader>

              <ModalBody>
                <form onSubmit={handleSaveEvaluation}>
                  {/* Submission Link Preview */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                      Student's Submission Link / File Archive:
                    </div>
                    {evaluatingSubmission.fileUrl ? (
                      <a
                        href={evaluatingSubmission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#4da6ff',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontWeight: '500',
                          fontSize: '0.9rem'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '480px' }}>
                          {evaluatingSubmission.fileUrl}
                        </span>
                        <FaExternalLinkAlt size={12} />
                      </a>
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                        No external URL or file attached.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                    <FormGroup>
                      <label>Marks Awarded (Max: {selectedTask?.totalMarks || 100}) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={selectedTask?.totalMarks || 100}
                        value={evalMarks}
                        onChange={e => handleMarksChange(e.target.value)}
                        placeholder="e.g. 85"
                      />
                    </FormGroup>

                    <FormGroup>
                      <label>Letter Grade</label>
                      <select
                        value={evalGrade}
                        onChange={e => setEvalGrade(e.target.value)}
                      >
                        <option value="A+">A+ (Distinction &bull; 90%+)</option>
                        <option value="A">A (Excellent &bull; 80%+)</option>
                        <option value="B+">B+ (Very Good &bull; 75%+)</option>
                        <option value="B">B (Good &bull; 70%+)</option>
                        <option value="C">C (Satisfactory &bull; 60%+)</option>
                        <option value="F">F (Needs Revision &bull; &lt;60%)</option>
                      </select>
                    </FormGroup>
                  </div>

                  <FormGroup style={{ marginTop: '12px' }}>
                    <label>Instructor Review & Feedback for Student</label>
                    <textarea
                      placeholder="Write constructive review feedback, suggestions for refactoring, or commendations..."
                      value={evalFeedback}
                      onChange={e => setEvalFeedback(e.target.value)}
                    />
                    
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      Quick Feedback Presets:
                    </div>
                    <ChipContainer>
                      {PRESET_FEEDBACKS.map((chip, idx) => (
                        <FeedbackChip
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEvalFeedback(prev => prev ? `${prev} ${chip}` : chip);
                          }}
                        >
                          {chip}
                        </FeedbackChip>
                      ))}
                    </ChipContainer>
                  </FormGroup>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                    <SubmitBtn type="submit" disabled={isGrading} style={{ flex: 1 }}>
                      <FaSave /> {isGrading ? 'Saving Evaluation...' : 'Save Grade & Notify Student'}
                    </SubmitBtn>
                    <ActionBtn 
                      type="button"
                      onClick={() => setEvaluatingSubmission(null)}
                      style={{ padding: '12px 18px', marginTop: '10px' }}
                    >
                      Cancel
                    </ActionBtn>
                  </div>
                </form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingTask(null)}
          >
            <ModalContent
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '600px' }}
            >
              <ModalHeader>
                <h3>Edit Task: {editingTask.title}</h3>
                <CloseBtn onClick={() => setEditingTask(null)}><FaTimes /></CloseBtn>
              </ModalHeader>
              <ModalBody>
                <Form onSubmit={handleEditSubmit}>
                  <FormGroup>
                    <label>Task Title</label>
                    <input 
                      type="text" 
                      required 
                      value={editFormData.title}
                      onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                    />
                  </FormGroup>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <FormGroup style={{ flex: 1 }}>
                      <label>Task Category</label>
                      <select 
                        value={editFormData.category}
                        onChange={e => setEditFormData({...editFormData, category: e.target.value})}
                      >
                        <option value="Assignment">Assignment</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Project">Project</option>
                        <option value="Practice">Practice</option>
                        <option value="Other">Other</option>
                      </select>
                    </FormGroup>
                    <FormGroup style={{ flex: 1 }}>
                      <label>Due Date</label>
                      <DatePicker 
                        required 
                        value={editFormData.dueDate}
                        onChange={e => setEditFormData({...editFormData, dueDate: e.target.value})}
                        aria-label="Due Date"
                      />
                    </FormGroup>
                  </div>

                  <FormGroup>
                    <label>Description</label>
                    <textarea 
                      required 
                      value={editFormData.description}
                      onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                    />
                  </FormGroup>

                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                    Course and Batch cohorts remain fixed to preserve student submission history.
                  </div>

                  <SubmitBtn type="submit">Save Changes</SubmitBtn>
                </Form>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
};

export default ViewTasks;
