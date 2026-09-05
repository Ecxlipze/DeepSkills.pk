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
    // 1. Fetch Student Payments (inflows)
    const { data: feePayments, error: feeErr } = await supabase
      .from('payments')
      .select('id, amount, status, paid_date, method, reference_number, description, entity_id')
      .eq('status', 'paid')
      .order('paid_date', { ascending: false });

    if (feeErr) {
      return res.status(500).json({ status: 'error', message: feeErr.message });
    }

    const studentIds = [...new Set((feePayments || []).map(p => p.entity_id).filter(Boolean))];
    const studentMap = {};
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('admissions')
        .select('id, name')
        .in('id', studentIds);
      (students || []).forEach(s => { studentMap[s.id] = s.name; });
    }

    // 2. Fetch Teacher Salary Payments (outflows)
    const { data: salaryPayments, error: salErr } = await supabase
      .from('teacher_payments')
      .select('id, teacher_id, amount, month, paid_on, method, reference, status')
      .order('paid_on', { ascending: false });

    if (salErr) {
      return res.status(500).json({ status: 'error', message: salErr.message });
    }

    const teacherIds = [...new Set((salaryPayments || []).map(p => p.teacher_id).filter(Boolean))];
    const teacherMap = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, name')
        .in('id', teacherIds);
      (teachers || []).forEach(t => { teacherMap[t.id] = t.name; });
    }

    // 3. Normalize into unified timeline
    const studentRows = (feePayments || []).map(p => {
      const studentName = studentMap[p.entity_id] || '';
      return {
        id: p.id,
        paid_date: p.paid_date || '',
        entity_type: 'student',
        entity_id: p.entity_id,
        person_name: studentName,
        teacher_name: '',
        description: p.description || (studentName ? `Fee Payment - ${studentName}` : 'Student Fee Payment'),
        method: p.method || 'cash',
        amount: Number(p.amount) || 0,
        reference_number: p.reference_number || '—',
        status: p.status
      };
    });

    const salaryRows = (salaryPayments || [])
      .filter(tp => tp.status?.toLowerCase() === 'paid')
      .map(tp => {
        const teacherName = teacherMap[tp.teacher_id] || 'Faculty';
        return {
          id: tp.id,
          paid_date: tp.paid_on || '',
          entity_type: 'teacher',
          entity_id: tp.teacher_id,
          person_name: teacherName,
          teacher_name: teacherName,
          description: `Salary - ${teacherName} (${tp.month})`,
          method: tp.method || 'bank_transfer',
          amount: Number(tp.amount) || 0,
          reference_number: tp.reference || '—',
          status: tp.status
        };
      });

    const allTransactions = [...studentRows, ...salaryRows].sort((a, b) => {
      const dateA = new Date(a.paid_date || '1970-01-01').getTime();
      const dateB = new Date(b.paid_date || '1970-01-01').getTime();
      return dateB - dateA;
    });

    const totalIn = studentRows.reduce((sum, p) => sum + p.amount, 0);
    const totalOut = salaryRows.reduce((sum, p) => sum + p.amount, 0);
    const net = totalIn - totalOut;

    return res.status(200).json({
      status: 'success',
      data: {
        transactions: allTransactions,
        summary: { totalIn, totalOut, net }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to load transactions.'
    });
  }
}
