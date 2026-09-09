import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import AboutPage from '../src/AboutPage';
import { breadcrumbSchema } from '../lib/structuredData';

export default function About() {
  return (
    <PublicLayout>
      <Seo
        title="About DeepSkills"
        description="Learn about DeepSkills practical training approach, mission, and learner support."
        path="/about"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About DeepSkills', path: '/about' }
        ])}
      />
      <AboutPage />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
