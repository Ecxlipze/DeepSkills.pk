import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // GET: Retrieve settings (supports optional ?key=)
  if (req.method === 'GET') {
    const { key } = req.query;
    try {
      let query = supabase.from('settings').select('*');
      if (key) {
        query = query.eq('key', key);
      }
      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ status: 'success', data: data || [] });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to load settings.' });
    }
  }

  // Mutations require admin authorization with 'settings' permissions
  const auth = await authorizeAdminOperation(req, 'settings');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  // POST: Create or update settings
  if (req.method === 'POST') {
    const { key, value } = req.body || {};
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ status: 'error', message: 'Setting key is required.' });
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .upsert(
          {
            key: key.trim(),
            value,
          },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;

      // Revalidate public pages
      try {
        await res.revalidate('/');
        await res.revalidate('/internship');
      } catch (_) {
        /* best-effort revalidation */
      }

      return res.status(200).json({
        status: 'success',
        data,
        message: 'Settings updated successfully.',
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to save settings.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
}
