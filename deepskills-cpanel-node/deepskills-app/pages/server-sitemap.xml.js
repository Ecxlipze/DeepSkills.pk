import { getServerSideSitemapLegacy } from 'next-sitemap';
import { fetchPublishedPosts } from '../lib/blog';
import { canonical } from '../lib/seo';

export async function getServerSideProps(ctx) {
  const posts = await fetchPublishedPosts();
  const fields = posts.map((post) => ({
    loc: canonical(`/blogs/${post.slug}`),
    lastmod: post.updatedAt || post.publishedAt || new Date().toISOString(),
    changefreq: 'weekly',
    priority: 0.7
  }));

  return getServerSideSitemapLegacy(ctx, fields);
}

export default function ServerSitemap() {}
