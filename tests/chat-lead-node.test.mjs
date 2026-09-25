import test from 'node:test';
import assert from 'node:assert/strict';

import { validateChatLead, buildInquiryRow, normalizePhone, CHAT_LEAD_SOURCE } from '../lib/chatLead.js';
import { answerQuestion } from '../lib/chatbot.js';
import { buildCourseEntry, baseEntries } from '../data/chatbotKnowledge.js';

const validLead = { name: 'Ayesha Khan', phone: '0300 1234567' };

test('a name and phone number are enough to capture a lead', () => {
  const result = validateChatLead(validLead);
  assert.equal(result.ok, true);
  assert.equal(result.name, 'Ayesha Khan');
});

test('phone numbers are accepted in the formats people actually type', () => {
  for (const phone of ['03001234567', '0300-1234567', '+92 300 1234567', '(042) 35678901']) {
    assert.equal(validateChatLead({ ...validLead, phone }).ok, true, `${phone} should be accepted`);
  }
  assert.equal(normalizePhone('0300-123 4567'), '03001234567');
});

test('incomplete or junk submissions are rejected', () => {
  assert.equal(validateChatLead({ name: 'A', phone: '03001234567' }).ok, false);
  assert.equal(validateChatLead({ name: 'Ayesha', phone: '123' }).ok, false);
  assert.equal(validateChatLead({ name: 'Ayesha' }).ok, false);
  assert.equal(validateChatLead({ ...validLead, email: 'not-an-email' }).ok, false);
});

test('an optional email is kept when valid', () => {
  const row = buildInquiryRow({ ...validLead, email: 'ayesha@example.com' });
  assert.equal(row.email, 'ayesha@example.com');
  assert.equal(buildInquiryRow(validLead).email, null);
});

test('the inquiry row is tagged as a chatbot lead and starts as new', () => {
  const row = buildInquiryRow({ ...validLead, course: 'WordPress Mastery', question: 'how much are the fees', path: '/courses' });
  assert.equal(row.hear_about_us, CHAT_LEAD_SOURCE);
  assert.equal(row.status, 'new');
  assert.equal(row.course_interest, 'WordPress Mastery');
  assert.match(row.message, /chatbot/i);
  assert.match(row.message, /how much are the fees/);
  assert.match(row.message, /\/courses/);
});

test('fields the chat does not ask for are left for the counsellor', () => {
  const row = buildInquiryRow(validLead);
  assert.equal(row.cnic, undefined);
  assert.equal(row.city, undefined);
  assert.ok(row.name && row.phone, 'name and phone are the only required columns');
});

test('an invalid lead never produces a row', () => {
  assert.equal(buildInquiryRow({ name: 'x', phone: '1' }), null);
  assert.equal(buildInquiryRow({}), null);
});

test('high-intent answers offer a callback', () => {
  for (const question of ['how much are the fees', 'how do i enroll', 'when do classes start', 'will i get a job after the course']) {
    assert.equal(answerQuestion(question).offerLead, true, `${question} should offer a callback`);
  }
});

test('an unanswered question offers a callback instead of a dead end', () => {
  const result = answerQuestion('do you have a hostel for students');
  assert.equal(result.matched, false);
  assert.equal(result.offerLead, true);
});

test('informational answers do not push a form at the visitor', () => {
  for (const question of ['where are you located', 'are you on social media', 'who are the trainers']) {
    assert.ok(!answerQuestion(question).offerLead, `${question} should not offer a callback`);
  }
});

test('a course question carries the course into the lead', () => {
  const entries = [...baseEntries, buildCourseEntry({ title: 'WordPress Mastery', duration: '2 Months', description: 'Client sites.' })];
  const result = answerQuestion('tell me about wordpress', entries);
  assert.equal(result.offerLead, true);
  assert.equal(result.courseName, 'WordPress Mastery');
  assert.equal(buildInquiryRow({ ...validLead, course: result.courseName }).course_interest, 'WordPress Mastery');
});

// --- API handler, against a stub database (never the live inquiries table) ---

import handler from '../pages/api/chat-lead.js';

function stubSupabase(inserted) {
  return {
    from(table) {
      assert.equal(table, 'inquiries');
      return { insert: async (rows) => { inserted.push(...rows); return { error: null }; } };
    },
  };
}

function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  res.end = () => res;
  return res;
}

const post = (body, inserted = []) => {
  const req = { method: 'POST', headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` }, socket: {}, body, __supabase: stubSupabase(inserted) };
  const res = mockRes();
  return handler(req, res).then(() => ({ res, inserted }));
};

test('a valid submission is written to the inquiries table', async () => {
  const { res, inserted } = await post({ name: 'Bilal Ahmed', phone: '03211234567', course: 'Graphic Design Mastery', question: 'how much are the fees' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'success');
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].name, 'Bilal Ahmed');
  assert.equal(inserted[0].hear_about_us, CHAT_LEAD_SOURCE);
});

test('an invalid submission is rejected and writes nothing', async () => {
  const { res, inserted } = await post({ name: 'B', phone: '1' });
  assert.equal(res.statusCode, 400);
  assert.equal(inserted.length, 0);
});

test('the honeypot is accepted silently and writes nothing', async () => {
  const { res, inserted } = await post({ name: 'Spam Bot', phone: '03211234567', 'bot-field': 'filled' });
  assert.equal(res.statusCode, 200);
  assert.equal(inserted.length, 0);
});

test('GET is not allowed', async () => {
  const res = mockRes();
  await handler({ method: 'GET', headers: {}, socket: {}, body: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('repeated submissions from one visitor are throttled', async () => {
  const inserted = [];
  const ip = '10.9.9.9';
  const send = () => {
    const req = { method: 'POST', headers: { 'x-forwarded-for': ip }, socket: {}, body: { name: 'Repeat Sender', phone: '03211234567' }, __supabase: stubSupabase(inserted) };
    const res = mockRes();
    return handler(req, res).then(() => res);
  };
  for (let i = 0; i < 5; i += 1) assert.equal((await send()).statusCode, 200);
  assert.equal((await send()).statusCode, 429);
  assert.equal(inserted.length, 5);
});

// --- matching guardrails that keep wrong answers out ---

test('an entry is not answered on a word that only appears in its answer text', () => {
  // "students" appears in several answers; the visitor is asking about hostels.
  assert.equal(answerQuestion('do you have a hostel for students').matched, false);
  assert.equal(answerQuestion('is transport available').matched, false);
  assert.equal(answerQuestion('do you provide a laptop').matched, false);
});

test('roman urdu filler does not stop a question from matching', () => {
  assert.equal(answerQuestion('kitna fee hai').entryId, 'fees');
});
