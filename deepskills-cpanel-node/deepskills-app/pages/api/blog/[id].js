import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { authenticateBlogActor } from '../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase environment variables are missing.' });
  }

  const auth = await authenticateBlogActor(req, supabase);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (!auth.isAdmin) {
    return res.status(403).json({ error: 'Only admins can delete blog posts.' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Blog post id is required.' });
  }

  const { error } = await supabase.from('blog_posts').delete().eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ deleted: true });
}
