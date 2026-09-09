export const site = {
  name: 'DeepSkills',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://deepskills.pk').replace(/\/+$/, ''),
  title: 'DeepSkills - Online Skill Development Courses in Pakistan',
  description:
    'DeepSkills offers practical skill development courses in Pakistan for full stack development, Laravel, WordPress, graphic design, UI/UX, and digital marketing.',
  phone: (process.env.NEXT_PUBLIC_BUSINESS_PHONE || '').trim(),
  email: 'info@deepskills.pk',
  logo: '/favicon.svg',
  socialImage: '/logo512.png',
  address: {
    street: '58 A2, Tipu Road Gulberg III',
    locality: 'Lahore',
    region: 'Punjab',
    country: 'PK'
  },
  sameAs: [
    'https://www.facebook.com/people/Deep-Skills/61585681437310/',
    'https://www.instagram.com/deepskills.pk',
    'https://www.linkedin.com/company/deep-skills-pk',
    'https://www.tiktok.com/@deep.skills'
  ]
};

export const courses = [
  {
    slug: 'full-stack-react',
    title: 'Full Stack React JS',
    category: 'Web Development',
    summary: 'Become a job-ready frontend and full stack developer with React, APIs, deployment, and production workflows.',
    duration: '4 months',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    outcomes: ['React components and hooks', 'API integration', 'State management', 'Portfolio-ready projects'],
    modules: ['HTML, CSS, and JavaScript foundations', 'React and reusable UI', 'Backend APIs and databases', 'Deployment and freelancing workflow'],
    relatedBlogs: ['why-ssr-matters-for-course-websites', 'how-to-build-a-web-development-portfolio']
  },
  {
    slug: 'laravel-mastery',
    title: 'Laravel Mastery',
    category: 'Backend Development',
    summary: 'Master PHP, Laravel, authentication, databases, APIs, and deployment for robust web applications.',
    duration: '4 months',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    outcomes: ['Laravel MVC', 'Database design', 'REST APIs', 'Secure authentication'],
    modules: ['PHP essentials', 'Laravel routing and MVC', 'Eloquent and migrations', 'Production deployment'],
    relatedBlogs: ['how-to-build-a-web-development-portfolio']
  },
  {
    slug: 'wordpress-mastery',
    title: 'WordPress Mastery',
    category: 'No-Code Web',
    summary: 'Build professional WordPress websites for clients, small businesses, ecommerce, and content teams.',
    duration: '3 months',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    outcomes: ['WordPress setup', 'Theme customization', 'SEO basics', 'Client delivery'],
    modules: ['WordPress foundations', 'Pages, themes, and plugins', 'WooCommerce basics', 'Speed, security, and handoff'],
    relatedBlogs: ['why-ssr-matters-for-course-websites']
  },
  {
    slug: 'graphic-design',
    title: 'Graphic Design',
    category: 'Creative Design',
    summary: 'Learn design fundamentals, Adobe tools, branding, social media creatives, and portfolio presentation.',
    duration: '3 months',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80',
    outcomes: ['Brand identity', 'Social media design', 'Photo editing', 'Portfolio building'],
    modules: ['Design principles', 'Photoshop and Illustrator', 'Brand systems', 'Freelance-ready portfolio'],
    relatedBlogs: ['how-to-build-a-web-development-portfolio']
  }
];

export const blogs = [
  {
    slug: 'why-ssr-matters-for-course-websites',
    title: 'Why SSR and SSG Matter for Course Websites',
    excerpt: 'Search engines index education pages more reliably when course information is delivered as rendered HTML.',
    date: '2026-05-01',
    relatedCourses: ['full-stack-react', 'wordpress-mastery'],
    body: [
      'Course websites need discoverable outlines, outcomes, pricing context, and internal links. When that content is only assembled in the browser, crawlers can miss important signals.',
      'A hybrid Next.js model lets evergreen pages ship as static HTML, course pages refresh through ISR, and inquiry forms stay interactive through client-side API calls.'
    ]
  },
  {
    slug: 'how-to-build-a-web-development-portfolio',
    title: 'How to Build a Web Development Portfolio',
    excerpt: 'A strong portfolio proves skills through deployed projects, clear case studies, and practical technical decisions.',
    date: '2026-04-20',
    relatedCourses: ['full-stack-react', 'laravel-mastery', 'graphic-design'],
    body: [
      'A portfolio should show what you can build, how you think, and whether you can finish work cleanly. Three polished projects usually beat ten unfinished experiments.',
      'For students, the best portfolio path is to build one frontend project, one API-backed app, and one client-style website with proper SEO and responsive design.'
    ]
  }
];

export const mediaItems = [
  {
    slug: 'student-project-showcase',
    title: 'Student Project Showcase',
    type: 'Gallery',
    summary: 'A curated look at portfolio work, landing pages, dashboards, and creative projects built by DeepSkills learners.'
  },
  {
    slug: 'training-workshops',
    title: 'Training Workshops',
    type: 'Video',
    summary: 'Highlights from practical classroom sessions, mentorship activities, and skill-building workshops.'
  }
];

export const getCourseBySlug = (slug) => courses.find((course) => course.slug === slug);
export const getBlogBySlug = (slug) => blogs.find((blog) => blog.slug === slug);
