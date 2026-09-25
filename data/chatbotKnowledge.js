// Knowledge base for the public site assistant (/api/chat).
// Every answer here must be backed by content that already exists on the public
// site. When a fact is not published (fees, class timings), the answer routes the
// visitor to the inquiry/contact page instead of inventing a number.

import { site, courses, blogs, mediaItems } from './siteContent.js';
import { resolveCourseSlug, COURSE_DETAIL_PATH_BY_SLUG } from '../src/utils/enrollmentNavigation.js';

const addressLine = `${site.address.street}, ${site.address.locality}, ${site.address.country === 'PK' ? 'Pakistan' : site.address.country}`;

// Question phrasings map to the vocabulary used on the site, so a visitor asking
// about "cost" still reaches the fee entry.
export const synonyms = {
  fee: ['fees', 'cost', 'price', 'pricing', 'charges', 'payment', 'installment', 'installments', 'afford', 'expensive', 'rupees', 'pkr'],
  admission: ['admissions', 'enroll', 'enrol', 'enrollment', 'join', 'joining', 'apply', 'application', 'register', 'registration', 'signup'],
  course: ['courses', 'program', 'programs', 'programme', 'class', 'classes', 'training', 'diploma', 'batch'],
  duration: ['long', 'months', 'month', 'length', 'time', 'timeline'],
  timing: ['timings', 'schedule', 'hours', 'shift', 'evening', 'morning', 'weekend', 'when'],
  online: ['remote', 'virtual', 'zoom', 'distance', 'onsite', 'physical'],
  location: ['address', 'where', 'located', 'branch', 'office', 'lahore', 'gulberg', 'map', 'visit', 'kahan'],
  contact: ['phone', 'call', 'email', 'whatsapp', 'reach', 'number', 'helpline', 'support'],
  internship: ['internships', 'intern', 'kickstart'],
  job: ['jobs', 'career', 'careers', 'employment', 'placement', 'salary', 'earn', 'earning', 'freelance', 'freelancing', 'income'],
  hiring: ['hire', 'vacancy', 'vacancies', 'recruit', 'recruitment', 'opening', 'openings', 'cv', 'resume'],
  certificate: ['certification', 'certificates', 'verify', 'verification', 'degree'],
  teacher: ['teachers', 'trainer', 'trainers', 'instructor', 'instructors', 'faculty', 'mentor', 'mentors'],
  beginner: ['beginners', 'fresher', 'newbie', 'scratch', 'basic', 'zero', 'nonit'],
  login: ['signin', 'portal', 'dashboard', 'account', 'password'],
  blog: ['blogs', 'article', 'articles', 'post', 'posts'],
  project: ['projects', 'portfolio', 'practical', 'assignment', 'assignments'],
};

// Tie-break weight when two entries score the same (see lib/chatbot.js).
export const PRIORITY = { course: 3, info: 2, blog: 1, media: 1 };

// Course links use the same resolver as the public course pages.
export { resolveCourseSlug };

