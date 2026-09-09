import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { 
  FaUserGraduate, FaSearch, FaPhone, FaEnvelope, FaIdCard, 
  FaUsers, FaGraduationCap, FaClock, FaCheckCircle, FaExclamationCircle
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { getAssignedTeacherBatches, getTeacherByCnic } from '../utils/teacherUtils';

const Container = styled.div`
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  h1 {
    margin: 0 0 6px;
    font-size: 1.8rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  p {
    margin: 0;
    color: #94a3b8;
    font-size: 0.9rem;
  }
`;

const BatchTabs = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  background: #111318;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const BatchTab = styled.button`
  padding: 9px 18px;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: ${p => p.$active ? '#7B1F2E' : 'transparent'};
  color: ${p => p.$active ? '#fff' : '#888'};
  transition: all 0.2s;

  &:hover {
    color: #fff;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;

  .icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(123, 31, 46, 0.15);
    color: #c94a5c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  div {
    small {
      display: block;
      color: #888;
      font-size: 0.76rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    strong {
      color: #f1f5f9;
      font-size: 1.35rem;
      font-weight: 800;
    }
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px 16px;

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 240px;
    color: #777;

    input {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 0.92rem;
      width: 100%;
      outline: none;
    }
  }
`;

const TableCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 760px;
  }

  th, td {
    padding: 14px 18px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  th {
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #777;
    background: rgba(255, 255, 255, 0.02);
  }

  td {
    font-size: 0.9rem;
    color: #ddd;

    strong {
      display: block;
      color: #fff;
      font-size: 0.95rem;
    }
    small {
      color: #888;
      font-size: 0.8rem;
    }
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.015);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  background: ${p => p.$status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'};
  color: ${p => p.$status === 'Active' ? '#10b981' : '#ef4444'};
`;

const ContactLinks = styled.div`
  display: flex;
  gap: 10px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #38bdf8;
    text-decoration: none;
    font-size: 0.82rem;
    background: rgba(56, 189, 248, 0.1);
    padding: 5px 10px;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      background: rgba(56, 189, 248, 0.2);
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #777;
  svg {
    font-size: 2.8rem;
    margin-bottom: 12px;
    opacity: 0.4;
  }
  h3 {
    color: #ddd;
    margin: 0 0 6px;
  }
  p {
    margin: 0;
  }
`;

export default function TeacherStudents() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadTeacherData = useCallback(async () => {
    if (!user?.cnic) return;
    setLoading(true);
    try {
      const teacher = await getTeacherByCnic(user.cnic);
      if (teacher?.id) {
        const assigned = await getAssignedTeacherBatches(teacher.id);
        setBatches(assigned);
        if (assigned.length > 0) {
          setSelectedBatch(assigned[0]);
        }
      }
    } catch (err) {
      console.error('Error loading teacher batches:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  useEffect(() => {
    if (!selectedBatch?.batch_name) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('admissions')
          .select('id, name, father_name, cnic, phone, email, course, batch, batch_timing, status, submitted_at, enrollment_type')
          .eq('batch', selectedBatch.batch_name)
          .eq('status', 'Active')
          .order('name', { ascending: true });

        if (!error && data) {
          setStudents(data);
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    };

    fetchStudents();
  }, [selectedBatch]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s => 
      s.name?.toLowerCase().includes(q) ||
      s.cnic?.includes(q) ||
      s.phone?.includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <DashboardLayout>
      <Container>
        <Header>
          <div>
            <h1><FaUserGraduate /> My Students</h1>
            <p>Class roster and enrolled students across your assigned course batches.</p>
          </div>
          {batches.length > 1 && (
            <BatchTabs>
              {batches.map(b => (
                <BatchTab 
                  key={b.id} 
                  $active={selectedBatch?.id === b.id}
                  onClick={() => setSelectedBatch(b)}
                >
                  {b.batch_name}
                </BatchTab>
              ))}
            </BatchTabs>
          )}
        </Header>

        {selectedBatch && (
          <StatsGrid>
            <StatCard>
              <div className="icon"><FaUsers /></div>
              <div>
                <small>Total Enrolled</small>
                <strong>{students.length}</strong>
              </div>
            </StatCard>
            <StatCard>
              <div className="icon"><FaGraduationCap /></div>
              <div>
                <small>Course Program</small>
                <strong style={{ fontSize: '1.05rem' }}>{selectedBatch.course}</strong>
              </div>
            </StatCard>
            <StatCard>
              <div className="icon"><FaClock /></div>
              <div>
                <small>Batch Schedule</small>
                <strong style={{ fontSize: '1.05rem' }}>
                  {selectedBatch.time_shift || selectedBatch.timing_label || 'Regular'}
                </strong>
              </div>
            </StatCard>
          </StatsGrid>
        )}

        <FilterBar>
          <div className="search-wrap">
            <FaSearch />
            <input 
              placeholder="Search students by name, CNIC, phone, or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </FilterBar>

        <TableCard>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>CNIC</th>
                <th>Contact</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id}>
                  <td>
                    <strong>{student.name}</strong>
                    {student.father_name && <small>S/D of {student.father_name}</small>}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {student.cnic}
                    </span>
                  </td>
                  <td>
                    <ContactLinks>
                      {student.phone && (
                        <a href={`tel:${student.phone}`} title="Call student">
                          <FaPhone /> {student.phone}
                        </a>
                      )}
                      {student.email && (
                        <a href={`mailto:${student.email}`} title="Email student">
                          <FaEnvelope /> Email
                        </a>
                      )}
                    </ContactLinks>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>
                      {student.enrollment_type === 're_enrollment' ? 'Re-enrollment' : 'Regular'}
                    </span>
                  </td>
                  <td>
                    <Badge $status={student.status}>
                      <FaCheckCircle /> {student.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!loading && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <EmptyState>
                      <FaUserGraduate />
                      <h3>No Students Found</h3>
                      <p>{search ? 'No students matched your search criteria.' : 'No active students enrolled in this batch yet.'}</p>
                    </EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>
      </Container>
    </DashboardLayout>
  );
}
