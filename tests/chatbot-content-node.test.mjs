import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCourseEntry, buildBlogEntry, baseEntries } from '../data/chatbotKnowledge.js';
import { answerQuestion, rank } from '../lib/chatbot.js';
import { buildChatLogRow, questionKey } from '../lib/chatLog.js';

// Shape of a row in the Supabase `courses` table (see src/admin/CourseManager.js).
const dbCourse = {
  title: 'SEO & Digital Marketing',
  // The live `courses` rows have a null slug; the route is resolved from the title.
  slug: null,
  description: 'Learn SEO, social media ads and analytics for real clients.',
  duration: '3 months',
  price: 45000,
  status: 'active',
};

test('a course row from the database becomes an answerable entry', () => {
  const entry = buildCourseEntry(dbCourse);
  assert.equal(entry.id, 'course-seo-digital-marketing');
  assert.equal(entry.link, '/courses/seo-digital-marketing');
  assert.match(entry.answer, /3 months/);
  assert.match(entry.answer, /SEO/);
});

test('course entries never expose the price column', () => {
  const entry = buildCourseEntry(dbCourse);
  assert.doesNotMatch(entry.answer, /45000/);
  assert.doesNotMatch(JSON.stringify(entry), /45000/);
});

test('a course added in the admin panel is answerable without a code change', () => {
  const entries = [...baseEntries, buildCourseEntry(dbCourse)];
  const result = answerQuestion('do you teach digital marketing', entries);
  assert.equal(result.matched, true);
  assert.equal(result.entryId, 'course-seo-digital-marketing');
  assert.equal(result.sources[0].href, '/courses/seo-digital-marketing');
});

test('the static knowledge base is unaffected by a caller-supplied entry set', () => {
  const entries = [...baseEntries, buildCourseEntry(dbCourse)];
  assert.equal(rank('digital marketing', 3, entries)[0].entry.id, 'course-seo-digital-marketing');
  // Default entry set does not contain the injected course.
  assert.ok(!rank('digital marketing').some((hit) => hit.entry.id === 'course-seo-digital-marketing'));
});

test('a course row with a null slug is linked through the site slug map', () => {
  const entry = buildCourseEntry({ title: 'UI/UX Design', duration: '6 Months', description: 'Design systems.' });
  assert.equal(entry.id, 'course-ui-ux-design');
  assert.equal(entry.link, '/courses/ui-ux-design');
});

test('courses sharing a broad category keep separate entries', () => {
  // Live data: "UI/UX Design" is filed under the "Graphic Design" category.
  const uiux = buildCourseEntry({ title: 'UI/UX Design', category: 'Graphic Design', duration: '6 Months', description: 'Figma workflows.' });
  const graphic = buildCourseEntry({ title: 'Graphic Design Mastery', category: 'Graphic Design', duration: '3 Months', description: 'Adobe tools.' });
  assert.equal(uiux.id, 'course-ui-ux-design');
  assert.equal(graphic.id, 'course-graphic-design');
  assert.notEqual(uiux.link, graphic.link);

  const entries = [...baseEntries, uiux, graphic];
  assert.equal(answerQuestion('do you teach ui ux', entries).entryId, 'course-ui-ux-design');
});

test('a course with no matching course page links to the listing, not a 404', () => {
  const entry = buildCourseEntry({ title: 'Cyber Security', slug: 'cyber-security', duration: '3 months', description: 'Blue team basics.' });
  assert.equal(entry.link, '/courses');
  assert.equal(entry.linkLabel, 'Browse all courses');
});

test('a course question outranks a blog post that mentions the same topic', () => {
  const entries = [
    ...baseEntries,
    buildCourseEntry({ title: 'WordPress Mastery', duration: '2 Months', description: 'Build client sites.' }),
    buildBlogEntry({ title: 'WordPress skills that help freelancers earn', slug: 'wp-skills', excerpt: 'Custom themes and WooCommerce.' }),
  ];
  assert.equal(answerQuestion('tell me about wordpress', entries).entryId, 'course-wordpress-mastery');
});

test('incomplete rows are skipped rather than producing broken entries', () => {
  assert.equal(buildCourseEntry({ duration: '1 month' }), null);
  assert.equal(buildBlogEntry({ excerpt: 'no title or slug' }), null);
});

test('a published blog post becomes an entry', () => {
  const entry = buildBlogEntry({ title: 'Scholarships Explained', slug: 'scholarships', excerpt: 'How support works.' });
  assert.equal(entry.id, 'blog-scholarships');
  assert.equal(entry.link, '/blogs/scholarships');
});

test('question keys group the same question asked differently', () => {
  assert.equal(questionKey('How much are the FEES?'), questionKey('how much are the fees'));
  assert.notEqual(questionKey('what are the fees'), questionKey('what are the timings'));
});

test('a chat log row records the match outcome', () => {
  const row = buildChatLogRow({ question: 'Where are you?', matched: true, entryId: 'location', confidence: 0.8123, sourcePath: '/courses' });
  assert.equal(row.question, 'Where are you?');
  assert.equal(row.matched, true);
  assert.equal(row.entry_id, 'location');
  assert.equal(row.confidence, 0.812);
  assert.equal(row.source_path, '/courses');
});

test('empty questions are not logged', () => {
  assert.equal(buildChatLogRow({ question: '   ' }), null);
  assert.equal(buildChatLogRow({}), null);
});
