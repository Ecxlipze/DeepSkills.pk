-- Academic Phase 4: Examination & Grading Suite Enhancement
-- Adds optional columns for comprehensive marksheet auditing and publication state

ALTER TABLE IF EXISTS public.results
  ADD COLUMN IF NOT EXISTS exam_marks NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS component_breakdown JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS results_batch_exam_idx ON public.results (batch_id, exam_type);
CREATE INDEX IF NOT EXISTS results_student_idx ON public.results (student_id);
