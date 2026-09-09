import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaHome, FaTasks, FaChartLine, FaCertificate,
  FaExclamationCircle, FaUserPlus, FaComments,
  FaWallet, FaUserFriends, FaGraduationCap, FaCheckCircle,
  FaCalendarCheck, FaClock, FaArrowRight, FaAward, FaBookOpen,
  FaChalkboardTeacher
} from 'react-icons/fa';
import DashboardLayout from './components/DashboardLayout';
import { useAuth } from './context/AuthContext';
import { useTasks } from './context/TasksContext';
import { supabase } from './supabaseClient';
import { portalTheme } from './components/portal/PortalTheme';
import { PortalCard } from './components/portal/PortalCard';
import { MetricCard } from './components/portal/MetricCard';
import { StatusPill } from './components/portal/StatusPill';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1280px;
  margin: 0 auto;
`;

// Hero Welcome Card
const WelcomeBanner = styled(PortalCard)`
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.22) 0%, rgba(17, 19, 26, 0.85) 60%, rgba(17, 19, 26, 0.95) 100%);
  border: 1px solid rgba(123, 31, 46, 0.35);
  box-shadow: ${portalTheme.shadows.glow}, ${portalTheme.shadows.card};
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 28px 32px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 20px;
  }
`;

const StudentAvatar = styled.div`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: ${portalTheme.colors.primaryGradient};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 0 25px rgba(123, 31, 46, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;

  @media (max-width: 900px) {
    margin: 0 auto;
  }
`;

const StudentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  .greeting {
    font-size: 0.85rem;
    color: #ff8a99;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .name {
    font-size: clamp(1.5rem, 2.2vw, 2rem);
    font-weight: 800;
    color: #fff;
    margin: 0;
    line-height: 1.2;
  }

  .meta-chips {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 4px;

    @media (max-width: 900px) {
      justify-content: center;
    }
  }

  .meta-item {
    font-size: 0.85rem;
    color: ${portalTheme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 6px;

    strong {
      color: #fff;
      font-weight: 600;
    }
  }
`;

const BannerActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 900px) {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const QuickActionBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: ${portalTheme.transitions.default};
  white-space: nowrap;

  ${props => props.$primary ? `
    background: ${portalTheme.colors.primaryGradient};
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 14px rgba(123, 31, 46, 0.4);

    &:hover {
      box-shadow: 0 6px 20px rgba(123, 31, 46, 0.6);
      transform: translateY(-2px);
    }
  ` : `
    background: rgba(255, 255, 255, 0.05);
    color: ${portalTheme.colors.textSecondary};
    border: 1px solid ${portalTheme.colors.borderSubtle};

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  `}
`;

// Alumni Banner
const AlumniNotice = styled(PortalCard)`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(17, 19, 26, 0.8) 100%);
  border-color: rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px 24px;

  .text {
    h4 {
      font-size: 1.1rem;
      color: #fff;
      margin: 0 0 4px;
    }
    p {
      font-size: 0.88rem;
      color: ${portalTheme.colors.textSecondary};
      margin: 0;
    }
  }

  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

