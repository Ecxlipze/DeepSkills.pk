import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { 
  FaHome, FaTasks, FaExclamationCircle, 
  FaWallet, FaUserFriends, FaChartLine, FaCertificate, 
  FaGraduationCap, FaUserPlus, FaComments, FaChevronDown, FaChevronUp, FaLock
} from 'react-icons/fa';

// Nav items handled by DashboardLayout

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 50px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatValue = styled.div`
  color: #fff;
  font-size: 2rem;
  font-weight: bold;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  margin-top: 15px;
  overflow: hidden;
`;

const ProgressBarFill = styled(motion.div)`
  height: 100%;
  background: #4caf50;
  border-radius: 4px;
`;

const Card = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  margin-bottom: 30px;
`;

const Title = styled.h2`
  color: #fff;
  margin-top: 0;
  margin-bottom: 25px;
  font-size: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 15px;
`;

// --- Roadmap Styles ---
const RoadmapContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 40px 0;
  overflow-x: hidden;
`;

const RowWrapper = styled.div`
  display: flex;
  flex-direction: ${props => props.reverse ? 'row-reverse' : 'row'};
  align-items: center;
  width: 100%;
  max-width: 800px;
  position: relative;
`;

// The road lines between dots
const RoadLine = styled.div`
  flex: 1;
  height: 12px;
  background: ${props => props.completed ? '#2e7d32' : '#333'};
  transition: background 0.5s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 5px;
    left: 0;
    right: 0;
    height: 2px;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 10px,
      rgba(255,255,255,0.5) 10px,
      rgba(255,255,255,0.5) 20px
    );
  }
`;

// The U-Turn Connectors
const UTurn = styled.div`
  width: 60px;
  height: 100px; // Spans two rows roughly
  position: absolute;
  top: 50%;
  ${props => props.right ? 'right: -30px;' : 'left: -30px;'}
  border: 12px solid ${props => props.completed ? '#2e7d32' : '#333'};
  border-top: none;
  border-bottom: none;
  border-${props => props.right ? 'left' : 'right'}: none;
  border-radius: ${props => props.right ? '0 50px 50px 0' : '50px 0 0 50px'};
  z-index: 1;
  transition: border-color 0.5s ease;
  
  /* Dashed line inside U-turn */
  &::before {
    content: '';
    position: absolute;
    top: -6px; bottom: -6px; ${props => props.right ? 'right: -6px; left: 0;' : 'left: -6px; right: 0;'}
    border: 2px dashed rgba(255,255,255,0.5);
    border-${props => props.right ? 'left' : 'right'}: none;
    border-radius: ${props => props.right ? '0 50px 50px 0' : '50px 0 0 50px'};
  }
`;

const TaskDotWrapper = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  padding: 10px 0; // Better hit area
  
  &:hover .tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

const TaskDot = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.completed ? '#4caf50' : '#444'};
  border: 3px solid #111;
  box-shadow: 0 0 0 2px ${props => props.completed ? '#4caf50' : '#444'};
  transition: all 0.3s ease;
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const Car = styled(motion.div)`
  position: absolute;
  top: -35px;
  font-size: 28px;
  animation: ${bounce} 1s ease-in-out infinite;
  z-index: 10;
  pointer-events: none;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  background: #fff;
  color: #000;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 20;
  pointer-events: none;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: #fff transparent transparent transparent;
  }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(77, 166, 255, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(77, 166, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(77, 166, 255, 0); }
`;

const CheckpointMarker = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-size: 1.2rem;
  z-index: 5;
  background: ${props => props.state === 'done' ? '#4caf50' : props.state === 'active' ? '#4da6ff' : '#444'};
  border: 4px solid #111;
  position: relative;

  ${props => props.state === 'active' && css`
    animation: ${pulse} 2s infinite;
  `}

  .trophy {
    position: absolute;
    top: -25px;
    font-size: 1.5rem;
  }
  
  .lock {
    font-size: 1rem;
    opacity: 0.6;
  }
`;

const CheckpointLabel = styled.div`
  position: absolute;
  top: 50px;
  white-space: nowrap;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.state === 'done' ? '#4caf50' : props.state === 'active' ? '#4da6ff' : '#666'};
