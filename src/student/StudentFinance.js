import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaWallet, FaClock, FaCheckCircle, 
  FaExclamationCircle, FaInfoCircle, FaCalendarAlt,
  FaUniversity, FaMobileAlt, FaCopy, FaCheck,
  FaUpload, FaDownload, FaPrint, FaTimes, FaFileInvoiceDollar,
  FaReceipt, FaShieldAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { portalTheme } from '../components/portal/PortalTheme';

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

  // Payment Proof Modal State
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofForm, setProofForm] = useState({
    paymentId: '',
    installmentNumber: 1,
    amount: '',
    method: 'meezan_bank',
    referenceNumber: '',
    paidDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Official Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);

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
      const response = await fetch('/api/student/finance', {
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

  const openProofModal = (inst = null) => {
    const targetInst = inst || feePlan?.installments?.find(i => i.status !== 'paid') || feePlan?.installments?.[0];
    setProofForm({
      paymentId: targetInst?.id || '',
      installmentNumber: targetInst?.installment_number || 1,
      amount: targetInst?.amount || '',
      method: 'meezan_bank',
      referenceNumber: '',
      paidDate: new Date().toISOString().slice(0, 10),
      notes: ''
    });
    setIsProofModalOpen(true);
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofForm.paymentId) {
      toast.error('Please select an installment to submit proof for.');
      return;
    }
    if (!proofForm.referenceNumber.trim()) {
      toast.error('Please enter the Transaction ID / Reference Number.');
      return;
    }
    if (!proofForm.amount || Number(proofForm.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmittingProof(true);
    try {
      const sessionToken = user?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('deepskill_session_token') : '');
      const response = await fetch('/api/student/finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({
          action: 'submit_proof',
          cnic: user?.cnic,
          token: sessionToken,
          payment_id: proofForm.paymentId,
          reference_number: proofForm.referenceNumber,
          method: proofForm.method,
          amount: proofForm.amount,
          paid_date: proofForm.paidDate,
          notes: proofForm.notes
        })
      });

      const res = await response.json();
      if (!response.ok || res.status === 'error') {
        throw new Error(res.message || 'Failed to submit payment proof.');
      }

      toast.success('Payment proof submitted successfully! Verification is now pending with the Finance Directorate.');
      setIsProofModalOpen(false);
      fetchFeeData();
    } catch (err) {
      toast.error(err.message || 'Submission failed.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>
          Loading financial records...
        </p>
      </DashboardLayout>
    );
  }

  if (!feePlan) {
    return (
      <DashboardLayout>
        <EmptyState>
          <FaWallet size={50} />
          <h2>No Fee Plan Found</h2>
          <p>Your fee details have not been assigned yet. Please contact the admission or finance desk.</p>
        </EmptyState>
      </DashboardLayout>
    );
  }

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
        {/* ─── Hero Overview ─── */}
        <HeroCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="main-info">
            <span>Enrolled Course Fee</span>
            <h1>Rs. {payable.toLocaleString()}</h1>
            {feePlan.discount > 0 && (
              <p style={{ color: '#F59E0B', fontSize: '0.85rem', marginTop: '4px' }}>
                (Standard: Rs. {Number(feePlan.total_fee).toLocaleString()} | Scholarship Discount: Rs. {Number(feePlan.discount).toLocaleString()})
              </p>
            )}
            <p className="plan-type">
              Plan: {feePlan.plan_type === 'full' ? 'Full Payment' : `Installment Plan (${feePlan.installment_count} Months)`}
            </p>
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
            
            {feePlan.remainingAmount > 0 && (
              <ProofHeroBtn type="button" onClick={() => openProofModal()}>
                <FaUpload /> Submit Payment Proof
              </ProofHeroBtn>
            )}
          </div>
        </HeroCard>

        {/* ─── Installments Breakdown ─── */}
        <SectionTitle>
          <FaCalendarAlt /> Payment Breakdown & Receipts
        </SectionTitle>

        <InstallmentsStack>
          {feePlan.installments.map((inst, idx) => {
            const isPaid = inst.status === 'paid';
            const isPendingProof = inst.status === 'pending' && inst.reference_number;

            return (
              <InstallmentCard 
                key={inst.id} 
                $status={inst.status}
                isFuture={inst.status === 'pending' && new Date(inst.due_date) > new Date()}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <div className="status-circle">
                  {isPaid ? <FaCheckCircle /> : inst.status === 'overdue' ? <FaExclamationCircle /> : <FaClock />}
                </div>
                <div className="details">
                  <h3>{inst.installment_number ? `Installment ${inst.installment_number}` : 'Lump Sum Payment'}</h3>
                  <p>Due Date: {inst.due_date}</p>
                  {isPendingProof && (
                    <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginTop: '4px', fontWeight: 600 }}>
                      Slip Proof Submitted: Ref #{inst.reference_number} (Awaiting Finance Approval)
                    </div>
                  )}
                </div>
                <div className="amount-info">
                  <strong>Rs. {inst.amount.toLocaleString()}</strong>
                  <StatusBadge $status={inst.status}>
                    {isPendingProof ? 'Under Review' : inst.status}
                  </StatusBadge>
                </div>
                
                <div className="action-col">
                  {isPaid ? (
                    <ActionReceiptBtn
                      type="button"
                      onClick={() => setSelectedReceipt(inst)}
                      title="Download Verified Fee Receipt"
                    >
                      <FaReceipt /> View Official Receipt
                    </ActionReceiptBtn>
                  ) : (
                    <ActionProofBtn
                      type="button"
                      onClick={() => openProofModal(inst)}
                      title="Submit Bank Deposit / Transfer Proof"
                    >
                      <FaUpload /> Submit Payment Slip
                    </ActionProofBtn>
                  )}
                </div>

                {isPaid && (
                  <div className="payment-meta">
                    <span>Paid on: {inst.paid_date}</span>
                    <span>Method: {inst.method?.replace('_', ' ')}</span>
                  </div>
                )}
              </InstallmentCard>
            );
          })}
        </InstallmentsStack>

        {feePlan.installments.some(i => i.status === 'overdue') && (
          <OverdueAlert>
            <FaExclamationCircle />
            <span>This installment is overdue. Please visit the campus accounts office or transfer via institutional channels to avoid late fee penalties.</span>
          </OverdueAlert>
        )}

        {/* ─── Institutional Bank Accounts ─── */}
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
              {feePlan.invoiceNotes || 'Tuition fees must be paid on or before the designated due date. After transferring funds through online banking or ATM, click "Submit Payment Slip" to enter your Transaction ID and upload your deposit proof for instant verification.'}
            </p>
          </div>
        </InfoBanner>

        {/* ─── Modal 1: Payment Proof Submission ─── */}
        <AnimatePresence>
          {isProofModalOpen && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProofModalOpen(false)}
            >
              <ModalContent
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <h3>
                    <FaUpload style={{ color: '#38bdf8' }} />
                    Submit Fee Payment Proof
                  </h3>
                  <button type="button" onClick={() => setIsProofModalOpen(false)}>
                    <FaTimes />
                  </button>
                </ModalHeader>

                <form onSubmit={handleSubmitProof}>
                  <ModalBody>
                    <FormRow>
                      <label>Target Installment</label>
                      <select
                        value={proofForm.paymentId}
                        onChange={(e) => {
                          const chosen = feePlan.installments.find(i => i.id === e.target.value);
                          setProofForm(prev => ({
                            ...prev,
                            paymentId: e.target.value,
                            installmentNumber: chosen?.installment_number || 1,
                            amount: chosen?.amount || prev.amount
                          }));
                        }}
                      >
                        {feePlan.installments.map(i => (
                          <option key={i.id} value={i.id}>
                            Installment #{i.installment_number || 1} — Rs. {Number(i.amount).toLocaleString()} ({i.status})
                          </option>
                        ))}
                      </select>
                    </FormRow>

                    <FormGrid2>
                      <FormRow>
                        <label>Payment Channel</label>
                        <select
                          value={proofForm.method}
                          onChange={(e) => setProofForm(prev => ({ ...prev, method: e.target.value }))}
                        >
                          <option value="meezan_bank">Meezan Bank Transfer</option>
                          <option value="jazzcash">JazzCash</option>
                          <option value="easypaisa">EasyPaisa</option>
                          <option value="other_bank">Other Bank Transfer</option>
                          <option value="cash">Cash at Accounts Office</option>
                        </select>
                      </FormRow>

                      <FormRow>
                        <label>Paid Amount (PKR)</label>
                        <input
                          type="number"
                          placeholder="e.g. 10000"
                          value={proofForm.amount}
                          onChange={(e) => setProofForm(prev => ({ ...prev, amount: e.target.value }))}
                          required
                        />
                      </FormRow>
                    </FormGrid2>

                    <FormGrid2>
                      <FormRow>
                        <label>Transaction ID / Ref #</label>
                        <input
                          type="text"
                          placeholder="e.g. TID-98234821 or Challan #"
                          value={proofForm.referenceNumber}
                          onChange={(e) => setProofForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          required
                        />
                      </FormRow>

                      <FormRow>
                        <label>Payment Date</label>
                        <input
                          type="date"
                          value={proofForm.paidDate}
                          onChange={(e) => setProofForm(prev => ({ ...prev, paidDate: e.target.value }))}
                          required
                        />
                      </FormRow>
                    </FormGrid2>

                    <FormRow>
                      <label>Remarks / Notes / Receipt Image URL (Optional)</label>
                      <textarea
                        rows="2"
                        placeholder="Provide any additional deposit slip info or receipt image link..."
                        value={proofForm.notes}
                        onChange={(e) => setProofForm(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </FormRow>
                  </ModalBody>

                  <ModalFooter>
                    <CancelBtn type="button" onClick={() => setIsProofModalOpen(false)}>
                      Cancel
                    </CancelBtn>
                    <SubmitBtn type="submit" disabled={submittingProof}>
                      {submittingProof ? 'Submitting Proof...' : 'Submit Verification Slip'}
                    </SubmitBtn>
                  </ModalFooter>
                </form>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* ─── Modal 2: Official Verified Receipt Voucher ─── */}
        <AnimatePresence>
          {selectedReceipt && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceipt(null)}
            >
              <ModalContent
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '640px' }}
              >
                <ModalHeader>
                  <h3>
                    <FaFileInvoiceDollar style={{ color: '#10B981' }} />
                    Official Fee Receipt Voucher
                  </h3>
                  <button type="button" onClick={() => setSelectedReceipt(null)}>
                    <FaTimes />
                  </button>
                </ModalHeader>

                <ReceiptPrintArea id="receipt-print-area">
                  <ReceiptHeader>
                    <div className="brand">
                      <h2>DEEPSKILLS INSTITUTE</h2>
                      <p>Directorate of Finance & Student Accounts</p>
                    </div>
                    <div className="receipt-meta">
                      <span className="rec-num">REC-#{selectedReceipt.id.slice(0, 8).toUpperCase()}</span>
                      <span className="rec-date">{selectedReceipt.paid_date || new Date().toISOString().slice(0, 10)}</span>
                    </div>
                  </ReceiptHeader>

                  <ReceiptDetailsGrid>
                    <div className="item">
                      <span className="lbl">Student Name</span>
                      <span className="val">{user?.name || user?.full_name || 'Enrolled Student'}</span>
                    </div>
                    <div className="item">
                      <span className="lbl">CNIC Number</span>
                      <span className="val">{user?.cnic || '—'}</span>
                    </div>
                    <div className="item">
                      <span className="lbl">Course Program</span>
                      <span className="val">{user?.assigned_course || user?.course || 'Technical Program'}</span>
                    </div>
                    <div className="item">
                      <span className="lbl">Assigned Batch</span>
                      <span className="val">{user?.batch || 'Active Batch'}</span>
                    </div>
                  </ReceiptDetailsGrid>

                  <ReceiptTable>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Installment #</th>
                        <th>Payment Method</th>
                        <th>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Course Tuition Fee</td>
                        <td>{selectedReceipt.installment_number || 'Lump Sum'}</td>
                        <td>{selectedReceipt.method?.replace('_', ' ').toUpperCase() || 'BANK TRANSFER'}</td>
                        <td style={{ fontWeight: 800, color: '#10B981' }}>
                          PKR {Number(selectedReceipt.amount).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </ReceiptTable>

                  <ReceiptFooterSection>
                    <div className="ref-info">
                      <strong>Transaction Ref:</strong> {selectedReceipt.reference_number || 'OFFICIAL-ACCOUNTS-VERIFIED'}
                      <br />
                      <small style={{ color: '#64748b' }}>Generated electronically by DeepSkills ERP. Verification ID: {selectedReceipt.id}</small>
                    </div>
                    <ReceiptStamp>
                      <FaShieldAlt />
                      <span>VERIFIED & CLEARED</span>
                    </ReceiptStamp>
                  </ReceiptFooterSection>
                </ReceiptPrintArea>

                <ModalFooter>
                  <CancelBtn type="button" onClick={() => setSelectedReceipt(null)}>
                    Close
                  </CancelBtn>
                  <SubmitBtn type="button" onClick={handlePrintReceipt}>
                    <FaPrint /> Print Official Receipt
                  </SubmitBtn>
                </ModalFooter>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </DashboardLayout>
  );
};

