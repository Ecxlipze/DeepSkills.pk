-- Migration: Fix fee_plans and payments check constraints in enroll_counsellor_student
-- Ensures plan_type is strictly 'full' or 'installment'
-- Ensures payment method is strictly 'cash', 'bank_transfer', 'online', 'cheque', or NULL

CREATE OR REPLACE FUNCTION enroll_counsellor_student(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admission admissions%ROWTYPE;
  v_batch batches%ROWTYPE;
  v_inquiry inquiries%ROWTYPE;
  v_ref referral_codes%ROWTYPE;
  v_settings referral_settings%ROWTYPE;
  v_cnic TEXT := NULLIF(TRIM(payload->>'cnic'), '');
  v_name TEXT := NULLIF(TRIM(payload->>'name'), '');
  v_course TEXT := NULLIF(TRIM(payload->>'course'), '');
  v_batch_id UUID := NULLIF(payload->>'batchId', '')::UUID;
  v_inquiry_id UUID := NULLIF(payload->>'inquiryId', '')::UUID;
  v_final_fee INTEGER := GREATEST(COALESCE((payload->>'finalFee')::INTEGER, 0), 0);
  v_total_fee INTEGER := GREATEST(COALESCE((payload->>'totalFee')::INTEGER, 0), 0);
  v_discount INTEGER := GREATEST(COALESCE((payload->>'discountAmount')::INTEGER, 0), 0);
  v_raw_plan TEXT := LOWER(TRIM(COALESCE(payload->>'paymentPlan', '')));
  v_plan_type TEXT;
  v_installments INTEGER := GREATEST(COALESCE((payload->>'installmentCount')::INTEGER, 1), 1);
  v_first_payment INTEGER := GREATEST(COALESCE((payload->>'firstPayment')::INTEGER, 0), 0);
  v_first_payment_date DATE := COALESCE(NULLIF(payload->>'firstPaymentDate', '')::DATE, CURRENT_DATE);
  v_raw_method TEXT := LOWER(TRIM(COALESCE(payload->>'firstPaymentMethod', '')));
  v_payment_method TEXT;
  v_payment_ref TEXT := NULLIF(payload->>'firstPaymentRef', '');
  v_source TEXT := COALESCE(NULLIF(payload->>'enrollmentSource', ''), 'walk_in');
  v_amount_per INTEGER;
  v_i INTEGER;
  v_enrolled_count INTEGER;
  v_reward INTEGER;
  v_note JSONB;
BEGIN
  IF v_cnic IS NULL OR v_name IS NULL OR v_course IS NULL OR v_batch_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'missing_required', 'message', 'Required enrollment data is missing.');
  END IF;

  -- Normalize plan_type to satisfy fee_plans_plan_type_check: CHECK (plan_type IN ('full', 'installment'))
  IF v_raw_plan IN ('full', 'one-time', 'lump_sum', '1') THEN
    v_plan_type := 'full';
    v_installments := 1;
  ELSE
    v_plan_type := 'installment';
    IF v_raw_plan ~ '^[0-9]+$' AND (v_raw_plan::INTEGER) > 1 AND v_installments = 1 THEN
      v_installments := v_raw_plan::INTEGER;
    END IF;
  END IF;

  -- Normalize payment method to satisfy payments_method_check: CHECK (method IN ('cash', 'bank_transfer', 'online', 'cheque'))
  IF v_raw_method IN ('cash') THEN
    v_payment_method := 'cash';
  ELSIF v_raw_method IN ('bank transfer', 'bank_transfer') THEN
    v_payment_method := 'bank_transfer';
  ELSIF v_raw_method IN ('online', 'easypaisa', 'jazzcash') THEN
    v_payment_method := 'online';
  ELSIF v_raw_method IN ('cheque', 'check') THEN
    v_payment_method := 'cheque';
  ELSIF v_raw_method <> '' THEN
    v_payment_method := REPLACE(v_raw_method, ' ', '_');
  ELSE
    v_payment_method := 'cash';
  END IF;

  -- Check if student is already actively enrolled in this specific course
  IF EXISTS (SELECT 1 FROM admissions WHERE cnic = v_cnic AND course = v_course AND status = 'Active') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_enrolled', 'message', 'This student is already actively enrolled in this course.');
  END IF;

  SELECT * INTO v_batch FROM batches WHERE id = v_batch_id AND COALESCE(status, 'Active') = 'Active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'batch_not_found', 'message', 'Selected batch was not found.');
  END IF;

  SELECT COUNT(*) INTO v_enrolled_count
  FROM admissions
  WHERE batch = v_batch.batch_name AND status = 'Active';

  IF v_enrolled_count >= COALESCE(v_batch.capacity, 30) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'batch_full', 'message', 'This batch is full. Please select another.');
  END IF;

  IF v_plan_type = 'full' THEN
    v_installments := 1;
  END IF;

  INSERT INTO admissions (
    name, father_name, cnic, dob, gender, phone, email, city, address, education,
    hear_about_us, referred_by, referral_code, course, batch, batch_timing,
    batch_assigned_at, status, enrollment_type, enrolled_by, enrollment_source,
    inquiry_id, counsellor_notes, discount_amount, discount_reason, submitted_at, approved_at
  )
  VALUES (
    v_name,
    NULLIF(payload->>'fatherName', ''),
    v_cnic,
    NULLIF(payload->>'dob', '')::DATE,
    NULLIF(payload->>'gender', ''),
    NULLIF(payload->>'phone', ''),
    NULLIF(payload->>'email', ''),
    NULLIF(payload->>'city', ''),
    NULLIF(payload->>'address', ''),
    NULLIF(payload->>'education', ''),
    NULLIF(payload->>'hearAboutUs', ''),
    NULLIF(payload->>'referralCode', ''),
    NULLIF(payload->>'referralCode', ''),
    v_course,
    v_batch.batch_name,
    COALESCE(v_batch.time_shift, v_batch.timing_label, CONCAT(v_batch.start_time, '-', v_batch.end_time)),
    NOW(),
    'Active',
    COALESCE(NULLIF(payload->>'enrollmentType', ''), 'new'),
    'counsellor',
    v_source,
    v_inquiry_id,
    NULLIF(payload->>'notes', ''),
    v_discount,
    NULLIF(payload->>'discountReason', ''),
    NOW(),
    NOW()
  )
  RETURNING * INTO v_admission;

  INSERT INTO allowed_cnics (cnic, name, role, assigned_course, batch)
  VALUES (v_cnic, v_name, 'student', v_course, v_batch.batch_name)
  ON CONFLICT (cnic) DO UPDATE
  SET name = EXCLUDED.name,
      role = EXCLUDED.role,
      assigned_course = EXCLUDED.assigned_course,
      batch = EXCLUDED.batch;

  INSERT INTO fee_plans (
    student_id, course, batch, total_fee, discount_amount, discount_reason, final_fee,
    plan_type, installment_count, created_by
  )
  VALUES (
    v_admission.id, v_course, v_batch.batch_name, v_total_fee, v_discount,
    NULLIF(payload->>'discountReason', ''), v_final_fee, v_plan_type, v_installments, 'counsellor'
  );

  -- GENERATE BALANCED PAYMENT SCHEDULE (zero rupee discrepancy)
  IF v_plan_type = 'full' THEN
    IF v_first_payment >= v_final_fee AND v_final_fee > 0 THEN
      -- Fully paid up front
      INSERT INTO payments (
        entity_id, entity_type, installment_number, total_installments, amount, due_date,
        paid_date, method, reference_number, status, description, notes
      ) VALUES (
        v_admission.id, 'student', NULL, NULL, v_final_fee, v_first_payment_date,
        v_first_payment_date, v_payment_method, v_payment_ref, 'paid', 'Full Course Fee', 'Paid in full at enrollment'
      );
    ELSIF v_first_payment > 0 AND v_first_payment < v_final_fee THEN
      -- Partial payment at enrollment, remaining balance scheduled
      INSERT INTO payments (
        entity_id, entity_type, installment_number, total_installments, amount, due_date,
        paid_date, method, reference_number, status, description, notes
      ) VALUES (
        v_admission.id, 'student', 1, 2, v_first_payment, v_first_payment_date,
        v_first_payment_date, v_payment_method, v_payment_ref, 'paid', 'Down Payment at Enrollment', 'Partial payment'
      );
      INSERT INTO payments (
        entity_id, entity_type, installment_number, total_installments, amount, due_date,
        paid_date, method, reference_number, status, description, notes
      ) VALUES (
        v_admission.id, 'student', 2, 2, (v_final_fee - v_first_payment), (v_first_payment_date + INTERVAL '1 month')::DATE,
        NULL, NULL, NULL, 'pending', 'Remaining Course Fee Balance', 'Due within 30 days'
      );
    ELSE
      -- Zero paid at enrollment, full fee pending
      INSERT INTO payments (
        entity_id, entity_type, installment_number, total_installments, amount, due_date,
        paid_date, method, reference_number, status, description, notes
      ) VALUES (
        v_admission.id, 'student', NULL, NULL, v_final_fee, v_first_payment_date,
        NULL, NULL, NULL, 'pending', 'Full Course Fee', 'Payment pending'
      );
    END IF;
  ELSE
    -- Installment Plan with dynamic remainder distribution
    DECLARE
      v_rem_bal INTEGER;
      v_rem_count INTEGER;
      v_alloc INTEGER := 0;
      v_cur_amt INTEGER;
    BEGIN
      IF v_first_payment > 0 THEN
        -- Voucher 1: Paid down payment
        INSERT INTO payments (
          entity_id, entity_type, installment_number, total_installments, amount, due_date,
          paid_date, method, reference_number, status, description, notes
        ) VALUES (
          v_admission.id, 'student', 1, v_installments, v_first_payment, v_first_payment_date,
          v_first_payment_date, v_payment_method, v_payment_ref, 'paid', 'Installment 1 of ' || v_installments, 'Paid at enrollment'
        );

        v_rem_bal := GREATEST(0, v_final_fee - v_first_payment);
        v_rem_count := GREATEST(1, v_installments - 1);

        -- Vouchers 2..N: Remaining balance distributed evenly
        IF v_installments > 1 AND v_rem_bal > 0 THEN
          FOR v_i IN 2..v_installments LOOP
            IF v_i = v_installments THEN
              v_cur_amt := v_rem_bal - v_alloc;
            ELSE
              v_cur_amt := ROUND(v_rem_bal::NUMERIC / v_rem_count)::INTEGER;
              v_alloc := v_alloc + v_cur_amt;
            END IF;

            INSERT INTO payments (
              entity_id, entity_type, installment_number, total_installments, amount, due_date,
              paid_date, method, reference_number, status, description, notes
            ) VALUES (
              v_admission.id, 'student', v_i, v_installments, v_cur_amt, (v_first_payment_date + ((v_i - 1) || ' months')::INTERVAL)::DATE,
              NULL, NULL, NULL, 'pending', 'Installment ' || v_i || ' of ' || v_installments, NULL
            );
          END LOOP;
        END IF;
      ELSE
        -- Zero first payment: all installments pending
        FOR v_i IN 1..v_installments LOOP
          IF v_i = v_installments THEN
            v_cur_amt := v_final_fee - v_alloc;
          ELSE
            v_cur_amt := ROUND(v_final_fee::NUMERIC / v_installments)::INTEGER;
            v_alloc := v_alloc + v_cur_amt;
          END IF;

          INSERT INTO payments (
            entity_id, entity_type, installment_number, total_installments, amount, due_date,
            paid_date, method, reference_number, status, description, notes
          ) VALUES (
            v_admission.id, 'student', v_i, v_installments, v_cur_amt, (v_first_payment_date + ((v_i - 1) || ' months')::INTERVAL)::DATE,
            NULL, NULL, NULL, 'pending', 'Installment ' || v_i || ' of ' || v_installments, NULL
          );
        END LOOP;
      END IF;
    END;
  END IF;

  -- Close primary inquiry
  IF v_inquiry_id IS NOT NULL THEN
    v_note := jsonb_build_object(
      'note', 'Student enrolled by counsellor.',
      'timestamp', NOW(),
      'by', COALESCE(NULLIF(payload->>'counsellorName', ''), 'Counsellor')
    );

    UPDATE inquiries
    SET status = 'enrolled',
        admission_id = v_admission.id,
        last_updated = NOW(),
        counsellor_notes = COALESCE(counsellor_notes, '[]'::jsonb) || jsonb_build_array(v_note)
    WHERE id = v_inquiry_id
    RETURNING * INTO v_inquiry;

    INSERT INTO inquiry_notes (inquiry_id, note, status_changed_to, added_by)
    VALUES (v_inquiry_id, 'Student enrolled by counsellor.', 'enrolled', COALESCE(NULLIF(payload->>'counsellorName', ''), 'Counsellor'));
  END IF;

  -- Auto-close any duplicate open inquiries for this candidate and course
  UPDATE inquiries
  SET status = 'enrolled',
      admission_id = v_admission.id,
      last_updated = NOW()
  WHERE (id <> v_inquiry_id OR v_inquiry_id IS NULL)
    AND (cnic = v_cnic OR (email = v_admission.email AND v_admission.email IS NOT NULL))
    AND course_interest = v_course
    AND status IN ('new', 'contacted', 'follow_up');

  IF NULLIF(payload->>'referralCode', '') IS NOT NULL THEN
    SELECT * INTO v_ref FROM referral_codes WHERE code = NULLIF(payload->>'referralCode', '');
    IF FOUND THEN
      SELECT * INTO v_settings FROM referral_settings WHERE id = 1;
      v_reward := COALESCE(v_settings.cash_reward, 1000);
      INSERT INTO referrals (
        referrer_id, referrer_role, referred_name, referred_phone, referred_email,
        referred_id, referred_at, status, reward_type, reward_amount, payout_status
      )
      VALUES (
        v_ref.owner_id, v_ref.owner_role, v_admission.name, v_admission.phone, v_admission.email,
        v_admission.id, NOW(), 'approved', 'cash', v_reward, 'pending'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'admission', jsonb_build_object(
      'id', v_admission.id,
      'name', v_admission.name,
      'cnic', v_admission.cnic,
      'course', v_admission.course,
      'batch', v_admission.batch,
      'batch_timing', v_admission.batch_timing,
      'email', v_admission.email
    )
  );
END;
$$;

-- Allow student admissions to be cleanly deleted without foreign key constraint violations
ALTER TABLE inquiries 
  DROP CONSTRAINT IF EXISTS inquiries_admission_id_fkey,
  ADD CONSTRAINT inquiries_admission_id_fkey 
    FOREIGN KEY (admission_id) 
    REFERENCES admissions(id) 
    ON DELETE SET NULL;

ALTER TABLE fee_plans 
  DROP CONSTRAINT IF EXISTS fee_plans_student_id_fkey,
  ADD CONSTRAINT fee_plans_student_id_fkey 
    FOREIGN KEY (student_id) 
    REFERENCES admissions(id) 
    ON DELETE CASCADE;

ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_entity_id_fkey,
  ADD CONSTRAINT payments_entity_id_fkey 
    FOREIGN KEY (entity_id) 
    REFERENCES admissions(id) 
    ON DELETE CASCADE;

ALTER TABLE referrals 
  DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey,
  ADD CONSTRAINT referrals_referred_id_fkey 
    FOREIGN KEY (referred_id) 
    REFERENCES admissions(id) 
    ON DELETE SET NULL;

