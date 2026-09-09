import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaChalkboardTeacher, FaTasks, FaUserGraduate,
  FaCalendarCheck, FaClock, FaCheckCircle, FaBullhorn,
  FaArrowRight, FaClipboardCheck, FaIdBadge, FaWallet,
  FaComments, FaUserFriends, FaExclamationCircle
} from 'react-icons/fa';
import DashboardLayout from './components/DashboardLayout';
import { useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import { getAssignedTeacherBatches, getTeacherByCnic } from './utils/teacherUtils';
import { formatAttendanceDate } from './utils/autoAttendance';
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

const TeacherAvatar = styled.div`
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

const TeacherInfo = styled.div`
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

const ActionButton = styled(Link)`
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

// Batch Scope Switcher
const ScopeSection = styled(PortalCard)`
  padding: 20px 24px;
`;

const ScopeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;

  span.label {
    font-size: 0.8rem;
    font-weight: 700;
    color: ${portalTheme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`;

const ScopeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
`;

const ScopeOption = styled.button`
  width: 100%;
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.22)' : 'rgba(255, 255, 255, 0.025)'};
  border: 1px solid ${props => props.$active ? portalTheme.colors.primary : portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.md};
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  padding: 14px 16px;
  text-align: left;
  transition: ${portalTheme.transitions.default};
  box-shadow: ${props => props.$active ? portalTheme.shadows.glow : 'none'};

  &:hover {
    background: rgba(123, 31, 46, 0.16);
    border-color: rgba(123, 31, 46, 0.4);
    transform: translateY(-2px);
  }

  .course {
    display: block;
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 4px;
    color: ${props => props.$active ? '#ff8a99' : '#fff'};
  }

  .batch {
    display: block;
    color: ${portalTheme.colors.textMuted};
    font-size: 0.82rem;
  }
`;

// Metrics Grid
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
`;

// Main 2-Column Grid
const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.div`
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

  span.date-tag {
    font-size: 0.8rem;
    color: ${portalTheme.colors.textMuted};
    background: rgba(255, 255, 255, 0.05);
    padding: 4px 10px;
    border-radius: ${portalTheme.radii.pill};
  }
`;

const ModernTable = styled.div`
  width: 100%;
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;

    th {
      text-align: left;
      padding: 12px 14px;
      color: ${portalTheme.colors.textMuted};
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
    }

    td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: ${portalTheme.colors.textSecondary};

      strong {
        color: #fff;
        font-weight: 600;
      }
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
  }
`;

