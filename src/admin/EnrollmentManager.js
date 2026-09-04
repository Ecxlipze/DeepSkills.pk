import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  FaCheck, FaTimes, FaEnvelope, FaGraduationCap,
  FaPhone, FaSearch, FaEye,
  FaUserGraduate, FaClock, FaCalendarAlt, FaMoneyCheckAlt, FaInfoCircle,
  FaChevronRight
} from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Skeleton } from '../components/Skeleton';
import { EMAIL_EVENTS, sendAdmissionEmail } from '../utils/emailNotifications';
import { createNotification } from '../utils/notifications';

const Container = styled.div`
  padding: 10px 0;
  color: #fff;
  background: transparent;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
`;

const TitleArea = styled.div`
  h1 {
    font-size: 2rem;
    margin-bottom: 5px;
    background: linear-gradient(90deg, #fff, #888);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  position: relative;
  input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px 15px 10px 40px;
    color: #fff;
    width: 250px;
    transition: all 0.3s;
    &:focus {
      outline: none;
      border-color: #7B1F2E;
      background: rgba(255, 255, 255, 0.1);
      width: 300px;
    }
  }
  svg {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.3);
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  padding: 5px;
  border-radius: 10px;
  margin-bottom: 25px;
  width: fit-content;
`;

const Tab = styled.button`
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: ${props => props.$active ? '#7B1F2E' : 'transparent'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.6)'};
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  }
`;

const TableWrapper = styled.div`
  background: rgba(26, 26, 26, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

const Th = styled.th`
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.03);
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Td = styled.td`
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
`;

const StatusBadge = styled.span`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${props => {
    switch(props.$status) {
      case 'Pending': return 'background: rgba(255, 193, 7, 0.1); color: #ffc107; border: 1px solid rgba(255, 193, 7, 0.2);';
      case 'Approved': return 'background: rgba(0, 123, 255, 0.1); color: #007bff; border: 1px solid rgba(0, 123, 255, 0.2);';
      case 'Active': return 'background: rgba(40, 167, 69, 0.1); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.2);';
      case 'Rejected': return 'background: rgba(220, 53, 69, 0.1); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.2);';
      default: return 'background: rgba(255, 255, 255, 0.1); color: #fff;';
    }
  }}
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  .name { font-weight: 600; color: #fff; font-size: 1rem; margin-bottom: 4px; }
  .detail { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); display: flex; align-items: center; gap: 6px; }
`;

const ActionBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #7B1F2E;
    border-color: #7B1F2E;
    transform: translateY(-2px);
  }
