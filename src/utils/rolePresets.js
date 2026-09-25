import { MODULE_KEYS } from './permissions';

export const PERMISSION_CATEGORIES = [
  {
    id: 'academic',
    label: 'Academic & Learning',
    icon: '🎓',
    color: '#F59E0B',
    description: 'Course curriculum, student attendance, homework submissions, and exam results.',
    modules: [
      { key: 'courses', label: 'Courses & Batches', description: 'Curriculum, batches, schedules, and enrollment slots' },
      { key: 'attendance', label: 'Student Attendance', description: 'Daily attendance marking, geo-attendance logs, and absence cutoffs' },
      { key: 'tasks', label: 'Tasks & Homework', description: 'Class assignments, homework review, and student grading' },
      { key: 'results', label: 'Exams & Certificates', description: 'Examination marks, batch result compilation, and certificates' }
    ]
  },
  {
    id: 'students',
    label: 'Admissions & Students',
    icon: '👥',
    color: '#3B82F6',
    description: 'Student profiles, admission inquiries, student complaints, and referral tracking.',
    modules: [
      { key: 'students', label: 'Student Directory', description: 'Enrolled students, profiles, and admission records' },
      { key: 'counsellor', label: 'Admission Inquiries', description: 'Lead tracking, follow-ups, and student counseling' },
      { key: 'complaints', label: 'Grievances & Tickets', description: 'Student feedback, complaint tickets, and resolution notes' },
      { key: 'referral', label: 'Referral Program', description: 'Referral links, commission tracking, and payouts' }
    ]
  },
  {
    id: 'faculty',
    label: 'HR & Faculty',
    icon: '💼',
    color: '#8B5CF6',
    description: 'Teacher profiles, onboarding applications, staff contracts, and work time-tracking.',
    modules: [
      { key: 'teachers', label: 'Teacher Directory', description: 'Teacher profiles, course assignments, and salaries' },
      { key: 'hr', label: 'HR Management', description: 'Job applications, contracts/JDs, and staff leave tracking' },
      { key: 'time_tracking', label: 'Staff Time Tracker', description: 'Shift clock-in/out, activity tracking, and Jira tasks' }
    ]
  },
  {
    id: 'finance',
    label: 'Finance & Analytics',
    icon: '💰',
    color: '#10B981',
    description: 'Fee collection, transaction history, teacher salary disbursement, and revenue reports.',
    modules: [
      { key: 'finance', label: 'Finance & Invoicing', description: 'Student fee vouchers, payments, salaries, and refunds' },
      { key: 'reports', label: 'Reports & Analytics', description: 'Master audit reports, revenue analytics, and batch KPIs' }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing & Outreach',
    icon: '📣',
    color: '#EC4899',
    description: 'Public announcements, broadcast alerts, and blog publications.',
    modules: [
      { key: 'announcements', label: 'Announcements', description: 'Portal announcements, banner notices, and broadcast alerts' },
      { key: 'blog', label: 'Blog & Articles', description: 'Public articles, student guides, and educational insights' }
    ]
  },
  {
    id: 'governance',
    label: 'Administration & Governance',
    icon: '⚙️',
    color: '#6B7280',
    description: 'Executive dashboard, user credentials, custom roles, and system configuration.',
    modules: [
      { key: 'dashboard', label: 'Executive Dashboard', description: 'High-level KPI overview, enrollment graphs, and quick links' },
      { key: 'users', label: 'User Management', description: 'Staff accounts, role assignments, and security logs' },
      { key: 'settings', label: 'System Settings', description: 'Global institute settings, attendance geofence, and site content' }
    ]
  }
];

export const createEmptyPermissions = () =>
  MODULE_KEYS.reduce((acc, key) => {
    acc[key] = 'none';
    return acc;
  }, {});

export const ROLE_PRESETS = [
  {
    id: 'counsellor',
    name: 'Admission Counsellor',
    description: 'Handles prospective students, inquiry follow-ups, initial counseling, and enrollment registrations.',
    icon: '📞',
    color: 'blue',
    permissions: {
      dashboard: 'view',
      counsellor: 'full',
      students: 'full',
      teachers: 'none',
      courses: 'view',
      attendance: 'view',
      tasks: 'none',
      results: 'none',
      finance: 'view',
      complaints: 'view',
      announcements: 'view',
      blog: 'none',
      referral: 'full',
      reports: 'none',
      hr: 'none',
      users: 'none',
      settings: 'none',
      time_tracking: 'full'
    }
  },
  {
    id: 'academic_coordinator',
    name: 'Academic Coordinator',
    description: 'Oversees batches, syllabus progress, teacher lesson delivery, homework tasks, and student attendance.',
    icon: '📋',
    color: 'amber',
    permissions: {
      dashboard: 'view',
      counsellor: 'none',
      students: 'view',
      teachers: 'view',
      courses: 'full',
      attendance: 'full',
      tasks: 'full',
      results: 'full',
      finance: 'none',
      complaints: 'view',
      announcements: 'full',
      blog: 'none',
      referral: 'none',
      reports: 'view',
      hr: 'none',
      users: 'none',
      settings: 'none',
      time_tracking: 'full'
    }
  },
  {
    id: 'finance_officer',
    name: 'Finance Officer',
    description: 'Manages student fee payments, manual receipt verification, teacher payroll, and revenue audits.',
    icon: '💰',
    color: 'green',
    permissions: {
      dashboard: 'view',
      counsellor: 'none',
      students: 'view',
      teachers: 'view',
      courses: 'view',
      attendance: 'none',
      tasks: 'none',
      results: 'none',
      finance: 'full',
      complaints: 'none',
      announcements: 'view',
      blog: 'none',
      referral: 'view',
      reports: 'full',
      hr: 'none',
      users: 'none',
      settings: 'view',
      time_tracking: 'full'
    }
  },
  {
    id: 'hr_manager',
    name: 'HR & Faculty Manager',
    description: 'Coordinates teacher hiring, job applications, signed contracts/JDs, leaves, and staff work hours.',
    icon: '💼',
    color: 'purple',
    permissions: {
      dashboard: 'view',
      counsellor: 'none',
      students: 'none',
      teachers: 'full',
      courses: 'view',
      attendance: 'none',
      tasks: 'none',
      results: 'none',
      finance: 'none',
      complaints: 'full',
      announcements: 'view',
      blog: 'none',
      referral: 'none',
      reports: 'view',
      hr: 'full',
      users: 'view',
      settings: 'none',
      time_tracking: 'full'
    }
  },
  {
    id: 'marketing_specialist',
    name: 'Marketing & Outreach Specialist',
    description: 'Drives student acquisition campaigns, leads generation, public blog publishing, and broadcast announcements.',
    icon: '📣',
    color: 'pink',
    permissions: {
      dashboard: 'view',
      counsellor: 'view',
      students: 'none',
      teachers: 'none',
      courses: 'view',
      attendance: 'none',
      tasks: 'none',
      results: 'none',
      finance: 'none',
      complaints: 'none',
      announcements: 'full',
      blog: 'full',
      referral: 'full',
      reports: 'view',
      hr: 'none',
      users: 'none',
      settings: 'view',
      time_tracking: 'full'
    }
  },
  {
    id: 'auditor',
    name: 'Auditor & Executive Reviewer',
    description: 'Read-only access across all operational modules for institutional oversight, compliance, and auditing.',
    icon: '⚖️',
    color: 'charcoal',
    permissions: {
      dashboard: 'view',
      counsellor: 'view',
      students: 'view',
      teachers: 'view',
      courses: 'view',
      attendance: 'view',
      tasks: 'view',
      results: 'view',
      finance: 'view',
      complaints: 'view',
      announcements: 'view',
      blog: 'view',
      referral: 'view',
      reports: 'view',
      hr: 'view',
      users: 'view',
      settings: 'view',
      time_tracking: 'view'
    }
  },
  {
    id: 'full_admin',
    name: 'Full Administrator',
    description: 'Comprehensive administrative control over all institute operations and management modules.',
    icon: '👑',
    color: 'blue',
    permissions: {
      dashboard: 'full',
      counsellor: 'full',
      students: 'full',
      teachers: 'full',
      courses: 'full',
      attendance: 'full',
      tasks: 'full',
      results: 'full',
      finance: 'full',
      complaints: 'full',
      announcements: 'full',
      blog: 'full',
      referral: 'full',
      reports: 'full',
      hr: 'full',
      users: 'full',
      settings: 'full',
      time_tracking: 'full'
    }
  }
];

export const ICON_OPTIONS = ['👤', '👔', '💼', '📞', '📋', '🔐', '🎓', '💰', '⚖️', '📣', '📊', '🛠️'];

export const COLOR_OPTIONS = [
  { key: 'blue', label: 'Blue', hex: '#4F8EF7' },
  { key: 'green', label: 'Green', hex: '#2ECC71' },
  { key: 'purple', label: 'Purple', hex: '#8B5CF6' },
  { key: 'amber', label: 'Amber', hex: '#F59E0B' },
  { key: 'pink', label: 'Pink', hex: '#EC4899' },
  { key: 'gray', label: 'Gray', hex: '#9CA3AF' },
  { key: 'charcoal', label: 'Charcoal', hex: '#D1D5DB' }
];