// Entries authored from published page content.
const staticEntries = [
  {
    id: 'about',
    question: 'What is DeepSkills?',
    keywords: ['about', 'deepskills', 'company', 'institute', 'mission', 'vision', 'story'],
    answer: `${site.name} is a skill development institute in Lahore offering practical, career-oriented courses in full stack development, Laravel, WordPress, graphic design, UI/UX and digital marketing. The focus is on understanding, practice and progress, so learners finish job-ready rather than just certified.`,
    link: '/about',
    linkLabel: 'About DeepSkills',
  },
  {
    id: 'fees',
    capturesLead: true,
    question: 'How much do the courses cost?',
    keywords: ['fee', 'money', 'budget', 'discount', 'scholarship', 'plan'],
    answer: 'Course fees are shared directly by our admissions team, because they depend on the program and the payment plan you choose. Both one-time payment and installment plans are available. Send an inquiry or email info@deepskills.pk and the team will share the current fee structure for the course you want.',
    link: '/inquiry',
    linkLabel: 'Ask about fees',
  },
  {
    id: 'admission',
    capturesLead: true,
    question: 'How do I enroll or apply?',
    keywords: ['admission', 'start', 'process', 'steps'],
    answer: 'Submit an inquiry form with your name, contact details, city and the course you are interested in. Our team gets back to you with the fee structure, upcoming batch details and next steps. You can also visit the campus in Gulberg III for counselling in person.',
    link: '/inquiry',
    linkLabel: 'Start your inquiry',
  },
  {
    id: 'timings',
    capturesLead: true,
    question: 'What are the class timings?',
    keywords: ['timing', 'start', 'batch', 'days'],
    answer: 'Batch timings depend on the course and the current intake, so the admissions team confirms them when a batch opens. Share the course you are interested in through the inquiry form and we will send you the available slots.',
    link: '/inquiry',
    linkLabel: 'Ask about timings',
  },
  {
    id: 'mode',
    capturesLead: true,
    question: 'Are classes online or onsite?',
    keywords: ['online', 'mode', 'lecture', 'attend', 'home', 'city'],
    answer: 'Lectures run in both modes — onsite at our Lahore campus and online — so you can join from another city. Confirm the mode for your specific batch with the admissions team when you enroll.',
    link: '/contact',
    linkLabel: 'Contact the team',
  },
  {
    id: 'location',
    question: 'Where are you located?',
    keywords: ['location', 'come', 'directions', 'city', 'campus'],
    answer: `Our institute is at ${addressLine}. You are welcome to visit for guidance, counselling, or to learn more about the programs in person.`,
    link: '/contact',
    linkLabel: 'Contact & directions',
  },
  {
    id: 'contact',
    question: 'How do I contact DeepSkills?',
    keywords: ['contact', 'talk', 'query', 'inquiry', 'message', 'speak'],
    answer: `Email ${site.email} for general inquiries, course details or admissions support — we aim to respond to all queries during working hours. You can also send the inquiry form or visit us at ${addressLine}.`,
    link: '/contact',
    linkLabel: 'Contact page',
  },
  {
    id: 'social',
    question: 'Are you on social media?',
    keywords: ['social', 'facebook', 'instagram', 'linkedin', 'tiktok', 'follow', 'media'],
    answer: `Yes — you can follow ${site.name} on Facebook, Instagram, LinkedIn and TikTok. Links are in the footer of every page.`,
    link: '/media',
    linkLabel: 'Media & highlights',
  },
  {
    id: 'internship',
    question: 'Do you offer internships?',
    keywords: ['internship', 'admission', 'experience', 'trainee'],
    answer: 'Yes. The DeepSkills internship program gives learners hands-on experience on real projects with mentorship. You can read the requirements and apply online through the internship page.',
    link: '/internship',
    linkLabel: 'Internship program',
  },
  {
    id: 'careers',
    question: 'Are you hiring?',
    keywords: ['hiring', 'work', 'position', 'role', 'staff'],
    answer: 'Open positions at DeepSkills are listed on the careers page, where you can apply directly with your details and CV.',
    link: '/careers',
    linkLabel: 'View openings',
  },
  {
    id: 'job-outcome',
    capturesLead: true,
    question: 'Will the course help me get a job?',
    keywords: ['job', 'ready', 'industry', 'after', 'client', 'future'],
    answer: 'The programs are industry-aligned and built to make you job-ready: you finish with portfolio-ready projects, and the full stack track also covers the freelancing workflow. We do not publish a placement guarantee \u2014 speak to the admissions team about career support for the course you are considering.',
    link: '/inquiry',
    linkLabel: 'Ask about career support',
  },
  {
    id: 'beginner',
    capturesLead: true,
    question: 'Can I join as a complete beginner?',
    keywords: ['beginner', 'experience', 'prerequisite', 'requirements', 'eligible', 'eligibility', 'background', 'matric', 'intermediate'],
    answer: 'Yes. The courses are built for students exploring career options, beginners learning from scratch and anyone wanting practical skills — IT or non-IT background. Teaching is stress-free for beginners and starts from the fundamentals.',
    link: '/courses',
    linkLabel: 'See the courses',
  },
  {
    id: 'teaching',
    question: 'How do you teach?',
    keywords: ['teach', 'teaching', 'method', 'methodology', 'approach', 'learning', 'practical', 'hands', 'different'],
    answer: 'Teaching is practical and project-driven: concepts first, then hands-on building, with mentorship along the way. Students finish each course with real projects they can show to employers or clients.',
    link: '/about',
    linkLabel: 'How we teach',
  },
  {
    id: 'trainers',
    question: 'Who are the trainers?',
    keywords: ['teacher', 'experienced', 'qualified'],
    answer: 'Courses are delivered by industry-experienced trainers who mentor students through real projects. You can see the team on the trainers page.',
    link: '/trainers',
    linkLabel: 'Meet the trainers',
  },
  {
    id: 'certificate',
    question: 'Do I get a certificate, and how is it verified?',
    keywords: ['certificate', 'award', 'completion', 'valid', 'authentic', 'fake'],
    answer: 'DeepSkills certificates can be checked online. Enter the certificate details on the verification page to confirm that a certificate is genuine.',
    link: '/verify-certificate',
    linkLabel: 'Verify a certificate',
  },
  {
    id: 'projects',
    question: 'Will I build real projects?',
    keywords: ['project', 'build', 'real', 'work', 'showcase'],
    answer: 'Yes — every course is built around practical work, and students finish with portfolio-ready projects. You can see examples of learner work in the student project showcase.',
    link: '/media',
    linkLabel: 'Student showcase',
  },
  {
    id: 'login',
    question: 'How do I log in to the portal?',
    keywords: ['login', 'signin', 'portal', 'attendance', 'result', 'results', 'receipt', 'marks'],
    answer: 'Students, teachers and staff sign in from the login page using the credentials issued by the institute. Inside the portal you can see attendance, results, tasks and fee records. If you cannot sign in, contact the office and the team will reset your access.',
    link: '/login',
    linkLabel: 'Go to login',
  },
  {
    id: 'founder',
    question: 'Who founded DeepSkills?',
    keywords: ['founder', 'ceo', 'owner', 'leadership'],
    answer: 'You can read the founder’s message about why DeepSkills was started and the goals behind the programs.',
    link: '/founder-message',
    linkLabel: 'Founder’s message',
  },
  {
    id: 'blogs',
    question: 'Do you publish articles?',
    keywords: ['blog', 'read', 'guide', 'tips', 'resources'],
    answer: `Yes, we publish practical guides for learners${blogs.length ? `, such as ${blogs.map((b) => `“${b.title}”`).join(' and ')}` : ''}.`,
    link: '/blogs',
    linkLabel: 'Read the blog',
  },
];

