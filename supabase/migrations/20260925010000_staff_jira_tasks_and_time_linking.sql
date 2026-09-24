-- Migration: Jira-Style Staff Tasks & Time Tracking Integration
-- Description: Creates staff_tasks table with Kanban stages, timeline dates, priorities, and links staff_time_entries to tasks.

CREATE SEQUENCE IF NOT EXISTS staff_task_key_seq START WITH 101;

CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_key TEXT NOT NULL UNIQUE DEFAULT ('DS-' || nextval('staff_task_key_seq')::TEXT),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('lowest', 'low', 'medium', 'high', 'highest')),
  department TEXT DEFAULT 'Operations',
  project_id UUID REFERENCES staff_time_projects(id) ON DELETE SET NULL,
  assignee_id UUID,
  assignee_type TEXT DEFAULT 'user' CHECK (assignee_type IN ('user', 'teacher')),
  assignee_name TEXT DEFAULT '',
  assignee_email TEXT DEFAULT '',
  creator_id UUID,
  creator_name TEXT DEFAULT '',
  start_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  estimated_hours NUMERIC(6, 2) DEFAULT 0,
  total_logged_seconds INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  subtasks JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure subtasks and attachments columns exist if table was already created
ALTER TABLE staff_tasks
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Link time entries directly to tasks
ALTER TABLE staff_time_entries
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES staff_tasks(id) ON DELETE SET NULL;

-- Indexes for lightning fast Jira Board queries and timeline rendering
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks (status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON staff_tasks (priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assignee ON staff_tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_dates ON staff_tasks (start_date, due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_order ON staff_tasks (status, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_staff_time_entries_task_id ON staff_time_entries (task_id);

-- Row Level Security
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access staff_tasks" ON staff_tasks;
CREATE POLICY "Service role full access staff_tasks" ON staff_tasks
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow read staff_tasks for authenticated staff" ON staff_tasks;
CREATE POLICY "Allow read staff_tasks for authenticated staff" ON staff_tasks
  FOR SELECT USING (true);

