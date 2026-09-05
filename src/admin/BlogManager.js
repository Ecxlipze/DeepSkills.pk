import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { FaCopy, FaEdit, FaEye, FaImage, FaPlus, FaSearch, FaTrash, FaUpload } from 'react-icons/fa';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { BLOG_CATEGORIES, calculateReadingTime, countWords, makeExcerpt, slugify } from '../../lib/blog';
import { requestRevalidate } from '../utils/revalidatePublic';
import { canAccess } from '../utils/permissions';

const EMPTY_CONTENT = '<p></p>';
const MAX_TITLE_LENGTH = 120;
const MAX_EXCERPT_LENGTH = 220;
const MAX_META_TITLE_LENGTH = 60;
const MAX_META_DESCRIPTION_LENGTH = 160;
const MAX_SLUG_LENGTH = 90;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;
const MAX_CONTENT_WORDS = 2500;
const MAX_CONTENT_HTML_LENGTH = 30000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const SVG_BLOCKED_PATTERN = /<script|<foreignObject|\son\w+\s*=|javascript:|data:text\/html/i;

const getActorId = (user) => user?.id || user?.cnic || user?.email || '';
const isAdminUser = (user) => user?.role === 'admin';
const canUseBlogPanel = (user) => isAdminUser(user) || canAccess(user?.permissions || {}, 'blog', 'view');
const canMutateBlog = (user) => isAdminUser(user) || canAccess(user?.permissions || {}, 'blog', 'full');
const sanitizePlainText = (value = '', max = 200) =>
  value
    .toString()
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, max);
const sanitizeTag = (value = '') => slugify(value).slice(0, MAX_TAG_LENGTH);

function BlogManager() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const mode = getMode(router.asPath);

  if (loading) {
    return <Container>Loading blog panel...</Container>;
  }

  if (!canUseBlogPanel(user)) {
    return (
      <Container>
        <EmptyState>You do not have access to the blog panel.</EmptyState>
      </Container>
    );
  }

  if (mode.type === 'list') {
    return <BlogList />;
  }

  return <BlogEditor postId={mode.id} />;
}

