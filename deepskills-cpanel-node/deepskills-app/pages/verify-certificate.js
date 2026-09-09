import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import VerifyCertificatePage from '../src/VerifyCertificatePage';
import { breadcrumbSchema } from '../lib/structuredData';

export default function VerifyCertificate() {
  return (
    <PublicLayout>
      <Seo
        title="Verify Certificate"
        description="Verify the authenticity of a DeepSkills certificate using its certificate number."
        path="/verify-certificate"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Verify Certificate', path: '/verify-certificate' }
        ])}
      />
      <VerifyCertificatePage />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
