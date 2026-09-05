export const MODULE_KEYS = [
  'dashboard',
  'counsellor',
  'students',
  'teachers',
  'courses',
  'attendance',
  'tasks',
  'results',
  'finance',
  'complaints',
  'announcements',
  'blog',
  'referral',
  'reports',
  'hr',
  'users',
  'settings'
];

export const ADMIN_FULL_PERMISSIONS = MODULE_KEYS.reduce((acc, key) => {
  acc[key] = 'full';
  return acc;
}, {});

export const BUILTIN_ROLE_COLORS = {
  student: 'blue',
  teacher: 'green',
  admin: 'charcoal',
  custom: 'gray'
};

export const ROLE_COLOR_STYLES = {
  blue: { bg: 'rgba(79, 142, 247, 0.14)', text: '#4F8EF7', border: 'rgba(79, 142, 247, 0.25)' },
  green: { bg: 'rgba(46, 204, 113, 0.14)', text: '#2ecc71', border: 'rgba(46, 204, 113, 0.25)' },
  charcoal: { bg: 'rgba(156, 163, 175, 0.14)', text: '#d1d5db', border: 'rgba(156, 163, 175, 0.25)' },
  purple: { bg: 'rgba(147, 51, 234, 0.14)', text: '#c084fc', border: 'rgba(147, 51, 234, 0.25)' },
  amber: { bg: 'rgba(245, 158, 11, 0.14)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' },
  pink: { bg: 'rgba(236, 72, 153, 0.14)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.25)' },
  gray: { bg: 'rgba(107, 114, 128, 0.14)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.25)' }
};

export const STAFF_ROLES = ['admin', 'custom'];

export const BUILTIN_ROLE_NAMES = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
  custom: 'Custom'
};

const normalizePermissionMap = (permissions = {}) =>
  MODULE_KEYS.reduce((acc, key) => {
    acc[key] = permissions[key] || 'none';
    return acc;
  }, {});

export const getBuiltinPermissions = (role) => {
  if (role === 'admin') {
    return { ...ADMIN_FULL_PERMISSIONS };
  }

  if (role === 'student' || role === 'teacher') {
    return {};
  }

  return normalizePermissionMap();
};

export const resolvePermissions = (user, customRole) => {
  if (!user) return {};
  if (user.role === 'admin') return getBuiltinPermissions('admin');
  if (user.role === 'student' || user.role === 'teacher') return {};
  return normalizePermissionMap(customRole?.permissions || user.permissions || {});
};

export const canAccess = (permissions = {}, key, minimum = 'view') => {
  const current = permissions?.[key] || 'none';
  if (current === 'full') return true;
  if (minimum === 'view' && current === 'view') return true;
  return false;
};

export const getFirstAccessibleAdminPath = (permissions = {}) => {
  const routeOrder = [
    { key: 'dashboard', path: '/admin/dashboard' },
    { key: 'counsellor', path: '/admin/counsellor' },
    { key: 'students', path: '/admin/management/students' },
    { key: 'teachers', path: '/admin/management/teachers' },
    { key: 'hr', path: '/admin/hr' },
    { key: 'users', path: '/admin/management/users' },
    { key: 'courses', path: '/admin/management/courses' },
    { key: 'attendance', path: '/admin/academic/attendance' },
    { key: 'tasks', path: '/admin/academic/tasks' },
    { key: 'announcements', path: '/admin/academic/announcements' },
    { key: 'blog', path: '/admin/management/blog' },
    { key: 'complaints', path: '/admin/academic/complaints' },
    { key: 'finance', path: '/admin/finance' },
    { key: 'referral', path: '/admin/management/referral' },
    { key: 'results', path: '/admin/academic/results' },
    { key: 'reports', path: '/admin/management/reports' },
    { key: 'settings', path: '/admin/management/settings' }
  ];

  const match = routeOrder.find((item) => canAccess(permissions, item.key, 'view'));
  return match?.path || '/login';
};

export const getRoleColor = (role, customRoleColor) => {
  const colorKey = customRoleColor || BUILTIN_ROLE_COLORS[role] || 'gray';
  return ROLE_COLOR_STYLES[colorKey] || ROLE_COLOR_STYLES.gray;
};

export const getRoleLabel = (role, customRoleName) => customRoleName || BUILTIN_ROLE_NAMES[role] || 'Custom';

