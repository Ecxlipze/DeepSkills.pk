import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { 
  FaCalendarCheck, FaCalendarAlt, FaCheck, FaTimes, FaClock, 
  FaUserCheck, FaUserTimes, FaExclamationTriangle, FaSearch,
  FaChevronLeft, FaChevronRight, FaCommentAlt, FaUndo
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { getAssignedTeacherBatches, getTeacherByCnic } from '../utils/teacherUtils';
import DatePicker from '../components/DatePicker';

const Container = styled.div`
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 1200px;
  margin: 0 auto;
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

const ControlsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 20px;
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;

  label {
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #888;
    letter-spacing: 0.4px;
    display: block;
    margin-bottom: 4px;
  }

  select {
    background: #181b22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 0.9rem;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #7B1F2E;
    }
  }
`;

const DateNavWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const DateNavBtn = styled.button`
  background: #181b22;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;

    &.present:hover {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #10b981;
    }

    &.absent:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #ef4444;
    }
  }
`;

const FilterSearchRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: #0d0f14;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 10px 16px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 6px 12px;
  gap: 8px;
  min-width: 240px;

  input {
    background: none;
    border: none;
    outline: none;
    color: #fff;
    font-size: 0.85rem;
    width: 100%;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }
  }
`;

const FilterPills = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const FilterPillBtn = styled.button`
  background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.04)'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.6)'};
  border: 1px solid ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.08)'};
  border-radius: 50px;
  padding: 4px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.08)'};
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
`;

const StatMini = styled.div`
  background: #111318;
  border: 1px solid ${p => p.$color || 'rgba(255,255,255,0.06)'};
  border-radius: 12px;
  padding: 14px 16px;

  small {
    display: block;
    color: #888;
    font-size: 0.74rem;
    text-transform: uppercase;
    font-weight: 700;
  }
  strong {
    display: block;
    font-size: 1.4rem;
    font-weight: 800;
    color: ${p => p.$textColor || '#fff'};
    margin-top: 2px;
  }
`;

const StudentListCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 720px;
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
    font-size: 0.92rem;
    vertical-align: middle;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.015);
  }
`;

const HealthPill = styled.span`
  padding: 3px 8px;
  border-radius: 50px;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  ${({ $rate }) => {
    if ($rate >= 80) return 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';
    if ($rate >= 60) return 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);';
    return 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);';
  }}
`;

const StatusButtonGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const StatusBtn = styled.button`
  border: 1px solid ${p => {
    if (p.$active && p.$type === 'Present') return '#10b981';
    if (p.$active && p.$type === 'Late') return '#f59e0b';
    if (p.$active && p.$type === 'Absent') return '#ef4444';
    return 'rgba(255, 255, 255, 0.08)';
  }};
  background: ${p => {
    if (p.$active && p.$type === 'Present') return 'rgba(16, 185, 129, 0.2)';
    if (p.$active && p.$type === 'Late') return 'rgba(245, 158, 11, 0.2)';
    if (p.$active && p.$type === 'Absent') return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(255, 255, 255, 0.03)';
  }};
  color: ${p => {
    if (p.$active && p.$type === 'Present') return '#10b981';
    if (p.$active && p.$type === 'Late') return '#f59e0b';
    if (p.$active && p.$type === 'Absent') return '#ef4444';
    return '#888';
  }};
  padding: 6px 14px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;

  &:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const RemarkTag = styled.button`
  background: none;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.6);
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    border-color: #ff4d6d;
    color: #fff;
  }
