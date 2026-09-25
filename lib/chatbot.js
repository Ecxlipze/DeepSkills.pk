// Keyword retrieval for the public site assistant. No external AI service:
// a visitor question is scored against the local knowledge base and the best
// matching published answer is returned, or a fallback that points at contact.

import {
  baseEntries,
  staticCourseEntries,
  staticBlogEntries,
  synonyms,
  fallbackAnswer,
  greetingAnswer,
  suggestedQuestions,
  leadPrompt,
} from '../data/chatbotKnowledge.js';

// Used when no entry set is supplied (tests, and any caller without Supabase).
export const knowledgeBase = [...baseEntries, ...staticCourseEntries, ...staticBlogEntries];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'can', 'could',
  'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'it', 'its', 'they', 'them', 'this', 'that', 'these', 'those', 'of', 'in', 'on', 'at', 'to', 'for',
  'from', 'with', 'about', 'and', 'or', 'but', 'if', 'then', 'there', 'here', 'please', 'tell', 'give',
  'want', 'need', 'know', 'get', 'have', 'has', 'any', 'some', 'also', 'hi', 'hello', 'hey', 'thanks',
  // Bare question words identify nothing on their own; without this, "what is
  // the weather in tokyo" would match the "What is DeepSkills?" entry.
  'what', 'who', 'whom', 'whose', 'how', 'why', 'which',
  // Roman Urdu filler, so "kitna fee hai" is read as the fee question.
  'kitna', 'kitni', 'kitne', 'kya', 'kia', 'hai', 'hain', 'hy', 'ka', 'ki', 'ke', 'ko',
  'se', 'sy', 'mein', 'aur', 'ap', 'aap', 'mujhe', 'muje', 'bhi', 'batao', 'bata', 'btao',
]);

const GREETINGS = new Set(['hi', 'hello', 'hey', 'salam', 'assalamualaikum', 'aoa', 'yo', 'hola', 'greetings']);

// query word -> canonical site word, built once from the synonym map.
const SYNONYM_LOOKUP = (() => {
  const map = new Map();
  for (const [canonical, variants] of Object.entries(synonyms)) {
    map.set(canonical, canonical);
    for (const variant of variants) map.set(variant, canonical);
  }
  return map;
})();

const stem = (word) => {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
};