export const buildAdminSidebar = (user, permissions = {}, hasOpenComplaints = false) => {
  const baseItems = [
    { type: 'label', label: 'MAIN' },
    { iconKey: 'home', label: 'Dashboard', path: '/admin/dashboard', permissionKey: 'dashboard' },
    { iconKey: 'admissions', label: 'Admissions', path: '/admin/admissions', permissionKey: 'students' },
    { type: 'label', label: 'MANAGEMENT' },
    { iconKey: 'counsellor', label: 'Counsellor', path: '/admin/counsellor', permissionKey: 'counsellor' },
    { iconKey: 'students', label: 'Students', path: '/admin/management/students', permissionKey: 'students' },
    { iconKey: 'teachers', label: 'Teachers', path: '/admin/management/teachers', permissionKey: 'teachers' },
    { iconKey: 'hr', label: 'HR Management', path: '/admin/hr', permissionKey: 'hr' },
    {
      iconKey: 'users',
      label: 'User Management',
      type: 'dropdown',
      permissionKey: 'users',
      items: [
        { label: 'Overview', path: '/admin/management/users', permissionKey: 'users' },
        { label: 'Activity Logs', path: '/admin/management/users/activity', permissionKey: 'users' }
      ]
    },
    { iconKey: 'courses', label: 'Courses & Batches', path: '/admin/management/courses', permissionKey: 'courses' },
    {
      iconKey: 'attendance',
      label: 'Attendance',
      type: 'dropdown',
      permissionKey: 'attendance',
      items: [
        { label: 'Overview', path: '/admin/academic/attendance', permissionKey: 'attendance' },
        { label: 'Settings', path: '/admin/academic/attendance', permissionKey: 'attendance' }
      ]
    },
    { iconKey: 'tasks', label: 'Tasks', path: '/admin/academic/tasks', permissionKey: 'tasks' },
    { iconKey: 'results', label: 'Certificates', path: '/admin/management/certificates', permissionKey: 'results' },
    { type: 'label', label: 'COMMUNICATION' },
    { iconKey: 'announcements', label: 'Announcements', path: '/admin/academic/announcements', permissionKey: 'announcements' },
    { iconKey: 'blog', label: 'Blog', path: '/admin/management/blog', permissionKey: 'blog' },
    { iconKey: 'complaints', label: 'Complaints', path: '/admin/academic/complaints', permissionKey: 'complaints', badge: hasOpenComplaints },
    { type: 'label', label: 'FINANCE' },
    {
      iconKey: 'finance',
      label: 'Finance',
      type: 'dropdown',
      permissionKey: 'finance',
      items: [
        { label: 'Overview', path: '/admin/finance', permissionKey: 'finance' },
        { label: 'Transactions', path: '/admin/finance/transactions', permissionKey: 'finance' }
      ]
    },
    { type: 'label', label: 'GROWTH' },
    { iconKey: 'referral', label: 'Referral Program', path: '/admin/management/referral', permissionKey: 'referral' },
    { type: 'label', label: 'SYSTEM' },
    { iconKey: 'results', label: 'Exam Results', path: '/admin/academic/results', permissionKey: 'results' },
    { iconKey: 'reports', label: 'Reports', path: '/admin/management/reports', permissionKey: 'reports' },
    {
      iconKey: 'settings',
      label: 'Settings',
      type: 'dropdown',
      permissionKey: 'settings',
      items: [
        { label: 'Testimonials', path: '/admin/management/settings', permissionKey: 'settings' },
        { label: 'Media Library', path: '/admin/management/media', permissionKey: 'settings' },
        { label: 'Site Content', path: '/admin/management/settings', permissionKey: 'settings' },
        { label: 'Media Page', path: '/admin/management/media', permissionKey: 'settings' }
      ]
    }
  ];

  if (user?.role === 'admin') {
    return baseItems;
  }

  const filtered = [];
  baseItems.forEach((item) => {
    if (item.type === 'label') {
      filtered.push(item);
      return;
    }

    if (item.type === 'dropdown') {
      const visibleItems = (item.items || []).filter((child) => canAccess(permissions, child.permissionKey || item.permissionKey, 'view'));
      if (visibleItems.length > 0 && canAccess(permissions, item.permissionKey, 'view')) {
        filtered.push({ ...item, items: visibleItems });
      }
      return;
    }

    if (canAccess(permissions, item.permissionKey, 'view')) {
      filtered.push(item);
    }
  });

  return filtered.filter((item, index, arr) => item.type !== 'label' || (arr[index + 1] && arr[index + 1].type !== 'label'));
};
