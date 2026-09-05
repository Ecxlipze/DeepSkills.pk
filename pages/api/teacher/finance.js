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

    const { data: salaryRows } = await supabase
      .from('teacher_salaries')
      .select('*')
      .eq('teacher_id', teacher.id)
      .limit(1);

    const salary = salaryRows?.[0];

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('entity_id', teacher.id)
      .eq('entity_type', 'teacher')
      .order('paid_date', { ascending: false });

    const paymentList = payments || [];
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    let isPaidThisMonth = false;

    for (const payment of paymentList) {
      if (payment.status === 'paid' && String(payment.description || '').includes(currentMonth)) {
        isPaidThisMonth = true;
        break;
      }
    }

    const lastPayment = paymentList[0] || null;

    return res.status(200).json({
      status: 'success',
      data: {
        monthlyAmount: salary?.monthly_amount || 0,
        status: isPaidThisMonth ? 'Paid' : 'Pending',
        lastPaymentDate: lastPayment?.paid_date || 'N/A',
        history: paymentList
      }
    });
  } catch (err) {
    console.error('[teacher/finance] Unexpected error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to retrieve teacher payroll.' });
  }
}
