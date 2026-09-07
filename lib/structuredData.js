import { site } from '../data/siteContent';
import { absoluteUrl, canonical } from './seo';
import { stripHtml } from './blog';

const orgId = `${site.url}/#organization`;
const localBusinessId = `${site.url}/#localbusiness`;

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, compact(item)])
        .filter(([, item]) => item !== undefined && item !== null && item !== '')
    );
  }
  return value;
}

export function organizationSchema() {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': orgId,
    name: site.name,
    url: site.url,
    logo: absoluteUrl(site.logo),
    image: absoluteUrl(site.socialImage),
    description: site.description,
    email: site.email,
    telephone: site.phone,
    sameAs: site.sameAs
  });
}

export function localBusinessSchema() {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': localBusinessId,
    name: site.name,
    url: site.url,
    image: absoluteUrl(site.socialImage),
    logo: absoluteUrl(site.logo),
    description: site.description,
    email: site.email,
    telephone: site.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address?.street,
      addressLocality: site.address?.locality,
      addressRegion: site.address?.region,
      addressCountry: site.address?.country
    },
    parentOrganization: {
      '@id': orgId
    }
  });
}

export function breadcrumbSchema(items = []) {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonical(item.path)
    }))
  });
}

export function websiteSchema() {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: site.url,
    publisher: {
      '@id': orgId
    }
  });
}

export function courseSchema(course) {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.summary,
    url: canonical(`/courses/${course.slug}`),
    image: absoluteUrl(course.image),
    provider: {
      '@id': orgId,
      name: site.name,
      sameAs: site.url
    },
    educationalCredentialAwarded: 'Certificate',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Blended',
      courseWorkload: course.duration,
      location: {
        '@id': localBusinessId
      }
    },
    teaches: [...(course.outcomes || []), ...(course.modules || [])]
  });
}

export function blogPostingSchema(post) {
  const path = `/blogs/${post.slug}`;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    image: post.coverImage ? [absoluteUrl(post.coverImage)] : [absoluteUrl(site.socialImage)],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.authorName || site.name
    },
    publisher: {
      '@id': orgId
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical(path)
    },
    articleSection: post.category,
    keywords: post.tags,
    wordCount: stripHtml(post.contentHtml || '').split(/\s+/).filter(Boolean).length
  });
}
