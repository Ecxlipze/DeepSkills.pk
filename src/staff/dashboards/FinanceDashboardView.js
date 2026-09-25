import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaMoneyBillWave, FaCoins, FaCheckCircle, FaExclamationTriangle,
  FaFileInvoiceDollar, FaWhatsapp, FaPhoneAlt, FaSearch, FaPlus,
  FaArrowRight, FaClock, FaCalendarAlt, FaTimes, FaSignInAlt,
  FaSignOutAlt, FaCoffee, FaPlay, FaStop, FaTasks, FaUserGraduate,
  FaChalkboardTeacher, FaChartLine, FaFilter
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../../components/portal/PortalTheme';
import { supabase } from '../../supabaseClient';
import { formatHourDecimal } from '../../utils/timeTrackingApi';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1240px;
  margin: 0 auto;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.15) 40%, rgba(20, 24, 33, 0.95) 100%);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: ${portalTheme.radii.lg};
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);

  .text-side {
    display: flex;
    flex-direction: column;
    gap: 6px;

    h1 {
      font-size: 1.65rem;
      font-weight: 800;
      margin: 0;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    p {
      margin: 0;
      font-size: 0.92rem;
      color: rgba(255, 255, 255, 0.75);
    }
  }

  .actions-side {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34D399;
  padding: 4px 12px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.8rem;
  font-weight: 700;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #10B981, #059669);
  border: 1px solid rgba(16, 185, 129, 0.6);
  color: #fff;
  padding: 10px 18px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
  }
`;

const SecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 10px 16px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    color: #fff;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${props => props.$border || portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  transition: all 0.2s ease;

  ${props => props.$alert && `
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(30, 34, 46, 0.9) 100%);
    border-color: rgba(239, 68, 68, 0.4);
  `}

  .icon {
    width: 50px;
    height: 50px;
    border-radius: ${portalTheme.radii.md};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: ${props => props.$bg || 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.$color || '#fff'};
    flex-shrink: 0;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .val {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
    }

    .lbl {
      font-size: 0.8rem;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .sub {
      font-size: 0.76rem;
      color: ${props => props.$subColor || '#94A3B8'};
      font-weight: 500;
    }
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1.65fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 14px;

    h3 {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;

      .badge {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: ${portalTheme.radii.pill};
        font-weight: 700;
      }
    }

    a {
      font-size: 0.82rem;
      color: #38BDF8;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 600;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const DueItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${props => props.$isOverdue ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.07)'};
  border-left: 4px solid ${props => props.$isOverdue ? '#EF4444' : '#F59E0B'};
  border-radius: ${portalTheme.radii.sm};
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 200px;

    .top-line {
      display: flex;
      align-items: center;
      gap: 10px;

      .name {
        font-weight: 700;
        font-size: 0.95rem;
        color: #fff;
      }

      .inst-badge {
        font-size: 0.74rem;
        padding: 2px 8px;
        background: rgba(245, 158, 11, 0.15);
        color: #FBBF24;
        border-radius: 4px;
        font-weight: 700;
      }

      .course-name {
        font-size: 0.76rem;
        color: #94A3B8;
      }
    }

    .bottom-line {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 0.8rem;
      color: ${portalTheme.colors.textMuted};

      .due-date {
        color: ${props => props.$isOverdue ? '#F87171' : '#FBBF24'};
        font-weight: 600;
      }

      .amount-due {
        color: #fff;
        font-weight: 800;
        font-size: 0.92rem;
      }
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
`;

const IconBtn = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$color || '#fff'};
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.06);

  &:hover {
    filter: brightness(1.2);
    transform: scale(1.05);
  }
