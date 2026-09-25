import { canAccess } from './permissions.js';

export const DEPARTMENTS = [
  { id: 'all', label: 'All Departments', shortLabel: 'All Depts', icon: '', color: '#9ca3af', activeBg: '#1f2127', path: '/admin/dashboard', superAdminOnly: true },
  { id: 'counsellor', label: 'Counsellor', icon: '', color: '#378ADD', activeBg: '#1a2540', path: '/admin/counsellor', permissionKey: 'counsellor' },
  { id: 'hr', label: 'HR', icon: '', color: '#8B5CF6', activeBg: '#1d1830', path: '/admin/hr', permissionKey: 'hr' },
  { id: 'finance', label: 'Finance', icon: '', color: '#10B981', activeBg: '#162318', path: '/admin/finance', permissionKey: 'finance' },
  { id: 'academic', label: 'Academic', icon: '', color: '#F59E0B', activeBg: '#251d10', path: '/admin/academic' },
  { id: 'management', label: 'Management', icon: '', color: '#EF4444', activeBg: '#20101a', path: '/admin/management' }
];

export const DEPARTMENT_NAV = {
  all: [
    { section: 'SUPER ADMIN' },
    { label: 'Dashboard', icon: '', path: '/admin/dashboard', permissionKey: 'dashboard' }
  ],
  counsellor: [
    { section: 'COUNSELLOR' },
    { label: 'Overview', icon: '', path: '/admin/counsellor', permissionKey: 'counsellor' },
    { label: 'Inquiries', icon: '', path: '/admin/counsellor/inquiries', permissionKey: 'counsellor', badgeKey: 'newInquiries' },
    { label: 'Enroll Student', icon: '', path: '/admin/counsellor/enroll', permissionKey: 'counsellor' },
    { label: 'My Students', icon: '', path: '/admin/counsellor/students', permissionKey: 'counsellor' },
    { label: 'Performance', icon: '', path: '/admin/counsellor/performance', permissionKey: 'counsellor' }
  ],
  hr: [
    { section: 'HR DEPARTMENT' },
    { label: 'Overview', icon: '', path: '/admin/hr', permissionKey: 'hr' },
    { label: 'Applications', icon: '', path: '/admin/hr/applications', permissionKey: 'hr', badgeKey: 'pendingHR' },
    { label: 'JD Management', icon: '', path: '/admin/hr/jds', permissionKey: 'hr' },
    { label: 'Signatures', icon: '', path: '/admin/hr/signatures', permissionKey: 'hr' },
    { label: 'Hiring Files', icon: '', path: '/admin/hr/files', permissionKey: 'hr' },
    { label: 'Leaves & Absence', icon: '', path: '/admin/hr/leaves', permissionKey: 'hr' },
    { label: 'All Teachers', icon: '', path: '/admin/hr/teachers', permissionKey: 'hr' },
    { label: 'Time Tracker', icon: '', path: '/admin/time-tracker' },
    { label: 'Time & Attendance', icon: '', path: '/admin/time-reports', permissionKey: 'hr' },
    { label: 'Staff Jira Tasks', icon: '', path: '/admin/staff-tasks' },
    { section: 'SETTINGS' },
    { label: 'HR Settings', icon: '', path: '/admin/hr/settings', permissionKey: 'hr' }
  ],
  finance: [
    { section: 'FINANCE' },
    { label: 'Overview', icon: '', path: '/admin/finance', permissionKey: 'finance' },
    { label: 'Student Fees', icon: '', path: '/admin/finance/fees', permissionKey: 'finance' },
    { label: 'Transactions', icon: '', path: '/admin/finance/transactions', permissionKey: 'finance' },
    { label: 'Teacher Salaries', icon: '', path: '/admin/finance/salaries', permissionKey: 'finance' },
    { label: 'Referral Payouts', icon: '', path: '/admin/finance/referrals', permissionKey: 'finance', badgeKey: 'pendingPayouts' },
    { label: 'Revenue Report', icon: '', path: '/admin/finance/reports', permissionKey: 'finance' },
    { section: 'SETTINGS' },
    { label: 'Fee Settings', icon: '', path: '/admin/finance/settings', permissionKey: 'finance' }
  ],
  academic: [
    { section: 'ACADEMIC' },
    { label: 'Overview', icon: '', path: '/admin/academic' },
    { label: 'Attendance', icon: '', path: '/admin/academic/attendance', permissionKey: 'attendance' },
    { label: 'Tasks', icon: '', path: '/admin/academic/tasks', permissionKey: 'tasks' },
    { label: 'Results', icon: '', path: '/admin/academic/results', permissionKey: 'results' },
    { label: 'Announcements', icon: '', path: '/admin/academic/announcements', permissionKey: 'announcements' },
    { label: 'Complaints', icon: '', path: '/admin/academic/complaints', permissionKey: 'complaints', badgeKey: 'openComplaints' },
    { label: 'Group Chats', icon: '', path: '/admin/academic/chats', permissionKey: 'tasks' },
    { section: 'REPORTS' },
    { label: 'Academic Reports', icon: '', path: '/admin/academic/reports', permissionKey: 'reports' }
  ],
  management: [
    { section: 'MANAGEMENT' },
    { label: 'Overview', icon: '', path: '/admin/management' },
    { label: 'Students', icon: '', path: '/admin/management/students', permissionKey: 'students' },
    { label: 'Teachers', icon: '', path: '/admin/management/teachers', permissionKey: 'teachers' },
    { label: 'Courses & Batches', icon: '', path: '/admin/management/courses', permissionKey: 'courses' },
    { label: 'Programs & Banner', icon: '', path: '/admin/management/programs', permissionKey: 'settings' },
    { label: 'Public Trainers', icon: '', path: '/admin/management/trainers', permissionKey: 'settings' },
    { label: 'Student Testimonials', icon: '', path: '/admin/management/testimonials', permissionKey: 'settings' },
    { label: 'Referral Program', icon: '', path: '/admin/management/referral', permissionKey: 'referral' },
    { label: 'Certificates', icon: '', path: '/admin/management/certificates', permissionKey: 'results' },
    { label: 'Blog', icon: '', path: '/admin/management/blog', permissionKey: 'blog' },
    { label: 'Careers & Jobs', icon: '', path: '/admin/management/careers', permissionKey: 'settings' },
    { label: 'Media Library', icon: '', path: '/admin/management/media', permissionKey: 'settings' },
    { label: 'Media Showcase', icon: '', path: '/admin/management/media-page', permissionKey: 'settings' },
    { label: 'Chatbot Insights', icon: '', path: '/admin/management/chatbot', permissionKey: 'settings' },
    { section: 'SYSTEM' },
    { label: 'Time Tracker', icon: '', path: '/admin/time-tracker' },
    { label: 'Staff Time Reports', icon: '', path: '/admin/time-reports', permissionKey: 'reports' },
    { label: 'Staff Jira Tasks', icon: '', path: '/admin/staff-tasks' },
    { label: 'User Management', icon: '', path: '/admin/management/users', permissionKey: 'users' },
    { label: 'Reports', icon: '', path: '/admin/management/reports', permissionKey: 'reports' },
    { label: 'Settings', icon: '', path: '/admin/management/settings', permissionKey: 'settings' }
  ]
};

