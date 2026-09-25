import test from 'node:test';
import assert from 'node:assert/strict';

import { answerQuestion, rank, tokenize } from '../lib/chatbot.js';
import { knowledgeBase } from '../data/chatbotKnowledge.js';

test('every knowledge entry has an answer and a site link', () => {
  assert.ok(knowledgeBase.length > 10);
  for (const entry of knowledgeBase) {
    assert.ok(entry.answer.length > 20, `${entry.id} answer too short`);
    assert.match(entry.link, /^\//, `${entry.id} must link to an on-site path`);
    assert.ok(entry.keywords.length > 0, `${entry.id} has no keywords`);
  }
});

test('synonyms collapse to the site vocabulary', () => {
  assert.ok(tokenize('what is the cost').includes('fee'));
  assert.ok(tokenize('how do I enroll').includes('admission'));
  assert.ok(tokenize('your programs').includes('course'));
});

const expected = [
  ['What courses do you offer?', 'courses-list'],
  ['how much is the fee', 'fees'],
  ['what is the price of the course', 'fees'],
  ['how can i get admission', 'admission'],
  ['where is your office', 'location'],
  ['are classes online or onsite', 'mode'],
  ['do you offer internships', 'internship'],
  ['are you hiring', 'careers'],
  ['how long is laravel mastery', 'course-laravel-mastery'],
  ['tell me about graphic design', 'course-graphic-design'],
  ['can a beginner join', 'beginner'],
  ['how do i verify my certificate', 'certificate'],
  ['how do i login to the student portal', 'login'],
  ['who are the trainers', 'trainers'],
  ['when do classes start', 'timings'],
  ['i want to learn wordpress', 'course-wordpress-mastery'],
  ['how to apply for internship', 'internship'],
  ['will i get a job after the course', 'job-outcome'],
  ['kitna fee hai', 'fees'],
  ['can i pay in installments', 'fees'],
];

for (const [question, id] of expected) {
  test(`"${question}" resolves to ${id}`, () => {
    const hits = rank(question);
    assert.ok(hits.length, 'no match at all');
    assert.equal(hits[0].entry.id, id);
    assert.equal(answerQuestion(question).matched, true);
  });
}

test('unrelated questions fall back instead of guessing', () => {
  for (const q of [
    'what is the weather in tokyo',
    'write me a poem',
    'who won the cricket match',
    'what is the capital of france',
    'how do i cook biryani',
  ]) {
    const result = answerQuestion(q);
    assert.equal(result.matched, false, `${q} should not match`);
    assert.match(result.answer, /could not find/);
    assert.ok(result.suggestions.length > 0);
  }
});

test('greetings and empty input return the intro', () => {
  assert.match(answerQuestion('hi').answer, /assistant/i);
  assert.match(answerQuestion('').answer, /assistant/i);
  assert.equal(answerQuestion('').matched, false);
});

test('no answer invents a fee amount', () => {
  for (const entry of knowledgeBase) {
    assert.doesNotMatch(entry.answer, /(rs\.?\s*\d|pkr\s*\d|\d{4,}\s*(rupees|per month))/i, `${entry.id} states a price`);
  }
});

test('answers include a source link', () => {
  const result = answerQuestion('what courses do you offer');
  assert.ok(result.sources.length >= 1);
  assert.equal(result.sources[0].href, '/courses');
});
