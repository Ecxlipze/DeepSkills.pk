const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://deepskills.pk').replace(/\/+$/, '');
const isExport = process.env.NEXT_OUTPUT === 'export';

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl,
  trailingSlash: true,
  generateRobotsTxt: true,
  sitemapSize: 7000,
  // Static export writes pages to out/, and the sitemap must ship with them.
  outDir: isExport ? 'out' : 'public',
  exclude: ['/admin/*', '/admin/blog/*', '/student/*', '/teacher/*', '/api/*', '/login', '/profile', '/server-sitemap.xml', '/blogs/post'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/blog', '/student', '/teacher', '/api', '/login', '/profile']
      }
    ],
    // The dynamic blog sitemap only exists on the Node deploy. Export builds
    // prerender every published slug (fallback:false), so it is redundant there
    // and listing it would just point crawlers at a 404.
    additionalSitemaps: isExport ? [] : [`${siteUrl}/server-sitemap.xml`]
  }
};
