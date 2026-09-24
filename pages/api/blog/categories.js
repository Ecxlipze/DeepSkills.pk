import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { authenticateBlogActor } from '../../../lib/portalAuthServer.js';
import { slugify } from '../../../lib/blog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const supabase = req.__supabase || getSupabaseServerClient();
  const auth = await authenticateBlogActor(req, supabase);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (!auth.isAdmin) return res.status(403).json({ error: 'Only admins can add categories.' });

  const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  const slug = slugify(name);
  if (!name || name.length > 60 || /[<>\u0000-\u001F\u007F]/.test(name) || !slug || slug === 'all') {
    return res.status(400).json({ error: 'Enter a category name of 1–60 characters containing letters or numbers. “All” is reserved.' });
  }
  const { data, error } = await supabase.from('blog_categories').insert({ name, slug }).select('name, slug').single();
  if (error) {
    return res.status(error.code === '23505' ? 409 : 500).json({
      error: error.code === '23505' ? 'This category already exists.' : 'Could not save the category. Please try again.'
    });
  }
  try {
    await res.revalidate('/blogs');
  } catch {
    // ISR retries on the next visit; the category has already been saved.
    console.warn('Blog category saved; immediate blog revalidation failed.');
  }
  return res.status(201).json({ category: data });
}
