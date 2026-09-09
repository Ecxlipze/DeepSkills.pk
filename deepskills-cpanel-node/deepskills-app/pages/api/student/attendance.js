import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { validatePortalSession } from '../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
  const supabase = getSupabaseServerClient();
  if (!supabase) return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() || String(req.body?.token || '');
  try {
    const auth = await validatePortalSession(supabase, token, ['student']);
    if (!auth.ok) return res.status(auth.status).json({ status: 'error', message: auth.message });
    // Resolve ownership on the server; never accept a student ID from the browser.
    const { data: students, error: studentError } = await supabase.from('admissions')
      .select('id, course, batch').eq('cnic', auth.session.cnic)
      .in('status', ['Active', 'Graduated']).order('submitted_at', { ascending: false });
    if (studentError) throw studentError;
    if (!students?.length) return res.status(403).json({ status: 'error', message: 'Active student admission not found.' });
    const { data: records, error } = await supabase.from('attendance')
      .select('id, student_id, date, day_of_week, batch_id, batch_name, course, status, marked_at, is_locked')
      .in('student_id', students.map(student => student.id)).order('date', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ status: 'success', data: { records: records || [], enrollments: students } });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load attendance. Please try again.' });
  }
}
