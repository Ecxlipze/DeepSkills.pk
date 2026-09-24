import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaUsers, FaClock, FaCoffee, FaCheckCircle, FaFileDownload,
  FaFilter, FaCalendarAlt, FaBriefcase, FaSync
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { AdminLayout } from '../components/AdminLayout';
import { portalTheme } from '../components/portal/PortalTheme';
import { useAuth } from '../context/AuthContext';
import {
  getAuthToken,
  fetchLiveTeamPulse,
  fetchTimeReports,
  formatSeconds,
  formatHourDecimal
} from '../utils/timeTrackingApi';

const PageContainer = styled.div`
  padding: 24px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: ${portalTheme.colors.textPrimary};

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  h1 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 4px 0;
    background: linear-gradient(135deg, #fff 30%, rgba(255, 255, 255, 0.7));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    margin: 0;
    font-size: 0.88rem;
    color: ${portalTheme.colors.textSecondary};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const TabGroup = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: ${portalTheme.radii.md};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  gap: 4px;
`;

const TabBtn = styled.button`
  padding: 8px 16px;
  border-radius: ${portalTheme.radii.sm};
  border: none;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.5)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textSecondary};
  border: 1px solid ${props => props.$active ? 'rgba(123, 31, 46, 0.8)' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    color: #fff;
  }
`;

const ExportBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 8px 16px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

// ── STAT CARDS ──
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${portalTheme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.06)'};
  color: ${props => props.$color || '#fff'};
`;

const StatMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  .val {
    font-size: 1.5rem;
    font-weight: 800;
    color: #fff;
  }

  .lbl {
    font-size: 0.78rem;
    color: ${portalTheme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

// ── ROSTER GRID ──
const RosterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const MemberCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${props => props.$status === 'working'
    ? 'rgba(16, 185, 129, 0.35)'
    : (props.$status === 'on_break'
      ? 'rgba(245, 158, 11, 0.35)'
      : portalTheme.colors.borderSubtle)};
  border-radius: ${portalTheme.radii.lg};
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$status === 'working'
      ? '#10B981'
      : (props.$status === 'on_break'
        ? '#F59E0B'
        : (props.$status === 'completed' ? '#3B82F6' : 'transparent'))};
  }
`;

const MemberHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;

  .name-block {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .name {
      font-weight: 700;
      font-size: 0.96rem;
      color: #fff;
    }

    .role {
      font-size: 0.78rem;
      color: ${portalTheme.colors.textMuted};
    }
  }
`;

const StatusChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border-radius: ${portalTheme.radii.pill};

  background: ${props => props.$status === 'working'
    ? 'rgba(16, 185, 129, 0.15)'
    : (props.$status === 'on_break'
      ? 'rgba(245, 158, 11, 0.15)'
      : (props.$status === 'completed'
        ? 'rgba(59, 130, 246, 0.15)'
        : 'rgba(255, 255, 255, 0.05)'))};

  color: ${props => props.$status === 'working'
    ? '#34D399'
    : (props.$status === 'on_break'
      ? '#FBBF24'
      : (props.$status === 'completed'
        ? '#60A5FA'
        : '#9ca3af'))};

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const TaskBanner = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${portalTheme.radii.md};
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .project {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    color: ${props => props.$color || '#9ca3af'};
  }

  .task-desc {
    font-size: 0.84rem;
    color: #fff;
    font-weight: 500;
  }

  .elapsed {
    font-family: monospace;
    font-size: 0.8rem;
    color: #34D399;
    font-weight: 700;
  }
`;

const ShiftDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  color: ${portalTheme.colors.textMuted};
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 10px;
`;

// ── TIMESHEET SUMMARY TABLE ──
const TableCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 20px;
  overflow-x: auto;
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  select, input {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: ${portalTheme.radii.sm};
    padding: 8px 12px;
    color: #fff;
    font-size: 0.84rem;
    outline: none;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  text-align: left;

  th, td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  th {
    background: rgba(255, 255, 255, 0.02);
    color: ${portalTheme.colors.textMuted};
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.03);
  }
`;