const words = (text) => String(text || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  // A stop word that the site treats as meaningful (e.g. "where") is kept.
  .filter((word) => word.length > 1 && (!STOP_WORDS.has(word) || SYNONYM_LOOKUP.has(word)));

// Knowledge-base text is already written in the site's own vocabulary, so it is
// only stemmed. Synonym expansion is applied to the visitor's wording alone —
// expanding both sides makes generic words ("institute") collide with specific
// entries ("location").
export const indexTokens = (text) => words(text).map(stem);

export function tokenize(text) {
  return words(text).map((word) => SYNONYM_LOOKUP.get(word) || stem(word));
}

// One index per entry set, built on first use and cached by array identity, so
// swapping in a database-backed knowledge base costs nothing per request.
const indexCache = new WeakMap();

function getIndex(entries) {
  const cached = indexCache.get(entries);
  if (cached) return cached;

  const rows = entries.map((entry) => ({
    entry,
    keywordTokens: new Set(indexTokens(entry.keywords.join(' '))),
    questionTokens: new Set(indexTokens(entry.question)),
    answerTokens: new Set(indexTokens(entry.answer)),
    // Literal wording of the entry, used only to break ties between two entries
    // that matched the same number of canonical terms.
    rawTokens: new Set(indexTokens(`${entry.question} ${entry.keywords.join(' ')}`)),
  }));

  // Rarity weight: "fee" identifies one entry, "course" appears in most of them,
  // so a shared generic word must not outrank a specific one.
  const df = new Map();
  const vocabulary = new Set();
  for (const { keywordTokens, questionTokens, answerTokens } of rows) {
    for (const token of new Set([...keywordTokens, ...questionTokens])) {
      df.set(token, (df.get(token) || 0) + 1);
    }
    for (const token of [...keywordTokens, ...questionTokens, ...answerTokens]) vocabulary.add(token);
  }
  const total = rows.length;
  const idf = (token) => Math.log(1 + total / (1 + (df.get(token) || 0)));

  const index = { rows, idf, vocabulary };
  indexCache.set(entries, index);
  return index;
}

const KEYWORD_WEIGHT = 3;
const QUESTION_WEIGHT = 2;
const ANSWER_WEIGHT = 1;
// Tie-break only: matches the visitor's literal wording against the entry text.
const LITERAL_WEIGHT = 0.75;
// Roughly: at least one strong keyword hit per short question.
const CONFIDENCE_THRESHOLD = 0.34;

export function rank(question, limit = 3, entries = knowledgeBase) {
  const { rows, idf: IDF, vocabulary } = getIndex(entries);
  const tokens = tokenize(question).filter((token) => vocabulary.has(token));
  if (!tokens.length) return [];
  const unique = [...new Set(tokens)];

  const weights = new Map(unique.map((token) => [token, IDF(token)]));
  const best = unique.reduce((sum, token) => sum + weights.get(token), 0) * KEYWORD_WEIGHT;
  if (!best) return [];

  // The visitor's literal words, for the tie-break pass.
  const rawUnique = [...new Set(words(question).map(stem))].filter((token) => vocabulary.has(token));

  return rows
    .map(({ entry, keywordTokens, questionTokens, answerTokens, rawTokens }) => {
      let score = 0;
      // Whether the entry matched on a term it is *about*, rather than a word
      // that merely appears somewhere in its answer text.
      let onTopic = false;
      for (const token of unique) {
        const idf = weights.get(token);
        if (keywordTokens.has(token)) { score += KEYWORD_WEIGHT * idf; onTopic = true; }
        else if (questionTokens.has(token)) { score += QUESTION_WEIGHT * idf; onTopic = true; }
        else if (answerTokens.has(token)) score += ANSWER_WEIGHT * idf;
      }
      let bonus = 0;
      for (const token of rawUnique) {
        if (!unique.includes(token) && rawTokens.has(token)) bonus += LITERAL_WEIGHT * IDF(token);
      }
      return { entry, score: Math.min(1, (score + bonus) / best), onTopic };
    })
    .filter((hit) => hit.score > 0)
    // Equal scores are broken by entry priority, so "tell me about wordpress"
    // reaches the course rather than a blog post that mentions it.
    .sort((a, b) => (
      b.score - a.score
      || (b.entry.priority || 0) - (a.entry.priority || 0)
      || a.entry.id.localeCompare(b.entry.id)
    ))
    .slice(0, limit);
}

export function answerQuestion(question, entries = knowledgeBase) {
  const text = String(question || '').trim();
  if (!text) {
    return { matched: false, answer: greetingAnswer, suggestions: suggestedQuestions, sources: [] };
  }

  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').trim().split(/\s+/);
  if (words.length <= 2 && words.some((word) => GREETINGS.has(word))) {
    return { matched: true, answer: greetingAnswer, suggestions: suggestedQuestions, sources: [] };
  }

  const hits = rank(text, 3, entries);
  const top = hits[0];

  // An incidental mention in an answer is not enough to answer with confidence:
  // "do you have a hostel for students" must not match an entry that happens to
  // use the word "students" in its text.
  if (!top || top.score < CONFIDENCE_THRESHOLD || !top.onTopic) {
    return {
      matched: false,
      answer: fallbackAnswer,
      suggestions: suggestedQuestions,
      // A question the assistant cannot answer is exactly when a human should.
      offerLead: true,
      leadPrompt,
      // Weak hits still make useful "did you mean" links.
      sources: hits.slice(0, 2).map(({ entry }) => ({ label: entry.linkLabel, href: entry.link })),
    };
  }

  const related = hits
    .slice(1)
    .filter((hit) => hit.score >= top.score * 0.6)
    .map(({ entry }) => ({ label: entry.linkLabel, href: entry.link }));

  return {
    matched: true,
    answer: top.entry.answer,
    entryId: top.entry.id,
    offerLead: Boolean(top.entry.capturesLead),
    leadPrompt: top.entry.capturesLead ? leadPrompt : undefined,
    courseName: top.entry.courseName || undefined,
    confidence: Number(top.score.toFixed(3)),
    sources: [{ label: top.entry.linkLabel, href: top.entry.link }, ...related],
    suggestions: [],
  };
}

export { suggestedQuestions, greetingAnswer };
