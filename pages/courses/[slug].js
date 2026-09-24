import Link from 'next/link';
import styled from 'styled-components';
import PublicLayout from '../../components/next/PublicLayout';
import Seo from '../../components/next/Seo';
import FullStackPage from '../../src/FullStackPage';
import WordPressPage from '../../src/WordPressPage';
import LaravelPage from '../../src/LaravelPage';
import GraphicPage from '../../src/GraphicPage';
import DynamicCoursePage from '../../src/DynamicCoursePage';
import { courses, getCourseBySlug } from '../../data/siteContent';
import { fetchPublishedPosts } from '../../lib/blog';
import { breadcrumbSchema, courseSchema } from '../../lib/structuredData';
import { maybeRevalidate, staticFallback } from '../../lib/rendering';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import { slugify } from '../../lib/careers';

const courseComponents = {
  'full-stack-react': FullStackPage,
  'wordpress-mastery': WordPressPage,
  'laravel-mastery': LaravelPage,
  'graphic-design': GraphicPage
};

export default function CourseDetail({ course, relatedBlogs = [] }) {
  const CourseComponent = courseComponents[course.slug];

  return (
    <PublicLayout>
      <Seo
        title={`${course.title} Course`}
        description={course.summary || course.description}
        path={`/courses/${course.slug}`}
        image={course.image}
        jsonLd={[
          courseSchema(course),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Courses', path: '/courses' },
            { name: course.title, path: `/courses/${course.slug}` }
          ])
        ]}
      />
      {CourseComponent ? (
        <CourseComponent />
      ) : (
        <DynamicCoursePage course={course} />
      )}
      {relatedBlogs.length > 0 ? (
        <RelatedBlogs aria-label="Related blog posts">
          <div>
            <span>From the blog</span>
            <h2>Related Guides</h2>
          </div>
          <BlogLinks>
            {relatedBlogs.map((post) => (
              <Link key={post.slug} href={`/blogs/${post.slug}`}>
                <strong>{post.title}</strong>
                <small>{post.category} · {post.readingTime || 1} min read</small>
              </Link>
            ))}
          </BlogLinks>
        </RelatedBlogs>
      ) : null}
    </PublicLayout>
  );
}

export async function getStaticPaths() {
  const staticPaths = courses.map((course) => ({ params: { slug: course.slug } }));

  let dbPaths = [];
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('courses')
        .select('slug, title, status')
        .eq('status', 'active');
      if (data) {
        dbPaths = data.map((c) => ({
          params: { slug: c.slug || slugify(c.title) }
        }));
      }
    } catch {
      // Gracefully continue with static paths if DB is unavailable during build
    }
  }

  const fallbackKnownPaths = [
    { params: { slug: 'ui-ux-design' } },
    { params: { slug: 'seo-digital-marketing' } }
  ];

  const allPaths = [...staticPaths, ...dbPaths, ...fallbackKnownPaths];
  const uniquePaths = Array.from(new Map(allPaths.map(p => [p.params.slug, p])).values());

  return {
    paths: uniquePaths,
    fallback: staticFallback('blocking')
  };
}

