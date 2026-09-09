import { getSupabaseServerClient } from '../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase environment variables are missing.' });
  }

  const { slug } = req.body || {};
  if (!slug) {
    return res.status(400).json({ error: 'Post slug is required.' });
  }

  const { error } = await supabase.rpc('increment_blog_view', { post_slug: slug });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ counted: true });
}
