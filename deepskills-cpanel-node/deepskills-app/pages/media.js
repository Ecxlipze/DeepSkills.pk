import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import MediaPage from '../src/MediaPage';
import { breadcrumbSchema } from '../lib/structuredData';
import { getSupabaseServerClient } from '../lib/supabaseServer';
import { maybeRevalidate } from '../lib/rendering';

export default function Media({ initialItems }) {
  return (
    <PublicLayout>
      <Seo
        title="Media"
        description="DeepSkills media, student showcases, workshops, and training highlights."
        path="/media"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Media', path: '/media' }
        ])}
      />
      <MediaPage initialItems={initialItems || []} />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  let initialItems = [];
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error) {
      initialItems = data || [];
    }
  }

  return {
    props: { initialItems },
    ...maybeRevalidate(300)
  };
}
