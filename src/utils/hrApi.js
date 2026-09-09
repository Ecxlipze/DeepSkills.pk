import { supabase } from '../supabaseClient';
import { buildJdDraft } from './hrJdBuilder';
import { uploadHrAsset, uploadHrBlob } from './hrStorage';
import { createNotification } from './notifications';
import { getAuthHeaders } from './adminAccessApi';
import { requestJson } from './requestJson';

const nowIso = () => new Date().toISOString();

const getSessionToken = () => {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('deepskill_session_token') || '';
  } catch (e) {
    return '';
  }
};

const teacherHrRequest = async (payload) => {
  const token = getSessionToken();
  const result = await requestJson('/api/hr/teacher', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, token })
  });
  return result.data;
};

const hrAction = async (endpoint, payload) => requestJson(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
  body: JSON.stringify(payload)
});

const notifyAfterSave = async (endpoint, payload) => {
  try { return await hrAction(endpoint, payload); }
  catch { return { warning: 'Documents were saved, but the notification email could not be confirmed.' }; }
};

const safeSingle = async (query) => {
  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data || null;
};

const normalizeHrBundle = ({ profile, teacher, documents, jd, signature, files }) => ({
  teacher,
  profile,
  documents: documents || [],
  jd: jd || null,
  signature: signature || null,
  files: files || []
});

export const fetchTeacherHRApplication = async (cnic) => {
  return normalizeHrBundle(await teacherHrRequest({ action: 'load', cnic }));
};

export const saveHRProfile = async (profile, cnic = profile?.cnic) => {
  return teacherHrRequest({ action: 'save_profile', cnic, profile });
};

export const uploadHRDocument = async ({
  file,
  profile,
  teacherId,
  docType,
  category,
  isRequired,
  linkUrl,
  cnic
}) => {
  let fileMeta = {
    filePath: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    mimeType: null
  };

  if (file) {
    fileMeta = await uploadHrAsset({
      bucket: 'hr-documents',
      file,
      teacherId,
      hrProfileId: profile.id,
      docType
    });
  }

  return teacherHrRequest({
    action: 'add_document',
    cnic: cnic || profile?.cnic,
    profileId: profile.id,
    category,
    docType,
    isRequired,
    linkUrl,
    file: fileMeta
  });
};

export const removeHRDocument = async (id, cnic) => {
  return teacherHrRequest({ action: 'remove_document', cnic, documentId: id });
};

export const submitHRDocuments = async (profileId, cnic) => {
  await teacherHrRequest({ action: 'submit_documents', cnic, profileId });

  return notifyAfterSave('/api/hr/notify-admin', { profileId });
};

export const approveJD = async (jdId, profileId, cnic) => {
  return teacherHrRequest({ action: 'approve_jd', cnic, jdId, profileId });
};

export const requestJDChanges = async (jdId, message, cnic) => {
  return teacherHrRequest({ action: 'request_jd_changes', cnic, jdId, message });
};

export const saveSignature = async (profileId, payload, cnic) => {
  return teacherHrRequest({ action: 'save_signature', cnic, profileId, signature: payload });
};

