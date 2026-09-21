-- Careers & Job Board Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Job Postings Table
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Full-time', -- 'Full-time', 'Part-time', 'Contract', 'Internship'
  workplace_type TEXT NOT NULL DEFAULT 'On-site', -- 'On-site', 'Remote', 'Hybrid'
  location TEXT NOT NULL DEFAULT 'Lahore, Pakistan',
  experience_level TEXT DEFAULT 'Mid Level', -- 'Entry Level', 'Mid Level', 'Senior', 'Lead'
  salary_range TEXT, -- e.g. 'PKR 80,000 - 120,000 / month' or 'Negotiable'
  description TEXT NOT NULL,
  responsibilities TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT FALSE,
  deadline TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  cnic TEXT,
  resume_url TEXT NOT NULL,
  resume_filename TEXT,
  cover_letter TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  status TEXT CHECK (status IN ('new', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'hired')) DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_job_postings_status_created ON job_postings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_slug ON job_postings (slug);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings (department);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications (status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created ON job_applications (created_at DESC);

-- 3. Storage Bucket for Resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('career-resumes', 'career-resumes', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS Policies
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Allow public read of published jobs
DROP POLICY IF EXISTS "Public can view published job postings" ON job_postings;
CREATE POLICY "Public can view published job postings"
  ON job_postings FOR SELECT
  USING (status = 'published');

-- Allow public to submit applications
DROP POLICY IF EXISTS "Public can insert job applications" ON job_applications;
CREATE POLICY "Public can insert job applications"
  ON job_applications FOR INSERT
  WITH CHECK (true);

-- Allow service role full access (Next.js server API routes use service role)
DROP POLICY IF EXISTS "Service role full access on job_postings" ON job_postings;
CREATE POLICY "Service role full access on job_postings"
  ON job_postings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on job_applications" ON job_applications;
CREATE POLICY "Service role full access on job_applications"
  ON job_applications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
