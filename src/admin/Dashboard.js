import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FaUserGraduate, FaChalkboardTeacher, FaGraduationCap, 
  FaMoneyBillWave, FaArrowRight, FaChevronRight, FaUserPlus,
  FaCalendarCheck, FaIdBadge, FaChartBar, FaBullhorn, FaServer, FaCheckCircle
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { portalTheme } from '../components/portal/PortalTheme';
import { PortalCard } from '../components/portal/PortalCard';
import { MetricCard } from '../components/portal/MetricCard';
import { StatusPill } from '../components/portal/StatusPill';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1380px;
  margin: 0 auto;
`;

const HeaderBanner = styled(PortalCard)`
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.22) 0%, rgba(17, 19, 26, 0.85) 60%, rgba(17, 19, 26, 0.95) 100%);
  border: 1px solid rgba(123, 31, 46, 0.35);
  box-shadow: ${portalTheme.shadows.glow}, ${portalTheme.shadows.card};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  padding: 26px 32px;

  .left {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .tag {
      font-size: 0.78rem;
      font-weight: 700;
      color: #ff8a99;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    h2 {
      font-size: clamp(1.5rem, 2.2vw, 2rem);
      font-weight: 800;
      color: #fff;
      margin: 0;
      line-height: 1.2;
    }

    p {
      font-size: 0.92rem;
      color: ${portalTheme.colors.textSecondary};
      margin: 0;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
`;

const ActionButton = styled(Link)`
  display: inline-flex;
  align-items: center;
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

// Metrics Row
const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

// Department Shortcuts
const DeptSection = styled(PortalCard)`
  padding: 24px;
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

const DeptGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const DeptCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: ${portalTheme.radii.md};
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  text-decoration: none;
  transition: ${portalTheme.transitions.default};

  .dept-top {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .icon-box {
      width: 36px;
      height: 36px;
      border-radius: ${portalTheme.radii.sm};
      background: ${props => `${props.$color || portalTheme.colors.primary}18`};
      color: ${props => props.$color || '#ff8a99'};
      border: 1px solid ${props => `${props.$color || portalTheme.colors.primary}35`};
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

  .dept-title {
    font-size: 0.92rem;
    font-weight: 700;
    color: #fff;
  }

  .dept-desc {
    font-size: 0.76rem;
    color: ${portalTheme.colors.textMuted};
    line-height: 1.4;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: ${props => `${props.$color || portalTheme.colors.primary}50`};
    transform: translateY(-2px);
    box-shadow: 0 4px 16px ${props => `${props.$color || portalTheme.colors.primary}20`};

    .arrow {
      color: #fff;
      transform: translateX(3px);
    }
  }
`;

// Content 2-Column Grid
const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
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
      padding: 12px 16px;
      color: ${portalTheme.colors.textMuted};
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
    }

    td {
      padding: 14px 16px;
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

const HealthList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 0;
`;

const HealthItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.md};

  .item-left {
    display: flex;
    align-items: center;
    gap: 10px;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }

    span {
      font-size: 0.88rem;
      font-weight: 600;
      color: #fff;
    }
  }

  .status-text {
    font-size: 0.78rem;
    font-weight: 600;
    color: #10B981;
  }
`;

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeBatches: 0,
    newStudentsThisMonth: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { count: studentCount } = await supabase.from('admissions').select('*', { count: 'exact', head: true });
      const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
      const { count: batchCount } = await supabase.from('batches').select('*', { count: 'exact', head: true });

      const { data: recent } = await supabase
        .from('admissions')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(6);

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { count: newCount } = await supabase
        .from('admissions')
        .select('*', { count: 'exact', head: true })
        .gt('submitted_at', firstDayOfMonth.toISOString());

      setStats({
        totalStudents: studentCount || 0,
        totalTeachers: teacherCount || 0,
        activeBatches: batchCount || 0,
        newStudentsThisMonth: newCount || 0,
      });
      setRecentStudents(recent || []);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Container>

        {/* 1. Header Banner */}
        <HeaderBanner
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="left">
            <span className="tag">DeepSkills ERP</span>
            <h2>Super Admin Dashboard</h2>
            <p>Complete operational overview across academic, admissions, HR, and finance departments.</p>
          </div>
          <div className="actions">
            <ActionButton to="/admin/counsellor/enroll" $primary>
              <FaUserPlus /> New Enrollment
            </ActionButton>
            <ActionButton to="/admin/reports">
              <FaChartBar /> Export Reports
            </ActionButton>
          </div>
        </HeaderBanner>

        {/* 2. Key Metrics Row */}
        <MetricsGrid>
          <MetricCard
            icon={<FaUserGraduate />}
            label="Total Students"
            value={stats.totalStudents}
            badgeText={`+${stats.newStudentsThisMonth} This Month`}
            badgeType="primary"
            accentColor="#ff8a99"
          />

          <MetricCard
            icon={<FaChalkboardTeacher />}
            label="Active Faculty"
            value={stats.totalTeachers}
            badgeText="Verified"
            badgeType="success"
            accentColor={portalTheme.colors.success}
          />

          <MetricCard
            icon={<FaGraduationCap />}
            label="Active Batches"
            value={stats.activeBatches}
            badgeText="In Session"
            badgeType="info"
            accentColor={portalTheme.colors.info}
          />

          <MetricCard
            icon={<FaUserPlus />}
            label="New Admissions"
            value={stats.newStudentsThisMonth}
            badgeText="Current Month"
            badgeType="warning"
            accentColor={portalTheme.colors.warning}
          />
        </MetricsGrid>

        {/* 3. Department Quick Jump */}
        <DeptSection>
          <SectionHeader>
            <h3>
              <span className="icon"><FaServer /></span>
              Institute Departments
            </h3>
          </SectionHeader>

          <DeptGrid>
            <DeptCard to="/admin/counsellor" $color="#378ADD">
              <div className="dept-top">
                <div className="icon-box">🎓</div>
                <span className="arrow">→</span>
              </div>
              <span className="dept-title">Counsellor</span>
              <span className="dept-desc">Lead pipeline, inquiries & direct enrollment</span>
            </DeptCard>

            <DeptCard to="/admin/hr" $color="#8B5CF6">
              <div className="dept-top">
                <div className="icon-box">👔</div>
                <span className="arrow">→</span>
              </div>
              <span className="dept-title">HR & Faculty</span>
              <span className="dept-desc">Teacher hiring, documents & contracts</span>
            </DeptCard>

            <DeptCard to="/admin/finance" $color="#10B981">
              <div className="dept-top">
                <div className="icon-box">💰</div>
                <span className="arrow">→</span>
              </div>
              <span className="dept-title">Finance</span>
              <span className="dept-desc">Fee collection, payroll & revenue statements</span>
            </DeptCard>

            <DeptCard to="/admin/academic" $color="#F59E0B">
              <div className="dept-top">
                <div className="icon-box">📚</div>
                <span className="arrow">→</span>
              </div>
              <span className="dept-title">Academics</span>
              <span className="dept-desc">Attendance geofencing, tasks & exams</span>
            </DeptCard>

            <DeptCard to="/admin/management" $color="#EF4444">
              <div className="dept-top">
                <div className="icon-box">🏢</div>
                <span className="arrow">→</span>
              </div>
              <span className="dept-title">Management</span>
              <span className="dept-desc">Courses, certificates, users & blogs</span>
            </DeptCard>
          </DeptGrid>
        </DeptSection>

        {/* 4. Main 2-Column Content */}
        <MainGrid>
          
          {/* Left: Recent Registrations */}
          <PortalCard>
            <SectionHeader>
              <h3>
                <span className="icon"><FaUserGraduate /></span>
                Recent Admissions
              </h3>
              <Link to="/admin/management/students">
                Manage Students <FaArrowRight size={10} />
              </Link>
            </SectionHeader>

            <ModernTable>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Batch</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((student, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{student.name}</strong><br />
                        <small style={{ color: portalTheme.colors.textMuted }}>{student.cnic}</small>
                      </td>
                      <td>{student.course}</td>
                      <td>{student.batch || 'Pending Batch'}</td>
                      <td>
                        <StatusPill status={student.status || 'Active'} />
                      </td>
                    </tr>
                  ))}
                  {recentStudents.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '32px' }}>
                        No admission records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ModernTable>
          </PortalCard>

          {/* Right: System Status & Health */}
          <PortalCard>
            <SectionHeader>
              <h3>
                <span className="icon"><FaCheckCircle /></span>
                System & Cloud Health
              </h3>
            </SectionHeader>

            <HealthList>
              <HealthItem>
                <div className="item-left">
                  <span className="dot" />
                  <span>Supabase Database</span>
                </div>
                <span className="status-text">Connected</span>
              </HealthItem>

              <HealthItem>
                <div className="item-left">
                  <span className="dot" />
                  <span>Auth & OTP Gateways</span>
                </div>
                <span className="status-text">Operational</span>
              </HealthItem>

              <HealthItem>
                <div className="item-left">
                  <span className="dot" />
                  <span>Geofenced Attendance</span>
                </div>
                <span className="status-text">Active (Lahore)</span>
              </HealthItem>

              <HealthItem>
                <div className="item-left">
                  <span className="dot" />
                  <span>Document Storage</span>
                </div>
                <span className="status-text">Healthy</span>
              </HealthItem>
            </HealthList>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${portalTheme.colors.borderSubtle}` }}>
              <ActionButton to="/admin/users/activity" style={{ width: '100%', justifyContent: 'center' }}>
                View Audit Activity Logs →
              </ActionButton>
            </div>
          </PortalCard>

        </MainGrid>

      </Container>
    </AdminLayout>
  );
};

export default AdminDashboard;