export const ADMIN_ROUTE_ALIASES = {
  '/admin': '/admin',
  '/admin/admissions': '/admin/counsellor/inquiries',
  '/admin/students': '/admin/management/students',
  '/admin/teachers': '/admin/management/teachers',
  '/admin/trainers': '/admin/management/trainers',
  '/admin/settings/trainers': '/admin/management/trainers',
  '/admin/media-page': '/admin/management/media-page',
  '/admin/settings/media-page': '/admin/management/media-page',
  '/admin/courses': '/admin/management/courses',
  '/admin/batches': '/admin/management/courses',
  '/admin/attendance': '/admin/academic/attendance',
  '/admin/announcements': '/admin/academic/announcements',
  '/admin/complaints': '/admin/academic/complaints',
  '/admin/results': '/admin/academic/results',
  '/admin/referral': '/admin/management/referral',
  '/admin/certificates': '/admin/management/certificates',
  '/admin/blog': '/admin/management/blog',
  '/admin/careers': '/admin/management/careers',
  '/admin/users': '/admin/management/users',
  '/admin/reports': '/admin/management/reports',
  '/admin/settings': '/admin/management/settings',
  '/admin/testimonials': '/admin/management/testimonials',
  '/admin/settings/testimonials': '/admin/management/testimonials',
  '/admin/programs': '/admin/management/programs',
  '/admin/announcement-bar': '/admin/management/programs',
  '/admin/settings/programs': '/admin/management/programs',
  '/admin/settings/announcement-bar': '/admin/management/programs',
  '/admin/settings/media': '/admin/management/media',
  '/admin/settings/content': '/admin/management/settings',
  '/admin/roles': '/admin/management/settings/roles',
  '/admin/settings/roles': '/admin/management/settings/roles',
  '/admin/settings/system': '/admin/management/settings/system',
  '/admin/settings/departments': '/admin/management/settings/departments',
  '/admin/tasks': '/admin/academic/tasks',
  '/admin/chats': '/admin/academic/chats',
  '/admin/settings/attendance': '/admin/academic/attendance/settings',
  '/admin/attendance/settings': '/admin/academic/attendance/settings',
  '/admin/time-tracker': '/admin/time-tracker',
  '/admin/time-reports': '/admin/time-reports',
  '/admin/staff-tasks': '/admin/staff-tasks',
  '/admin/jira-tasks': '/admin/staff-tasks'
};