// The course list is generated so it always names the courses actually on offer,
// including ones added in the admin panel after this file was written.
export function buildCourseListEntry(list) {
  const named = list.filter((course) => course.title);
  return {
    id: 'courses-list',
    question: 'What courses do you offer?',
    keywords: ['course', 'offer', 'list', 'subjects', 'skills', 'options'],
    answer: named.length
      ? `We currently offer ${named.length} programs: ${named.map((c) => (c.duration ? `${c.title} (${c.duration})` : c.title)).join(', ')}. Each one is project-based and ends with portfolio-ready work.`
      : 'Our current programs are listed on the courses page, and the admissions team can walk you through which one fits your goals.',
    link: '/courses',
    linkLabel: 'Browse all courses',
    priority: PRIORITY.info,
  };
}

// Course entries are generated, so a course added in the admin panel becomes
// answerable without a code change. `courses` from siteContent.js is the
// fallback shape; `buildCourseEntry` also accepts a row from the Supabase
// `courses` table (title, slug, description, duration).
export function buildCourseEntry(course) {
  if (!course?.title) return null;
  const slug = resolveCourseSlug(course);
  if (!slug) return null;

  const category = course.category || '';
  const summary = course.summary || course.description || '';
  const duration = course.duration ? ` runs for ${course.duration}.` : '';
  // The category is used for matching but kept out of the answer: it is a broad
  // admin label (UI/UX Design is filed under "Graphic Design") and reads oddly.
  const heading = course.title;
  const modules = Array.isArray(course.modules) && course.modules.length
    ? ` Modules cover ${course.modules.join(', ')}.`
    : '';
  const outcomes = Array.isArray(course.outcomes) && course.outcomes.length
    ? ` By the end you will have worked on ${course.outcomes.join(', ')}.`
    : '';

  return {
    id: `course-${slug}`,
    question: `Tell me about the ${course.title} course`,
    keywords: [
      ...String(course.title).toLowerCase().split(/\s+/),
      ...String(category).toLowerCase().split(/\s+/).filter(Boolean),
      ...slug.split('-'),
      'course',
      'duration',
      'syllabus',
      'modules',
      'outcomes',
    ],
    // `price` is deliberately excluded: course fees are not published on the
    // public site, so the bot must not quote them (see the `fees` entry).
    answer: `${heading}${duration} ${summary}${modules}${outcomes}`.replace(/\s+/g, ' ').trim(),
    // Only link to a course page the site actually serves; otherwise the listing.
    link: COURSE_DETAIL_PATH_BY_SLUG[slug] || '/courses',
    linkLabel: COURSE_DETAIL_PATH_BY_SLUG[slug] ? `${course.title} details` : 'Browse all courses',
    priority: PRIORITY.course,
    // Someone asking about a specific course is a lead worth following up.
    capturesLead: true,
    courseName: course.title,
  };
}

