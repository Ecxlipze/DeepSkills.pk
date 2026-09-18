import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // GET: Retrieve all testimonials
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('testimonials')
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

  // POST: Create or update a testimonial
  if (req.method === 'POST') {
    const { id, student_name, course_name, video_url, thumbnail_url } = req.body || {};

    if (!student_name || typeof student_name !== 'string' || !student_name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Student name is required.' });
    }
    if (!video_url || typeof video_url !== 'string' || !video_url.trim()) {
      return res.status(400).json({ status: 'error', message: 'Video URL is required.' });
    }

    const payload = {
      student_name: student_name.trim(),
      course_name: course_name && typeof course_name === 'string' ? course_name.trim() : 'General',
      video_url: video_url.trim(),
      thumbnail_url: thumbnail_url && typeof thumbnail_url === 'string' && thumbnail_url.trim() ? thumbnail_url.trim() : null
    };

    try {
      if (id) {
        const { data, error } = await supabase
          .from('testimonials')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        try {
          await res.revalidate('/');
        } catch (_) {}

        return res.status(200).json({ status: 'success', data, message: 'Testimonial updated successfully.' });
      } else {
        const { data, error } = await supabase
          .from('testimonials')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        try {
          await res.revalidate('/');
        } catch (_) {}

        return res.status(201).json({ status: 'success', data, message: 'Testimonial added successfully.' });
      }
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to save testimonial.' });
    }
  }

  // DELETE: Delete a testimonial by ID
  if (req.method === 'DELETE') {
    const { id } = req.body || req.query || {};
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Testimonial ID is required for deletion.' });
    }

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      try {
        await res.revalidate('/');
      } catch (_) {}

      return res.status(200).json({ status: 'success', message: 'Testimonial deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to delete testimonial.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
}
