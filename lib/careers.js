import { getSupabaseServerClient } from './supabaseServer.js';

export const CAREER_DEPARTMENTS = [
  'All',
  'Teaching / Faculty',
  'Software & IT',
  'Design & Creative',
  'Marketing & Growth',
  'Operations & Admin',
  'Student Support'
];

export const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship'
];

export const WORKPLACE_TYPES = [
  'On-site',
  'Remote',
  'Hybrid'
];

export const EXPERIENCE_LEVELS = [
  'Entry Level',
  'Mid Level',
  'Senior',
  'Lead / Head'
];

export const APPLICATION_STATUSES = [
  'new',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
  'rejected',
  'hired'
];

export const MOCK_JOB_POSTINGS = [
  {
    id: 'mock-job-1',
    title: 'Senior Full-Stack Web Development Instructor (MERN)',
    slug: 'senior-full-stack-mern-instructor',
    department: 'Teaching / Faculty',
    job_type: 'Full-time',
    workplace_type: 'On-site',
    location: 'Gulberg III, Lahore',
    experience_level: 'Senior',
    salary_range: 'PKR 120,000 - 180,000 / month',
    description: 'We are seeking an experienced Full-Stack JavaScript Engineer and Instructor to lead our intensive MERN stack training tracks. You will guide aspiring developers through real-world projects, architectural principles, and modern web application deployment.',
    responsibilities: [
      'Deliver engaging, hands-on lectures in React, Next.js, Node.js, Express, and MongoDB/PostgreSQL.',
      'Mentor students during practical lab hours, debugging sessions, and code reviews.',
      'Develop and continuously refine project-based curriculum and capstone assignments.',
      'Assess student project submissions and prepare graduates for tech interviews.'
    ],
    requirements: [
      '3+ years of professional full-stack web development experience.',
      'Strong proficiency with modern React, Next.js, Node.js, REST APIs, and database design.',
      'Exceptional communication and teaching skills with patience for beginners.',
      'Prior teaching or technical mentorship experience is a strong plus.'
    ],
    benefits: [
      'Competitive salary package with bi-annual performance bonuses',
      'Paid annual leaves and health insurance support',
      'Free access to all DeepSkills courses and workshops',
      'High-energy, tech-driven collaborative campus culture'
    ],
    status: 'published',
    is_featured: true,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-job-2',
    title: 'Lead UI/UX & Graphic Design Trainer',
    slug: 'lead-ui-ux-graphic-design-trainer',
    department: 'Teaching / Faculty',
    job_type: 'Full-time',
    workplace_type: 'On-site',
    location: 'Gulberg III, Lahore',
    experience_level: 'Mid Level',
    salary_range: 'PKR 90,000 - 140,000 / month',
    description: 'Lead our flagship Graphic Design and UI/UX design cohort. Empower students to master Figma, Adobe Creative Cloud, branding systems, design systems, and user-centered design methodologies.',
    responsibilities: [
      'Teach visual hierarchy, typography, color theory, and Figma UI/UX prototyping.',
      'Conduct design critiques, portfolio reviews, and freelance preparation workshops.',
      'Help students build Behance and Dribbble portfolios that win client work.'
    ],
    requirements: [
      '2+ years of professional UI/UX and graphic design experience.',
      'Mastery of Figma, Adobe Illustrator, and Photoshop.',
      'A strong personal portfolio demonstrating visual and product design mastery.'
    ],
    benefits: [
      'Market-competitive compensation with annual increments',
      'Modern Apple iMac workstation provided',
      'Creative freedom to innovate curriculum and design challenges'
    ],
    status: 'published',
    is_featured: true,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-job-3',
    title: 'Next.js & Frontend Engineer',
    slug: 'nextjs-frontend-engineer',
    department: 'Software & IT',
    job_type: 'Full-time',
    workplace_type: 'Hybrid',
    location: 'Lahore, Pakistan',
    experience_level: 'Mid Level',
    salary_range: 'PKR 100,000 - 150,000 / month',
    description: 'Join our internal software development team building DeepSkills portals, student learning systems, real-time messaging, and high-performance web applications.',
    responsibilities: [
      'Build and maintain responsive user interfaces with Next.js, React, and styled-components.',
      'Integrate Supabase backend services, PostgreSQL queries, and real-time sockets.',
      'Optimize Core Web Vitals, page load speeds, and SEO structured data.'
    ],
    requirements: [
      '2+ years of production experience with React and Next.js.',
      'Proficiency with state management, CSS-in-JS (styled-components), and Framer Motion.',
      'Experience with Supabase or PostgreSQL database workflows.'
    ],
    benefits: [
      'Hybrid workplace flexibility (2 days remote per week)',
      'Hardware and learning allowances',
      'Work with a passionate, nimble engineering team'
    ],
    status: 'published',
    is_featured: false,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-job-4',
    title: 'Student Academic Counsellor & Admissions Officer',
    slug: 'student-counsellor-admissions-officer',
    department: 'Operations & Admin',
    job_type: 'Full-time',
    workplace_type: 'On-site',
    location: 'Gulberg III, Lahore',
    experience_level: 'Entry Level',
    salary_range: 'PKR 60,000 - 90,000 / month + Incentives',
    description: 'Be the first point of contact for aspiring students. Guide students and parents in selecting the right tech career paths, manage course inquiries, and facilitate enrollment.',
    responsibilities: [
      'Respond promptly to prospective student inquiries via phone, WhatsApp, and campus walk-ins.',
      'Conduct career counselling sessions to match students with the most suitable course.',
      'Manage student registration records and batch enrollment workflows.'
    ],
    requirements: [
      'Bachelor’s degree with strong verbal and written communication in English and Urdu.',
      'Empathetic, persuasive, and student-focused attitude.',
      'Proficiency with CRM tools, Google Sheets, and WhatsApp Business.'
    ],
    benefits: [
      'Attractive commission structure on batch admissions',
      'Professional career growth into campus management',
      'Comprehensive training on IT industry careers'
    ],
    status: 'published',
    is_featured: false,
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-job-5',
    title: 'Laravel & PHP Backend Instructor (Evening Track)',
    slug: 'laravel-backend-instructor-part-time',
    department: 'Teaching / Faculty',
    job_type: 'Part-time',
    workplace_type: 'On-site',
    location: 'Gulberg III, Lahore',
    experience_level: 'Senior',
    salary_range: 'PKR 60,000 - 90,000 / month (Part-time)',
    description: 'Teach our evening and weekend Laravel bootcamp for working professionals. Focus on robust backend architecture, RESTful APIs, Eloquent ORM, and enterprise application patterns.',
    responsibilities: [
      'Deliver 6 to 8 hours of interactive lectures per week (evenings/weekends).',
      'Guide students through real-world enterprise projects in Laravel 11.',
      'Mentor students on Git collaboration, database indexing, and API security.'
    ],
    requirements: [
      '3+ years of hands-on Laravel / PHP software engineering experience.',
      'Passion for teaching and ability to explain complex backend concepts clearly.'
    ],
    benefits: [
      'Flexible evening/weekend schedule suited for working software engineers',
      'Networking with industry professionals and top tech talent'
    ],
    status: 'published',
    is_featured: false,
    deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-job-6',
    title: 'Digital Marketing & Growth Specialist',
    slug: 'digital-marketing-growth-specialist',
    department: 'Marketing & Growth',
    job_type: 'Full-time',
    workplace_type: 'On-site',
    location: 'Gulberg III, Lahore',
    experience_level: 'Mid Level',
    salary_range: 'PKR 80,000 - 120,000 / month',
    description: 'Drive brand awareness, lead generation, and social media reach for DeepSkills bootcamps across Meta, Google Ads, TikTok, and YouTube.',
    responsibilities: [
      'Plan and run performance ad campaigns targeting prospective students in tech.',
      'Manage social media channels with viral tech reels, student stories, and carousel tips.',
      'Analyze campaign ROI and optimize student lead acquisition costs.'
    ],
    requirements: [
      '2+ years managing performance marketing campaigns in edtech or agency environments.',
      'Strong grasp of Meta Ads Manager, Google Search/Display Ads, and analytics.'
    ],
    benefits: [
      'Performance bonuses tied to enrollment milestones',
      'Creative freedom to experiment with campaigns and video content'
    ],
    status: 'published',
    is_featured: false,
    deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function slugify(value = '') {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatJobDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function sanitizeText(value = '', maxLength = 500) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export async function fetchPublishedJobs(client = null) {
  try {
    const supabase = client || getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error fetching published jobs from Supabase:', err.message);
  }

  return MOCK_JOB_POSTINGS;
}

export async function fetchJobBySlug(slug, client = null) {
  if (!slug) return null;
  try {
    const supabase = client || getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && data) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error fetching job by slug:', err.message);
  }

  return MOCK_JOB_POSTINGS.find((j) => j.slug === slug) || null;
}

export function generateJobPostingJsonLd(job, siteUrl = 'https://deepskills.pk') {
  if (!job) return null;

  const validThrough = job.deadline || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  let employmentType = 'FULL_TIME';
  if (job.job_type === 'Part-time') employmentType = 'PART_TIME';
  else if (job.job_type === 'Contract') employmentType = 'CONTRACTOR';
  else if (job.job_type === 'Internship') employmentType = 'INTERN';

  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || job.title,
    identifier: {
      '@type': 'PropertyValue',
      name: 'DeepSkills',
      value: job.id
    },
    datePosted: job.created_at,
    validThrough: validThrough,
    employmentType: employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'DeepSkills',
      sameAs: siteUrl,
      logo: `${siteUrl}/logo.svg`
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Lahore',
        addressRegion: 'Punjab',
        addressCountry: 'PK'
      }
    }
  };

  if (job.workplace_type === 'Remote') {
    schema.jobLocationType = 'TELECOMMUTE';
  }

  if (job.salary_range && !job.salary_range.toLowerCase().includes('negotiable')) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'PKR',
      value: {
        '@type': 'QuantitativeValue',
        value: job.salary_range,
        unitText: 'MONTH'
      }
    };
  }

  return schema;
}
