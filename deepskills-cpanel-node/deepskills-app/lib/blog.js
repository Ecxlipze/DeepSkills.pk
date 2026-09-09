import { getSupabaseServerClient } from './supabaseServer.js';

export const BLOG_CATEGORIES = ['Tech', 'Career', 'Design', 'Education', 'General'];
export const BLOG_LIMITS = {
  title: 120,
  slug: 90,
  excerpt: 220,
  metaTitle: 60,
  metaDescription: 160,
  tags: 8,
  tag: 24,
  contentHtml: 30000,
  contentWords: 2500
};

export function slugify(value = '') {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(htmlOrText = '') {
  const text = stripHtml(htmlOrText);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function calculateReadingTime(htmlOrText = '') {
  return Math.max(1, Math.ceil(countWords(htmlOrText) / 200));
}

export function makeExcerpt(htmlOrText = '', maxLength = 170) {
  const text = stripHtml(htmlOrText);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}

export function sanitizePlainText(value = '', maxLength = 200) {
  return value
    .toString()
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeTags(tags = []) {
  return Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .map((tag) => slugify(tag).slice(0, BLOG_LIMITS.tag))
        .filter(Boolean)
    )
  ).slice(0, BLOG_LIMITS.tags);
}

export function normalizePost(post = {}) {
  return {
    id: post.id,
    title: post.title || '',
    slug: post.slug || '',
    excerpt: post.excerpt || makeExcerpt(post.content_html || ''),
    content: post.content || null,
    contentHtml: post.content_html || '',
    coverImage: post.cover_image || '',
    category: post.category || 'General',
    tags: post.tags || [],
    authorId: post.author_id || '',
    authorName: post.author_name || 'DeepSkills Team',
    authorAvatar: post.author_avatar || '',
    status: post.status || 'draft',
    isFeatured: Boolean(post.is_featured),
    scheduledAt: post.scheduled_at || null,
    publishedAt: post.published_at || null,
    readingTime: post.reading_time || calculateReadingTime(post.content_html || post.excerpt || ''),
    viewCount: post.view_count || 0,
    metaTitle: post.meta_title || '',
    metaDescription: post.meta_description || '',
    canonicalUrl: post.canonical_url || '',
    relatedCourseIds: post.related_course_ids || [],
    createdAt: post.created_at || null,
    updatedAt: post.updated_at || null
  };
}

export function toBlogRow(input = {}) {
  const contentHtml = input.contentHtml || input.content_html || '';
  return {
    title: sanitizePlainText(input.title || '', BLOG_LIMITS.title),
    slug: slugify(input.slug || input.title || '').slice(0, BLOG_LIMITS.slug),
    excerpt: sanitizePlainText(input.excerpt || makeExcerpt(contentHtml), BLOG_LIMITS.excerpt),
    content: input.content || null,
    content_html: contentHtml,
    cover_image: input.coverImage || input.cover_image || '',
    category: input.category || 'General',
    tags: sanitizeTags(input.tags || []),
    author_id: input.authorId || input.author_id || null,
    author_name: input.authorName || input.author_name || 'DeepSkills Team',
    status: input.status || 'draft',
    is_featured: Boolean(input.isFeatured ?? input.is_featured),
    scheduled_at: input.status === 'scheduled' ? input.scheduledAt || input.scheduled_at || null : null,
    published_at:
      input.status === 'published'
        ? input.publishedAt || input.published_at || new Date().toISOString()
        : input.publishedAt || input.published_at || null,
    reading_time: input.readingTime || input.reading_time || calculateReadingTime(contentHtml || input.excerpt || ''),
    meta_title: sanitizePlainText(input.metaTitle || input.meta_title || '', BLOG_LIMITS.metaTitle),
    meta_description: sanitizePlainText(input.metaDescription || input.meta_description || '', BLOG_LIMITS.metaDescription),
    canonical_url: input.canonicalUrl || input.canonical_url || '',
    related_course_ids: input.relatedCourseIds || input.related_course_ids || [],
    updated_at: new Date().toISOString()
  };
}

export async function fetchPublishedPosts() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching blog posts:', error.message);
    return [];
  }

  return (data || []).map(normalizePost);
}

export async function fetchAllPublishedSlugs() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('status', 'published');

  if (error) {
    console.error('Error fetching blog slugs:', error.message);
    return [];
  }

  return data || [];
}

export async function fetchPostBySlug(slug) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    console.error('Error fetching blog post:', error.message);
    return null;
  }

  return data ? normalizePost(data) : null;
}

export async function fetchRelatedPosts(post) {
  const supabase = getSupabaseServerClient();
  if (!supabase || !post?.category) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('slug', post.slug)
    .order('published_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching related blog posts:', error.message);
    return [];
  }

  return (data || []).map(normalizePost);
}
