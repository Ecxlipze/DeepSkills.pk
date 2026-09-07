import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import PublicLayout from '../../components/next/PublicLayout';
import Seo from '../../components/next/Seo';
import { courses } from '../../data/siteContent';
import { fetchAllPublishedSlugs, fetchPostBySlug, fetchRelatedPosts, normalizePost } from '../../lib/blog';
import { blogPostingSchema, breadcrumbSchema } from '../../lib/structuredData';
import { maybeRevalidate, staticFallback } from '../../lib/rendering';
import SmartCoverImage from '../../components/next/SmartCoverImage';
import { trackEvent } from '../../lib/analytics';

const MotionLink = motion.create('a');
const BlogCoverImage = SmartCoverImage;

const fadeUp = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 }
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export default function BlogPost({ post, relatedPosts, relatedCourses }) {
  const router = useRouter();
  const [livePost, setLivePost] = useState(post || null);
  const [liveRelatedPosts, setLiveRelatedPosts] = useState(relatedPosts || []);
  const [notFound, setNotFound] = useState(false);

  // On the Node deploy this never runs (fallback:'blocking' always provides the
  // post). It is the runtime engine for the static-export deploy, where
  // /blogs/<new-slug> is rewritten by .htaccess to the /blogs/post shell and the
  // post must be fetched client-side until the next rebuild picks it up.
  useEffect(() => {
    if (livePost || !router.isReady) return;
    const slug = router.query.slug || window.location.pathname.split('/').filter(Boolean).pop();
    if (!slug) return;

    let mounted = true;
    const loadPost = async () => {
      try {
        const { supabasePublic } = await import('../../src/supabasePublicClient');
        const { data, error } = await supabasePublic
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle();

        if (!mounted) return;
        if (error || !data) {
          setNotFound(true);
          return;
        }

        const normalizedPost = normalizePost(data);
        setLivePost(normalizedPost);

        if (normalizedPost.category) {
          const { data: related } = await supabasePublic
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .eq('category', normalizedPost.category)
            .neq('slug', normalizedPost.slug)
            .order('published_at', { ascending: false })
            .limit(3);

          if (mounted) setLiveRelatedPosts((related || []).map(normalizePost));
        }
      } catch (error) {
        console.error('Blog detail client fetch failed:', error);
        if (mounted) setNotFound(true);
      }
    };

    loadPost();
    return () => {
      mounted = false;
    };
  }, [livePost, router.isReady, router.query.slug]);

  useEffect(() => {
    if (!livePost) return;
    fetch('/api/blog-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: livePost.slug })
    }).catch(() => {});
    trackEvent('blog_view', {
      blog_slug: livePost.slug,
      blog_category: livePost.category
    });
  }, [livePost]);

  if (!livePost) {
    return (
      <PublicLayout>
        {/* Keep the initial export shell crawlable. Google may skip rendering
            HTML that starts with noindex, even if JS later removes it. */}
        <Seo title="Blog" path={null} noindex={notFound} />
        <ArticleShell>
          <EmptyState>{notFound ? 'Blog post not found.' : 'Loading blog post...'}</EmptyState>
          <BackLink href="/blogs" whileHover={{ x: -4 }} whileTap={{ scale: 0.98 }}>Back to Blogs</BackLink>
        </ArticleShell>
      </PublicLayout>
    );
  }

  const toc = buildTableOfContents(livePost.contentHtml);
  const visibleRelatedCourses = courses.filter((course) => livePost.relatedCourseIds?.includes(course.id) || livePost.relatedCourseIds?.includes(course.slug));

  return (
    <PublicLayout>
      <Seo
        title={livePost.metaTitle || `${livePost.title} | DeepSkills Blog`}
        description={livePost.metaDescription || livePost.excerpt}
        path={`/blogs/${livePost.slug}`}
        image={livePost.coverImage}
        type="article"
        publishedTime={livePost.publishedAt}
        modifiedTime={livePost.updatedAt || livePost.publishedAt}
        jsonLd={[
          blogPostingSchema(livePost),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blogs', path: '/blogs' },
            { name: livePost.title, path: `/blogs/${livePost.slug}` }
          ])
        ]}
      />
      <ArticleShell>
        <ArticleHeader
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <span className="category">{livePost.category}</span>
          <h1>{livePost.title}</h1>
          <div className="meta">
            <span className="avatar">{livePost.authorName?.[0] || 'D'}</span>
            <span>{livePost.authorName || 'DeepSkills Team'}</span>
            <span>{formatDate(livePost.publishedAt)}</span>
            <span>{livePost.readingTime || 1} min read</span>
          </div>
          <HeroImage
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.12, ease: 'easeOut' }}
          >
            {livePost.coverImage ? (
              <BlogCoverImage src={livePost.coverImage} alt={`${livePost.title} cover image`} sizes="100vw" priority />
            ) : (
              <div>{livePost.category}</div>
            )}
          </HeroImage>
        </ArticleHeader>

        <ArticleGrid>
          <Prose
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            dangerouslySetInnerHTML={{ __html: withHeadingIds(livePost.contentHtml) }}
          />
          <Sidebar variants={stagger} initial={false} animate="show">
            {toc.length > 0 && (
              <Panel variants={fadeUp} whileHover={{ y: -3 }}>
                <h2>Contents</h2>
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className={`level-${item.level}`}>
                    {item.text}
                  </a>
                ))}
              </Panel>
            )}
            <Panel variants={fadeUp} whileHover={{ y: -3 }}>
              <h2>Share</h2>
              <ShareRow>
                <a href={`https://wa.me/?text=${encodeURIComponent(livePost.title)}`} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(livePost.title)}`} target="_blank" rel="noreferrer">
                  X
                </a>
                <button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                  Copy Link
                </button>
              </ShareRow>
            </Panel>
            {visibleRelatedCourses.length > 0 && (
              <Panel variants={fadeUp} whileHover={{ y: -3 }}>
                <h2>Related Courses</h2>
                {visibleRelatedCourses.map((course) => (
                  <CourseLink
                    key={course.slug}
                    href={`/courses/${course.slug}`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <strong>{course.title}</strong>
                    <span>{course.duration}</span>
                  </CourseLink>
                ))}
              </Panel>
            )}
          </Sidebar>
        </ArticleGrid>

        <PostFooter
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {livePost.tags?.length > 0 && (
            <Tags>
              {livePost.tags.map((tag) => (
                <TagLink key={tag} href={`/blogs?tag=${encodeURIComponent(tag)}`} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
                  #{tag}
                </TagLink>
              ))}
            </Tags>
          )}

          {liveRelatedPosts.length > 0 && (
            <>
              <h2>Related Posts</h2>
              <RelatedGrid variants={stagger} initial={false} whileInView="show" viewport={{ once: true, amount: 0.2 }}>
                {liveRelatedPosts.map((item) => (
                  <RelatedCard key={item.slug} href={`/blogs/${item.slug}`} variants={fadeUp} whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
                    <span>{item.category}</span>
                    <strong>{item.title}</strong>
                    <small>{item.readingTime || 1} min read</small>
                  </RelatedCard>
                ))}
              </RelatedGrid>
            </>
          )}

          <BackLink href="/blogs" whileHover={{ x: -4 }} whileTap={{ scale: 0.98 }}>Back to Blogs</BackLink>
        </PostFooter>
      </ArticleShell>
    </PublicLayout>
  );
}

export async function getStaticPaths() {
  const slugs = await fetchAllPublishedSlugs();

  return {
    paths: slugs.map((post) => ({ params: { slug: post.slug } })),
    // 'blocking' server-renders brand-new slugs on first request so crawlers
    // never see a loading shell; export builds must use false.
    fallback: staticFallback('blocking')
  };
}

export async function getStaticProps({ params }) {
  const post = params?.slug ? await fetchPostBySlug(params.slug) : null;

  if (!post) {
    return {
      notFound: true,
      ...maybeRevalidate(60)
    };
  }

  const relatedPosts = await fetchRelatedPosts(post);
  const relatedCourses = courses.filter((course) => post.relatedCourseIds?.includes(course.id) || post.relatedCourseIds?.includes(course.slug));

  return {
    props: {
      post,
      relatedPosts,
      relatedCourses
    },
    ...maybeRevalidate(60)
  };
}

function formatDate(date) {
  if (!date) return 'Published';
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function headingId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildTableOfContents(html = '') {
  const headings = [];
  html.replace(/<h([23])[^>]*>(.*?)<\/h[23]>/gi, (_, level, rawText) => {
    const text = rawText.replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ level, text, id: headingId(text) });
    return '';
  });
  return headings;
}

function withHeadingIds(html = '') {
  return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (match, level, attrs, rawText) => {
    if (/id=/.test(attrs)) return match;
    const text = rawText.replace(/<[^>]+>/g, '').trim();
    return `<h${level}${attrs} id="${headingId(text)}">${rawText}</h${level}>`;
  });
}

const ArticleShell = styled.article`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 130px 0 90px;
  color: #fff;
