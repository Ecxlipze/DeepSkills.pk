import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { normalizeCnic, validatePortalSession } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const authHeader = req.headers.authorization || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const data = req.body || {};
  if (!token && data.token) {
    token = String(data.token).trim();
  }

  const requestedCnic = data.cnic ? normalizeCnic(data.cnic) : null;

  try {
    const sessionRes = await validatePortalSession(supabase, token, ['teacher'], requestedCnic);
    if (!sessionRes.ok) {
      return res.status(sessionRes.status).json({
        status: 'error',
        code: sessionRes.code,
        message: sessionRes.message
      });
    }

    const cnic = sessionRes.session.cnic;

    const { data: teacherRows, error: teacherErr } = await supabase
      .from('teachers')
      .select('id, status')
      .eq('cnic', cnic)
      .limit(1);

    if (teacherErr) {
      console.error('[teacher/finance] Teacher lookup error:', teacherErr);
      return res.status(500).json({ status: 'error', message: 'Failed to look up teacher record.' });
    }

    const teacher = teacherRows?.[0];
    if (!teacher || teacher.status !== 'Active') {
      return res.status(403).json({ status: 'error', message: 'Active teacher profile not found.' });
    }

    // 1. Fetch Salary Config (check teacher_salaries first, then hr_profiles expected_salary)
    const [salRes, hrRes] = await Promise.all([
      supabase.from('teacher_salaries').select('*').eq('teacher_id', teacher.id).maybeSingle(),
      supabase.from('hr_profiles').select('expected_salary').eq('teacher_id', teacher.id).maybeSingle()
    ]);

    let monthlyAmount = 0;
    if (salRes.data?.monthly_amount != null && Number(salRes.data.monthly_amount) > 0) {
      monthlyAmount = Number(salRes.data.monthly_amount);
    } else if (hrRes.data?.expected_salary != null && Number(hrRes.data.expected_salary) > 0) {
      monthlyAmount = Number(hrRes.data.expected_salary);
    }

    // 2. Fetch Payments from both teacher_payments (Finance manager) and payments (legacy/profile)
    const [tpRes, pRes] = await Promise.all([
      supabase.from('teacher_payments').select('*').eq('teacher_id', teacher.id).order('paid_on', { ascending: false }),
      supabase.from('payments').select('*').eq('entity_id', teacher.id).eq('entity_type', 'teacher').order('paid_date', { ascending: false })
    ]);

    const teacherPayments = (tpRes.data || []).map(tp => ({
      id: tp.id,
      description: tp.month_year ? `Monthly Salary (${tp.month_year})` : (tp.notes || 'Monthly Salary'),
      amount: Number(tp.amount || 0),
      paid_date: tp.paid_on || (tp.created_at ? tp.created_at.split('T')[0] : 'N/A'),
      method: tp.payment_method || 'bank_transfer',
      reference_number: tp.notes || 'Disbursed',
      status: 'paid',
      month_year: tp.month_year || null
    }));

    const legacyPayments = (pRes.data || []).map(p => ({
      id: p.id,
      description: p.description || 'Monthly Salary',
      amount: Number(p.amount || 0),
      paid_date: p.paid_date || (p.created_at ? p.created_at.split('T')[0] : 'N/A'),
      method: p.method || 'bank_transfer',
      reference_number: p.reference_number || null,
      status: p.status || 'paid',
      month_year: null
    }));

    // Merge and deduplicate by ID, then sort by paid_date descending
    const seenIds = new Set();
    const combinedHistory = [];
    for (const p of [...teacherPayments, ...legacyPayments]) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        combinedHistory.push(p);
      }
    }

    combinedHistory.sort((a, b) => {
      const dateA = new Date(a.paid_date || 0).getTime();
      const dateB = new Date(b.paid_date || 0).getTime();
      return dateB - dateA;
    });

    // Determine current month disbursement status
    const now = new Date();
    const currentMonthIso = now.toISOString().slice(0, 7); // e.g. "2026-09"
    const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' }); // e.g. "September 2026"

    let isPaidThisMonth = false;
    for (const payment of combinedHistory) {
      if (payment.status === 'paid') {
        const isMatchingMonthYear = payment.month_year && payment.month_year === currentMonthIso;
        const isMatchingDate = payment.paid_date && payment.paid_date.startsWith(currentMonthIso);
        const isMatchingDesc = payment.description && payment.description.includes(currentMonthName);
        if (isMatchingMonthYear || isMatchingDate || isMatchingDesc) {
          isPaidThisMonth = true;
          break;
        }
      }
    }

    const lastPayment = combinedHistory[0] || null;

    return res.status(200).json({
      status: 'success',
      data: {
        monthlyAmount,
        status: isPaidThisMonth ? 'Paid' : 'Pending',
        lastPaymentDate: lastPayment?.paid_date || 'N/A',
        history: combinedHistory
      }
    });
  } catch (err) {
    console.error('[teacher/finance] Unexpected error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to retrieve teacher payroll.' });
  }
}
