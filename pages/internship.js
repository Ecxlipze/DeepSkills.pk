import PublicLayout from '../components/next/PublicLayout';
import Seo from '../components/next/Seo';
import InternshipPage from '../src/InternshipPage';
import { breadcrumbSchema } from '../lib/structuredData';

export default function Internship() {
  return (
    <PublicLayout>
      <Seo
        title="3-Month Onsite Internship in Lahore | DeepSkills"
        description="DeepSkills is hiring onsite interns in Gulberg, Lahore for Video Editor, Social Media Handler, and Graphic Designer roles. Freshers welcome, 2 certificates, international certification, and portfolio-ready mentorship."
        path="/internship"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Internships', path: '/internship' },
        ])}
      />
      <InternshipPage />
    </PublicLayout>
  );
}

export async function getStaticProps() {
  return { props: {} };
}
