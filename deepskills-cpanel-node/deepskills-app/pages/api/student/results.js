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

  const rawExamType = String(data.examType || '').toLowerCase().replace(/[^a-z]/g, '');
  const examType = rawExamType === 'mid' ? 'midterm' : rawExamType === 'final' ? 'finalterm' : rawExamType;

  if (!['midterm', 'finalterm'].includes(examType)) {
    return res.status(400).json({ status: 'error', message: 'Valid exam type (midterm/finalterm) is required.' });
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
      .select('id, status, batch')
      .eq('cnic', cnic)
      .in('status', ['Active', 'Graduated'])
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (studentErr) {
      console.error('[student/results] Student lookup error:', studentErr);
      return res.status(500).json({ status: 'error', message: 'Failed to look up student admission.' });
    }

    const student = studentRows?.[0];
    if (!student) {
      return res.status(403).json({ status: 'error', message: 'Active student admission not found.' });
    }

    const { data: resultRows, error: resultErr } = await supabase
      .from('results')
      .select('*')
      .eq('student_id', student.id)
      .eq('exam_type', examType)
      .limit(1);

    if (resultErr) {
      console.error('[student/results] Results lookup error:', resultErr);
      return res.status(500).json({ status: 'error', message: 'Failed to look up exam results.' });
    }

    const result = resultRows?.[0] || null;
    let stats = { avg: 0, highest: 0, count: 0 };

    if (result && result.batch_id) {
      const { data: allResults } = await supabase
        .from('results')
        .select('total_marks')
        .eq('batch_id', result.batch_id)
        .eq('exam_type', examType);

      if (Array.isArray(allResults) && allResults.length > 0) {
        const scores = allResults
          .map(r => parseFloat(r.total_marks))
          .filter(s => !isNaN(s));

        if (scores.length > 0) {
          const sum = scores.reduce((a, b) => a + b, 0);
          stats = {
            avg: Math.round((sum / scores.length) * 10) / 10,
            highest: Math.max(...scores),
            count: scores.length
          };
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        result,
        batchStats: stats
      }
    });
  } catch (err) {
    console.error('[student/results] Unexpected error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to retrieve exam result.' });
  }
}
