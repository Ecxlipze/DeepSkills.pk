-- Migration: 20260906000000_unique_teacher_payments_month.sql
-- Description: Enforce unique constraint on teacher_payments (teacher_id, month) to prevent duplicate salary disbursements.

DO $$
BEGIN
  IF to_regclass('public.teacher_payments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.teacher_payments'::regclass
        AND conname = 'teacher_payments_teacher_month_key'
    ) THEN
      ALTER TABLE public.teacher_payments
        ADD CONSTRAINT teacher_payments_teacher_month_key
        UNIQUE (teacher_id, month);
    END IF;
  END IF;
END $$;
