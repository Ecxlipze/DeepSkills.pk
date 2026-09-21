import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import smtp from '../../../lib/smtp.cjs';
import { validEmail, escapeHtml } from '../../../lib/publicForms.js';
import { sanitizeText, MOCK_JOB_POSTINGS } from '../../../lib/careers.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const {
    job_id,
    full_name,
    email,
    phone,
    cnic,
    resume_url,
    resume_filename,
    resume_base64,
    cover_letter,
    portfolio_url,
    linkedin_url
  } = req.body || {};

  if (!job_id) {
    return res.status(400).json({ status: 'error', message: 'Job ID is required.' });
  }

  const name = sanitizeText(full_name, 100);
  const userEmail = String(email || '').trim().toLowerCase();
  const userPhone = sanitizeText(phone, 25);
  const userCnic = sanitizeText(cnic, 20);

  if (!name || name.length < 2) {
    return res.status(400).json({ status: 'error', message: 'Please provide a valid full name.' });
  }

  if (!validEmail(userEmail)) {
    return res.status(400).json({ status: 'error', message: 'Please provide a valid email address.' });
  }

  if (!userPhone || userPhone.length < 7) {
    return res.status(400).json({ status: 'error', message: 'Please provide a valid phone number.' });
  }

  const supabase = getSupabaseServerClient();

  // Verify job exists and is published (check database, fallback to mock)
  let job = null;
  const { data: dbJob, error: jobErr } = await supabase
    .from('job_postings')
    .select('id, title, department')
    .eq('id', job_id)
    .single();

  if (!jobErr && dbJob) {
    job = dbJob;
  } else {
    const mock = MOCK_JOB_POSTINGS.find((m) => m.id === job_id || m.slug === job_id);
    if (mock) {
      job = { id: mock.id, title: mock.title, department: mock.department };
    }
  }

  if (!job) {
    return res.status(404).json({ status: 'error', message: 'The selected job posting could not be found or is no longer open.' });
  }

  let finalResumeUrl = resume_url;
  let finalResumeFilename = resume_filename || 'resume.pdf';

  // If base64 resume is provided, upload directly to Supabase storage
  if (resume_base64) {
    try {
      const match = resume_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      const mimeType = match ? match[1] : 'application/pdf';
      const base64Data = match ? match[2] : resume_base64;
      const buffer = Buffer.from(base64Data, 'base64');

      const cleanFileName = (finalResumeFilename || 'resume.pdf')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      const storagePath = `${Date.now()}_${cleanFileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('career-resumes')
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadErr) {
        console.error('[careers/apply] Storage upload error:', uploadErr.message);
        return res.status(500).json({ status: 'error', message: 'Failed to upload resume file. Please try again or provide a direct link.' });
      }

      const { data: publicUrlData } = supabase.storage
        .from('career-resumes')
        .getPublicUrl(storagePath);

      finalResumeUrl = publicUrlData?.publicUrl || storagePath;
      finalResumeFilename = cleanFileName;
    } catch (err) {
      console.error('[careers/apply] Base64 decoding error:', err);
      return res.status(400).json({ status: 'error', message: 'Invalid resume file format.' });
    }
  }

  if (!finalResumeUrl) {
    return res.status(400).json({ status: 'error', message: 'Please attach your CV/Resume.' });
  }

  // Insert application into database
  const applicationData = {
    job_id: job.id,
    full_name: name,
    email: userEmail,
    phone: userPhone,
    cnic: userCnic || null,
    resume_url: finalResumeUrl,
    resume_filename: finalResumeFilename,
    cover_letter: sanitizeText(cover_letter, 2000) || null,
    portfolio_url: sanitizeText(portfolio_url, 300) || null,
    linkedin_url: sanitizeText(linkedin_url, 300) || null,
    status: 'new'
  };

  const { data: newApp, error: insertErr } = await supabase
    .from('job_applications')
    .insert([applicationData])
    .select()
    .single();

  if (insertErr) {
    console.error('[careers/apply] DB insert error:', insertErr.message);
    return res.status(500).json({ status: 'error', message: 'Failed to save your application. Please try again.' });
  }

  // Send email notification to HR Admin and candidate acknowledgement
  const hrRecipient = process.env.HR_EMAIL_TO || process.env.CONTACT_EMAIL_TO || 'hr@deepskills.pk';

  try {
    // 1. Email to HR Admin
    await smtp.sendEmail({
      to: hrRecipient,
      replyTo: userEmail,
      subject: `[New Job Application] ${name} applied for ${job.title}`,
      text: `New Application Received for ${job.title} (${job.department})\n\n` +
            `Applicant: ${name}\n` +
            `Email: ${userEmail}\n` +
            `Phone: ${userPhone}\n` +
            `CNIC: ${userCnic || 'N/A'}\n` +
            `Resume: ${finalResumeUrl}\n` +
            `Portfolio: ${portfolio_url || 'N/A'}\n` +
            `LinkedIn: ${linkedin_url || 'N/A'}\n\n` +
            `Cover Note:\n${cover_letter || 'None provided.'}\n\n` +
            `View in Admin Panel: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://deepskills.pk'}/admin/careers`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7B1F2E; margin-bottom: 8px;">New Job Application Received</h2>
          <p style="font-size: 15px; color: #555; margin-top: 0;">Position: <strong>${escapeHtml(job.title)}</strong> (${escapeHtml(job.department)})</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #666; width: 120px;"><strong>Full Name:</strong></td><td style="padding: 8px 0;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td><td style="padding: 8px 0;"><a href="tel:${escapeHtml(userPhone)}">${escapeHtml(userPhone)}</a></td></tr>
            ${userCnic ? `<tr><td style="padding: 8px 0; color: #666;"><strong>CNIC:</strong></td><td style="padding: 8px 0;">${escapeHtml(userCnic)}</td></tr>` : ''}
            ${linkedin_url ? `<tr><td style="padding: 8px 0; color: #666;"><strong>LinkedIn:</strong></td><td style="padding: 8px 0;"><a href="${escapeHtml(linkedin_url)}" target="_blank">${escapeHtml(linkedin_url)}</a></td></tr>` : ''}
            ${portfolio_url ? `<tr><td style="padding: 8px 0; color: #666;"><strong>Portfolio:</strong></td><td style="padding: 8px 0;"><a href="${escapeHtml(portfolio_url)}" target="_blank">${escapeHtml(portfolio_url)}</a></td></tr>` : ''}
            <tr><td style="padding: 8px 0; color: #666;"><strong>Resume / CV:</strong></td><td style="padding: 8px 0;"><a href="${escapeHtml(finalResumeUrl)}" target="_blank" style="color: #7B1F2E; font-weight: 600;">Download / View Resume &rarr;</a></td></tr>
          </table>
          ${cover_letter ? `
            <div style="margin-top: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7B1F2E;">
              <strong style="font-size: 13px; color: #666; text-transform: uppercase;">Cover Note:</strong>
              <p style="margin: 8px 0 0; font-size: 14px; line-height: 1.5; color: #333;">${escapeHtml(cover_letter).replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://deepskills.pk'}/admin/careers" style="display: inline-block; background: #7B1F2E; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Open in Admin Panel</a>
          </div>
        </div>
      `
    });

    // 2. Confirmation email to candidate
    await smtp.sendEmail({
      to: userEmail,
      subject: `Application Received: ${job.title} at DeepSkills`,
      text: `Dear ${name},\n\nThank you for applying for the position of ${job.title} at DeepSkills.\n\nWe have successfully received your application and resume. Our recruitment team will review your profile and reach out to you if your qualifications match our requirements.\n\nBest regards,\nDeepSkills Recruitment Team\nhttps://deepskills.pk`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7B1F2E; margin-bottom: 8px;">Application Received</h2>
          <p style="font-size: 15px; color: #333;">Dear <strong>${escapeHtml(name)}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #444;">
            Thank you for your interest in joining <strong>DeepSkills</strong>! We have successfully received your application for the <strong>${escapeHtml(job.title)}</strong> position.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #444;">
            Our talent acquisition team is currently reviewing applications. If your qualifications and experience match our needs, we will reach out to schedule the next steps.
          </p>
          <div style="margin-top: 25px; padding: 15px; background: #fdf2f4; border-radius: 6px; border-left: 4px solid #7B1F2E; font-size: 13px; color: #555;">
            <strong>Tip:</strong> Keep an eye on your email inbox and WhatsApp for updates regarding your application status.
          </div>
          <p style="margin-top: 30px; font-size: 13px; color: #777;">
            Best regards,<br>
            <strong>DeepSkills Hiring Team</strong><br>
            <a href="https://deepskills.pk" style="color: #7B1F2E; text-decoration: none;">deepskills.pk</a>
          </p>
        </div>
      `
    });
  } catch (emailErr) {
    console.warn('[careers/apply] Email notification warning:', emailErr?.message || emailErr);
    // Continue even if email fails so candidate's application is not lost
  }

  return res.status(200).json({
    status: 'success',
    message: 'Your application has been submitted successfully!',
    application_id: newApp.id
  });
}
