const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://deepskills.pk').replace(/\/+$/, '');

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl,
  trailingSlash: true,
  generateRobotsTxt: true,
  sitemapSize: 7000,
  sourceDir: 'next-build',
  outDir: 'public',
  exclude: ['/admin/*', '/admin/blog/*', '/student/*', '/teacher/*', '/api/*', '/login', '/profile', '/server-sitemap.xml', '/blogs/post'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/blog', '/student', '/teacher', '/api', '/login', '/profile']
      }
    ],
    additionalSitemaps: [`${siteUrl}/server-sitemap.xml`]
  }
};
