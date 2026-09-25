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
      .select('id, status, name, course, batch')
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

    // ── Handle Payment Proof Submission ──
    if (data.action === 'submit_proof') {
      const { payment_id, reference_number, method, amount, notes, paid_date } = data;
      if (!payment_id) {
        return res.status(400).json({ status: 'error', message: 'Payment voucher ID is required.' });
      }

      const updatePayload = {
        status: 'pending',
        method: method || 'bank_transfer',
        reference_number: reference_number ? String(reference_number).trim() : null,
        paid_date: paid_date || new Date().toISOString().slice(0, 10),
        notes: notes ? `Proof: ${notes} (Ref: ${reference_number || 'N/A'})` : `Proof Ref: ${reference_number || 'N/A'}`
      };
      if (amount && Number(amount) > 0) {
        updatePayload.amount = Number(amount);
      }

      const { data: updatedPayment, error: updateErr } = await supabase
        .from('payments')
        .update(updatePayload)
        .eq('id', payment_id)
        .eq('entity_id', student.id)
        .select()
        .single();

      if (updateErr) {
        console.error('[student/finance] Proof update error:', updateErr);
        return res.status(500).json({ status: 'error', message: 'Failed to record payment proof.' });
      }

      // Notify administration and finance officer
      try {
        const { notifyAdmins } = await import('../../../src/utils/notifications');
        await notifyAdmins({
          type: 'fee_proof_submitted',
          title: 'Fee Payment Proof Submitted',
          message: `${student.name || 'Student'} submitted payment proof (Ref: ${reference_number || 'N/A'}) for ${student.course || 'course'}`,
          link: '/staff/fees'
        });
      } catch (nErr) {
        console.warn('[student/finance] Notification warning:', nErr);
      }

      return res.status(200).json({
        status: 'success',
        message: 'Payment proof submitted successfully! The Finance Office will verify your transaction shortly.',
        data: updatedPayment
      });
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