`;

const ArticleHeader = styled(motion.header)`
  max-width: 980px;
  margin: 0 auto 44px;

  .category {
    display: inline-flex;
    background: rgba(217, 74, 94, 0.14);
    color: #ff8a9b;
    padding: 8px 12px;
    border: 1px solid rgba(123, 31, 46, 0.55);
    border-radius: 8px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.76rem;
    margin-bottom: 18px;
  }

  h1 {
    margin: 0 0 18px;
    font-size: clamp(2.35rem, 5.5vw, 5rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: 0;
  }

  .meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 14px;
    color: #a8afbd;
    margin-bottom: 28px;
  }

  .avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #7b1f2e;
    color: #fff;
    font-weight: 900;
  }
`;

const HeroImage = styled(motion.div)`
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 15px;
  background: #151515;
  border: 1px solid rgba(123, 31, 46, 0.35);

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  div {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(123, 31, 46, 0.92), #141414 62%, #050505);
    color: #d7dbe5;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
`;

const ArticleGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 48px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Prose = styled(motion.div)`
  max-width: 760px;
  color: #dedede;
  font-size: 1.08rem;
  line-height: 1.86;

  h1,
  h2,
  h3 {
    color: #fff;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.14;
    margin: 2em 0 0.7em;
  }

  h2 {
    font-size: 2rem;
  }

  h3 {
    font-size: 1.45rem;
  }

  p,
  ul,
  ol,
  blockquote {
    margin: 0 0 1.25em;
  }

  a {
    color: #ff8a9b;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 15px;
    margin: 24px 0;
  }

  blockquote {
    border-left: 4px solid #7b1f2e;
    padding-left: 18px;
    color: #fff;
    background: rgba(123, 31, 46, 0.1);
    padding-top: 14px;
    padding-bottom: 14px;
  }
`;

const Sidebar = styled(motion.aside)`
  position: sticky;
  top: 98px;
  display: grid;
  gap: 16px;

  @media (max-width: 980px) {
    position: static;
  }
`;

const Panel = styled(motion.div)`
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(123, 31, 46, 0.34);
  border-radius: 15px;
  padding: 18px;

  h2 {
    margin: 0 0 14px;
    font-weight: 800;
    letter-spacing: 0;
    font-size: 1rem;
  }

  a {
    display: block;
    color: #d0d0d0;
    text-decoration: none;
    margin: 10px 0;
    line-height: 1.4;
  }

  a.level-3 {
    padding-left: 14px;
    font-size: 0.92rem;
  }
`;

const ShareRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  a,
  button {
    border: 1px solid rgba(123, 31, 46, 0.5);
    background: rgba(123, 31, 46, 0.12);
    color: #fff;
    border-radius: 8px;
    padding: 8px 11px;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
  }

  a:hover,
  button:hover {
    transform: translateY(-2px);
    border-color: rgba(217, 74, 94, 0.72);
    background: rgba(123, 31, 46, 0.26);
  }
`;

const CourseLink = styled(MotionLink)`
  padding: 12px;
  border-radius: 10px;
  background: rgba(123, 31, 46, 0.1);
  border: 1px solid rgba(123, 31, 46, 0.22);

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 4px;
    color: #8f96a3;
    font-size: 0.84rem;
  }
`;

const PostFooter = styled(motion.footer)`
  max-width: 900px;
  margin-top: 54px;

  > h2 {
    font-weight: 800;
    letter-spacing: 0;
    font-size: 1.7rem;
    margin: 34px 0 16px;
  }
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const TagLink = styled(MotionLink)`
    color: #ffb0bd;
    background: rgba(123, 31, 46, 0.16);
    border: 1px solid rgba(123, 31, 46, 0.38);
    border-radius: 8px;
    padding: 8px 12px;
    text-decoration: none;
    transition: background 0.25s ease, border-color 0.25s ease;

    &:hover {
      background: rgba(123, 31, 46, 0.26);
      border-color: rgba(217, 74, 94, 0.7);
    }
`;

const RelatedGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const RelatedCard = styled(MotionLink)`
    display: grid;
    gap: 7px;
    padding: 18px;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.025);
    color: #fff;
    text-decoration: none;
    border: 1px solid rgba(123, 31, 46, 0.34);
    transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.045);
      border-color: rgba(217, 74, 94, 0.64);
      box-shadow: 0 14px 28px rgba(122, 30, 45, 0.18);
    }

  span {
    color: #d94a5e;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  small {
    color: #8f96a3;
  }
`;

const BackLink = styled(MotionLink)`
  display: inline-flex;
  margin-top: 34px;
  color: #d94a5e;
  font-weight: 900;
`;

const EmptyState = styled.div`
  min-height: 44vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a8afbd;
  font-weight: 800;
  text-align: center;
`;