export default function AdminStaffTimeReports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'summary'
  const [loading, setLoading] = useState(true);

  // Live Pulse state
  const [pulseData, setPulseData] = useState({ stats: {}, roster: [] });

  // Summary state
  const [summaryData, setSummaryData] = useState({ totals: {}, byMember: [], byProject: [] });
  const [datePreset, setDatePreset] = useState('month'); // 'today' | 'week' | 'month'

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken(user);
      if (!token) return;

      // Fetch live pulse
      const live = await fetchLiveTeamPulse(token).catch(() => ({ stats: {}, roster: [] }));
      setPulseData(live);

      // Fetch summary
      const now = new Date();
      let start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      let end = now.toISOString().slice(0, 10);

      if (datePreset === 'today') {
        start = end;
      } else if (datePreset === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        start = d.toISOString().slice(0, 10);
      }

      const summary = await fetchTimeReports(token, { startDate: start, endDate: end }).catch(() => ({ totals: {}, byMember: [], byProject: [] }));
      setSummaryData(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh pulse every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, datePreset]);

  const handleExportCsv = async () => {
    try {
      const token = await getAuthToken(user);
      const now = new Date();
      let start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      let end = now.toISOString().slice(0, 10);

      if (datePreset === 'today') start = end;
      else if (datePreset === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        start = d.toISOString().slice(0, 10);
      }

      const url = `/api/admin/time/reports?mode=export&startDate=${start}&endDate=${end}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `DeepSkills_Timesheet_${start}_to_${end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Timesheet CSV downloaded!');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const stats = pulseData.stats || {};

  return (
    <AdminLayout>
      <PageContainer>
        {/* ── HEADER ── */}
        <PageHeader>
          <div>
            <h1>Team Time & Attendance Oversight</h1>
            <p>Real-time team presence pulse, task tracking breakdown, and institutional payroll logs.</p>
          </div>

          <HeaderActions>
            <TabGroup>
              <TabBtn $active={activeTab === 'live'} onClick={() => setActiveTab('live')}>
                Live Team Pulse
              </TabBtn>
              <TabBtn $active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
                Timesheet Reports
              </TabBtn>
            </TabGroup>

            <ExportBtn onClick={handleExportCsv}>
              <FaFileDownload /> Export CSV
            </ExportBtn>

            <ExportBtn onClick={loadData} title="Refresh">
              <FaSync />
            </ExportBtn>
          </HeaderActions>
        </PageHeader>

        {/* ── TOP STATS ── */}
        <StatsGrid>
          <StatCard>
            <StatIcon $bg="rgba(59, 130, 246, 0.15)" $color="#60A5FA">
              <FaUsers />
            </StatIcon>
            <StatMeta>
              <span className="val">{stats.totalTeam || 0}</span>
              <span className="lbl">Total Team Roster</span>
            </StatMeta>
          </StatCard>

          <StatCard>
            <StatIcon $bg="rgba(16, 185, 129, 0.15)" $color="#34D399">
              <FaClock />
            </StatIcon>
            <StatMeta>
              <span className="val">{stats.currentlyActive || 0}</span>
              <span className="lbl">Currently On Duty</span>
            </StatMeta>
          </StatCard>

          <StatCard>
            <StatIcon $bg="rgba(245, 158, 11, 0.15)" $color="#FBBF24">
              <FaCoffee />
            </StatIcon>
            <StatMeta>
              <span className="val">{stats.onBreak || 0}</span>
              <span className="lbl">On Lunch / Tea Break</span>
            </StatMeta>
          </StatCard>

          <StatCard>
            <StatIcon $bg="rgba(139, 92, 246, 0.15)" $color="#A78BFA">
              <FaCheckCircle />
            </StatIcon>
            <StatMeta>
              <span className="val">{stats.completedToday || 0}</span>
              <span className="lbl">Shifts Finished Today</span>
            </StatMeta>
          </StatCard>
        </StatsGrid>

        {/* ── LIVE TEAM PULSE TAB ── */}
        {activeTab === 'live' && (
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Live Team Members ({pulseData.roster?.length || 0})
            </h2>

            <RosterGrid>
              {(pulseData.roster || []).map(member => (
                <MemberCard key={`${member.actor_type}_${member.id}`} $status={member.status}>
                  <MemberHeader>
                    <div className="name-block">
                      <span className="name">{member.name}</span>
                      <span className="role">{member.role} • {member.department}</span>
                    </div>

                    <StatusChip $status={member.status}>
                      <span className="dot" />
                      {member.status === 'working' ? 'Working' : (member.status === 'on_duty' ? 'On Duty' : (member.status === 'on_break' ? 'On Break' : (member.status === 'completed' ? 'Finished' : 'Off Duty')))}
                    </StatusChip>
                  </MemberHeader>

                  {member.active_task && (
                    <TaskBanner $color={member.active_task.project_color}>
                      <span className="project">
                        <FaBriefcase /> {member.active_task.project}
                      </span>
                      <span className="task-desc">{member.active_task.description || '(No task description)'}</span>
                      <span className="elapsed">
                        Active Timer: {formatSeconds(member.active_task.elapsed_seconds)}
                      </span>
                    </TaskBanner>
                  )}

                  <ShiftDetailRow>
                    <span>
                      {member.shift?.clock_in
                        ? `Clock in: ${new Date(member.shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'No clock-in today'}
                    </span>
                    <span>
                      {member.shift?.total_work_seconds
                        ? `${formatHourDecimal(member.shift.total_work_seconds)}h on duty`
                        : ''}
                    </span>
                  </ShiftDetailRow>
                </MemberCard>
              ))}
            </RosterGrid>
          </div>
        )}

        {/* ── TIMESHEET REPORTS TAB ── */}
        {activeTab === 'summary' && (
          <TableCard>
            <FilterRow>
              <label style={{ fontSize: '0.84rem', color: portalTheme.colors.textMuted }}>Date Range:</label>
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Current Month</option>
              </select>

              <span style={{ fontSize: '0.82rem', color: portalTheme.colors.textSecondary, marginLeft: 'auto' }}>
                Total Task Hours: <strong>{summaryData.totals?.totalTaskHours || 0}h</strong> | Total Shift Hours: <strong>{summaryData.totals?.totalShiftHours || 0}h</strong>
              </span>
            </FilterRow>

            <StyledTable>
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Task Hours</th>
                  <th>Shift Hours</th>
                  <th>Entries Logged</th>
                </tr>
              </thead>
              <tbody>
                {(summaryData.byMember || []).length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: portalTheme.colors.textMuted }}>
                      No time records found for this period.
                    </td>
                  </tr>
                ) : (
                  (summaryData.byMember || []).map(m => (
                    <tr key={`${m.actor_type}_${m.actor_id}`}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{m.name}</td>
                      <td>{m.role}</td>
                      <td>{m.dept}</td>
                      <td style={{ fontFamily: 'monospace', color: '#34D399', fontWeight: 600 }}>
                        {formatHourDecimal(m.task_seconds)}h
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#60A5FA', fontWeight: 600 }}>
                        {formatHourDecimal(m.shift_seconds)}h
                      </td>
                      <td>{m.entries_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </StyledTable>
          </TableCard>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