// Accepts a static blog from siteContent.js or a published row from `blog_posts`.
export function buildBlogEntry(blog) {
  const slug = blog.slug;
  if (!slug || !blog.title) return null;
  const body = Array.isArray(blog.body) ? blog.body[0] : '';
  return {
    id: `blog-${slug}`,
    question: blog.title,
    keywords: [...String(blog.title).toLowerCase().split(/\s+/), 'blog', 'article'],
    answer: `${blog.excerpt || ''} ${body || ''}`.replace(/\s+/g, ' ').trim(),
    link: `/blogs/${slug}`,
    linkLabel: 'Read the full post',
    priority: PRIORITY.blog,
  };
}

const slugify = (value) => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const courseEntries = courses.map(buildCourseEntry).filter(Boolean);
const courseListEntry = buildCourseListEntry(courses);
const blogEntries = blogs.map(buildBlogEntry).filter(Boolean);

// Media titles ("Student Project Showcase") are made of words too generic to
// identify an entry, so these keep a fixed keyword set instead of title words.
const mediaEntries = mediaItems.map((item) => ({
  id: `media-${item.slug}`,
  // Intent-shaped rather than the item title, so generic title words ("Student
  // Project Showcase") cannot be mistaken for what the entry is about.
  question: 'Do you have photos or videos?',
  keywords: ['media', 'gallery', 'video', 'videos', 'showcase', 'photos', 'pictures'],
  answer: `${item.title}: ${item.summary}`,
  link: '/media',
  linkLabel: 'View media',
}));

// Entries that never depend on the database, reused when Supabase is unreachable.
export const baseEntries = [
  ...staticEntries.map((entry) => ({ priority: PRIORITY.info, ...entry })),
  courseListEntry,
  ...mediaEntries.map((entry) => ({ ...entry, priority: PRIORITY.media })),
];
export const staticCourseEntries = courseEntries;
export const staticBlogEntries = blogEntries;

export const knowledgeBase = [...staticEntries, ...courseEntries, ...blogEntries, ...mediaEntries];

// Shown when nothing matches confidently, and as starter chips in the widget.
export const suggestedQuestions = [
  'What courses do you offer?',
  'How much are the fees?',
  'How do I enroll?',
  'Where are you located?',
  'Do you offer internships?',
];

export const fallbackAnswer = `I can only answer from what is published on the ${site.name} site, and I could not find that. Try asking about our courses, admissions, fees, timings, internships or location — or contact the team at ${site.email} and someone will help you directly.`;

// Shown with the callback form.
export const leadPrompt = 'Want the team to get back to you with the details? Leave your name and number.';

export const greetingAnswer = `Hi! I’m the ${site.name} assistant. Ask me about our courses, admissions, fees, internships or how to reach us.`;
