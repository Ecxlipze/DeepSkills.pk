-- ============================================
-- Phase 6: Academic Complaints & Grievance Desk Enhancements
-- Optional Supabase Migration
-- ============================================

-- 1. Ensure core complaints table exists with complete structure
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT,
  student_cnic TEXT,
  course TEXT,
  batch TEXT,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'Academic',
  status TEXT DEFAULT 'Open',
  priority TEXT DEFAULT 'Normal',
  send_to TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure complaint_messages table exists
CREATE TABLE IF NOT EXISTS public.complaint_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_status_priority ON public.complaints(status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_student_cnic ON public.complaints(student_cnic);
CREATE INDEX IF NOT EXISTS idx_complaints_batch ON public.complaints(batch);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_comp_id ON public.complaint_messages(complaint_id, created_at ASC);

-- 4. RLS Security Policies
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaints' AND policyname = 'Allow all for complaints') THEN
    CREATE POLICY "Allow all for complaints" ON public.complaints FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaint_messages' AND policyname = 'Allow all for complaint_messages') THEN
    CREATE POLICY "Allow all for complaint_messages" ON public.complaint_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
