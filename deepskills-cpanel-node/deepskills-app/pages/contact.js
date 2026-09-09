import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import ContactPage from '../src/ContactPage';
import { breadcrumbSchema, localBusinessSchema } from '../lib/structuredData';

export default function Contact() {
  return (
    <PublicLayout>
      <Seo
        title="Contact"
        description="Contact DeepSkills admissions for course guidance and inquiries."
        path="/contact"
        jsonLd={[
          localBusinessSchema(),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' }
          ])
        ]}
      />
      <ContactPage />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
