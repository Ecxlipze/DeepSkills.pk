-- Migration: 20260906000000_unique_teacher_payments_month.sql
-- Description: Enforce unique constraint on teacher_payments (teacher_id, month) to prevent concurrent duplicate salary disbursements.

DO $$
BEGIN
  IF to_regclass('public.teacher_payments') IS NOT NULL THEN
    -- 1. Create unique index if it does not already exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'teacher_payments' 
        AND indexname = 'idx_teacher_payments_teacher_month_unique'
    ) THEN
      CREATE UNIQUE INDEX idx_teacher_payments_teacher_month_unique 
        ON public.teacher_payments (teacher_id, month);
    END IF;

    -- 2. Add table constraint using the unique index if not already present
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.teacher_payments'::regclass 
        AND conname = 'teacher_payments_teacher_month_key'
    ) THEN
      ALTER TABLE public.teacher_payments 
        ADD CONSTRAINT teacher_payments_teacher_month_key 
        UNIQUE USING INDEX idx_teacher_payments_teacher_month_unique;
    END IF;
  END IF;
END $$;
