-- Seeds for job_postings table
INSERT INTO job_postings (
  title,
  slug,
  department,
  job_type,
  workplace_type,
  location,
  experience_level,
  salary_range,
  description,
  responsibilities,
  requirements,
  benefits,
  status,
  is_featured,
  deadline,
  created_at,
  updated_at
) VALUES
(
  'Senior Full-Stack Web Development Instructor (MERN)',
  'senior-full-stack-mern-instructor',
  'Teaching / Faculty',
  'Full-time',
  'On-site',
  'Gulberg III, Lahore',
  'Senior',
  'PKR 120,000 - 180,000 / month',
  'We are seeking an experienced Full-Stack JavaScript Engineer and Instructor to lead our intensive MERN stack training tracks. You will guide aspiring developers through real-world projects, architectural principles, and modern web application deployment.',
  ARRAY[
    'Deliver engaging, hands-on lectures in React, Next.js, Node.js, Express, and MongoDB/PostgreSQL.',
    'Mentor students during practical lab hours, debugging sessions, and code reviews.',
    'Develop and continuously refine project-based curriculum and capstone assignments.',
    'Assess student project submissions and prepare graduates for tech interviews.'
  ],
  ARRAY[
    '3+ years of professional full-stack web development experience.',
    'Strong proficiency with modern React, Next.js, Node.js, REST APIs, and database design.',
    'Exceptional communication and teaching skills with patience for beginners.',
    'Prior teaching or technical mentorship experience is a strong plus.'
  ],
  ARRAY[
    'Competitive salary package with bi-annual performance bonuses',
    'Paid annual leaves and health insurance support',
    'Free access to all DeepSkills courses and workshops',
    'High-energy, tech-driven collaborative campus culture'
  ],
  'published',
  true,
  NOW() + INTERVAL '45 days',
  NOW() - INTERVAL '2 days',
  NOW()
),
(
  'Lead UI/UX & Graphic Design Trainer',
  'lead-ui-ux-graphic-design-trainer',
  'Teaching / Faculty',
  'Full-time',
  'On-site',
  'Gulberg III, Lahore',
  'Mid Level',
  'PKR 90,000 - 140,000 / month',
  'Lead our flagship Graphic Design and UI/UX design cohort. Empower students to master Figma, Adobe Creative Cloud, branding systems, design systems, and user-centered design methodologies.',
  ARRAY[
    'Teach visual hierarchy, typography, color theory, and Figma UI/UX prototyping.',
    'Conduct design critiques, portfolio reviews, and freelance preparation workshops.',
    'Help students build Behance and Dribbble portfolios that win client work.'
  ],
  ARRAY[
    '2+ years of professional UI/UX and graphic design experience.',
    'Mastery of Figma, Adobe Illustrator, and Photoshop.',
    'A strong personal portfolio demonstrating visual and product design mastery.'
  ],
  ARRAY[
    'Market-competitive compensation with annual increments',
    'Modern Apple iMac workstation provided',
    'Creative freedom to innovate curriculum and design challenges'
  ],
  'published',
  true,
  NOW() + INTERVAL '30 days',
  NOW() - INTERVAL '3 days',
  NOW()
),
(
  'Next.js & Frontend Engineer',
  'nextjs-frontend-engineer',
  'Software & IT',
  'Full-time',
  'Hybrid',
  'Lahore, Pakistan',
  'Mid Level',
  'PKR 100,000 - 150,000 / month',
  'Join our internal software development team building DeepSkills portals, student learning systems, real-time messaging, and high-performance web applications.',
  ARRAY[
    'Build and maintain responsive user interfaces with Next.js, React, and styled-components.',
    'Integrate Supabase backend services, PostgreSQL queries, and real-time sockets.',
    'Optimize Core Web Vitals, page load speeds, and SEO structured data.'
  ],
  ARRAY[
    '2+ years of production experience with React and Next.js.',
    'Proficiency with state management, CSS-in-JS (styled-components), and Framer Motion.',
    'Experience with Supabase or PostgreSQL database workflows.'
  ],
  ARRAY[
    'Hybrid workplace flexibility (2 days remote per week)',
    'Hardware and learning allowances',
    'Work with a passionate, nimble engineering team'
  ],
  'published',
  false,
  NOW() + INTERVAL '60 days',
  NOW() - INTERVAL '5 days',
  NOW()
),
(
  'Student Academic Counsellor & Admissions Officer',
  'student-counsellor-admissions-officer',
  'Operations & Admin',
  'Full-time',
  'On-site',
  'Gulberg III, Lahore',
  'Entry Level',
  'PKR 60,000 - 90,000 / month + Incentives',
  'Be the first point of contact for aspiring students. Guide students and parents in selecting the right tech career paths, manage course inquiries, and facilitate enrollment.',
  ARRAY[
    'Respond promptly to prospective student inquiries via phone, WhatsApp, and campus walk-ins.',
    'Conduct career counselling sessions to match students with the most suitable course.',
    'Manage student registration records and batch enrollment workflows.'
  ],
  ARRAY[
    'Bachelor’s degree with strong verbal and written communication in English and Urdu.',
    'Empathetic, persuasive, and student-focused attitude.',
    'Proficiency with CRM tools, Google Sheets, and WhatsApp Business.'
  ],
  ARRAY[
    'Attractive commission structure on batch admissions',
    'Professional career growth into campus management',
    'Comprehensive training on IT industry careers'
  ],
  'published',
  false,
  NOW() + INTERVAL '25 days',
  NOW() - INTERVAL '6 days',
  NOW()
),
(
  'Laravel & PHP Backend Instructor (Evening Track)',
  'laravel-backend-instructor-part-time',
  'Teaching / Faculty',
  'Part-time',
  'On-site',
  'Gulberg III, Lahore',
  'Senior',
  'PKR 60,000 - 90,000 / month (Part-time)',
  'Teach our evening and weekend Laravel bootcamp for working professionals. Focus on robust backend architecture, RESTful APIs, Eloquent ORM, and enterprise application patterns.',
  ARRAY[
    'Deliver 6 to 8 hours of interactive lectures per week (evenings/weekends).',
    'Guide students through real-world enterprise projects in Laravel 11.',
    'Mentor students on Git collaboration, database indexing, and API security.'
  ],
  ARRAY[
    '3+ years of hands-on Laravel / PHP software engineering experience.',
    'Passion for teaching and ability to explain complex backend concepts clearly.'
  ],
  ARRAY[
    'Flexible evening/weekend schedule suited for working software engineers',
    'Networking with industry professionals and top tech talent'
  ],
  'published',
  false,
  NOW() + INTERVAL '40 days',
  NOW() - INTERVAL '7 days',
  NOW()
),
(
  'Digital Marketing & Growth Specialist',
  'digital-marketing-growth-specialist',
  'Marketing & Growth',
  'Full-time',
  'On-site',
  'Gulberg III, Lahore',
  'Mid Level',
  'PKR 80,000 - 120,000 / month',
  'Drive brand awareness, lead generation, and social media reach for DeepSkills bootcamps across Meta, Google Ads, TikTok, and YouTube.',
  ARRAY[
    'Plan and run performance ad campaigns targeting prospective students in tech.',
    'Manage social media channels with viral tech reels, student stories, and carousel tips.',
    'Analyze campaign ROI and optimize student lead acquisition costs.'
  ],
  ARRAY[
    '2+ years managing performance marketing campaigns in edtech or agency environments.',
    'Strong grasp of Meta Ads Manager, Google Search/Display Ads, and analytics.'
  ],
  ARRAY[
    'Performance bonuses tied to enrollment milestones',
    'Creative freedom to experiment with campaigns and video content'
  ],
  'published',
  false,
  NOW() + INTERVAL '35 days',
  NOW() - INTERVAL '8 days',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
