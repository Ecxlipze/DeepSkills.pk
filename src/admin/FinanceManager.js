import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMoneyBillWave, FaUserGraduate, FaChalkboardTeacher,
  FaChartBar, FaSearch, FaExclamationTriangle, FaTimes,
  FaEye, FaPlus, FaHistory
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

const FinanceManager = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'finance', 'full');
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingFees: 0,
    teacherSalaries: 0,
    netBalance: 0
  });

  const [studentFees, setStudentFees] = useState([]);
  const [teacherSalaries, setTeacherSalaries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
          student:admissions(name, cnic, status)
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
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_date: formData.paidDate,
          method: formData.method,
          reference_number: formData.reference,
          notes: formData.notes,
          amount: formData.amount // In case they paid a different amount
        })
        .eq('id', selectedInstallment.id);

      if (error) throw error;

      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);
      fetchFinanceData(); // Refresh
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

      // Check duplicate payment for the same teacher and month
      const { data: existingTPay } = await supabase
        .from('teacher_payments')
        .select('id')
        .eq('teacher_id', selectedTeacherForPay.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (existingTPay) {
        toast.error(`Salary for ${currentMonth} has already been recorded for ${selectedTeacherForPay.name}.`);
        return;
      }

      // Record in teacher_payments
      const { error: tpError } = await supabase
        .from('teacher_payments')
        .insert({
          teacher_id: selectedTeacherForPay.id,
          amount: Number(formData.amount),
          month: currentMonth,
          paid_on: formData.paidDate,
          method: formData.method,
          reference: formData.reference || null,
          status: 'Paid'
        });

      if (tpError) throw tpError;

      toast.success(`Salary paid successfully for ${selectedTeacherForPay.name}!`);
      setIsSalaryModalOpen(false);
      setSelectedTeacherForPay(null);
      fetchFinanceData();
    } catch (err) {
      toast.error("Failed to record salary payment");
    }
  };

  const statsCards = [
    { label: 'Total Revenue', value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: <FaMoneyBillWave />, color: '#4F8EF7' },
    { label: 'Outstanding', value: `Rs. ${stats.outstandingFees.toLocaleString()}`, icon: <FaExclamationTriangle />, color: '#F59E0B' },
    { label: 'Teacher Salaries', value: `Rs. ${stats.teacherSalaries.toLocaleString()}`, icon: <FaChalkboardTeacher />, color: '#8B5CF6' },
    { label: 'Net Balance', value: `Rs. ${stats.netBalance.toLocaleString()}`, icon: <FaChartBar />, color: '#10B981' },
  ];

  return (
    <AdminLayout>
      <Container>
        <Header>
          <h1>Finance Management</h1>
          <p>Monitor revenue, salaries, and system-wide financial health.</p>
        </Header>

        <StatsGrid>
          {statsCards.map((stat, idx) => (
            <StatCard key={idx} color={stat.color}>
              <div className="icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
              <div className="info">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            </StatCard>
          ))}
        </StatsGrid>

        <TabsContainer>
          <Tab
            $active={activeTab === 'students'}
            onClick={() => setActiveTab('students')}
          >
            <FaUserGraduate /> Student Fees
          </Tab>
          <Tab
            $active={activeTab === 'teachers'}
            onClick={() => setActiveTab('teachers')}
          >
            <FaChalkboardTeacher /> Teacher Salaries
          </Tab>
        </TabsContainer>

        <FiltersRow>
          <SearchBox>
            <FaSearch />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchBox>
          <FilterGroup>
            <select><option>All Batches</option></select>
            <select><option>All Status</option></select>
          </FilterGroup>
        </FiltersRow>

        <TableCard>
          <TableContainer>
            {activeTab === 'students' ? (
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Total Fee</th>
                    <th>Paid</th>
                    <th>Outstanding</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentFees.filter(f => f.student?.name.toLowerCase().includes(searchQuery.toLowerCase())).map((fee) => (
                    <tr key={fee.id}>
                      <td>
                        <div className="user-cell">
                          <span className="name">{fee.student?.name}</span>
                          <span className="sub">{fee.student?.cnic}</span>
                        </div>
                      </td>
                      <td>{fee.course}</td>
                      <td>
                        Rs. {(fee.payable != null ? fee.payable : fee.total_fee).toLocaleString()}
                        {fee.discount > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            (Disc: Rs. {fee.discount.toLocaleString()})
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#10B981' }}>Rs. {fee.paid.toLocaleString()}</td>
                      <td style={{ color: fee.outstanding > 0 ? '#ef4444' : '#6b7280' }}>
                        Rs. {fee.outstanding.toLocaleString()}
                      </td>
                      <td>
                        <PlanBadge type={fee.plan_type}>
                          {fee.plan_type === 'full' ? 'Full Pay' : `Installments (${fee.installment_count})`}
                        </PlanBadge>
                      </td>
                      <td>
                        <StatusBadge $status={fee.status}>{fee.status}</StatusBadge>
                      </td>
                      <td>
                        <ActionButton onClick={() => { setSelectedStudent(fee); setIsModalOpen(true); }}>
                          <FaEye /> View Details
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Specialization</th>
                    <th>Monthly Salary</th>
                    <th>This Month</th>
                    <th>Last Paid</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherSalaries.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.specialization}</td>
                      <td>Rs. {t.monthlySalary.toLocaleString()}</td>
                      <td>
                        <StatusBadge $status={t.status}>{t.status}</StatusBadge>
                      </td>
                      <td>{t.lastPaid}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px' }}>
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
                          <ActionButton onClick={() => router.push(`/admin/finance/transactions?search=${encodeURIComponent(t.name)}`)}>
                            <FaHistory /> History
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableContainer>
        </TableCard>
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <ModalHeader>
                <div>
                  <h2>Fee Breakdown: {selectedStudent.student?.name}</h2>
                  <p>{selectedStudent.course} | {selectedStudent.batch}</p>
                </div>
                <CloseBtn onClick={() => setIsModalOpen(false)}><FaTimes /></CloseBtn>
              </ModalHeader>

              <ModalBody>
                <div className="summary-banner">
                  <div className="item">
                    <span>Payable Fee</span>
                    <strong>Rs. {(selectedStudent.payable != null ? selectedStudent.payable : selectedStudent.total_fee).toLocaleString()}</strong>
                  </div>
                  {selectedStudent.discount > 0 && (
                    <div className="item">
                      <span>Discount</span>
                      <strong style={{ color: '#F59E0B' }}>Rs. {selectedStudent.discount.toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="item">
                    <span>Paid</span>
                    <strong style={{ color: '#10B981' }}>Rs. {selectedStudent.paid.toLocaleString()}</strong>
                  </div>
                  <div className="item">
                    <span>Balance</span>
                    <strong style={{ color: '#ef4444' }}>Rs. {selectedStudent.outstanding.toLocaleString()}</strong>
                  </div>
                </div>

                <h3 style={{ margin: '30px 0 15px', fontSize: '1.1rem' }}>Payment Schedule</h3>
                <TableContainer>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Paid Date</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.paymentRecords?.sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0)).map((p, idx) => (
                        <tr key={p.id}>
                          <td>{p.installment_number || 'Full'}</td>
                          <td>Rs. {p.amount.toLocaleString()}</td>
                          <td>{p.due_date}</td>
                          <td>{p.paid_date || '—'}</td>
                          <td>{p.method || '—'}</td>
                          <td><StatusBadge $status={p.status}>{p.status}</StatusBadge></td>
                          <td>
                            {p.status !== 'paid' && canMutate && (
                              <RecordBtn onClick={() => { setSelectedInstallment(p); setIsPaymentModalOpen(true); }}>
                                Mark Paid
                              </RecordBtn>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableContainer>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Record Payment Modal (Simplified) */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedInstallment && (
          <ModalOverlay style={{ zIndex: 2000 }}>
            <ModalContent style={{ maxWidth: '450px' }}>
              <ModalHeader>
                <h2>Record Payment</h2>
                <CloseBtn onClick={() => setIsPaymentModalOpen(false)}><FaTimes /></CloseBtn>
              </ModalHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleRecordPayment(Object.fromEntries(formData));
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Amount</label>
                    <Input type="number" name="amount" defaultValue={selectedInstallment.amount} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Paid Date</label>
                    <Input type="date" name="paidDate" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Payment Method</label>
                    <Select name="method" required>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="cheque">Cheque</option>
                    </Select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#6b7280' }}>Reference #</label>
                    <Input type="text" name="reference" placeholder="TXN ID / Receipt #" />
                  </div>
                  <SubmitBtn type="submit">Submit Payment</SubmitBtn>
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
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 30px;
  h1 { font-size: 2rem; color: #fff; margin-bottom: 10px; }
  p { color: #6b7280; font-size: 1rem; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const StatCard = styled.div`
  background: #111318;
  padding: 25px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 3px solid ${props => props.color};
  display: flex;
  align-items: center;
  gap: 20px;

  .icon {
    width: 55px;
    height: 55px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .info {
    h3 { font-size: 1.4rem; color: #fff; margin-bottom: 5px; }
    p { font-size: 0.85rem; color: #6b7280; font-weight: 500; }
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 15px;
`;

const Tab = styled.button`
  background: none;
  border: none;
  color: ${props => props.$active ? '#fff' : '#6b7280'};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  padding: 10px 5px;

  &::after {
    content: '';
    position: absolute;
    bottom: -16px;
    left: 0;
    width: 100%;
    height: 3px;
    background: #7B1F2E;
    transform: scaleX(${props => props.$active ? 1 : 0});
    transition: transform 0.3s ease;
  }
`;

const FiltersRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  gap: 20px;

  @media (max-width: 768px) { flex-direction: column; }
`;

const SearchBox = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;

  svg {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
  }

  input {
    width: 100%;
    background: #111318;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 12px 15px 12px 45px;
    border-radius: 12px;
    color: #fff;
    outline: none;
    transition: border-color 0.3s;

    &:focus { border-color: #7B1F2E; }
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 15px;

  select {
    background: #111318;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 10px 15px;
    border-radius: 10px;
    color: #fff;
    outline: none;
    cursor: pointer;
  }
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
    
    th {
      text-align: left;
      padding: 20px 25px;
      font-size: 0.8rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: rgba(255, 255, 255, 0.02);
    }
    
    td {
      padding: 18px 25px;
      font-size: 0.95rem;
      color: #eee;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
    }
  }

  .user-cell {
    display: flex;
    flex-direction: column;
    .name { font-weight: 600; color: #fff; }
    .sub { font-size: 0.8rem; color: #6b7280; }
  }
`;

const StatusBadge = styled.span`
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'paid': return 'rgba(16, 185, 129, 0.1)';
      case 'partial': return 'rgba(79, 142, 247, 0.1)';
      case 'overdue': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(245, 158, 11, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$status?.toLowerCase()) {
      case 'paid': return '#10B981';
      case 'partial': return '#4F8EF7';
      case 'overdue': return '#ef4444';
      default: return '#F59E0B';
    }
  }};
`;

const PlanBadge = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  background: rgba(255,255,255,0.05);
  color: ${props => props.type === 'full' ? '#8B5CF6' : '#fff'};
  border: 1px solid rgba(255,255,255,0.1);
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
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

// Modal Styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111318;
  width: 100%;
  max-width: 900px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 25px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 { font-size: 1.4rem; color: #fff; margin-bottom: 5px; }
  p { color: #6b7280; font-size: 0.9rem; margin: 0; }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  font-size: 1.2rem;
  cursor: pointer;
  &:hover { color: #fff; }
`;

const ModalBody = styled.div`
  padding: 30px;

  .summary-banner {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    background: rgba(255,255,255,0.02);
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(255,255,255,0.05);

    .item {
      display: flex;
      flex-direction: column;
      gap: 5px;
      span { font-size: 0.8rem; color: #6b7280; text-transform: uppercase; }
      strong { font-size: 1.2rem; }
    }
  }
`;

const RecordBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #9b273a; }
`;

const Input = styled.input`
  width: 100%;
  background: #000;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 12px;
  border-radius: 10px;
  color: #fff;
  outline: none;
  &:focus { border-color: #7B1F2E; }
`;

const Select = styled.select`
  width: 100%;
  background: #000;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 12px;
  border-radius: 10px;
  color: #fff;
  outline: none;
`;

const SubmitBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 15px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
  &:hover { background: #9b273a; }
`;

export default FinanceManager;
