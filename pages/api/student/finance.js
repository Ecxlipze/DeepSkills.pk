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
    const sessionRes = await validatePortalSession(supabase, token, ['student'], requestedCnic);
    if (!sessionRes.ok) {
      return res.status(sessionRes.status).json({
        status: 'error',
        code: sessionRes.code,
        message: sessionRes.message
      });
    }

    const cnic = sessionRes.session.cnic;

    const { data: studentRows, error: studentErr } = await supabase
      .from('admissions')
      .select('id, status')
      .eq('cnic', cnic)
      .in('status', ['Active', 'Graduated'])
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (studentErr) {
      console.error('[student/finance] Student lookup error:', studentErr);
      return res.status(500).json({ status: 'error', message: 'Failed to look up student admission.' });
    }

    const student = studentRows?.[0];
    if (!student) {
      return res.status(403).json({ status: 'error', message: 'Active student admission not found.' });
    }

    const { data: planRows, error: planErr } = await supabase
      .from('fee_plans')
      .select('*')
      .eq('student_id', student.id)
      .limit(1);

    if (planErr) {
      console.error('[student/finance] Fee plan error:', planErr);
      return res.status(500).json({ status: 'error', message: 'Failed to look up fee plan.' });
    }

    const plan = planRows?.[0] || null;
    if (!plan) {
      return res.status(200).json({ status: 'success', data: null });
    }

    const { data: payments, error: paymentsErr } = await supabase
      .from('payments')
      .select('*')
      .eq('entity_id', student.id)
      .eq('entity_type', 'student')
      .order('installment_number', { ascending: true });

    if (paymentsErr) {
      console.error('[student/finance] Payments lookup error:', paymentsErr);
      return res.status(500).json({ status: 'error', message: 'Failed to look up payment history.' });
    }

    const paymentList = payments || [];
    let paidAmount = 0;
    for (const payment of paymentList) {
      if (payment.status === 'paid') {
        paidAmount += parseFloat(payment.amount || 0);
      }
    }

    const payableAmount = plan.final_fee !== null && plan.final_fee !== undefined
      ? parseFloat(plan.final_fee)
      : parseFloat(plan.total_fee || 0);

    plan.payableAmount = payableAmount;
    plan.paidAmount = paidAmount;
    plan.remainingAmount = Math.max(0, payableAmount - paidAmount);
    plan.installments = paymentList;

    // Attach institutional payment gateway details & policy notes
    try {
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'fee_settings')
        .maybeSingle();

      if (settingsRow?.value) {
        const parsed = typeof settingsRow.value === 'string' ? JSON.parse(settingsRow.value) : settingsRow.value;
        plan.paymentGateways = parsed.paymentGateways || null;
        plan.invoiceNotes = parsed.general?.invoiceNotes || null;
      }
    } catch (sErr) {
      console.warn('[student/finance] Fee settings fetch warning:', sErr);
    }

    return res.status(200).json({
      status: 'success',
      data: plan
    });
  } catch (err) {
    console.error('[student/finance] Unexpected error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to retrieve financial records.' });
  }
}
