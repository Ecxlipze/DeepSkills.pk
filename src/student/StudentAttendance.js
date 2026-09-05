import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  FaCalendarCheck, FaClock, FaTimesCircle, FaCheckCircle,
  FaExclamationTriangle, FaListUl
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';

const Container = styled.div`
  padding: 20px 0;
  color: #fff;
`;

const Header = styled.div`
  margin-bottom: 30px;
  h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 5px; }
  p { color: #888; font-size: 1rem; }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`;

const StatCard = styled.div`
  background: #111318; padding: 25px; border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column; gap: 8px;

  .icon { font-size: 1.5rem; margin-bottom: 5px; color: ${props => props.$color || '#378ADD'}; }
  .label { color: #666; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .value { font-size: 1.8rem; font-weight: 800; color: #fff; }
`;

const MainGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const ProgressHero = styled.div`
  background: #111318; padding: 40px; border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
`;

const CircularProgress = styled.div`
  position: relative; width: 180px; height: 180px; margin-bottom: 25px;
  
  svg { transform: rotate(-90deg); width: 100%; height: 100%; }
  circle {
    fill: none; stroke-width: 12; stroke-linecap: round;
    &.bg { stroke: rgba(255, 255, 255, 0.03); }
    &.progress { 
      stroke: ${props => props.$pct >= 80 ? '#2ecc71' : props.$pct >= 60 ? '#f1c40f' : '#e74c3c'};
      stroke-dasharray: 527; // 2 * pi * 84
      stroke-dashoffset: ${props => 527 - (527 * props.$pct) / 100};
      transition: stroke-dashoffset 1s ease-out;
    }
  }
  .text {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    span { font-size: 2.2rem; font-weight: 800; }
  }
`;

const HeatmapCard = styled.div`
  background: #111318; padding: 30px; border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const CalendarGrid = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;
  margin-top: 20px;
`;

const CalendarDay = styled.div`
  aspect-ratio: 1; border-radius: 10px; display: flex; align-items: center;
  justify-content: center; font-size: 0.9rem; font-weight: 700;
  background: ${props => 
    props.$status === 'present' ? 'rgba(46, 204, 113, 0.2)' : 
    props.$status === 'absent' ? 'rgba(231, 76, 60, 0.2)' : 
    props.$status === 'late' ? 'rgba(241, 196, 15, 0.2)' : 
    'rgba(255, 255, 255, 0.02)'};
  color: ${props => 
    props.$status === 'present' ? '#2ecc71' : 
    props.$status === 'absent' ? '#e74c3c' : 
    props.$status === 'late' ? '#f1c40f' : 
    '#333'};
  border: 1px solid ${props => 
    props.$status === 'present' ? 'rgba(46, 204, 113, 0.3)' : 
    props.$status === 'absent' ? 'rgba(231, 76, 60, 0.3)' : 
    props.$status === 'late' ? 'rgba(241, 196, 15, 0.3)' : 
    'rgba(255, 255, 255, 0.05)'};
`;

const WarningBanner = styled.div`
  margin-top: 20px; padding: 15px 20px; border-radius: 12px;
  background: rgba(231, 76, 60, 0.1); color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.2);
  display: flex; align-items: center; gap: 12px; font-size: 0.85rem;
  text-align: left;
`;

const HistorySection = styled.div`
  margin-top: 40px;
`;

const HistoryTable = styled.table`
  width: 100%; border-collapse: collapse; text-align: left;
  th { padding: 15px; color: #555; font-size: 0.8rem; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05); }
  td { padding: 18px 15px; border-bottom: 1px solid rgba(255,255,255,0.02); }
`;

const StatusBadge = styled.span`
  padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
  background: ${props => 
    props.$status === 'present' ? 'rgba(46, 204, 113, 0.1)' : 
    props.$status === 'absent' ? 'rgba(231, 76, 60, 0.1)' : 
    'rgba(241, 196, 15, 0.1)'};
  color: ${props => 
    props.$status === 'present' ? '#2ecc71' : 
    props.$status === 'absent' ? '#e74c3c' : 
    '#f1c40f'};
`;

const StudentAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const { data: studentRows, error: studentError } = await supabase
          .from('admissions')
          .select('id')
          .eq('cnic', user.cnic)
          .in('status', ['Active', 'Graduated'])
          .order('submitted_at', { ascending: false })
          .limit(1);

        if (studentError) throw studentError;
        const student = studentRows?.[0];
        if (!student) return;

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });
        
        if (error) throw error;
        setRecords(data || []);
      } catch (err) {
        toast.error("Error loading attendance records");
      } finally {
        setLoading(false);
      }
    };
    if (user?.cnic) fetchAttendance();
  }, [user]);

  const filteredRecords = useMemo(
    () => records.filter(r => r.date?.startsWith(filterMonth)),
    [records, filterMonth]
  );

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter(r => r.status === 'present').length;
    const absent = filteredRecords.filter(r => r.status === 'absent').length;
    const late = filteredRecords.filter(r => r.status === 'late').length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    
    return { total, present, absent, late, pct };
  }, [filteredRecords]);

  // Group records by date for heatmap
  const recordMap = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => { map[r.date] = r.status; });
    return map;
  }, [filteredRecords]);

  const daysInMonth = useMemo(() => {
    const [year, month] = filterMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [filterMonth]);

  return (
    <DashboardLayout>
      <Container>
        <Header>
          <h1>My Attendance</h1>
          <p>Track your presence and maintain your academic record</p>
        </Header>

        <StatsRow>
          <StatCard $color="#378ADD">
            <FaListUl className="icon" />
            <div className="label">Total Classes</div>
            <div className="value">{stats.total}</div>
          </StatCard>
          <StatCard $color="#2ecc71">
            <FaCheckCircle className="icon" />
            <div className="label">Days Present</div>
            <div className="value">{stats.present}</div>
          </StatCard>
          <StatCard $color="#e74c3c">
            <FaTimesCircle className="icon" />
            <div className="label">Days Absent</div>
            <div className="value">{stats.absent}</div>
          </StatCard>
          <StatCard $color="#f1c40f">
            <FaClock className="icon" />
            <div className="label">Days Late</div>
            <div className="value">{stats.late}</div>
          </StatCard>
        </StatsRow>

        <MainGrid>
          <ProgressHero>
            <CircularProgress $pct={stats.pct}>
              <svg viewBox="0 0 200 200">
                <circle className="bg" cx="100" cy="100" r="84" />
                <circle className="progress" cx="100" cy="100" r="84" />
              </svg>
              <div className="text">
                <span>{stats.pct}%</span>
              </div>
            </CircularProgress>
            <h3>Monthly Average</h3>
            <p style={{ color: '#666', marginTop: '10px' }}>
              Your current attendance rate for this course.
            </p>
            {stats.pct < 75 && (
              <WarningBanner>
                <FaExclamationTriangle size={20} />
                <div>
                  <strong>Low Attendance Alert!</strong><br/>
                  Your attendance is below the required 75%. Please attend regularly to avoid issues.
                </div>
              </WarningBanner>
            )}
          </ProgressHero>

          <HeatmapCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Attendance Heatmap</h3>
              <input 
                type="month" 
                value={filterMonth} 
                onChange={e => setFilterMonth(e.target.value)}
                style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px' }}
              />
            </div>
            <CalendarGrid>
              {/* Simple grid for the month */}
              {[...Array(daysInMonth)].map((_, i) => {
                const date = `${filterMonth}-${(i+1).toString().padStart(2, '0')}`;
                return (
                  <CalendarDay key={i} $status={recordMap[date]}>
                    {i + 1}
                  </CalendarDay>
                );
              })}
            </CalendarGrid>
            <div style={{ display: 'flex', gap: '15px', marginTop: '20px', fontSize: '0.75rem', color: '#666' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, background: '#2ecc71', borderRadius: 2 }} /> Present</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, background: '#e74c3c', borderRadius: 2 }} /> Absent</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, background: '#f1c40f', borderRadius: 2 }} /> Late</div>
            </div>
          </HeatmapCard>
        </MainGrid>

        <HistorySection>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <FaCalendarCheck color="#378ADD" />
            <h3>Detailed History</h3>
          </div>
          <div style={{ background: '#111318', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <HistoryTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#444' }}>Loading records...</td></tr>
                ) : (
                  records.map((r, idx) => (
                    <tr key={idx} style={{ background: r.status === 'absent' ? 'rgba(231, 76, 60, 0.02)' : 'none' }}>
                      <td><strong>{r.date}</strong></td>
                      <td style={{ color: '#888' }}>{r.day_of_week}</td>
                      <td>{r.batch_name}</td>
                      <td><StatusBadge $status={r.status}>{r.status.toUpperCase()}</StatusBadge></td>
                      <td style={{ color: '#666', fontSize: '0.8rem' }}>{new Date(r.marked_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
                {records.length === 0 && !loading && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#444' }}>No attendance records found.</td></tr>
                )}
              </tbody>
            </HistoryTable>
          </div>
        </HistorySection>
      </Container>
    </DashboardLayout>
  );
};

export default StudentAttendance;
