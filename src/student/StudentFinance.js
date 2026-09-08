import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FaWallet, FaClock, FaCheckCircle, 
  FaExclamationCircle, FaInfoCircle, FaCalendarAlt,
  FaUniversity, FaMobileAlt, FaCopy, FaCheck
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const DEFAULT_INSTITUTIONAL_BANKS = [
  {
    id: 'meezan_main',
    bankName: 'Meezan Bank Limited',
    accountTitle: 'DeepSkills Institute (Pvt) Ltd',
    accountNumber: '01020304050607',
    iban: 'PK36MEZN0001020304050607',
    branch: 'DHA Phase 5 Branch, Lahore',
    isActive: true
  }
];

const DEFAULT_INSTITUTIONAL_WALLETS = [
  {
    id: 'jazzcash',
    provider: 'JazzCash',
    accountTitle: 'DeepSkills Central Accounts',
    accountNumber: '0300-1234567',
    tillNumber: '889900',
    isActive: true
  },
  {
    id: 'easypaisa',
    provider: 'EasyPaisa',
    accountTitle: 'DeepSkills Central Accounts',
    accountNumber: '0345-7654321',
    tillNumber: '112233',
    isActive: true
  }
];

const StudentFinance = () => {
  const { user } = useAuth();
  const [feePlan, setFeePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const fetchFeeData = useCallback(async () => {
    try {
      if (!user?.cnic) return;
      const sessionToken = user?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('deepskill_session_token') : '');
      let response = await fetch('/api/student/finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ cnic: user.cnic, token: sessionToken })
      });

      if (response.status === 404) {
        response = await fetch('/api/student/finance.php', {
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

  const payable = feePlan.final_fee != null ? Number(feePlan.final_fee) : Number(feePlan.total_fee || 0);
  const progress = payable > 0 ? Math.min(100, (feePlan.paidAmount / payable) * 100) : 100;

  const configuredBanks = feePlan?.paymentGateways?.bankAccounts;
  const activeBanks = (Array.isArray(configuredBanks) && configuredBanks.length > 0)
    ? configuredBanks.filter(b => b.isActive !== false)
    : DEFAULT_INSTITUTIONAL_BANKS;

  const configuredWallets = feePlan?.paymentGateways?.mobileWallets;
  const activeWallets = (Array.isArray(configuredWallets) && configuredWallets.length > 0)
    ? configuredWallets.filter(w => w.isActive !== false)
    : DEFAULT_INSTITUTIONAL_WALLETS;

  return (
    <DashboardLayout>
      <Container>
        <HeroCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="main-info">
            <span>Your Course Fee</span>
            <h1>Rs. {payable.toLocaleString()}</h1>
            {feePlan.discount > 0 && (
              <p style={{ color: '#F59E0B', fontSize: '0.85rem', marginTop: '4px' }}>
                (Standard: Rs. {Number(feePlan.total_fee).toLocaleString()} | Discount: Rs. {Number(feePlan.discount).toLocaleString()})
              </p>
            )}
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

        {/* Official Institutional Payment Channels */}
        <PaymentChannelsSection>
          <SectionTitle>
            <FaUniversity /> Institutional Payment Channels
          </SectionTitle>
          <ChannelsGrid>
            {activeBanks.map((bank) => (
              <ChannelCard key={bank.id || bank.accountNumber}>
                <div className="card-header">
                  <div className="icon-badge">
                    <FaUniversity />
                  </div>
                  <div>
                    <h4>{bank.bankName}</h4>
                    <p className="subtitle">{bank.branch || 'Designated Branch'}</p>
                  </div>
                </div>
                <div className="card-body">
                  <div className="field-row">
                    <span className="label">Account Title:</span>
                    <span className="value">{bank.accountTitle}</span>
                  </div>
                  <div className="field-row">
                    <span className="label">Account No:</span>
                    <div className="copy-val">
                      <code>{bank.accountNumber}</code>
                      <button 
                        type="button" 
                        onClick={() => handleCopy(bank.accountNumber, `acc_${bank.accountNumber}`)}
                        title="Copy Account Number"
                      >
                        {copiedKey === `acc_${bank.accountNumber}` ? <FaCheck style={{ color: '#10B981' }} /> : <FaCopy />}
                      </button>
                    </div>
                  </div>
                  {bank.iban && (
                    <div className="field-row">
                      <span className="label">IBAN:</span>
                      <div className="copy-val">
                        <code>{bank.iban}</code>
                        <button 
                          type="button" 
                          onClick={() => handleCopy(bank.iban, `iban_${bank.iban}`)}
                          title="Copy IBAN"
                        >
                          {copiedKey === `iban_${bank.iban}` ? <FaCheck style={{ color: '#10B981' }} /> : <FaCopy />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </ChannelCard>
            ))}

            {activeWallets.map((wallet) => (
              <ChannelCard key={wallet.id || wallet.accountNumber}>
                <div className="card-header">
                  <div className="icon-badge wallet">
                    <FaMobileAlt />
                  </div>
                  <div>
                    <h4>{wallet.provider}</h4>
                    <p className="subtitle">{wallet.accountTitle}</p>
                  </div>
                </div>
                <div className="card-body">
                  <div className="field-row">
                    <span className="label">Mobile Number:</span>
                    <div className="copy-val">
                      <code>{wallet.accountNumber}</code>
                      <button 
                        type="button" 
                        onClick={() => handleCopy(wallet.accountNumber, `wal_${wallet.accountNumber}`)}
                        title="Copy Mobile Number"
                      >
                        {copiedKey === `wal_${wallet.accountNumber}` ? <FaCheck style={{ color: '#10B981' }} /> : <FaCopy />}
                      </button>
                    </div>
                  </div>
                  {wallet.tillNumber && (
                    <div className="field-row">
                      <span className="label">Till / Merchant ID:</span>
                      <div className="copy-val">
                        <code>{wallet.tillNumber}</code>
                        <button 
                          type="button" 
                          onClick={() => handleCopy(wallet.tillNumber, `till_${wallet.tillNumber}`)}
                          title="Copy Till Number"
                        >
                          {copiedKey === `till_${wallet.tillNumber}` ? <FaCheck style={{ color: '#10B981' }} /> : <FaCopy />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </ChannelCard>
            ))}
          </ChannelsGrid>
        </PaymentChannelsSection>

        <InfoBanner>
          <FaInfoCircle />
          <div>
            <strong>Payment Submission Instructions:</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              {feePlan.invoiceNotes || 'Tuition fees must be paid on or before the designated due date. After initiating a bank transfer or mobile wallet deposit, please submit your transaction receipt or payment proof at the administration office or WhatsApp desk for verification.'}
            </p>
          </div>
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

const PaymentChannelsSection = styled.div`
  margin-bottom: 35px;
`;

const ChannelsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
`;

const ChannelCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(212, 175, 55, 0.35);
    background: rgba(255, 255, 255, 0.05);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .icon-badge {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba(212, 175, 55, 0.12);
      border: 1px solid rgba(212, 175, 55, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #d4af37;
      font-size: 1.1rem;

      &.wallet {
        background: rgba(56, 189, 248, 0.12);
        border-color: rgba(56, 189, 248, 0.25);
        color: #38bdf8;
      }
    }

    h4 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
    }

    .subtitle {
      margin: 2px 0 0 0;
      font-size: 0.78rem;
      color: #94a3b8;
    }
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .field-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 0.83rem;

      .label {
        color: #94a3b8;
        white-space: nowrap;
      }

      .value {
        color: #f1f5f9;
        font-weight: 600;
        text-align: right;
        word-break: break-word;
      }

      .copy-val {
        display: flex;
        align-items: center;
        gap: 8px;

        code {
          background: rgba(0, 0, 0, 0.35);
          padding: 3px 7px;
          border-radius: 6px;
          color: #f8fafc;
          font-family: monospace;
          font-size: 0.82rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          word-break: break-all;
        }

        button {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;

          &:hover {
            color: #d4af37;
            background: rgba(255, 255, 255, 0.06);
          }
        }
      }
    }
  }
`;

export default StudentFinance;
