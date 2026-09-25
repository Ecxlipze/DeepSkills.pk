// Records what visitors ask the site assistant, so the admin panel can report
// the questions the knowledge base does not answer yet.
//
// Logging is best-effort: a failure here must never affect the visitor's reply.

import { getSupabaseServerClient } from './supabaseServer.js';

// Groups "How much are the fees?" and "how much are the fees" together.
export const questionKey = (question) => String(question || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 300);

export function buildChatLogRow({ question, matched, entryId, confidence, sourcePath, answeredBy }) {
  const text = String(question || '').trim();
  if (!text) return null;
  return {
    question: text.slice(0, 500),
    question_key: questionKey(text),
    matched: Boolean(matched),
    entry_id: entryId || null,
    confidence: typeof confidence === 'number' ? Number(confidence.toFixed(3)) : null,
    source_path: sourcePath || null,
    // Which engine produced the answer: 'keyword', a provider name, or
    // 'keyword_fallback' when the provider call failed.
    answered_by: answeredBy || 'keyword',
    created_at: new Date().toISOString(),
  };
}

export async function logChatQuestion(input) {
  const row = buildChatLogRow(input);
  if (!row) return false;

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return false;
    const { error } = await supabase.from('chat_logs').insert([row]);
    if (error) {
      console.error('[chatbot] question log failed:', error.code || error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[chatbot] question log failed:', error?.message || error);
    return false;
  }
}
