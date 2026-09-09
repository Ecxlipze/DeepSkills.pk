export const cleanText = (value, max = 200) => String(value ?? '').replace(/[<>\x00-\x1f\x7f]/g, '').trim().slice(0, max);
export const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function acceptPost(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.setHeader('Allow', 'POST, OPTIONS'); res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); res.status(405).json({ status: 'error', message: 'Method not allowed.' }); return false; }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) { res.status(400).json({ status: 'error', message: 'Invalid request data.' }); return false; }
  return true;
}
export function formError(res, error, message) {
  console.error('[public-form]', error?.code || 'request_failed');
  return res.status(error?.code === '23505' ? 409 : 500).json({ status: 'error', message });
}
