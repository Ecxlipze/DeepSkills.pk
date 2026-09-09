import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import PublicLayout from '../../components/next/PublicLayout';
import Seo from '../../components/next/Seo';
import { BLOG_CATEGORIES, fetchPublishedPosts } from '../../lib/blog';
import { breadcrumbSchema } from '../../lib/structuredData';
import { maybeRevalidate } from '../../lib/rendering';
import SmartCoverImage from '../../components/next/SmartCoverImage';

const POSTS_PER_PAGE = 9;
const MotionLink = motion.create('a');
const BlogCoverImage = SmartCoverImage;

const fadeUp = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 }
};

const gridReveal = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export default function BlogIndex({ posts }) {
  // Posts come from getStaticProps (ISR/on-demand revalidation keeps them fresh);
  // the old client-side refetch duplicated the same query on every visit.
  const livePosts = posts || [];
  const [category, setCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPosts = useMemo(() => {
    if (category === 'All') return livePosts;
    return livePosts.filter((post) => post.category === category);
  }, [category, livePosts]);

  const featured = filteredPosts.find((post) => post.isFeatured);
  const rest = filteredPosts.filter((post) => post.slug !== featured?.slug);
  const totalPages = Math.max(1, Math.ceil(rest.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * POSTS_PER_PAGE;
  const visiblePosts = rest.slice(pageStart, pageStart + POSTS_PER_PAGE);

  return (
    <PublicLayout>
      <Seo
        title="Blogs"
        description="Tips, guides and insights on tech skills, career growth and learning."
        path="/blogs"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blogs', path: '/blogs' }
        ])}
      />
      <BlogShell>
        <Hero
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1>DeepSkills Blog</h1>
          <p>Tips, guides and insights on tech skills, career growth and learning.</p>
          <CategoryScroller aria-label="Filter blog posts by category">
            {['All', ...BLOG_CATEGORIES].map((item) => (
              <CategoryButton
                key={item}
                type="button"
                className={category === item ? 'active' : ''}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setCategory(item);
                  setCurrentPage(1);
                }}
              >
                {item}
              </CategoryButton>
            ))}
          </CategoryScroller>
        </Hero>

        {featured && <FeaturedPost post={featured} />}

        {visiblePosts.length > 0 ? (
          <Grid key={`${category}-${safePage}`} variants={gridReveal} initial={false} animate="show">
            {visiblePosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </Grid>
        ) : (
          <EmptyState>No posts yet. Check back soon!</EmptyState>
        )}

        {rest.length > POSTS_PER_PAGE && (
          <Pagination
            aria-label="Blog pagination"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={safePage === page ? 'active' : ''}
                aria-current={safePage === page ? 'page' : undefined}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
            >
              Next
            </button>
          </Pagination>
        )}
      </BlogShell>
    </PublicLayout>
  );
}

function FeaturedPost({ post }) {
  return (
    <Featured
      href={`/blogs/${post.slug}`}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <ImageFrame $featured>
        {post.coverImage ? (
          <BlogCoverImage src={post.coverImage} alt={`${post.title} cover image`} sizes="(max-width: 900px) 100vw, 55vw" priority />
        ) : (
          <FallbackImage>{post.category}</FallbackImage>
        )}
      </ImageFrame>
      <div className="featured-copy">
        <div className="featured-meta">
          <span>Featured</span>
          <span>{post.category}</span>
        </div>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <PostMeta post={post} />
        <strong>Read More</strong>
      </div>
    </Featured>
  );
}

function BlogCard({ post }) {
  return (
    <Card href={`/blogs/${post.slug}`} variants={fadeUp} whileHover={{ y: -6 }} whileTap={{ scale: 0.99 }}>
      <ImageFrame>
        {post.coverImage ? (
          <BlogCoverImage src={post.coverImage} alt={`${post.title} cover image`} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
        ) : (
          <FallbackImage>{post.category}</FallbackImage>
        )}
      </ImageFrame>
      <CardBody>
        <span className="category">{post.category}</span>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <PostMeta post={post} />
      </CardBody>
    </Card>
  );
}

function PostMeta({ post }) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Draft';

  return (
    <Meta>
      <span className="avatar">{post.authorName?.[0] || 'D'}</span>
      <span>{post.authorName || 'DeepSkills Team'}</span>
      <span>{date}</span>
      <span>{post.readingTime || 1} min read</span>
    </Meta>
  );
}

export async function getStaticProps() {
  const posts = await fetchPublishedPosts();

  return {
    props: {
      posts
    },
    ...maybeRevalidate(60)
  };
}

