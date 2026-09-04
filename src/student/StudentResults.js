import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useParams, Link } from 'react-router-dom';
import { 
  FaChartBar, 
  FaChevronDown, FaChevronUp, FaTrophy,
  FaFileDownload, FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Container = styled.div`
  padding: 20px 0;
  color: #fff;
`;

const HeroCard = styled(motion.div)`
  background: linear-gradient(135deg, #111318 0%, #1a1d25 100%);
  border-radius: 20px;
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 30px;
  margin-bottom: 30px;
  position: relative;
  overflow: hidden;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  &::before {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(55, 138, 221, 0.05) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const ResultHeader = styled.div`
  h2 { font-size: 2.2rem; font-weight: 800; margin-bottom: 10px; }
  .course-info { color: #888; font-size: 1.1rem; margin-bottom: 20px; }
  .badges { display: flex; gap: 15px; }
`;

const Badge = styled.div`
  background: ${props => props.$color || 'rgba(255,255,255,0.05)'};
  color: ${props => props.$textColor || '#fff'};
  padding: 8px 16px;
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${props => props.$borderColor || 'rgba(255,255,255,0.1)'};
`;

const ScoreCircle = styled.div`
  background: rgba(0,0,0,0.3);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 10px solid ${props => props.$passed ? '#2ecc71' : '#e74c3c'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  position: relative;

  .score { font-size: 3.5rem; font-weight: 800; line-height: 1; }
  .total { font-size: 1rem; color: #666; margin-top: 5px; }
  .grade { 
    position: absolute; bottom: -15px; background: ${props => props.$passed ? '#2ecc71' : '#e74c3c'};
    color: #fff; padding: 5px 20px; border-radius: 20px; font-weight: 800; font-size: 1.2rem;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.3rem; margin: 40px 0 20px; display: flex; align-items: center; gap: 12px;
  color: #fff;
`;

const BreakdownCard = styled.div`
  background: #111318; border-radius: 16px; padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ProgressRow = styled.div`
  margin-bottom: 25px;
  .label-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.95rem; }
  .track { height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; }
  .fill { height: 100%; background: ${props => props.$color}; transition: width 1s ease-out; }
  .marks { font-weight: 700; }
`;

const DetailCard = styled.div`
  background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.03);
  overflow: hidden;
`;

const DetailHeader = styled.div`
  padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;
  &:hover { background: rgba(255,255,255,0.02); }
  h4 { margin: 0; font-size: 1rem; }
`;

const DetailBody = styled(motion.div)`
  padding: 0 25px 25px;
  table { 
    width: 100%; border-collapse: collapse; margin-top: 15px; 
    th { text-align: left; color: #666; font-size: 0.8rem; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; }
  }
`;

const ComparisonGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const MiniStat = styled.div`
  background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; text-align: center;
  border: 1px solid ${props => props.$highlight ? '#378ADD' : 'rgba(255,255,255,0.05)'};
  p { color: #888; font-size: 0.85rem; margin-bottom: 5px; }
  h4 { font-size: 1.5rem; margin: 0; }
`;

const Banner = styled.div`
  background: rgba(241, 196, 15, 0.1); color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.2);
  padding: 15px 20px; border-radius: 12px; margin-bottom: 25px; display: flex; align-items: center; gap: 12px; font-size: 0.9rem;
`;

const StudentResults = () => {
  const { user } = useAuth();
  const { type } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [batchStats, setBatchStats] = useState({ avg: 0, highest: 0, count: 0 });

  const examType = type === 'mid' ? 'midterm' : type === 'final' ? 'finalterm' : type;
  const examLabel = examType === 'midterm' ? 'Mid Term Result' : 'Final Term Result';

  useEffect(() => {
    const fetchResult = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const sessionToken = user?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('deepskill_session_token') : '');
        const response = await fetch('/api/student/results.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({ cnic: user.cnic, examType, token: sessionToken })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.status === 'error') {
          throw new Error(payload.message || 'Failed to load result.');
        }
        setResult(payload.data?.result || null);
        setBatchStats(payload.data?.batchStats || { avg: 0, highest: 0, count: 0 });
      } catch (err) {
        console.error("Result fetch error:", err);
        setResult(null);
        setBatchStats({ avg: 0, highest: 0, count: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [user, user?.sessionToken, examType]);

  const toggleExpand = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) return <DashboardLayout><Container>Loading result...</Container></DashboardLayout>;

  if (!result) {
    return (
      <DashboardLayout>
        <Container>
          <HeroCard>
            <ResultHeader>
              <h2>{examLabel}</h2>
              <p className="course-info">{user?.assigned_course} — {user?.batch}</p>
              <Banner>
                <FaInfoCircle /> Your result is not yet available. Results are auto-calculated as soon as your marks and attendance are entered.
              </Banner>
            </ResultHeader>
          </HeroCard>
        </Container>
      </DashboardLayout>
    );
  }

  const weights = examType === 'midterm' 
    ? { att: 20, ass: 30, quiz: 30, task: 20, proj: 0 }
    : { att: 15, ass: 25, quiz: 25, task: 15, proj: 20 };

  return (
    <DashboardLayout>
      <Container>
        <HeroCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ResultHeader>
            <h2>{examLabel}</h2>
            <p className="course-info">{user?.assigned_course} — {result.batch_id}</p>
            <div className="badges">
              <Badge $color={result.passed ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'} 
                     $textColor={result.passed ? '#2ecc71' : '#e74c3c'}
                     $borderColor={result.passed ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'}>
                {result.passed ? 'PASSED' : 'FAILED'} — {result.remarks}
              </Badge>
              <Badge $color="rgba(55, 138, 221, 0.1)" $textColor="#378ADD" $borderColor="rgba(55, 138, 221, 0.2)">
                <FaTrophy /> Rank {result.batch_rank} of {batchStats.count}
              </Badge>
            </div>
            
            <div style={{ marginTop: '30px' }}>
              <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', align_items: 'center', gap: '10px' }}>
                <FaFileDownload /> Download Result Card
              </button>
            </div>
          </ResultHeader>

          <ScoreCircle $passed={result.passed}>
            <div className="score">{result.total_marks}</div>
            <div className="total">OUT OF 100</div>
            <div className="grade">{result.grade}</div>
          </ScoreCircle>
        </HeroCard>

        <SectionTitle><FaChartBar /> Marks Breakdown</SectionTitle>
        <BreakdownCard>
          <ProgressRow $color="#378ADD">
            <div className="label-row">
              <span>Attendance</span>
              <span className="marks">{result.attendance_marks} / {weights.att}</span>
            </div>
            <div className="track"><div className="fill" style={{ width: `${(result.attendance_marks/weights.att)*100}%` }} /></div>
          </ProgressRow>
          
          <ProgressRow $color="#2ecc71">
            <div className="label-row">
              <span>Assignments</span>
              <span className="marks">{result.assignment_marks} / {weights.ass}</span>
            </div>
            <div className="track"><div className="fill" style={{ width: `${(result.assignment_marks/weights.ass)*100}%` }} /></div>
          </ProgressRow>

          <ProgressRow $color="#9b59b6">
            <div className="label-row">
              <span>Quizzes</span>
              <span className="marks">{result.quiz_marks} / {weights.quiz}</span>
            </div>
            <div className="track"><div className="fill" style={{ width: `${(result.quiz_marks/weights.quiz)*100}%` }} /></div>
          </ProgressRow>

          <ProgressRow $color="#1abc9c">
            <div className="label-row">
              <span>Task Completion</span>
              <span className="marks">{result.task_completion_marks} / {weights.task}</span>
            </div>
            <div className="track"><div className="fill" style={{ width: `${(result.task_completion_marks/weights.task)*100}%` }} /></div>
          </ProgressRow>

          {examType === 'finalterm' && (
            <ProgressRow $color="#f1c40f">
              <div className="label-row">
                <span>Final Project</span>
                <span className="marks">{result.project_marks} / {weights.proj}</span>
              </div>
              <div className="track"><div className="fill" style={{ width: `${(result.project_marks/weights.proj)*100}%` }} /></div>
            </ProgressRow>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '30px', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>Total Marks</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: result.passed ? '#2ecc71' : '#e74c3c' }}>{result.total_marks} / 100</span>
          </div>
        </BreakdownCard>

        <SectionTitle><FaChartBar /> Component Details</SectionTitle>
        <DetailCard>
          <DetailHeader onClick={() => toggleExpand('att')}>
            <h4>Attendance Detail</h4>
            {expanded.att ? <FaChevronUp /> : <FaChevronDown />}
          </DetailHeader>
          <AnimatePresence>
            {expanded.att && (
              <DetailBody initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                <p>Your attendance score is based on your presence in all scheduled classes.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 5px', color: '#888', fontSize: '0.8rem' }}>Att. %</p>
                    <h4 style={{ margin: 0 }}>{Math.round((result.attendance_marks/weights.att)*100)}%</h4>
                  </div>
                  <Link to="/student/attendance" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(55,138,221,0.1)', color: '#378ADD', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
                    View Full Attendance Log →
                  </Link>
                </div>
              </DetailBody>
            )}
          </AnimatePresence>
        </DetailCard>

        <ComparisonGrid>
          <MiniStat>
            <p>Batch Average</p>
            <h4>{batchStats.avg}</h4>
          </MiniStat>
          <MiniStat>
            <p>Highest in Batch</p>
            <h4>{batchStats.highest}</h4>
          </MiniStat>
          <MiniStat $highlight>
            <p>Your Score</p>
            <h4 style={{ color: '#378ADD' }}>{result.total_marks}</h4>
          </MiniStat>
        </ComparisonGrid>
        
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: '20px' }}>
          Rankings are based on all {batchStats.count} students in {result.batch_id}
        </p>
      </Container>
    </DashboardLayout>
  );
};

export default StudentResults;
