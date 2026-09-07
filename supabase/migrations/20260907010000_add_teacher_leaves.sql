-- Migration: 20260907010000_add_teacher_leaves.sql
-- Description: Add teacher_leaves table for faculty leave management and substitute coordination

CREATE TABLE IF NOT EXISTS public.teacher_leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'Casual',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  substitute_teacher_id UUID REFERENCES public.teachers(id),
  substitute_notes TEXT,
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_leaves_teacher ON public.teacher_leaves(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_leaves_status ON public.teacher_leaves(status);
CREATE INDEX IF NOT EXISTS idx_teacher_leaves_dates ON public.teacher_leaves(start_date, end_date);
