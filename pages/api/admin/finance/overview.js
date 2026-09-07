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
        message: 'Insufficient permissions to view finance data.'
      });
    }
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  try {
    // 1. Fetch Stats
    const { data: allPayments } = await supabase.from('payments').select('amount, status, entity_type');
    const { data: allTeacherPayments } = await supabase.from('teacher_payments').select('amount, status');

    let revenue = 0;
    let outstanding = 0;
    let salaries = 0;

    allPayments?.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.entity_type === 'student') {
        if (p.status === 'paid') revenue += amt;
        else outstanding += amt;
      } else if (p.entity_type === 'teacher' && p.status === 'paid') {
        salaries += amt;
      }
    });

    allTeacherPayments?.forEach(tp => {
      if (tp.status?.toLowerCase() === 'paid') {
        salaries += Number(tp.amount || 0);
      }
    });

    const stats = {
      totalRevenue: revenue,
      outstandingFees: outstanding,
      teacherSalaries: salaries,
      netBalance: revenue - salaries
    };

    // 2. Fetch Student Fees (Joined with Admissions)
    const { data: fees } = await supabase
      .from('fee_plans')
      .select('*, student:admissions(name, cnic, status, phone, email)');

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('entity_type', 'student');

    const processedFees = (fees || []).map(plan => {
      const planPayments = payments?.filter(p => p.entity_id === plan.student_id) || [];
      const paid = planPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const payable = plan.final_fee != null ? Number(plan.final_fee) : Number(plan.total_fee || 0);

      let status = 'Pending';
      if (paid >= payable) status = 'Paid';
      else if (paid > 0) status = 'Partial';

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

    // 3. Fetch Teachers (Joined with Salaries and HR Profiles)
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, name, specialization, cnic, phone, email, status, salary_config:teacher_salaries(monthly_amount), hr_profile:hr_profiles(expected_salary)');

    const { data: directTPayments } = await supabase.from('teacher_payments').select('*');
    const { data: legacyTeacherPayments } = await supabase.from('payments').select('*').eq('entity_type', 'teacher');

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const processedTeachers = (teachers || []).map(t => {
      const rawSal = Array.isArray(t.salary_config) ? t.salary_config[0] : t.salary_config;
      const rawHr = Array.isArray(t.hr_profile) ? t.hr_profile[0] : t.hr_profile;
      const monthly = rawSal?.monthly_amount != null && Number(rawSal.monthly_amount) > 0
        ? Number(rawSal.monthly_amount)
        : (rawHr?.expected_salary != null && Number(rawHr.expected_salary) > 0
          ? Number(rawHr.expected_salary)
          : 0);

      const directPay = directTPayments?.filter(p => p.teacher_id === t.id) || [];
      const legacyPay = (legacyTeacherPayments?.filter(p => p.entity_id === t.id) || []).map(lp => ({
        id: lp.id,
        amount: lp.amount,
        month: lp.paid_date ? lp.paid_date.slice(0, 7) : null,
        paid_on: lp.paid_date,
        method: lp.method || 'cash',
        reference: lp.reference_number,
        notes: lp.notes || lp.description,
        status: lp.status === 'paid' ? 'Paid' : 'Pending'
      }));

      const combinedHistory = [...directPay, ...legacyPay].sort((a, b) => new Date(b.paid_on || 0) - new Date(a.paid_on || 0));

      const allPaidDates = combinedHistory
        .map(p => p.paid_on)
        .filter(Boolean);
      const lastPaid = allPaidDates.length > 0 ? allPaidDates[0] : 'Never';

      const paidThisMonth = combinedHistory.some(
        p => (p.month === currentMonth || (p.paid_on && p.paid_on.startsWith(currentMonth))) && p.status?.toLowerCase() === 'paid'
      );

      return {
        ...t,
        monthlySalary: Number(monthly) || 0,
        status: paidThisMonth ? 'Paid' : 'Pending',
        lastPaid,
        paymentHistory: combinedHistory
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        stats,
        studentFees: processedFees,
        teacherSalaries: processedTeachers
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch finance overview.'
    });
  }
}