const BlogShell = styled.section`
  width: 100%;
  min-height: 100vh;
  background-color: #000;
  position: relative;
  overflow: hidden;
  padding: 130px 20px 90px;
  color: #fff;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 30%, rgba(123, 31, 46, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(123, 31, 46, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Hero = styled(motion.div)`
  max-width: 900px;
  margin: 0 auto 60px;
  text-align: center;
  position: relative;
  z-index: 2;

  &::after {
    content: '';
    display: block;
    width: min(360px, 70vw);
    height: 1px;
    margin: 30px auto 0;
    background: linear-gradient(90deg, transparent, #7b1f2e, transparent);
  }

  h1 {
    margin: 0 auto 16px;
    font-size: 3.2rem;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: 0;

    @media (max-width: 768px) {
      font-size: 2.1rem;
    }
  }

  p {
    max-width: 560px;
    margin: 0 auto 28px;
    color: #ccc;
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    line-height: 1.6;
  }
`;

const CategoryScroller = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;

`;

const CategoryButton = styled(motion.button)`
    border: 1px solid rgba(123, 31, 46, 0.55);
    background: rgba(123, 31, 46, 0.08);
    color: #e8e8e8;
    border-radius: 8px;
    padding: 10px 18px;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;

    &:hover {
      border-color: #d94a5e;
      background: rgba(123, 31, 46, 0.22);
      box-shadow: 0 10px 24px rgba(123, 31, 46, 0.22);
    }

  &.active {
    background: #7b1f2e;
    border-color: #d94a5e;
    color: #fff;
    box-shadow: 0 0 0 3px rgba(217, 74, 94, 0.12);
  }
`;

const Featured = styled(MotionLink)`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  width: min(1180px, 100%);
  margin: 0 auto 38px;
  overflow: hidden;
  border-radius: 15px;
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-decoration: none;
  color: #fff;
  backdrop-filter: blur(10px);
  transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;

  &:hover {
    background: rgba(40, 40, 40, 0.9);
    border-color: #cd7c7c;
    box-shadow: 0 15px 30px rgba(122, 30, 45, 0.2);
  }

  .featured-copy {
    padding: clamp(24px, 4vw, 44px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .featured-meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .featured-meta span {
    padding: 7px 10px;
    border-radius: 8px;
    background: rgba(123, 31, 46, 0.28);
    color: #ffb0bd;
    font-size: 0.74rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  h2 {
    font-size: clamp(1.8rem, 3vw, 3rem);
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.16;
    margin: 0 0 14px;
  }

  p {
    color: #d9d9d9;
    line-height: 1.7;
    margin: 0 0 18px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  strong {
    margin-top: 20px;
    color: #d94a5e;
    font-weight: 800;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Grid = styled(motion.div)`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(MotionLink)`
  overflow: hidden;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(25, 25, 25, 0.8);
  color: #fff;
  text-decoration: none;
  backdrop-filter: blur(10px);
  transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;

  &:hover {
    border-color: #cd7c7c;
    background: rgba(40, 40, 40, 0.9);
    box-shadow: 0 15px 30px rgba(122, 30, 45, 0.2);
  }

  &:hover h2 {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
`;

const ImageFrame = styled.div`
  position: relative;
  aspect-ratio: ${(props) => (props.$featured ? '16 / 10' : '16 / 9')};
  min-height: ${(props) => (props.$featured ? '360px' : 'auto')};
  background: #151515;
  overflow: hidden;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.45s ease, filter 0.45s ease;
  }

  ${Featured}:hover & img,
  ${Card}:hover & img {
    transform: scale(1.05);
    filter: saturate(1.08) contrast(1.04);
  }

  @media (max-width: 860px) {
    min-height: 260px;
  }
`;

const FallbackImage = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 20%, rgba(217, 74, 94, 0.48), transparent 34%),
    linear-gradient(135deg, rgba(123, 31, 46, 0.92), #141414 62%, #050505);
  color: rgba(255, 255, 255, 0.82);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const CardBody = styled.div`
  padding: 25px;

  .category {
    color: #d94a5e;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 10px 0 10px;
    font-size: 1.3rem;
    font-weight: 800;
    line-height: 1.35;
    letter-spacing: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  p {
    margin: 0 0 16px;
    color: #d3d3d3;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  color: #8f96a3;
  font-size: 0.82rem;

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #7b1f2e;
    color: #fff;
    font-weight: 900;
  }
`;

const EmptyState = styled.div`
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 70px 20px;
  text-align: center;
  color: #9ca3af;
  border: 1px dashed rgba(123, 31, 46, 0.5);
  border-radius: 15px;
`;

const Pagination = styled(motion.nav)`
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 38px auto 0;

  button {
    min-width: 42px;
    min-height: 42px;
    border: 1px solid rgba(123, 31, 46, 0.55);
    border-radius: 8px;
    background: rgba(123, 31, 46, 0.08);
    color: #fff;
    padding: 0 14px;
    font-family: 'Inter', sans-serif;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease, opacity 0.25s ease;
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: #d94a5e;
    background: rgba(123, 31, 46, 0.22);
  }

  button.active {
    background: linear-gradient(135deg, #7b1f2e, #9b283b);
    border-color: #d94a5e;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }
`;
