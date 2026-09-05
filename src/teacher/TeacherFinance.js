import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  FaHistory, FaCheckCircle,
  FaClock, FaExclamationCircle, FaUserTie
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const TeacherFinance = () => {
  const { user } = useAuth();
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTeacherFinance = useCallback(async () => {
    try {
      if (!user?.cnic) return;
      const sessionToken = user?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('deepskill_session_token') : '');
      let response = await fetch('/api/teacher/finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ cnic: user.cnic, token: sessionToken })
      });

      if (response.status === 404) {
        response = await fetch('/api/teacher/finance.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({ cnic: user.cnic, token: sessionToken })
        });
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Failed to load salary details.');
      }
      setFinanceData(result.data);
    } catch (err) {
      console.error("Teacher finance error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.cnic, user?.sessionToken]);

  useEffect(() => {
    fetchTeacherFinance();
  }, [fetchTeacherFinance]);

  if (loading) return <DashboardLayout><p>Loading salary details...</p></DashboardLayout>;

  if (error || !financeData) return (
    <DashboardLayout>
      <Container>
        <Header>
          <div className="title-area">
            <FaUserTie size={30} color="#7B1F2E" />
            <div>
              <h1>Salary &amp; Earnings</h1>
              <p>View your monthly salary status and history.</p>
            </div>
          </div>
        </Header>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
          <FaExclamationCircle size={40} style={{ marginBottom: '15px', opacity: 0.5 }} />
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>Salary information has not been configured yet.</h3>
          <p>Please contact the administration for your payroll setup.</p>
        </div>
      </Container>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Container>
        <Header>
          <div className="title-area">
            <FaUserTie size={30} color="#7B1F2E" />
            <div>
              <h1>Salary & Earnings</h1>
              <p>View your monthly salary status and history.</p>
            </div>
          </div>
        </Header>

        <SummaryRow>
          <SummaryCard>
            <span>Monthly Salary</span>
            <h2>Rs. {Number(financeData?.monthlyAmount || 0).toLocaleString()}</h2>
          </SummaryCard>
          <SummaryCard $status={financeData?.status}>
            <span>Status (This Month)</span>
            <div className="status-val">
              {financeData?.status === 'Paid' ? <FaCheckCircle /> : <FaClock />}
              <h2>{financeData?.status}</h2>
            </div>
          </SummaryCard>
          <SummaryCard>
            <span>Last Payment Date</span>
            <h2>{financeData?.lastPaymentDate}</h2>
          </SummaryCard>
        </SummaryRow>

        <SectionHeader>
          <FaHistory /> Payment History
        </SectionHeader>

        <TableCard>
          <TableContainer>
            <table>
              <thead>
                <tr>
                  <th>Month/Period</th>
                  <th>Amount</th>
                  <th>Paid On</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(financeData?.history || []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.description || 'Monthly Salary'}</td>
                    <td style={{ fontWeight: '700' }}>Rs. {Number(p.amount || 0).toLocaleString()}</td>
                    <td>{p.paid_date || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method?.replace('_', ' ')}</td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{p.reference_number || '—'}</td>
                    <td>
                      <StatusBadge $status={p.status}>{p.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
                {(financeData?.history || []).length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>No payment records found.</td></tr>
                )}
              </tbody>
            </table>
          </TableContainer>
        </TableCard>

        <InfoBox>
          <FaExclamationCircle />
          <p>If you have any questions regarding your salary or notice any discrepancies, please contact the finance department.</p>
        </InfoBox>
      </Container>
    </DashboardLayout>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 35px;
  .title-area { display: flex; align-items: center; gap: 20px; }
  h1 { font-size: 1.8rem; color: #fff; margin: 0 0 5px; }
  p { color: #6b7280; margin: 0; }
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
  
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const SummaryCard = styled.div`
  background: #111318;
  padding: 25px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05);

  span { font-size: 0.8rem; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  h2 { font-size: 1.5rem; color: #fff; margin: 15px 0 0; font-weight: 700; }

  .status-val {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 15px;
    color: ${props => props.$status === 'Paid' ? '#10B981' : '#F59E0B'};
    h2 { margin: 0; color: inherit; }
  }
`;

const SectionHeader = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.2rem;
  margin-bottom: 20px;
  color: #fff;
`;

const TableCard = styled.div`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  table {
    width: 100%;
    border-collapse: collapse;
    th { text-align: left; padding: 20px 25px; font-size: 0.8rem; color: #6b7280; text-transform: uppercase; background: rgba(255,255,255,0.02); }
    td { padding: 18px 25px; font-size: 0.95rem; color: #eee; border-top: 1px solid rgba(255,255,255,0.03); }
  }
`;

const StatusBadge = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => props.$status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
  color: ${props => props.$status === 'paid' ? '#10B981' : '#F59E0B'};
`;

const InfoBox = styled.div`
  margin-top: 40px;
  background: rgba(255,255,255,0.02);
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  color: #6b7280;
  font-size: 0.9rem;
  border: 1px solid rgba(255,255,255,0.05);
`;

export default TeacherFinance;