// Metrics Grid
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
`;

// Main Dashboard 2-Column Grid
const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;

    .icon {
      color: ${portalTheme.colors.primary};
      font-size: 1rem;
    }
  }

  a {
    font-size: 0.82rem;
    color: #ff8a99;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: ${portalTheme.transitions.default};

    &:hover {
      color: #fff;
      transform: translateX(2px);
    }
  }
`;

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TaskItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.md};
  gap: 16px;
  transition: ${portalTheme.transitions.default};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(123, 31, 46, 0.3);
    transform: translateX(4px);
  }

  .left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;

    .task-icon {
      width: 36px;
      height: 36px;
      border-radius: ${portalTheme.radii.sm};
      background: ${portalTheme.colors.primaryLight};
      color: #ff8a99;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      .title {
        font-size: 0.92rem;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .meta {
        font-size: 0.78rem;
        color: ${portalTheme.colors.textMuted};
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  }

  .right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
`;

const EmptyNotice = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: ${portalTheme.colors.textMuted};
  font-size: 0.9rem;
`;

const QuickToolsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const QuickToolCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.md};
  text-decoration: none;
  transition: ${portalTheme.transitions.default};

  .tool-top {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .icon-box {
      width: 36px;
      height: 36px;
      border-radius: ${portalTheme.radii.sm};
      background: ${props => `${props.$color || portalTheme.colors.primary}18`};
      color: ${props => props.$color || '#ff8a99'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .arrow {
      color: ${portalTheme.colors.textDim};
      font-size: 0.8rem;
      transition: ${portalTheme.transitions.default};
    }
  }

  .title {
    font-size: 0.88rem;
    font-weight: 600;
    color: #fff;
  }

  .desc {
    font-size: 0.75rem;
    color: ${portalTheme.colors.textMuted};
    line-height: 1.4;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: ${props => `${props.$color || portalTheme.colors.primary}40`};
    transform: translateY(-2px);

    .arrow {
      color: #fff;
      transform: translateX(3px);
    }
  }
`;

export const StudentDashboard = () => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    const fetchLiveStats = async () => {
      if (!user?.cnic) return;
      
      try {
        const { data: admissionRows, error: admError } = await supabase
          .from('admissions')
          .select('*')
          .eq('cnic', user.cnic)
          .in('status', ['Active', 'Graduated'])
          .order('submitted_at', { ascending: false })
          .limit(1);

        if (admError) throw admError;
        const admission = admissionRows?.[0];
        if (!admission) return;

        let batchInfo = null;
        let instructorName = null;
        if (admission.batch) {
          const { data: bData } = await supabase
            .from('batches')
            .select('id, time_shift, timing_label, completed_at, status')
            .eq('batch_name', admission.batch)
            .eq('course', admission.course)
            .order('created_at', { ascending: false });
          const batchRows = bData || [];
          batchInfo = batchRows.find((batch) =>
            admission.batch_timing && [batch.time_shift, batch.timing_label].includes(admission.batch_timing)
          ) || batchRows[0] || null;

          if (batchInfo?.id) {
            const { data: tbData } = await supabase
              .from('teacher_batches')
              .select('role, teachers(name, specialization)')
              .eq('batch_id', batchInfo.id);
            
            if (tbData && tbData.length > 0) {
              const mainTeacher = tbData.find(tb => tb.role === 'Main') || tbData[0];
              instructorName = mainTeacher?.teachers?.name || null;
            }
          }
        }

        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', admission.id);

        const totalClasses = attendance?.length || 0;
        const attended = attendance?.filter(r => r.status === 'present' || r.status === 'late').length || 0;

        setStudentData({
          ...admission,
          timing: batchInfo?.time_shift || admission.batch_timing || "Timing not assigned",
          batchCompletedAt: batchInfo?.completed_at,
          instructor: instructorName,
          totalClasses,
          attended
        });
      } catch (err) {
        console.error("Error syncing student dashboard:", err);
      }
    };

    fetchLiveStats();
  }, [user]);

  const student = {
    name: studentData?.name || user?.name || "Student",
    cnic: studentData?.cnic || user?.cnic || "---",
    course: studentData?.course || "Course not assigned",
    batch: studentData?.batch || "Batch not assigned",
    timing: studentData?.timing || "---",
    instructor: studentData?.instructor || null,
    status: studentData?.status || user?.status || 'Active',
    graduatedAt: studentData?.graduated_at || studentData?.batchCompletedAt,
    totalClasses: studentData?.totalClasses || 0,
    attended: studentData?.attended || 0,
  };
  const isGraduated = student.status === 'Graduated';

  const myTasks = tasks.filter(t => t.course === student.course && t.batch === student.batch);
  const submittedTasks = myTasks.filter(task => task.submissions?.some(sub => sub.cnic === student.cnic));
  const assignmentCompletion = myTasks.length > 0 ? Math.round((submittedTasks.length / myTasks.length) * 100) : 0;

  const attendancePercent = student.totalClasses > 0 
    ? Number(((student.attended / student.totalClasses) * 100).toFixed(1)) 
    : 0;

  const courseCompletion = myTasks.length > 0 || student.totalClasses > 0
    ? Math.round((assignmentCompletion + attendancePercent) / 2)
    : 0;

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout>
      <Container>

        {/* 1. Hero Welcome Banner */}
        <WelcomeBanner
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <StudentAvatar>{getInitials(student.name)}</StudentAvatar>
          
          <StudentInfo>
            <span className="greeting">{getGreeting()},</span>
            <h2 className="name">{student.name}</h2>
            <div className="meta-chips">
              <StatusPill status={isGraduated ? 'Graduated' : 'Active'} />
              <div className="meta-item">
                <FaBookOpen />
                <strong>{student.course}</strong>
              </div>
              <div className="meta-item">
                <FaClock />
                <span>{student.batch} — {student.timing}</span>
              </div>
              {student.instructor && (
                <div className="meta-item">
                  <FaChalkboardTeacher />
                  <span>Instructor: <strong>{student.instructor}</strong></span>
                </div>
              )}
            </div>
          </StudentInfo>

          <BannerActions>
            <QuickActionBtn to="/student/tasks" $primary>
              <FaTasks /> View Tasks
            </QuickActionBtn>
            <QuickActionBtn to="/student/group-chat">
              <FaComments /> Batch Chat
            </QuickActionBtn>
          </BannerActions>
        </WelcomeBanner>

        {/* Alumni Banner if Graduated */}
        {isGraduated && (
          <AlumniNotice>
            <div className="text">
              <h4>🎓 Congratulations on Graduating!</h4>
              <p>Your batch is complete. You can download your official certificate and view academic records.</p>
            </div>
            <div className="actions">
              <QuickActionBtn to="/student/certificate" $primary>
                <FaCertificate /> Download Certificate
              </QuickActionBtn>
              <QuickActionBtn to="/student/new-enrollment">
                <FaUserPlus /> Enroll in Next Course
              </QuickActionBtn>
            </div>
          </AlumniNotice>
        )}

        {/* 2. Key Metrics Grid */}
        <MetricsGrid>
          <MetricCard
            icon={<FaCalendarCheck />}
            label="Class Attendance"
            value={`${attendancePercent}%`}
            badgeText={`${student.attended}/${student.totalClasses} Days`}
            badgeType={attendancePercent >= 75 ? 'success' : 'warning'}
            progress={attendancePercent}
            accentColor={attendancePercent >= 75 ? portalTheme.colors.success : portalTheme.colors.warning}
          />

          <MetricCard
            icon={<FaTasks />}
            label="Assignments Submitted"
            value={`${submittedTasks.length}/${myTasks.length}`}
            badgeText={`${assignmentCompletion}% Done`}
            badgeType={assignmentCompletion >= 70 ? 'success' : 'primary'}
            progress={assignmentCompletion}
            accentColor="#ff8a99"
          />

          <MetricCard
            icon={<FaChartLine />}
            label="Course Completion"
            value={`${courseCompletion}%`}
            badgeText={isGraduated ? 'Complete' : 'In Progress'}
            badgeType="info"
            progress={courseCompletion}
            accentColor={portalTheme.colors.info}
          />

          <MetricCard
            icon={<FaGraduationCap />}
            label="Batch & Schedule"
            value={student.batch || 'Batch 1'}
            badgeText={student.status}
            badgeType="default"
            accentColor={portalTheme.colors.purple}
          />
        </MetricsGrid>

        {/* 3. Main 2-Column Content */}
        <MainGrid>
          
          {/* Left: Active Tasks */}
          <PortalCard>
            <SectionHeader>
              <h3>
                <span className="icon"><FaTasks /></span>
                Recent Tasks & Assignments
              </h3>
              <Link to="/student/tasks">
                View All ({myTasks.length}) <FaArrowRight size={10} />
              </Link>
            </SectionHeader>

            {myTasks.length === 0 ? (
              <EmptyNotice>No active tasks assigned to your batch yet.</EmptyNotice>
            ) : (
              <TasksList>
                {myTasks.slice(0, 4).map((task, idx) => {
                  const hasSubmitted = task.submissions?.some(sub => sub.cnic === student.cnic);
                  return (
                    <TaskItem key={idx}>
                      <div className="left">
                        <div className="task-icon">
                          <FaTasks />
                        </div>
                        <div className="details">
                          <span className="title">{task.title}</span>
                          <span className="meta">
                            <span>Deadline: {task.dueDate || 'No deadline'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="right">
                        <StatusPill status={hasSubmitted ? 'Submitted' : 'Pending'} />
                      </div>
                    </TaskItem>
                  );
                })}
              </TasksList>
            )}
          </PortalCard>

          {/* Right: Quick Tools & Academics */}
          <PortalCard>
            <SectionHeader>
              <h3>
                <span className="icon"><FaAward /></span>
                Academic Tools
              </h3>
            </SectionHeader>

            <QuickToolsGrid>
              <QuickToolCard to="/student/results/midterm" $color="#3b82f6">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaGraduationCap />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Exam Results</span>
                <span className="desc">Mid-term & final term grades</span>
              </QuickToolCard>

              <QuickToolCard to="/student/certificate" $color="#8b5cf6">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaCertificate />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Certificates</span>
                <span className="desc">Official verified credentials</span>
              </QuickToolCard>

              <QuickToolCard to="/student/finance" $color="#10b981">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaWallet />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Tuition & Fees</span>
                <span className="desc">Fee receipts and balance</span>
              </QuickToolCard>

              <QuickToolCard to="/student/referral" $color="#f59e0b">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaUserFriends />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Referrals</span>
                <span className="desc">Invite friends and earn rewards</span>
              </QuickToolCard>
            </QuickToolsGrid>
          </PortalCard>

        </MainGrid>

      </Container>
    </DashboardLayout>
  );
};

export default StudentDashboard;
