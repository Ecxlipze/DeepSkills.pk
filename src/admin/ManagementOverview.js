import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { useRouter } from 'next/router';
import {
  FaGraduationCap, FaUserGraduate, FaChalkboardTeacher, FaLayerGroup,
  FaAward, FaUsers, FaUserPlus, FaPlus, FaArrowRight, FaSyncAlt,
  FaCheckCircle, FaExclamationCircle, FaClock, FaBookOpen, FaCog,
  FaShareAlt, FaSearch, FaExternalLinkAlt, FaIdCard
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { SkeletonCard } from '../components/Skeleton';
import { supabase } from '../supabaseClient';
import { getAuthHeaders } from '../utils/adminAccessApi';

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export default function ManagementOverview() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState({
    kpis: {
      activeStudentsCount: 0,
      totalStudentsCount: 0,
      activeTeachersCount: 0,
      pendingTeachersCount: 0,
      activeBatchesCount: 0,
      totalBatchesCount: 0,
      certificatesIssuedCount: 0,
      systemUsersCount: 0,
      totalCoursesCount: 0
    },
    batchCapacityTelemetry: [],
    recentCertificates: [],
    recentTeachers: [],
    recentAdmissions: []
  });

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // 1. Attempt server API endpoint
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/admin/management/overview', {
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 'success' && json.data) {
          setData(json.data);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('Management Overview API unreachable, falling back to direct database query:', apiErr);
    }

    // 2. Direct Supabase Fallback Aggregation
    try {
      const [
        batchesRes,
        admissionsRes,
        teachersRes,
        coursesRes,
        certificatesRes,
        usersRes
      ] = await Promise.all([
        supabase.from('batches').select('id, course, batch_name, time_shift, status, created_at, capacity, start_date, end_date, start_time, end_time, timing_label, notes').order('created_at', { ascending: false }),
        supabase.from('admissions').select('id, name, course, batch, status, phone, email, submitted_at, approved_at').order('submitted_at', { ascending: false }),
        supabase.from('teachers').select('id, name, cnic, phone, email, specialization, status, created_at').order('created_at', { ascending: false }),
        supabase.from('courses').select('id, title, duration, created_at'),
        supabase.from('certificates').select('id, certificate_id, student_name, student_cnic, course, batch, issue_date, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('users').select('id, full_name, email, role, status, created_at').order('created_at', { ascending: false })
      ]);

      const allBatches = batchesRes.data || [];
      const allAdmissions = admissionsRes.data || [];
      const allTeachers = teachersRes.data || [];
      const allCourses = coursesRes.data || [];
      const allCertificates = certificatesRes.data || [];
      const allUsers = usersRes.data || [];

      const activeStudents = allAdmissions.filter(a => (a.status || '').toLowerCase() === 'active');
      const activeTeachers = allTeachers.filter(t => (t.status || '').toLowerCase() === 'active');
      const pendingTeachers = allTeachers.filter(t => (t.status || '').toLowerCase() === 'pending');

      const activeBatches = allBatches.filter(b => {
        const s = (b.status || '').toLowerCase();
        return s === 'active' || s === 'running' || s === 'ongoing' || !s;
      });

      const staffUsers = allUsers.filter(u => (u.role || '').toLowerCase() !== 'student');

      const studentCountByBatch = new Map();
      activeStudents.forEach(st => {
        if (st.batch) {
          const key = st.batch.trim();
          studentCountByBatch.set(key, (studentCountByBatch.get(key) || 0) + 1);
        }
      });

      const batchCapacityTelemetry = activeBatches.map(b => {
        const batchName = b.batch_name || 'Unnamed Batch';
        const enrolled = studentCountByBatch.get(batchName.trim()) || 0;
        const capacity = Number(b.capacity) || 30;
        const fillRate = Math.min(100, Math.round((enrolled / capacity) * 100));

        let health = 'Optimal';
        if (fillRate >= 100) health = 'Full';
        else if (fillRate >= 80) health = 'Filling Fast';

        return {
          id: b.id,
          batch_name: batchName,
          course: b.course || 'General',
          time_shift: b.time_shift || b.timing_label || 'Regular',
          status: b.status || 'Active',
          capacity,
          enrolled,
          fillRate,
          health,
          start_date: b.start_date || null,
          end_date: b.end_date || null
        };
      });

      setData({
        kpis: {
          activeStudentsCount: activeStudents.length,
          totalStudentsCount: allAdmissions.length,
          activeTeachersCount: activeTeachers.length,
          pendingTeachersCount: pendingTeachers.length,
          activeBatchesCount: activeBatches.length,
          totalBatchesCount: allBatches.length,
          certificatesIssuedCount: allCertificates.length,
          systemUsersCount: staffUsers.length || allUsers.length,
          totalCoursesCount: allCourses.length
        },
        batchCapacityTelemetry,
        recentCertificates: allCertificates.slice(0, 5),
        recentTeachers: allTeachers.slice(0, 5),
        recentAdmissions: allAdmissions.slice(0, 5)
      });
    } catch (fallbackErr) {
      console.error('Fallback fetch error:', fallbackErr);
      toast.error('Failed to load management telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const filteredBatches = data.batchCapacityTelemetry.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.batch_name || '').toLowerCase().includes(q) ||
      (b.course || '').toLowerCase().includes(q) ||
      (b.time_shift || '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <PageContainer>
        {/* Standardized Management Sub-Navigation Ribbon */}
        <SubNavRibbon>
          <NavChip $active onClick={() => router.push('/admin/management')}>
            <FaLayerGroup /> Management Hub
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/students')}>
            <FaUserGraduate /> Students
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/courses')}>
            <FaBookOpen /> Courses & Batches
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/teachers')}>
            <FaChalkboardTeacher /> Faculty
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/certificates')}>
            <FaAward /> Certificates
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/trainers')}>
            <FaChalkboardTeacher /> Trainers
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/testimonials')}>
            <FaAward /> Testimonials
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/media-page')}>
            <FaLayerGroup /> Media Showcase
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/referral')}>
            <FaShareAlt /> Referral Program
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/users')}>
            <FaUsers /> User Accounts
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/reports')}>
            <FaLayerGroup /> Reports
          </NavChip>
          <NavChip onClick={() => router.push('/admin/management/settings')}>
            <FaCog /> Settings
          </NavChip>
        </SubNavRibbon>

        {/* Executive Header */}
        <Header>
          <div className="title-area">
            <div className="title-badge-row">
              <h1>Management Executive Hub</h1>
              <span className="status-pill">
                <span className="pulsing-dot" /> Active Management Node
              </span>
            </div>
            <p>Centralized operational oversight for student rosters, faculty, batch capacities, and certification.</p>
          </div>
          <div className="action-cluster">
            <RefreshButton
              onClick={() => fetchOverview(true)}
              disabled={refreshing}
              title="Refresh Management Telemetry"
            >
              <FaSyncAlt className={refreshing ? 'spinning' : ''} />
              {refreshing ? 'Refreshing...' : 'Sync Telemetry'}
            </RefreshButton>
          </div>
        </Header>

        {/* Quick Action Bar */}
        <QuickActionBar>
          <ActionButton onClick={() => router.push('/admin/management/students')}>
            <div className="icon-badge"><FaUserPlus /></div>
            <div className="btn-text">
              <strong>Student Roster</strong>
              <span>Manage active & graduated students</span>
            </div>
          </ActionButton>
          <ActionButton onClick={() => router.push('/admin/management/courses')}>
            <div className="icon-badge"><FaLayerGroup /></div>
            <div className="btn-text">
              <strong>Create / Edit Batch</strong>
              <span>Schedule cohorts & shift timings</span>
            </div>
          </ActionButton>
          <ActionButton onClick={() => router.push('/admin/management/teachers')}>
            <div className="icon-badge"><FaChalkboardTeacher /></div>
            <div className="btn-text">
              <strong>Onboard Faculty</strong>
              <span>Review credentials & hire teachers</span>
            </div>
          </ActionButton>
          <ActionButton onClick={() => router.push('/admin/management/certificates')}>
            <div className="icon-badge"><FaAward /></div>
            <div className="btn-text">
              <strong>Issue Certificate</strong>
              <span>Generate verified student credentials</span>
            </div>
          </ActionButton>
        </QuickActionBar>

        {/* Executive KPI Grid */}
        {loading ? (
          <StatsGrid>
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} style={{ height: 130 }} />)}
          </StatsGrid>
        ) : (
          <StatsGrid>
            <StatCard>
              <div className="stat-top">
                <span className="stat-label">Active Students</span>
                <div className="icon-wrap burgundy"><FaUserGraduate /></div>
              </div>
              <div className="stat-val">{data.kpis.activeStudentsCount}</div>
              <div className="stat-sub">of {data.kpis.totalStudentsCount} total registered</div>
            </StatCard>

            <StatCard>
              <div className="stat-top">
                <span className="stat-label">Faculty Roster</span>
                <div className="icon-wrap purple"><FaChalkboardTeacher /></div>
              </div>
              <div className="stat-val">{data.kpis.activeTeachersCount}</div>
              <div className="stat-sub">{data.kpis.pendingTeachersCount} in onboarding pipeline</div>
            </StatCard>

            <StatCard>
              <div className="stat-top">
                <span className="stat-label">Active Batches</span>
                <div className="icon-wrap emerald"><FaLayerGroup /></div>
              </div>
              <div className="stat-val">{data.kpis.activeBatchesCount}</div>
              <div className="stat-sub">of {data.kpis.totalBatchesCount} total cohorts</div>
            </StatCard>

            <StatCard>
              <div className="stat-top">
                <span className="stat-label">Certificates Issued</span>
                <div className="icon-wrap amber"><FaAward /></div>
              </div>
              <div className="stat-val">{data.kpis.certificatesIssuedCount}</div>
              <div className="stat-sub">verified digital credentials</div>
            </StatCard>

            <StatCard>
              <div className="stat-top">
                <span className="stat-label">System Staff</span>
                <div className="icon-wrap cyan"><FaUsers /></div>
              </div>
              <div className="stat-val">{data.kpis.systemUsersCount}</div>
              <div className="stat-sub">across {data.kpis.totalCoursesCount} active courses</div>
            </StatCard>
          </StatsGrid>
        )}

        {/* Batch Fill & Capacity Telemetry */}
        <TelemetryCard>
          <div className="card-header">
            <div>
              <h3>Batch Capacity & Enrollment Telemetry</h3>
              <p>Real-time cohort fill rates, shift allocations, and seat availability.</p>
            </div>
            <div className="search-wrap">
              <FaSearch />
              <input
                type="text"
                placeholder="Filter by batch or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Batch / Cohort</th>
                  <th>Course Curriculum</th>
                  <th>Shift & Timing</th>
                  <th>Enrolled / Capacity</th>
                  <th>Fill Rate</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch) => {
                    return (
                      <tr key={batch.id}>
                        <td>
                          <strong>{batch.batch_name}</strong>
                        </td>
                        <td>
                          <span className="course-chip">{batch.course}</span>
                        </td>
                        <td>
                          <span className="shift-chip"><FaClock /> {batch.time_shift}</span>
                        </td>
                        <td>
                          <span className="capacity-text">
                            <strong>{batch.enrolled}</strong> / {batch.capacity} seats
                          </span>
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <div className="progress-wrap">
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${Math.min(100, batch.fillRate)}%`,
                                  background:
                                    batch.fillRate >= 100
                                      ? 'linear-gradient(90deg, #a855f7, #c084fc)'
                                      : batch.fillRate >= 85
                                      ? 'linear-gradient(90deg, #7B1F2E, #ef4444)'
                                      : batch.fillRate >= 60
                                      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                      : 'linear-gradient(90deg, #10b981, #34d399)'
                                }}
                              />
                            </div>
                            <span className="pct-label">{batch.fillRate}%</span>
                          </div>
                        </td>
                        <td>
                          <HealthBadge $rate={batch.fillRate}>
                            {batch.health}
                          </HealthBadge>
                        </td>
                        <td>
                          <TableActionButton
                            onClick={() => router.push(`/admin/management/students?batch=${encodeURIComponent(batch.batch_name)}`)}
                            title="View enrolled students in this batch"
                          >
                            View Students <FaArrowRight />
                          </TableActionButton>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      {loading ? 'Loading batch telemetry...' : 'No active batches matching the query.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TelemetryCard>

        {/* Operational Split Panels */}
        <SplitGrid>
          {/* Recent Certificate Issuances */}
          <SectionCard>
            <div className="section-head">
              <h4><FaAward /> Recent Verified Certificates</h4>
              <button onClick={() => router.push('/admin/management/certificates')}>
                View Desk <FaArrowRight />
              </button>
            </div>
            <div className="activity-list">
              {data.recentCertificates.length > 0 ? (
                data.recentCertificates.map((cert) => (
                  <div className="activity-item" key={cert.id || cert.certificate_id}>
                    <div className="activity-icon-badge amber">
                      <FaAward />
                    </div>
                    <div className="activity-details">
                      <strong>{cert.student_name}</strong>
                      <span>{cert.course} &bull; {cert.batch}</span>
                    </div>
                    <div className="activity-meta">
                      <code>{cert.certificate_id || 'CERT-OK'}</code>
                      <small>{cert.issue_date || 'Recent'}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-notice">No recent certificates generated yet.</div>
              )}
            </div>
          </SectionCard>

          {/* Active Faculty Overview */}
          <SectionCard>
            <div className="section-head">
              <h4><FaChalkboardTeacher /> Faculty Roster</h4>
              <button onClick={() => router.push('/admin/management/teachers')}>
                All Teachers <FaArrowRight />
              </button>
            </div>
            <div className="activity-list">
              {data.recentTeachers.length > 0 ? (
                data.recentTeachers.map((t) => (
                  <div className="activity-item" key={t.id || t.cnic}>
                    <div className="activity-icon-badge burgundy">
                      <FaChalkboardTeacher />
                    </div>
                    <div className="activity-details">
                      <strong>{t.name}</strong>
                      <span>{t.specialization || 'Instructor'} &bull; {t.email}</span>
                    </div>
                    <div className="activity-meta">
                      <TeacherStatusChip $status={t.status}>{t.status || 'Active'}</TeacherStatusChip>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-notice">No faculty members found.</div>
              )}
            </div>
          </SectionCard>
        </SplitGrid>
      </PageContainer>
    </AdminLayout>
  );
}

// -------------------------------------------------------------
// Styled Components matching DeepSkills Dark Glassmorphic Design
// -------------------------------------------------------------

const PageContainer = styled.div`
  padding: 16px 0 40px;
  color: #fff;
`;

const SubNavRibbon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 22px;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
`;

const NavChip = styled.button`
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => props.$active ? '#c084fc' : '#94a3b8'};
  border: 1px solid ${props => props.$active ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
  padding: 7px 15px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(168, 85, 247, 0.2);
    color: #fff;
    border-color: rgba(168, 85, 247, 0.5);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;

  .title-area {
    .title-badge-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 6px;

      h1 {
        margin: 0;
        font-size: 1.85rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.25);
        color: #34d399;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 600;

        .pulsing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }
      }
    }

    p {
      margin: 0;
      color: #94a3b8;
      font-size: 0.92rem;
    }
  }

  .action-cluster {
    display: flex;
    gap: 10px;
    align-items: center;
  }
`;

const RefreshButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  border-radius: 10px;
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #7B1F2E;
    background: linear-gradient(135deg, rgba(123, 31, 46, 0.35) 0%, rgba(74, 14, 23, 0.45) 100%);
    box-shadow: 0 0 14px rgba(123, 31, 46, 0.35);
    color: #fff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinning {
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

const QuickActionBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
`;

const ActionButton = styled.button`
  background: #0d0f14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  .icon-badge {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: rgba(123, 31, 46, 0.2);
    border: 1px solid rgba(123, 31, 46, 0.4);
    color: #fb7185;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .btn-text {
    display: flex;
    flex-direction: column;

    strong {
      color: #f1f5f9;
      font-size: 0.92rem;
      font-weight: 700;
      margin-bottom: 2px;
    }

    <span> {
      color: #94a3b8;
      font-size: 0.76rem;
    }
  }

  &:hover {
    border-color: rgba(123, 31, 46, 0.5);
    background: rgba(123, 31, 46, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);

    .icon-badge {
      background: #7B1F2E;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(123, 31, 46, 0.6);
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: #0d0f14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;

  .stat-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .stat-label {
      color: #94a3b8;
      font-size: 0.76rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;

      &.burgundy {
        background: rgba(123, 31, 46, 0.2);
        border: 1px solid rgba(123, 31, 46, 0.35);
        color: #fb7185;
      }
      &.purple {
        background: rgba(168, 85, 247, 0.2);
        border: 1px solid rgba(168, 85, 247, 0.35);
        color: #c084fc;
      }
      &.emerald {
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
      }
      &.amber {
        background: rgba(245, 158, 11, 0.2);
        border: 1px solid rgba(245, 158, 11, 0.35);
        color: #fbbf24;
      }
      &.cyan {
        background: rgba(56, 189, 248, 0.2);
        border: 1px solid rgba(56, 189, 248, 0.35);
        color: #38bdf8;
      }
    }
  }

  .stat-val {
    font-size: 1.85rem;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  .stat-sub {
    color: #64748b;
    font-size: 0.78rem;
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.16);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
`;

const TelemetryCard = styled.div`
  background: #0d0f14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 22px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;

    h3 {
      margin: 0 0 4px;
      font-size: 1.1rem;
      font-weight: 800;
      color: #f1f5f9;
    }

    p {
      margin: 0;
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #11141d;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 9px;
      padding: 8px 12px;
      color: #94a3b8;

      input {
        background: transparent;
        border: none;
        outline: none;
        color: #fff;
        font-size: 0.85rem;
        width: 200px;
      }
    }
  }

  .table-responsive {
    overflow-x: auto;

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 800px;

      th, td {
        padding: 13px 14px;
        text-align: left;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 0.88rem;
      }

      th {
        color: #94a3b8;
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: .08em;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.02);
      }

      tbody tr:hover {
        background: rgba(255, 255, 255, 0.025);
      }
    }
  }

  .course-chip {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: #cbd5e1;
    font-size: 0.8rem;
  }

  .shift-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .capacity-text {
    color: #94a3b8;
    strong {
      color: #fff;
    }
  }

  .progress-wrap {
    display: flex;
    align-items: center;
    gap: 10px;

    .progress-bar-bg {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;

      .progress-bar-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.4s ease;
      }
    }

    .pct-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #cbd5e1;
      min-width: 32px;
      text-align: right;
    }
  }