export const fetchAdminHRApplications = async () => {
  const { data: profiles, error } = await supabase.from('hr_profiles').select('*').order('updated_at', { ascending: false });
  if (error) {
    throw error;
  }

  const teacherIds = profiles.map((profile) => profile.teacher_id).filter(Boolean);
  const profileIds = profiles.map((profile) => profile.id);

  const [teachersRes, docsRes, jdRes, sigRes, fileRes] = await Promise.all([
    supabase.from('teachers').select('*').in('id', teacherIds),
    supabase.from('hr_documents').select('*').in('hr_profile_id', profileIds),
    supabase.from('hr_jds').select('*').in('hr_profile_id', profileIds),
    supabase.from('hr_signatures').select('*').in('hr_profile_id', profileIds),
    supabase.from('hr_files').select('*').in('hr_profile_id', profileIds)
  ]);

  [teachersRes, docsRes, jdRes, sigRes, fileRes].forEach((result) => {
    if (result.error) {
      throw result.error;
    }
  });

  const teacherMap = Object.fromEntries((teachersRes.data || []).map((teacher) => [teacher.id, teacher]));
  const docsMap = (docsRes.data || []).reduce((accumulator, document) => {
    if (!accumulator[document.hr_profile_id]) {
      accumulator[document.hr_profile_id] = [];
    }
    accumulator[document.hr_profile_id].push(document);
    return accumulator;
  }, {});
  const jdMap = Object.fromEntries((jdRes.data || []).map((jd) => [jd.hr_profile_id, jd]));
  const signatureMap = Object.fromEntries((sigRes.data || []).map((signature) => [signature.hr_profile_id, signature]));
  const filesMap = (fileRes.data || []).reduce((accumulator, file) => {
    if (!accumulator[file.hr_profile_id]) {
      accumulator[file.hr_profile_id] = [];
    }
    accumulator[file.hr_profile_id].push(file);
    return accumulator;
  }, {});

  return profiles.map((profile) => ({
    teacher: teacherMap[profile.teacher_id] || null,
    profile,
    documents: docsMap[profile.id] || [],
    jd: jdMap[profile.id] || null,
    signature: signatureMap[profile.id] || null,
    files: filesMap[profile.id] || []
  }));
};

export const fetchJDTemplates = async () => {
  const { data, error } = await supabase
    .from('hr_jd_templates')
    .select('*')
    .eq('is_active', true)
    .order('specialization', { ascending: true });
  if (error) {
    throw error;
  }
  return data || [];
};

export const createJDDraft = (profile, template, options) => buildJdDraft(profile, template, options);

export const saveJD = async (profileId, jdPayload) => {
  const existing = await safeSingle(supabase.from('hr_jds').select('*').eq('hr_profile_id', profileId));
  const payload = {
    hr_profile_id: profileId,
    template_id: jdPayload.templateId || null,
    position_title: jdPayload.positionTitle,
    department: jdPayload.department,
    reporting_to: jdPayload.reportingTo,
    employment_type: jdPayload.employmentType,
    location: jdPayload.location,
    responsibilities: jdPayload.responsibilities,
    requirements: jdPayload.requirements,
    what_we_offer: jdPayload.whatWeOffer,
    working_hours: jdPayload.workingHours,
    compensation_text: jdPayload.compensationText,
    issue_date: jdPayload.issueDate,
    admin_edited: Boolean(jdPayload.adminEdited),
    updated_at: nowIso()
  };

  const response = existing
    ? await supabase.from('hr_jds').update(payload).eq('id', existing.id).select().single()
    : await supabase.from('hr_jds').insert([{ ...payload, generated_at: nowIso() }]).select().single();

  if (response.error) {
    throw response.error;
  }
  return response.data;
};

export const sendJD = async (profileId, jdPayload) => {
  const saved = await saveJD(profileId, { ...jdPayload, adminEdited: true });
  const delivery = await hrAction('/api/admin/hr/send-jd', { profileId });

  const { data: profile } = await supabase
    .from('hr_profiles')
    .select('teacher_id, full_name, personal_email')
    .eq('id', profileId)
    .maybeSingle();

  if (profile?.teacher_id) {
    await createNotification({
      userId: profile.teacher_id,
      role: 'teacher',
      type: 'hr_jd',
      title: 'JD Ready',
      message: `Your job description is ready for review.`,
      link: '/teacher/hr',
      sendEmail: false,
      emailData: {
        email: profile.personal_email,
        name: profile.full_name,
        title: 'JD Ready',
        message: 'Your job description is ready for review.'
      }
    });
  }

  return { ...saved, warning: delivery.warning };
};

export const rejectApplication = (profileId, reason) => hrAction('/api/admin/hr/reject', { profileId, reason });

