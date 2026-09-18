import { getSupabaseServerClient } from '../../lib/supabaseServer.js';
import { acceptPost, cleanText, validEmail, formError } from '../../lib/publicForms.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '32kb',
    },
  },
};

export default async function handler(req, res) {
  if (!acceptPost(req, res)) return;

  const d = req.body;
  // Bot honeypot
  if (d['bot-field']) {
    return res.status(200).json({ status: 'success', message: 'Application received successfully.' });
  }

  const role = cleanText(d.role || d.course_interest, 100);
  const name = cleanText(d.name, 120);
  const email = cleanText(d.email, 120);
  const phone = cleanText(d.phone, 40);
  const city = cleanText(d.city || 'Lahore', 80);
  const portfolioUrl = cleanText(d.portfolioUrl || d.portfolio, 300);
  const messageContent = cleanText(d.message, 1500);

  if (!name || !phone || !email || !role) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide your full name, phone number, email address, and role interest.',
    });
  }

  if (!validEmail(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Please enter a valid email address.',
    });
  }

  const fullMessage = [
    `Internship Role Applied: ${role}`,
    portfolioUrl ? `Portfolio / Profile URL: ${portfolioUrl}` : null,
    messageContent ? `Applicant Message / Bio:\n${messageContent}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const row = {
    name,
    phone,
    email,
    cnic: cleanText(d.cnic || 'N/A', 30),
    city,
    course_interest: `Internship: ${role}`,
    hear_about_us: 'Internship Portal (Website)',
    message: fullMessage,
    referral_code: cleanText(d.referral_code || 'INTERNSHIP_2026', 50),
    status: 'new',
    submitted_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };

  try {
    const db = req.__supabase || getSupabaseServerClient();
    if (!db) throw new Error('Database connection unavailable');

    const { data, error } = await db.from('inquiries').insert([row]).select().single();
    if (error || !data) {
      throw error || new Error('Failed to insert application');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Your internship application has been submitted successfully! Our HR team will contact you shortly.',
      data: {
        id: data.id,
        name: data.name,
        role,
      },
    });
  } catch (error) {
    return formError(res, error, 'Application could not be saved. Please email your CV directly to hr@deepskills.pk');
  }
}