function BlogList() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const canMutate = canMutateBlog(user);
  const actorId = getActorId(user);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState(BLOG_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    from: '',
    to: ''
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('blog_posts').select('*').order('updated_at', { ascending: false });
    if (!isAdmin) {
      query = query.eq('author_id', actorId).eq('status', 'draft');
    }
    const [{ data, error }, { data: categoryRows }] = await Promise.all([
      query,
      supabase.from('blog_categories').select('name').order('name')
    ]);

    if (error) {
      toast.error(error.message);
    } else {
      setPosts(data || []);
    }

    if (categoryRows?.length) {
      setCategories(categoryRows.map((item) => item.name));
    }

    setLoading(false);
  }, [actorId, isAdmin]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filteredPosts = useMemo(() => {
    const search = filters.search.toLowerCase().trim();
    return posts.filter((post) => {
      const matchesSearch =
        !search ||
        [post.title, post.author_name, post.slug, ...(post.tags || [])].join(' ').toLowerCase().includes(search);
      const matchesStatus = !isAdmin || filters.status === 'all' || post.status === filters.status;
      const matchesCategory = filters.category === 'all' || post.category === filters.category;
      const publishedDate = post.published_at || post.created_at;
      const matchesFrom = !filters.from || new Date(publishedDate) >= new Date(filters.from);
      const matchesTo = !filters.to || new Date(publishedDate) <= new Date(filters.to);
      return matchesSearch && matchesStatus && matchesCategory && matchesFrom && matchesTo;
    });
  }, [filters, isAdmin, posts]);

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      draft: posts.filter((post) => post.status === 'draft').length,
      scheduled: posts.filter((post) => post.status === 'scheduled').length,
      views: posts.reduce((sum, post) => sum + (post.view_count || 0), 0)
    }),
    [posts]
  );

  const bulkUpdate = async (status) => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    if (!selectedIds.length) return;
    const { error } = await supabase.from('blog_posts').update({ status, updated_at: new Date().toISOString() }).in('id', selectedIds);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Selected posts moved to ${status}`);
    setSelectedIds([]);
    fetchPosts();
  };

  const bulkDelete = async () => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    if (!selectedIds.length || !window.confirm('Delete selected blog posts?')) return;
    const { error } = await supabase.from('blog_posts').delete().in('id', selectedIds);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Selected posts deleted');
    setSelectedIds([]);
    fetchPosts();
  };

  const deletePost = async (post) => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    const response = await fetch(`/api/blog/${post.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: { id: actorId, role: user?.role || '', permissions: user?.permissions || {} } })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error || 'Unable to delete post');
      return;
    }
    toast.success('Post deleted');
    fetchPosts();
  };

  const duplicatePost = async (post) => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    const copy = {
      ...post,
      id: undefined,
      title: `${post.title} Copy`,
      slug: `${post.slug}-copy-${Date.now().toString().slice(-4)}`,
      status: 'draft',
      is_featured: false,
      published_at: null
    };
    const response = await fetch('/api/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dbToForm(copy), actor: { id: actorId, role: user?.role || '', permissions: user?.permissions || {} } })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error || 'Unable to duplicate post');
      return;
    }
    toast.success('Draft copy created');
    fetchPosts();
  };

  const togglePublished = async (post) => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    const response = await fetch('/api/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...dbToForm({ ...post, status: nextStatus }), actor: { id: actorId, role: user?.role || '', permissions: user?.permissions || {} } })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error || 'Unable to update post');
      return;
    }
    // Regenerate on unpublish too, so the stale page turns into a 404.
    await requestRevalidate(['/blogs', `/blogs/${post.slug}`]);
    toast.success(nextStatus === 'published' ? 'Post published' : 'Post moved to draft');
    fetchPosts();
  };

  return (
    <Container>
      <PageHeader>
        <div>
          <h1>Blog Posts</h1>
          <p>{isAdmin ? 'Create, manage, and publish blog content for the DeepSkills website' : 'Create and edit your draft blog posts for admin review'}</p>
        </div>
        {canMutate && (
          <PrimaryButton onClick={() => router.push('/admin/management/blog/new')}>
            <FaEdit /> New Post
          </PrimaryButton>
        )}
      </PageHeader>

      <StatsStrip>
        <StatCard><strong>{stats.total}</strong><span>Total Posts</span></StatCard>
        {isAdmin && <StatCard><strong>{stats.published}</strong><span>Published</span></StatCard>}
        <StatCard><strong>{stats.draft}</strong><span>Drafts</span></StatCard>
        {isAdmin && <StatCard><strong>{stats.scheduled}</strong><span>Scheduled</span></StatCard>}
        {isAdmin && <StatCard><strong>{stats.views.toLocaleString()}</strong><span>Total Views</span></StatCard>}
      </StatsStrip>

      <FilterBar>
        <SearchBox>
          <FaSearch />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search title, author or tag"
          />
        </SearchBox>
        {isAdmin && (
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
          </select>
        )}
        <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
          <option value="all">All Categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
        <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
      </FilterBar>

      {canMutate && isAdmin && selectedIds.length > 0 && (
        <BulkBar>
          <span>{selectedIds.length} selected</span>
          <button onClick={() => bulkUpdate('published')}>Bulk publish</button>
          <button onClick={() => bulkUpdate('draft')}>Bulk draft</button>
          <button className="danger" onClick={bulkDelete}>Bulk delete</button>
        </BulkBar>
      )}

      <TableWrap>
        <table>
          <thead>
            <tr>
              {canMutate && isAdmin && <th><input type="checkbox" checked={selectedIds.length === filteredPosts.length && filteredPosts.length > 0} onChange={(event) => setSelectedIds(event.target.checked ? filteredPosts.map((post) => post.id) : [])} /></th>}
              <th>Cover</th>
              <th>Title</th>
              <th>Category</th>
              <th>Author</th>
              <th>Status</th>
              {isAdmin && <th>Published On</th>}
              {isAdmin && <th>Views</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canMutate && isAdmin ? 9 : 8}>Loading posts...</td></tr>
            ) : filteredPosts.length === 0 ? (
              <tr><td colSpan={canMutate && isAdmin ? 9 : 8}>{isAdmin ? 'No blog posts found.' : 'No drafts yet. Create your first blog draft.'}</td></tr>
            ) : filteredPosts.map((post) => (
              <tr key={post.id}>
                {canMutate && isAdmin && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(post.id)}
                      onChange={(event) => {
                        setSelectedIds((current) => event.target.checked ? [...current, post.id] : current.filter((id) => id !== post.id));
                      }}
                    />
                  </td>
                )}
                <td>{post.cover_image ? <Thumb src={post.cover_image} alt="" /> : <ThumbFallback />}</td>
                <td>
                  <TitleCell>
                    <strong>{post.title}</strong>
                    <code>{post.slug}</code>
                  </TitleCell>
                </td>
                <td>{post.category || 'General'}</td>
                <td>{post.author_name || 'DeepSkills Team'}</td>
                <td><StatusBadge $status={post.status}>{post.status}</StatusBadge></td>
                {isAdmin && <td>{post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}</td>}
                {isAdmin && <td>{(post.view_count || 0).toLocaleString()}</td>}
                <td>
                  <ActionRow>
                    {canMutate && <button title="Edit" onClick={() => router.push(`/admin/management/blog/edit/${post.id}`)}><FaEdit /></button>}
                    <a title="Preview" href={`/blogs/${post.slug}?preview=true`} target="_blank" rel="noreferrer"><FaEye /></a>
                    {canMutate && isAdmin && <button title="Duplicate" onClick={() => duplicatePost(post)}><FaCopy /></button>}
                    {canMutate && isAdmin && <button title="Toggle published" onClick={() => togglePublished(post)}><FaUpload /></button>}
                    {canMutate && isAdmin && <button title="Delete" className="danger" onClick={() => deletePost(post)}><FaTrash /></button>}
                  </ActionRow>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Container>
  );
}

