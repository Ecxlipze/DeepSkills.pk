import { getSupabaseServerClient } from '../../lib/supabaseServer.js';
import { acceptPost, formError } from '../../lib/publicForms.js';
import { buildInquiryRow, validateChatLead } from '../../lib/chatLead.js';

export const config = { api: { bodyParser: { sizeLimit: '4kb' } } };

// Stricter than /api/chat: a visitor has no reason to submit contact details
// repeatedly, and this endpoint writes to the counsellor's inquiry list.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function throttled(key) {
  const now = Date.now();
  const record = hits.get(key);
  if (!record || now - record.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
    }
    return false;
  }
  record.count += 1;
  return record.count > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (!acceptPost(req, res)) return;

  // Same honeypot convention as the other public forms.
  if (req.body['bot-field']) {
    return res.status(200).json({ status: 'success', message: 'Thanks! Our team will contact you shortly.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (throttled(ip)) {
    return res.status(429).json({ status: 'error', message: 'Too many requests. Please try again later.' });
  }

  const valid = validateChatLead(req.body);
  if (!valid.ok) {
    return res.status(400).json({ status: 'error', message: valid.message });
  }

  const row = buildInquiryRow(req.body);
  try {
    const db = req.__supabase || getSupabaseServerClient();
    if (!db) throw new Error('Database unavailable');
    const { error } = await db.from('inquiries').insert([row]);
    if (error) throw error;
    return res.status(200).json({ status: 'success', message: 'Thanks! Our team will contact you shortly.' });
  } catch (error) {
    return formError(res, error, 'We could not save your details. Please try again, or email info@deepskills.pk.');
  }
}
