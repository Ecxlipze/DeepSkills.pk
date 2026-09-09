import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { BLOG_LIMITS, countWords, slugify, toBlogRow, normalizePost } from '../../../lib/blog.js';
import { authenticateBlogActor } from '../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

  const payload = req.body || {};
  const requestedRow = toBlogRow(payload);
  const row = auth.isAdmin
    ? {
        ...requestedRow,
        author_id: requestedRow.author_id || auth.actorId,
        author_name: requestedRow.author_name || auth.actorName
      }
    : {
        ...requestedRow,
        status: 'draft',
        is_featured: false,
        published_at: null,
        scheduled_at: null,
        author_id: auth.actorId,
        author_name: auth.actorName
      };

  if (!row.title || !row.slug) {
    return res.status(400).json({ error: 'Title and slug are required.' });
  }
  if (row.title.length > BLOG_LIMITS.title || row.slug.length > BLOG_LIMITS.slug) {
    return res.status(400).json({ error: 'Title or slug exceeds the allowed length.' });
  }
  if ((row.content_html || '').length > BLOG_LIMITS.contentHtml || countWords(row.content_html || '') > BLOG_LIMITS.contentWords) {
    return res.status(400).json({ error: `Blog content is limited to ${BLOG_LIMITS.contentWords} words.` });
  }
  if ((row.tags || []).length > BLOG_LIMITS.tags || (row.tags || []).some((tag) => tag.length > BLOG_LIMITS.tag)) {
    return res.status(400).json({ error: 'Tags exceed the allowed limit.' });
  }

  if (!auth.isAdmin && payload.id) {
    const { data: existing, error: existingError } = await supabase
      .from('blog_posts')
      .select('id, author_id, status')
      .eq('id', payload.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: 'Draft not found.' });
    }

    if (existing.status !== 'draft') {
      return res.status(403).json({ error: 'Contributors can only edit draft posts.' });
    }

    if (existing.author_id !== auth.actorId) {
      return res.status(403).json({ error: 'Contributors can only edit their own drafts.' });
    }
  }

  if (auth.isAdmin && row.is_featured) {
    await supabase.from('blog_posts').update({ is_featured: false }).eq('is_featured', true);
  }

  const query = payload.id
    ? supabase.from('blog_posts').update(row).eq('id', payload.id).select('*').single()
    : supabase
        .from('blog_posts')
        .insert([{ ...row, slug: slugify(row.slug), created_at: new Date().toISOString() }])
        .select('*')
        .single();

  const { data, error } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ post: normalizePost(data) });
}