function BlogEditor({ postId }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const canMutate = canMutateBlog(user);
  const actorId = getActorId(user);
  const fileRef = useRef(null);
  const inlineImageRef = useRef(null);
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canMutate && !postId) {
      toast.error('You have view-only access to blog management.');
      router.push('/admin/management/blog');
    }
  }, [canMutate, postId, router]);
  const [categories, setCategories] = useState(BLOG_CATEGORIES);
  const [courses, setCourses] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState(() => ({
    id: postId || undefined,
    title: '',
    slug: '',
    excerpt: '',
    content: null,
    contentHtml: EMPTY_CONTENT,
    coverImage: '',
    category: 'General',
    tags: [],
    authorId: actorId,
    authorName: user?.name || 'Admin',
    status: 'draft',
    scheduledAt: '',
    publishedAt: '',
    readingTime: 1,
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    relatedCourseIds: []
  }));

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write the full blog post content...' })
    ],
    immediatelyRender: false,
    content: EMPTY_CONTENT,
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      const nextWordCount = countWords(html);
      if (html.length > MAX_CONTENT_HTML_LENGTH || nextWordCount > MAX_CONTENT_WORDS) {
        toast.error(`Blog content is limited to ${MAX_CONTENT_WORDS} words.`);
        return;
      }
      setForm((current) => ({
        ...current,
        content: activeEditor.getJSON(),
        contentHtml: html,
        excerpt: current.excerpt || makeExcerpt(html),
        readingTime: calculateReadingTime(html)
      }));
    }
  });

  const fetchEditorData = useCallback(async () => {
    const [{ data: categoryRows }, { data: courseRows }] = await Promise.all([
      supabase.from('blog_categories').select('name').order('name'),
      supabase.from('courses').select('*').order('title')
    ]);

    if (categoryRows?.length) setCategories(categoryRows.map((item) => item.name));
    if (courseRows?.length) setCourses(courseRows);

    if (!postId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('blog_posts').select('*').eq('id', postId).single();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (!isAdmin && (data.author_id !== actorId || data.status !== 'draft')) {
      toast.error('You can only edit your own draft blogs.');
      router.push('/admin/management/blog');
      return;
    }

    const nextForm = dbToForm(data);
    setForm(nextForm);
    editor?.commands.setContent(nextForm.content || nextForm.contentHtml || EMPTY_CONTENT);
    setLoading(false);
  }, [actorId, editor, isAdmin, postId, router]);

  useEffect(() => {
    if (editor) fetchEditorData();
  }, [editor, fetchEditorData]);

  const updateField = (key, value) => {
    setForm((current) => {
      let safeValue = value;
      if (key === 'title') safeValue = sanitizePlainText(value, MAX_TITLE_LENGTH);
      if (key === 'excerpt') safeValue = sanitizePlainText(value, MAX_EXCERPT_LENGTH);
      if (key === 'metaTitle') safeValue = sanitizePlainText(value, MAX_META_TITLE_LENGTH);
      if (key === 'metaDescription') safeValue = sanitizePlainText(value, MAX_META_DESCRIPTION_LENGTH);
      if (key === 'slug') safeValue = slugify(value).slice(0, MAX_SLUG_LENGTH);
      if (key === 'status' && !isAdmin) safeValue = 'draft';
      if (key === 'isFeatured' && !isAdmin) safeValue = false;
      const next = { ...current, [key]: safeValue };
      if (key === 'title' && (!current.slug || current.slug === slugify(current.title))) {
        next.slug = slugify(safeValue).slice(0, MAX_SLUG_LENGTH);
      }
      if (key === 'slug') {
        next.slug = safeValue;
      }
      if (key === 'metaTitle' && !current.canonicalUrl) {
        next.canonicalUrl = `https://deepskills.pk/blogs/${next.slug}`;
      }
      return next;
    });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    const safeTag = sanitizeTag(tag);
    if (!safeTag || form.tags.includes(safeTag)) return;
    if (form.tags.length >= MAX_TAGS) {
      toast.error(`You can add up to ${MAX_TAGS} tags.`);
      return;
    }
    setForm((current) => ({ ...current, tags: [...current.tags, safeTag] }));
    setTagInput('');
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!isAdmin) {
      toast.error('Only admins can add categories.');
      return;
    }
    if (!name) return;
    const { error } = await supabase.from('blog_categories').upsert({ name, slug: slugify(name) });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCategories((current) => Array.from(new Set([...current, name])));
    setForm((current) => ({ ...current, category: name }));
    setNewCategory('');
  };

  const validateSvgFile = async (file) => {
    const svgText = await file.text();
    if (!/<svg[\s>]/i.test(svgText) || SVG_BLOCKED_PATTERN.test(svgText)) {
      throw new Error('SVG contains unsafe markup and cannot be uploaded.');
    }
  };

  const uploadFile = async (file, folder = 'covers') => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Only JPG, PNG, WebP, GIF, and SVG images are allowed.');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('Image uploads are limited to 2 MB.');
    }
    if (file.type === 'image/svg+xml') {
      await validateSvgFile(file);
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const path = `${folder}/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
    const { error } = await supabase.storage.from('blog-covers').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('blog-covers').getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadCover = async (event) => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, 'covers');
      setForm((current) => ({ ...current, coverImage: url }));
      toast.success('Cover uploaded');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const uploadInlineImage = async (event) => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    try {
      const url = await uploadFile(file, 'content');
      editor.chain().focus().setImage({ src: url }).run();
      toast.success('Image inserted');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const setLink = () => {
    const previousUrl = editor?.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const savePost = async (statusOverride) => {
    if (!canMutate) {
      toast.error('You have view-only access to blog management.');
      return;
    }
    const status = isAdmin ? statusOverride || form.status : 'draft';
    const payload = {
      ...form,
      status,
      slug: slugify(form.slug || form.title),
      excerpt: form.excerpt || makeExcerpt(form.contentHtml),
      readingTime: calculateReadingTime(form.contentHtml),
      authorId: form.authorId || actorId,
      authorName: form.authorName || user?.name || 'Blog Writer',
      isFeatured: isAdmin ? form.isFeatured : false,
      actor: {
        id: actorId,
        role: user?.role || '',
        permissions: user?.permissions || {}
      }
    };

    if (!payload.title || !payload.slug) {
      toast.error('Title and slug are required');
      return;
    }
    if (payload.title.length > MAX_TITLE_LENGTH || payload.slug.length > MAX_SLUG_LENGTH) {
      toast.error('Title or slug is too long.');
      return;
    }
    if (payload.tags.length > MAX_TAGS || payload.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      toast.error('Please keep tags short and limited.');
      return;
    }
    if (countWords(payload.contentHtml) > MAX_CONTENT_WORDS || payload.contentHtml.length > MAX_CONTENT_HTML_LENGTH) {
      toast.error(`Blog content is limited to ${MAX_CONTENT_WORDS} words.`);
      return;
    }

    setSaving(true);
    const response = await fetch('/api/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error(body.error || 'Unable to save post');
      setSaving(false);
      return;
    }

    if (status === 'published') {
      await requestRevalidate(['/blogs', `/blogs/${body.post.slug}`]);
    }

    toast.success(status === 'published' ? 'Post published' : 'Draft saved for admin review');
    setSaving(false);
    router.push('/admin/management/blog');
  };

  const wordCount = countWords(form.contentHtml);
  const canonical = form.canonicalUrl || `https://deepskills.pk/blogs/${form.slug || 'post-slug'}`;

  if (loading) {
    return <Container>Loading editor...</Container>;
  }

  return (
    <Container>
      <EditorHeader>
        <button type="button" onClick={() => router.push('/admin/management/blog')}>Back to posts</button>
        {canMutate ? (
          <div>
            <button type="button" onClick={() => savePost('draft')} disabled={saving}>Save Draft</button>
            {isAdmin && <PrimaryButton type="button" onClick={() => savePost('published')} disabled={saving}>Publish Now</PrimaryButton>}
          </div>
        ) : (
          <span style={{ color: '#888', fontSize: '0.85rem' }}>View-only access</span>
        )}
      </EditorHeader>

      <EditorGrid>
        <MainEditor>
          <TitleInput
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Post title..."
            maxLength={MAX_TITLE_LENGTH}
          />
          <SlugPreview>
            deepskills.pk/blogs/
            <input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} aria-label="Blog slug" />
          </SlugPreview>

          <Toolbar>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
            <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()}>Strike</button>
            <button onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet List</button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered List</button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
            <button onClick={setLink}>Link</button>
            <button onClick={() => inlineImageRef.current?.click()}>Image</button>
            <button onClick={() => editor.chain().focus().undo().run()}>Undo</button>
            <button onClick={() => editor.chain().focus().redo().run()}>Redo</button>
          </Toolbar>
          <input ref={inlineImageRef} type="file" accept="image/*" hidden onChange={uploadInlineImage} />
          <EditorBox>
            <EditorContent editor={editor} />
          </EditorBox>
          <EditorFooter>{wordCount} words · ~{form.readingTime || 1} min read</EditorFooter>
        </MainEditor>

        <SettingsColumn>
          <Panel>
            <h2>{isAdmin ? 'Publish' : 'Draft Status'}</h2>
            <label>Status</label>
            {isAdmin ? (
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            ) : (
              <ReadOnlyLine>Your blog will stay as a draft until an admin publishes it.</ReadOnlyLine>
            )}
            {isAdmin && form.status === 'scheduled' && (
              <>
                <label>Scheduled date</label>
                <input type="datetime-local" value={form.scheduledAt || ''} onChange={(event) => updateField('scheduledAt', event.target.value)} />
              </>
            )}
            {isAdmin && <PreviewLink href={`/blogs/${form.slug || 'preview'}?preview=true`} target="_blank" rel="noreferrer">Preview post</PreviewLink>}
          </Panel>

          <Panel>
            <h2>Cover Image</h2>
            <UploadArea onClick={() => fileRef.current?.click()}>
              {form.coverImage ? <img src={form.coverImage} alt="" /> : <><FaImage /><span>Upload cover image</span></>}
            </UploadArea>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadCover} />
            {form.coverImage && <button type="button" onClick={() => updateField('coverImage', '')}>Remove</button>}
          </Panel>

          <Panel>
            <h2>Details</h2>
            <label>Category</label>
            <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <InlineAdd>
              <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" />
              <button type="button" onClick={addCategory} disabled={!isAdmin}><FaPlus /></button>
            </InlineAdd>

            <label>Tags</label>
            <InlineAdd>
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder={`Max ${MAX_TAGS} tags`}
                maxLength={MAX_TAG_LENGTH}
              />
              <button type="button" onClick={addTag}><FaPlus /></button>
            </InlineAdd>
            <Pills>
              {form.tags.map((tag) => (
                <button key={tag} type="button" onClick={() => setForm((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))}>
                  {tag}
                </button>
              ))}
            </Pills>

            <label>Author</label>
            <input value={form.authorName} onChange={(event) => updateField('authorName', event.target.value)} disabled={!isAdmin} maxLength={80} />

            <label>Related Courses</label>
            <select
              multiple
              value={form.relatedCourseIds}
              onChange={(event) => updateField('relatedCourseIds', Array.from(event.target.selectedOptions).map((option) => option.value))}
            >
              {courses.map((course) => <option key={course.id || course.slug} value={course.slug || course.id}>{course.title}</option>)}
            </select>

            <ReadOnlyLine>Reading time: ~{form.readingTime || 1} min read</ReadOnlyLine>
            {isAdmin && (
              <CheckLine>
                <input type="checkbox" checked={form.isFeatured} onChange={(event) => updateField('isFeatured', event.target.checked)} />
                Featured post
              </CheckLine>
            )}
          </Panel>

          {isAdmin && <Panel>
            <h2>SEO</h2>
            <GooglePreview>
              <span>deepskills.pk › blogs › {form.slug || 'post-slug'}</span>
              <strong>{form.metaTitle || form.title || 'Blog post title'} | DeepSkills Blog</strong>
              <p>{form.metaDescription || form.excerpt || 'Meta description preview will appear here.'}</p>
            </GooglePreview>
            <label>Meta Title</label>
            <CounterInput $over={(form.metaTitle || '').length > 60}>
              <input value={form.metaTitle} onChange={(event) => updateField('metaTitle', event.target.value)} maxLength={MAX_META_TITLE_LENGTH} />
              <span>{(form.metaTitle || '').length}/60</span>
            </CounterInput>
            <label>Meta Description</label>
            <CounterInput $over={(form.metaDescription || '').length > 160}>
              <textarea value={form.metaDescription} onChange={(event) => updateField('metaDescription', event.target.value)} maxLength={MAX_META_DESCRIPTION_LENGTH} />
              <span>{(form.metaDescription || '').length}/160</span>
            </CounterInput>
            <label>Canonical URL</label>
            <input value={canonical} onChange={(event) => updateField('canonicalUrl', event.target.value)} />
          </Panel>}
        </SettingsColumn>
      </EditorGrid>
    </Container>
  );
}

