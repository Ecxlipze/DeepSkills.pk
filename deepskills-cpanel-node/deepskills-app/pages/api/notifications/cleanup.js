import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: 'Supabase server client is not configured' });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const { error, count } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff.toISOString());

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, deleted: count || 0 });
}
