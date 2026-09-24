-- Run this in the Supabase SQL Editor

-- 1. Add new columns to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🎓';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'maroon';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reenrollment_discount_pct INTEGER DEFAULT 5;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Add new columns to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 30;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS timing_label TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Add lifecycle columns to admissions table
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ;

-- 4. Backfill course_id from the existing course text column
UPDATE batches b
SET course_id = c.id
FROM courses c
WHERE b.course = c.title
AND b.course_id IS NULL;
