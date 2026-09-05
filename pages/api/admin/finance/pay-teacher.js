import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const auth = await authorizeAdminOperation(req, 'finance');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const body = req.body || {};
  const teacherId = String(body.teacherId || body.teacher_id || '').trim();
  const rawAmount = body.amount;
  const month = String(body.month || '').trim();
  let paidDate = String(body.paidDate || body.paid_on || '').trim();
  const rawMethod = String(body.method || 'cash').trim().toLowerCase().replace(/\s+/g, '_');
  const reference = body.reference ? String(body.reference).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  // 1. Validate Teacher UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!teacherId || !uuidRegex.test(teacherId)) {
    return res.status(400).json({ status: 'error', message: 'Valid Teacher ID is required.' });
  }

  const { data: teacher, error: teacherErr } = await supabase
    .from('teachers')
    .select('id, name')
    .eq('id', teacherId)
    .maybeSingle();

  if (teacherErr || !teacher) {
    return res.status(404).json({ status: 'error', message: 'Teacher not found.' });
  }

  // 2. Validate Amount
  const numAmount = Number(rawAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ status: 'error', message: 'Payment amount must be greater than 0.' });
  }

  // 3. Validate Month (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!month || !monthRegex.test(month)) {
    return res.status(400).json({ status: 'error', message: 'Invalid month format. Expected YYYY-MM.' });
  }

  // 4. Validate Paid Date (YYYY-MM-DD)
  if (!paidDate) {
    paidDate = new Date().toISOString().split('T')[0];
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(paidDate)) {
    return res.status(400).json({ status: 'error', message: 'Invalid payment date format. Expected YYYY-MM-DD.' });
  }

  // 5. Normalize Method
  const methodMap = {
    cash: 'cash',
    bank_transfer: 'bank_transfer',
    online: 'online',
    cheque: 'cheque',
    check: 'cheque'
  };
  const cleanMethod = methodMap[rawMethod] || 'cash';

  try {
    // 6. Enforce Duplicate Protection
    const { data: existingPayment, error: checkErr } = await supabase
      .from('teacher_payments')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('month', month)
      .maybeSingle();

    if (checkErr) {
      return res.status(500).json({ status: 'error', message: checkErr.message });
    }

    if (existingPayment) {
      return res.status(409).json({
        status: 'error',
        message: `Salary for ${month} has already been recorded for ${teacher.name || 'this teacher'}.`
      });
    }

    // 7. Insert Record into teacher_payments
    const { data: insertedRecord, error: insertErr } = await supabase
      .from('teacher_payments')
      .insert({
        teacher_id: teacherId,
        amount: numAmount,
        month,
        paid_on: paidDate,
        method: cleanMethod,
        reference,
        notes,
        status: 'Paid'
      })
      .select()
      .single();

    if (insertErr) {
      return res.status(500).json({ status: 'error', message: insertErr.message || 'Failed to record salary payment.' });
    }

    return res.status(200).json({
      status: 'success',
      message: `Salary paid successfully for ${teacher.name || 'teacher'}!`,
      data: insertedRecord
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || 'An unexpected error occurred.' });
  }
}
