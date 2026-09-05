import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  FaSync, FaDownload, FaSearch, FaExclamationCircle
} from 'react-icons/fa';

import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../components/Skeleton';
import { createBatchNotifications } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { downloadCsv } from '../utils/csvExport';

const Container = styled.div`
  padding: 20px 0;
  color: #fff;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; gap: 20px; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
`;

const StatCard = styled.div`
  background: #111318; border-radius: 12px; padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  h4 { color: #888; font-size: 0.8rem; margin: 0 0 10px; text-transform: uppercase; }
  .value { font-size: 1.8rem; font-weight: 800; }
  .sub { font-size: 0.75rem; margin-top: 5px; }
`;

const FilterCard = styled.div`
  background: #111318; border-radius: 12px; padding: 25px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 30px;
  display: grid; grid-template-columns: 2fr 1fr 1fr 150px; gap: 15px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Input = styled.input`
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); padding: 12px;
  border-radius: 8px; color: #fff; font-size: 0.9rem;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const Select = styled.select`
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); padding: 12px;
  border-radius: 8px; color: #fff; font-size: 0.9rem;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const TableCard = styled.div`
  background: #111318; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse;
  th, td { padding: 15px 20px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.03); }
  th { font-size: 0.8rem; color: #666; text-transform: uppercase; font-weight: 700; }
  td { font-size: 0.9rem; color: #ccc; }
  tr:last-child td { border: none; }
`;

const Badge = styled.span`
  padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;
  background: ${props => props.$passed ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'};
  color: ${props => props.$passed ? '#2ecc71' : '#e74c3c'};
`;

const ActionButton = styled.button`
  background: ${props => props.$primary ? '#7B1F2E' : 'rgba(255,255,255,0.05)'};
  color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px;
  border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;
  font-size: 0.85rem; font-weight: 600;
  &:hover { background: ${props => props.$primary ? '#9c273a' : 'rgba(255,255,255,0.1)'}; }
`;

const AdminResults = () => {
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'results', 'full');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', batch: 'all', type: 'midterm' });
  const [batches, setBatches] = useState([]);
  const [recomputing, setRecomputing] = useState(false);

  const fetchBatches = useCallback(async () => {
    const { data } = await supabase.from('batches').select('batch_name');
    if (data) setBatches(data);
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('results')
        .select(`
          *,
          admissions!student_id (
            name,
            cnic,
            profile_picture
          )
        `)
        .eq('exam_type', filters.type)
        .order('total_marks', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [filters.type]);

  useEffect(() => {
    fetchBatches();
    fetchResults();
  }, [fetchBatches, fetchResults]);

  const filteredResults = results.filter(r => {
    const matchesBatch = filters.batch === 'all' || r.batch_id === filters.batch;
    const searchLower = filters.search.toLowerCase();
    const matchesSearch = !filters.search || 
                          r.admissions?.name?.toLowerCase().includes(searchLower) || 
                          r.admissions?.cnic?.includes(filters.search);
    return matchesBatch && matchesSearch;
  });

  const stats = {
    total: filteredResults.length,
    passed: filteredResults.filter(r => r.passed).length,
    average: filteredResults.length > 0 
      ? Math.round(filteredResults.reduce((a,b) => a+b.total_marks, 0) / filteredResults.length) 
      : 0,
    highest: filteredResults.length > 0 ? Math.max(...filteredResults.map(r => r.total_marks)) : 0
  };

  const handleBulkRecompute = async () => {
    if (!canMutate) {
      toast.error("You do not have permission to recompute results");
      return;
    }
    if (filters.batch === 'all') return toast.error("Please select a specific batch to recompute");
    setRecomputing(true);
    try {
      const { data: students } = await supabase.from('admissions').select('id').eq('batch', filters.batch).eq('status', 'Active');
      if (students) {
        const { computeAndCacheResult, updateBatchRanks } = await import('../utils/resultUtils');
        for (const s of students) {
          await computeAndCacheResult(s.id, filters.type, { updateRanks: false });
        }
        await updateBatchRanks(filters.batch, filters.type);
        await createBatchNotifications(students.map((student) => student.id), {
          role: 'student',
          type: 'result',
          title: 'Result Published',
          message: `${filters.type === 'midterm' ? 'Mid Term' : 'Final Term'} result has been published.`,
          link: `/student/results/${filters.type}`
        });
        toast.success(`Recomputed ${students.length} results for ${filters.batch}`);
        fetchResults();
      }
    } catch (err) {
      toast.error("Recomputation failed");
    } finally {
      setRecomputing(false);
    }
  };

  const handleExportCSV = () => {
    if (!filteredResults.length) {
      toast.error('No results to export');
      return;
    }
    const headers = [
      'Rank',
      'Student Name',
      'CNIC',
      'Batch',
      'Exam Type',
      'Attendance Marks',
      'Assignment Marks',
      'Quiz Marks',
      'Task Completion Marks',
      'Project Marks',
      'Total Marks',
      'Grade',
      'Passed/Status',
      'Last Sync'
    ];
    const rows = filteredResults.map((r) => [
      r.batch_rank ?? '',
      r.admissions?.name ?? '',
      r.admissions?.cnic ?? '',
      r.batch_id ?? '',
      r.exam_type ?? filters.type,
      r.attendance_marks ?? 0,
      r.assignment_marks ?? 0,
      r.quiz_marks ?? 0,
      r.task_completion_marks ?? 0,
      r.project_marks ?? 0,
      r.total_marks ?? 0,
      r.grade ?? '',
      r.passed ? 'PASS' : 'FAIL',
      r.computed_at ? new Date(r.computed_at).toLocaleString() : ''
    ]);
    const filename = `results-${filters.type}-${filters.batch}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(filename, headers, rows);
    toast.success('Results exported successfully');
  };

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>Exam Results</h2>
            <p style={{ color: '#888', marginTop: '5px' }}>Batch performance and individual student grades</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {canMutate && (
              <ActionButton onClick={handleBulkRecompute} disabled={recomputing}>
                <FaSync className={recomputing ? 'fa-spin' : ''} /> {recomputing ? 'Syncing...' : 'Force Batch Sync'}
              </ActionButton>
            )}
            <ActionButton $primary onClick={handleExportCSV}>
              <FaDownload /> Export CSV
            </ActionButton>
          </div>
        </Header>

        <StatsGrid>
          <StatCard>
            <h4>Students</h4>
            <div className="value">{stats.total}</div>
            <div className="sub" style={{ color: '#888' }}>Total graded</div>
          </StatCard>
          <StatCard>
            <h4>Passing Rate</h4>
            <div className="value" style={{ color: '#2ecc71' }}>{stats.total > 0 ? Math.round((stats.passed/stats.total)*100) : 0}%</div>
            <div className="sub">{stats.passed} students passed</div>
          </StatCard>
          <StatCard>
            <h4>Class Average</h4>
            <div className="value">{stats.average}</div>
            <div className="sub" style={{ color: '#888' }}>Marks out of 100</div>
          </StatCard>
          <StatCard>
            <h4>Highest Score</h4>
            <div className="value" style={{ color: '#f1c40f' }}>{stats.highest}</div>
            <div className="sub" style={{ color: '#888' }}>Top performer</div>
          </StatCard>
        </StatsGrid>

        <FilterCard>
          <Input 
            placeholder="Search student name or CNIC..." 
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
          />
          <Select value={filters.batch} onChange={e => setFilters({...filters, batch: e.target.value})}>
            <option value="all">All Batches</option>
            {batches.map(b => <option key={b.batch_name} value={b.batch_name}>{b.batch_name}</option>)}
          </Select>
          <Select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="midterm">Mid Term</option>
            <option value="finalterm">Final Term</option>
          </Select>
          <ActionButton onClick={fetchResults} style={{ height: '100%' }}>
            <FaSearch /> Search
          </ActionButton>
        </FilterCard>

        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : filteredResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', color: '#555', background: '#111318', borderRadius: '12px' }}>
            <FaExclamationCircle size={40} style={{ marginBottom: '15px' }} />
            <p>No results found for this selection.</p>
          </div>
        ) : (
          <TableCard>
            <Table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student Name</th>
                  <th>Batch</th>
                  <th>Total Marks</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '800', color: r.batch_rank <= 3 ? '#f1c40f' : '#666' }}>
                      #{r.batch_rank}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: '#fff' }}>{r.admissions?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#555' }}>{r.admissions?.cnic}</div>
                    </td>
                    <td>{r.batch_id}</td>
                    <td style={{ fontWeight: '700' }}>{r.total_marks} / 100</td>
                    <td style={{ fontWeight: '800' }}>{r.grade}</td>
                    <td>
                      <Badge $passed={r.passed}>{r.passed ? 'PASS' : 'FAIL'}</Badge>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#555' }}>
                      {new Date(r.computed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableCard>
        )}
      </Container>
    </AdminLayout>
  );
};

export default AdminResults;