const EmptyRow = styled.div`
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

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [stats, setStats] = useState({
    assignedBatches: [],
    totalStudents: 0,
    classesConducted: 0,
    classAverage: 0,
    tasksAssigned: 0,
    assignmentsGraded: 0,
    overallAttendance: 0
  });

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!user?.cnic) return;

      try {
        const teacher = await getTeacherByCnic(user.cnic);
        const batches = await getAssignedTeacherBatches(teacher.id);
        const activeBatch = batches.find((batch) => batch.id === selectedBatchId) || batches[0];
        const batchNames = activeBatch?.batch_name ? [activeBatch.batch_name] : [];

        let studentCount = 0;
        let classAverage = 0;
        let classesConducted = 0;
        let tasksAssigned = 0;
        let assignmentsGraded = 0;
        let overallAttendance = 0;

        if (batchNames.length > 0) {
          const { count, error: cError } = await supabase
            .from('admissions')
            .select('*', { count: 'exact', head: true })
            .in('batch', batchNames);
          
          if (!cError) studentCount = count;

          const { data: roster } = await supabase
            .from('admissions')
            .select('id, name, cnic, batch')
            .in('batch', batchNames)
            .eq('status', 'Active')
            .order('name', { ascending: true });

          const { data: todayRows } = await supabase
            .from('attendance')
            .select('*')
            .eq('batch_id', activeBatch.id)
            .eq('date', formatAttendanceDate());

          const rowMap = new Map((todayRows || []).map((row) => [row.student_id, row]));
          setTodayAttendance((roster || []).map((student) => ({
            ...student,
            attendance: rowMap.get(student.id) || null
          })));

          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('date, status, batch_name')
            .in('batch_name', batchNames);

          const uniqueClassDates = new Set();
          let presentCount = 0;

          attendanceData?.forEach((row) => {
            uniqueClassDates.add(`${row.batch_name}-${row.date}`);
            if (row.status === 'present' || row.status === 'late') presentCount += 1;
          });

          classesConducted = uniqueClassDates.size;
          overallAttendance = attendanceData?.length
            ? Math.round((presentCount / attendanceData.length) * 100)
            : 0;
          classAverage = overallAttendance;

          const { data: taskData } = await supabase
            .from('tasks')
            .select(`
              id,
              batch,
              task_submissions(status, marks_obtained)
            `)
            .in('batch', batchNames)
            .eq('assigned_by', user.name);

          tasksAssigned = taskData?.length || 0;

          const submissions = taskData?.flatMap(task => task.task_submissions || []) || [];
          const gradedCount = submissions.filter(sub => sub.status === 'Graded' || sub.marks_obtained !== null).length;
          assignmentsGraded = submissions.length > 0 ? Math.round((gradedCount / submissions.length) * 100) : 0;
        }
        if (batchNames.length === 0) {
          setTodayAttendance([]);
        }

        setStats({
          assignedBatches: batches,
          selectedBatch: activeBatch || null,
          totalStudents: studentCount,
          classesConducted,
          classAverage,
          tasksAssigned,
          assignmentsGraded,
          overallAttendance
        });

      } catch (err) {
        console.error("Error fetching teacher stats:", err);
      }
    };

    fetchTeacherStats();
  }, [user, selectedBatchId]);

  useEffect(() => {
    if (selectedBatchId || stats.assignedBatches.length === 0) return;
    setSelectedBatchId(stats.assignedBatches[0].id);
  }, [selectedBatchId, stats.assignedBatches]);

  const teacher = {
    name: user?.name || "Faculty Member",
    cnic: user?.cnic || "---",
    totalStudents: stats.totalStudents,
    classesConducted: stats.classesConducted,
    classAverage: stats.classAverage,
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const selectedBatch = stats.selectedBatch;
  const selectedTiming = selectedBatch?.time_shift || selectedBatch?.batch_timing;

  return (
    <DashboardLayout>
      <Container>
        
        {/* 1. Hero Welcome Card */}
        <WelcomeBanner
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <TeacherAvatar>{getInitials(teacher.name)}</TeacherAvatar>
          
          <TeacherInfo>
            <span className="greeting">Faculty Portal</span>
            <h2 className="name">{teacher.name}</h2>
            <div className="meta-chips">
              <StatusPill status="Faculty" />
              <div className="meta-item">
                <FaChalkboardTeacher />
                <strong>{selectedBatch?.course || 'General Course'}</strong>
              </div>
              <div className="meta-item">
                <FaClock />
                <span>{selectedBatch?.batch_name || 'Batch'} {selectedTiming ? `— ${selectedTiming}` : ''}</span>
              </div>
            </div>
          </TeacherInfo>

          <BannerActions>
            <ActionButton to="/teacher/tasks/assign" $primary>
              <FaTasks /> Assign Task
            </ActionButton>
            <ActionButton to="/teacher/tasks/view">
              <FaClipboardCheck /> View Submissions
            </ActionButton>
          </BannerActions>
        </WelcomeBanner>

        {/* 2. Course & Batch Scope Switcher */}
        {stats.assignedBatches.length > 0 && (
          <ScopeSection>
            <ScopeHeader>
              <span className="label">Your Assigned Batches</span>
              <span style={{ fontSize: '0.8rem', color: portalTheme.colors.textMuted }}>
                Select a batch to inspect roster and metrics
              </span>
            </ScopeHeader>
            <ScopeGrid>
              {stats.assignedBatches.map((batch) => {
                const timing = batch.time_shift || batch.batch_timing;
                const isSelected = selectedBatch?.id === batch.id;
                return (
                  <ScopeOption
                    key={batch.id}
                    type="button"
                    $active={isSelected}
                    onClick={() => setSelectedBatchId(batch.id)}
                  >
                    <span className="course">{batch.course || 'General Course'}</span>
                    <span className="batch">
                      {batch.batch_name || 'Unnamed batch'}{timing ? ` — ${timing}` : ''}
                    </span>
                  </ScopeOption>
                );
              })}
            </ScopeGrid>
          </ScopeSection>
        )}

        {/* 3. Key Metrics */}
        <MetricsGrid>
          <MetricCard
            icon={<FaUserGraduate />}
            label="Enrolled Students"
            value={teacher.totalStudents}
            badgeText={selectedBatch?.batch_name || 'Active'}
            badgeType="primary"
            accentColor="#ff8a99"
          />

          <MetricCard
            icon={<FaCalendarCheck />}
            label="Classes Conducted"
            value={teacher.classesConducted}
            badgeText="This Term"
            badgeType="info"
            accentColor={portalTheme.colors.info}
          />

          <MetricCard
            icon={<FaClipboardCheck />}
            label="Assignments Graded"
            value={`${stats.assignmentsGraded}%`}
            badgeText={`${stats.tasksAssigned} Tasks`}
            badgeType={stats.assignmentsGraded >= 75 ? 'success' : 'warning'}
            progress={stats.assignmentsGraded}
            accentColor={stats.assignmentsGraded >= 75 ? portalTheme.colors.success : portalTheme.colors.warning}
          />

          <MetricCard
            icon={<FaCheckCircle />}
            label="Class Attendance Rate"
            value={`${stats.overallAttendance}%`}
            badgeText="Average"
            badgeType={stats.overallAttendance >= 75 ? 'success' : 'default'}
            progress={stats.overallAttendance}
            accentColor={portalTheme.colors.success}
          />
        </MetricsGrid>

        {/* 4. Bottom 2-Column Content */}
        <MainGrid>

          {/* Left: Today's Attendance */}
          <PortalCard>
            <SectionTitle>
              <h3>
                <span className="icon"><FaCalendarCheck /></span>
                Today&apos;s Class Attendance
              </h3>
              <span className="date-tag">{formatAttendanceDate()}</span>
            </SectionTitle>

            <ModernTable>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Marked By</th>
                    <th>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((student) => {
                    const row = student.attendance;
                    return (
                      <tr key={student.id}>
                        <td>
                          <strong>{student.name}</strong><br />
                          <small style={{ color: portalTheme.colors.textMuted }}>{student.cnic}</small>
                        </td>
                        <td>
                          <StatusPill status={row?.status || 'Pending'} />
                        </td>
                        <td>{row?.marked_by || 'Auto Pending'}</td>
                        <td>{row?.distance_meters ? `${row.distance_meters}m` : '—'}</td>
                      </tr>
                    );
                  })}
                  {todayAttendance.length === 0 && (
                    <tr>
                      <td colSpan="4">
                        <EmptyRow>No students found for the selected batch.</EmptyRow>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ModernTable>
          </PortalCard>

          {/* Right: Faculty Quick Actions & Links */}
          <PortalCard>
            <SectionTitle>
              <h3>
                <span className="icon"><FaChalkboardTeacher /></span>
                Faculty Shortcuts
              </h3>
            </SectionTitle>

            <QuickToolsGrid>
              <QuickToolCard to="/teacher/attendance" $color="#ec4899">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaCalendarCheck />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Take Attendance</span>
                <span className="desc">Daily class register</span>
              </QuickToolCard>

              <QuickToolCard to="/teacher/students" $color="#6366f1">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaUserGraduate />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">My Students</span>
                <span className="desc">View enrolled roster</span>
              </QuickToolCard>

              <QuickToolCard to="/teacher/tasks/assign" $color="#3b82f6">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaTasks />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Assign Task</span>
                <span className="desc">Create new assignments</span>
              </QuickToolCard>

              <QuickToolCard to="/teacher/tasks/view" $color="#10b981">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaClipboardCheck />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Grade Tasks</span>
                <span className="desc">Review submitted work</span>
              </QuickToolCard>

              <QuickToolCard to="/teacher/announcements" $color="#f59e0b">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaBullhorn />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">Announcements</span>
                <span className="desc">Broadcast to your class</span>
              </QuickToolCard>

              <QuickToolCard to="/teacher/hr" $color="#8b5cf6">
                <div className="tool-top">
                  <div className="icon-box">
                    <FaIdBadge />
                  </div>
                  <span className="arrow">→</span>
                </div>
                <span className="title">HR Profile</span>
                <span className="desc">Documents & contract</span>
              </QuickToolCard>
            </QuickToolsGrid>
          </PortalCard>

        </MainGrid>

      </Container>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