function getMode(asPath = '') {
  const path = asPath.split('?')[0];
  const editMatch = path.match(/^\/admin\/(?:management\/)?blog\/edit\/([^/]+)/);
  if (editMatch) return { type: 'edit', id: editMatch[1] };
  if (path === '/admin/blog/new' || path === '/admin/management/blog/new') return { type: 'new' };
  return { type: 'list' };
}

function dbToForm(post) {
  return {
    id: post.id,
    title: post.title || '',
    slug: post.slug || '',
    excerpt: post.excerpt || '',
    content: post.content || null,
    contentHtml: post.content_html || EMPTY_CONTENT,
    coverImage: post.cover_image || '',
    category: post.category || 'General',
    tags: post.tags || [],
    authorId: post.author_id || '',
    authorName: post.author_name || 'Admin',
    status: post.status || 'draft',
    scheduledAt: post.scheduled_at ? post.scheduled_at.slice(0, 16) : '',
    publishedAt: post.published_at || '',
    readingTime: post.reading_time || calculateReadingTime(post.content_html || ''),
    isFeatured: Boolean(post.is_featured),
    metaTitle: post.meta_title || '',
    metaDescription: post.meta_description || '',
    canonicalUrl: post.canonical_url || '',
    relatedCourseIds: post.related_course_ids || []
  };
}