// ──────────────────────────────────────────
// Styled Components
// ──────────────────────────────────────────

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 50px;
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
  border-radius: 20px;
  padding: 32px 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  box-shadow: 0 10px 30px rgba(123, 31, 46, 0.35);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
    padding: 24px;
  }

  .main-info {
    span {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.8;
      font-weight: 600;
    }
    h1 {
      font-size: 2.3rem;
      font-weight: 800;
      margin: 6px 0 0 0;
    }
    .plan-type {
      font-size: 0.9rem;
      opacity: 0.85;
      margin: 8px 0 0 0;
    }
  }

  .progress-section {
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    @media (max-width: 768px) {
      width: 100%;
    }

    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .remaining {
      font-size: 0.8rem;
      opacity: 0.75;
      margin: 2px 0 0 0;
      text-align: right;
    }
  }
`;

const ProofHeroBtn = styled.button`
  margin-top: 10px;
  background: #fff;
  color: #7B1F2E;
  border: none;
  border-radius: 8px;
  padding: 9px 16px;
  font-weight: 700;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;

  &:hover {
    background: #f8fafc;
    transform: translateY(-1px);
  }
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBar = styled(motion.div)`
  height: 100%;
  background: #34d399;
  border-radius: 4px;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  margin: 10px 0 0 0;
`;

const InstallmentsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InstallmentCard = styled(motion.div)`
  background: #111318;
  border: 1px solid ${props => props.$status === 'paid' ? 'rgba(16, 185, 129, 0.3)' : props.$status === 'overdue' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 12px;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;

  .status-circle {
    font-size: 1.3rem;
    color: ${props => props.$status === 'paid' ? '#10B981' : props.$status === 'overdue' ? '#EF4444' : '#F59E0B'};
  }

  .details {
    flex: 1;
    min-width: 160px;
    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }
    p {
      margin: 3px 0 0 0;
      font-size: 0.8rem;
      color: #94a3b8;
    }
  }

  .amount-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;

    strong {
      font-size: 1.1rem;
      color: #fff;
      font-weight: 800;
    }
  }

  .action-col {
    display: flex;
    align-items: center;
  }

  .payment-meta {
    width: 100%;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    gap: 20px;
    font-size: 0.78rem;
    color: #94a3b8;
  }
`;

const StatusBadge = styled.span`
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${props => props.$status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : props.$status === 'overdue' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
  color: ${props => props.$status === 'paid' ? '#34d399' : props.$status === 'overdue' ? '#f87171' : '#fbbf24'};
`;

const ActionProofBtn = styled.button`
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(56, 189, 248, 0.25);
    color: #fff;
    border-color: #38bdf8;
  }
`;

