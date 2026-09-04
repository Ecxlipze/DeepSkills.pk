import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Supabase server configuration is missing.' });
  }

  const { payload } = req.body || {};
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ status: 'error', message: 'Enrollment payload is required.' });
  }

  // Normalize payment plan to 'full' or 'installment'
  const rawPlan = String(payload.paymentPlan || '').trim().toLowerCase();
  const isFullPlan = rawPlan === 'full' || rawPlan === 'one-time' || rawPlan === '1';
  payload.paymentPlan = isFullPlan ? 'full' : 'installment';
  payload.installmentCount = isFullPlan ? 1 : (Number(payload.installmentCount) || (Number(rawPlan) > 1 ? Number(rawPlan) : 1));

  // Normalize payment method
  const rawMethod = String(payload.firstPaymentMethod || 'cash').trim().toLowerCase().replace(/\s+/g, '_');
  const validMethods = ['cash', 'bank_transfer', 'online', 'cheque'];
  payload.firstPaymentMethod = validMethods.includes(rawMethod) ? rawMethod : (rawMethod === 'check' ? 'cheque' : 'cash');

  // Validate and sanitize numeric fees to strictly prevent negative numbers
  const totalFee = Math.max(0, parseInt(payload.totalFee, 10) || 0);
  const discountAmount = Math.max(0, parseInt(payload.discountAmount, 10) || 0);
  if (totalFee <= 0) {
    return res.status(400).json({ status: 'error', message: 'Total fee must be greater than 0.' });
  }
  if (discountAmount > totalFee) {
    return res.status(400).json({ status: 'error', message: 'Discount cannot exceed total fee.' });
  }
  const finalFee = Math.max(0, totalFee - discountAmount);
  const firstPayment = Math.max(0, parseInt(payload.firstPayment, 10) || 0);
  if (firstPayment > finalFee) {
    return res.status(400).json({ status: 'error', message: 'First payment cannot exceed final fee.' });
  }

  payload.totalFee = totalFee;
  payload.discountAmount = discountAmount;
  payload.finalFee = finalFee;
  payload.firstPayment = firstPayment;

  try {
    const { data, error } = await supabase.rpc('enroll_counsellor_student', { payload });

    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }

    if (data && data.ok === false) {
      return res.status(400).json({ status: 'error', message: data.message || 'Enrollment failed.' });
    }

    return res.status(200).json(data || { ok: true });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });
  }
}