export const normalizeAdminPath = (pathname = '') => {
  const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/admin';
  if (ADMIN_ROUTE_ALIASES[cleanPath]) return ADMIN_ROUTE_ALIASES[cleanPath];
  if (cleanPath.startsWith('/admin/students/')) return cleanPath.replace('/admin/students/', '/admin/management/students/');
  if (cleanPath.startsWith('/admin/teachers/')) return cleanPath.replace('/admin/teachers/', '/admin/management/teachers/');
  if (cleanPath.startsWith('/admin/courses/')) return cleanPath.replace('/admin/courses/', '/admin/management/courses/');
  if (cleanPath.startsWith('/admin/blog/')) return cleanPath.replace('/admin/blog/', '/admin/management/blog/');
  if (cleanPath.startsWith('/admin/careers')) return '/admin/management/careers';
  if (cleanPath.startsWith('/admin/users/activity')) return '/admin/management/users/activity';
  if (cleanPath.startsWith('/admin/settings/roles')) return '/admin/management/settings/roles';
  if (cleanPath.startsWith('/admin/settings/system')) return '/admin/management/settings/system';
  if (cleanPath.startsWith('/admin/settings/departments')) return '/admin/management/settings/departments';
  return cleanPath;
};

export const canAccessDepartment = (user, departmentId) => {
  const department = DEPARTMENTS.find((item) => item.id === departmentId);
  if (!user || !department) return false;
  if (user.role === 'admin') return true;
  if (department.id === 'all') {
    return Boolean(canAccess(user.permissions || {}, 'dashboard', 'view'));
  }
  if (department.superAdminOnly) return false;
  if (department.permissionKey) {
    return Boolean(canAccess(user.permissions || {}, department.permissionKey, 'view'));
  }
  const navItems = DEPARTMENT_NAV[departmentId] || [];
  return navItems.some(
    (item) => item.permissionKey && canAccess(user.permissions || {}, item.permissionKey, 'view')
  );
};

export const getVisibleDepartments = (user) => {
  if (!user) return [];
  if (user.role === 'admin') return DEPARTMENTS;
  return DEPARTMENTS.filter((department) => canAccessDepartment(user, department.id));
};