export async function getStaticProps({ params }) {
  const { slug } = params;

  // 1. Check static siteContent first (for existing bespoke courses)
  let course = getCourseBySlug(slug);

  // 2. If not found, fetch from Supabase
  if (!course) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'active');

        if (data && data.length > 0) {
          const match = data.find((c) => (c.slug || slugify(c.title)) === slug);
          if (match) {
            course = {
              id: match.id,
              slug: match.slug || slugify(match.title),
              title: match.title,
              category: match.category || 'Professional Skills',
              summary: match.description || `Master ${match.title} with hands-on projects and industry-ready mentorship at DeepSkills.`,
              description: match.description,
              duration: match.duration || '3 months',
              price: match.price,
              image: match.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
              outcomes: Array.isArray(match.outcomes) ? match.outcomes : [
                'Hands-on practical industry projects',
                'Direct mentorship from experienced practitioners',
                'Job-ready portfolio and interview prep',
                'DeepSkills verified certificate of completion'
              ],
              modules: Array.isArray(match.modules) ? match.modules : [
                'Foundations & Setup',
                'Core Concepts & Implementation',
                'Advanced Real-world Projects',
                'Portfolio Development & Career Readiness'
              ],
              accent_color: (match.accent_color && !match.accent_color.toLowerCase().includes('blue')) ? match.accent_color : '#7B1F2E'
            };
          }
        }
      } catch (err) {
        console.error('[courses/[slug]] Supabase fetch error:', err.message);
      }
    }
  }

  // 3. Fallback for built-in catalog courses
  if (!course) {
    if (slug === 'ui-ux-design') {
      course = {
        slug: 'ui-ux-design',
        title: 'UI/UX Design',
        category: 'Creative Design',
        summary: 'Master user research, wireframing, prototyping, and visual design using Figma to build human-centered digital products.',
        duration: '3 months',
        price: 'PKR 35,000',
        image: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=1200&q=80',
        outcomes: [
          'Design thinking and user research methodologies',
          'Wireframing, prototyping, and design systems in Figma',
          'Usability testing and mobile-first responsive design',
          'Comprehensive design portfolio ready for client & agency work'
        ],
        modules: [
          'UX Fundamentals, Personas & User Journeys',
          'UI Principles, Typography, Color & Layouts',
          'Mastering Figma: Components, Auto-Layout & Variants',
          'Interactive Prototyping, Micro-Interactions & Case Study Presentation'
        ],
        accent_color: '#7B1F2E'
      };
    } else if (slug === 'seo-digital-marketing') {
      course = {
        slug: 'seo-digital-marketing',
        title: 'SEO & Digital Marketing',
        category: 'Digital Marketing',
        summary: 'Learn search engine optimization, content strategy, social media campaigns, and performance marketing to drive measurable business growth.',
        duration: '3 months',
        price: 'PKR 35,000',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        outcomes: [
          'Technical and On-Page SEO optimization',
          'Keyword research, competitor analysis, and backlink strategies',
          'Paid advertising (Google Ads, Meta Ads) and ROI tracking',
          'Data-driven marketing analytics and conversion rate optimization'
        ],
        modules: [
          'Digital Marketing Landscape & Brand Positioning',
          'Search Engine Optimization (On-Page, Technical & Off-Page)',
          'Performance Marketing: Meta & Google Ads Mastery',
          'Content Marketing, Email Automation & Google Analytics 4'
        ],
        accent_color: '#7B1F2E'
      };
    }
  }

  if (!course) {
    return { notFound: true };
  }

  const posts = await fetchPublishedPosts();
  const relatedBlogs = posts
    .filter((post) => post.relatedCourseIds?.includes(course.slug) || post.relatedCourseIds?.includes(course.id))
    .slice(0, 3);

  return {
    props: {
      course,
      relatedBlogs
    },
    ...maybeRevalidate(3600)
  };
}

const RelatedBlogs = styled.section`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto 90px;
  color: #fff;

  > div:first-child {
    margin-bottom: 18px;
  }

  span {
    color: #d94a5e;
    font-size: 0.76rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 8px 0 0;
    font-size: clamp(1.7rem, 3vw, 2.5rem);
    font-weight: 800;
    letter-spacing: 0;
  }
`;

const BlogLinks = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  a {
    display: grid;
    gap: 8px;
    min-height: 130px;
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(123, 31, 46, 0.34);
    background: rgba(255, 255, 255, 0.025);
    color: #fff;
    text-decoration: none;
    transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
  }

  a:hover {
    transform: translateY(-4px);
    border-color: rgba(217, 74, 94, 0.64);
    background: rgba(255, 255, 255, 0.045);
  }

  small {
    color: #8f96a3;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;
