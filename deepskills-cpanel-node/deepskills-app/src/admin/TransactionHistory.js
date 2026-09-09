import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, FaDownload, FaArrowUp, FaArrowDown, 
  FaExchangeAlt, FaSyncAlt, FaFilePdf, FaFileCsv, 
  FaTimes, FaUndo, FaEye, FaCalendarAlt, FaFilter, 
  FaMoneyBillWave, FaChalkboardTeacher, FaUserGraduate, 
  FaArrowLeft, FaReceipt, FaCheckCircle, FaExclamationCircle,
  FaPhoneAlt, FaIdCard, FaClock, FaExternalLinkAlt
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { downloadCsv } from '../utils/csvExport';
import { getAuthHeaders } from '../utils/adminAccessApi';
import { 
  createMasterLedgerReportPdf, 
  createFeeReceiptPdf, 
  createTeacherPayslipPdf 
} from '../utils/financePdf';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const getInitials = (name) => {
  if (!name) return 'DS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return dateStr;
  }
};

const TransactionHistory = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(router?.query?.search ? String(router.query.search) : '');

  // Filter States
  const [filterFlow, setFilterFlow] = useState('all'); // 'all', 'inflow', 'outflow'
  const [filterMethod, setFilterMethod] = useState('all'); // 'all', 'cash', 'bank_transfer', 'online', 'cheque'
  const [datePreset, setDatePreset] = useState('all'); // 'all', 'today', 'yesterday', 'last_7_days', 'this_month', 'last_month', 'this_quarter', 'this_year', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'amount_desc', 'amount_asc', 'name_asc'

  // Summary & Modal States
  const [apiSummary, setApiSummary] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (router?.query?.search) {
      setSearchQuery(String(router.query.search));
    }
  }, [router?.query?.search]);

  // Data Fetching
  const fetchTransactions = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Try server transactions endpoint first (staff portal auth + service role hydration)
      try {
        const headers = await getAuthHeaders();
        let response = await fetch('/api/admin/finance/transactions', { headers });

        if (response.ok) {
          const resData = await response.json().catch(() => null);
          if (resData?.status === 'success' && resData.data) {
            setTransactions(resData.data.transactions || []);
            setApiSummary(resData.data.summary || null);
            setLoading(false);
            setRefreshing(false);
            if (isManualRefresh) toast.success('Financial ledger updated');
            return;
          }
        }
      } catch (err) {
        console.warn('Server transaction endpoint notice, falling back to direct database queries:', err);
      }

      // 2. Direct Supabase Fallback
      const [pRes, tpRes] = await Promise.all([
        supabase.from('payments').select('*').eq('status', 'paid').order('paid_date', { ascending: false }),
        supabase.from('teacher_payments').select('*').order('paid_on', { ascending: false })
      ]);

      const allPayments = pRes.data || [];
      const teacherPayments = tpRes.data || [];

      const feePayments = allPayments.filter(p => p.entity_type !== 'teacher');
      const legacyTeacherPayments = allPayments.filter(p => p.entity_type === 'teacher');

      const studentIds = [...new Set(feePayments.map(p => p.entity_id).filter(Boolean))];
      const studentMap = {};
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('admissions')
          .select('id, name, course, batch, cnic, phone')
          .in('id', studentIds);
        (students || []).forEach(s => { studentMap[s.id] = s; });
      }

      const teacherIds = [
        ...new Set([
          ...teacherPayments.map(tp => tp.teacher_id),
          ...legacyTeacherPayments.map(p => p.entity_id)
        ].filter(Boolean))
      ];
      const teacherMap = {};
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('id, name, specialization, cnic, phone, email')
          .in('id', teacherIds);
        (teachers || []).forEach(t => { teacherMap[t.id] = t; });
      }

      const studentRows = feePayments.map(p => {
        const student = studentMap[p.entity_id] || {};
        const studentName = student.name || 'Enrolled Student';
        return {
          id: p.id,
          paid_date: p.paid_date || (p.created_at ? p.created_at.split('T')[0] : ''),
          entity_type: 'student',
          flow: 'inflow',
          entity_id: p.entity_id,
          person_name: studentName,
          person_cnic: student.cnic || '',
          person_phone: student.phone || '',
          program_name: student.course || 'Vocational Program',
          batch_name: student.batch || '',
          teacher_name: '',
          description: p.description || `Tuition Payment - ${studentName}`,
          method: p.method || 'cash',
          amount: Number(p.amount) || 0,
          reference_number: p.reference_number || '—',
          notes: p.notes || '',
          status: p.status || 'paid'
        };
      });

      const seenTeacherPaymentIds = new Set();
      const salaryRows = [];

      teacherPayments
        .filter(tp => (tp.status || '').toLowerCase() === 'paid')
        .forEach(tp => {
          seenTeacherPaymentIds.add(tp.id);
          const teacher = teacherMap[tp.teacher_id] || {};
          const teacherName = teacher.name || 'Faculty Member';
          const month = tp.month || tp.month_year || '';
          salaryRows.push({
            id: tp.id,
            paid_date: tp.paid_on || (tp.created_at ? tp.created_at.split('T')[0] : ''),
            entity_type: 'teacher',
            flow: 'outflow',
            entity_id: tp.teacher_id,
            person_name: teacherName,
            person_cnic: teacher.cnic || '',
            person_phone: teacher.phone || '',
            program_name: teacher.specialization || 'Instruction',
            batch_name: '',
            teacher_name: teacherName,
            month,
            description: month ? `Salary - ${teacherName} (${month})` : (tp.notes || `Salary - ${teacherName}`),
            method: tp.method || tp.payment_method || 'bank_transfer',
            amount: Number(tp.amount) || 0,
            reference_number: tp.reference || tp.notes || '—',
            notes: tp.notes || '',
            status: tp.status || 'Paid'
          });
        });

      legacyTeacherPayments.forEach(lp => {
        if (seenTeacherPaymentIds.has(lp.id)) return;
        seenTeacherPaymentIds.add(lp.id);
        const teacher = teacherMap[lp.entity_id] || {};
        const teacherName = teacher.name || 'Faculty Member';
        salaryRows.push({
          id: lp.id,
          paid_date: lp.paid_date || (lp.created_at ? lp.created_at.split('T')[0] : ''),
          entity_type: 'teacher',
          flow: 'outflow',
          entity_id: lp.entity_id,
          person_name: teacherName,
          person_cnic: teacher.cnic || '',
          person_phone: teacher.phone || '',
          program_name: teacher.specialization || 'Instruction',
          batch_name: '',
          teacher_name: teacherName,
          month: '',
          description: lp.description || `Salary - ${teacherName}`,
          method: lp.method || 'bank_transfer',
          amount: Number(lp.amount) || 0,
          reference_number: lp.reference_number || '—',
          notes: lp.notes || '',
          status: lp.status || 'paid'
        });
      });

      const allTxns = [...studentRows, ...salaryRows].sort((a, b) => {
        const dateA = new Date(a.paid_date || '1970-01-01').getTime();
        const dateB = new Date(b.paid_date || '1970-01-01').getTime();
        return dateB - dateA;
      });

      setTransactions(allTxns);
      if (isManualRefresh) toast.success('Financial ledger updated');
    } catch (err) {
      console.error('Failed to load transactions:', err);
      toast.error('Failed to load financial transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Date Range Filtering Logic
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (datePreset === 'all') return null;

    if (datePreset === 'today') {
      return { start: todayStr, end: todayStr, label: 'Today' };
    }

    if (datePreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      return { start: yStr, end: yStr, label: 'Yesterday' };
    }

    if (datePreset === 'last_7_days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      return { start: past.toISOString().slice(0, 10), end: todayStr, label: 'Last 7 Days' };
    }

    if (datePreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { start, end: todayStr, label: 'This Month' };
    }

    if (datePreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { start, end, label: 'Last Month' };
    }

    if (datePreset === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString().slice(0, 10);
      return { start, end: todayStr, label: 'This Quarter' };
    }

    if (datePreset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      return { start, end: todayStr, label: 'This Year' };
    }

    if (datePreset === 'custom') {
      return {
        start: customStartDate || '1970-01-01',
        end: customEndDate || '2099-12-31',
        label: `${customStartDate || 'Start'} to ${customEndDate || 'End'}`
      };
    }

    return null;
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Flow Filter
      if (filterFlow === 'inflow' && t.flow !== 'inflow') return false;
      if (filterFlow === 'outflow' && t.flow !== 'outflow') return false;

      // 2. Method Filter
      if (filterMethod !== 'all') {
        const m = (t.method || '').toLowerCase();
        if (filterMethod === 'cash' && !m.includes('cash')) return false;
        if (filterMethod === 'bank_transfer' && !m.includes('bank') && !m.includes('transfer') && !m.includes('ibft')) return false;
        if (filterMethod === 'online' && !m.includes('online') && !m.includes('easypaisa') && !m.includes('jazzcash')) return false;
        if (filterMethod === 'cheque' && !m.includes('cheque') && !m.includes('check')) return false;
      }

      // 3. Date Range Filter
      if (dateRangeBounds) {
        const pDate = t.paid_date ? t.paid_date.slice(0, 10) : '';
        if (pDate && (pDate < dateRangeBounds.start || pDate > dateRangeBounds.end)) {
          return false;
        }
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (t.person_name || '').toLowerCase().includes(q);
        const matchesCnic = (t.person_cnic || '').toLowerCase().includes(q);
        const matchesPhone = (t.person_phone || '').toLowerCase().includes(q);
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesRef = (t.reference_number || '').toLowerCase().includes(q);
        const matchesProg = (t.program_name || '').toLowerCase().includes(q);
        const matchesBatch = (t.batch_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCnic && !matchesPhone && !matchesDesc && !matchesRef && !matchesProg && !matchesBatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.paid_date || '1970-01-01').getTime() - new Date(a.paid_date || '1970-01-01').getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.paid_date || '1970-01-01').getTime() - new Date(b.paid_date || '1970-01-01').getTime();
      }
      if (sortBy === 'amount_desc') {
        return Number(b.amount || 0) - Number(a.amount || 0);
      }
      if (sortBy === 'amount_asc') {
        return Number(a.amount || 0) - Number(b.amount || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.person_name || '').localeCompare(b.person_name || '');
      }
      return 0;
    });
  }, [transactions, filterFlow, filterMethod, dateRangeBounds, searchQuery, sortBy]);

  // Dynamic View Summaries
  const currentSummary = useMemo(() => {
    const totalIn = filteredTransactions.filter(t => t.flow === 'inflow').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalOut = filteredTransactions.filter(t => t.flow === 'outflow').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const net = totalIn - totalOut;
    const turnover = totalIn + totalOut;
    const inflowCount = filteredTransactions.filter(t => t.flow === 'inflow').length;
    const outflowCount = filteredTransactions.filter(t => t.flow === 'outflow').length;
    return { totalIn, totalOut, net, turnover, inflowCount, outflowCount, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const globalSummary = useMemo(() => {
    if (apiSummary) {
      return {
        totalIn: apiSummary.totalIn || 0,
        totalOut: apiSummary.totalOut || 0,
        net: apiSummary.net || 0,
        turnover: (apiSummary.totalIn || 0) + (apiSummary.totalOut || 0),
        inflowCount: apiSummary.inflowCount || 0,
        outflowCount: apiSummary.outflowCount || 0,
        count: apiSummary.totalCount || 0
      };
    }
    const totalIn = transactions.filter(t => t.flow === 'inflow').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalOut = transactions.filter(t => t.flow === 'outflow').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      turnover: totalIn + totalOut,
      inflowCount: transactions.filter(t => t.flow === 'inflow').length,
      outflowCount: transactions.filter(t => t.flow === 'outflow').length,
      count: transactions.length
    };
  }, [transactions, apiSummary]);

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterFlow('all');
    setFilterMethod('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('date_desc');
    toast.success('Filters reset');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || filterFlow !== 'all' || filterMethod !== 'all' || datePreset !== 'all' || sortBy !== 'date_desc';

  // Export CSV Handler
  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions available to export');
      return;
    }
    const headers = [
      'Date',
      'Transaction ID',
      'Flow Type',
      'Entity Category',
      'Counterparty Name',
      'CNIC',
      'Contact Phone',
      'Program / Specialization',
      'Particulars / Description',
      'Payment Method',
      'Reference / Notes',
      'Amount (PKR)',
      'Status'
    ];

    const rows = filteredTransactions.map(t => [
      t.paid_date || '',
      t.id || '',
      t.flow === 'inflow' ? 'INFLOW (+)' : 'OUTFLOW (-)',
      t.entity_type === 'student' ? 'Student Tuition' : 'Faculty Payroll',
      t.person_name || 'Counterparty',
      t.person_cnic || '—',
      t.person_phone || '—',
      t.program_name || '—',
      t.description || 'Ledger Transaction',
      t.method ? String(t.method).replace('_', ' ') : 'bank_transfer',
      t.reference_number || '—',
      t.amount != null ? t.amount : 0,
      t.status || 'paid'
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsv(`DeepSkills_Master_Ledger_${dateStr}.csv`, headers, rows);
    toast.success(`Exported ${rows.length} transactions to CSV`);
  };

  // Export Audit PDF Handler
  const handleExportPdf = async () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions available for audit statement');
      return;
    }

    setIsExportingPdf(true);
    try {
      const scopeLabel = dateRangeBounds?.label || (datePreset === 'all' ? 'All Recorded Transactions' : datePreset);
      const doc = await createMasterLedgerReportPdf({
        transactions: filteredTransactions,
        summary: currentSummary,
        dateRangeText: scopeLabel,
        filterType: filterFlow,
        generatedBy: 'DeepSkills Central Finance Directorate'
      });

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`DeepSkills_Ledger_Audit_${dateStr}.pdf`);
      toast.success('Master Financial Ledger PDF downloaded!');
    } catch (err) {
      console.error('Failed to generate audit report PDF:', err);
      toast.error('Failed to generate audit report PDF: ' + (err.message || ''));
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download Individual Receipt / Payslip
  const handleDownloadVoucher = async (txn) => {
    try {
      if (txn.flow === 'inflow' || txn.entity_type === 'student') {
        const doc = await createFeeReceiptPdf({
          student: {
            name: txn.person_name,
            cnic: txn.person_cnic,
            phone: txn.person_phone,
            course: txn.program_name,
            batch: txn.batch_name
          },
          feePlan: {
            course: txn.program_name,
            batch: txn.batch_name
          },
          installment: {
            amount: txn.amount,
            paid_date: txn.paid_date,
            method: txn.method,
            reference_number: txn.reference_number,
            notes: txn.notes || txn.description
          },
          date: txn.paid_date
        });
        const safeName = (txn.person_name || 'Student').replace(/\s+/g, '_');
        doc.save(`DeepSkills_Receipt_${safeName}.pdf`);
        toast.success('Fee receipt downloaded!');
      } else {
        const doc = await createTeacherPayslipPdf({
          teacher: {
            name: txn.person_name,
            specialization: txn.program_name,
            cnic: txn.person_cnic,
            phone: txn.person_phone
          },
          payment: {
            amount: txn.amount,
            paid_on: txn.paid_date,
            month_year: txn.month,
            payment_method: txn.method,
            notes: txn.reference_number || txn.notes
          },
          month: txn.month
        });
        const safeName = (txn.person_name || 'Faculty').replace(/\s+/g, '_');
        doc.save(`DeepSkills_Payslip_${safeName}.pdf`);
        toast.success('Faculty payslip downloaded!');
      }
    } catch (err) {
      console.error('Voucher generation error:', err);
      toast.error('Failed to download voucher: ' + (err.message || ''));
    }
  };

  return (
    <AdminLayout>
      <Container>
        {/* TOP NAVIGATION & HEADER */}
        <HeaderWrap>
          <div className="title-block">
            <BreadcrumbRow>
              <button type="button" onClick={() => router.push('/admin/finance')} className="back-link">
                <FaArrowLeft /> Finance
              </button>
              <span className="divider">/</span>
              <span className="current">Master Transaction Ledger</span>
            </BreadcrumbRow>
            <h1>Master Financial Ledger</h1>
            <p>Unified real-time audit trail of student tuition inflows and faculty payroll disbursements.</p>
          </div>

          <ActionCluster>
            <ActionButton 
              type="button" 
              onClick={() => fetchTransactions(true)} 
              disabled={loading || refreshing}
              title="Refresh transaction history"
            >
              <FaSyncAlt className={loading || refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </ActionButton>
            <ActionButton 
              type="button" 
              onClick={handleExportCsv}
              title="Export filtered records to CSV"
            >
              <FaFileCsv /> Export CSV
            </ActionButton>
            <ActionButton 
              type="button" 
              $primary 
              onClick={handleExportPdf}
              disabled={isExportingPdf || filteredTransactions.length === 0}
              title="Generate branded Master Ledger Audit PDF"
            >
              <FaFilePdf /> {isExportingPdf ? 'Generating...' : 'Audit Report (PDF)'}
            </ActionButton>
          </ActionCluster>
        </HeaderWrap>

        {/* 4 HIGH-CONTRAST GLASSMORPHIC METRIC CARDS */}
        <StatsGrid>
          <StatCard $color="#10B981">
            <div className="top-meta">
              <span className="lbl">Tuition Collections</span>
              <span className="badge green"><FaArrowUp /> Inflow</span>
            </div>
            <div className="val green">Rs. {currentSummary.totalIn.toLocaleString()}</div>
            <div className="sub">
              {currentSummary.inflowCount} Tuition Payments • Active View
            </div>
          </StatCard>

          <StatCard $color="#EF4444">
            <div className="top-meta">
              <span className="lbl">Faculty Payroll</span>
              <span className="badge red"><FaArrowDown /> Outflow</span>
            </div>
            <div className="val red">Rs. {currentSummary.totalOut.toLocaleString()}</div>
            <div className="sub">
              {currentSummary.outflowCount} Salary Disbursements • Active View
            </div>
          </StatCard>

          <StatCard $color={currentSummary.net >= 0 ? '#38BDF8' : '#EF4444'}>
            <div className="top-meta">
              <span className="lbl">Net Cash Position</span>
              <span className={`badge ${currentSummary.net >= 0 ? 'sky' : 'red'}`}>
                <FaExchangeAlt /> {currentSummary.net >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className={`val ${currentSummary.net >= 0 ? 'sky' : 'red'}`}>
              {currentSummary.net >= 0 ? '+' : '-'}Rs. {Math.abs(currentSummary.net).toLocaleString()}
            </div>
            <div className="sub">
              Net Liquidity for Selected View
            </div>
          </StatCard>

          <StatCard $color="#8B5CF6">
            <div className="top-meta">
              <span className="lbl">Total Flow Turnover</span>
              <span className="badge purple"><FaMoneyBillWave /> Volume</span>
            </div>
            <div className="val purple">Rs. {currentSummary.turnover.toLocaleString()}</div>
            <div className="sub">
              {currentSummary.count} Total Transactions Recorded
            </div>
          </StatCard>
        </StatsGrid>

        {/* MULTI-CRITERIA FILTER & SEARCH BAR */}
        <FilterCard>
          <FilterTopRow>
            {/* Search Box */}
            <SearchInputWrap>
              <FaSearch className="search-icon" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student, faculty, CNIC, reference #, course..."
              />
              {searchQuery && (
                <button type="button" className="clear-btn" onClick={() => setSearchQuery('')}>
                  <FaTimes />
                </button>
              )}
            </SearchInputWrap>

            {/* Flow Type Filter */}
            <SelectWrap>
              <label>Flow Direction</label>
              <select value={filterFlow} onChange={(e) => setFilterFlow(e.target.value)}>
                <option value="all">All Flows (Combined)</option>
                <option value="inflow">Tuition Inflows (+) Only</option>
                <option value="outflow">Payroll Outflows (-) Only</option>
              </select>
            </SelectWrap>

            {/* Payment Method Filter */}
            <SelectWrap>
              <label>Payment Method</label>
              <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash in Hand</option>
                <option value="bank_transfer">Bank Transfer / IBFT</option>
                <option value="online">Online (EasyPaisa / JazzCash)</option>
                <option value="cheque">Cheque / Pay Order</option>
              </select>
            </SelectWrap>

            {/* Date Preset Filter */}
            <SelectWrap>
              <label>Date Window</label>
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
                <option value="all">All Recorded History</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </SelectWrap>

            {/* Sort Selector */}
            <SelectWrap>
              <label>Sort Order</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="amount_desc">Amount: Highest First</option>
                <option value="amount_asc">Amount: Lowest First</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </SelectWrap>
          </FilterTopRow>

          {/* Conditional Custom Date Range Bar */}
          {datePreset === 'custom' && (
            <CustomDateRow>
              <div className="custom-input-group">
                <label><FaCalendarAlt /> Start Date</label>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)} 
                />
              </div>
              <div className="custom-input-group">
                <label><FaCalendarAlt /> End Date</label>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)} 
                />
              </div>
            </CustomDateRow>
          )}

          {/* Filter Status Metadata & Reset */}
          <FilterMetaRow>
            <div className="meta-info">
              Showing <strong>{filteredTransactions.length}</strong> of {transactions.length} total entries
              {dateRangeBounds && <span> • Period: <strong>{dateRangeBounds.label}</strong></span>}
              {filterFlow !== 'all' && <span> • Flow: <strong>{filterFlow.toUpperCase()}</strong></span>}
              {filterMethod !== 'all' && <span> • Method: <strong>{filterMethod.replace('_', ' ')}</strong></span>}
            </div>
            {hasActiveFilters && (
              <button type="button" className="reset-btn" onClick={handleResetFilters}>
                <FaUndo /> Reset all filters
              </button>
            )}
          </FilterMetaRow>
        </FilterCard>

        {/* MASTER LEDGER TABLE */}
        <TableCard>
          <TableContainer>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '120px' }}>Date</th>
                  <th style={{ minWidth: '110px' }}>Flow</th>
                  <th style={{ minWidth: '240px' }}>Counterparty</th>
                  <th style={{ minWidth: '220px' }}>Particulars / Program</th>
                  <th style={{ minWidth: '160px' }}>Method &amp; Ref</th>
                  <th style={{ minWidth: '140px', textAlign: 'right' }}>Amount (PKR)</th>
                  <th style={{ minWidth: '90px' }}>Status</th>
                  <th style={{ minWidth: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const isInflow = t.flow === 'inflow' || t.entity_type === 'student';
                  return (
                    <tr key={t.id}>
                      {/* Date */}
                      <td>
                        <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{formatDate(t.paid_date)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ID: {String(t.id).slice(0, 8)}</div>
                      </td>

                      {/* Flow */}
                      <td>
                        <FlowPill $isInflow={isInflow}>
                          {isInflow ? <><FaArrowUp /> Inflow</> : <><FaArrowDown /> Outflow</>}
                        </FlowPill>
                      </td>

                      {/* Counterparty */}
                      <td>
                        <CounterpartyCell>
                          <AvatarCircle $isInflow={isInflow}>
                            {getInitials(t.person_name)}
                          </AvatarCircle>
                          <div className="person-details">
                            <div className="name-row">
                              <span className="name">{t.person_name || 'Counterparty'}</span>
                              <span className="role-tag">{isInflow ? 'Student' : 'Faculty'}</span>
                            </div>
                            <div className="contact-sub">
                              {t.person_cnic && (
                                <span><FaIdCard /> {t.person_cnic}</span>
                              )}
                              {t.person_phone && (
                                <span><FaPhoneAlt /> {t.person_phone}</span>
                              )}
                            </div>
                          </div>
                        </CounterpartyCell>
                      </td>

                      {/* Description / Program */}
                      <td>
                        <div style={{ fontWeight: '500', color: '#e2e8f0' }}>{t.description || 'Ledger Transaction'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {t.program_name || (isInflow ? 'Tuition Settlement' : 'Instructional Honorarium')}
                          {t.batch_name ? ` • ${t.batch_name}` : ''}
                        </div>
                      </td>

                      {/* Method & Ref */}
                      <td>
                        <div style={{ textTransform: 'capitalize', fontWeight: '500', color: '#cbd5e1' }}>
                          {String(t.method || 'bank').replace('_', ' ')}
                        </div>
                        {t.reference_number && t.reference_number !== '—' && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }} title={t.reference_number}>
                            Ref: {String(t.reference_number).slice(0, 16)}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ textAlign: 'right' }}>
                        <AmountTag $isInflow={isInflow}>
                          {isInflow ? '+' : '-'} Rs. {Number(t.amount || 0).toLocaleString()}
                        </AmountTag>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusDotBadge>
                          <span className="dot" /> Paid
                        </StatusDotBadge>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <ActionRow>
                          <TableBtn 
                            type="button" 
                            onClick={() => setSelectedTxn(t)} 
                            title="Inspect transaction details"
                          >
                            <FaEye /> Inspect
                          </TableBtn>
                          <TableBtn 
                            type="button" 
                            $accent={isInflow} 
                            onClick={() => handleDownloadVoucher(t)}
                            title={isInflow ? 'Download Fee Receipt' : 'Download Faculty Payslip'}
                          >
                            <FaReceipt /> {isInflow ? 'Receipt' : 'Payslip'}
                          </TableBtn>
                        </ActionRow>
                      </td>
                    </tr>
                  );
                })}

                {filteredTransactions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyStateCard>
                        <FaExclamationCircle size={36} />
                        <h4>No transactions matching filter criteria</h4>
                        <p>Try adjusting your search query, date preset, or flow direction filters.</p>
                        {hasActiveFilters && (
                          <button type="button" onClick={handleResetFilters}>
                            <FaUndo /> Reset all filters
                          </button>
                        )}
                      </EmptyStateCard>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                      <FaSyncAlt className="spin" size={24} style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                      Loading financial ledger records...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableContainer>
        </TableCard>

        {/* TRANSACTION DETAILS MODAL */}
        <AnimatePresence>
          {selectedTxn && (
            <ModalOverlay 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTxn(null)}
            >
              <ModalContent 
                initial={{ y: 20, scale: 0.96 }} 
                animate={{ y: 0, scale: 1 }} 
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <div className="title-area">
                    <h3>Transaction Audit Details</h3>
                    <span className="txn-id">ID: {selectedTxn.id}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedTxn(null)}><FaTimes /></button>
                </ModalHeader>

                <ModalBanner $isInflow={selectedTxn.flow === 'inflow' || selectedTxn.entity_type === 'student'}>
                  <div className="banner-left">
                    <span className="flow-lbl">
                      {selectedTxn.flow === 'inflow' || selectedTxn.entity_type === 'student' ? 'TUITION INFLOW (+)' : 'FACULTY PAYROLL OUTFLOW (-)'}
                    </span>
                    <h2>Rs. {Number(selectedTxn.amount || 0).toLocaleString()}</h2>
                  </div>
                  <div className="banner-right">
                    <StatusDotBadge><span className="dot" /> Verified Settlement</StatusDotBadge>
                    <span className="date-str">{formatDate(selectedTxn.paid_date)}</span>
                  </div>
                </ModalBanner>

                <ModalGrid>
                  <KeyValGroup>
                    <label>Counterparty Name</label>
                    <div className="val">{selectedTxn.person_name || 'N/A'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Entity Category</label>
                    <div className="val">{selectedTxn.entity_type === 'student' ? 'Student Enrollment' : 'Faculty Member'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>National ID (CNIC)</label>
                    <div className="val font-mono">{selectedTxn.person_cnic || 'Not registered'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Contact Phone</label>
                    <div className="val">{selectedTxn.person_phone || 'Not provided'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Program / Specialization</label>
                    <div className="val">{selectedTxn.program_name || 'Vocational Training'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Payment Method</label>
                    <div className="val" style={{ textTransform: 'capitalize' }}>
                      {String(selectedTxn.method || 'bank_transfer').replace('_', ' ')}
                    </div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Reference / Slip ID</label>
                    <div className="val font-mono">{selectedTxn.reference_number || '—'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Settlement Date</label>
                    <div className="val">{formatDate(selectedTxn.paid_date)}</div>
                  </KeyValGroup>

                  <KeyValGroup style={{ gridColumn: '1 / -1' }}>
                    <label>Particulars / Bookkeeping Notes</label>
                    <div className="val notes-box">
                      {selectedTxn.description || selectedTxn.notes || 'Recorded in regular accounting settlement'}
                    </div>
                  </KeyValGroup>
                </ModalGrid>

                <ModalFooter>
                  <ActionButton type="button" onClick={() => setSelectedTxn(null)}>
                    Close
                  </ActionButton>
                  <ActionButton 
                    type="button" 
                    $primary 
                    onClick={() => {
                      handleDownloadVoucher(selectedTxn);
                      setSelectedTxn(null);
                    }}
                  >
                    <FaReceipt /> {selectedTxn.flow === 'inflow' || selectedTxn.entity_type === 'student' ? 'Download Fee Receipt' : 'Download Faculty Payslip'}
                  </ActionButton>
                </ModalFooter>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </AdminLayout>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 0 40px 0;
  color: #fff;

  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
`;

const HeaderWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
  flex-wrap: wrap;

  .title-block {
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #fff;
      margin: 6px 0 4px 0;
      letter-spacing: -0.02em;
    }
    p {
      color: #94a3b8;
      font-size: 0.92rem;
      margin: 0;
    }
  }
`;

const BreadcrumbRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: #64748b;

  .back-link {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    font-size: 0.82rem;
    font-weight: 600;
    transition: color 0.2s;

    &:hover {
      color: #38bdf8;
    }
  }

  .divider {
    color: #475569;
  }

  .current {
    color: #e2e8f0;
    font-weight: 600;
  }
`;

const ActionCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  background: ${props => props.$primary 
    ? 'linear-gradient(135deg, #7B1F2E 0%, #a82e41 100%)' 
    : '#111318'};
  color: ${props => props.$primary ? '#fff' : '#e2e8f0'};
  border: 1px solid ${props => props.$primary ? '#7B1F2E' : 'rgba(255, 255, 255, 0.1)'};
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: ${props => props.$primary ? '0 4px 14px rgba(123, 31, 46, 0.35)' : 'none'};

  &:hover:not(:disabled) {
    background: ${props => props.$primary 
      ? 'linear-gradient(135deg, #912437 0%, #b83348 100%)' 
      : 'rgba(255, 255, 255, 0.06)'};
    border-color: ${props => props.$primary ? '#b83348' : 'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 4px solid ${props => props.$color || '#38bdf8'};
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;

  .top-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .lbl {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;

      &.green {
        background: rgba(16, 185, 129, 0.12);
        color: #10B981;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }

      &.red {
        background: rgba(239, 68, 68, 0.12);
        color: #EF4444;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }

      &.sky {
        background: rgba(56, 189, 248, 0.12);
        color: #38BDF8;
        border: 1px solid rgba(56, 189, 248, 0.25);
      }

      &.purple {
        background: rgba(139, 92, 246, 0.12);
        color: #A78BFA;
        border: 1px solid rgba(139, 92, 246, 0.25);
      }
    }
  }

  .val {
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;

    &.green { color: #10B981; }
    &.red { color: #EF4444; }
    &.sky { color: #38BDF8; }
    &.purple { color: #C4B5FD; }
  }

  .sub {
    font-size: 0.78rem;
    color: #64748b;
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
`;

const FilterTopRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 14px;
  align-items: flex-end;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const SearchInputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    left: 14px;
    color: #64748b;
    pointer-events: none;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 10px 38px 10px 38px;
    border-radius: 10px;
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #38bdf8;
      background: rgba(255, 255, 255, 0.05);
    }

    &::placeholder {
      color: #64748b;
    }
  }

  .clear-btn {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
    font-size: 0.85rem;

    &:hover {
      color: #e2e8f0;
    }
  }
`;

const SelectWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.74rem;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  select {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.86rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;

    &:focus {
      border-color: #38bdf8;
    }

    option {
      background: #111318;
      color: #fff;
    }
  }
`;

const CustomDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  flex-wrap: wrap;

  .custom-input-group {
    display: flex;
    align-items: center;
    gap: 10px;

    label {
      font-size: 0.8rem;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }

    input[type="date"] {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 0.84rem;
      outline: none;
    }
  }
`;

const FilterMetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 0.82rem;
  color: #64748b;
  flex-wrap: wrap;
  gap: 10px;

  .meta-info {
    strong {
      color: #cbd5e1;
    }
    span {
      color: #94a3b8;
    }
  }

  .reset-btn {
    background: none;
    border: none;
    color: #f87171;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;

    &:hover {
      color: #ef4444;
      text-decoration: underline;
    }
  }
`;

const TableCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
`;

const TableContainer = styled.div`
  overflow-x: auto;
  width: 100%;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;

    thead {
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);

      th {
        text-align: left;
        padding: 14px 18px;
        font-size: 0.74rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        transition: background 0.15s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        &:last-child {
          border-bottom: none;
        }

        td {
          padding: 14px 18px;
          vertical-align: middle;
          color: #e2e8f0;
        }
      }
    }
  }
`;

const FlowPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
  background: ${props => props.$isInflow 
    ? 'rgba(16, 185, 129, 0.12)' 
    : 'rgba(239, 68, 68, 0.12)'};
  color: ${props => props.$isInflow ? '#10B981' : '#EF4444'};
  border: 1px solid ${props => props.$isInflow 
    ? 'rgba(16, 185, 129, 0.25)' 
    : 'rgba(239, 68, 68, 0.25)'};
`;

const CounterpartyCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .person-details {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .name-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .name {
        font-weight: 700;
        color: #fff;
        font-size: 0.9rem;
      }

      .role-tag {
        font-size: 0.68rem;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.06);
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
    }

    .contact-sub {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.74rem;
      color: #64748b;

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
`;

const AvatarCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
  flex-shrink: 0;
  background: ${props => props.$isInflow
    ? 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
    : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'};
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const AmountTag = styled.span`
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${props => props.$isInflow ? '#34D399' : '#F87171'};
`;

const StatusDotBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  color: #10B981;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
  }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const TableBtn = styled.button`
  background: ${props => props.$accent 
    ? 'rgba(16, 185, 129, 0.1)' 
    : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${props => props.$accent 
    ? 'rgba(16, 185, 129, 0.3)' 
    : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$accent ? '#34D399' : '#cbd5e1'};
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.$accent 
      ? 'rgba(16, 185, 129, 0.2)' 
      : 'rgba(255, 255, 255, 0.08)'};
    border-color: ${props => props.$accent 
      ? '#10B981' 
      : 'rgba(255, 255, 255, 0.2)'};
    color: #fff;
  }
`;

const EmptyStateCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #64748b;

  svg {
    color: #475569;
    margin-bottom: 12px;
  }

  h4 {
    font-size: 1.05rem;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0 0 6px 0;
  }

  p {
    font-size: 0.86rem;
    color: #94a3b8;
    margin: 0 0 16px 0;
    max-width: 440px;
  }

  button {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #0E131F;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  width: 100%;
  max-width: 620px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .title-area {
    h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 2px 0;
    }
    .txn-id {
      font-size: 0.74rem;
      color: #64748b;
      font-family: monospace;
    }
  }

  button {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 6px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }
  }
`;

const ModalBanner = styled.div`
  padding: 20px 24px;
  background: ${props => props.$isInflow
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)'
    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(127, 29, 29, 0.25) 100%)'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .banner-left {
    .flow-lbl {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: ${props => props.$isInflow ? '#34D399' : '#F87171'};
    }
    h2 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #fff;
      margin: 4px 0 0 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    }
  }

  .banner-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;

    .date-str {
      font-size: 0.76rem;
      color: #94a3b8;
    }
  }
`;

const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.01);

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const KeyValGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.03em;
  }

  .val {
    font-size: 0.9rem;
    color: #e2e8f0;
    font-weight: 600;

    &.font-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    &.notes-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.84rem;
      color: #cbd5e1;
      font-weight: 400;
      line-height: 1.5;
    }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
`;

export default TransactionHistory;
