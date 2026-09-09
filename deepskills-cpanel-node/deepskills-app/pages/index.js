import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import HomePage from '../src/HomePage';
import { localBusinessSchema, organizationSchema, websiteSchema } from '../lib/structuredData';
import { getSupabaseServerClient } from '../lib/supabaseServer';
import { maybeRevalidate } from '../lib/rendering';

export default function Home({ home }) {
  return (
    <PublicLayout>
      <Seo
        path="/"
        jsonLd={[organizationSchema(), localBusinessSchema(), websiteSchema()]}
      />
      <HomePage content={home || {}} />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  const home = { hero: null, about: null, offers: null, courses: null, testimonials: null };
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const [settingsRes, coursesRes, testimonialsRes] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', ['hero_content', 'about_content', 'offers']),
      supabase.from('courses').select('*').order('created_at', { ascending: true }),
      supabase.from('testimonials').select('*').order('created_at', { ascending: false })
    ]);

    const settings = settingsRes.data || [];
    home.hero = settings.find((s) => s.key === 'hero_content')?.value ?? null;
    home.about = settings.find((s) => s.key === 'about_content')?.value ?? null;
    home.offers = settings.find((s) => s.key === 'offers')?.value ?? null;
    home.courses = coursesRes.data ?? null;
    home.testimonials = testimonialsRes.data ?? null;
  }

  return {
    props: { home },
    ...maybeRevalidate(300)
  };
}
