-- Migration: Staff and Faculty Hybrid Time Tracking System
-- Description: Supports daily shift attendance (punch clock) and Clockify-style project/task time tracking for both staff and teachers.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Institutional Time Tracking Projects / Categories
CREATE TABLE IF NOT EXISTS staff_time_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  color TEXT DEFAULT '#378ADD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard institutional projects
INSERT INTO staff_time_projects (name, department, color) VALUES
  ('Admissions & Prospective Counseling', 'Admissions', '#378ADD'),
  ('Student Inquiries & CRM Follow-ups', 'Admissions', '#0284C7'),
  ('Lecture Delivery & Classroom Teaching', 'Faculty', '#8B5CF6'),
  ('Practical Lab Demonstrations', 'Faculty', '#6366F1'),
  ('Assignment & Quiz Grading', 'Faculty', '#EC4899'),
  ('Curriculum & Content Preparation', 'Academics', '#F59E0B'),
  ('Student Academic Counseling & Support', 'Academics', '#10B981'),
  ('Fee Vouchers & Payment Reconciliation', 'Finance', '#059669'),
  ('Financial Reporting & Bookkeeping', 'Finance', '#14B8A6'),
  ('Recruitment & Faculty Onboarding', 'HR', '#A855F7'),
  ('Institutional Administration & Meetings', 'Operations', '#64748B'),
  ('IT Systems & Technical Support', 'Operations', '#0EA5E9')
ON CONFLICT DO NOTHING;

-- 2. Staff & Faculty Daily Shifts (Attendance Punch Clock)
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'teacher')),
  actor_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  total_break_seconds INTEGER DEFAULT 0,
  total_work_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'on_duty' CHECK (status IN ('on_duty', 'on_break', 'completed', 'absent')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_staff_shifts_actor_date UNIQUE (date, actor_type, actor_id)
);

-- 3. Staff & Faculty Task Time Entries (Clockify-style Logs)
CREATE TABLE IF NOT EXISTS staff_time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'teacher')),
  actor_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES staff_time_projects(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  is_running BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL,
  billable BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'approved' CHECK (status IN ('draft', 'submitted', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_staff_time_projects_dept ON staff_time_projects (department, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_lookup ON staff_shifts (actor_type, actor_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts (date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_status ON staff_shifts (status);
CREATE INDEX IF NOT EXISTS idx_staff_time_entries_actor ON staff_time_entries (actor_type, actor_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_time_entries_date ON staff_time_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_time_entries_project ON staff_time_entries (project_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_entries_running ON staff_time_entries (actor_type, actor_id) WHERE is_running = TRUE;

-- Enable Row Level Security
ALTER TABLE staff_time_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_entries ENABLE ROW LEVEL SECURITY;

-- Allow public read of active projects
DROP POLICY IF EXISTS "Allow read active projects" ON staff_time_projects;
CREATE POLICY "Allow read active projects" ON staff_time_projects
  FOR SELECT USING (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access staff_time_projects" ON staff_time_projects;
CREATE POLICY "Service role full access staff_time_projects" ON staff_time_projects
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access staff_shifts" ON staff_shifts;
CREATE POLICY "Service role full access staff_shifts" ON staff_shifts
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access staff_time_entries" ON staff_time_entries;
CREATE POLICY "Service role full access staff_time_entries" ON staff_time_entries
  FOR ALL USING (auth.role() = 'service_role');
