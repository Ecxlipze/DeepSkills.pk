-- Migration: Deduplicate and enforce unique JD templates
-- Description: Removes duplicate seed templates, updates any foreign keys, and adds a unique constraint.

DO $$
DECLARE
  dup RECORD;
  keeper_id UUID;
BEGIN
  -- Iterate over duplicate groups of active templates
  FOR dup IN
    SELECT LOWER(specialization) AS spec_lower, LOWER(employment_type) AS emp_lower, COUNT(*)
    FROM hr_jd_templates
    WHERE is_active = true
    GROUP BY LOWER(specialization), LOWER(employment_type)
    HAVING COUNT(*) > 1
  LOOP
    -- Identify the primary template to keep (earliest created_at)
    SELECT id INTO keeper_id
    FROM hr_jd_templates
    WHERE LOWER(specialization) = dup.spec_lower
      AND LOWER(employment_type) = dup.emp_lower
      AND is_active = true
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

    -- Update any hr_jds that referenced the duplicate templates
    UPDATE hr_jds
    SET template_id = keeper_id
    WHERE template_id IN (
      SELECT id FROM hr_jd_templates
      WHERE LOWER(specialization) = dup.spec_lower
        AND LOWER(employment_type) = dup.emp_lower
        AND id <> keeper_id
    );

    -- Delete the duplicate rows
    DELETE FROM hr_jd_templates
    WHERE LOWER(specialization) = dup.spec_lower
      AND LOWER(employment_type) = dup.emp_lower
      AND id <> keeper_id;
  END LOOP;
END $$;

-- Enforce uniqueness on active templates
CREATE UNIQUE INDEX IF NOT EXISTS hr_jd_templates_unique_active_spec
ON public.hr_jd_templates (LOWER(specialization), LOWER(employment_type))
WHERE is_active = true;

-- Update RLS policies to allow authenticated administrative users to manage templates
DROP POLICY IF EXISTS "hr_jd_templates_authenticated_admin_access" ON public.hr_jd_templates;
CREATE POLICY "hr_jd_templates_authenticated_admin_access"
ON public.hr_jd_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
