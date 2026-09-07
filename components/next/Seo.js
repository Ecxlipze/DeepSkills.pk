import Head from 'next/head';
import { absoluteUrl, canonical, pageTitle } from '../../lib/seo';
import { site } from '../../data/siteContent';

export default function Seo({
  title,
  description = site.description,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  jsonLd = [],
  publishedTime,
  modifiedTime
}) {
  const fullTitle = pageTitle(title);
  // A client-loaded article has no known canonical until its slug is resolved.
  const url = path === null ? null : canonical(path);
  const socialImage = absoluteUrl(image || site.socialImage);
  const structuredData = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      {url ? <link rel="canonical" href={url} /> : null}
      {gscVerification ? <meta name="google-site-verification" content={gscVerification} /> : null}
      <meta property="og:site_name" content={site.name} />
      <meta property="og:locale" content="en_PK" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {url ? <meta property="og:url" content={url} /> : null}
      <meta property="og:image" content={socialImage} />
      {publishedTime ? <meta property="article:published_time" content={publishedTime} /> : null}
      {modifiedTime ? <meta property="article:modified_time" content={modifiedTime} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImage} />
      {structuredData.filter(Boolean).map((schema, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      ))}
    </Head>
  );
}
