import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { supabase } from '../supabaseClient';
import { FaTimes, FaEdit, FaTrash, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const Container = styled.div`
  max-width: 1000px;
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
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 15px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  th {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  td {
    color: #ccc;
    font-size: 0.95rem;
    vertical-align: middle;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
`;

const Badge = styled.span`
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 10px;
  background: rgba(123, 31, 46, 0.2);
  color: #ff4d6d;
  border: 1px solid rgba(123, 31, 46, 0.4);
`;

const ActionBtn = styled.button`
  background: transparent;
  color: #4da6ff;
  border: 1px solid #4da6ff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;

  &:hover {
    background: #4da6ff;
    color: #000;
  }
`;

const IconButton = styled.button`
  background: transparent;
  color: ${props => props.danger ? '#ff4d6d' : '#4da6ff'};
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 5px;
  margin-left: 10px;
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
  gap: 8px;

  label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    font-weight: 500;
  }

  input, select, textarea {
    padding: 12px 15px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: #0a0a0a;
    color: #fff;
    font-size: 1rem;
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
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;

  &:hover {
    background: #9c273a;
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
  max-width: 800px;
  max-height: 90vh;
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

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 1.2rem;
  cursor: pointer;
  &:hover { color: #fff; }
`;

const ModalBody = styled.div`
  padding: 25px;
  overflow-y: auto;
`;

const StatusPill = styled.span`
  padding: 4px 8px;
  border-radius: 50px;
  font-size: 0.75rem;
  background: ${props => props.$danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(46, 125, 50, 0.15)'}; 
  color: ${props => props.$danger ? '#ef4444' : '#4caf50'}; 
  border: 1px solid ${props => props.$danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(46, 125, 50, 0.3)'};
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

const ViewTasks = () => {
  const { user } = useAuth();
  const { tasks, deleteTask, updateTask, gradeSubmission } = useTasks();
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalTab, setModalTab] = useState('submitted');
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);
  const [gradingMarks, setGradingMarks] = useState({}); // { submissionId: value }
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
    if (window.confirm(`Are you sure you want to delete "${task.title}"? This will also delete all student submissions for this task.`)) {
      await deleteTask(task.id);
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
    await updateTask(editingTask.id, editFormData);
    setEditingTask(null);
  };

  return (
    <DashboardLayout>
      <Container>
        <Card initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Title>Assigned Tasks</Title>
          
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
                        <ActionBtn onClick={() => setSelectedTask(task)}>View Submissions</ActionBtn>
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
                <h3>Submissions: {selectedTask.title}</h3>
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
                                  <th>Student Name</th>
                                  <th>CNIC</th>
                                  <th>Submitted At</th>
                                  <th>File</th>
                                  <th>Status</th>
                                  {['Assignment', 'Quiz', 'Project'].includes(selectedTask.category) && <th>Marks ({selectedTask.totalMarks})</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedTask.submissions.map((sub, i) => (
                                  <tr key={i}>
                                    <td style={{ color: '#fff', fontWeight: '500' }}>{sub.studentName}</td>
                                    <td>{sub.cnic}</td>
                                    <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                                    <td>
                                      {sub.fileUrl ? (
                                        <span 
                                          onClick={() => {
                                            if (sub.fileUrl && sub.fileUrl.startsWith('http')) {
                                              window.open(sub.fileUrl, '_blank');
                                            } else {
                                              alert(`File preview not available for older submissions.`);
                                            }
                                          }}
                                          style={{ color: '#4da6ff', textDecoration: 'underline', cursor: 'pointer' }}
                                        >
                                          Preview File
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td><StatusPill>{sub.status}</StatusPill></td>
                                    {['Assignment', 'Quiz', 'Project'].includes(selectedTask.category) && (
                                      <td>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                          <input
                                            type="number"
                                            placeholder="Marks"
                                            defaultValue={sub.marksObtained}
                                            onChange={(e) => setGradingMarks({...gradingMarks, [sub.id]: e.target.value})}
                                            style={{ width: '60px', padding: '5px', borderRadius: '4px', background: '#000', border: '1px solid #333', color: '#fff' }}
                                          />
                                          <button
                                            onClick={() => gradeSubmission(sub.id, gradingMarks[sub.id] || sub.marksObtained)}
                                            style={{ padding: '5px 10px', background: '#7B1F2E', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </td>
                                    )}
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
                                    <td>{s.phone}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{s.email}</td>
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
                        )
                      )}
                    </>
                  );
                })()}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}

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
                      <input 
                        type="date" 
                        required 
                        value={editFormData.dueDate}
                        onChange={e => setEditFormData({...editFormData, dueDate: e.target.value})}
                      />
                    </FormGroup>
                  </div>

                  <FormGroup>
                    <label>Description</label>
                    <textarea 
                      required 
                      value={editFormData.description}
                      onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                    ></textarea>
                  </FormGroup>

                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Note: Course and Batch cannot be edited once assigned. If you need to change them, please delete and reassign the task.
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
