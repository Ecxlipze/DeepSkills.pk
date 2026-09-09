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
        message: 'Insufficient permissions to view finance transactions.'
      });
    }
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  try {
    // 1. Fetch Student & General Payments
    const { data: allPayments, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'paid')
      .order('paid_date', { ascending: false });

    if (payErr) {
      return res.status(500).json({ status: 'error', message: payErr.message });
    }

    // 2. Fetch Teacher Salary Disbursements
    const { data: teacherPayments, error: salErr } = await supabase
      .from('teacher_payments')
      .select('*')
      .order('paid_on', { ascending: false });

    if (salErr) {
      return res.status(500).json({ status: 'error', message: salErr.message });
    }

    // Separate student payments, teacher payments, and referral reward outflows
    const isReferralPayment = (p) => p.entity_type === 'referrer' || (p.description && p.description.startsWith('Referral Reward'));
    const referralPayments = (allPayments || []).filter(isReferralPayment);
    const legacyTeacherPayments = (allPayments || []).filter(p => !isReferralPayment(p) && p.entity_type === 'teacher');
    const feePayments = (allPayments || []).filter(p => !isReferralPayment(p) && p.entity_type !== 'teacher');

    // Collect IDs for counterparty lookups
    const studentIds = [...new Set([
      ...feePayments.map(p => p.entity_id),
      ...referralPayments.map(p => p.entity_id)
    ].filter(Boolean))];

    const studentMap = {};
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('admissions')
        .select('id, name, course, batch, cnic, phone')
        .in('id', studentIds);
      (students || []).forEach(s => { studentMap[s.id] = s; });
    }

    const teacherIds = [
      ...new Set([
        ...(teacherPayments || []).map(tp => tp.teacher_id),
        ...legacyTeacherPayments.map(p => p.entity_id),
        ...referralPayments.map(p => p.entity_id)
      ].filter(Boolean))
    ];
    const teacherMap = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, name, specialization, cnic, phone, email')
        .in('id', teacherIds);
      (teachers || []).forEach(t => { teacherMap[t.id] = t; });
    }

    // 3. Normalize Student Inflows
    const studentRows = feePayments.map(p => {
      const student = studentMap[p.entity_id] || {};
      const studentName = student.name || 'Enrolled Student';
      return {
        id: p.id,
        paid_date: p.paid_date || (p.created_at ? p.created_at.split('T')[0] : ''),
        entity_type: 'student',
        flow: 'inflow',
        entity_id: p.entity_id,
        person_name: studentName,
        person_cnic: student.cnic || '',
        person_phone: student.phone || '',
        program_name: student.course || 'Vocational Training',
        batch_name: student.batch || '',
        teacher_name: '',
        description: p.description || `Tuition Payment - ${studentName}`,
        method: p.method || 'cash',
        amount: Number(p.amount) || 0,
        reference_number: p.reference_number || '—',
        notes: p.notes || '',
        status: p.status || 'paid'
      };
    });

    // 4. Normalize Faculty Outflows (combining teacher_payments with legacy payments deduplicated)
    const seenTeacherPaymentIds = new Set();
    const salaryRows = [];

    (teacherPayments || [])
      .filter(tp => (tp.status || '').toLowerCase() === 'paid')
      .forEach(tp => {
        seenTeacherPaymentIds.add(tp.id);
        const teacher = teacherMap[tp.teacher_id] || {};
        const teacherName = teacher.name || 'Faculty Member';
        const month = tp.month || tp.month_year || '';
        salaryRows.push({
          id: tp.id,
          paid_date: tp.paid_on || (tp.created_at ? tp.created_at.split('T')[0] : ''),
          entity_type: 'teacher',
          flow: 'outflow',
          entity_id: tp.teacher_id,
          person_name: teacherName,
          person_cnic: teacher.cnic || '',
          person_phone: teacher.phone || '',
          program_name: teacher.specialization || 'Instruction',
          batch_name: '',
          teacher_name: teacherName,
          month,
          description: month ? `Salary - ${teacherName} (${month})` : (tp.notes || `Salary - ${teacherName}`),
          method: tp.method || tp.payment_method || 'bank_transfer',
          amount: Number(tp.amount) || 0,
          reference_number: tp.reference || tp.notes || '—',
          notes: tp.notes || '',
          status: tp.status || 'Paid'
        });
      });

    legacyTeacherPayments.forEach(lp => {
      if (seenTeacherPaymentIds.has(lp.id)) return;
      seenTeacherPaymentIds.add(lp.id);
      const teacher = teacherMap[lp.entity_id] || {};
      const teacherName = teacher.name || 'Faculty Member';
      salaryRows.push({
        id: lp.id,
        paid_date: lp.paid_date || (lp.created_at ? lp.created_at.split('T')[0] : ''),
        entity_type: 'teacher',
        flow: 'outflow',
        entity_id: lp.entity_id,
        person_name: teacherName,
        person_cnic: teacher.cnic || '',
        person_phone: teacher.phone || '',
        program_name: teacher.specialization || 'Instruction',
        batch_name: '',
        teacher_name: teacherName,
        month: '',
        description: lp.description || `Salary - ${teacherName}`,
        method: lp.method || 'bank_transfer',
        amount: Number(lp.amount) || 0,
        reference_number: lp.reference_number || '—',
        notes: lp.notes || '',
        status: lp.status || 'paid'
      });
    });

    // 5. Normalize Referral Reward Outflows
    const referralRows = referralPayments.map(rp => {
      const isTeacher = teacherMap[rp.entity_id];
      const referrer = isTeacher || studentMap[rp.entity_id] || {};
      const referrerName = referrer.name || 'Referral Partner';
      return {
        id: rp.id,
        paid_date: rp.paid_date || (rp.created_at ? rp.created_at.split('T')[0] : ''),
        entity_type: isTeacher ? 'teacher' : 'student',
        flow: 'outflow',
        entity_id: rp.entity_id,
        person_name: referrerName,
        person_cnic: referrer.cnic || '',
        person_phone: referrer.phone || '',
        program_name: 'Referral Commission Reward',
        batch_name: '',
        teacher_name: isTeacher ? referrerName : '',
        month: '',
        description: rp.description || `Referral Payout - ${referrerName}`,
        method: rp.method || 'bank_transfer',
        amount: Number(rp.amount) || 0,
        reference_number: rp.reference_number || '—',
        notes: rp.notes || '',
        status: rp.status || 'paid'
      };
    });

    // 6. Combine and Sort Chronologically (Newest first)
    const outflowRows = [...salaryRows, ...referralRows];
    const allTransactions = [...studentRows, ...outflowRows].sort((a, b) => {
      const dateA = new Date(a.paid_date || '1970-01-01').getTime();
      const dateB = new Date(b.paid_date || '1970-01-01').getTime();
      return dateB - dateA;
    });

    const totalIn = studentRows.reduce((sum, p) => sum + p.amount, 0);
    const totalOut = outflowRows.reduce((sum, p) => sum + p.amount, 0);
    const net = totalIn - totalOut;

    return res.status(200).json({
      status: 'success',
      data: {
        transactions: allTransactions,
        summary: {
          totalIn,
          totalOut,
          net,
          inflowCount: studentRows.length,
          outflowCount: outflowRows.length,
          totalCount: allTransactions.length
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to load transactions.'
    });
  }
}
