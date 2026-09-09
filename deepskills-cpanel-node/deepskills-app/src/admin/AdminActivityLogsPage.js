import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaFileCsv, FaFilter, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { downloadCsv } from '../utils/csvExport';
import { fetchActivityStats, fetchGlobalActivity } from '../utils/userManagementApi';

const AdminActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalToday: 0, activeNow: 0, failedToday: 0, suspensionsWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    eventType: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [{ data, count }, statData] = await Promise.all([
          fetchGlobalActivity({ ...filters, page, pageSize: 50 }),
          fetchActivityStats()
        ]);
        setLogs(data);
        setTotal(count);
        setStats(statData);
      } catch (error) {
        toast.error(error.message || 'Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.search, filters.role, filters.eventType, filters.dateFrom, filters.dateTo]);

  const exportLogs = () => {
    downloadCsv(`activity-logs-${new Date().toISOString().split('T')[0]}.csv`, [
      'User',
      'Role',
      'Event',
      'Details',
      'IP',
      'Device',
      'Time'
    ], logs.map((log) => [
      log.user_name || 'Unknown',
      log.user_role || 'unknown',
      log.event_type,
      log.event_description,
      log.ip_address || '',
      log.device_info || '',
      log.created_at
    ]));
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <AdminLayout>
      <Wrap>
        <Header>
          <div>
            <h1>Activity Logs</h1>
            <p>Track platform access and user actions</p>
          </div>
          <ExportButton type="button" onClick={exportLogs}>
            <FaFileCsv /> Export CSV
          </ExportButton>
        </Header>

        <StatsGrid>
          <StatCard><span>Total events today</span><strong>{stats.totalToday}</strong></StatCard>
          <StatCard><span>Active users right now</span><strong style={{ color: '#2ecc71' }}>{stats.activeNow}</strong></StatCard>
          <StatCard><span>Failed logins today</span><strong style={{ color: '#f59e0b' }}>{stats.failedToday}</strong></StatCard>
          <StatCard><span>Suspensions this week</span><strong style={{ color: '#ef4444' }}>{stats.suspensionsWeek}</strong></StatCard>
        </StatsGrid>

        <FilterCard>
          <FilterGrid>
            <Field>
              <label>Search</label>
              <IconInput>
                <FaSearch />
                <input value={filters.search} onChange={(e) => { setFilters((prev) => ({ ...prev, search: e.target.value })); setPage(1); }} placeholder="User name or details" />
              </IconInput>
            </Field>
            <Field>
              <label>Role</label>
              <IconInput>
                <FaFilter />
                <select value={filters.role} onChange={(e) => { setFilters((prev) => ({ ...prev, role: e.target.value })); setPage(1); }}>
                  <option value="all">All</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  <option value="custom">Custom</option>
                  <option value="unknown">Unknown</option>
                </select>
              </IconInput>
            </Field>
            <Field>
              <label>Event type</label>
              <IconInput>
                <FaFilter />
                <select value={filters.eventType} onChange={(e) => { setFilters((prev) => ({ ...prev, eventType: e.target.value })); setPage(1); }}>
                  <option value="all">All</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="action">Action</option>
                  <option value="profile_change">Profile change</option>
                  <option value="warning">Warning</option>
                  <option value="suspension">Suspension</option>
                  <option value="reactivation">Reactivation</option>
                </select>
              </IconInput>
            </Field>
            <Field>
              <label>Date from</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => { setFilters((prev) => ({ ...prev, dateFrom: e.target.value })); setPage(1); }} />
            </Field>
            <Field>
              <label>Date to</label>
              <input type="date" value={filters.dateTo} onChange={(e) => { setFilters((prev) => ({ ...prev, dateTo: e.target.value })); setPage(1); }} />
            </Field>
          </FilterGrid>
        </FilterCard>

        <TableCard>
          <Table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Event</th>
                <th>Details</th>
                <th>IP</th>
                <th>Device</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '48px' }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '48px' }}>No activity found.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.user_name || 'Unknown'}</td>
                  <td>{log.user_role || 'unknown'}</td>
                  <td>{log.event_type}</td>
                  <td>{log.event_description}</td>
                  <td>{log.ip_address || '-'}</td>
                  <td>{log.device_info || '-'}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>

        <PaginationRow>
          <span>Page {page} of {totalPages}</span>
          <div>
            <PageButton type="button" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>Prev</PageButton>
            <PageButton type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Next</PageButton>
          </div>
        </PaginationRow>
      </Wrap>
    </AdminLayout>
  );
};

const Wrap = styled.div`
  color: #fff;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;

  h1 {
    margin: 0 0 6px;
    font-size: 2rem;
  }

  p {
    margin: 0;
    color: #9ca3af;
  }
`;

const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 18px;

  span {
    display: block;
    color: #9ca3af;
    margin-bottom: 8px;
  }

  strong {
    font-size: 1.6rem;
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 18px;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 0.82rem;
    color: #9ca3af;
  }

  input,
  select {
    width: 100%;
    background: #0a0a0a;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px 14px;
    color: #fff;
    outline: none;
  }
`;

const IconInput = styled.div`
  position: relative;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
  }

  input,
  select {
    padding-left: 38px;
  }
`;

const TableCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    text-align: left;
    vertical-align: top;
    white-space: nowrap;
  }

  th {
    color: #9ca3af;
    text-transform: uppercase;
    font-size: 0.8rem;
  }
`;

const PaginationRow = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: #9ca3af;
`;

const PageButton = styled.button`
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default AdminActivityLogsPage;