`;

const MiniBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  background: ${props => props.$variant === 'green' ? 'linear-gradient(135deg, #10B981, #059669)' : (props.$variant === 'amber' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255, 255, 255, 0.08)')};
  color: #fff;

  &:hover {
    filter: brightness(1.15);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalBox = styled.div`
  background: #181B26;
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: ${portalTheme.radii.lg};
  width: 100%;
  max-width: 540px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 18px;

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    button {
      background: none;
      border: none;
      color: ${portalTheme.colors.textMuted};
      font-size: 1.1rem;
      cursor: pointer;

      &:hover {
        color: #fff;
      }
    }
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
    }

    input, select, textarea {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 9px 12px;
      color: #fff;
      font-size: 0.88rem;

      &:focus {
        outline: none;
        border-color: #10B981;
      }
    }
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
`;

const ShiftStatusBox = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${portalTheme.radii.md};
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  .shift-info {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .status-text {
      font-size: 0.85rem;
      font-weight: 700;
      color: ${props => props.$color || '#fff'};
    }

    .time-text {
      font-size: 0.82rem;
      color: ${portalTheme.colors.textMuted};
    }
  }

  .shift-buttons {
    display: flex;
    gap: 8px;
  }
`;

export default function FinanceDashboardView({
  user,
  shift,
  todaySeconds,
  myTasks,
  activeTimer,
  handleShiftPunch,
  handleToggleTimer,
  onRefresh
}) {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    paymentId: '',
    amount: '',
    method: 'cash',
    reference: '',
    paidDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes, fpRes, tpRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('admissions').select('id, name, course, batch, phone, status'),
        supabase.from('fee_plans').select('*'),
        supabase.from('teacher_payments').select('*').order('paid_on', { ascending: false })
      ]);

      if (pRes.data) setPayments(pRes.data);
      if (sRes.data) setStudents(sRes.data || []);
      if (fpRes.data) setFeePlans(fpRes.data || []);
      if (tpRes.data) setTeacherPayments(tpRes.data || []);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Compute metrics
  const metrics = useMemo(() => {
    const studentPayments = payments.filter(p => p.entity_type === 'student');

    // Collected this month
    const thisMonthPaid = studentPayments.filter(p =>
      p.status === 'paid' && p.paid_date && p.paid_date.startsWith(currentMonthStr)
    );
    const totalCollectedMonth = thisMonthPaid.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Today's collections
    const todayPaid = studentPayments.filter(p =>
      p.status === 'paid' && p.paid_date === todayStr
    );
    const totalCollectedToday = todayPaid.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Overdue dues
    const overdueList = studentPayments.filter(p =>
      p.status === 'pending' && p.due_date && p.due_date <= todayStr
    );
    const totalOverdue = overdueList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Teacher salaries this month
    const teacherSalariesMonth = teacherPayments.filter(tp =>
      tp.paid_on && tp.paid_on.startsWith(currentMonthStr)
    );
    const totalSalariesPaid = teacherSalariesMonth.reduce((sum, tp) => sum + (Number(tp.amount) || 0), 0);

    return {
      totalCollectedMonth,
      paidCountMonth: thisMonthPaid.length,
      totalCollectedToday,
      todayPaidCount: todayPaid.length,
      totalOverdue,
      overdueCount: overdueList.length,
      overdueList,
      totalSalariesPaid,
      teacherPaidCount: teacherSalariesMonth.length
    };
  }, [payments, teacherPayments, todayStr, currentMonthStr]);

  // Enriched Overdue List with student names and phone
  const enrichedOverdue = useMemo(() => {
    return metrics.overdueList.map(p => {
      const student = students.find(s => s.id === p.entity_id);
      return {
        ...p,
        studentName: student?.name || 'Student',
        phone: student?.phone || '',
        course: student?.course || '',
        batch: student?.batch || ''
      };
    });
  }, [metrics.overdueList, students]);

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return payments.slice(0, 6).map(p => {
      const student = students.find(s => s.id === p.entity_id);
      return {
        ...p,
        studentName: student?.name || (p.entity_type === 'teacher' ? 'Faculty Member' : 'Student')
      };
    });
  }, [payments, students]);

  // WhatsApp reminder generator
  const getWhatsAppReminderUrl = (item) => {
    if (!item.phone) return null;
    const clean = String(item.phone).replace(/\D/g, '');
    if (!clean) return null;
    let intl = clean;
    if (clean.startsWith('0')) intl = `92${clean.slice(1)}`;
    else if (!clean.startsWith('92') && clean.length === 10) intl = `92${clean}`;

    const text = encodeURIComponent(
      `Assalam-o-Alaikum ${item.studentName},\nThis is a friendly reminder from DeepSkills Accounts Office regarding your course fee installment #${item.installment_number || 1} of Rs. ${Number(item.amount).toLocaleString()}.\nDue Date: ${item.due_date}.\nPlease submit your fee receipt or visit the campus accounts office to keep your enrollment active.\nThank you!`
    );
    return `https://wa.me/${intl}?text=${text}`;
  };

  // Open Quick Payment modal pre-filled
  const handleOpenPaymentModal = (overdueItem = null) => {
    if (overdueItem) {
      setPaymentForm({
        studentId: overdueItem.entity_id,
        paymentId: overdueItem.id,
        amount: String(overdueItem.amount || ''),
        method: 'cash',
        reference: '',
        paidDate: todayStr,
        notes: `Installment #${overdueItem.installment_number} cleared`
      });
    } else {
      setPaymentForm({
        studentId: '',
        paymentId: '',
        amount: '',
        method: 'cash',
        reference: '',
        paidDate: todayStr,
        notes: ''
      });
    }
    setPaymentModalOpen(true);
  };

  // Handle Quick Payment Submission
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.studentId) return toast.error('Please select a student');
    if (!paymentForm.amount) return toast.error('Please enter amount');

    try {
      const updateData = {
        amount: Number(paymentForm.amount),
        status: 'paid',
        paid_date: paymentForm.paidDate || todayStr,
        method: paymentForm.method || 'cash',
        reference_number: paymentForm.reference || null,
        notes: paymentForm.notes || null,
        recorded_by: user?.name || user?.full_name || 'Finance Officer'
      };

      if (paymentForm.paymentId) {
        // Updating existing installment payment
        const { error } = await supabase.from('payments').update(updateData).eq('id', paymentForm.paymentId);
        if (error) throw error;
      } else {
        // Recording ad-hoc student payment
        const { error } = await supabase.from('payments').insert([{
          ...updateData,
          entity_id: paymentForm.studentId,
          entity_type: 'student',
          installment_number: 1,
          total_installments: 1
        }]);
        if (error) throw error;
      }

      toast.success(`Payment of Rs. ${Number(paymentForm.amount).toLocaleString()} recorded successfully!`);
      setPaymentModalOpen(false);
      loadFinanceData();
    } catch (err) {
      toast.error('Failed to record payment: ' + (err.message || err));
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Container>
      {/* ── WELCOME BANNER ── */}
      <WelcomeBanner>
        <div className="text-side">
          <h1>
            {getGreeting()}, {user?.name || user?.full_name || 'Finance Officer'} 👋
            <RoleBadge><FaMoneyBillWave /> Finance & Accounts</RoleBadge>
          </h1>
          <p>
            Welcome to the Finance Control Center. Today's intake is <strong>Rs. {metrics.totalCollectedToday.toLocaleString()}</strong>.
            {metrics.overdueCount > 0 && ` 🚨 ${metrics.overdueCount} student installments are currently overdue.`}
          </p>
        </div>
        <div className="actions-side">
          <PrimaryBtn onClick={() => handleOpenPaymentModal(null)}>
            <FaPlus /> + Record Payment
          </PrimaryBtn>
          <SecondaryBtn to="/staff/fees">
            <FaFileInvoiceDollar /> Student Fees
          </SecondaryBtn>
          <SecondaryBtn to="/staff/salaries">
            <FaChalkboardTeacher /> Teacher Payroll
          </SecondaryBtn>
          <SecondaryBtn to="/staff/reports">
            <FaChartLine /> Reports
          </SecondaryBtn>
        </div>
      </WelcomeBanner>

      {/* ── KPI METRICS GRID ── */}
      <StatsGrid>
        <StatCard $bg="rgba(16, 185, 129, 0.15)" $color="#34D399" $border="rgba(16, 185, 129, 0.35)">
          <div className="icon"><FaCoins /></div>
          <div className="meta">
            <span className="val">Rs. {metrics.totalCollectedMonth.toLocaleString()}</span>
            <span className="lbl">Collected This Month</span>
            <span className="sub">{metrics.paidCountMonth} payments received</span>
          </div>
        </StatCard>

        <StatCard $bg="rgba(56, 189, 248, 0.15)" $color="#38BDF8">
          <div className="icon"><FaMoneyBillWave /></div>
          <div className="meta">
            <span className="val">Rs. {metrics.totalCollectedToday.toLocaleString()}</span>
            <span className="lbl">Today's Collections</span>
            <span className="sub">{metrics.todayPaidCount} transactions today</span>
          </div>
        </StatCard>

        <StatCard
          $border={metrics.overdueCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.35)'}
          $bg={metrics.overdueCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}
          $color={metrics.overdueCount > 0 ? '#F87171' : '#FBBF24'}
          $alert={metrics.overdueCount > 0}
        >
          <div className="icon"><FaExclamationTriangle /></div>
          <div className="meta">
            <span className="val">Rs. {metrics.totalOverdue.toLocaleString()}</span>
            <span className="lbl">Overdue Dues</span>
            <span className="sub">
              {metrics.overdueCount > 0
                ? `🚨 ${metrics.overdueCount} installments past due date`
                : 'All dues collected on time'}
            </span>
          </div>
        </StatCard>

        <StatCard $bg="rgba(139, 92, 246, 0.15)" $color="#A78BFA">
          <div className="icon"><FaChalkboardTeacher /></div>
          <div className="meta">
            <span className="val">Rs. {metrics.totalSalariesPaid.toLocaleString()}</span>
            <span className="lbl">Faculty Payroll Paid</span>
            <span className="sub">{metrics.teacherPaidCount} teacher disbursements</span>
          </div>
        </StatCard>
      </StatsGrid>

      {/* ── TWO COLUMN OPERATIONAL SECTION ── */}
      <TwoColumnGrid>
        {/* LEFT COLUMN: Overdue Installments & Recent Transactions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Overdue Collections Queue */}
          <Card>
            <div className="card-header">
              <h3>
                <FaExclamationTriangle style={{ color: '#EF4444' }} />
                Overdue Installments & Recovery Queue
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171' }}>
                  {metrics.overdueCount} Overdue
                </span>
              </h3>
              <Link to="/staff/fees">All Student Fees <FaArrowRight /></Link>
            </div>

            {enrichedOverdue.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: portalTheme.colors.textMuted }}>
                <FaCheckCircle style={{ fontSize: '2.4rem', color: '#10B981', opacity: 0.8, marginBottom: '10px' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1rem' }}>No Overdue Installments!</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>All student installments are fully settled or up to date.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {enrichedOverdue.slice(0, 6).map((item) => {
                  const waUrl = getWhatsAppReminderUrl(item);
                  const isPast = item.due_date && item.due_date < todayStr;

                  return (
                    <DueItem key={item.id} $isOverdue={isPast}>
                      <div className="details">
                        <div className="top-line">
                          <span className="name">{item.studentName}</span>
                          <span className="inst-badge">Inst #{item.installment_number}</span>
                          {item.course && <span className="course-name">{item.course}</span>}
                        </div>
                        <div className="bottom-line">
                          <span className="due-date">
                            <FaCalendarAlt /> Due: {item.due_date} ({isPast ? 'Overdue' : 'Due Today'})
                          </span>
                          <span className="amount-due">Rs. {Number(item.amount).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="actions">
                        {waUrl && (
                          <IconBtn
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            $bg="rgba(16, 185, 129, 0.2)"
                            $color="#34D399"
                            title="Send Fee Reminder WhatsApp"
                          >
                            <FaWhatsapp />
                          </IconBtn>
                        )}
                        {item.phone && (
                          <IconBtn
                            href={`tel:${item.phone}`}
                            $bg="rgba(56, 189, 248, 0.2)"
                            $color="#38BDF8"
                            title="Call Student"
                          >
                            <FaPhoneAlt />
                          </IconBtn>
                        )}
                        <MiniBtn
                          $variant="green"
                          onClick={() => handleOpenPaymentModal(item)}
                        >
                          Record Fee
                        </MiniBtn>
                      </div>
                    </DueItem>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Card 2: Recent Transactions Audit Stream */}
          <Card>
            <div className="card-header">
              <h3><FaFileInvoiceDollar style={{ color: '#10B981' }} /> Recent Financial Transactions</h3>
              <Link to="/staff/transactions">Full Ledger <FaArrowRight /></Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentTransactions.length === 0 ? (
                <div style={{ color: portalTheme.colors.textMuted, fontSize: '0.85rem' }}>No recent transactions recorded.</div>
              ) : (
                recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: portalTheme.radii.sm,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{tx.studentName}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          background: tx.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: tx.status === 'paid' ? '#34D399' : '#FBBF24',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {tx.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                        {tx.method?.toUpperCase()} {tx.reference_number ? `• Ref: ${tx.reference_number}` : ''} • {tx.paid_date || tx.created_at?.slice(0, 10)}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: tx.status === 'paid' ? '#34D399' : '#fff' }}>
                        Rs. {Number(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Daily Shift Attendance, Fast Actions, Daily Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 3: Shift Attendance & Hours */}
          <Card>
            <div className="card-header">
              <h3><FaClock style={{ color: '#60A5FA' }} /> Shift & Daily Work Status</h3>
              <Link to="/staff/time-tracker">Time Hub <FaArrowRight /></Link>
            </div>

            <ShiftStatusBox $color={shift?.status === 'on_duty' ? '#10B981' : (shift?.status === 'on_break' ? '#F59E0B' : '#9CA3AF')}>
              <div className="shift-info">
                <span className="status-text">
                  {shift?.status === 'on_duty' && '• Clocked In & On Duty'}
                  {shift?.status === 'on_break' && '• On Lunch / Break'}
                  {shift?.status === 'completed' && '✓ Shift Ended for Today'}
                  {!shift && 'Shift: Not Clocked In Yet'}
                </span>
                <span className="time-text">
                  {shift?.clock_in
                    ? `Clock-in: ${new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Punch in to start tracking your daily shift'}
                </span>
              </div>

              <div className="shift-buttons">
                {!shift && (
                  <MiniBtn $variant="green" onClick={() => handleShiftPunch('clock-in')}>
                    <FaSignInAlt /> Clock In
                  </MiniBtn>
                )}
                {shift && shift.status === 'on_duty' && (
                  <>
                    <MiniBtn $variant="amber" onClick={() => handleShiftPunch('break-start')}>
                      <FaCoffee /> Break
                    </MiniBtn>
                    <MiniBtn style={{ background: '#EF4444', color: '#fff' }} onClick={() => handleShiftPunch('clock-out')}>
                      <FaSignOutAlt /> Clock Out
                    </MiniBtn>
                  </>
                )}
                {shift && shift.status === 'on_break' && (
                  <>
                    <MiniBtn $variant="green" onClick={() => handleShiftPunch('break-end')}>
                      Resume
                    </MiniBtn>
                    <MiniBtn style={{ background: '#EF4444', color: '#fff' }} onClick={() => handleShiftPunch('clock-out')}>
                      Clock Out
                    </MiniBtn>
                  </>
                )}
              </div>
            </ShiftStatusBox>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.84rem', color: '#94A3B8' }}>Logged Task Work Today</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#34D399' }}>{formatHourDecimal(todaySeconds)}h</span>
            </div>
          </Card>

          {/* Card 4: Quick Finance Navigation */}
          <Card>
            <div className="card-header">
              <h3><FaMoneyBillWave style={{ color: '#10B981' }} /> Accounts Workstation Shortcuts</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link
                to="/staff/fees"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '8px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaUserGraduate style={{ color: '#38BDF8' }} /> Student Fee Plans & Ledgers
                </span>
                <FaArrowRight style={{ fontSize: '0.8rem', color: '#94A3B8' }} />
              </Link>

              <Link
                to="/staff/salaries"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '8px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaChalkboardTeacher style={{ color: '#A78BFA' }} /> Faculty Salaries & Payslips
                </span>
                <FaArrowRight style={{ fontSize: '0.8rem', color: '#94A3B8' }} />
              </Link>

              <Link
                to="/staff/transactions"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '8px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaFileInvoiceDollar style={{ color: '#34D399' }} /> Complete Transactions Ledger
                </span>
                <FaArrowRight style={{ fontSize: '0.8rem', color: '#94A3B8' }} />
              </Link>

              <Link
                to="/staff/reports"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '8px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaChartLine style={{ color: '#FBBF24' }} /> Revenue & Audit Reports
                </span>
                <FaArrowRight style={{ fontSize: '0.8rem', color: '#94A3B8' }} />
              </Link>
            </div>
          </Card>

          {/* Card 5: My Daily Assigned Tasks */}
          <Card>
            <div className="card-header">
              <h3><FaTasks style={{ color: '#38BDF8' }} /> My Accounts Tasks</h3>
              <Link to="/staff/tasks">Jira Board <FaArrowRight /></Link>
            </div>

            {myTasks.length === 0 ? (
              <div style={{ padding: '18px 0', textAlign: 'center', color: portalTheme.colors.textMuted, fontSize: '0.85rem' }}>
                <p style={{ margin: 0 }}>No active Jira tasks assigned right now.</p>
                <Link to="/staff/tasks" style={{ color: '#38BDF8', fontSize: '0.8rem', marginTop: '6px', display: 'inline-block' }}>
                  + Create task on Board
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myTasks.map((t) => {
                  const isRunning = Boolean(activeTimer && activeTimer.task_id === t.id);
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: portalTheme.radii.sm,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700 }}>
                          {t.task_key}
                        </span>
                        <span style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleTimer(t)}
                        style={{
                          background: isRunning ? '#EF4444' : '#10B981',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {isRunning ? <FaStop /> : <FaPlay />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </TwoColumnGrid>

      {/* ── MODAL: QUICK RECORD PAYMENT ── */}
      {paymentModalOpen && (
        <ModalOverlay onClick={() => setPaymentModalOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3><FaPlus style={{ color: '#10B981' }} /> Record Student Fee Payment</h3>
              <button onClick={() => setPaymentModalOpen(false)}><FaTimes /></button>
            </div>

            <form onSubmit={handleSubmitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-row">
                <label>Select Student *</label>
                <select
                  required
                  value={paymentForm.studentId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.course || 'No course'} • {s.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Amount in Rs. *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 15000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Payment Method *</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online Payment (1Link/JazzCash)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Transaction / Bank Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-892182"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paidDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Notes / Voucher Details</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid in full for first month installment"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <MiniBtn type="button" onClick={() => setPaymentModalOpen(false)}>
                  Cancel
                </MiniBtn>
                <PrimaryBtn type="submit">
                  Save & Confirm Payment
                </PrimaryBtn>
              </div>
            </form>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
}
