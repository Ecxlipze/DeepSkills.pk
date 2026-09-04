import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { 
  FaCalendarCheck, FaCalendarAlt, FaCheck, FaTimes, FaClock, 
  FaUserCheck, FaUserTimes, FaExclamationTriangle, FaSearch
} from 'react-icons/fa';
import toast from 'react-hot-toast';
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
  gap: 12px;
  flex-wrap: wrap;

  label {
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #888;
    letter-spacing: 0.4px;
  }

  input[type="date"] {
    background: #181b22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    color-scheme: dark;
    padding: 9px 14px;
    border-radius: 9px;
    font-size: 0.92rem;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #10b981;
    }
  }

  select {
    background: #181b22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 9px 14px;
    border-radius: 9px;
    font-size: 0.92rem;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #10b981;
    }

    option {
      background: #181b22;
      color: #fff;
    }
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;

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
    min-width: 680px;
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
    strong {
      display: block;
      color: #fff;
    }
    small {
      color: #777;
      font-family: monospace;
    }
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.015);
  }
`;

const StatusButtonGroup = styled.div`
  display: flex;
  gap: 6px;
`;

const StatusBtn = styled.button`
  border: 1px solid ${p => {
    if (p.$active && p.$type === 'present') return '#10b981';
    if (p.$active && p.$type === 'late') return '#f59e0b';
    if (p.$active && p.$type === 'absent') return '#ef4444';
    return 'rgba(255, 255, 255, 0.08)';
  }};
  background: ${p => {
    if (p.$active && p.$type === 'present') return 'rgba(16, 185, 129, 0.2)';
    if (p.$active && p.$type === 'late') return 'rgba(245, 158, 11, 0.2)';
    if (p.$active && p.$type === 'absent') return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(255, 255, 255, 0.03)';
  }};
  color: ${p => {
    if (p.$active && p.$type === 'present') return '#10b981';
    if (p.$active && p.$type === 'late') return '#f59e0b';
    if (p.$active && p.$type === 'absent') return '#ef4444';
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

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);

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

  // 2. Load students and today's attendance for the selected batch
  const loadBatchAttendance = useCallback(async () => {
    if (!selectedBatch?.batch_name) return;

    try {
      // Fetch batch students
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
    } catch (err) {
      console.error('Error fetching batch attendance:', err);
    }
  }, [selectedBatch, selectedDate]);

  useEffect(() => {
    loadBatchAttendance();
  }, [loadBatchAttendance]);

  // 3. Mark or Update Attendance
  const markStatus = async (student, status) => {
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
      status,
      marked_by: teacher?.name || user?.name || 'Teacher',
      marked_at: new Date().toISOString(),
      day_of_week: dayOfWeek,
      teacher_id: teacher?.id || null
    };

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
      toast.success(`${student.name}: ${status.toUpperCase()}`, { id: `att-${student.id}`, duration: 1500 });
    } catch (err) {
      toast.error('Failed to update attendance');
      console.error(err);
      loadBatchAttendance(); // Revert on failure
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
      status,
      marked_by: teacher?.name || user?.name || 'Teacher',
      marked_at: new Date().toISOString(),
      day_of_week: dayOfWeek,
      teacher_id: teacher?.id || null
    }));

    try {
      // Upsert by deleting existing for this date/batch and re-inserting
      await supabase
        .from('attendance')
        .delete()
        .eq('date', selectedDate)
        .or(`batch_id.eq.${selectedBatch.id},batch_name.eq.${selectedBatch.batch_name}`);

      const { data, error } = await supabase
        .from('attendance')
        .insert(rows)
        .select();

      if (error) throw error;
      toast.success(`Marked all as ${status.toUpperCase()}`);
      loadBatchAttendance();
    } catch (err) {
      toast.error('Batch attendance update failed');
      console.error(err);
    }
  };

  // 5. Calculations
  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let unmarked = 0;

    students.forEach(s => {
      const record = attendanceRecords[s.id] || attendanceRecords[s.cnic];
      if (record?.status === 'present') present++;
      else if (record?.status === 'late') late++;
      else if (record?.status === 'absent') absent++;
      else unmarked++;
    });

    const rate = students.length > 0 ? Math.round(((present + late) / students.length) * 100) : 0;
    return { present, late, absent, unmarked, total: students.length, rate };
  }, [students, attendanceRecords]);

  return (
    <DashboardLayout>
      <Container>
        <Header>
          <div>
            <h1><FaCalendarCheck /> Attendance Register</h1>
            <p>Track, mark, and override daily class attendance for your assigned batches.</p>
          </div>
        </Header>

        <ControlsBar>
          <ControlGroup>
            <div>
              <label>Select Date</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
            {batches.length > 0 && (
              <div>
                <label>Batch</label>
                <select 
                  value={selectedBatch?.id || ''} 
                  onChange={(e) => {
                    const found = batches.find(b => b.id === e.target.value);
                    if (found) setSelectedBatch(found);
                  }}
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batch_name}</option>
                  ))}
                </select>
              </div>
            )}
          </ControlGroup>

          <QuickActions>
            <button className="present" onClick={() => markAll('present')}>
              <FaUserCheck /> Mark All Present
            </button>
            <button className="absent" onClick={() => markAll('absent')}>
              <FaUserTimes /> Mark All Absent
            </button>
          </QuickActions>
        </ControlsBar>

        <StatsRow>
          <StatMini>
            <small>Total Students</small>
            <strong>{stats.total}</strong>
          </StatMini>
          <StatMini $color="rgba(16, 185, 129, 0.3)" $textColor="#10b981">
            <small>Present</small>
            <strong>{stats.present}</strong>
          </StatMini>
          <StatMini $color="rgba(245, 158, 11, 0.3)" $textColor="#f59e0b">
            <small>Late</small>
            <strong>{stats.late}</strong>
          </StatMini>
          <StatMini $color="rgba(239, 68, 68, 0.3)" $textColor="#ef4444">
            <small>Absent</small>
            <strong>{stats.absent}</strong>
          </StatMini>
          <StatMini>
            <small>Attendance Rate</small>
            <strong style={{ color: stats.rate >= 75 ? '#10b981' : stats.rate >= 50 ? '#f59e0b' : '#ef4444' }}>
              {stats.rate}%
            </strong>
          </StatMini>
        </StatsRow>

        <StudentListCard>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>CNIC</th>
                <th>Mark Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const rec = attendanceRecords[student.id] || attendanceRecords[student.cnic];
                const currentStatus = rec?.status;
                return (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.name}</strong>
                    </td>
                    <td>
                      <small>{student.cnic}</small>
                    </td>
                    <td>
                      <StatusButtonGroup>
                        <StatusBtn 
                          $type="present" 
                          $active={currentStatus === 'present'}
                          onClick={() => markStatus(student, 'present')}
                        >
                          <FaCheck /> Present
                        </StatusBtn>
                        <StatusBtn 
                          $type="late" 
                          $active={currentStatus === 'late'}
                          onClick={() => markStatus(student, 'late')}
                        >
                          <FaClock /> Late
                        </StatusBtn>
                        <StatusBtn 
                          $type="absent" 
                          $active={currentStatus === 'absent'}
                          onClick={() => markStatus(student, 'absent')}
                        >
                          <FaTimes /> Absent
                        </StatusBtn>
                      </StatusButtonGroup>
                    </td>
                  </tr>
                );
              })}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#777' }}>
                    No students currently assigned to this batch.
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
