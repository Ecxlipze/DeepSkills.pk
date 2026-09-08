import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  FaChartBar, FaCalendarAlt, FaDownload, FaSyncAlt, FaFileCsv,
  FaUndo, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaExchangeAlt,
  FaGraduationCap, FaLayerGroup, FaWallet, FaPercentage,
  FaFilter, FaInfoCircle, FaCheckCircle, FaCoins
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { SkeletonCard } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { createRevenueStatementPdf, downloadBlob } from '../utils/financePdf';
import { supabase } from '../supabaseClient';
import { getAuthHeaders } from '../utils/adminAccessApi';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Container = styled.div`
  padding: 20px 0 40px;
  color: #f8fafc;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;

  .titles {
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 12px;

      .badge {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 4px 10px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #10b981;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }
    p {
      color: #94a3b8;
      font-size: 0.88rem;
      margin: 0;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 15px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.primary {
    background: linear-gradient(135deg, #7b1f2e 0%, #9e2a3b 100%);
    border-color: #d4af37;
    color: #fff;
    box-shadow: 0 4px 14px rgba(123, 31, 46, 0.3);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #8c2334 0%, #b23043 100%);
      transform: translateY(-1px);
    }
  }

  &.secondary {
    background: rgba(56, 189, 248, 0.1);
    border-color: rgba(56, 189, 248, 0.25);
    color: #38bdf8;

    &:hover:not(:disabled) {
      background: rgba(56, 189, 248, 0.18);
    }
  }

  .spinner {
    animation: ${spin} 1s linear infinite;
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 16px;

  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  .presets-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .controls-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
    align-items: flex-end;
  }
`;

const PresetPill = styled.button`
  background: ${props => props.$active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$active ? '#38bdf8' : '#94a3b8'};
  padding: 6px 13px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;

  &:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.74rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  select, input {
    background: #0b0d11;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #38bdf8;
    }
  }
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 26px;
`;

const KpiCard = styled(motion.div)`
  background: #111318;
  border: 1px solid ${props => props.$border || 'rgba(255, 255, 255, 0.07)'};
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .icon-box {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${props => props.$iconBg || 'rgba(255, 255, 255, 0.05)'};
      color: ${props => props.$iconColor || '#fff'};
      font-size: 0.95rem;
    }
  }

  .value {
    font-size: 1.65rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 6px;
    font-family: monospace;
    letter-spacing: -0.02em;
  }

  .footer-sub {
    font-size: 0.78rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;

    .highlight {
      font-weight: 700;
      color: ${props => props.$highlightColor || '#10b981'};
    }
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 26px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  padding: 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

  .chart-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .badge {
      font-size: 0.72rem;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }
  }

  .chart-body {
    height: 300px;
    width: 100%;
  }
`;

const TabNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;

  button {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #64748b;
    padding: 10px 16px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 8px;

    &:hover {
      color: #cbd5e1;
    }

    &.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
    }
  }
`;

const TableContainer = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  margin-bottom: 30px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;

  thead {
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    th {
      padding: 14px 18px;
      text-align: left;
      font-size: 0.73rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.15s;

      &:hover {
        background: rgba(255, 255, 255, 0.02);
      }

      td {
        padding: 14px 18px;
        color: #cbd5e1;
      }
    }
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;

  .fill {
    height: 100%;
    background: ${props => props.$fillColor || '#10b981'};
    border-radius: 999px;
    width: ${props => Math.min(100, Math.max(0, props.$percent || 0))}%;
  }
`;

const PIE_COLORS = ['#38bdf8', '#10b981', '#fbbf24', '#a855f7', '#f43f5e', '#64748b'];

const PRESET_LABELS = {
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  this_year: 'This Financial Year',
  all_time: 'All Recorded Time',
  custom: 'Custom Date Range'
};

