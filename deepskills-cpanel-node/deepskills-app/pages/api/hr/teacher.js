import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { normalizeCnic, validatePortalSession, authorizeAdminOperation } from '../../../lib/portalAuthServer';

function pickProfileFields(profile, teacher) {
  const allowed = [
    'father_name', 'date_of_birth', 'gender', 'personal_phone', 'personal_email',
    'current_address', 'permanent_address', 'years_experience', 'last_employer',
    'linkedin', 'expected_salary', 'available_to_join', 'teaching_mode',
    'emergency_name', 'emergency_relationship', 'emergency_phone'
  ];
  const payload = {};
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(profile, field)) {
      payload[field] = profile[field];
    }
  }
  payload.teacher_id = teacher.id;
  payload.full_name = teacher.name || profile.full_name || '';
  payload.cnic = teacher.cnic;
  payload.specialization = teacher.specialization || profile.specialization || null;
  payload.updated_at = new Date().toISOString();
  return payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database service configuration is missing.' });
  }

  const authHeader = req.headers.authorization || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const data = req.body || {};
  if (!token && data.token) {
    token = String(data.token).trim();
  }

  const requestedCnic = data.cnic ? normalizeCnic(data.cnic) : null;
  let teacherCnic = null;

  // 1. Authenticate either as teacher via session token or as admin
  const isSupabaseJwt = token && token.split('.').length === 3;
  if (isSupabaseJwt) {
    const adminAuth = await authorizeAdminOperation(req, ['teachers', 'hr']);
    if (!adminAuth.ok) {
      return res.status(adminAuth.status).json({ status: 'error', message: adminAuth.message });
    }
    if (!requestedCnic) {
      return res.status(400).json({ status: 'error', message: 'Target teacher CNIC is required for administrator queries.' });
    }
    teacherCnic = requestedCnic;
  } else {
    const sessionRes = await validatePortalSession(supabase, token, ['teacher', 'admin', 'custom'], requestedCnic);
    if (!sessionRes.ok) {
      return res.status(sessionRes.status).json({
        status: 'error',
        code: sessionRes.code,
        message: sessionRes.message
      });
    }

    if (sessionRes.session.role === 'teacher') {
      teacherCnic = sessionRes.session.cnic;
    } else {
      // Admin or custom staff previewing
      if (!requestedCnic) {
        return res.status(400).json({ status: 'error', message: 'Target teacher CNIC is required.' });
      }
      teacherCnic = requestedCnic;
    }
  }

  // 2. Look up teacher record
  const { data: teacherRows, error: teacherErr } = await supabase
    .from('teachers')
    .select('*')
    .eq('cnic', teacherCnic)
    .limit(1);

  if (teacherErr) {
    console.error('[hr/teacher] Teacher lookup error:', teacherErr);
    return res.status(500).json({ status: 'error', message: 'Failed to look up teacher record.' });
  }

  const teacher = teacherRows?.[0];
  if (!teacher || !['Active', 'Pending', 'Onboarding'].includes(teacher.status)) {
    return res.status(403).json({ status: 'error', message: 'Valid teacher profile not found or inactive.' });
  }

  const action = data.action || '';
  const now = new Date().toISOString();

  // Helper: get or create hr_profiles row
  async function getOrCreateProfile() {
    const { data: profileRows } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('teacher_id', teacher.id)
      .limit(1);

    if (profileRows && profileRows[0]) {
      return profileRows[0];
    }

    const newProfile = {
      teacher_id: teacher.id,
      full_name: teacher.name || '',
      cnic: teacher.cnic,
      personal_email: teacher.email || '',
      personal_phone: teacher.phone || '',
      specialization: teacher.specialization || null,
      current_step: 1,
      hr_status: 'pending',
      created_at: now,
      updated_at: now
    };

    const { data: inserted, error: insErr } = await supabase
      .from('hr_profiles')
      .upsert(newProfile, { onConflict: 'teacher_id' })
      .select()
      .single();

    if (insErr) {
      console.error('[hr/teacher] Profile upsert error:', insErr);
      throw insErr;
    }

    return inserted;
  }

  // Helper: ensure profile belongs to this teacher
  async function requireOwnedProfile(profileId) {
    if (!profileId) {
      throw new Error('HR profile ID is required.');
    }
    const { data: profileRows } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('teacher_id', teacher.id)
      .limit(1);

    if (!profileRows || !profileRows[0]) {
      throw new Error('HR profile access denied.');
    }
    return profileRows[0];
  }

  try {
    // ----------------------------------------------------
    // Action: load
    // ----------------------------------------------------
    if (action === 'load') {
      const profile = await getOrCreateProfile();
      const profileId = profile.id;

      const [docsRes, jdRes, sigRes, filesRes] = await Promise.all([
        supabase.from('hr_documents').select('*').eq('hr_profile_id', profileId).order('uploaded_at', { ascending: true }),
        supabase.from('hr_jds').select('*').eq('hr_profile_id', profileId).limit(1),
        supabase.from('hr_signatures').select('*').eq('hr_profile_id', profileId).limit(1),
        supabase.from('hr_files').select('*').eq('hr_profile_id', profileId).order('generated_at', { ascending: false })
      ]);

      return res.status(200).json({
        status: 'success',
        data: {
          teacher,
          profile,
          documents: docsRes.data || [],
          jd: jdRes.data?.[0] || null,
          signature: sigRes.data?.[0] || null,
          files: filesRes.data || []
        }
      });
    }

    // ----------------------------------------------------
    // Action: save_profile
    // ----------------------------------------------------
    if (action === 'save_profile') {
      const profileInput = data.profile && typeof data.profile === 'object' ? data.profile : {};
      const payload = pickProfileFields(profileInput, teacher);

      const { data: savedRows, error: saveErr } = await supabase
        .from('hr_profiles')
        .upsert(payload, { onConflict: 'teacher_id' })
        .select();

      if (saveErr || !savedRows || !savedRows[0]) {
        console.error('[hr/teacher] save_profile error:', saveErr);
        return res.status(500).json({ status: 'error', message: 'Unable to save HR profile.' });
      }

      let profile = savedRows[0];
      if ((profile.current_step || 1) < 2) {
        const { data: stepUpdated } = await supabase
          .from('hr_profiles')
          .update({ current_step: 2, updated_at: now })
          .eq('id', profile.id)
          .select()
          .single();
        if (stepUpdated) profile = stepUpdated;
      }

      // Non-blocking sync to teacher_salaries if expected_salary provided
      if (payload.expected_salary && Number(payload.expected_salary) > 0) {
        try {
          await supabase.from('teacher_salaries').upsert({
            teacher_id: teacher.id,
            monthly_amount: Number(payload.expected_salary),
            effective_from: new Date().toISOString().split('T')[0]
          }, { onConflict: 'teacher_id' });
        } catch (salErr) {
          console.warn('[hr/teacher] salary sync notice:', salErr);
        }
      }

      return res.status(200).json({ status: 'success', data: profile });
    }

    // ----------------------------------------------------
    // Action: add_document
    // ----------------------------------------------------
    if (action === 'add_document') {
      const profile = await requireOwnedProfile(data.profileId);
      const file = data.file && typeof data.file === 'object' ? data.file : {};

      const docPayload = {
        hr_profile_id: profile.id,
        category: String(data.category || '').slice(0, 100),
        doc_type: String(data.docType || '').slice(0, 100),
        file_name: file.fileName || null,
        file_size: file.fileSize ? String(file.fileSize) : null,
        file_url: file.fileUrl || null,
        file_path: file.filePath || null,
        mime_type: file.mimeType || null,
        link_url: data.linkUrl || null,
        is_required: Boolean(data.isRequired),
        uploaded_at: now
      };

      const { data: docRows, error: docErr } = await supabase
        .from('hr_documents')
        .insert([docPayload])
        .select()
        .single();

      if (docErr) {
        console.error('[hr/teacher] add_document error:', docErr);
        return res.status(500).json({ status: 'error', message: 'Failed to record document.' });
      }

      return res.status(200).json({ status: 'success', data: docRows });
    }

    // ----------------------------------------------------
    // Action: remove_document
    // ----------------------------------------------------
    if (action === 'remove_document') {
      const { data: docRows } = await supabase
        .from('hr_documents')
        .select('*')
        .eq('id', data.documentId || '')
        .limit(1);

      const doc = docRows?.[0];
      if (!doc) {
        return res.status(404).json({ status: 'error', message: 'Document not found.' });
      }

      await requireOwnedProfile(doc.hr_profile_id);
      await supabase.from('hr_documents').delete().eq('id', doc.id);
      return res.status(200).json({ status: 'success' });
    }

    // ----------------------------------------------------
    // Action: submit_documents
    // ----------------------------------------------------
    if (action === 'submit_documents') {
      const profile = await requireOwnedProfile(data.profileId);
      await supabase
        .from('hr_profiles')
        .update({
          current_step: 3,
          hr_status: 'pending',
          documents_submitted_at: now,
          updated_at: now
        })
        .eq('id', profile.id);

      return res.status(200).json({ status: 'success' });
    }

    // ----------------------------------------------------
    // Action: approve_jd
    // ----------------------------------------------------
    if (action === 'approve_jd') {
      const profile = await requireOwnedProfile(data.profileId);
      const { data: jdRows } = await supabase
        .from('hr_jds')
        .select('*')
        .eq('id', data.jdId || '')
        .eq('hr_profile_id', profile.id)
        .limit(1);

      const jd = jdRows?.[0];
      if (!jd) {
        return res.status(404).json({ status: 'error', message: 'Job description not found.' });
      }

      await supabase
        .from('hr_jds')
        .update({ teacher_status: 'approved', approved_at: now, updated_at: now })
        .eq('id', jd.id);

      await supabase
        .from('hr_profiles')
        .update({ current_step: 4, hr_status: 'jd_approved', updated_at: now })
        .eq('id', profile.id);

      return res.status(200).json({ status: 'success' });
    }

    // ----------------------------------------------------
    // Action: request_jd_changes
    // ----------------------------------------------------
    if (action === 'request_jd_changes') {
      const profile = await getOrCreateProfile();
      const { data: jdRows } = await supabase
        .from('hr_jds')
        .select('*')
        .eq('id', data.jdId || '')
        .eq('hr_profile_id', profile.id)
        .limit(1);

      const jd = jdRows?.[0];
      if (!jd) {
        return res.status(404).json({ status: 'error', message: 'Job description not found.' });
      }

      await supabase
        .from('hr_jds')
        .update({
          teacher_status: 'changes_requested',
          change_request: String(data.message || '').slice(0, 2000),
          is_sent_to_teacher: false,
          updated_at: now
        })
        .eq('id', jd.id);

      return res.status(200).json({ status: 'success' });
    }

    // ----------------------------------------------------
    // Action: save_signature
    // ----------------------------------------------------
    if (action === 'save_signature') {
      const profile = await requireOwnedProfile(data.profileId);
      const signature = data.signature && typeof data.signature === 'object' ? data.signature : {};

      const sigRow = {
        hr_profile_id: profile.id,
        signature_type: signature.signatureType === 'drawn' ? 'drawn' : 'typed',
        signature_data: String(signature.signatureData || ''),
        signed_at: now
      };

      const { data: existingSig } = await supabase
        .from('hr_signatures')
        .select('id')
        .eq('hr_profile_id', profile.id)
        .limit(1);

      let saved;
      if (existingSig && existingSig[0]) {
        const { data: updated } = await supabase
          .from('hr_signatures')
          .update(sigRow)
          .eq('id', existingSig[0].id)
          .select()
          .single();
        saved = updated;
      } else {
        const { data: created } = await supabase
          .from('hr_signatures')
          .insert([sigRow])
          .select()
          .single();
        saved = created;
      }

      await supabase
        .from('hr_profiles')
        .update({ current_step: 5, hr_status: 'signed', updated_at: now })
        .eq('id', profile.id);

      return res.status(200).json({ status: 'success', data: saved });
    }

    return res.status(400).json({ status: 'error', message: 'Unknown HR action.' });
  } catch (err) {
    console.error('[hr/teacher] Handler exception:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Operation failed.' });
  }
}
