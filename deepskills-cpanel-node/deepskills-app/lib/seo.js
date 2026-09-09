import { site } from '../data/siteContent';

export function canonical(path = '/') {
  const pathname = path.split(/[?#]/)[0];
  const normalizedPath = `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  const suffix = normalizedPath === '/' || /\.[^/]+$/.test(normalizedPath) ? '' : '/';
  return `${site.url}${normalizedPath}${suffix}`;
}

export function pageTitle(title) {
  if (!title) return site.title;
  if (title.includes(site.name) || title.includes('deepskills.pk')) return title;
  return `${title} | ${site.name}`;
}

export function absoluteUrl(value = '') {
  if (!value) return canonical('/');
  if (/^https?:\/\//i.test(value)) return value;
  // Assets are URLs, not page canonicals: preserve extensions and query strings.
  return new URL(value, `${site.url}/`).href;
}
