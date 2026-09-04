import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FaWallet, FaClock, FaCheckCircle, 
  FaExclamationCircle, FaInfoCircle, FaCalendarAlt
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const StudentFinance = () => {
  const { user } = useAuth();
  const [feePlan, setFeePlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFeeData = useCallback(async () => {
    try {
      if (!user?.cnic) return;
      const sessionToken = user?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('deepskill_session_token') : '');
      const response = await fetch('/api/student/finance.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ cnic: user.cnic, token: sessionToken })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Failed to load finance details.');
      }
      setFeePlan(result.data || null);
    } catch (err) {
      console.error("Fee fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.cnic, user?.sessionToken]);

  useEffect(() => {
    fetchFeeData();
  }, [fetchFeeData]);

  if (loading) return <DashboardLayout><p>Loading finance details...</p></DashboardLayout>;
  if (!feePlan) return (
    <DashboardLayout>
      <EmptyState>
        <FaWallet size={50} />
        <h2>No Fee Plan Found</h2>
        <p>Your fee details haven't been uploaded yet. Please contact the administration.</p>
      </EmptyState>
    </DashboardLayout>
  );

  const progress = (feePlan.paidAmount / feePlan.total_fee) * 100;

  return (
    <DashboardLayout>
      <Container>
        <HeroCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="main-info">
            <span>Your Course Fee</span>
            <h1>Rs. {feePlan.total_fee.toLocaleString()}</h1>
            <p className="plan-type">Plan: {feePlan.plan_type === 'full' ? 'Full Payment' : `Installment Plan (${feePlan.installment_count} Months)`}</p>
          </div>
          
          <div className="progress-section">
            <div className="progress-text">
              <span>Rs. {feePlan.paidAmount.toLocaleString()} paid</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBarContainer>
              <ProgressBar initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} />
            </ProgressBarContainer>
            <p className="remaining">Rs. {feePlan.remainingAmount.toLocaleString()} remaining</p>
          </div>
        </HeroCard>

        <SectionTitle>
          <FaCalendarAlt /> Payment Breakdown
        </SectionTitle>

        <InstallmentsStack>
          {feePlan.installments.map((inst, idx) => (
            <InstallmentCard 
              key={inst.id} 
              $status={inst.status}
              isFuture={inst.status === 'pending' && new Date(inst.due_date) > new Date()}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="status-circle">
                {inst.status === 'paid' ? <FaCheckCircle /> : inst.status === 'overdue' ? <FaExclamationCircle /> : <FaClock />}
              </div>
              <div className="details">
                <h3>{inst.installment_number ? `Installment ${inst.installment_number}` : 'Lump Sum Payment'}</h3>
                <p>Due Date: {inst.due_date}</p>
              </div>
              <div className="amount-info">
                <strong>Rs. {inst.amount.toLocaleString()}</strong>
                <StatusBadge $status={inst.status}>{inst.status}</StatusBadge>
              </div>
              {inst.status === 'paid' && (
                <div className="payment-meta">
                  <span>Paid on: {inst.paid_date}</span>
                  <span>Method: {inst.method?.replace('_', ' ')}</span>
                </div>
              )}
            </InstallmentCard>
          ))}
        </InstallmentsStack>

        {feePlan.installments.some(i => i.status === 'overdue') && (
          <OverdueAlert>
            <FaExclamationCircle />
            <span>This installment is overdue. Please visit the institute or contact admin immediately to avoid penalties.</span>
          </OverdueAlert>
        )}

        <InfoBanner>
          <FaInfoCircle />
          <span>Note: To record a payment or update your fee plan, please visit the administration office. Students cannot update their own finance records.</span>
        </InfoBanner>
      </Container>
    </DashboardLayout>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
  color: #6b7280;
  h2 { color: #fff; margin: 20px 0 10px; }
`;

const HeroCard = styled(motion.div)`
  background: linear-gradient(135deg, #7B1F2E 0%, #4a121c 100%);
  border-radius: 24px;
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);

  @media (max-width: 768px) { flex-direction: column; text-align: center; gap: 30px; }

  .main-info {
    span { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
    h1 { font-size: 3rem; margin: 10px 0; font-weight: 800; }
    .plan-type { font-size: 1rem; opacity: 0.9; font-weight: 500; }
  }

  .progress-section {
    width: 300px;
    .progress-text { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 600; }
    .remaining { margin-top: 10px; text-align: right; font-size: 0.9rem; opacity: 0.8; }
  }
`;

const ProgressBarContainer = styled.div`
  height: 10px;
  background: rgba(255,255,255,0.1);
  border-radius: 5px;
  overflow: hidden;
`;

const ProgressBar = styled(motion.div)`
  height: 100%;
  background: #fff;
  border-radius: 5px;
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.3rem;
  margin-bottom: 25px;
  color: #fff;
`;

const InstallmentsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 40px;
`;

const InstallmentCard = styled(motion.div)`
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 20px 25px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  opacity: ${props => props.isFuture ? 0.6 : 1};
  position: relative;

  .status-circle {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    background: ${props => 
      props.$status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 
      props.$status === 'overdue' ? 'rgba(239, 68, 68, 0.1)' : 
      'rgba(245, 158, 11, 0.1)'};
    color: ${props => 
      props.$status === 'paid' ? '#10B981' : 
      props.$status === 'overdue' ? '#ef4444' : 
      '#F59E0B'};
  }

  h3 { font-size: 1.1rem; margin-bottom: 5px; }
  p { font-size: 0.85rem; color: #6b7280; }

  .amount-info {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 8px;
    strong { font-size: 1.2rem; }
  }

  .payment-meta {
    grid-column: 2 / 4;
    display: flex;
    gap: 20px;
    font-size: 0.8rem;
    color: #6b7280;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.03);
  }
`;

const StatusBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => 
    props.$status === 'paid' ? '#10B981' : 
    props.$status === 'overdue' ? '#ef4444' : 
    '#F59E0B'};
`;

const OverdueAlert = styled.div`
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 15px 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
  font-size: 0.9rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
`;

const InfoBanner = styled.div`
  background: rgba(255,255,255,0.02);
  color: #6b7280;
  padding: 20px;
  border-radius: 15px;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  font-size: 0.85rem;
  line-height: 1.6;
  border: 1px solid rgba(255,255,255,0.05);
`;

export default StudentFinance;