export const getDepartmentByPath = (pathname = '') => {
  const path = normalizeAdminPath(pathname);
  if (path === '/admin' || path === '/admin/dashboard') return DEPARTMENTS[0];
  const [, , section] = path.split('/');
  return DEPARTMENTS.find((department) => department.id === section) || DEPARTMENTS[0];
};

export const getDefaultDepartmentPath = (user) => {
  if (user?.role === 'admin') return '/admin/dashboard';
  const visible = getVisibleDepartments(user);
  if (!visible.length) return '/login';
  const firstDept = visible[0];
  const nav = getDepartmentNav(user, firstDept.id);
  const target = nav.find((item) => item.path && !item.section);
  return target?.path || firstDept.path || '/login';
};

export const getDepartmentRouteAccess = (pathname = '') => {
  const normalized = normalizeAdminPath(pathname);
  const department = getDepartmentByPath(normalized);
  if (department.superAdminOnly) {
    return { allowedRoles: ['admin'], permissionKey: undefined, departmentId: department.id };
  }

  // Check matching child nav item: match most specific sub-path first
  const navItems = DEPARTMENT_NAV[department.id] || [];
  const sortedNav = [...navItems]
    .filter((item) => Boolean(item.path))
    .sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0));

  const matchedNav = sortedNav.find((item) => (
    normalized === item.path || normalized.startsWith(item.path + '/')
  ));

  if (matchedNav && matchedNav.permissionKey) {
    return { allowedRoles: ['admin', 'custom'], permissionKey: matchedNav.permissionKey, departmentId: department.id };
  }

  return { allowedRoles: ['admin', 'custom'], permissionKey: department.permissionKey, departmentId: department.id, isOverview: true };
};

export const getDepartmentNav = (user, departmentId, badges = {}) => {
  let rawItems = DEPARTMENT_NAV[departmentId] || DEPARTMENT_NAV.all;

  // For custom staff roles accessing dashboard, rename 'SUPER ADMIN' header to 'MAIN'
  if (departmentId === 'all' && user?.role !== 'admin') {
    rawItems = rawItems.map((item) =>
      item.section === 'SUPER ADMIN' ? { ...item, section: 'MAIN' } : item
    );
  }

  // 1. Filter out items user lacks access to
  const accessibleItems = rawItems.filter((item) => {
    if (item.section) return true; // Keep candidate section headers for pass 2
    if (user?.role === 'admin') return true;
    if (!item.permissionKey) return false; // Hide un-keyed overview items for custom roles
    return canAccess(user.permissions || {}, item.permissionKey, 'view');
  });

  // 2. Remove orphan/empty section headers (sections with no accessible items under them)
  const result = [];
  for (let i = 0; i < accessibleItems.length; i++) {
    const item = accessibleItems[i];
    if (item.section) {
      let hasChildren = false;
      for (let j = i + 1; j < accessibleItems.length; j++) {
        if (accessibleItems[j].section) break;
        hasChildren = true;
        break;
      }
      if (hasChildren) {
        result.push(item);
      }
    } else {
      result.push(item.badgeKey ? { ...item, badge: Boolean(badges[item.badgeKey]) } : item);
    }
  }

  return result;
};

