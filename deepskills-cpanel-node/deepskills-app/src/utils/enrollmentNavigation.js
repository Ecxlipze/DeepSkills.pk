export const COURSE_LABEL_BY_SLUG = {
  'full-stack-react': 'Full Stack React JS',
  'laravel-mastery': 'Full Stack (Laravel)',
  'graphic-design': 'Graphic Design Mastery',
  'wordpress-mastery': 'WordPress Mastery',
  'ui-ux-design': 'UI/UX Design',
  'seo-digital-marketing': 'SEO & Digital Marketing'
};

export const COURSE_DETAIL_PATH_BY_SLUG = {
  'full-stack-react': '/courses/full-stack-react',
  'laravel-mastery': '/courses/laravel-mastery',
  'graphic-design': '/courses/graphic-design',
  'wordpress-mastery': '/courses/wordpress-mastery'
};

export function getCourseSlugFromCategory(category = '') {
  const value = category.toLowerCase();
  if (value.includes('graphic')) return 'graphic-design';
  if (value.includes('laravel') || value.includes('php')) return 'laravel-mastery';
  if (value.includes('react')) return 'full-stack-react';
  if (value.includes('wordpress')) return 'wordpress-mastery';
  return '';
}

export function getCourseDetailPath(slug = '') {
  return COURSE_DETAIL_PATH_BY_SLUG[slug] || '/courses';
}

export function getEnrollmentPath(user, courseSlug = '') {
  if (user?.role === 'student') {
    return '/student/new-enrollment';
  }

  const query = courseSlug ? `?course=${encodeURIComponent(courseSlug)}` : '';
  return `/inquiry${query}`;
}
