-- Unify HR Engine for Faculty and Non-Teaching Staff
-- Allows hr_profiles to reference users(id) for administrative staff and seeds staff JD templates

-- 1. Modify hr_profiles to support staff candidates
DO $$
BEGIN
  -- Ensure teacher_id is nullable if previously constrained
  ALTER TABLE hr_profiles ALTER COLUMN teacher_id DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN others THEN NULL;
END $$;

ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hr_profiles_user_id_key'
  ) THEN
    ALTER TABLE hr_profiles ADD CONSTRAINT hr_profiles_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'faculty';
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS account_title TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS iban TEXT;

CREATE INDEX IF NOT EXISTS idx_hr_profiles_user ON hr_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_type ON hr_profiles(employee_type);

-- 2. Seed administrative staff Job Description (JD) templates
INSERT INTO hr_jd_templates (
  specialization,
  employment_type,
  title_template,
  location_mode,
  department,
  reporting_to,
  responsibilities,
  requirements,
  what_we_offer,
  working_hours
)
VALUES
(
  'Admission Counsellor',
  'Full-time',
  'Admission Counsellor',
  'Onsite',
  'Admissions & Marketing',
  'Head of Admissions',
  '["Handle prospective student inquiries via walk-ins, phone calls, and web leads.", "Guide students and parents through course curriculums, schedules, and career roadmaps.", "Manage lead pipelines and follow-ups within the institute CRM.", "Assist applicants through fee discount requests, voucher generation, and enrollment confirmation.", "Coordinate orientation sessions for newly admitted cohorts.", "Maintain strict confidentiality regarding student records and contact details."]'::jsonb,
  '["Bachelor''s degree in Communications, Business, Marketing, or relevant field.", "Excellent verbal and written communication skills in Urdu and English.", "Demonstrated empathy, active listening, and convincing interpersonal skills.", "Prior experience in academic counseling, student admissions, or customer relations.", "Proficiency with CRM software and office productivity tools."]'::jsonb,
  '["Market-competitive basic salary with performance-based admission incentives.", "Professional training in educational counseling and institutional CRM operations.", "Collaborative and respectful campus work environment.", "Health allowance and annual paid leave quota."]'::jsonb,
  '10:00 AM – 7:00 PM (Monday through Saturday)'
),
(
  'Finance Officer',
  'Full-time',
  'Finance & Accounts Officer',
  'Onsite',
  'Finance & Accounts',
  'Chief Financial Officer',
  '["Manage student fee collections, installment schedules, and payment reconciliations.", "Issue verified bank vouchers and electronic receipts for tuition and admissions.", "Track outstanding dues, overdue notices, and fee recovery workflows.", "Disburse faculty and staff monthly payrolls and maintain attendance-linked payroll records.", "Prepare daily cash flow logs, bank deposit summaries, and month-end financial statements.", "Ensure compliance with institutional financial policies, audits, and taxation guidelines."]'::jsonb,
  '["Bachelor''s or Master''s degree in Accounting, Finance, Commerce (B.Com/M.Com/BBA).", "Minimum 1-3 years of proven accounting or finance operations experience.", "High integrity, accuracy, and attention to detail when handling financial transactions.", "Strong proficiency in spreadsheets, accounting software, and ledger reconciliation.", "Thorough knowledge of Pakistani banking systems and digital payment gateways."]'::jsonb,
  '["Competitive compensation package.", "Opportunity for career progression into financial management.", "Continuous professional development and audit exposure.", "Annual performance bonuses and paid leave."]'::jsonb,
  '9:00 AM – 6:00 PM (Monday through Saturday)'
),
(
  'Academic Coordinator',
  'Full-time',
  'Academic Operations Coordinator',
  'Onsite',
  'Academics & Operations',
  'Academic Director',
  '["Coordinate daily batch schedules, classroom allocations, and timetable compliance.", "Monitor student daily attendance, late arrivals, and geofence verification.", "Liaise between students, faculty instructors, and administration regarding academic progress.", "Organize midterm and final examination schedules, invigilation, and rubrics evaluation.", "Oversee assignment and quiz submissions, grading deadlines, and certificate generation.", "Address student grievances and complaints in coordination with course instructors."]'::jsonb,
  '["Bachelor''s degree in Education, Computer Science, or Management Sciences.", "Strong organizational, scheduling, and multi-tasking abilities.", "Excellent conflict resolution, interpersonal, and communication skills.", "Prior operational coordination or academic administration experience.", "Comfortable utilizing Learning Management Systems (LMS) and student portals."]'::jsonb,
  '["Stable career path within institutional management.", "Modern digital campus environment with integrated ERP tools.", "Professional mentorship from senior academic leadership.", "Annual increments and institutional benefits."]'::jsonb,
  '9:00 AM – 6:00 PM (Monday through Saturday)'
),
(
  'HR & Faculty Manager',
  'Full-time',
  'HR & Faculty Operations Manager',
  'Onsite',
  'Human Resources',
  'Executive Director',
  '["Lead end-to-end recruitment for teaching faculty, lab demonstrators, and campus staff.", "Compose tailored Job Descriptions (JDs), employment contracts, and appointment dossiers.", "Facilitate candidate digital onboarding, document verification, and orientation workflows.", "Maintain official personnel files, leave absence logs, and instructor substitute records.", "Conduct periodic performance evaluations, faculty feedback surveys, and exit interviews.", "Foster a positive, compliant, and growth-oriented institutional culture."]'::jsonb,
  '["Bachelor''s or Master''s degree in Human Resource Management, Business, or Psychology.", "Minimum 2-4 years of experience in HR operations or talent management.", "In-depth understanding of employment contracts, NDAs, and labor practices.", "Exceptional communication, documentation, and interpersonal mediation skills.", "Discretion and high ethical standards when handling confidential personnel files."]'::jsonb,
  '["Leadership role shaping institutional talent and faculty culture.", "Competitive executive salary package.", "Comprehensive employee health coverage and paid leave policies.", "Executive professional networking opportunities."]'::jsonb,
  '9:00 AM – 6:00 PM (Monday through Friday)'
),
(
  'Marketing & Media Specialist',
  'Full-time',
  'Marketing & Media Specialist',
  'Hybrid',
  'Marketing & Public Relations',
  'Director of Marketing',
  '["Plan, execute, and monitor digital marketing campaigns across social media channels.", "Publish institutional blog articles, success stories, announcements, and press releases.", "Coordinate photo and video coverage of campus workshops, guest lectures, and student projects.", "Manage student testimonials, review curation, and student referral programs.", "Track campaign ROAS, inquiry conversion rates, and web traffic analytics.", "Maintain brand identity, visual guidelines, and institutional reputation online."]'::jsonb,
  '["Bachelor''s degree in Marketing, Mass Communication, Media Studies, or related field.", "Strong copywriting, storytelling, and digital content curation skills.", "Experience with Meta Ads Manager, Google Analytics, Canva/Adobe Creative Suite, and WordPress CMS.", "Familiarity with SEO principles, hashtag strategies, and educational marketing trends.", "Enthusiastic, creative, and proactive attitude."]'::jsonb,
  '["Creative freedom and budget for high-impact promotional campaigns.", "Hybrid working flexibility.", "Performance incentives on lead generation and brand reach.", "Supportive and dynamic creative team environment."]'::jsonb,
  '10:00 AM – 7:00 PM (Monday through Saturday, flexible hybrid)'
),
(
  'Auditor / Quality Assurance Officer',
  'Part-time',
  'Institutional Auditor & QA Officer',
  'Onsite',
  'Internal Audit & Compliance',
  'Board of Directors',
  '["Review financial ledgers, fee vouchers, discounts, and payment records for accuracy.", "Inspect academic delivery, attendance logs, and result compilation standards.", "Audit administrative workflows and ensure compliance with internal institute guidelines.", "Generate quarterly audit reports with risk assessments and actionable improvements.", "Verify faculty dossier completeness, signed contracts, and tax compliance records."]'::jsonb,
  '["Certified Internal Auditor (CIA), ACCA affiliate, or relevant degree in Commerce/Audit.", "Minimum 2 years of external or internal auditing experience.", "Impeccable ethical integrity, analytical rigor, and attention to detail.", "Ability to produce clear, objective, and well-structured audit documentation."]'::jsonb,
  '["Direct reporting line to institutional governance.", "Competitive retainer or audit milestone compensation.", "Independent and respected oversight mandate.", "Flexible audit scheduling."]'::jsonb,
  'Flexible scheduling based on audit milestones'
)
ON CONFLICT DO NOTHING;
