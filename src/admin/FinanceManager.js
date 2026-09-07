import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMoneyBillWave, FaUserGraduate, FaChalkboardTeacher,
  FaChartBar, FaSearch, FaExclamationTriangle, FaTimes,
  FaEye, FaPlus, FaHistory, FaArrowRight, FaSyncAlt,
  FaChevronRight,  FaCoins, FaCheckCircle, FaExclamationCircle,
  FaFileInvoiceDollar, FaWhatsapp, FaPhoneAlt, FaEnvelope,
  FaIdCard, FaFilter, FaClock, FaBook, FaUsers,
  FaFilePdf, FaDownload, FaUndo
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { getAuthHeaders } from '../utils/adminAccessApi';
import { createFeeReceiptPdf } from '../utils/financePdf';

const normalizeTab = (raw) => {
  if (!raw || raw === 'overview') return 'overview';
  if (raw === 'fees' || raw === 'students') return 'students';
  if (raw === 'salaries' || raw === 'teachers') return 'teachers';
  return 'overview';
};

const FinanceManager = ({ initialTab = 'overview' }) => {
  const router = useRouter();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'finance', 'full');
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pathSegment = location?.pathname ? location.pathname.split('/')[3] : null;
    const resolved = initialTab || pathSegment || 'overview';
    setActiveTab(normalizeTab(resolved));
  }, [initialTab, location?.pathname]);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'overview') {
      navigate('/admin/finance');
    } else if (tabKey === 'students') {
      navigate('/admin/finance/fees');
    } else if (tabKey === 'teachers') {
      navigate('/admin/finance/salaries');
    }
  };
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingFees: 0,
    teacherSalaries: 0,
    netBalance: 0
  });

  const [studentFees, setStudentFees] = useState([]);
  const [teacherSalaries, setTeacherSalaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('all');
  const [studentBatchFilter, setStudentBatchFilter] = useState('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [generatingPdf, setGeneratingPdf] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [selectedTeacherForPay, setSelectedTeacherForPay] = useState(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    reference: '',
    paid_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 0. Try server overview endpoint first (handles portal session auth + service-role reads)
      try {
        const headers = await getAuthHeaders();
        let overviewRes = await fetch('/api/admin/finance/overview', { headers });
        if (overviewRes.status === 404) {
          overviewRes = await fetch('/api/admin/finance/overview.php', { headers });
        }
        if (overviewRes.ok) {
          const resData = await overviewRes.json().catch(() => null);
          if (resData?.status === 'success' && resData.data) {
            setStats(resData.data.stats || { totalRevenue: 0, outstandingFees: 0, teacherSalaries: 0, netBalance: 0 });
            setStudentFees(resData.data.studentFees || []);
            setTeacherSalaries(resData.data.teacherSalaries || []);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Fall through to direct Supabase query
      }

      // 1. Fetch Stats
      const { data: allPayments } = await supabase.from('payments').select('amount, status, entity_type');
      const { data: allTeacherPayments } = await supabase.from('teacher_payments').select('amount, status');

      let revenue = 0;
      let outstanding = 0;
      let salaries = 0;

      allPayments?.forEach(p => {
        if (p.entity_type === 'student') {
          if (p.status === 'paid') revenue += p.amount;
          else outstanding += p.amount;
        } else if (p.entity_type === 'teacher' && p.status === 'paid') {
          salaries += p.amount;
        }
      });

      allTeacherPayments?.forEach(tp => {
        if (tp.status?.toLowerCase() === 'paid') {
          salaries += Number(tp.amount || 0);
        }
      });

      setStats({
        totalRevenue: revenue,
        outstandingFees: outstanding,
        teacherSalaries: salaries,
        netBalance: revenue - salaries
      });

      // 2. Fetch Student Fees (Joined with Admissions)
      const { data: fees } = await supabase
        .from('fee_plans')
        .select(`
          *,
          student:admissions(name, cnic, status, phone, email)
        `);

      // For each fee plan, get its payment status
      const { data: payments } = await supabase.from('payments').select('*').eq('entity_type', 'student');

      const processedFees = fees?.map(plan => {
        const planPayments = payments?.filter(p => p.entity_id === plan.student_id) || [];
        const paid = planPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
        const payable = plan.final_fee != null ? Number(plan.final_fee) : Number(plan.total_fee || 0);

        let status = 'Pending';
        if (paid >= payable) status = 'Paid';
        else if (paid > 0) status = 'Partial';

        // Check for overdue
        const hasOverdue = planPayments.some(p => p.status === 'pending' && new Date(p.due_date) < new Date());
        if (hasOverdue && status !== 'Paid') status = 'Overdue';

        return { 
          ...plan, 
          payable,
          paid, 
          outstanding: Math.max(0, payable - paid), 
          status, 
          paymentRecords: planPayments 
        };
      });

      setStudentFees(processedFees || []);

      // 3. Fetch Teachers (Joined with Salaries)
      const { data: teachers } = await supabase
        .from('teachers')
        .select(`
          id, name, specialization,
          salary_config:teacher_salaries(monthly_amount)
        `);

      const { data: tPayments } = await supabase.from('payments').select('*').eq('entity_type', 'teacher');
      const { data: directTPayments } = await supabase.from('teacher_payments').select('*');

      const processedTeachers = teachers?.map(t => {
        const monthly = t.salary_config?.[0]?.monthly_amount || 0;
        const teacherPay = tPayments?.filter(p => p.entity_id === t.id) || [];
        const directPay = directTPayments?.filter(p => p.teacher_id === t.id) || [];

        const allPaidDates = [
          ...teacherPay.map(p => p.paid_date),
          ...directPay.map(p => p.paid_on)
        ].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
        const lastPaid = allPaidDates.length > 0 ? allPaidDates[0] : 'Never';

        // Determine this month status
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const paidThisMonth =
          teacherPay.some(p => p.description?.includes(currentMonth) && p.status === 'paid') ||
          directPay.some(p => p.month === currentMonth && p.status?.toLowerCase() === 'paid');

        return {
          ...t,
          monthlySalary: monthly,
          status: paidThisMonth ? 'Paid' : 'Pending',
          lastPaid,
          paymentHistory: teacherPay
        };
      });

      setTeacherSalaries(processedTeachers || []);

    } catch (error) {
      toast.error("Error fetching finance data");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (formData) => {
    if (!canMutate) {
      toast.error("You have view-only access to finance.");
      return;
    }
    try {
      const paymentAmount = Number(formData.amount) || selectedInstallment.amount;
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_date: formData.paidDate,
          method: formData.method,
          reference_number: formData.reference,
          notes: formData.notes,
          amount: paymentAmount
        })
        .eq('id', selectedInstallment.id);

      if (error) throw error;

      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);

      // Immediately sync selectedStudent local state if modal is active
      if (selectedStudent) {
        const updatedRecords = (selectedStudent.paymentRecords || []).map(p => {
          if (p.id === selectedInstallment.id) {
            return {
              ...p,
              status: 'paid',
              paid_date: formData.paidDate,
              method: formData.method,
              reference_number: formData.reference,
              notes: formData.notes,
              amount: paymentAmount
            };
          }
          return p;
        });
        const newPaid = updatedRecords.reduce((sum, p) => p.status === 'paid' ? sum + (Number(p.amount) || 0) : sum, 0);
        const payable = selectedStudent.payable != null ? selectedStudent.payable : selectedStudent.total_fee;
        const newOutstanding = Math.max(0, payable - newPaid);
        const newStatus = newOutstanding === 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';

        setSelectedStudent({
          ...selectedStudent,
          paid: newPaid,
          outstanding: newOutstanding,
          status: newStatus,
          paymentRecords: updatedRecords
        });
      }

      fetchFinanceData(); // Refresh overall datasets
    } catch (err) {
      toast.error("Failed to record payment");
    }
  };

  const handlePaySalary = async (formData) => {
    if (!canMutate) {
      toast.error("You have view-only access to finance.");
      return;
    }
    if (!selectedTeacherForPay) return;
    try {
      const currentMonth = formData.month || new Date().toISOString().slice(0, 7);

      const headers = await getAuthHeaders();
      const payload = {
        teacherId: selectedTeacherForPay.id,
        amount: Number(formData.amount),
        month: currentMonth,
        paidDate: formData.paidDate,
        method: formData.method,
        reference: formData.reference || null
      };

      let response = await fetch('/api/admin/finance/pay-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload)
      });

      if (response.status === 404) {
        response = await fetch('/api/admin/finance/pay-teacher.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Failed to record salary payment');
      }

      toast.success(result.message || `Salary paid successfully for ${selectedTeacherForPay.name}!`);
      setIsSalaryModalOpen(false);
      setSelectedTeacherForPay(null);
      fetchFinanceData();
    } catch (err) {
      toast.error(err.message || "Failed to record salary payment");
    }
  };

  const paidInFullCount = studentFees.filter(f => f.status === 'Paid').length;
  const partialCount = studentFees.filter(f => f.status === 'Partial').length;
  const overdueCount = studentFees.filter(f => f.status === 'Overdue').length;
  const pendingCount = studentFees.filter(f => f.status === 'Pending').length;

  const teachersPaidThisMonth = teacherSalaries.filter(t => t.status === 'Paid').length;
  const teachersPendingThisMonth = teacherSalaries.filter(t => t.status !== 'Paid' && (t.monthlySalary || 0) > 0).length;
  const totalMonthlyPayroll = teacherSalaries.reduce((sum, t) => sum + (Number(t.monthlySalary) || 0), 0);
  const totalReceivable = stats.totalRevenue + stats.outstandingFees;
  const collectionRate = totalReceivable > 0 ? Math.round((stats.totalRevenue / totalReceivable) * 100) : 0;

  const uniqueCourses = useMemo(() => {
    const set = new Set();
    studentFees.forEach(f => {
      if (f.course) set.add(f.course);
    });
    return Array.from(set).sort();
  }, [studentFees]);

  const uniqueBatches = useMemo(() => {
    const set = new Set();
    studentFees.forEach(f => {
      if (f.batch) set.add(f.batch);
    });
    return Array.from(set).sort();
  }, [studentFees]);

  const filteredStudentFees = useMemo(() => {
    return studentFees.filter((fee) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const nameMatch = fee.student?.name?.toLowerCase().includes(q);
        const cnicMatch = fee.student?.cnic?.includes(q);
        const courseMatch = fee.course?.toLowerCase().includes(q);
        const batchMatch = fee.batch?.toLowerCase().includes(q);
        const phoneMatch = fee.student?.phone?.includes(q);
        if (!nameMatch && !cnicMatch && !courseMatch && !batchMatch && !phoneMatch) return false;
      }

      if (studentCourseFilter !== 'all' && fee.course !== studentCourseFilter) {
        return false;
      }

      if (studentBatchFilter !== 'all' && fee.batch !== studentBatchFilter) {
        return false;
      }

      if (studentStatusFilter !== 'all' && fee.status !== studentStatusFilter) {
        return false;
      }

      return true;
    });
  }, [studentFees, searchQuery, studentCourseFilter, studentBatchFilter, studentStatusFilter]);

  const handleDownloadFeeReceipt = async (feeRecord, installment = null) => {
    try {
      const targetKey = installment ? `inst_${installment.id}` : `fee_${feeRecord.id}`;
      setGeneratingPdf(targetKey);
      const studentData = feeRecord.student || {};
      const doc = await createFeeReceiptPdf({
        student: studentData,
        feePlan: feeRecord,
        installment: installment || feeRecord.paymentRecords?.find(p => p.status === 'paid'),
        allPayments: feeRecord.paymentRecords || []
      });
      const cleanName = (studentData.name || 'Student').replace(/\s+/g, '_');
      const instSuffix = installment?.installment_number ? `_Inst${installment.installment_number}` : '';
      doc.save(`DeepSkills_Fee_Receipt_${cleanName}${instSuffix}.pdf`);
      toast.success("Official Fee Receipt generated successfully!");
    } catch (err) {
      console.error("Failed to generate fee receipt:", err);
      toast.error("Failed to generate fee receipt");
    } finally {
      setGeneratingPdf(null);
    }
  };

  const getStudentWhatsAppReminderUrl = (fee) => {
    const phone = fee.student?.phone;
    if (!phone) return null;
    const clean = String(phone).replace(/\D/g, '');
    const formattedPhone = clean.startsWith('92') ? clean : clean.startsWith('0') ? `92${clean.slice(1)}` : `92${clean}`;
    const studentName = fee.student?.name || 'Student';
    const outstanding = (fee.outstanding || 0).toLocaleString();
    const msg = `Assalam-o-Alaikum ${studentName},\nThis is DeepSkills Accounts Department regarding your enrolled course *${fee.course || 'Program'}*.\n\nOur records show an outstanding balance of *PKR ${outstanding}*. Kindly clear your pending tuition installment or contact the Accounts Office for assistance.\n\nThank you,\nDeepSkills Accounts & Finance`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  const filteredTeacherSalaries = useMemo(() => {
    const q = teacherSearchQuery.trim().toLowerCase();
    if (!q) return teacherSalaries;
    return teacherSalaries.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.specialization?.toLowerCase().includes(q)
    );
  }, [teacherSalaries, teacherSearchQuery]);

  const hasActiveStudentFilters = searchQuery.trim() !== '' ||
    studentCourseFilter !== 'all' ||
    studentBatchFilter !== 'all' ||
    studentStatusFilter !== 'all';

  const handleResetStudentFilters = () => {
    setSearchQuery('');
    setStudentCourseFilter('all');
    setStudentBatchFilter('all');
    setStudentStatusFilter('all');
  };

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const statsCards = [
    {
      label: 'Total Inflow (Revenue)',
      value: `Rs. ${stats.totalRevenue.toLocaleString()}`,
      sub: 'Verified tuition & student fees collected',
      tag: '+ Inflow',
      tagBg: 'rgba(16, 185, 129, 0.15)',
      tagColor: '#34d399',
      icon: <FaMoneyBillWave />,
      color: '#10B981'
    },
    {
      label: 'Pending Receivables',
      value: `Rs. ${stats.outstandingFees.toLocaleString()}`,
      sub: overdueCount > 0 ? `${overdueCount} overdue installment plans` : 'Upcoming tuition installments',
      tag: `${collectionRate}% Collected`,
      tagBg: 'rgba(245, 158, 11, 0.15)',
      tagColor: '#fbbf24',
      icon: <FaExclamationTriangle />,
      color: '#F59E0B'
    },
    {
      label: 'Faculty Payroll Outflow',
      value: `Rs. ${stats.teacherSalaries.toLocaleString()}`,
      sub: `${teachersPaidThisMonth} of ${teacherSalaries.length} teachers paid this month`,
      tag: `${teachersPaidThisMonth}/${teacherSalaries.length} Paid`,
      tagBg: 'rgba(139, 92, 246, 0.15)',
      tagColor: '#c4b5fd',
      icon: <FaChalkboardTeacher />,
      color: '#8B5CF6'
    },
    {
      label: 'Net Cash Position',
      value: `${stats.netBalance < 0 ? '-' : ''}Rs. ${Math.abs(stats.netBalance).toLocaleString()}`,
      sub: 'Tuition Inflow minus Faculty Payroll Outflow',
      tag: stats.netBalance >= 0 ? 'Surplus' : 'Deficit',
      tagBg: stats.netBalance >= 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
      tagColor: stats.netBalance >= 0 ? '#38bdf8' : '#f87171',
      icon: <FaChartBar />,
      color: stats.netBalance >= 0 ? '#38BDF8' : '#EF4444'
    },
  ];

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div className="title-col">
            <h1>
              <FaCoins style={{ color: '#10B981', fontSize: '1.5rem' }} />
              {activeTab === 'overview' && 'Finance & Cash Flow Overview'}
              {activeTab === 'students' && 'Student Fees & Installments'}
              {activeTab === 'teachers' && 'Teacher Salaries & Payroll'}
            </h1>
            <p>
              {activeTab === 'overview' && 'Monitor organization-wide tuition receivables, faculty compensation, and net cashflow reserves.'}
              {activeTab === 'students' && 'Track student tuition plans, fee installment schedules, discount records, and pending receivables.'}
              {activeTab === 'teachers' && 'Manage faculty compensation, record monthly disbursements, and review payroll records.'}
            </p>
          </div>
          <div className="header-actions">
            <Button
              type="button"
              onClick={fetchFinanceData}
              disabled={loading}
              title="Refresh financial data"
            >
              <FaSyncAlt className={loading ? 'spin' : ''} /> {loading ? 'Updating...' : 'Refresh'}
            </Button>
            <Button
              type="button"
              $primary
              onClick={() => navigate('/admin/finance/transactions')}
              title="View Master Ledger"
            >
              <FaHistory /> Master Ledger
            </Button>
          </div>
        </Header>

        <StatsGrid>
          {statsCards.map((stat, idx) => (
            <StatCard key={idx} $color={stat.color}>
              <div className="card-head">
                <div className="icon-wrap">
                  {stat.icon}
                </div>
                <span className="tag-chip" style={{ background: stat.tagBg, color: stat.tagColor }}>
                  {stat.tag}
                </span>
              </div>
              <div className="card-data">
                <span className="val">{stat.value}</span>
                <span className="lbl">{stat.label}</span>
                <span className="desc">{stat.sub}</span>
              </div>
            </StatCard>
          ))}
        </StatsGrid>

        <TabsContainer>
          <Tab
            type="button"
            $active={activeTab === 'overview'}
            onClick={() => handleTabClick('overview')}
          >
            <FaChartBar /> Overview
          </Tab>
          <Tab
            type="button"
            $active={activeTab === 'students'}
            onClick={() => handleTabClick('students')}
          >
            <FaUserGraduate /> Student Fees
            <span className="tab-count">{studentFees.length}</span>
          </Tab>
          <Tab
            type="button"
            $active={activeTab === 'teachers'}
            onClick={() => handleTabClick('teachers')}
          >
            <FaChalkboardTeacher /> Teacher Salaries
            <span className="tab-count">{teacherSalaries.length}</span>
          </Tab>
          <Tab
            type="button"
            $active={false}
            onClick={() => navigate('/admin/finance/transactions')}
            title="Open Master Ledger"
          >
            <FaHistory /> Master Ledger <FaChevronRight style={{ fontSize: '0.65rem', opacity: 0.6 }} />
          </Tab>
        </TabsContainer>

        {activeTab === 'overview' && (
          <OverviewSection>
            <ExecutiveGrid>
              <ExecutiveCard>
                <div className="card-top">
                  <div className="badge-chip" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <FaUserGraduate /> Tuition Collection Health
                  </div>
                  <span className="rate-text">{collectionRate}% Recovery</span>
                </div>

                <div className="card-body">
                  <div className="main-metric">
                    <span className="metric-label">Total Student Receivables</span>
                    <span className="metric-num">Rs. {totalReceivable.toLocaleString()}</span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(collectionRate, 100)}%`,
                        background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                      }}
                    />
                  </div>

                  <div className="breakdown-pills">
                    <div className="pill">
                      <span className="dot" style={{ background: '#10b981' }} />
                      <span>Paid: <strong>{paidInFullCount}</strong></span>
                    </div>
                    <div className="pill">
                      <span className="dot" style={{ background: '#38bdf8' }} />
                      <span>Partial: <strong>{partialCount}</strong></span>
                    </div>
                    <div className="pill">
                      <span className="dot" style={{ background: '#f59e0b' }} />
                      <span>Overdue: <strong>{overdueCount}</strong></span>
                    </div>
                    <div className="pill">
                      <span className="dot" style={{ background: '#64748b' }} />
                      <span>Pending: <strong>{pendingCount}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <Button $primary onClick={() => handleTabClick('students')}>
                    Manage Student Fees & Installments <FaArrowRight />
                  </Button>
                </div>
              </ExecutiveCard>

              <ExecutiveCard>
                <div className="card-top">
                  <div className="badge-chip" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                    <FaChalkboardTeacher /> Faculty Payroll Commitment
                  </div>
                  <span className="rate-text">
                    {teacherSalaries.length > 0 ? Math.round((teachersPaidThisMonth / teacherSalaries.length) * 100) : 0}% Disbursed
                  </span>
                </div>

                <div className="card-body">
                  <div className="main-metric">
                    <span className="metric-label">Monthly Faculty Payroll</span>
                    <span className="metric-num">Rs. {totalMonthlyPayroll.toLocaleString()}</span>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${teacherSalaries.length > 0 ? Math.min(Math.round((teachersPaidThisMonth / teacherSalaries.length) * 100), 100) : 0}%`,
                        background: 'linear-gradient(90deg, #8B5CF6 0%, #a78bfa 100%)'
                      }}
                    />
                  </div>

                  <div className="breakdown-pills">
                    <div className="pill">
                      <span className="dot" style={{ background: '#10b981' }} />
                      <span>Paid: <strong>{teachersPaidThisMonth}</strong></span>
                    </div>
                    <div className="pill">
                      <span className="dot" style={{ background: '#f59e0b' }} />
                      <span>Pending: <strong>{teachersPendingThisMonth}</strong></span>
                    </div>
                    <div className="pill">
                      <span className="dot" style={{ background: '#64748b' }} />
                      <span>Total Faculty: <strong>{teacherSalaries.length}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <Button
                    onClick={() => handleTabClick('teachers')}
                    style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.35)', color: '#c4b5fd' }}
                  >
                    Manage Teacher Salaries & Payroll <FaArrowRight />
                  </Button>
                </div>
              </ExecutiveCard>
            </ExecutiveGrid>

            <QuickActionsGrid>
              <QuickActionCard onClick={() => handleTabClick('students')}>
                <div className="qa-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <FaUserGraduate />
                </div>
                <div className="qa-info">
                  <h4>Student Fee Plans</h4>
                  <p>Review installments, record voucher payments, and check student balances</p>
                </div>
                <FaChevronRight className="qa-arrow" />
              </QuickActionCard>

              <QuickActionCard onClick={() => handleTabClick('teachers')}>
                <div className="qa-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>
                  <FaChalkboardTeacher />
                </div>
                <div className="qa-info">
                  <h4>Teacher Payroll</h4>
                  <p>Disburse monthly faculty compensation, record transaction slips</p>
                </div>
                <FaChevronRight className="qa-arrow" />
              </QuickActionCard>

              <QuickActionCard onClick={() => navigate('/admin/finance/transactions')}>
                <div className="qa-icon" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
                  <FaHistory />
                </div>
                <div className="qa-info">
                  <h4>Master Ledger</h4>
                  <p>Audit system-wide inflow transactions, outflow slips, and export CSV</p>
                </div>
                <FaChevronRight className="qa-arrow" />
              </QuickActionCard>

              <QuickActionCard onClick={() => navigate('/admin/finance/reports')}>
                <div className="qa-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <FaChartBar />
                </div>
                <div className="qa-info">
                  <h4>Revenue Reports</h4>
                  <p>Comprehensive financial projections, revenue breakdowns, and statements</p>
                </div>
                <FaChevronRight className="qa-arrow" />
              </QuickActionCard>
            </QuickActionsGrid>
          </OverviewSection>
        )}

        {activeTab === 'students' && (
          <SectionWrapper>
            <FilterCard>
              <FilterGroup>
                <SearchInputWrap>
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search students by name, CNIC, course, batch, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      <FaTimes />
                    </button>
                  )}
                </SearchInputWrap>

                <Select
                  value={studentCourseFilter}
                  onChange={(e) => setStudentCourseFilter(e.target.value)}
                  title="Filter by Course"
                >
                  <option value="all">All Courses ({uniqueCourses.length})</option>
                  {uniqueCourses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </Select>

                <Select
                  value={studentBatchFilter}
                  onChange={(e) => setStudentBatchFilter(e.target.value)}
                  title="Filter by Batch"
                >
                  <option value="all">All Batches ({uniqueBatches.length})</option>
                  {uniqueBatches.map(batch => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </Select>

                <Select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  title="Filter by Fee Status"
                >
                  <option value="all">All Statuses</option>
                  <option value="Paid">Paid ({paidInFullCount})</option>
                  <option value="Partial">Partial ({partialCount})</option>
                  <option value="Overdue">Overdue ({overdueCount})</option>
                  <option value="Pending">Pending ({pendingCount})</option>
                </Select>
              </FilterGroup>

              <FilterMeta>
                <span className="counter">
                  {filteredStudentFees.length} of {studentFees.length} Students
                </span>
                {hasActiveStudentFilters && (
                  <button
                    type="button"
                    className="reset-link"
                    onClick={handleResetStudentFilters}
                  >
                    Reset Filters
                  </button>
                )}
              </FilterMeta>
            </FilterCard>

            <CardPanel>
              <TableWrap>
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>Student</th>
                      <th style={{ minWidth: '180px' }}>Course & Batch</th>
                      <th style={{ minWidth: '130px' }}>Payable Fee</th>
                      <th style={{ minWidth: '150px' }}>Paid / Progress</th>
                      <th style={{ minWidth: '130px' }}>Outstanding Due</th>
                      <th style={{ minWidth: '130px' }}>Plan</th>
                      <th style={{ minWidth: '110px' }}>Status</th>
                      <th style={{ minWidth: '180px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudentFees.length > 0 ? (
                      filteredStudentFees.map((fee) => {
                        const payable = fee.payable != null ? fee.payable : fee.total_fee;
                        const pct = payable > 0 ? Math.min(100, Math.round(((fee.paid || 0) / payable) * 100)) : 0;
                        return (
                          <tr key={fee.id}>
                            <td>
                              <StudentCell>
                                <div className="avatar">
                                  {getInitials(fee.student?.name)}
                                </div>
                                <div className="info">
                                  <span className="name">{fee.student?.name || 'Unnamed Student'}</span>
                                  <span className="cnic">{fee.student?.cnic || 'CNIC: N/A'}</span>
                                  {fee.student?.phone && (
                                    <span className="phone">
                                      <FaPhoneAlt style={{ fontSize: '0.65rem' }} /> {fee.student.phone}
                                    </span>
                                  )}
                                </div>
                              </StudentCell>
                            </td>
                            <td>
                              <CourseCell>
                                <span className="course-title" title={fee.course}>{fee.course || 'Program'}</span>
                                <span className="batch-chip">{fee.batch || 'Batch General'}</span>
                              </CourseCell>
                            </td>
                            <td>
                              <FeeCell>
                                <span className="payable-amt">Rs. {payable.toLocaleString()}</span>
                                {fee.discount > 0 && (
                                  <span className="discount-pill">
                                    - Rs. {fee.discount.toLocaleString()} disc
                                  </span>
                                )}
                              </FeeCell>
                            </td>
                            <td>
                              <PaidCell>
                                <div className="paid-row">
                                  <span className="paid-amt">Rs. {(fee.paid || 0).toLocaleString()}</span>
                                  <span className="paid-pct">{pct}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div
                                    className="fill"
                                    style={{
                                      width: `${pct}%`,
                                      background: pct === 100
                                        ? 'linear-gradient(90deg, #10B981 0%, #34d399 100%)'
                                        : 'linear-gradient(90deg, #38BDF8 0%, #60a5fa 100%)'
                                    }}
                                  />
                                </div>
                              </PaidCell>
                            </td>
                            <td>
                              <OutstandingCell $isOverdue={fee.status === 'Overdue'} $isZero={fee.outstanding <= 0}>
                                <span className="balance-amt">
                                  {fee.outstanding <= 0 ? 'Rs. 0' : `Rs. ${(fee.outstanding || 0).toLocaleString()}`}
                                </span>
                                {fee.status === 'Overdue' && fee.outstanding > 0 ? (
                                  <span className="overdue-tag">Overdue</span>
                                ) : fee.outstanding <= 0 ? (
                                  <span className="cleared-tag">Cleared</span>
                                ) : null}
                              </OutstandingCell>
                            </td>
                            <td>
                              <PlanBadge type={fee.plan_type}>
                                {fee.plan_type === 'full' ? 'Full Pay' : `Installments (${fee.installment_count || 1})`}
                              </PlanBadge>
                            </td>
                            <td>
                              <StatusDotBadge $status={fee.status}>
                                <span className="dot" />
                                {fee.status}
                              </StatusDotBadge>
                            </td>
                            <td>
                              <ActionsGroup>
                                <button
                                  type="button"
                                  className="action-btn view-btn"
                                  onClick={() => { setSelectedStudent(fee); setIsModalOpen(true); }}
                                  title="View installment breakdown and schedule"
                                >
                                  <FaEye /> View
                                </button>
                                <button
                                  type="button"
                                  className="action-btn receipt-btn"
                                  onClick={() => handleDownloadFeeReceipt(fee)}
                                  disabled={generatingPdf === `fee_${fee.id}`}
                                  title="Download Official DeepSkills Fee Receipt PDF"
                                >
                                  {generatingPdf === `fee_${fee.id}` ? (
                                    <FaSyncAlt className="spin" />
                                  ) : (
                                    <FaFilePdf />
                                  )}
                                  Receipt
                                </button>
                                {fee.student?.phone && (
                                  <a
                                    href={getStudentWhatsAppReminderUrl(fee)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="action-btn wa-btn"
                                    title="Send WhatsApp payment reminder"
                                  >
                                    <FaWhatsapp />
                                  </a>
                                )}
                              </ActionsGroup>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8}>
                          <EmptyState>
                            <div className="empty-icon"><FaUserGraduate /></div>
                            <h3>No student fee records found</h3>
                            <p>
                              {hasActiveStudentFilters
                                ? "No fee records matched your active search and filter criteria."
                                : "There are no student fee records registered in the system yet."}
                            </p>
                            {hasActiveStudentFilters && (
                              <Button type="button" onClick={handleResetStudentFilters}>
                                <FaUndo /> Reset All Filters
                              </Button>
                            )}
                          </EmptyState>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableWrap>
            </CardPanel>
          </SectionWrapper>
        )}

        {activeTab === 'teachers' && (
          <SectionWrapper>
            <FilterCard>
              <FilterGroup>
                <SearchInputWrap>
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search faculty by name, specialization..."
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  />
                  {teacherSearchQuery && (
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={() => setTeacherSearchQuery('')}
                      title="Clear search"
                    >
                      <FaTimes />
                    </button>
                  )}
                </SearchInputWrap>
              </FilterGroup>

              <FilterMeta>
                <span className="counter">
                  {filteredTeacherSalaries.length} of {teacherSalaries.length} Faculty Members
                </span>
                {teacherSearchQuery && (
                  <button
                    type="button"
                    className="reset-link"
                    onClick={() => setTeacherSearchQuery('')}
                  >
                    Clear Search
                  </button>
                )}
              </FilterMeta>
            </FilterCard>

            <CardPanel>
              <TableWrap>
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>Teacher</th>
                      <th style={{ minWidth: '180px' }}>Specialization</th>
                      <th style={{ minWidth: '140px' }}>Monthly Salary</th>
                      <th style={{ minWidth: '120px' }}>This Month</th>
                      <th style={{ minWidth: '130px' }}>Last Paid</th>
                      <th style={{ minWidth: '200px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeacherSalaries.length > 0 ? (
                      filteredTeacherSalaries.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <StudentCell>
                              <div className="avatar" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6d28d9 100%)' }}>
                                {getInitials(t.name)}
                              </div>
                              <div className="info">
                                <span className="name">{t.name}</span>
                                <span className="cnic">Faculty Member</span>
                              </div>
                            </StudentCell>
                          </td>
                          <td>
                            <span style={{ color: '#cbd5e1' }}>{t.specialization || 'Instructor'}</span>
                          </td>
                          <td>
                            <strong style={{ color: '#fff' }}>Rs. {Number(t.monthlySalary || 0).toLocaleString()}</strong>
                          </td>
                          <td>
                            <StatusDotBadge $status={t.status}>
                              <span className="dot" />
                              {t.status}
                            </StatusDotBadge>
                          </td>
                          <td>
                            <span style={{ color: t.lastPaid === 'Never' ? '#64748b' : '#cbd5e1', fontSize: '0.85rem' }}>
                              {t.lastPaid}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <ActionButton
                                disabled={!canMutate || t.status === 'Paid' || (t.monthlySalary || 0) <= 0}
                                onClick={() => {
                                  setSelectedTeacherForPay(t);
                                  setIsSalaryModalOpen(true);
                                }}
                                title={(t.monthlySalary || 0) <= 0 ? "No monthly salary configured" : t.status === 'Paid' ? "Salary already paid for this month" : ""}
                              >
                                <FaPlus /> Pay Salary
                              </ActionButton>
                              <ActionButton onClick={() => navigate(`/admin/finance/transactions?search=${encodeURIComponent(t.name)}`)}>
                                <FaHistory /> History
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState>
                            <div className="empty-icon"><FaChalkboardTeacher /></div>
                            <h3>No faculty records found</h3>
                            <p>
                              {teacherSearchQuery
                                ? "No faculty members matched your search query."
                                : "There are no faculty members registered in the system."}
                            </p>
                            {teacherSearchQuery && (
                              <Button type="button" onClick={() => setTeacherSearchQuery('')}>
                                <FaUndo /> Clear Search
                              </Button>
                            )}
                          </EmptyState>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableWrap>
            </CardPanel>
          </SectionWrapper>
        )}
      </Container>

      {/* Student Fee Detail Modal */}
      <AnimatePresence>
        {isModalOpen && selectedStudent && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContent
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
            >
              <ModalHeader>
                <div className="modal-title-col">
                  <h2>Fee Breakdown: {selectedStudent.student?.name || 'Student'}</h2>
                  <p>
                    <span>{selectedStudent.course || 'Course'}</span>
                    <span>•</span>
                    <span>{selectedStudent.batch || 'Batch'}</span>
                    {selectedStudent.student?.cnic && (
                      <>
                        <span>•</span>
                        <span>CNIC: {selectedStudent.student.cnic}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="modal-actions">
                  <Button
                    type="button"
                    onClick={() => handleDownloadFeeReceipt(selectedStudent)}
                    disabled={generatingPdf === `fee_${selectedStudent.id}`}
                    style={{
                      background: 'linear-gradient(135deg, #7B1F2E 0%, #9b273a 100%)',
                      borderColor: 'rgba(217, 119, 6, 0.4)',
                      color: '#fff'
                    }}
                    title="Download Official Complete Fee Receipt PDF"
                  >
                    {generatingPdf === `fee_${selectedStudent.id}` ? (
                      <FaSyncAlt className="spin" />
                    ) : (
                      <FaFilePdf />
                    )}
                    Full Receipt (PDF)
                  </Button>
                  <CloseBtn onClick={() => setIsModalOpen(false)} title="Close Modal">
                    <FaTimes />
                  </CloseBtn>
                </div>
              </ModalHeader>

              <ModalBody>
                <div className="summary-banner">
                  <div className="item">
                    <span>Payable Fee</span>
                    <strong>Rs. {(selectedStudent.payable != null ? selectedStudent.payable : selectedStudent.total_fee).toLocaleString()}</strong>
                    <span className="subtext">Net tuition requirement</span>
                  </div>
                  <div className="item">
                    <span>Discount Awarded</span>
                    <strong style={{ color: selectedStudent.discount > 0 ? '#F59E0B' : '#94a3b8' }}>
                      {selectedStudent.discount > 0 ? `Rs. ${selectedStudent.discount.toLocaleString()}` : 'Rs. 0'}
                    </strong>
                    <span className="subtext">{selectedStudent.discount > 0 ? 'Concession granted' : 'Standard fee'}</span>
                  </div>
                  <div className="item">
                    <span>Total Paid</span>
                    <strong style={{ color: '#10B981' }}>Rs. {(selectedStudent.paid || 0).toLocaleString()}</strong>
                    <span className="subtext">Verified inflow collected</span>
                  </div>
                  <div className="item">
                    <span>Outstanding Due</span>
                    <strong style={{ color: selectedStudent.outstanding > 0 ? '#ef4444' : '#10B981' }}>
                      {selectedStudent.outstanding <= 0 ? 'Cleared' : `Rs. ${(selectedStudent.outstanding || 0).toLocaleString()}`}
                    </strong>
                    <span className="subtext">{selectedStudent.outstanding > 0 ? 'Pending receivable' : 'All cleared'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '26px 0 14px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCoins style={{ color: '#10B981' }} /> Payment Schedule & Installments
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {selectedStudent.paymentRecords?.filter(p => p.status === 'paid').length || 0} of {selectedStudent.paymentRecords?.length || 0} Paid
                  </span>
                </div>

                <CardPanel style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
                  <TableWrap>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th>Installment Amount</th>
                          <th>Due Date</th>
                          <th>Paid Date</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudent.paymentRecords && selectedStudent.paymentRecords.length > 0 ? (
                          selectedStudent.paymentRecords
                            .slice()
                            .sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0))
                            .map((p, idx) => (
                              <tr key={p.id || idx}>
                                <td>
                                  <span style={{ fontWeight: 700, color: '#94a3b8' }}>
                                    {p.installment_number || idx + 1}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <strong style={{ color: '#fff' }}>Rs. {Number(p.amount || 0).toLocaleString()}</strong>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      {selectedStudent.plan_type === 'full' ? 'Full Settlement' : `Installment ${p.installment_number || idx + 1}`}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ color: p.due_date ? '#cbd5e1' : '#64748b', fontSize: '0.85rem' }}>
                                    {p.due_date || 'N/A'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ color: p.paid_date ? '#34d399' : '#64748b', fontSize: '0.85rem' }}>
                                    {p.paid_date || '—'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ color: '#cbd5e1', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                    {p.method ? p.method.replace('_', ' ') : '—'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ color: p.reference_number ? '#cbd5e1' : '#64748b', fontSize: '0.82rem' }}>
                                    {p.reference_number || '—'}
                                  </span>
                                </td>
                                <td>
                                  <StatusDotBadge $status={p.status}>
                                    <span className="dot" />
                                    {p.status || 'pending'}
                                  </StatusDotBadge>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    {p.status === 'paid' ? (
                                      <button
                                        type="button"
                                        className="receipt-mini-btn"
                                        onClick={() => handleDownloadFeeReceipt(selectedStudent, p)}
                                        disabled={generatingPdf === `inst_${p.id}`}
                                        title="Download PDF receipt for this installment"
                                      >
                                        {generatingPdf === `inst_${p.id}` ? (
                                          <FaSyncAlt className="spin" />
                                        ) : (
                                          <FaFilePdf />
                                        )}
                                        Receipt
                                      </button>
                                    ) : canMutate ? (
                                      <RecordBtn
                                        type="button"
                                        onClick={() => { setSelectedInstallment(p); setIsPaymentModalOpen(true); }}
                                        title="Record student payment and mark as paid"
                                      >
                                        <FaPlus style={{ fontSize: '0.68rem' }} /> Mark Paid
                                      </RecordBtn>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                              No installment schedules found for this fee record.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </TableWrap>
                </CardPanel>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedInstallment && (
          <ModalOverlay
            style={{ zIndex: 2000 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContent
              style={{ maxWidth: '480px' }}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
            >
              <ModalHeader>
                <div className="modal-title-col">
                  <h2>Record Payment</h2>
                  <p>
                    {selectedStudent?.student?.name} • Inst #{selectedInstallment.installment_number || '1'}
                  </p>
                </div>
                <CloseBtn onClick={() => setIsPaymentModalOpen(false)} title="Close Modal">
                  <FaTimes />
                </CloseBtn>
              </ModalHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleRecordPayment(Object.fromEntries(formData));
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                      Payment Amount (PKR)
                    </label>
                    <Input
                      type="number"
                      name="amount"
                      defaultValue={selectedInstallment.amount}
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                      Paid Date
                    </label>
                    <Input
                      type="date"
                      name="paidDate"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                      Payment Method
                    </label>
                    <Select name="method" defaultValue="cash" required>
                      <option value="cash">Cash in Hand</option>
                      <option value="bank_transfer">Bank Transfer / IBFT</option>
                      <option value="online">Online / EasyPaisa / JazzCash</option>
                      <option value="cheque">Cheque</option>
                    </Select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                      Transaction / Reference # (Optional)
                    </label>
                    <Input
                      type="text"
                      name="reference"
                      placeholder="e.g. TXN-98421 or Bank Slip ID"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                      Notes / Remarks (Optional)
                    </label>
                    <Input
                      type="text"
                      name="notes"
                      placeholder="e.g. Paid at reception desk"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <Button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Cancel
                    </Button>
                    <SubmitBtn type="submit" style={{ flex: 2, margin: 0, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <FaCheckCircle /> Confirm & Record
                    </SubmitBtn>
                  </div>
                </div>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Pay Teacher Salary Modal */}
      <AnimatePresence>
        {isSalaryModalOpen && selectedTeacherForPay && (
          <ModalOverlay style={{ zIndex: 2000 }}>
            <ModalContent style={{ maxWidth: '450px' }}>
              <ModalHeader>
                <div>
                  <h2>Pay Salary: {selectedTeacherForPay.name}</h2>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{selectedTeacherForPay.specialization}</p>
                </div>
                <CloseBtn onClick={() => { setIsSalaryModalOpen(false); setSelectedTeacherForPay(null); }}><FaTimes /></CloseBtn>
              </ModalHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handlePaySalary(Object.fromEntries(formData));
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Salary Amount (PKR)</label>
                    <Input type="number" name="amount" defaultValue={selectedTeacherForPay.monthlySalary} required min="1" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Month</label>
                    <Input type="month" name="month" defaultValue={new Date().toISOString().slice(0, 7)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Payment Date</label>
                    <Input type="date" name="paidDate" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Payment Method</label>
                    <Select name="method" required>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="online">Online</option>
                      <option value="cheque">Cheque</option>
                    </Select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Reference #</label>
                    <Input type="text" name="reference" placeholder="Bank Ref / Cheque # / Slip #" />
                  </div>
                  <SubmitBtn type="submit">Confirm & Record Salary</SubmitBtn>
                </div>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

// Styled Components
const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
  min-width: 0;
  overflow-x: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;

  .title-col {
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${p => p.$color || '#8B5CF6'};
    opacity: 0.9;
  }

  &::after {
    content: '';
    position: absolute;
    top: -30px;
    right: -30px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: ${p => p.$color || '#8B5CF6'};
    opacity: 0.06;
    filter: blur(25px);
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: ${p => p.$color ? `${p.$color}40` : 'rgba(255, 255, 255, 0.12)'};
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;

    .icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      background: ${p => p.$color ? `${p.$color}18` : 'rgba(255, 255, 255, 0.05)'};
      color: ${p => p.$color || '#fff'};
      border: 1px solid ${p => p.$color ? `${p.$color}30` : 'transparent'};
    }

    .tag-chip {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 4px 9px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
  }

  .card-data {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .val {
      font-size: 1.65rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }

    .lbl {
      font-size: 0.76rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .desc {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.4;
    }
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button`
  background: ${p => p.$active ? 'rgba(255, 255, 255, 0.06)' : 'transparent'};
  border: 1px solid ${p => p.$active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  border-bottom: 2px solid ${p => p.$active ? '#10B981' : 'transparent'};
  color: ${p => p.$active ? '#fff' : '#94a3b8'};
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 18px;
  border-radius: 10px 10px 0 0;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.04);
  }

  .tab-count {
    font-size: 0.72rem;
    background: ${p => p.$active ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'};
    color: ${p => p.$active ? '#34d399' : '#94a3b8'};
    padding: 2px 7px;
    border-radius: 999px;
    font-weight: 700;
  }
`;

const OverviewSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 30px;
`;

const ExecutiveGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const ExecutiveCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  box-sizing: border-box;

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .badge-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 5px 11px;
      border-radius: 8px;
    }

    .rate-text {
      font-size: 0.82rem;
      color: #94a3b8;
      font-weight: 600;
    }
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 14px;

    .main-metric {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .metric-label {
        font-size: 0.78rem;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.05em;
      }

      .metric-num {
        font-size: 1.85rem;
        font-weight: 800;
        color: #fff;
        letter-spacing: -0.02em;
      }
    }

    .progress-track {
      height: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 999px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.4s ease;
      }
    }

    .breakdown-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: #cbd5e1;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        padding: 4px 10px;
        border-radius: 6px;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        strong {
          color: #fff;
        }
      }
    }
  }

  .card-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 16px;
  }
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const QuickActionCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.14);
    transform: translateY(-2px);
  }

  .qa-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .qa-info {
    flex: 1;
    min-width: 0;

    h4 {
      margin: 0 0 3px 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: #fff;
    }

    p {
      margin: 0;
      font-size: 0.75rem;
      color: #94a3b8;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .qa-arrow {
    color: #64748b;
    font-size: 0.8rem;
    flex-shrink: 0;
  }
`;

const Button = styled.button`
  background: ${p => p.$primary 
    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
    : 'rgba(255, 255, 255, 0.05)'};
  color: #fff;
  border: 1px solid ${p => p.$primary 
    ? 'rgba(16, 185, 129, 0.4)' 
    : 'rgba(255, 255, 255, 0.1)'};
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  text-decoration: none;

  &:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
`;

const SectionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const FilterCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 14px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 640px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: ${p => p.$fullWidth ? '100%' : '420px'};
  box-sizing: border-box;

  @media (max-width: 640px) {
    max-width: 100%;
    min-width: 100%;
    width: 100%;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    pointer-events: none;
    font-size: 0.9rem;
    transition: color 0.2s ease;
  }

  &:focus-within .search-icon {
    color: #10B981;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.03);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 10px 38px 10px 38px;
    font-size: 0.88rem;
    transition: all 0.2s ease;
    outline: none;

    &::placeholder {
      color: #64748b;
      font-size: 0.84rem;
    }

    &:hover {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.05);
    }

    &:focus {
      outline: none;
      border-color: #10B981;
      background: rgba(16, 185, 129, 0.06);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
    }
  }

  .clear-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #94a3b8;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
  }
`;

const Select = styled.select`
  background: #111318;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.86rem;
  cursor: pointer;
  outline: none;
  box-sizing: border-box;
  max-width: 100%;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-color: #10B981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
  }

  option {
    background: #111318;
    color: #fff;
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const FilterMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 0.82rem;
  flex-wrap: wrap;
  box-sizing: border-box;

  .counter {
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .reset-link {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 0.78rem;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    white-space: nowrap;
    transition: color 0.15s ease;
    &:hover {
      color: #fff;
    }
  }

  @media (max-width: 900px) {
    justify-content: space-between;
    width: 100%;
  }
`;

const CardPanel = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
`;

const TableWrap = styled.div`
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;

  table {
    width: 100%;
    border-collapse: collapse;
    white-space: nowrap;

    th {
      text-align: left;
      padding: 16px 20px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    td {
      padding: 16px 20px;
      font-size: 0.88rem;
      color: #e2e8f0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr {
      transition: background 0.15s ease;
      &:hover {
        background: rgba(255, 255, 255, 0.025);
      }
    }
  }

  .receipt-mini-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 0.76rem;
    font-weight: 600;
    background: rgba(123, 31, 46, 0.15);
    border: 1px solid rgba(123, 31, 46, 0.35);
    color: #fca5a5;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: #7B1F2E;
      color: #fff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const StudentCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .name {
      font-weight: 700;
      color: #fff;
      font-size: 0.9rem;
    }

    .cnic {
      font-size: 0.76rem;
      color: #94a3b8;
    }

    .phone {
      font-size: 0.74rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`;

const CourseCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .course-title {
    font-weight: 600;
    color: #e2e8f0;
    font-size: 0.88rem;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .batch-chip {
    font-size: 0.72rem;
    color: #a78bfa;
    background: rgba(139, 92, 246, 0.12);
    border: 1px solid rgba(139, 92, 246, 0.25);
    padding: 2px 7px;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    font-weight: 600;
  }
`;

const FeeCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  .payable-amt {
    font-weight: 700;
    color: #fff;
    font-size: 0.92rem;
  }

  .discount-pill {
    font-size: 0.72rem;
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.12);
    padding: 1px 6px;
    border-radius: 4px;
    width: fit-content;
    font-weight: 600;
  }
`;

const PaidCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 130px;

  .paid-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .paid-amt {
      font-weight: 700;
      color: #34d399;
      font-size: 0.88rem;
    }

    .paid-pct {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
    }
  }

  .progress-bar {
    height: 5px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;

    .fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    }
  }
`;

const OutstandingCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  .balance-amt {
    font-weight: 700;
    color: ${p => p.$isZero ? '#10B981' : p.$isOverdue ? '#f87171' : '#fbbf24'};
    font-size: 0.92rem;
  }

  .overdue-tag {
    font-size: 0.7rem;
    color: #f87171;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    padding: 1px 6px;
    border-radius: 4px;
    width: fit-content;
    font-weight: 700;
    text-transform: uppercase;
  }

  .cleared-tag {
    font-size: 0.7rem;
    color: #34d399;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 1px 6px;
    border-radius: 4px;
    width: fit-content;
    font-weight: 700;
  }
`;

const StatusDotBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: capitalize;
  background: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'paid': return 'rgba(16, 185, 129, 0.12)';
      case 'partial': return 'rgba(56, 189, 248, 0.12)';
      case 'overdue': return 'rgba(239, 68, 68, 0.12)';
      default: return 'rgba(245, 158, 11, 0.12)';
    }
  }};
  color: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'paid': return '#34d399';
      case 'partial': return '#38bdf8';
      case 'overdue': return '#f87171';
      default: return '#fbbf24';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'paid': return 'rgba(16, 185, 129, 0.25)';
      case 'partial': return 'rgba(56, 189, 248, 0.25)';
      case 'overdue': return 'rgba(239, 68, 68, 0.25)';
      default: return 'rgba(245, 158, 11, 0.25)';
    }
  }};

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 6px currentColor;
  }
`;

const PlanBadge = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  color: ${props => props.type === 'full' ? '#8B5CF6' : '#fff'};
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  display: inline-block;
  white-space: nowrap;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ActionsGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 11px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    text-decoration: none;

    &.view-btn {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    &.receipt-btn {
      background: rgba(123, 31, 46, 0.18);
      border-color: rgba(123, 31, 46, 0.4);
      color: #fca5a5;
      &:hover:not(:disabled) {
        background: #7B1F2E;
        color: #fff;
      }
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    &.wa-btn {
      background: rgba(37, 211, 102, 0.12);
      border-color: rgba(37, 211, 102, 0.3);
      color: #4ade80;
      padding: 6px 8px;
      font-size: 0.95rem;
      &:hover {
        background: #25D366;
        color: #000;
      }
    }
  }

  .spin {
    animation: spin 1s linear infinite;
  }
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  .empty-icon {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 1.4rem;
  }

  h3 {
    margin: 0;
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #94a3b8;
    font-size: 0.85rem;
    max-width: 420px;
    line-height: 1.5;
  }
`;

// Modal Styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled(motion.div)`
  background: #111318;
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
`;

const ModalHeader = styled.div`
  padding: 22px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .modal-title-col {
    h2 {
      font-size: 1.35rem;
      color: #fff;
      margin: 0 0 4px 0;
      font-weight: 700;
    }
    p {
      color: #94a3b8;
      font-size: 0.85rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .modal-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
`;

const ModalBody = styled.div`
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;

  .summary-banner {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    background: rgba(255, 255, 255, 0.02);
    padding: 18px 20px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.06);

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }

    .item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      span {
        font-size: 0.74rem;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.05em;
      }
      strong {
        font-size: 1.3rem;
        color: #fff;
        font-weight: 800;
        letter-spacing: -0.01em;
      }
      .subtext {
        font-size: 0.74rem;
        color: #64748b;
      }
    }
  }
`;

const RecordBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s ease;
  &:hover { background: #9b273a; }
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: #0d0f14;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 11px 14px;
  border-radius: 10px;
  color: #fff;
  font-size: 0.88rem;
  outline: none;
  transition: all 0.2s ease;
  &:focus {
    border-color: #10B981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }
`;

const SubmitBtn = styled.button`
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  color: #fff;
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 12px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
  &:hover { opacity: 0.92; }
`;

export default FinanceManager;
