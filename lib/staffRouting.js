// Centralized mapping and detection for staff portal routes and panel isolation

export function mapAdminPathToStaffPath(adminPath = '') {
  if (!adminPath || typeof adminPath !== 'string') return '/staff/dashboard';
  const [basePath, search] = adminPath.split('?');
  const query = search ? `?${search}` : '';
  const clean = basePath.replace(/\/$/, '');

  if (clean === '/admin' || clean === '/admin/dashboard') return `/staff/dashboard${query}`;
  if (clean.includes('/counsellor/enroll') || clean === '/admin/admissions') return `/staff/enroll${query}`;
  if (clean.includes('/counsellor/inquiries') || clean === '/admin/counsellor') return `/staff/inquiries${query}`;
  if (clean.includes('/counsellor/students') || clean === '/admin/students' || clean.includes('/management/students')) {
    const studentMatch = clean.match(/\/students\/([^/?#]+)/);
    if (studentMatch && studentMatch[1]) {
      return `/staff/students/${studentMatch[1]}${query}`;
    }
    return `/staff/students${query}`;
  }
  if (clean.includes('/finance/transactions')) return `/staff/transactions${query}`;
  if (clean.includes('/finance')) return `/staff/fees${query}`;
  if (clean.includes('/academic/attendance') || clean === '/admin/attendance') return `/staff/attendance${query}`;
  if (clean.includes('/academic/tasks') || clean === '/admin/tasks') return `/staff/tasks${query}`;
  if (clean.includes('/academic/results') || clean === '/admin/results') return `/staff/results${query}`;
  if (clean.includes('/academic/announcements') || clean === '/admin/announcements') return `/staff/announcements${query}`;
  if (clean.includes('/academic/complaints') || clean === '/admin/complaints') return `/staff/complaints${query}`;
  if (clean.includes('/academic')) return `/staff/courses${query}`;
  if (clean.includes('/management/courses') || clean === '/admin/courses' || clean.includes('/batches')) {
    const courseMatch = clean.match(/\/courses\/([^/?#]+)/);
    if (courseMatch && courseMatch[1]) {
      return `/staff/courses/${courseMatch[1]}${query}`;
    }
    return `/staff/courses${query}`;
  }
  if (clean.includes('/hr/applications')) return `/staff/applications${query}`;
  if (clean.includes('/hr/jds')) return `/staff/jds${query}`;
  if (clean.includes('/hr/teachers') || clean === '/admin/teachers' || clean.includes('/management/teachers')) {
    const teacherMatch = clean.match(/\/teachers\/([^/?#]+)/);
    if (teacherMatch && teacherMatch[1]) {
      return `/staff/teachers/${teacherMatch[1]}${query}`;
    }
    return `/staff/teachers${query}`;
  }
  if (clean.includes('/hr')) return `/staff/applications${query}`;
  if (clean.includes('/time-tracker') || clean.includes('/time-reports')) return `/staff/time-tracker${query}`;
  if (clean.includes('/profile') || clean.includes('/leaves')) return `/staff/profile${query}`;

  return `/staff/dashboard${query}`;
}

export function isStaffRoute(pathname = '') {
  if (!pathname || typeof pathname !== 'string') return false;
  return pathname === '/staff' || pathname.startsWith('/staff/');
}

export function isStaffUser(user) {
  if (!user) return false;
  return user.role === 'custom' || (!['admin', 'teacher', 'student'].includes(user.role) && Boolean(user.role));
}
