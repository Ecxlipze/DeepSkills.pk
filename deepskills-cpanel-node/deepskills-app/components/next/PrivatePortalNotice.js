import Link from 'next/link';
import Seo from './Seo';

export default function PrivatePortalNotice({ area = 'Portal' }) {
  return (
    <>
      <Seo title={area} description={`${area} is a private DeepSkills workspace.`} path={`/${area.toLowerCase()}`} noindex />
      <section className="simplePage">
        <p className="eyebrow">Private workspace</p>
        <h1>{area}</h1>
        <p>This route is intentionally excluded from the SSR/SSG SEO migration because it is not public-facing indexing content.</p>
        <Link href="/" className="buttonPrimary">
          Return home
        </Link>
      </section>
    </>
  );
}
