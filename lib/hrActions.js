import { getSupabaseServerClient } from './supabaseServer.js';
import { authorizeAdminOperation, validatePortalSession, normalizeCnic } from './portalAuthServer.js';
import { acceptPost, cleanText, validEmail, escapeHtml } from './publicForms.js';
import smtp from './smtp.cjs';

const requests = new Map();
const failure = (status, message) => Object.assign(new Error(message), { status });
async function result(query) { const response = await query; if (response.error) throw response.error; return response.data; }
async function first(db, table, column, value) {
  return (await result(db.from(table).select('*').eq(column, value).limit(1)))?.[0] || null;
}

export function hrHandler(action) {
  return async function handler(req, res) {
    if (!acceptPost(req, res)) return;
    let mutated = false;
    let reservation;
    try {
      const db = req.__supabase || getSupabaseServerClient();
      if (!db) throw failure(503, 'Database service unavailable.');
      const profileId = cleanText(req.body.profileId, 100);
      if (!profileId) throw failure(400, 'HR Profile ID is required.');
      let teacherSession = null;
      if (['notify-admin', 'share-files'].includes(action)) {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        const auth = await validatePortalSession(db, token, ['teacher']);
        if (auth.ok) teacherSession = auth.session;
        else {
          const admin = await authorizeAdminOperation(req, 'hr');
          if (!admin.ok) throw failure(admin.status, admin.message);
        }
      } else {
        const admin = await authorizeAdminOperation(req, 'hr');
        if (!admin.ok) throw failure(admin.status, admin.message);
      }
      // Authenticate before looking up any private HR information.
      const profile = await first(db, 'hr_profiles', 'id', profileId);
      if (!profile) throw failure(404, 'HR profile not found.');
      const teacher = await first(db, 'teachers', 'id', profile.teacher_id);
      if (!teacher) throw failure(404, 'Teacher record not found.');
      if (teacherSession && (normalizeCnic(teacher.cnic) !== teacherSession.cnic || !['Active','Pending','Onboarding'].includes(teacher.status))) throw failure(403, 'You can only access your own active HR application.');
      const now = new Date().toISOString();
      const name = teacher.name || profile.full_name || 'Teacher';
      const recipient = teacher.email || profile.personal_email;
      const adminRecipient = process.env.HR_EMAIL_TO || process.env.CONTACT_EMAIL_TO || 'info@deepskills.pk';
      const portal = new URL('/teacher/hr/', process.env.NEXT_PUBLIC_SITE_URL || 'https://deepskills.pk').href;
      let subject, content, recipients;
      if (action === 'notify-admin') {
        subject = 'New HR document submission';
        content = `${escapeHtml(name)} has submitted HR documents. Review this application in the HR portal.`;
        recipients = [adminRecipient];
      } else if (action === 'share-files') {
        const files = await result(db.from('hr_files').select('*').eq('hr_profile_id', profileId));
        if (!files?.length) throw failure(404, 'No hiring documents are available to email.');
        const links = [];
        for (const file of files) {
          const prefix = `teacher-${teacher.id}/profile-${profile.id}/`;
          // Only sign this profile's server-stored paths. Never fetch a client URL.
          if (typeof file.file_path !== 'string' || !file.file_path.startsWith(prefix) || file.file_path.split('/').some(part => part === '..' || part === '.')) throw failure(409, 'A stored document path needs administrator review.');
          const signed = await db.storage.from('hr-files').createSignedUrl(file.file_path, 3600);
          if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('Unable to sign document');
          links.push(`<li><a href="${escapeHtml(signed.data.signedUrl)}">${escapeHtml(file.file_name || file.file_type || 'Hiring document')}</a></li>`);
        }
        subject = 'Your hiring documents';
        content = `Your documents are available using these links for one hour:<ul>${links.join('')}</ul>`;
        recipients = [recipient];
      } else if (action === 'send-jd') {
        const jd = await first(db, 'hr_jds', 'hr_profile_id', profileId);
        if (!jd) throw failure(404, 'Save a job description before sending it.');
        // The document is delivered in the portal; email provides the actual
        // recipient a notification and a link to the saved version.
        mutated = true;
        await result(db.from('hr_jds').update({ is_sent_to_teacher: true, teacher_status: 'pending', updated_at: now }).eq('id', jd.id));
        await result(db.from('hr_profiles').update({ hr_status: 'jd_sent', updated_at: now }).eq('id', profileId));
        subject = 'Your job description is ready';
        content = `Your job description for ${escapeHtml(jd.position_title || teacher.specialization || 'your teaching role')} is ready to review and approve in your portal.`;
        recipients = [recipient, adminRecipient];
      } else if (action === 'reject') {
        const reason = cleanText(req.body.reason, 1000);
        if (!reason) throw failure(400, 'A rejection reason is required.');
        mutated = true;
        await result(db.from('hr_profiles').update({ hr_status: 'rejected', rejection_reason: reason, rejected_at: now, updated_at: now }).eq('id', profileId));
        subject = 'HR application update'; content = `Application update: ${escapeHtml(reason)}`;
        recipients = [recipient, adminRecipient];
      } else if (action === 'finalize') {
        if (profile.hr_status === 'hired') return res.status(200).json({ status: 'success', teacherId: teacher.id, already_finalized: true, email_sent: null, message: 'Hiring was already finalized; no duplicate email was sent.' });
        const cnic = normalizeCnic(teacher.cnic);
        if (!cnic) throw failure(409, 'Teacher CNIC is invalid. Correct it before finalizing.');
        const jd = await first(db, 'hr_jds', 'hr_profile_id', profileId);
        const salary = Number(jd?.salary) > 0 ? Number(jd.salary) : Number(profile.expected_salary);
        // Check each response and report partial progress rather than hiding
        // failure or automatically replaying a multi-step operation.
        mutated = true;
        await result(db.from('teachers').update({ status: 'Active' }).eq('id', teacher.id));
        await result(db.from('allowed_cnics').upsert({ cnic, name, role: 'teacher', assigned_course: teacher.specialization || jd?.position_title || 'Teacher', batch: '' }, { onConflict: 'cnic' }));
        if (Number.isFinite(salary) && salary > 0) await result(db.from('teacher_salaries').upsert({ teacher_id: teacher.id, monthly_amount: salary, effective_from: now.slice(0, 10) }, { onConflict: 'teacher_id' }));
        await result(db.from('hr_profiles').update({ hr_status: 'hired', hired_at: now, current_step: 5, updated_at: now }).eq('id', profileId));
        subject = 'Hiring finalized'; content = 'Your DeepSkills hiring process is complete. Your hiring documents are available in the portal.';
        recipients = [recipient, adminRecipient];
      } else throw failure(400, 'Unknown HR action.');

      const expiry = Date.now();
      for (const [key, until] of requests) if (until <= expiry) requests.delete(key);
      reservation = `${action}:${profileId}`;
      if (requests.has(reservation)) {
        if (mutated) return res.status(200).json({ status: 'success', email_sent: false, warning: 'Changes saved. A recent email attempt is still within its retry window; no duplicate email was sent.' });
        throw failure(429, 'Please wait before sending these emails again.');
      }
      requests.set(reservation, expiry + 60000);
      let accepted = 0;
      const unique = [...new Set(recipients)];
      for (const to of unique) {
        try {
          if (!validEmail(to)) throw new Error('Missing recipient');
          await smtp.sendEmail({ to, subject: `DeepSkills: ${subject}`, html: `<h1>${escapeHtml(subject)}</h1><p>${content}</p><p><a href="${escapeHtml(portal)}">Open teacher portal</a></p>`, text: `${subject}\n${content.replace(/<[^>]+>/g, '')}\n${portal}` });
          accepted++;
        } catch (error) { console.error('[hr-email]', action, error.code || error.name); }
      }
      const emailSent = accepted === unique.length;
      if (!emailSent && !mutated) return res.status(502).json({ status: 'error', email_sent: false, message: 'Email could not be confirmed. Check the mail service before retrying.' });
      return res.status(200).json({ status: 'success', teacherId: teacher.id, email_sent: emailSent,
        ...(emailSent ? { message: 'Email accepted by the mail server.' } : { warning: 'Changes saved, but one or more emails could not be confirmed. Check mail delivery before retrying.' }) });
    } catch (error) {
      console.error('[hr-action]', action, error.code || error.status || error.name);
      return res.status(error.status || 500).json({ status: 'error', ...(mutated ? { partial: true } : {}), message: mutated ? 'Some hiring changes may have been saved. Refresh and review the record before retrying.' : error.status ? error.message : 'HR request failed. Please try again later.' });
    }
  };
}