`;

// Modal Styles
const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Modal = styled(motion.div)`
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
`;

const ModalHeader = styled.div`
  padding: 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 { font-size: 1.5rem; color: #fff; }
`;

const ModalContent = styled.div`
  padding: 25px;
`;

const ModalFooter = styled.div`
  padding: 20px 25px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
`;

const InfoItem = styled.div`
  label { display: block; font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
  p { font-size: 1rem; color: #fff; font-weight: 500; }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  label { display: block; margin-bottom: 8px; color: rgba(255,255,255,0.7); }
  select, textarea, input {
    width: 100%;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 8px;
    color: #fff;
    &:focus { outline: none; border-color: #7B1F2E; }
  }
`;

const PrimaryButton = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  &:hover { background: #a32d48; transform: translateY(-2px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.15); }
`;

const EnrollmentManager = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedApp, setSelectedApp] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [totalFee, setTotalFee] = useState(25000);
  const [planType, setPlanType] = useState('installment');
  const [installmentCount, setInstallmentCount] = useState(4);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Initial Admissions
      const { data: apps, error: appError } = await supabase
        .from('admissions')
        .select('*')
        .in('status', ['Pending', 'Approved'])
        .order('submitted_at', { ascending: false });

      if (appError) throw appError;

      // Fetch Re-enrollments
      const { data: reApps, error: reError } = await supabase
        .from('enrollments')
        .select('*, admissions!inner(*)')
        .in('status', ['pending', 'approved'])
        .order('submitted_at', { ascending: false });

      if (reError) throw reError;

      const mappedReApps = (reApps || []).map(re => ({
        ...re.admissions, // spread original admission data for name, email, etc.
        id: re.id, // override id with enrollment id
        original_admission_id: re.admissions.id,
        course: re.course,
        batch: re.batch_name,
        batch_timing: re.batch_timing,
        status: re.status === 'approved' ? 'Approved' : (re.status === 'pending' ? 'Pending' : (re.status === 'rejected' ? 'Rejected' : 'Active')),
        submitted_at: re.submitted_at,
        isReEnrollment: true,
        original_fee: re.original_fee,
        discount_amount: re.discount_amount,
        final_fee: re.final_fee,
        message: re.message,
        rejection_reason: re.rejection_reason
      }));

      const mappedApps = (apps || []).map(app => ({
        ...app,
        isReEnrollment: false
      }));

      const combined = [...mappedApps, ...mappedReApps].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

      setApplications(combined);

      // Fetch Batches
      const { data: batchList, error: batchError } = await supabase
        .from('batches')
        .select('*');

      if (batchError) throw batchError;
      setBatches(batchList || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = applications.filter(app => {
    let matchesTab = false;
    if (activeTab === 'All') matchesTab = app.status === 'Pending' || app.status === 'Approved';
    else if (activeTab === 'Re-enrollment') matchesTab = app.isReEnrollment;
    else matchesTab = app.status === activeTab;

    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.cnic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleReview = (app) => {
    setSelectedApp(app);
    setIsReviewModalOpen(true);
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      if (selectedApp.isReEnrollment) {
        const { error } = await supabase
          .from('enrollments')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString()
          })
          .eq('id', selectedApp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admissions')
          .update({
            status: 'Approved',
            approved_at: new Date().toISOString()
          })
          .eq('id', selectedApp.id);
        if (error) throw error;
      }

      setIsReviewModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to approve application");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setProcessing(true);
    try {
      if (selectedApp.isReEnrollment) {
        const { error } = await supabase
          .from('enrollments')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason
          })
          .eq('id', selectedApp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admissions')
          .update({
            status: 'Rejected',
            rejection_reason: rejectionReason
          })
          .eq('id', selectedApp.id);
        if (error) throw error;
      }

      const emailResult = await sendAdmissionEmail(
        selectedApp.isReEnrollment ? EMAIL_EVENTS.RE_ENROLLMENT_REJECTED : EMAIL_EVENTS.ADMISSION_REJECTED,
        {
          email: selectedApp.email,
          name: selectedApp.name,
          cnic: selectedApp.cnic,
          course: selectedApp.course || selectedApp.selectedCourse,
          reason: rejectionReason
        }
      );
      if (!emailResult.ok) toast.error(`Rejected, but email failed: ${emailResult.message}`);

      await createNotification({
        userId: selectedApp.isReEnrollment ? selectedApp.original_admission_id : selectedApp.id,
        role: 'student',
        type: 'enrollment_rejected',
        title: 'Enrollment Rejected',
        message: `Your ${selectedApp.isReEnrollment ? 're-enrollment' : 'admission'} request for ${selectedApp.course || selectedApp.selectedCourse} was rejected.`,
        link: '/student/new-enrollment',
        sendEmail: false,
        emailData: {
          email: selectedApp.email,
          name: selectedApp.name,
          cnic: selectedApp.cnic,
          course: selectedApp.course || selectedApp.selectedCourse,
          reason: rejectionReason,
          event: selectedApp.isReEnrollment ? EMAIL_EVENTS.RE_ENROLLMENT_REJECTED : EMAIL_EVENTS.ADMISSION_REJECTED
        }
      });

      setIsReviewModalOpen(false);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      toast.error("Failed to reject application");
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenBatchModal = (app) => {
    setSelectedApp(app);
    setIsBatchModalOpen(true);
    // Keep an existing assignment selected, but require a deliberate choice for new approvals.
    const appCourse = app.course || app.selectedCourse;
    const currentBatch = batches.find((batch) =>
      batch.course === appCourse
      && batch.batch_name === app.batch
      && (!app.batch_timing || [batch.time_shift, batch.timing_label].includes(app.batch_timing))
    );
    setSelectedBatch(currentBatch?.id || '');
  };

  const handleGrantAccess = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch");
      return;
    }
    setProcessing(true);
    try {
      const batch = batches.find(b => b.id === selectedBatch);

      // 1. Update Admission record
      if (selectedApp.isReEnrollment) {
        // Only update the enrollments record — do NOT touch the student's current admissions record
        const { error: admError } = await supabase
          .from('enrollments')
          .update({
            status: 'active',
            batch_id: batch.batch_name,
            batch_name: batch.batch_name,
            batch_timing: batch.time_shift,
            activated_at: new Date().toISOString()
          })
          .eq('id', selectedApp.id);
        if (admError) throw admError;

      } else {
        const { error: admError } = await supabase
          .from('admissions')
          .update({
            status: 'Active',
            batch: batch.batch_name,
            batch_timing: batch.time_shift,
            batch_assigned_at: new Date().toISOString()
          })
          .eq('id', selectedApp.id);
        if (admError) throw admError;
      }

      // 2. Add to allowed_cnics to unlock dashboard
      const { error: authError } = await supabase
        .from('allowed_cnics')
        .upsert({
          cnic: selectedApp.cnic,
          name: selectedApp.name,
          role: 'student',
          assigned_course: selectedApp.course || selectedApp.selectedCourse,
          batch: batch.batch_name
        }, { onConflict: 'cnic' });

      if (authError) throw authError;

      // 3. Automate Fee Generation
      const normalizedPlan = planType === 'full' ? 'full' : 'installment';
      const amountPerInst = normalizedPlan === 'full' ? totalFee : Math.round(totalFee / installmentCount);

      // Create Fee Plan record
      const { error: feePlanError } = await supabase
        .from('fee_plans')
        .insert({
          student_id: selectedApp.isReEnrollment ? selectedApp.original_admission_id : selectedApp.id,
          course: selectedApp.course || selectedApp.selectedCourse,
          batch: batch.batch_name,
          total_fee: totalFee,
          plan_type: normalizedPlan,
          installment_count: normalizedPlan === 'full' ? 1 : installmentCount
        })
        .select()
        .single();

      if (feePlanError) throw feePlanError;

      // Create Payment installments
      const paymentRows = [];
      const insts = normalizedPlan === 'full' ? 1 : installmentCount;

      for (let i = 1; i <= insts; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + (i - 1)); // One month apart

        paymentRows.push({
          entity_id: selectedApp.isReEnrollment ? selectedApp.original_admission_id : selectedApp.id,
          entity_type: 'student',
          installment_number: normalizedPlan === 'full' ? null : i,
          total_installments: normalizedPlan === 'full' ? null : insts,
          amount: amountPerInst,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending',
          method: null,
          description: normalizedPlan === 'full' ? 'Full Course Fee' : `Installment ${i} of ${insts}`
        });
      }

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(paymentRows);

      if (paymentsError) throw paymentsError;

      const emailResult = await sendAdmissionEmail(
        selectedApp.isReEnrollment ? EMAIL_EVENTS.RE_ENROLLMENT_APPROVED : EMAIL_EVENTS.ADMISSION_APPROVED,
        {
          email: selectedApp.email,
          name: selectedApp.name,
          cnic: selectedApp.cnic,
          course: selectedApp.course || selectedApp.selectedCourse,
          batch: batch.batch_name,
          timing: batch.time_shift
        }
      );
      if (!emailResult.ok) toast.error(`Access granted, but email failed: ${emailResult.message}`);

      await createNotification({
        userId: selectedApp.isReEnrollment ? selectedApp.original_admission_id : selectedApp.id,
        role: 'student',
        type: selectedApp.isReEnrollment ? 'enrollment_approved' : 'batch',
        title: selectedApp.isReEnrollment ? 'Re-enrollment Approved' : 'Enrollment Confirmed',
        message: `You have been enrolled in ${batch.batch_name} — ${selectedApp.course || selectedApp.selectedCourse}.`,
        link: '/student/dashboard',
        sendEmail: false,
        emailData: {
          email: selectedApp.email,
          name: selectedApp.name,
          cnic: selectedApp.cnic,
          course: selectedApp.course || selectedApp.selectedCourse,
          batch: batch.batch_name,
          timing: batch.time_shift,
          event: selectedApp.isReEnrollment ? EMAIL_EVENTS.RE_ENROLLMENT_APPROVED : EMAIL_EVENTS.ADMISSION_APPROVED
        }
      });

      // 4. Referral Program Logic
      if (selectedApp.referred_by) {
        try {
          // Look up referrer by code
          const { data: codeData } = await supabase
            .from('referral_codes')
            .select('user_id, user_role')
            .eq('code', selectedApp.referred_by)
            .single();

          if (codeData) {
            // Get reward settings
            const { data: settings } = await supabase.from('referral_settings').select('cash_reward').single();
            const rewardAmount = settings ? settings.cash_reward : 1000;

            // Create or Update Referral Record
            const { error: refError } = await supabase
              .from('referrals')
              .upsert({
                referrer_id: codeData.user_id,
                referrer_role: codeData.user_role,
                referred_id: selectedApp.id, // Using admission ID for now as students don't have user_id yet
                referred_name: selectedApp.name,
                referred_phone: selectedApp.phone,
                status: 'enrolled',
                payout_status: 'pending',
                reward_amount: rewardAmount,
                referred_at: selectedApp.submitted_at // Link to original registration time
              }, { onConflict: 'referred_id' });

            if (refError) console.error('Referral recording failed:', refError);
          }
        } catch (refLogErr) {
          console.error('Error in referral hook:', refLogErr);
        }
      }

      setIsFeeModalOpen(false);
      setIsBatchModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to grant access: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const tabs = ['Pending', 'Approved', 'Re-enrollment'];

  return (
    <Container>
      <Header>
        <TitleArea>
          <h1>Admission Management</h1>
          <p>Review applications, manage approvals, and unlock student dashboard access.</p>
        </TitleArea>
        <Controls>
          <SearchBox>
            <FaSearch />
            <input
              placeholder="Search by Name, CNIC, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchBox>
        </Controls>
      </Header>

      <Tabs>
        {tabs.map(tab => (
          <Tab
            key={tab}
            $active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Tab>
        ))}
      </Tabs>

      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>CNIC</Th>
              <Th>Course</Th>
              <Th>Status</Th>
              <Th>Applied On</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {[...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <Td><Skeleton height="40px" width="180px" /></Td>
                    <Td><Skeleton height="20px" width="120px" /></Td>
                    <Td><Skeleton height="40px" width="150px" /></Td>
                    <Td><Skeleton height="24px" width="80px" radius="12px" /></Td>
                    <Td><Skeleton height="20px" width="100px" /></Td>
                    <Td><Skeleton height="36px" width="36px" radius="8px" /></Td>
                  </tr>
                ))}
              </>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredApps.map(app => (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                  >
                    <Td>
                      <UserInfo>
                        <span className="name">{app.name}</span>
                        <span className="detail"><FaEnvelope size={10} /> {app.email}</span>
                        <span className="detail"><FaPhone size={10} /> {app.phone || app.mobileNo}</span>
                      </UserInfo>
                    </Td>
                    <Td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{app.cnic}</Td>
                    <Td>
                      <UserInfo>
                        <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {app.course || app.selectedCourse}
                          {app.isReEnrollment && (
                            <span style={{ background: '#9333ea', color: '#fff', fontSize: '0.65rem', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                              RE-ENROLLMENT
                            </span>
                          )}
                        </span>
                        <span className="detail"><FaGraduationCap size={10} /> {app.education || app.lastEducation}</span>
                      </UserInfo>
                    </Td>
                    <Td>
                      <StatusBadge $status={app.status}>{app.status}</StatusBadge>
                    </Td>
                    <Td style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                      {new Date(app.submitted_at || app.created_at).toLocaleDateString()}
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {app.status === 'Pending' && (
                          <ActionBtn onClick={() => handleReview(app)} title="Review Application">
                            <FaEye />
                          </ActionBtn>
                        )}
                        {app.status === 'Approved' && (
                          <ActionBtn onClick={() => handleOpenBatchModal(app)} title="Assign Batch">
                            <FaUserGraduate />
                          </ActionBtn>
                        )}
                        {app.status === 'Active' && (
                          <ActionBtn onClick={() => handleOpenBatchModal(app)} title="Edit Batch">
                            <FaCalendarAlt />
                          </ActionBtn>
                        )}
                      </div>
                    </Td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </Table>
        {filteredApps.length === 0 && (
          <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            No applications found matching your criteria.
          </div>
        )}
      </TableWrapper>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedApp && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Modal
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <ModalHeader>
                <h2>Review Application</h2>
                <FaTimes style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => setIsReviewModalOpen(false)} />
              </ModalHeader>
              <ModalContent>
                <InfoGrid>
                  <InfoItem>
                    <label>Full Name</label>
                    <p>{selectedApp.name}</p>
                  </InfoItem>
                  <InfoItem>
                    <label>CNIC</label>
                    <p>{selectedApp.cnic}</p>
                  </InfoItem>
                  <InfoItem>
                    <label>Email</label>
                    <p>{selectedApp.email}</p>
                  </InfoItem>
                  <InfoItem>
                    <label>Phone</label>
                    <p>{selectedApp.phone || selectedApp.mobileNo}</p>
                  </InfoItem>
                  <InfoItem>
                    <label>Selected Course</label>
                    <p>{selectedApp.course || selectedApp.selectedCourse}</p>
                  </InfoItem>
                  <InfoItem>
                    <label>Education</label>
                    <p>{selectedApp.education || selectedApp.lastEducation}</p>
                  </InfoItem>
                  <InfoItem>
                    <label>How they heard</label>
                    <p>{selectedApp.hear_about_us || selectedApp.source || 'N/A'}</p>
                  </InfoItem>
                  <InfoItem>
                    <label>Applied At</label>
                    <p>{new Date(selectedApp.submitted_at || selectedApp.created_at).toLocaleString()}</p>
                  </InfoItem>
                </InfoGrid>

                <FormGroup>
                  <label>Rejection Reason (only if rejecting)</label>
                  <textarea
                    rows="3"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </FormGroup>
              </ModalContent>
              <ModalFooter>
                <SecondaryButton onClick={() => setIsReviewModalOpen(false)}>Cancel</SecondaryButton>
                <PrimaryButton
                  style={{ background: '#7a2136' }}
                  onClick={handleReject}
                  disabled={processing}
                >
                  <FaTimes /> {processing ? '...' : 'Reject'}
                </PrimaryButton>
                <PrimaryButton
                  style={{ background: '#1b4d3e' }}
                  onClick={handleApprove}
                  disabled={processing}
                >
                  <FaCheck /> {processing ? '...' : 'Approve'}
                </PrimaryButton>
              </ModalFooter>
            </Modal>
          </Overlay>
        )}
      </AnimatePresence>

      {/* Batch Assignment Modal */}
      <AnimatePresence>
        {isBatchModalOpen && selectedApp && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Modal
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <ModalHeader>
                <h2>Assign Batch & Grant Access</h2>
                <FaTimes style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => setIsBatchModalOpen(false)} />
              </ModalHeader>
              <ModalContent>
                <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(25, 135, 84, 0.1)', borderRadius: '10px', border: '1px solid rgba(25, 135, 84, 0.2)' }}>
                  <p style={{ color: '#198754', fontSize: '0.9rem' }}>
                    <strong>Note:</strong> Confirming this will add <strong>{selectedApp.cnic}</strong> to the allowed users list and enable their dashboard login.
                  </p>
                </div>

                <FormGroup>
                  <label>Target Course</label>
                  <input value={selectedApp.course || selectedApp.selectedCourse} disabled />
                </FormGroup>

                <FormGroup>
                  <label>Select Batch*</label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                  >
                    <option value="">Choose a batch...</option>
                    {batches
                      .filter(b => b.course === (selectedApp.course || selectedApp.selectedCourse) && b.status === 'Active')
                      .map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_name} ({batch.time_shift})
                        </option>
                      ))
                    }
                  </select>
                </FormGroup>

                {selectedBatch && (
                  <InfoGrid style={{ marginTop: '20px' }}>
                    <InfoItem>
                      <label><FaClock /> Timing</label>
                      <p>{batches.find(b => b.id === selectedBatch)?.time_shift}</p>
                    </InfoItem>
                    <InfoItem>
                      <label><FaUserGraduate /> Students</label>
                      <p>Currently {Math.floor(Math.random() * 20)} Enrolled</p>
                    </InfoItem>
                  </InfoGrid>
                )}
              </ModalContent>
              <ModalFooter>
                <SecondaryButton onClick={() => setIsBatchModalOpen(false)}>Cancel</SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    setIsFeeModalOpen(true);
                  }}
                  disabled={processing || !selectedBatch}
                >
                  Next: Setup Fee Plan <FaChevronRight />
                </PrimaryButton>
              </ModalFooter>
            </Modal>
          </Overlay>
        )}
      </AnimatePresence>

      {/* Fee Setup Modal */}
      <AnimatePresence>
        {isFeeModalOpen && selectedApp && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Modal
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <ModalHeader>
                <h2><FaMoneyCheckAlt /> Setup Fee Plan</h2>
                <FaTimes style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => setIsFeeModalOpen(false)} />
              </ModalHeader>
              <ModalContent>
                <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(79, 142, 247, 0.1)', borderRadius: '10px', border: '1px solid rgba(79, 142, 247, 0.2)' }}>
                  <p style={{ color: '#4F8EF7', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaInfoCircle /> Configure how this student will pay for the course.
                  </p>
                </div>

                <FormGroup>
                  <label>Total Course Fee (Rs.)</label>
                  <input
                    type="number"
                    value={totalFee}
                    onChange={(e) => setTotalFee(parseInt(e.target.value))}
                  />
                </FormGroup>

                <FormGroup>
                  <label>Payment Plan</label>
                  <select value={planType} onChange={(e) => setPlanType(e.target.value)}>
                    <option value="installment">Installment Plan</option>
                    <option value="full">One-time Full Payment</option>
                  </select>
                </FormGroup>

                {planType === 'installment' && (
                  <FormGroup>
                    <label>Number of Installments</label>
                    <select
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                    >
                      {[2,3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n} Months</option>)}
                    </select>
                    <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#10B981', fontWeight: '600' }}>
                      Calculated: Rs. {Math.round(totalFee / installmentCount).toLocaleString()} / month
                    </p>
                  </FormGroup>
                )}
              </ModalContent>
              <ModalFooter>
                <SecondaryButton onClick={() => {
                  setIsFeeModalOpen(false);
                  setIsBatchModalOpen(true);
                }}>Back</SecondaryButton>
                <PrimaryButton
                  onClick={handleGrantAccess}
                  disabled={processing}
                >
                  <FaCheck /> {processing ? 'Generating...' : 'Finalize Admission'}
                </PrimaryButton>
              </ModalFooter>
            </Modal>
          </Overlay>
        )}
      </AnimatePresence>
    </Container>
  );
};

const EnrollmentManagerPage = () => <AdminLayout><EnrollmentManager /></AdminLayout>;
export { EnrollmentManager };
export default EnrollmentManagerPage;
