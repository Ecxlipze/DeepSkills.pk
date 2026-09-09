import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const auth = await authorizeAdminOperation(req, null);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  if (auth.role === 'custom') {
    const perm = auth.permissions?.finance;
    if (perm !== 'view' && perm !== 'full') {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to view finance reports.'
      });
    }
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  try {
    const {
      preset = 'this_month',
      startDate: queryStartDate,
      endDate: queryEndDate,
      course: courseFilter = 'all',
      batch: batchFilter = 'all'
    } = req.query;

    // Determine date boundary
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
    } else if (preset === 'custom' && queryStartDate && queryEndDate) {
      rangeStart = new Date(`${queryStartDate}T00:00:00`);
      rangeEnd = new Date(`${queryEndDate}T23:59:59.999`);
    }

    // Parallel fetch from database
    const [
      paymentsRes,
      teacherPaymentsRes,
      feePlansRes,
      admissionsRes,
      coursesRes,
      batchesRes
    ] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('teacher_payments').select('*'),
      supabase.from('fee_plans').select('*'),
      supabase.from('admissions').select('id, name, course, batch, cnic, phone, status, admission_date'),
      supabase.from('courses').select('id, title, fee, duration, category'),
      supabase.from('batches').select('id, batch_name, course, status, start_date, end_date')
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (teacherPaymentsRes.error) throw teacherPaymentsRes.error;
    if (feePlansRes.error) throw feePlansRes.error;

    const allPayments = paymentsRes.data || [];
    const allTeacherPayments = teacherPaymentsRes.data || [];
    const allFeePlans = feePlansRes.data || [];
    const allAdmissions = admissionsRes.data || [];
    const allCourses = coursesRes.data || [];
    const allBatches = batchesRes.data || [];

    // Map admissions for rapid O(1) lookup
    const studentMap = new Map();
    allAdmissions.forEach(stu => {
      studentMap.set(stu.id, stu);
      if (stu.cnic) studentMap.set(stu.cnic, stu);
    });

    // Map fee plans by student_id
    const feePlanMap = new Map();
    allFeePlans.forEach(plan => {
      if (plan.student_id) feePlanMap.set(plan.student_id, plan);
    });

    const isDateInRange = (dStr) => {
      if (!rangeStart || !rangeEnd) return true; // all_time
      if (!dStr) return false;
      const d = new Date(dStr);
      if (Number.isNaN(d.getTime())) return false;
      return d >= rangeStart && d <= rangeEnd;
    };

    // Classify payments
    const isReferralPayment = (p) => p.entity_type === 'referrer' || (p.description && p.description.startsWith('Referral Reward'));
    const isTeacherPayment = (p) => !isReferralPayment(p) && p.entity_type === 'teacher';
    const isStudentPayment = (p) => !isReferralPayment(p) && p.entity_type !== 'teacher';

    // 1. Process Student Inflows
    const inRangeStudentPayments = [];
    const allPaidStudentPayments = [];

    allPayments.forEach(p => {
      if (!isStudentPayment(p) || p.status !== 'paid') return;
      allPaidStudentPayments.push(p);

      const stu = studentMap.get(p.entity_id);
      const plan = feePlanMap.get(p.entity_id);
      const studentCourse = stu?.course || plan?.course || 'Unknown';
      const studentBatch = stu?.batch || plan?.batch || 'Unknown';

      // Course & batch filters
      if (courseFilter !== 'all' && studentCourse !== courseFilter) return;
      if (batchFilter !== 'all' && studentBatch !== batchFilter) return;

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

    // 2. Process Teacher Payroll Outflows
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

    // Also include legacy teacher payments from payments table
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

    // 3. Process Referral Commission Outflows
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

    // Aggregate Executive Telemetry
    const totalCollectedRevenue = inRangeStudentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalFacultyPayroll = inRangeTeacherPayments.reduce((sum, tp) => sum + (Number(tp.amount) || 0), 0);
    const totalReferralCommissions = inRangeReferralPayments.reduce((sum, rp) => sum + (Number(rp.amount) || 0), 0);
    const totalOperatingExpenses = totalFacultyPayroll + totalReferralCommissions;
    const netOperatingIncome = totalCollectedRevenue - totalOperatingExpenses;
    const profitMargin = totalCollectedRevenue > 0
      ? Math.round((netOperatingIncome / totalCollectedRevenue) * 100)
      : 0;

    // Outstanding Receivables calculation
    let grossTuitionBilled = 0;
    let totalOutstandingReceivable = 0;

    allFeePlans.forEach(plan => {
      const studentCourse = plan.course || studentMap.get(plan.student_id)?.course || 'Unknown';
      const studentBatch = plan.batch || studentMap.get(plan.student_id)?.batch || 'Unknown';

      if (courseFilter !== 'all' && studentCourse !== courseFilter) return;
      if (batchFilter !== 'all' && studentBatch !== batchFilter) return;

      const billed = plan.final_fee != null ? Number(plan.final_fee) : Number(plan.total_fee || 0);
      grossTuitionBilled += billed;

      // Paid for this student across all time
      const studentPaid = allPaidStudentPayments
        .filter(p => p.entity_id === plan.student_id)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const rem = Math.max(0, billed - studentPaid);
      totalOutstandingReceivable += rem;
    });

    const totalReceivablePool = totalCollectedRevenue + totalOutstandingReceivable;
    const collectionEfficiency = totalReceivablePool > 0
      ? Math.round((totalCollectedRevenue / totalReceivablePool) * 100)
      : 0;

    const totalPaidTransactions = inRangeStudentPayments.length;
    const averageTransactionValue = totalPaidTransactions > 0
      ? Math.round(totalCollectedRevenue / totalPaidTransactions)
      : 0;

    // 4. Course-Wise Financial Performance Breakdown
    const courseStatsMap = new Map();
    // Pre-populate with all known courses
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

    // Count batches per course
    allBatches.forEach(b => {
      const courseName = b.course;
      if (courseStatsMap.has(courseName)) {
        courseStatsMap.get(courseName).activeBatches += 1;
      }
    });

    // Add admissions & billed
    allFeePlans.forEach(plan => {
      const courseName = plan.course || studentMap.get(plan.student_id)?.course || 'Other';
      if (!courseStatsMap.has(courseName)) {
        courseStatsMap.set(courseName, {
          courseTitle: courseName,
          category: 'Vocational',
          baseFee: 0,
          enrolledStudents: 0,
          totalBilled: 0,
          collectedRevenue: 0,
          outstandingFees: 0,
          activeBatches: 0
        });
      }
      const cStat = courseStatsMap.get(courseName);
      cStat.enrolledStudents += 1;
      const billed = plan.final_fee != null ? Number(plan.final_fee) : Number(plan.total_fee || 0);
      cStat.totalBilled += billed;

      // Student paid all time
      const studentPaid = allPaidStudentPayments
        .filter(p => p.entity_id === plan.student_id)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      cStat.outstandingFees += Math.max(0, billed - studentPaid);
    });

    // Add in-range collections per course
    inRangeStudentPayments.forEach(p => {
      const courseName = p.course || 'Other';
      if (courseStatsMap.has(courseName)) {
        courseStatsMap.get(courseName).collectedRevenue += (Number(p.amount) || 0);
      }
    });

    const courseBreakdown = Array.from(courseStatsMap.values())
      .filter(c => c.enrolledStudents > 0 || c.collectedRevenue > 0)
      .map(c => ({
        ...c,
        recoveryRate: c.totalBilled > 0 ? Math.min(100, Math.round((c.collectedRevenue / c.totalBilled) * 100)) : 0
      }))
      .sort((a, b) => b.collectedRevenue - a.collectedRevenue);

    // 5. Batch-Wise Financial Performance Breakdown
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

    // 6. Monthly Operating P&L Ledger (Chronological Progression)
    const monthlyLedgerMap = new Map();

    const getMonthKey = (dateStr) => {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    const getMonthLabel = (monthKey) => {
      const [y, m] = monthKey.split('-');
      const date = new Date(Number(y), Number(m) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Aggregate student payments by month
    inRangeStudentPayments.forEach(p => {
      const key = getMonthKey(p.paid_date || p.created_at);
      if (!key) return;
      if (!monthlyLedgerMap.has(key)) {
        monthlyLedgerMap.set(key, { monthKey: key, monthLabel: getMonthLabel(key), tuitionRevenue: 0, teacherPayroll: 0, referralRewards: 0 });
      }
      monthlyLedgerMap.get(key).tuitionRevenue += (Number(p.amount) || 0);
    });

    // Aggregate teacher disbursements by month
    inRangeTeacherPayments.forEach(tp => {
      const key = getMonthKey(tp.paid_date);
      if (!key) return;
      if (!monthlyLedgerMap.has(key)) {
        monthlyLedgerMap.set(key, { monthKey: key, monthLabel: getMonthLabel(key), tuitionRevenue: 0, teacherPayroll: 0, referralRewards: 0 });
      }
      monthlyLedgerMap.get(key).teacherPayroll += (Number(tp.amount) || 0);
    });

    // Aggregate referral rewards by month
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
        return {
          ...m,
          totalExpenses,
          netSurplus,
          marginPct
        };
      });

    // 7. Payment Methods Breakdown
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

    const paymentMethods = Array.from(methodCounts.values())
      .sort((a, b) => b.amount - a.amount);

    // 8. Recent High-Value Transactions
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

    return res.status(200).json({
      status: 'success',
      data: {
        filterSummary: {
          preset,
          startDate: rangeStart ? rangeStart.toISOString().slice(0, 10) : null,
          endDate: rangeEnd ? rangeEnd.toISOString().slice(0, 10) : null,
          course: courseFilter,
          batch: batchFilter
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
      }
    });

  } catch (error) {
    console.error('Revenue Report API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error processing revenue report.'
    });
  }
}
