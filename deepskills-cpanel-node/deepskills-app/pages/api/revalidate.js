// On-demand ISR revalidation, called from the admin panel after content edits
// (see src/utils/revalidatePublic.js). Requires REVALIDATE_SECRET; only paths in
// the whitelist below can be regenerated.
const EXACT_PATHS = new Set(['/', '/courses', '/media', '/trainers', '/blogs']);
const PATH_PATTERNS = [/^\/blogs\/[a-z0-9-]+$/, /^\/courses\/[a-z0-9-]+$/];

function isAllowed(path) {
  return EXACT_PATHS.has(path) || PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-revalidate-secret'] || req.body?.secret;
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const requested = Array.isArray(req.body?.paths) ? [...req.body.paths] : [];
  // Back-compat with the original { slug } payload shape.
  if (req.body?.slug) {
    requested.push('/blogs', `/blogs/${req.body.slug}`);
  }

  const paths = [...new Set(requested)].filter(isAllowed);
  if (paths.length === 0) {
    return res.status(400).json({ error: 'No valid paths' });
  }

  const results = {};
  for (const path of paths) {
    try {
      await res.revalidate(path);
      results[path] = true;
    } catch (error) {
      results[path] = false;
    }
  }

  return res.status(200).json({ revalidated: true, results });
}
