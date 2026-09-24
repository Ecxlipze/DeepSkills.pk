import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { resolveActor } from '../../../lib/timeTrackingServer.js';
import { reorderStaffTasks } from '../../../lib/staffTasksServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const auth = await resolveActor(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  try {
    const result = await reorderStaffTasks(supabase, auth, req.body || {});
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}
