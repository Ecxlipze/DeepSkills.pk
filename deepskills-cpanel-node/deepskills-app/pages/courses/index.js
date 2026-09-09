import PublicLayout from '../../components/next/PublicLayout';
import Seo from '../../components/next/Seo';
import CoursesPage from '../../src/CoursesPage';
import { breadcrumbSchema } from '../../lib/structuredData';
import { getSupabaseServerClient } from '../../lib/supabaseServer';
import { maybeRevalidate } from '../../lib/rendering';

export default function Courses({ initialCourses }) {
  return (
    <PublicLayout>
      <Seo
        title="Courses"
        description="Explore DeepSkills course outlines in React, Laravel, WordPress, graphic design, and digital careers."
        path="/courses"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Courses', path: '/courses' }
        ])}
      />
      <CoursesPage initialCourses={initialCourses} />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  let initialCourses = null;
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error) {
      initialCourses = data ?? null;
    }
  }

  return {
    props: { initialCourses },
    ...maybeRevalidate(300)
  };
}
