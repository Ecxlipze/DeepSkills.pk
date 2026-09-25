import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCourseSlug,
  getCourseDetailPath,
  COURSE_DETAIL_PATH_BY_SLUG,
} from '../src/utils/enrollmentNavigation.js';

// Shape of the live `courses` rows: slug is null, and the category is a broad
// admin label that several courses share.
const liveCourses = [
  { title: 'UI/UX Design', category: 'Graphic Design', slug: null, expected: 'ui-ux-design' },
  { title: 'Graphic Design Mastery', category: 'Graphic Design', slug: null, expected: 'graphic-design' },
  { title: 'WordPress Mastery', category: 'Wordpress', slug: null, expected: 'wordpress-mastery' },
  { title: 'SEO & Digital Marketing', category: '', slug: null, expected: 'seo-digital-marketing' },
  { title: 'Full Stack React JS', category: 'React JS', slug: null, expected: 'full-stack-react' },
  { title: 'Full Stack (Laravel)', category: 'Laravel / PHP', slug: null, expected: 'laravel-mastery' },
];

for (const course of liveCourses) {
  test(`"${course.title}" links to its own course page`, () => {
    assert.equal(resolveCourseSlug(course), course.expected);
    assert.equal(getCourseDetailPath(resolveCourseSlug(course)), `/courses/${course.expected}`);
  });
}

test('two courses in the same category do not share a link', () => {
  const links = liveCourses.map((course) => getCourseDetailPath(resolveCourseSlug(course)));
  assert.equal(new Set(links).size, links.length, 'course links must be unique');
});

test('every resolved slug has a course page mapping', () => {
  for (const course of liveCourses) {
    assert.ok(COURSE_DETAIL_PATH_BY_SLUG[resolveCourseSlug(course)], `${course.title} has no course page`);
  }
});

test('an explicit known slug still wins', () => {
  assert.equal(resolveCourseSlug({ slug: 'laravel-mastery', title: 'Anything', category: '' }), 'laravel-mastery');
});

test('an unmapped course falls back to its own slug, then to nothing', () => {
  assert.equal(resolveCourseSlug({ slug: 'cyber-security', title: 'Cyber Security' }), 'cyber-security');
  assert.equal(resolveCourseSlug({ title: 'Cyber Security' }), '');
  assert.equal(resolveCourseSlug({}), '');
});
