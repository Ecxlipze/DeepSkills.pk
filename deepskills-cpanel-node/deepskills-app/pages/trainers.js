import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import TraineePage from '../src/TraineePage';
import { breadcrumbSchema } from '../lib/structuredData';
import { getSupabaseServerClient } from '../lib/supabaseServer';
import { maybeRevalidate } from '../lib/rendering';

export default function Trainers({ initialInstructors }) {
  return (
    <PublicLayout>
      <Seo
        title="Trainers"
        description="Meet the DeepSkills training approach and mentor-led learning model."
        path="/trainers"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Trainers', path: '/trainers' }
        ])}
      />
      <TraineePage initialInstructors={initialInstructors} />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  let initialInstructors = null;
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error) {
      initialInstructors = data ?? null;
    }
  }

  return {
    props: { initialInstructors },
    ...maybeRevalidate(300)
  };
}