const ActionReceiptBtn = styled.button`
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #34d399;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.25);
    color: #fff;
    border-color: #10B981;
  }
`;

const OverdueAlert = styled.div`
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #f87171;
  font-size: 0.85rem;
  font-weight: 600;
`;

const PaymentChannelsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
`;

const ChannelsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
`;

const ChannelCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;

    .icon-badge {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(123, 31, 46, 0.2);
      border: 1px solid rgba(123, 31, 46, 0.4);
      color: #e11d48;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;

      &.wallet {
        background: rgba(56, 189, 248, 0.15);
        border-color: rgba(56, 189, 248, 0.35);
        color: #38bdf8;
      }
    }

    h4 {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 700;
      color: #fff;
    }

    .subtitle {
      margin: 2px 0 0 0;
      font-size: 0.76rem;
      color: #94a3b8;
    }
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .field-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;

      .label {
        color: #94a3b8;
      }

      .value {
        color: #fff;
        font-weight: 600;
      }

      .copy-val {
        display: flex;
        align-items: center;
        gap: 6px;

        code {
          background: rgba(0, 0, 0, 0.4);
          padding: 3px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #38bdf8;
        }

        button {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          &:hover { color: #fff; }
        }
      }
    }
  }
`;

const InfoBanner = styled.div`
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  color: #bae6fd;
  font-size: 0.86rem;
  line-height: 1.5;

  svg {
    font-size: 1.3rem;
    color: #38bdf8;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

// ─── Modal Styles ───

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
`;

const ModalHeader = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 1.15rem;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  button {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.1rem;
    cursor: pointer;
    &:hover { color: #fff; }
  }
`;

const ModalBody = styled.div`
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #94a3b8;
  }

  input, select, textarea {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 9px 12px;
    color: #fff;
    font-size: 0.88rem;
    outline: none;

    &:focus {
      border-color: #38bdf8;
    }
  }
`;

const FormGrid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const CancelBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const SubmitBtn = styled.button`
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  border: none;
  color: #fff;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(3, 105, 161, 0.3);

  &:hover {
    filter: brightness(1.1);
  }
`;

// ─── Receipt Voucher Styles ───

const ReceiptPrintArea = styled.div`
  padding: 24px;
  background: #090a0f;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const ReceiptHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid rgba(16, 185, 129, 0.35);
  padding-bottom: 14px;

  .brand {
    h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #34d399;
    }
    p {
      margin: 2px 0 0 0;
      font-size: 0.78rem;
      color: #94a3b8;
    }
  }

  .receipt-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;

    .rec-num {
      font-family: monospace;
      font-weight: 800;
      font-size: 0.88rem;
      color: #fff;
    }
    .rec-date {
      font-size: 0.76rem;
      color: #94a3b8;
    }
  }
`;

const ReceiptDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);

  .item {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .lbl {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #94a3b8;
    }
    .val {
      font-size: 0.86rem;
      font-weight: 700;
      color: #fff;
    }
  }
`;

const ReceiptTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;

  th {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-size: 0.74rem;
    text-transform: uppercase;
  }

  td {
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #f1f5f9;
  }
`;

const ReceiptFooterSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;

  .ref-info {
    font-size: 0.78rem;
    color: #cbd5e1;
    line-height: 1.4;
  }
`;

const ReceiptStamp = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  border: 2px dashed #10B981;
  color: #10B981;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  transform: rotate(-3deg);
`;

export default StudentFinance;