`;

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [historicalAttendance, setHistoricalAttendance] = useState({}); // student_id -> { total, presents }
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Present' | 'Late' | 'Absent' | 'Unmarked'

  // 1. Load Teacher info and assigned batches
  useEffect(() => {
    if (!user?.cnic) return;
    const fetchTeacher = async () => {
      setLoading(true);
      try {
        const t = await getTeacherByCnic(user.cnic);
        setTeacher(t);
        if (t?.id) {
          const assigned = await getAssignedTeacherBatches(t.id);
          setBatches(assigned);
          if (assigned.length > 0) {
            setSelectedBatch(assigned[0]);
          }
        }
      } catch (err) {
        console.error('Error loading teacher:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacher();
  }, [user]);

  // 2. Load students, historical rates, and today's attendance
  const loadBatchAttendance = useCallback(async () => {
    if (!selectedBatch?.batch_name) return;

    try {
      // Fetch active batch students
      const { data: studs, error: studErr } = await supabase
        .from('admissions')
        .select('id, name, cnic, course, batch')
        .eq('batch', selectedBatch.batch_name)
        .eq('status', 'Active')
        .order('name', { ascending: true });

      if (studErr) throw studErr;
      setStudents(studs || []);

      // Fetch existing attendance records for this date
      const { data: atts, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate)
        .or(`batch_id.eq.${selectedBatch.id},batch_name.eq.${selectedBatch.batch_name}`);

      if (!attErr && atts) {
        const map = {};
        atts.forEach(a => {
          map[a.student_id || a.student_cnic] = a;
        });
        setAttendanceRecords(map);
      }

      // Fetch historical attendance stats for all batch students to calculate overall attendance rates
      const { data: histData } = await supabase
        .from('attendance')
        .select('student_id, student_cnic, status')
        .or(`batch_id.eq.${selectedBatch.id},batch_name.eq.${selectedBatch.batch_name}`);

      if (histData) {
        const counts = {};
        histData.forEach(row => {
          const key = row.student_id || row.student_cnic;
          if (!counts[key]) counts[key] = { total: 0, present: 0 };
          counts[key].total += 1;
          const st = (row.status || '').toLowerCase();
          if (st === 'present' || st === 'late') counts[key].present += 1;
        });
        setHistoricalAttendance(counts);
      }
    } catch (err) {
      console.error('Error fetching batch attendance:', err);
    }
  }, [selectedBatch, selectedDate]);

  useEffect(() => {
    loadBatchAttendance();
  }, [loadBatchAttendance]);

  // Quick date jump
  const shiftDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const dateStr = current.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr <= todayStr) {
      setSelectedDate(dateStr);
    } else {
      toast.error("Cannot mark attendance for future dates.");
    }
  };

  // 3. Mark or Update Attendance
  const markStatus = async (student, status, reason = null) => {
    const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
    const existing = attendanceRecords[student.id] || attendanceRecords[student.cnic];

    const payload = {
      student_id: student.id,
      student_name: student.name,
      student_cnic: student.cnic,
      batch_id: selectedBatch.id,
      batch_name: selectedBatch.batch_name,
      course: selectedBatch.course,
      date: selectedDate,
      status: status, // Capitalized: 'Present', 'Late', 'Absent'
      marked_by: teacher?.name || user?.name || 'Teacher',
      marked_at: new Date().toISOString(),
      day_of_week: dayOfWeek,
      teacher_id: teacher?.id || null
    };

    if (reason !== null) {
      payload.override_reason = reason;
    }

    // Optimistic UI update
    setAttendanceRecords(prev => ({
      ...prev,
      [student.id]: { ...existing, ...payload }
    }));

    try {
      if (existing?.id) {
        const { error } = await supabase
          .from('attendance')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('attendance')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setAttendanceRecords(prev => ({ ...prev, [student.id]: data }));
        }
      }
      toast.success(`${student.name}: ${status}`, { id: `att-${student.id}`, duration: 1200 });
    } catch (err) {
      toast.error('Failed to update attendance');
      console.error(err);
      loadBatchAttendance();
    }
  };

  // 4. Batch Actions
  const markAll = async (status) => {
    if (students.length === 0) return;
    const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });

    const rows = students.map(student => ({
      student_id: student.id,
      student_name: student.name,
      student_cnic: student.cnic,
      batch_id: selectedBatch.id,
      batch_name: selectedBatch.batch_name,
      course: selectedBatch.course,
      date: selectedDate,
      status: status,
      marked_by: teacher?.name || user?.name || 'Teacher',
      marked_at: new Date().toISOString(),
      day_of_week: dayOfWeek,
      teacher_id: teacher?.id || null
    }));

    try {
      await supabase
        .from('attendance')
        .delete()
        .eq('date', selectedDate)
        .or(`batch_id.eq.${selectedBatch.id},batch_name.eq.${selectedBatch.batch_name}`);

      const { error } = await supabase
        .from('attendance')
        .insert(rows);

      if (error) throw error;
      toast.success(`Marked all ${students.length} students as ${status}!`);
      loadBatchAttendance();
    } catch (err) {
      toast.error('Batch attendance update failed');
      console.error(err);
    }
  };

  // 5. Calculations (Case-Insensitive)
  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let unmarked = 0;

    students.forEach(s => {
      const record = attendanceRecords[s.id] || attendanceRecords[s.cnic];
      const st = (record?.status || '').toLowerCase();
      if (st === 'present') present++;
      else if (st === 'late') late++;
      else if (st === 'absent') absent++;
      else unmarked++;
    });

    const rate = students.length > 0 ? Math.round(((present + late) / students.length) * 100) : 0;
    return { present, late, absent, unmarked, total: students.length, rate };
  }, [students, attendanceRecords]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const record = attendanceRecords[s.id] || attendanceRecords[s.cnic];
      const st = (record?.status || 'unmarked').toLowerCase();

      // Status filter
      if (statusFilter === 'Present' && st !== 'present') return false;
      if (statusFilter === 'Late' && st !== 'late') return false;
      if (statusFilter === 'Absent' && st !== 'absent') return false;
      if (statusFilter === 'Unmarked' && st !== 'unmarked' && record?.status) return false;

      // Keyword search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchCnic = s.cnic?.toLowerCase().includes(q);
        return matchName || matchCnic;
      }
      return true;
    });
  }, [students, attendanceRecords, statusFilter, searchTerm]);

  const todayString = new Date().toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <Container>
        <Header>
          <div>
            <h1><FaCalendarCheck /> Attendance Register</h1>
            <p>Track, mark, and override daily class attendance for your assigned student cohorts.</p>
          </div>
        </Header>

        <ControlsBar>
          <ControlGroup>
            {batches.length > 0 && (
              <div>
                <label>Active Batch</label>
                <select 
                  value={selectedBatch?.id || ''} 
                  onChange={(e) => {
                    const found = batches.find(b => b.id === e.target.value);
                    if (found) setSelectedBatch(found);
                  }}
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name} — {b.course}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label>Attendance Date</label>
              <DateNavWrap>
                <DateNavBtn type="button" onClick={() => shiftDate(-1)} title="Previous Day">
                  <FaChevronLeft size={10} />
                </DateNavBtn>
                <DatePicker 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  max={todayString}
                  aria-label="Select Date"
                />
                <DateNavBtn 
                  type="button" 
                  onClick={() => shiftDate(1)} 
                  disabled={selectedDate === todayString}
                  title="Next Day"
                  style={{ opacity: selectedDate === todayString ? 0.4 : 1 }}
                >
                  <FaChevronRight size={10} />
                </DateNavBtn>
                {selectedDate !== todayString && (
                  <DateNavBtn type="button" onClick={() => setSelectedDate(todayString)}>
                    Today
                  </DateNavBtn>
                )}
              </DateNavWrap>
            </div>
          </ControlGroup>

          <QuickActions>
            <button className="present" onClick={() => markAll('Present')}>
              <FaUserCheck /> Mark All Present
            </button>
            <button className="absent" onClick={() => markAll('Absent')}>
              <FaUserTimes /> Mark All Absent
            </button>
          </QuickActions>
        </ControlsBar>

        {/* Stats Row */}
        <StatsRow>
          <StatMini>
            <small>Total Students</small>
            <strong>{stats.total}</strong>
          </StatMini>
          <StatMini $color="rgba(16, 185, 129, 0.3)" $textColor="#10b981">
            <small>Present Today</small>
            <strong>{stats.present}</strong>
          </StatMini>
          <StatMini $color="rgba(245, 158, 11, 0.3)" $textColor="#f59e0b">
            <small>Late Arrivals</small>
            <strong>{stats.late}</strong>
          </StatMini>
          <StatMini $color="rgba(239, 68, 68, 0.3)" $textColor="#ef4444">
            <small>Absent</small>
            <strong>{stats.absent}</strong>
          </StatMini>
          <StatMini>
            <small>Attendance Rate</small>
            <strong style={{ color: stats.rate >= 80 ? '#10b981' : stats.rate >= 60 ? '#f59e0b' : '#ef4444' }}>
              {stats.rate}%
            </strong>
          </StatMini>
        </StatsRow>

        {/* Search & Filter Bar */}
        <FilterSearchRow>
          <SearchBox>
            <FaSearch size={12} color="rgba(255,255,255,0.4)" />
            <input 
              type="text" 
              placeholder="Search students by name or CNIC..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </SearchBox>

          <FilterPills>
            {['All', 'Present', 'Late', 'Absent', 'Unmarked'].map(f => (
              <FilterPillBtn
                key={f}
                $active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
              >
                {f} {f === 'All' ? `(${students.length})` :
                     f === 'Present' ? `(${stats.present})` :
                     f === 'Late' ? `(${stats.late})` :
                     f === 'Absent' ? `(${stats.absent})` :
                     `(${stats.unmarked})`}
              </FilterPillBtn>
            ))}
          </FilterPills>
        </FilterSearchRow>

        {/* Students Register Table */}
        <StudentListCard>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>CNIC</th>
                <th>Course Attendance Health</th>
                <th>Mark Status</th>
                <th>Remarks / Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const rec = attendanceRecords[student.id] || attendanceRecords[student.cnic];
                const rawStatus = (rec?.status || '').toLowerCase();
                
                // Historical rate for this student
                const hist = historicalAttendance[student.id] || historicalAttendance[student.cnic] || { total: 0, present: 0 };
                const studentRate = hist.total > 0 ? Math.round((hist.present / hist.total) * 100) : 100;

                return (
                  <tr key={student.id}>
                    <td>
                      <strong style={{ color: '#fff' }}>{student.name}</strong>
                    </td>
                    <td>
                      <small style={{ color: '#888', fontFamily: 'monospace' }}>{student.cnic}</small>
                    </td>
                    <td>
                      <HealthPill $rate={studentRate}>
                        {studentRate}% ({hist.present}/{hist.total} classes)
                      </HealthPill>
                    </td>
                    <td>
                      <StatusButtonGroup>
                        <StatusBtn 
                          $type="Present" 
                          $active={rawStatus === 'present'}
                          onClick={() => markStatus(student, 'Present')}
                        >
                          <FaCheck /> Present
                        </StatusBtn>
                        <StatusBtn 
                          $type="Late" 
                          $active={rawStatus === 'late'}
                          onClick={() => markStatus(student, 'Late')}
                        >
                          <FaClock /> Late
                        </StatusBtn>
                        <StatusBtn 
                          $type="Absent" 
                          $active={rawStatus === 'absent'}
                          onClick={() => markStatus(student, 'Absent')}
                        >
                          <FaTimes /> Absent
                        </StatusBtn>
                      </StatusButtonGroup>
                    </td>
                    <td>
                      {rec?.override_reason ? (
                        <span 
                          onClick={() => {
                            const newReason = prompt("Edit remarks for " + student.name + ":", rec.override_reason);
                            if (newReason !== null) {
                              markStatus(student, rec.status || 'Present', newReason.trim());
                            }
                          }}
                          style={{ color: '#ff8a99', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Click to edit reason"
                        >
                          <FaCommentAlt size={10} /> {rec.override_reason}
                        </span>
                      ) : (
                        <RemarkTag
                          onClick={() => {
                            const reason = prompt("Add note / reason for " + student.name + " (e.g. sick leave, traffic delay):");
                            if (reason) {
                              markStatus(student, rec?.status || 'Present', reason.trim());
                            }
                          }}
                        >
                          + Add Note
                        </RemarkTag>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#777' }}>
                    No students match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </StudentListCard>
      </Container>
    </DashboardLayout>
  );
}
