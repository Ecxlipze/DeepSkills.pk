import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';

import {
  FaSearch, FaFilter,
  FaEye, FaChevronLeft,
  FaChevronRight, FaFileCsv, FaUserGraduate, FaTimes
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../components/Skeleton';

const Container = styled.div`
  padding: 20px 0;
  color: #fff;
`;

const PageHeader = styled.div`
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }

  .title-block {
    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 5px;
      color: #fff;
      @media (max-width: 600px) { font-size: 1.5rem; }
    }
    p {
      color: #888;
      font-size: 0.95rem;
    }
  }
`;

const ExportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #7B1F2E;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const StatCard = styled.div`
  background: #111318;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 5px;

  .label {
    color: #888;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${props => props.color || '#fff'};
  }
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'active': return 'rgba(46, 204, 113, 0.1)';
      case 'graduated': return 'rgba(52, 152, 219, 0.1)';
      case 'dropped': return 'rgba(231, 76, 60, 0.1)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  color: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'active': return '#2ecc71';
      case 'graduated': return '#3498db';
      case 'dropped': return '#e74c3c';
      default: return '#888';
    }
  }};
`;

const Pagination = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

const PageBtn = styled.button`
  padding: 8px 12px;
  background: ${props => props.$active ? '#7B1F2E' : '#111'};
  color: #fff;
  border: 1px solid ${props => props.$active ? '#7B1F2E' : '#333'};
  border-radius: 6px;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { border-color: #7B1F2E; }
`;

const FilterSection = styled.div`
  background: #111318;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 20px;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
  gap: 15px;
  align-items: center;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InputWrapper = styled.div`
  position: relative;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #555;
    font-size: 0.9rem;
  }

  input, select {
    width: 100%;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px 12px 10px 35px;
    color: #fff;
    outline: none;
    transition: all 0.2s;

    &:focus {
      border-color: #7B1F2E;
      background: #000;
    }
  }

  select {
    padding-left: 35px;
    cursor: pointer;
  }
`;

const DateRangeWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input {
    flex: 1;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px;
    color: #fff;
    font-size: 0.85rem;
    outline: none;

    &::-webkit-calendar-picker-indicator {
      filter: invert(1);
      cursor: pointer;
    }
  }
`;

const ClearFilters = styled.button`
  background: none;
  border: none;
  color: #7B1F2E;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 5px 0;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 15px;

  &:hover { text-decoration: underline; }
`;

const TableContainer = styled.div`
  background: #111318;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th {
    padding: 15px 20px;
    background: rgba(255, 255, 255, 0.02);
    color: #888;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    white-space: nowrap;

    &:hover { color: #fff; }

    &.mobile-hide {
      @media (max-width: 1000px) { display: none; }
    }
  }

  td {
    padding: 15px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    vertical-align: middle;

    &.mobile-hide {
      @media (max-width: 1000px) { display: none; }
    }
  }

  tbody tr {
    transition: all 0.2s;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.02); }
  }
`;

const StudentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .avatar {
    width: 38px;
    height: 38px;
    background: #7B1F2E;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    color: #fff;
  }

  .details {
    .name { font-weight: 600; color: #fff; }
    .email { font-size: 0.8rem; color: #666; }
  }
`;

