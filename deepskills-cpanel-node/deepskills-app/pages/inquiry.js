import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import InquiryPage from '../src/InquiryPage';
import { breadcrumbSchema } from '../lib/structuredData';

export default function Inquiry() {
  return (
    <PublicLayout>
      <Seo
        title="Inquire Now"
        description="Submit a DeepSkills course inquiry and our counsellor will contact you within 24 hours."
        path="/inquiry"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Inquiry', path: '/inquiry' }
        ])}
      />
      <InquiryPage />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
