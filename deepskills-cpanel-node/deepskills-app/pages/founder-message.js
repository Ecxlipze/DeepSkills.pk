import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import FounderMessage from '../src/FounderMessage';
import { breadcrumbSchema } from '../lib/structuredData';

export default function FounderMessagePage() {
  return (
    <PublicLayout>
      <Seo
        title="Founder Message"
        description="A message from DeepSkills leadership about practical skill development."
        path="/founder-message"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Founder Message', path: '/founder-message' }
        ])}
      />
      <FounderMessage />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