`;

// --- Table Styles ---
const ExpandBtn = styled.button`
  background: transparent;
  color: #4da6ff;
  border: 1px solid #4da6ff;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  margin-top: 20px;
  transition: all 0.2s ease;

  &:hover {
    background: #4da6ff;
    color: #000;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  th {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
  
  td {
    color: #ccc;
    font-size: 0.95rem;
  }
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  background: ${props => props.$status === 'Submitted' ? 'rgba(76, 175, 80, 0.2)' : props.$status === 'Pending' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$status === 'Submitted' ? '#4caf50' : props.$status === 'Pending' ? '#ff9800' : '#999'};
`;

// --- Component ---
const StudentProgress = () => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const [showTable, setShowTable] = useState(false);

  const tasksPerCheckpoint = 5;

  const studentCnic = user?.cnic || "";
  const studentCourse = user?.assigned_course || user?.course || "";
  const studentBatch = user?.batch || "";

  // Filter actual assigned tasks for this student
  const myTasks = tasks.filter(t => t.course === studentCourse && t.batch === studentBatch);
  const totalTasks = myTasks.length;
  const totalCheckpoints = Math.max(1, Math.ceil(totalTasks / tasksPerCheckpoint));
  
  const roadmapTasks = myTasks.map((task, index) => {
    const isSubmitted = task.submissions?.some(s => s.cnic === studentCnic);
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
    return {
      ...task,
      taskNumber: index + 1,
      status: isSubmitted ? 'Submitted' : (isOverdue ? 'Overdue' : 'Pending')
    };
  });

  const submittedCount = roadmapTasks.filter(t => t.status === 'Submitted').length;
  const progressPercent = totalTasks > 0 ? Math.round((submittedCount / totalTasks) * 100) : 0;
  
  // Calculate current checkpoint (1-indexed)
  // If submittedCount is 0, current checkpoint is 1
  // If submittedCount is 5, current checkpoint is 2
  const currentCheckpointIndex = totalTasks > 0
    ? Math.min(Math.floor(submittedCount / tasksPerCheckpoint) + 1, totalCheckpoints)
    : 0;

  const getCheckpointState = (cpIndex) => {
    if (totalTasks === 0) return "locked";
    const tasksNeeded = Math.min(cpIndex * tasksPerCheckpoint, totalTasks);
    if (submittedCount >= tasksNeeded) return "done";
    if (submittedCount >= (cpIndex - 1) * tasksPerCheckpoint) return "active";
    return "locked";
  };

  // Generate rows for the snake
  const rows = [];
  for (let i = 0; i < totalCheckpoints; i++) {
    const startIndex = i * tasksPerCheckpoint;
    const rowTasks = roadmapTasks.slice(startIndex, startIndex + tasksPerCheckpoint);
    rows.push({
      index: i + 1,
      tasks: rowTasks,
      isReverse: i % 2 !== 0,
      state: getCheckpointState(i + 1)
    });
  }

  return (
    <DashboardLayout>
      <Container>
        <StatsGrid>
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <StatLabel>Tasks Completed</StatLabel>
            <StatValue>{submittedCount} / {totalTasks}</StatValue>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '5px' }}>tasks done</div>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatLabel>Current Checkpoint</StatLabel>
            <StatValue>{currentCheckpointIndex} / {totalCheckpoints}</StatValue>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '5px' }}>milestone reached</div>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatLabel>Overall Progress</StatLabel>
            <StatValue>{progressPercent}%</StatValue>
            <ProgressBarContainer>
              <ProgressBarFill 
                initial={{ width: 0 }} 
                animate={{ width: `${progressPercent}%` }} 
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              />
            </ProgressBarContainer>
          </StatCard>
        </StatsGrid>

        <Card initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Title>Your Learning Journey</Title>
          
          <RoadmapContainer>
            {totalTasks === 0 ? (
              <div style={{ color: '#666', padding: '30px', textAlign: 'center' }}>
                No tasks have been assigned to your course and batch yet.
              </div>
            ) : rows.map((row, rowIndex) => {
              const isLastRow = rowIndex === rows.length - 1;
              const hasUTurn = !isLastRow;
              
              return (
                <RowWrapper key={row.index} reverse={row.isReverse} style={{ marginBottom: hasUTurn ? '50px' : '0' }}>
                  
                  {/* Start padding for normal row, or end padding for reverse row to leave room for checkpoint */}
                  <div style={{ width: '40px' }}></div>

                  {row.tasks.map((task, taskIndex) => {
                    const isCompleted = task.status === 'Submitted';
                    const globalTaskIndex = (row.index - 1) * tasksPerCheckpoint + taskIndex;
                    const isCarPosition = globalTaskIndex === submittedCount && submittedCount < totalTasks;

                    return (
                      <React.Fragment key={task.id}>
                        <TaskDotWrapper>
                          <TaskDot completed={isCompleted} />
                          {isCarPosition && (
                            <Car>🚗</Car>
                          )}
                          <Tooltip className="tooltip">
                            {task.taskNumber}. {task.title}<br/>
                            <span style={{ color: isCompleted ? '#2e7d32' : '#666' }}>{task.status}</span>
                          </Tooltip>
                        </TaskDotWrapper>
                        
                        {/* Line to next task OR line to checkpoint */}
                        <RoadLine completed={isCompleted} />
                      </React.Fragment>
                    );
                  })}

                  {/* Checkpoint at the end of the row */}
                  <CheckpointMarker state={row.state}>
                    {row.state === 'done' && <div className="trophy">🏆</div>}
                    {row.state === 'done' ? '✓' : row.state === 'active' ? row.index : <FaLock className="lock" />}
                    <CheckpointLabel state={row.state}>
                      {row.state === 'done' ? `Checkpoint ${row.index} Done` : 
                       row.state === 'active' ? `Checkpoint ${row.index} In Progress` : 
                       `Locked`}
                    </CheckpointLabel>
                  </CheckpointMarker>

                  {/* U-Turn Connector (only if not last row) */}
                  {hasUTurn && (
                    <UTurn 
                      right={!row.isReverse} 
                      completed={row.state === 'done'}
                    />
                  )}

                  <div style={{ width: '40px' }}></div>
                </RowWrapper>
              );
            })}
          </RoadmapContainer>
        </Card>

        <Card initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Title style={{ border: 'none', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Task Breakdown
            <ExpandBtn onClick={() => setShowTable(!showTable)}>
              {showTable ? <FaChevronUp /> : <FaChevronDown />}
              {showTable ? 'Hide' : 'View Details'}
            </ExpandBtn>
          </Title>
          
          <AnimatePresence>
            {showTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <StyledTable>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Task Title</th>
                      <th>Category</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roadmapTasks.map(t => (
                      <tr key={t.id}>
                        <td>{t.taskNumber}</td>
                        <td style={{ color: '#fff' }}>{t.title}</td>
                        <td>{t.category}</td>
                        <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td>
                        <td><StatusBadge $status={t.status}>{t.status}</StatusBadge></td>
                      </tr>
                    ))}
                    {roadmapTasks.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#666', padding: '30px' }}>
                          No assigned tasks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </StyledTable>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

      </Container>
    </DashboardLayout>
  );
};

export default StudentProgress;
