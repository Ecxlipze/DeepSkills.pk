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
  'wordpress-mastery': '/courses/wordpress-mastery',
  'ui-ux-design': '/courses/ui-ux-design',
  'seo-digital-marketing': '/courses/seo-digital-marketing'
};

export function getCourseSlugFromCategory(category = '') {
  const value = category.toLowerCase();
  if (value.includes('graphic')) return 'graphic-design';
  if (value.includes('laravel') || value.includes('php')) return 'laravel-mastery';
  if (value.includes('react')) return 'full-stack-react';
  if (value.includes('wordpress')) return 'wordpress-mastery';
  if (value.includes('ui/ux') || value.includes('ux') || value.includes('ui-ux')) return 'ui-ux-design';
  if (value.includes('seo') || value.includes('marketing')) return 'seo-digital-marketing';
  return '';
}

export function getCourseDetailPath(slug = '') {
  if (!slug) return '/courses';
  return COURSE_DETAIL_PATH_BY_SLUG[slug] || `/courses/${slug}`;
}

export function getEnrollmentPath(user, courseSlug = '') {
  if (user?.role === 'student') {
    return '/student/new-enrollment';
  }

  const query = courseSlug ? `?course=${encodeURIComponent(courseSlug)}` : '';
  return `/inquiry${query}`;
}