const StudentManager = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    course: 'All',
    batch: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: ''
  });

  const [sortConfig, setSortConfig] = useState({ key: 'submitted_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase
      .from('admissions')
      .select('*')
      .in('status', ['Active', 'Inactive', 'Graduated']);

    if (data) setStudents(data);
  }, []);

  const fetchCourses = useCallback(async () => {
    const { data } = await supabase.from('courses').select('title');
    if (data) setCourses(data);
  }, []);

  const fetchBatches = useCallback(async () => {
    const { data } = await supabase.from('batches').select('batch_name, course');
    if (data) setBatches(data);
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStudents(),
      fetchCourses(),
      fetchBatches()
    ]);
    setLoading(false);
  }, [fetchStudents, fetchCourses, fetchBatches]);

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchInitialData, fetchStudents]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const searchMatch = !filters.search ||
          s.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          s.cnic?.toLowerCase().includes(filters.search.toLowerCase()) ||
          s.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
          s.phone?.toLowerCase().includes(filters.search.toLowerCase());

        const courseMatch = filters.course === 'All' || s.course === filters.course;
        const batchMatch = filters.batch === 'All' || s.batch === filters.batch;
        const statusMatch = filters.status === 'All' || s.status === filters.status;

        const dateMatch = (!filters.dateFrom || new Date(s.submitted_at) >= new Date(filters.dateFrom)) &&
                          (!filters.dateTo || new Date(s.submitted_at) <= new Date(filters.dateTo));

        return searchMatch && courseMatch && batchMatch && statusMatch && dateMatch;
      })
      .sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [students, filters, sortConfig]);

  const stats = useMemo(() => {
    return {
      total: students.length,
      active: students.filter(s => s.status === 'Active').length,
      inactive: students.filter(s => s.status === 'Inactive').length
    };
  }, [students]);

  const paginatedStudents = filteredStudents.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);

  const exportCSV = () => {
    const headers = ["Name", "Email", "CNIC", "Phone", "Course", "Batch", "Status", "Enrolled Date"];
    const rows = filteredStudents.map(s => [
      s.name, s.email, s.cnic, s.phone, s.course, s.batch, s.status, new Date(s.submitted_at).toLocaleDateString()
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AdminLayout>
      <Container>
        <PageHeader>
          <div className="title-block">
            <h1>Students</h1>
            <p>All enrolled students across batches</p>
          </div>
          <ExportBtn onClick={exportCSV}>
            <FaFileCsv /> Export CSV
          </ExportBtn>
        </PageHeader>

        <StatsGrid>
          <StatCard>
            <span className="label">Total Students</span>
            <span className="value">{stats.total}</span>
          </StatCard>
          <StatCard color="#2ecc71">
            <span className="label">Active</span>
            <span className="value">{stats.active}</span>
          </StatCard>
          <StatCard color="#9ca3af">
            <span className="label">Inactive</span>
            <span className="value">{stats.inactive}</span>
          </StatCard>
        </StatsGrid>

        <FilterSection>
          <FilterGrid>
            <InputWrapper>
              <FaSearch />
              <input
                type="text"
                placeholder="Search name, cnic, email, phone..."
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </InputWrapper>

            <InputWrapper>
              <FaUserGraduate />
              <select value={filters.course} onChange={e => setFilters({...filters, course: e.target.value, batch: 'All'})}>
                <option value="All">All Courses</option>
                {courses.map((c, i) => <option key={i} value={c.title}>{c.title}</option>)}
              </select>
            </InputWrapper>

            <InputWrapper>
              <FaFilter />
              <select value={filters.batch} onChange={e => setFilters({...filters, batch: e.target.value})}>
                <option value="All">All Batches</option>
                {batches
                  .filter(b => filters.course === 'All' || b.course === filters.course)
                  .map((b, i) => <option key={i} value={b.batch_name}>{b.batch_name}</option>)}
              </select>
            </InputWrapper>

            <InputWrapper>
              <FaFilter />
              <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Graduated">Graduated</option>
              </select>
            </InputWrapper>

            <DateRangeWrapper>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
              <span style={{ color: '#555' }}>&rarr;</span>
              <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
            </DateRangeWrapper>
          </FilterGrid>

          {(filters.search || filters.course !== 'All' || filters.batch !== 'All' || filters.status !== 'All' || filters.dateFrom || filters.dateTo) && (
            <ClearFilters onClick={() => setFilters({ search: '', course: 'All', batch: 'All', status: 'All', dateFrom: '', dateTo: '' })}>
              <FaTimes /> Clear all filters
            </ClearFilters>
          )}
        </FilterSection>

        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>Student</th>
                <th className="mobile-hide" onClick={() => handleSort('cnic')}>CNIC</th>
                <th className="mobile-hide" onClick={() => handleSort('phone')}>Phone</th>
                <th onClick={() => handleSort('course')}>Course</th>
                <th className="mobile-hide" onClick={() => handleSort('batch')}>Batch</th>
                <th className="mobile-hide" onClick={() => handleSort('education')}>Education</th>
                <th className="mobile-hide" onClick={() => handleSort('submitted_at')}>Enrolled On</th>
                <th onClick={() => handleSort('status')}>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton height="30px" width="150px" /></td>
                    <td className="mobile-hide"><Skeleton height="20px" width="100px" /></td>
                    <td className="mobile-hide"><Skeleton height="20px" width="100px" /></td>
                    <td><Skeleton height="20px" width="120px" /></td>
                    <td className="mobile-hide"><Skeleton height="20px" width="80px" /></td>
                    <td className="mobile-hide"><Skeleton height="20px" width="100px" /></td>
                    <td className="mobile-hide"><Skeleton height="20px" width="100px" /></td>
                    <td><Skeleton height="24px" width="60px" radius="12px" /></td>
                    <td><Skeleton height="30px" width="30px" /></td>
                  </tr>
                ))
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '100px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔍</div>
                    <h3 style={{ color: '#fff', marginBottom: '10px' }}>No students found</h3>
                    <p style={{ color: '#666' }}>Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(student => (
                  <tr key={student.id} onClick={() => navigate(`/admin/management/students/${student.id}`)}>
                    <td>
                      <StudentInfo>
                        <div className="avatar">{getInitials(student.name)}</div>
                        <div className="details">
                          <div className="name">{student.name}</div>
                          <div className="email">{student.email}</div>
                          {/* Mobile-only info */}
                          <div className="mobile-only" style={{ display: 'none' }}>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>{student.phone}</span>
                          </div>
                        </div>
                      </StudentInfo>
                      <style>{`
                        @media (max-width: 1000px) {
                          .mobile-only { display: block !important; }
                        }
                      `}</style>
                    </td>
                    <td className="mobile-hide"><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '4px' }}>{student.cnic}</code></td>
                    <td className="mobile-hide">{student.phone}</td>
                    <td>
                      <div>{student.course}</div>
                      <div className="mobile-only" style={{ display: 'none', fontSize: '0.75rem', color: '#666' }}>{student.batch}</div>
                    </td>
                    <td className="mobile-hide">
                      <div>{student.batch}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{student.batch_timing}</div>
                    </td>
                    <td className="mobile-hide">{student.education}</td>
                    <td className="mobile-hide">{new Date(student.submitted_at).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge $status={student.status}>
                        {student.status}
                      </StatusBadge>
                    </td>
                    <td>
                      <PageBtn onClick={(e) => { e.stopPropagation(); navigate(`/admin/management/students/${student.id}`); }}>
                        <FaEye />
                      </PageBtn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <Pagination>
              <div className="info">
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div className="controls">
                <PageBtn disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                  <FaChevronLeft />
                </PageBtn>
                {[...Array(totalPages)].map((_, i) => (
                  <PageBtn
                    key={i}
                    $active={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </PageBtn>
                ))}
                <PageBtn disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                  <FaChevronRight />
                </PageBtn>
              </div>
            </Pagination>
          )}
        </TableContainer>
      </Container>
    </AdminLayout>
  );
};

export default StudentManager;