const RevenueReport = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Filters
  const [preset, setPreset] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');

  // Active breakdown tab
  const [breakdownTab, setBreakdownTab] = useState('courses'); // 'courses' | 'batches' | 'monthly' | 'recent'

  // Data state
  const [reportData, setReportData] = useState({
    filterSummary: {},
    kpis: {
      grossTuitionBilled: 0,
      totalCollectedRevenue: 0,
      totalOutstandingReceivable: 0,
      totalFacultyPayroll: 0,
      totalReferralCommissions: 0,
      totalOperatingExpenses: 0,
      netOperatingIncome: 0,
      profitMargin: 0,
      collectionEfficiency: 0,
      totalPaidTransactions: 0,
      averageTransactionValue: 0
    },
    courseBreakdown: [],
    batchBreakdown: [],
    monthlyTimeline: [],
    paymentMethods: [],
    recentTransactions: [],
    filterOptions: { courses: [], batches: [] }
  });

  const fetchRevenueReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const params = new URLSearchParams();
    params.append('preset', preset);
    if (preset === 'custom' && startDate && endDate) {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }
    if (selectedCourse !== 'all') params.append('course', selectedCourse);
    if (selectedBatch !== 'all') params.append('batch', selectedBatch);

    // 1. Attempt Server API with robust credentials
    try {
      const authHeaders = await getAuthHeaders();
      const headers = { 'Content-Type': 'application/json', ...authHeaders };

      let res = await fetch(`/api/admin/finance/revenue-report?${params.toString()}`, { headers });
      if (res.status === 404) {
        res = await fetch(`/api/admin/finance/revenue-report.php?${params.toString()}`, { headers });
      }

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 'success' && json.data) {
          setReportData(json.data);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
    } catch (serverErr) {
      console.warn('Revenue report API notice, executing direct database calculation fallback:', serverErr);
    }

    // 2. Direct Supabase Database Aggregation Fallback
    try {
      const now = new Date();
      let rangeStart = null;
      let rangeEnd = null;

      if (preset === 'today') {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (preset === 'yesterday') {
        const yDay = new Date(now);
        yDay.setDate(yDay.getDate() - 1);
        rangeStart = new Date(yDay.getFullYear(), yDay.getMonth(), yDay.getDate(), 0, 0, 0, 0);
        rangeEnd = new Date(yDay.getFullYear(), yDay.getMonth(), yDay.getDate(), 23, 59, 59, 999);
      } else if (preset === 'last_7_days') {
        const past = new Date(now);
        past.setDate(past.getDate() - 7);
        rangeStart = new Date(past.getFullYear(), past.getMonth(), past.getDate(), 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (preset === 'this_month') {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (preset === 'last_month') {
        rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (preset === 'this_quarter') {
        const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
        rangeStart = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), qStartMonth + 3, 0, 23, 59, 59, 999);
      } else if (preset === 'this_year') {
        rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      } else if (preset === 'custom' && startDate && endDate) {
        rangeStart = new Date(`${startDate}T00:00:00`);
        rangeEnd = new Date(`${endDate}T23:59:59.999`);
      }

      const [pRes, tpRes, fpRes, admRes, crsRes, btchRes] = await Promise.all([
        supabase.from('payments').select('*'),
        supabase.from('teacher_payments').select('*'),
        supabase.from('fee_plans').select('*'),
        supabase.from('admissions').select('id, name, course, batch, cnic, phone, status, admission_date'),
        supabase.from('courses').select('id, title, fee, duration, category'),
        supabase.from('batches').select('id, batch_name, course, status, start_date, end_date')
      ]);

      const allPayments = pRes.data || [];
      const allTeacherPayments = tpRes.data || [];
      const allFeePlans = fpRes.data || [];
      const allAdmissions = admRes.data || [];
      const allCourses = crsRes.data || [];
      const allBatches = btchRes.data || [];

      const studentMap = new Map();
      allAdmissions.forEach(stu => {
        studentMap.set(stu.id, stu);
        if (stu.cnic) studentMap.set(stu.cnic, stu);
      });

      const feePlanMap = new Map();
      allFeePlans.forEach(plan => {
        if (plan.student_id) feePlanMap.set(plan.student_id, plan);
      });

      const isDateInRange = (dStr) => {
        if (!rangeStart || !rangeEnd) return true;
        if (!dStr) return false;
        const d = new Date(dStr);
        if (Number.isNaN(d.getTime())) return false;
        return d >= rangeStart && d <= rangeEnd;
      };

      const isReferralPayment = (p) => p.entity_type === 'referrer' || (p.description && p.description.startsWith('Referral Reward'));
      const isTeacherPayment = (p) => !isReferralPayment(p) && p.entity_type === 'teacher';
      const isStudentPayment = (p) => !isReferralPayment(p) && p.entity_type !== 'teacher';

      const inRangeStudentPayments = [];
      const allPaidStudentPayments = [];

      allPayments.forEach(p => {
        if (!isStudentPayment(p) || p.status !== 'paid') return;
        allPaidStudentPayments.push(p);

        const stu = studentMap.get(p.entity_id);
        const plan = feePlanMap.get(p.entity_id);
        const studentCourse = stu?.course || plan?.course || 'Unknown';
        const studentBatch = stu?.batch || plan?.batch || 'Unknown';

        if (selectedCourse !== 'all' && studentCourse !== selectedCourse) return;
        if (selectedBatch !== 'all' && studentBatch !== selectedBatch) return;

        const dateField = p.paid_date || p.created_at;
        if (isDateInRange(dateField)) {
          inRangeStudentPayments.push({
            ...p,
            studentName: stu?.name || 'Student',
            course: studentCourse,
            batch: studentBatch,
            phone: stu?.phone || '',
            cnic: stu?.cnic || ''
          });
        }
      });

      const inRangeTeacherPayments = [];
      allTeacherPayments.forEach(tp => {
        if (tp.status?.toLowerCase() !== 'paid') return;
        const dateField = tp.paid_on || tp.created_at;
        if (isDateInRange(dateField)) {
          inRangeTeacherPayments.push({
            id: tp.id,
            amount: Number(tp.amount || 0),
            paid_date: dateField,
            method: tp.method || 'bank_transfer',
            reference_number: tp.reference || '',
            description: `Faculty Honorarium: ${tp.month || 'Payroll'}`
          });
        }
      });

      allPayments.forEach(p => {
        if (!isTeacherPayment(p) || p.status !== 'paid') return;
        const dateField = p.paid_date || p.created_at;
        if (isDateInRange(dateField)) {
          inRangeTeacherPayments.push({
            id: p.id,
            amount: Number(p.amount || 0),
            paid_date: dateField,
            method: p.method || 'bank_transfer',
            reference_number: p.reference_number || '',
            description: p.description || 'Faculty Payroll'
          });
        }
      });

      const inRangeReferralPayments = [];
      allPayments.forEach(p => {
        if (!isReferralPayment(p) || p.status !== 'paid') return;
        const dateField = p.paid_date || p.created_at;
        if (isDateInRange(dateField)) {
          inRangeReferralPayments.push({
            id: p.id,
            amount: Number(p.amount || 0),
            paid_date: dateField,
            method: p.method || 'bank_transfer',
            reference_number: p.reference_number || '',
            description: p.description || 'Referral Commission'
          });
        }
      });

      const totalCollectedRevenue = inRangeStudentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalFacultyPayroll = inRangeTeacherPayments.reduce((sum, tp) => sum + (Number(tp.amount) || 0), 0);
      const totalReferralCommissions = inRangeReferralPayments.reduce((sum, rp) => sum + (Number(rp.amount) || 0), 0);
      const totalOperatingExpenses = totalFacultyPayroll + totalReferralCommissions;
      const netOperatingIncome = totalCollectedRevenue - totalOperatingExpenses;
      const profitMargin = totalCollectedRevenue > 0
        ? Math.round((netOperatingIncome / totalCollectedRevenue) * 100)
        : 0;

      let grossTuitionBilled = 0;
      let totalOutstandingReceivable = 0;

      allFeePlans.forEach(plan => {
        const studentCourse = plan.course || studentMap.get(plan.student_id)?.course || 'Unknown';
        const studentBatch = plan.batch || studentMap.get(plan.student_id)?.batch || 'Unknown';

        if (selectedCourse !== 'all' && studentCourse !== selectedCourse) return;
        if (selectedBatch !== 'all' && studentBatch !== selectedBatch) return;

        const billed = plan.final_fee != null ? Number(plan.final_fee) : Number(plan.total_fee || 0);
        grossTuitionBilled += billed;

        const studentPaid = allPaidStudentPayments
          .filter(p => p.entity_id === plan.student_id)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        totalOutstandingReceivable += Math.max(0, billed - studentPaid);
      });

      const totalReceivablePool = totalCollectedRevenue + totalOutstandingReceivable;
      const collectionEfficiency = totalReceivablePool > 0
        ? Math.round((totalCollectedRevenue / totalReceivablePool) * 100)
        : 0;

      const totalPaidTransactions = inRangeStudentPayments.length;
      const averageTransactionValue = totalPaidTransactions > 0
        ? Math.round(totalCollectedRevenue / totalPaidTransactions)
        : 0;

      // Course Breakdown
      const courseStatsMap = new Map();
      allCourses.forEach(c => {
        courseStatsMap.set(c.title, {
          courseTitle: c.title,
          category: c.category || 'Professional',
          baseFee: Number(c.fee || 0),
          enrolledStudents: 0,
          totalBilled: 0,
          collectedRevenue: 0,
          outstandingFees: 0,
          activeBatches: 0
        });
      });

      allBatches.forEach(b => {
        if (courseStatsMap.has(b.course)) {
          courseStatsMap.get(b.course).activeBatches += 1;
        }
      });

      allFeePlans.forEach(plan => {
        const cName = plan.course || studentMap.get(plan.student_id)?.course || 'Other';
        if (!courseStatsMap.has(cName)) {
          courseStatsMap.set(cName, {
            courseTitle: cName,
            category: 'Vocational',
            baseFee: 0,
            enrolledStudents: 0,
            totalBilled: 0,
            collectedRevenue: 0,
            outstandingFees: 0,
            activeBatches: 0
          });
        }
        const cStat = courseStatsMap.get(cName);
        cStat.enrolledStudents += 1;
        const billed = plan.final_fee != null ? Number(plan.final_fee) : Number(plan.total_fee || 0);
        cStat.totalBilled += billed;

        const studentPaid = allPaidStudentPayments
          .filter(p => p.entity_id === plan.student_id)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        cStat.outstandingFees += Math.max(0, billed - studentPaid);
      });

      inRangeStudentPayments.forEach(p => {
        const cName = p.course || 'Other';
        if (courseStatsMap.has(cName)) {
          courseStatsMap.get(cName).collectedRevenue += (Number(p.amount) || 0);
        }
      });

      const courseBreakdown = Array.from(courseStatsMap.values())
        .filter(c => c.enrolledStudents > 0 || c.collectedRevenue > 0)
        .map(c => ({
          ...c,
          recoveryRate: c.totalBilled > 0 ? Math.min(100, Math.round((c.collectedRevenue / c.totalBilled) * 100)) : 0
        }))
        .sort((a, b) => b.collectedRevenue - a.collectedRevenue);

      // Batch Breakdown
      const batchStatsMap = new Map();
      allBatches.forEach(b => {
        batchStatsMap.set(b.batch_name, {
          batchName: b.batch_name,
          courseTitle: b.course,
          status: b.status || 'Active',
          studentCount: 0,
          totalBilled: 0,
          collectedRevenue: 0
        });
      });

      allFeePlans.forEach(plan => {
        const bName = plan.batch || studentMap.get(plan.student_id)?.batch;
        if (bName && batchStatsMap.has(bName)) {
          const bStat = batchStatsMap.get(bName);
          bStat.studentCount += 1;
          bStat.totalBilled += (plan.final_fee != null ? Number(plan.final_fee) : Number(plan.total_fee || 0));
        }
      });

      inRangeStudentPayments.forEach(p => {
        const bName = p.batch;
        if (bName && batchStatsMap.has(bName)) {
          batchStatsMap.get(bName).collectedRevenue += (Number(p.amount) || 0);
        }
      });

      const batchBreakdown = Array.from(batchStatsMap.values())
        .filter(b => b.studentCount > 0 || b.collectedRevenue > 0)
        .sort((a, b) => b.collectedRevenue - a.collectedRevenue);

      // Monthly Timeline
      const monthlyLedgerMap = new Map();
      const getMonthKey = (dateStr) => {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      const getMonthLabel = (monthKey) => {
        const [y, m] = monthKey.split('-');
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };

      inRangeStudentPayments.forEach(p => {
        const key = getMonthKey(p.paid_date || p.created_at);
        if (!key) return;
        if (!monthlyLedgerMap.has(key)) {
          monthlyLedgerMap.set(key, { monthKey: key, monthLabel: getMonthLabel(key), tuitionRevenue: 0, teacherPayroll: 0, referralRewards: 0 });
        }
        monthlyLedgerMap.get(key).tuitionRevenue += (Number(p.amount) || 0);
      });

      inRangeTeacherPayments.forEach(tp => {
        const key = getMonthKey(tp.paid_date);
        if (!key) return;
        if (!monthlyLedgerMap.has(key)) {
          monthlyLedgerMap.set(key, { monthKey: key, monthLabel: getMonthLabel(key), tuitionRevenue: 0, teacherPayroll: 0, referralRewards: 0 });
        }
        monthlyLedgerMap.get(key).teacherPayroll += (Number(tp.amount) || 0);
      });

      inRangeReferralPayments.forEach(rp => {
        const key = getMonthKey(rp.paid_date);
        if (!key) return;
        if (!monthlyLedgerMap.has(key)) {
          monthlyLedgerMap.set(key, { monthKey: key, monthLabel: getMonthLabel(key), tuitionRevenue: 0, teacherPayroll: 0, referralRewards: 0 });
        }
        monthlyLedgerMap.get(key).referralRewards += (Number(rp.amount) || 0);
      });

      const monthlyTimeline = Array.from(monthlyLedgerMap.values())
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        .map(m => {
          const totalExpenses = m.teacherPayroll + m.referralRewards;
          const netSurplus = m.tuitionRevenue - totalExpenses;
          const marginPct = m.tuitionRevenue > 0
            ? Math.round((netSurplus / m.tuitionRevenue) * 100)
            : 0;
          return { ...m, totalExpenses, netSurplus, marginPct };
        });

      // Payment Methods
      const methodCounts = new Map();
      inRangeStudentPayments.forEach(p => {
        const rawMethod = (p.method || 'bank_transfer').toLowerCase().trim();
        let label = 'Bank Transfer / IBFT';
        if (rawMethod.includes('cash')) label = 'Cash in Hand';
        else if (rawMethod.includes('jazz')) label = 'JazzCash';
        else if (rawMethod.includes('easy') || rawMethod.includes('paisa')) label = 'EasyPaisa';
        else if (rawMethod.includes('online') || rawMethod.includes('stripe') || rawMethod.includes('card')) label = 'Online / Card';
        else if (rawMethod.includes('cheque')) label = 'Cheque';

        const current = methodCounts.get(label) || { method: label, amount: 0, count: 0 };
        current.amount += (Number(p.amount) || 0);
        current.count += 1;
        methodCounts.set(label, current);
      });

      const paymentMethods = Array.from(methodCounts.values()).sort((a, b) => b.amount - a.amount);

      // Recent Transactions
      const recentTransactions = [...inRangeStudentPayments]
        .sort((a, b) => new Date(b.paid_date || 0) - new Date(a.paid_date || 0))
        .slice(0, 15)
        .map(p => ({
          id: p.id,
          studentName: p.studentName,
          course: p.course,
          batch: p.batch,
          amount: Number(p.amount || 0),
          method: p.method,
          paidDate: p.paid_date,
          referenceNumber: p.reference_number
        }));

      setReportData({
        filterSummary: {
          preset,
          startDate: rangeStart ? rangeStart.toISOString().slice(0, 10) : null,
          endDate: rangeEnd ? rangeEnd.toISOString().slice(0, 10) : null,
          course: selectedCourse,
          batch: selectedBatch
        },
        kpis: {
          grossTuitionBilled,
          totalCollectedRevenue,
          totalOutstandingReceivable,
          totalFacultyPayroll,
          totalReferralCommissions,
          totalOperatingExpenses,
          netOperatingIncome,
          profitMargin,
          collectionEfficiency,
          totalPaidTransactions,
          averageTransactionValue
        },
        courseBreakdown,
        batchBreakdown,
        monthlyTimeline,
        paymentMethods,
        recentTransactions,
        filterOptions: {
          courses: allCourses.map(c => c.title).filter(Boolean),
          batches: allBatches.map(b => b.batch_name).filter(Boolean)
        }
      });
    } catch (err) {
      console.error('Error in direct revenue aggregation:', err);
      toast.error('Could not aggregate revenue analytics: ' + (err.message || ''));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset, startDate, endDate, selectedCourse, selectedBatch]);

  useEffect(() => {
    fetchRevenueReport();
  }, [fetchRevenueReport]);

  const handleResetFilters = () => {
    setPreset('this_month');
    setStartDate('');
    setEndDate('');
    setSelectedCourse('all');
    setSelectedBatch('all');
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const dateLabel = PRESET_LABELS[preset] || 'Custom Window';
      const pdf = createRevenueStatementPdf({
        metrics: reportData,
        period: preset,
        datePresetLabel: dateLabel,
        courseFilter: selectedCourse,
        batchFilter: selectedBatch,
        generatedBy: user?.name || 'DeepSkills Directorate of Accounts'
      });

      const filename = `DeepSkills-Revenue-Statement-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      toast.success('Audited Revenue Statement PDF downloaded!');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('Failed to generate PDF statement: ' + (err.message || ''));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExportCsv = () => {
    try {
      const { kpis, courseBreakdown, monthlyTimeline } = reportData;

      let csv = 'DEEPSKILLS INSTITUTE - REVENUE & OPERATING STATEMENT REPORT\n';
      csv += `Generated On,${new Date().toLocaleString()}\n`;
      csv += `Scope Window,${PRESET_LABELS[preset] || preset}\n`;
      csv += `Course Scope,${selectedCourse}\n`;
      csv += `Batch Scope,${selectedBatch}\n\n`;

      csv += 'EXECUTIVE TELEMETRY SUMMARY\n';
      csv += `Gross Tuition Billed,PKR ${kpis.grossTuitionBilled || 0}\n`;
      csv += `Collected Inflow Revenue,PKR ${kpis.totalCollectedRevenue || 0}\n`;
      csv += `Outstanding Receivables,PKR ${kpis.totalOutstandingReceivable || 0}\n`;
      csv += `Faculty Payroll Expenses,PKR ${kpis.totalFacultyPayroll || 0}\n`;
      csv += `Referral Commission Outflows,PKR ${kpis.totalReferralCommissions || 0}\n`;
      csv += `Total Operating Expenses,PKR ${kpis.totalOperatingExpenses || 0}\n`;
      csv += `Net Operating Income,PKR ${kpis.netOperatingIncome || 0}\n`;
      csv += `Net Operating Margin,${kpis.profitMargin || 0}%\n`;
      csv += `Collection Efficiency,${kpis.collectionEfficiency || 0}%\n\n`;

      csv += 'COURSE-WISE FINANCIAL BREAKDOWN\n';
      csv += 'Course Name,Enrolled Students,Total Billed (PKR),Collected Revenue (PKR),Outstanding (PKR),Recovery Rate (%)\n';
      (courseBreakdown || []).forEach(c => {
        csv += `"${(c.courseTitle || '').replace(/"/g, '""')}",${c.enrolledStudents || 0},${c.totalBilled || 0},${c.collectedRevenue || 0},${c.outstandingFees || 0},${c.recoveryRate || 0}%\n`;
      });
      csv += '\n';

      csv += 'MONTHLY OPERATING PROGRESSION (P&L LEDGER)\n';
      csv += 'Month,Tuition Collections (+),Faculty Payroll (-),Referral Rewards (-),Total Outflows (-),Net Surplus / Margin (PKR)\n';
      (monthlyTimeline || []).forEach(m => {
        csv += `"${m.monthLabel || m.monthKey}",${m.tuitionRevenue || 0},${m.teacherPayroll || 0},${m.referralRewards || 0},${m.totalExpenses || 0},${m.netSurplus || 0}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `DeepSkills-Revenue-Report-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Revenue Report CSV exported successfully!');
    } catch (err) {
      console.error('CSV Export Error:', err);
      toast.error('Could not export CSV: ' + err.message);
    }
  };

  const kpis = reportData.kpis || {};
  const isSurplus = (kpis.netOperatingIncome || 0) >= 0;

  return (
    <AdminLayout>
      <Container>
        {/* Header */}
        <Header>
          <div className="titles">
            <h1>
              <FaChartBar style={{ color: '#f59e0b' }} />
              Revenue &amp; Operating Statement
              <span className="badge">Audited Ledger</span>
            </h1>
            <p>Institutional tuition recoveries, operational outflows, course financial contributions, and monthly P&amp;L progression.</p>
          </div>

          <div className="actions">
            <ActionBtn
              type="button"
              className="primary"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || loading}
            >
              <FaDownload /> {downloadingPdf ? 'Generating...' : 'Official Statement PDF'}
            </ActionBtn>

            <ActionBtn
              type="button"
              className="secondary"
              onClick={handleExportCsv}
              disabled={loading}
            >
              <FaFileCsv /> Export CSV
            </ActionBtn>

            <ActionBtn
              type="button"
              onClick={() => fetchRevenueReport(true)}
              disabled={refreshing || loading}
            >
              <FaSyncAlt className={refreshing ? 'spinner' : ''} /> Refresh
            </ActionBtn>
          </div>
        </Header>

        {/* Filter Card */}
        <FilterCard>
          <div className="top-row">
            <div className="presets-group">
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginRight: '4px' }}>
                <FaCalendarAlt style={{ marginRight: '6px' }} /> Period:
              </span>
              {Object.entries(PRESET_LABELS).map(([key, label]) => (
                <PresetPill
                  key={key}
                  type="button"
                  $active={preset === key}
                  onClick={() => setPreset(key)}
                >
                  {label}
                </PresetPill>
              ))}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FaUndo /> Reset Scope
            </button>
          </div>

          <div className="controls-row">
            {preset === 'custom' && (
              <>
                <InputGroup>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </InputGroup>
                <InputGroup>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </InputGroup>
              </>
            )}

            <InputGroup>
              <label>Academic Program</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">All Academic Programs</option>
                {(reportData.filterOptions?.courses || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </InputGroup>

            <InputGroup>
              <label>Batch Section</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="all">All Batch Sections</option>
                {(reportData.filterOptions?.batches || []).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </InputGroup>
          </div>
        </FilterCard>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <SkeletonCard count={6} height="120px" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <KpiGrid>
              {/* Card 1: Gross Tuition Billed */}
              <KpiCard
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                $border="rgba(56, 189, 248, 0.25)"
                $iconBg="rgba(56, 189, 248, 0.1)"
                $iconColor="#38bdf8"
              >
                <div className="head">
                  <div className="label">Gross Tuition Billed</div>
                  <div className="icon-box"><FaGraduationCap /></div>
                </div>
                <div className="value">PKR {Number(kpis.grossTuitionBilled || 0).toLocaleString()}</div>
                <div className="footer-sub">
                  Total fees contracted across fee plans
                </div>
              </KpiCard>

              {/* Card 2: Total Collected Inflows */}
              <KpiCard
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                $border="rgba(16, 185, 129, 0.25)"
                $iconBg="rgba(16, 185, 129, 0.1)"
                $iconColor="#10b981"
                $highlightColor="#10b981"
              >
                <div className="head">
                  <div className="label">Tuition Collections</div>
                  <div className="icon-box"><FaArrowUp /></div>
                </div>
                <div className="value" style={{ color: '#34d399' }}>
                  PKR {Number(kpis.totalCollectedRevenue || 0).toLocaleString()}
                </div>
                <div className="footer-sub">
                  <span className="highlight">{kpis.collectionEfficiency || 0}% Recovery</span> of total billed
                </div>
              </KpiCard>

              {/* Card 3: Total Operating Outflows */}
              <KpiCard
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                $border="rgba(239, 68, 68, 0.25)"
                $iconBg="rgba(239, 68, 68, 0.1)"
                $iconColor="#ef4444"
                $highlightColor="#ef4444"
              >
                <div className="head">
                  <div className="label">Operating Outflows</div>
                  <div className="icon-box"><FaArrowDown /></div>
                </div>
                <div className="value" style={{ color: '#f87171' }}>
                  PKR {Number(kpis.totalOperatingExpenses || 0).toLocaleString()}
                </div>
                <div className="footer-sub">
                  Salaries: <span style={{ color: '#fff', fontWeight: '600', marginLeft: '4px' }}>PKR {Number(kpis.totalFacultyPayroll || 0).toLocaleString()}</span>
                  <span style={{ margin: '0 4px' }}>•</span>
                  Ref: <span style={{ color: '#fff', fontWeight: '600', marginLeft: '4px' }}>PKR {Number(kpis.totalReferralCommissions || 0).toLocaleString()}</span>
                </div>
              </KpiCard>

              {/* Card 4: Net Operating Surplus */}
              <KpiCard
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                $border={isSurplus ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                $iconBg={isSurplus ? 'rgba(52, 211, 153, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
                $iconColor={isSurplus ? '#34d399' : '#f87171'}
                $highlightColor={isSurplus ? '#34d399' : '#f87171'}
              >
                <div className="head">
                  <div className="label">Net Operating Margin</div>
                  <div className="icon-box"><FaExchangeAlt /></div>
                </div>
                <div className="value" style={{ color: isSurplus ? '#34d399' : '#f87171' }}>
                  PKR {Number(kpis.netOperatingIncome || 0).toLocaleString()}
                </div>
                <div className="footer-sub">
                  <span className="highlight">{kpis.profitMargin || 0}% Margin</span> over collected tuition
                </div>
              </KpiCard>

              {/* Card 5: Outstanding Receivables */}
              <KpiCard
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                $border="rgba(245, 158, 11, 0.25)"
                $iconBg="rgba(245, 158, 11, 0.1)"
                $iconColor="#f59e0b"
                $highlightColor="#fbbf24"
              >
                <div className="head">
                  <div className="label">Outstanding Receivables</div>
                  <div className="icon-box"><FaCoins /></div>
                </div>
                <div className="value" style={{ color: '#fbbf24' }}>
                  PKR {Number(kpis.totalOutstandingReceivable || 0).toLocaleString()}
                </div>
                <div className="footer-sub">
                  Pending installment balances to recover
                </div>
              </KpiCard>

              {/* Card 6: Average Ticket Size */}
              <KpiCard
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                $border="rgba(168, 85, 247, 0.25)"
                $iconBg="rgba(168, 85, 247, 0.1)"
                $iconColor="#a855f7"
                $highlightColor="#c084fc"
              >
                <div className="head">
                  <div className="label">Avg Ticket Size</div>
                  <div className="icon-box"><FaWallet /></div>
                </div>
                <div className="value" style={{ color: '#c084fc' }}>
                  PKR {Number(kpis.averageTransactionValue || 0).toLocaleString()}
                </div>
                <div className="footer-sub">
                  Across <span className="highlight">{kpis.totalPaidTransactions || 0}</span> processed receipts
                </div>
              </KpiCard>
            </KpiGrid>

            {/* Visual Analytics */}
            <ChartsGrid>
              {/* Chart 1: Revenue vs Outflow Timeline */}
              <ChartCard>
                <div className="chart-head">
                  <h3>
                    <FaMoneyBillWave style={{ color: '#10b981' }} />
                    Monthly Financial Flow Progression (P&amp;L)
                  </h3>
                  <span className="badge">Chronological</span>
                </div>
                <div className="chart-body">
                  {reportData.monthlyTimeline?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={reportData.monthlyTimeline}
                        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorTuition" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorOutflows" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `Rs.${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                          formatter={(val) => `PKR ${Number(val).toLocaleString()}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="tuitionRevenue"
                          name="Tuition Collections (+)"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorTuition)"
                        />
                        <Area
                          type="monotone"
                          dataKey="totalExpenses"
                          name="Operating Outflows (-)"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorOutflows)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      No timeline data recorded for the selected scope.
                    </div>
                  )}
                </div>
              </ChartCard>

              {/* Chart 2: Payment Channels Breakdown */}
              <ChartCard>
                <div className="chart-head">
                  <h3>
                    <FaWallet style={{ color: '#38bdf8' }} />
                    Payment Channels
                  </h3>
                  <span className="badge">By Inflow</span>
                </div>
                <div className="chart-body">
                  {reportData.paymentMethods?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.paymentMethods}
                          dataKey="amount"
                          nameKey="method"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                        >
                          {reportData.paymentMethods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                          formatter={(val) => `PKR ${Number(val).toLocaleString()}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '6px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      No payment channel data available.
                    </div>
                  )}
                </div>
              </ChartCard>
            </ChartsGrid>

            {/* Granular Breakdown Section */}
            <TabNavigation>
              <button
                type="button"
                className={breakdownTab === 'courses' ? 'active' : ''}
                onClick={() => setBreakdownTab('courses')}
              >
                <FaGraduationCap /> Course Financial Performance ({reportData.courseBreakdown?.length || 0})
              </button>
              <button
                type="button"
                className={breakdownTab === 'batches' ? 'active' : ''}
                onClick={() => setBreakdownTab('batches')}
              >
                <FaLayerGroup /> Batch Section Breakdown ({reportData.batchBreakdown?.length || 0})
              </button>
              <button
                type="button"
                className={breakdownTab === 'monthly' ? 'active' : ''}
                onClick={() => setBreakdownTab('monthly')}
              >
                <FaCalendarAlt /> Monthly P&amp;L Ledger ({reportData.monthlyTimeline?.length || 0})
              </button>
              <button
                type="button"
                className={breakdownTab === 'recent' ? 'active' : ''}
                onClick={() => setBreakdownTab('recent')}
              >
                <FaCheckCircle /> Recent Inflow Transactions ({reportData.recentTransactions?.length || 0})
              </button>
            </TabNavigation>

            {/* Tab 1: Course Performance Table */}
            {breakdownTab === 'courses' && (
              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <th>Course / Program Title</th>
                      <th>Category</th>
                      <th>Active Batches</th>
                      <th>Enrolled Students</th>
                      <th>Billed Tuition</th>
                      <th>Collected Revenue</th>
                      <th>Outstanding</th>
                      <th>Recovery Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.courseBreakdown || []).map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{c.courseTitle}</td>
                        <td style={{ textTransform: 'capitalize', color: '#94a3b8' }}>{c.category}</td>
                        <td>{c.activeBatches} sections</td>
                        <td style={{ fontWeight: '600' }}>{c.enrolledStudents} students</td>
                        <td style={{ fontFamily: 'monospace' }}>PKR {Number(c.totalBilled || 0).toLocaleString()}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#10b981' }}>
                          PKR {Number(c.collectedRevenue || 0).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#f59e0b' }}>
                          PKR {Number(c.outstandingFees || 0).toLocaleString()}
                        </td>
                        <td style={{ minWidth: '140px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700' }}>
                            <span>{c.recoveryRate || 0}%</span>
                          </div>
                          <ProgressBar $percent={c.recoveryRate} $fillColor={c.recoveryRate >= 70 ? '#10b981' : c.recoveryRate >= 40 ? '#f59e0b' : '#ef4444'}>
                            <div className="fill" />
                          </ProgressBar>
                        </td>
                      </tr>
                    ))}
                    {reportData.courseBreakdown?.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No course financial records found for the selected scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </TableContainer>
            )}

            {/* Tab 2: Batch Performance Table */}
            {breakdownTab === 'batches' && (
              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <th>Batch Section</th>
                      <th>Parent Course</th>
                      <th>Section Status</th>
                      <th>Students</th>
                      <th>Total Billed</th>
                      <th>Collected Inflow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.batchBreakdown || []).map((b, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{b.batchName}</td>
                        <td style={{ color: '#94a3b8' }}>{b.courseTitle}</td>
                        <td>
                          <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', background: b.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: b.status === 'Active' ? '#10b981' : '#94a3b8' }}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600' }}>{b.studentCount} students</td>
                        <td style={{ fontFamily: 'monospace' }}>PKR {Number(b.totalBilled || 0).toLocaleString()}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#10b981' }}>
                          PKR {Number(b.collectedRevenue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {reportData.batchBreakdown?.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No batch sections found for the selected scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </TableContainer>
            )}

            {/* Tab 3: Monthly P&L Table */}
            {breakdownTab === 'monthly' && (
              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <th>Month Period</th>
                      <th>Tuition Inflows (+)</th>
                      <th>Faculty Payroll (-)</th>
                      <th>Referral Commissions (-)</th>
                      <th>Total Outflows (-)</th>
                      <th>Net Operating Surplus</th>
                      <th>Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.monthlyTimeline || []).map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{m.monthLabel || m.monthKey}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#10b981' }}>
                          PKR {Number(m.tuitionRevenue || 0).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#f87171' }}>
                          PKR {Number(m.teacherPayroll || 0).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#c084fc' }}>
                          PKR {Number(m.referralRewards || 0).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#ef4444' }}>
                          PKR {Number(m.totalExpenses || 0).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: (m.netSurplus || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                          PKR {Number(m.netSurplus || 0).toLocaleString()}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: (m.marginPct || 0) >= 50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: (m.marginPct || 0) >= 50 ? '#10b981' : '#f59e0b' }}>
                            {m.marginPct || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {reportData.monthlyTimeline?.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No monthly progression data recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </TableContainer>
            )}

            {/* Tab 4: Recent Inflow Receipts */}
            {breakdownTab === 'recent' && (
              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Course &amp; Batch</th>
                      <th>Amount Paid</th>
                      <th>Payment Channel</th>
                      <th>Payment Date</th>
                      <th>Reference Slip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.recentTransactions || []).map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{t.studentName}</td>
                        <td>
                          <span style={{ color: '#cbd5e1' }}>{t.course}</span>
                          <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b' }}>{t.batch}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#10b981' }}>
                          PKR {Number(t.amount || 0).toLocaleString()}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {t.method?.replace(/_/g, ' ') || 'Bank Transfer'}
                        </td>
                        <td style={{ color: '#94a3b8' }}>
                          {t.paidDate ? new Date(t.paidDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.78rem' }}>
                          {t.referenceNumber || '—'}
                        </td>
                      </tr>
                    ))}
                    {reportData.recentTransactions?.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No recent transactions found for the selected scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Container>
    </AdminLayout>
  );
};

export default RevenueReport;
