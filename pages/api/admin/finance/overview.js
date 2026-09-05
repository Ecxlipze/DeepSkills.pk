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
      .select('*, student:admissions(name, cnic, status)');

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

    // 3. Fetch Teachers (Joined with Salaries)
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, name, specialization, salary_config:teacher_salaries(monthly_amount)');

    const { data: directTPayments } = await supabase.from('teacher_payments').select('*');

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const processedTeachers = (teachers || []).map(t => {
      const monthly = t.salary_config?.[0]?.monthly_amount || 0;
      const directPay = directTPayments?.filter(p => p.teacher_id === t.id) || [];

      const allPaidDates = directPay
        .map(p => p.paid_on)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a));
      const lastPaid = allPaidDates.length > 0 ? allPaidDates[0] : 'Never';

      const paidThisMonth = directPay.some(
        p => p.month === currentMonth && p.status?.toLowerCase() === 'paid'
      );

      return {
        ...t,
        monthlySalary: Number(monthly) || 0,
        status: paidThisMonth ? 'Paid' : 'Pending',
        lastPaid,
        paymentHistory: directPay
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