`;

const HealthBadge = styled.span`
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  background: ${props =>
    props.$rate >= 100
      ? 'rgba(168, 85, 247, 0.15)'
      : props.$rate >= 85
      ? 'rgba(239, 68, 68, 0.15)'
      : props.$rate >= 60
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(16, 185, 129, 0.15)'};
  color: ${props =>
    props.$rate >= 100
      ? '#c084fc'
      : props.$rate >= 85
      ? '#f87171'
      : props.$rate >= 60
      ? '#fbbf24'
      : '#34d399'};
  border: 1px solid ${props =>
    props.$rate >= 100
      ? 'rgba(168, 85, 247, 0.3)'
      : props.$rate >= 85
      ? 'rgba(239, 68, 68, 0.3)'
      : props.$rate >= 60
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(16, 185, 129, 0.3)'};
`;

const TableActionButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-radius: 7px;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #7B1F2E;
    background: rgba(123, 31, 46, 0.25);
    color: #fff;
  }
`;

const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const SectionCard = styled.div`
  background: #0d0f14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    button {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: color 0.2s ease;

      &:hover {
        color: #c084fc;
      }
    }
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px;

    .activity-icon-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      flex-shrink: 0;

      &.amber {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }
      &.burgundy {
        background: rgba(123, 31, 46, 0.2);
        color: #fb7185;
      }
    }

    .activity-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      strong {
        font-size: 0.86rem;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      span {
        font-size: 0.75rem;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .activity-meta {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      code {
        font-size: 0.74rem;
        color: #c084fc;
        background: rgba(168, 85, 247, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        margin-bottom: 2px;
      }

      small {
        font-size: 0.7rem;
        color: #64748b;
      }
    }
  }

  .empty-notice {
    text-align: center;
    padding: 24px;
    color: #64748b;
    font-size: 0.85rem;
  }
`;

const TeacherStatusChip = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${props => (props.$status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)')};
  color: ${props => (props.$status === 'Active' ? '#34d399' : '#fbbf24')};
  border: 1px solid ${props => (props.$status === 'Active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)')};
`;
