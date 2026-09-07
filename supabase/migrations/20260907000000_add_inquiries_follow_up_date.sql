-- Migration: 20260907000000_add_inquiries_follow_up_date.sql
-- Description: Add follow_up_date column and index to inquiries table for scheduled counsellor follow-up tracking

ALTER TABLE IF EXISTS public.inquiries
  ADD COLUMN IF NOT EXISTS follow_up_date DATE;

CREATE INDEX IF NOT EXISTS idx_inquiries_follow_up_date
  ON public.inquiries(follow_up_date);
