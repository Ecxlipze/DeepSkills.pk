import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const auth = await authorizeAdminOperation(req, ['teachers', 'hr']);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  const { action = 'sync', cnic, name, assignedCourse, course, batch } = req.body || {};

  const cleanCnic = (cnic || '').replace(/\D+/g, '');
  const formattedCnic = cleanCnic.length === 13 
    ? `${cleanCnic.slice(0, 5)}-${cleanCnic.slice(5, 12)}-${cleanCnic.slice(12)}`
    : cnic;

  if (!formattedCnic) {
    return res.status(400).json({ status: 'error', message: 'A valid CNIC is required.' });
  }

  try {
    if (action === 'revoke') {
      const { error } = await supabase.from('allowed_cnics').delete().eq('cnic', formattedCnic);
      if (error) throw error;
      return res.status(200).json({ status: 'success', message: 'Teacher login access revoked.' });
    }

    if (action === 'sync') {
      const { error } = await supabase.from('allowed_cnics').upsert({
        cnic: formattedCnic,
        name: name || '',
        role: 'teacher',
        assigned_course: assignedCourse || course || '',
        batch: batch || ''
      }, { onConflict: 'cnic' });
      if (error) throw error;
      return res.status(200).json({ status: 'success', message: 'Teacher login access synchronized.' });
    }

    return res.status(400).json({ status: 'error', message: 'Invalid action.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || 'Operation failed.' });
  }
}