const BlogManagerPage = () => (
  <AdminLayout>
    <BlogManager />
  </AdminLayout>
);

export default BlogManagerPage;

const Container = styled.div`
  color: #fff;
  padding: 10px 0 40px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    margin: 0 0 6px;
    font-size: 1.9rem;
  }

  p {
    margin: 0;
    color: #8a8f99;
  }

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  padding: 12px 18px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr));
  gap: 14px;
  margin-bottom: 20px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 18px;

  strong {
    display: block;
    font-size: 1.6rem;
  }

  span {
    color: #7f8794;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
`;

const FilterBar = styled.div`
  display: grid;
  grid-template-columns: 1.5fr repeat(4, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 14px;

  input,
  select {
    width: 100%;
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: #111318;
    color: #fff;
    padding: 0 12px;
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #7f8794;

  input {
    border: none;
    background: transparent;
    padding: 0;
  }
`;

const BulkBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.12);

  button {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .danger {
    color: #ff8a8a;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: #0f1013;

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1040px;
  }

  th,
  td {
    text-align: left;
    padding: 14px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #c9ced8;
    vertical-align: middle;
  }

  th {
    color: #7f8794;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const Thumb = styled.img`
  width: 44px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
`;

const ThumbFallback = styled.div`
  width: 44px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, #7b1f2e, #1f2937);
`;

const TitleCell = styled.div`
  display: grid;
  gap: 4px;

  strong {
    color: #fff;
  }

  code {
    color: #7f8794;
    font-size: 0.78rem;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  color: ${(props) => (props.$status === 'published' ? '#34d399' : props.$status === 'scheduled' ? '#93c5fd' : '#fbbf24')};
  background: ${(props) =>
    props.$status === 'published'
      ? 'rgba(52, 211, 153, 0.12)'
      : props.$status === 'scheduled'
        ? 'rgba(147, 197, 253, 0.12)'
        : 'rgba(251, 191, 36, 0.12)'};
`;

const ActionRow = styled.div`
  display: flex;
  gap: 6px;

  button,
  a {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
    cursor: pointer;
  }

  .danger {
    color: #ff8a8a;
  }
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;

  > button,
  div button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: #111318;
    color: #fff;
    border-radius: 10px;
    padding: 11px 14px;
    cursor: pointer;
    margin-left: 8px;
  }
`;

const EditorGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 22px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const MainEditor = styled.div`
  min-width: 0;
`;

const TitleInput = styled.input`
  width: 100%;
  border: none;
  background: transparent;
  color: #fff;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 900;
  padding: 8px 0;
  outline: none;
`;

const SlugPreview = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  color: #7f8794;
  margin-bottom: 16px;

  input {
    border: none;
    background: transparent;
    color: #d5d9e2;
    min-width: 220px;
    outline: none;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  border-radius: 14px 14px 0 0;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);

  button {
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    font-weight: 800;
  }
`;

const EditorBox = styled.div`
  min-height: 560px;
  background: #0f1013;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: none;
  border-radius: 0 0 14px 14px;
  padding: 24px;

  .ProseMirror {
    min-height: 510px;
    outline: none;
    color: #d8dde7;
    font-size: 1.05rem;
    line-height: 1.8;
  }

  .ProseMirror h1,
  .ProseMirror h2,
  .ProseMirror h3 {
    color: #fff;
    line-height: 1.15;
  }

  .ProseMirror img {
    max-width: 100%;
    border-radius: 14px;
  }
`;

const EditorFooter = styled.div`
  color: #7f8794;
  margin-top: 10px;
`;

const SettingsColumn = styled.aside`
  display: grid;
  gap: 16px;
  align-content: start;
  position: sticky;
  top: 20px;
`;

const Panel = styled.section`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;

  h2 {
    margin: 0 0 14px;
    font-size: 1.05rem;
  }

  label {
    display: block;
    color: #8a8f99;
    margin: 12px 0 8px;
    font-weight: 700;
    font-size: 0.8rem;
  }

  input,
  textarea,
  select {
    width: 100%;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: #0a0b0e;
    color: #fff;
    padding: 11px 12px;
  }

  textarea {
    min-height: 90px;
    resize: vertical;
  }

  select[multiple] {
    min-height: 120px;
  }
`;

const PreviewLink = styled.a`
  display: inline-flex;
  margin-top: 14px;
  color: #93c5fd;
  font-weight: 800;
`;

const UploadArea = styled.button`
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  color: #9aa2b2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const InlineAdd = styled.div`
  display: grid;
  grid-template-columns: 1fr 42px;
  gap: 8px;

  button {
    border: none;
    border-radius: 10px;
    background: #1f2937;
    color: #fff;
    cursor: pointer;
  }
`;

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;

  button {
    border: none;
    border-radius: 999px;
    background: rgba(37, 99, 235, 0.16);
    color: #93c5fd;
    padding: 7px 10px;
    cursor: pointer;
  }
`;

const ReadOnlyLine = styled.div`
  margin-top: 12px;
  color: #aeb5c3;
`;

const CheckLine = styled.label`
  display: flex !important;
  align-items: center;
  gap: 8px;

  input {
    width: auto;
  }
`;

const GooglePreview = styled.div`
  background: #fff;
  color: #202124;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;

  span,
  p {
    color: #4d5156;
    font-size: 0.82rem;
    margin: 0;
  }

  strong {
    display: block;
    color: #1a0dab;
    font-size: 1rem;
    font-weight: 500;
    margin: 5px 0;
  }
`;

const CounterInput = styled.div`
  position: relative;

  span {
    position: absolute;
    right: 10px;
    bottom: 8px;
    color: ${(props) => (props.$over ? '#ef4444' : '#7f8794')};
    font-size: 0.72rem;
  }
`;
