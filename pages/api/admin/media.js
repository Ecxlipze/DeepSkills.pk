import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // GET: Retrieve all media items
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
    return res.status(200).json({ status: 'success', data: data || [] });
  }

  // Mutations require admin authorization with 'settings' permissions
  const auth = await authorizeAdminOperation(req, 'settings');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  // POST: Create or update a media item
  if (req.method === 'POST') {
    const { id, title, description, media_url, type = 'project' } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ status: 'error', message: 'Title is required.' });
    }
    if (!media_url || typeof media_url !== 'string' || !media_url.trim()) {
      return res.status(400).json({ status: 'error', message: 'Media URL is required.' });
    }

    const payload = {
      title: title.trim(),
      description: description && typeof description === 'string' ? description.trim() : null,
      media_url: media_url.trim(),
      type: type || 'project'
    };

    try {
      if (id) {
        const { data, error } = await supabase
          .from('media_items')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        try {
          await res.revalidate('/media');
        } catch (_) {}

        return res.status(200).json({ status: 'success', data, message: 'Media item updated successfully.' });
      } else {
        const { data, error } = await supabase
          .from('media_items')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        try {
          await res.revalidate('/media');
        } catch (_) {}

        return res.status(201).json({ status: 'success', data, message: 'Media item added successfully.' });
      }
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to save media item.' });
    }
  }

  // DELETE: Delete a media item by ID
  if (req.method === 'DELETE') {
    const { id } = req.body || req.query || {};
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Media item ID is required for deletion.' });
    }

    try {
      const { error } = await supabase
        .from('media_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      try {
        await res.revalidate('/media');
      } catch (_) {}

      return res.status(200).json({ status: 'success', message: 'Media item deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to delete media item.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
}
