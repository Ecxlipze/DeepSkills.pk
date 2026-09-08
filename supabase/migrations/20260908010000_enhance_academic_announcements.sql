-- ============================================
-- Phase 5: Academic Announcements Enhancements
-- Optional Supabase Migration
-- ============================================

-- 1. Ensure core announcements table exists with all standard columns
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  posted_by_id UUID,
  posted_by_name TEXT,
  posted_by_role TEXT DEFAULT 'admin',
  audience_type TEXT DEFAULT 'broadcast',
  audience_courses TEXT[],
  audience_batches TEXT[],
  audience_roles TEXT[] DEFAULT ARRAY['student', 'teacher'],
  priority TEXT DEFAULT 'normal',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add priority column if missing in existing table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN priority TEXT DEFAULT 'normal';
  END IF;
END $$;

-- 3. Ensure announcement_attachments table exists
CREATE TABLE IF NOT EXISTS public.announcement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  file_name TEXT,
  file_size TEXT,
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure announcement_reads table exists
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id TEXT,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_active_posted ON public.announcements(is_active, is_pinned, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_audience_type ON public.announcements(audience_type);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_ann_user ON public.announcement_reads(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_ann_id ON public.announcement_attachments(announcement_id);

-- 6. Row Level Security Policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Allow all for announcements') THEN
    CREATE POLICY "Allow all for announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcement_attachments' AND policyname = 'Allow all for announcement_attachments') THEN
    CREATE POLICY "Allow all for announcement_attachments" ON public.announcement_attachments FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcement_reads' AND policyname = 'Allow all for announcement_reads') THEN
    CREATE POLICY "Allow all for announcement_reads" ON public.announcement_reads FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
