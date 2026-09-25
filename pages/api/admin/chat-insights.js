import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer';
import { getProviderConfig } from '../../../lib/aiProviders';

const MAX_ROWS = 2000;

function group(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.question_key || row.question;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (row.created_at > existing.lastAsked) existing.lastAsked = row.created_at;
    } else {
      map.set(key, { question: row.question, count: 1, lastAsked: row.created_at, entryId: row.entry_id });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || (a.lastAsked < b.lastAsked ? 1 : -1));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
  }

  const auth = await authorizeAdminOperation(req, 'settings');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // Reported so an admin can see whether an AI provider is actually configured.
  const ai = getProviderConfig();
  const aiStatus = ai ? { enabled: true, provider: ai.label, model: ai.model } : { enabled: false };

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('chat_logs')
    .select('question, question_key, matched, entry_id, answered_by, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    // The table is created by a migration; say so plainly rather than 500ing.
    // PostgREST reports an unknown table as PGRST205; 42P01 is the Postgres code.
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return res.status(200).json({
        status: 'success',
        pending: 'The chat_logs table does not exist yet. Run the chat_logs migration.',
        data: { days, total: 0, answered: 0, unanswered: [], answered_top: [], engines: {}, ai: aiStatus },
      });
    }
    return res.status(500).json({ status: 'error', message: error.message });
  }

  const rows = data || [];
  const missed = rows.filter((row) => !row.matched);
  const hit = rows.filter((row) => row.matched);

  return res.status(200).json({
    status: 'success',
    data: {
      ai: aiStatus,
      days,
      total: rows.length,
      answered: hit.length,
      answerRate: rows.length ? Math.round((hit.length / rows.length) * 100) : null,
      truncated: rows.length >= MAX_ROWS,
      unanswered: group(missed).slice(0, 50),
      answered_top: group(hit).slice(0, 20),
      // Which engine produced the answers in this period.
      engines: rows.reduce((counts, row) => {
        const key = row.answered_by || 'keyword';
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      }, {}),
    },
  });
}