export const getDepartmentPortalBranding = (user, activeDepartmentId, visibleDepartments = []) => {
  const isDedicated = Boolean(
    user &&
    user.role !== 'admin' &&
    Array.isArray(visibleDepartments) &&
    visibleDepartments.length === 1
  );

  const effectiveDeptId = isDedicated ? visibleDepartments[0]?.id : activeDepartmentId;

  switch (effectiveDeptId) {
    case 'counsellor':
      return {
        id: 'counsellor',
        portalName: 'DeepSkills Admissions Portal',
        shortName: 'Admissions Portal',
        sidebarSubtitle: 'Admissions & Counselling',
        workstationLabel: 'Admissions Workstation',
        headerTitle: isDedicated ? 'DeepSkills Admissions Portal' : 'Admissions & Counselling Portal',
        color: '#378ADD',
        isDedicated
      };
    case 'finance':
      return {
        id: 'finance',
        portalName: 'DeepSkills Finance Portal',
        shortName: 'Finance Portal',
        sidebarSubtitle: 'Finance & Accounts',
        workstationLabel: 'Finance Workstation',
        headerTitle: isDedicated ? 'DeepSkills Finance Portal' : 'Finance & Accounts Portal',
        color: '#10B981',
        isDedicated
      };
    case 'hr':
      return {
        id: 'hr',
        portalName: 'DeepSkills HR Portal',
        shortName: 'HR & Staff Portal',
        sidebarSubtitle: 'HR & Faculty Onboarding',
        workstationLabel: 'HR Workstation',
        headerTitle: isDedicated ? 'DeepSkills HR Portal' : 'HR & Faculty Portal',
        color: '#8B5CF6',
        isDedicated
      };
    case 'academic':
      return {
        id: 'academic',
        portalName: 'DeepSkills Academic Portal',
        shortName: 'Academic Portal',
        sidebarSubtitle: 'Academic Coordination',
        workstationLabel: 'Academic Workstation',
        headerTitle: isDedicated ? 'DeepSkills Academic Portal' : 'Academic Coordination Portal',
        color: '#F59E0B',
        isDedicated
      };
    case 'management':
      return {
        id: 'management',
        portalName: 'DeepSkills Management Portal',
        shortName: 'Management Portal',
        sidebarSubtitle: 'Campus Management',
        workstationLabel: 'Management Workstation',
        headerTitle: isDedicated ? 'DeepSkills Management Portal' : 'Campus Management Portal',
        color: '#EF4444',
        isDedicated
      };
    default:
      return {
        id: 'all',
        portalName: 'DeepSkills Admin Portal',
        shortName: 'Admin Portal',
        sidebarSubtitle: 'Super Admin Portal',
        workstationLabel: 'Super Admin Portal',
        headerTitle: 'DeepSkills Admin Portal',
        color: '#9ca3af',
        isDedicated: false
      };
  }
};

export const getDepartmentTitle = (pathname = '', options = {}) => {
  const normalized = normalizeAdminPath(pathname);
  const department = getDepartmentByPath(normalized);
  const navItems = DEPARTMENT_NAV[department.id] || DEPARTMENT_NAV.all;
  const direct = navItems.find((item) => item.path === normalized);
  const branding = options.branding || (options.user ? getDepartmentPortalBranding(options.user, department.id, options.visibleDepartments) : null);
  const rootLabel = branding?.isDedicated ? branding.shortName : 'Admin';
  const deptLabel = branding?.isDedicated ? null : department.label;

  const buildCrumbs = (leaf) => {
    if (branding?.isDedicated) {
      return [branding.shortName, leaf].filter(Boolean).join(' / ');
    }
    return [rootLabel, deptLabel, leaf].filter(Boolean).join(' / ');
  };

  if (direct) return { title: direct.label, breadcrumbs: buildCrumbs(direct.label) };
  if (normalized.includes('/attendance/settings')) return { title: 'Attendance Settings', breadcrumbs: buildCrumbs('Attendance Settings') };
  if (normalized.includes('/students/')) return { title: 'Student Profile', breadcrumbs: buildCrumbs('Student Profile') };
  if (normalized.includes('/teachers/')) return { title: 'Teacher Profile', breadcrumbs: buildCrumbs('Teacher Profile') };
  if (normalized.includes('/courses/')) return { title: 'Course Details', breadcrumbs: buildCrumbs('Course Details') };
  if (normalized.includes('/blog/new')) return { title: 'New Blog Post', breadcrumbs: buildCrumbs('New Blog Post') };
  if (normalized.includes('/blog/edit')) return { title: 'Edit Blog Post', breadcrumbs: buildCrumbs('Edit Blog Post') };
  return { title: department.label, breadcrumbs: buildCrumbs(department.label) };
};