export const finalizeHiring = async ({
  application,
  adminNote,
  acceptanceBlob,
  hiringBlob
}) => {
  const { profile, teacher, jd } = application;

  const acceptanceUpload = await uploadHrBlob({
    bucket: 'hr-files',
    blob: acceptanceBlob,
    teacherId: teacher.id,
    hrProfileId: profile.id,
    fileType: 'acceptance-letter',
    fileName: `acceptance-letter-${profile.id}.pdf`
  });

  const hiringUpload = await uploadHrBlob({
    bucket: 'hr-files',
    blob: hiringBlob,
    teacherId: teacher.id,
    hrProfileId: profile.id,
    fileType: 'hiring-file',
    fileName: `hiring-file-${profile.id}.pdf`
  });

  const rows = [
    {
      hr_profile_id: profile.id,
      file_type: 'acceptance_letter',
      file_url: acceptanceUpload.fileUrl,
      file_path: acceptanceUpload.filePath,
      file_name: acceptanceUpload.fileName,
      file_size: acceptanceUpload.fileSize,
      admin_note: adminNote || null,
      generated_at: nowIso()
    },
    {
      hr_profile_id: profile.id,
      file_type: 'hiring_file',
      file_url: hiringUpload.fileUrl,
      file_path: hiringUpload.filePath,
      file_name: hiringUpload.fileName,
      file_size: hiringUpload.fileSize,
      admin_note: adminNote || null,
      generated_at: nowIso()
    }
  ];

  const { error: deleteError } = await supabase.from('hr_files').delete().eq('hr_profile_id', profile.id);
  if (deleteError) throw deleteError;
  const { error: fileError } = await supabase.from('hr_files').insert(rows);
  if (fileError) {
    throw fileError;
  }

  const delivery = await hrAction('/api/admin/hr/finalize', { profileId: profile.id, adminNote });

  await createNotification({
    userId: teacher.id,
    role: 'teacher',
    type: 'hr_hired',
    title: 'Hiring Finalized',
    message: `Your DeepSkills hiring process has been finalized.`,
    link: '/teacher/hr',
    sendEmail: false,
    emailData: {
      email: teacher.email || profile.personal_email,
      name: teacher.name || profile.full_name,
      title: 'Hiring Finalized',
      message: 'Your DeepSkills hiring process has been finalized.'
    }
  });
  return delivery;
};

export const shareHiringFiles = (profileId) => hrAction('/api/hr/share-files', { profileId });

export const fetchTeacherLeaves = async () => {
  try {
    const { data, error } = await supabase
      .from('teacher_leaves')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    const { data: teachers } = await supabase.from('teachers').select('id, name, email, phone, specialization');
    const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));

    return data.map((leave) => ({
      ...leave,
      teacher: teacherMap.get(leave.teacher_id) || null,
      substitute: teacherMap.get(leave.substitute_teacher_id) || null
    }));
  } catch (_) {
    return [];
  }
};

export const recordTeacherLeave = async ({
  teacherId,
  startDate,
  endDate,
  leaveType = 'Casual',
  reason,
  adminNotes = '',
  status = 'Approved',
  substituteTeacherId = null,
  substituteNotes = '',
  reviewedBy = 'HR'
}) => {
  const payload = {
    teacher_id: teacherId,
    start_date: startDate,
    end_date: endDate,
    leave_type: leaveType,
    reason,
    admin_notes: adminNotes || null,
    status,
    substitute_teacher_id: substituteTeacherId || null,
    substitute_notes: substituteNotes || null,
    reviewed_by: reviewedBy,
    reviewed_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso()
  };

  const { data, error } = await supabase.from('teacher_leaves').insert([payload]).select();
  if (error) {
    throw new Error('Could not record leave: ' + error.message);
  }
  return data?.[0] || payload;
};

export const reviewTeacherLeave = async (leaveId, {
  status,
  adminNotes,
  substituteTeacherId,
  substituteNotes,
  reviewedBy = 'HR'
}) => {
  const payload = {
    status,
    admin_notes: adminNotes || null,
    substitute_teacher_id: substituteTeacherId || null,
    substitute_notes: substituteNotes || null,
    reviewed_by: reviewedBy,
    reviewed_at: nowIso(),
    updated_at: nowIso()
  };

  const { data, error } = await supabase.from('teacher_leaves').update(payload).eq('id', leaveId).select();
  if (error) {
    throw new Error('Could not update leave: ' + error.message);
  }
  return data?.[0] || payload;
};
