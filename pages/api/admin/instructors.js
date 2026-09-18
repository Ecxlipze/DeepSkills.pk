import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // GET: Retrieve all instructors
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
    return res.status(200).json({ status: 'success', data: data || [] });
  }

  // Mutations require admin authorization with 'settings' or 'teachers' permissions
  const auth = await authorizeAdminOperation(req, 'settings');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  // POST: Create or update an instructor
  if (req.method === 'POST') {
    const { id, name, role = 'Instructor', image_url, bio } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Trainer name is required.' });
    }

    const payload = {
      name: name.trim(),
      role: role && typeof role === 'string' ? role.trim() : 'Instructor',
      image_url: image_url && typeof image_url === 'string' ? image_url.trim() : null,
      bio: bio && typeof bio === 'string' ? bio.trim() : null
    };

    try {
      if (id) {
        const { data, error } = await supabase
          .from('instructors')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        try {
          await res.revalidate('/trainers');
        } catch (_) {}

        return res.status(200).json({ status: 'success', data, message: 'Trainer updated successfully.' });
      } else {
        const { data, error } = await supabase
          .from('instructors')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        try {
          await res.revalidate('/trainers');
        } catch (_) {}

        return res.status(201).json({ status: 'success', data, message: 'Trainer added successfully.' });
      }
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to save trainer.' });
    }
  }

  // DELETE: Delete an instructor by ID
  if (req.method === 'DELETE') {
    const { id } = req.body || req.query || {};
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Trainer ID is required for deletion.' });
    }

    try {
      const { error } = await supabase
        .from('instructors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      try {
        await res.revalidate('/trainers');
      } catch (_) {}

      return res.status(200).json({ status: 'success', message: 'Trainer deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to delete trainer.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
}
