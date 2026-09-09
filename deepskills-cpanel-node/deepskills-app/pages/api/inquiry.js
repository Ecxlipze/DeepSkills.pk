import { getSupabaseServerClient } from '../../lib/supabaseServer.js';
import { acceptPost, cleanText, validEmail, formError } from '../../lib/publicForms.js';
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default async function handler(req, res) {
  if (!acceptPost(req, res)) return;
  const d = req.body;
  if (d['bot-field']) return res.status(200).json({ status: 'success', message: 'Inquiry received.' });
  const row = {
    name: cleanText(d.name, 120), phone: cleanText(d.phone, 30), email: d.email,
    cnic: cleanText(d.cnic, 30), city: cleanText(d.city, 80),
    course_interest: cleanText(d.course_interest ?? d.courseInterest, 160),
    hear_about_us: cleanText(d.hear_about_us ?? d.hearAboutUs, 120),
    message: cleanText(d.message, 1000), referral_code: cleanText(d.referral_code ?? d.referralCode, 120),
    status: 'new', submitted_at: new Date().toISOString(), last_updated: new Date().toISOString()
  };
  if (!validEmail(row.email) || ['name','phone','cnic','city','course_interest','hear_about_us'].some(k => !row[k])) return res.status(400).json({ status: 'error', message: 'Please complete all required fields.' });
  try {
    const db = req.__supabase || getSupabaseServerClient();
    if (!db) throw new Error('Database unavailable');
    const { data, error } = await db.from('inquiries').insert([row]).select().single();
    if (error || !data) throw error || new Error('Missing inserted inquiry');
    return res.status(200).json({ status: 'success', message: 'Inquiry received.', data });
  } catch (error) { return formError(res, error, 'Inquiry could not be saved. Please try again.'); }
}
