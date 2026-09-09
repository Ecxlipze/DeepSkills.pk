import Link from 'next/link';
import styled from 'styled-components';
import PublicLayout from '../../components/next/PublicLayout';
import Seo from '../../components/next/Seo';
import FullStackPage from '../../src/FullStackPage';
import WordPressPage from '../../src/WordPressPage';
import LaravelPage from '../../src/LaravelPage';
import GraphicPage from '../../src/GraphicPage';
import { courses, getCourseBySlug } from '../../data/siteContent';
import { fetchPublishedPosts } from '../../lib/blog';
import { breadcrumbSchema, courseSchema } from '../../lib/structuredData';
import { maybeRevalidate, staticFallback } from '../../lib/rendering';

const courseComponents = {
  'full-stack-react': FullStackPage,
  'wordpress-mastery': WordPressPage,
  'laravel-mastery': LaravelPage,
  'graphic-design': GraphicPage
};

export default function CourseDetail({ course, relatedBlogs }) {
  const CourseComponent = courseComponents[course.slug];

  return (
    <PublicLayout>
      <Seo
        title={course.title}
        description={course.summary}
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
      <CourseComponent />
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
  return {
    paths: courses.map((course) => ({ params: { slug: course.slug } })),
    fallback: staticFallback('blocking')
  };
}

export async function getStaticProps({ params }) {
  const course = getCourseBySlug(params.slug);

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
