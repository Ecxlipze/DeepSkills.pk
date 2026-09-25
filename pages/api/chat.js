import { acceptPost, cleanText } from '../../lib/publicForms.js';
import { answerWithAi } from '../../lib/chatAi.js';
import { getKnowledgeBase } from '../../lib/chatbotContent.js';
import { logChatQuestion } from '../../lib/chatLog.js';

export const config = { api: { bodyParser: { sizeLimit: '4kb' } } };

// Light per-IP throttle so the endpoint cannot be hammered. Process-local only.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
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

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (throttled(ip)) {
    return res.status(429).json({ status: 'error', message: 'Too many messages. Please wait a moment.' });
  }

  const raw = req.body.message ?? req.body.question;
  if (typeof raw === 'string' && raw.length > 1000) {
    return res.status(400).json({ status: 'error', message: 'Message is too long.' });
  }
  const question = cleanText(raw, 500);

  const entries = await getKnowledgeBase();
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-6) : [];
  const { answeredBy, model, ...result } = await answerWithAi(question, entries, { history });

  // Recorded so the admin panel can report which questions the knowledge base
  // does not answer yet. Never blocks or fails the reply.
  logChatQuestion({
    question,
    matched: result.matched,
    entryId: result.entryId || null,
    confidence: result.confidence ?? null,
    sourcePath: cleanText(req.body.path, 200) || null,
    answeredBy,
  });

  return res.status(200).json({ status: 'success', ...result });
}
