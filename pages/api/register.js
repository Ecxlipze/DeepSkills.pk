import { getSupabaseServerClient } from '../../lib/supabaseServer.js';
import { acceptPost, cleanText, validEmail, formError } from '../../lib/publicForms.js';
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default async function handler(req, res) {
  if (!acceptPost(req, res)) return;
  const d = req.body;
  if (d['bot-field']) return res.status(200).json({ status: 'success', message: 'Registration submitted.' });
  const row = {
    name: cleanText(d.name ?? `${d.firstName || ''} ${d.lastName || ''}`, 120), email: d.email,
    phone: cleanText(d.phone ?? d.mobileNo, 30), cnic: cleanText(d.cnic, 30),
    course: cleanText(d.course ?? d.selectedCourse, 120), education: cleanText(d.education ?? d.lastEducation, 120),
    hear_about_us: cleanText(d.hear_about_us ?? d.source, 120), gender: cleanText(d.gender, 30), age: Number(d.age),
    referred_by: cleanText(d.referred_by ?? d.referredBy, 120), status: 'Pending', submitted_at: new Date().toISOString()
  };
  if (!validEmail(row.email) || ['name','phone','cnic','course','education','hear_about_us','gender'].some(k => !row[k]) || !Number.isInteger(row.age) || row.age < 10 || row.age > 100) return res.status(400).json({ status: 'error', message: 'Please complete all required fields and enter a valid age (10–100).' });
  try {
    const db = req.__supabase || getSupabaseServerClient();
    if (!db) throw new Error('Database unavailable');
    const existing = await db.from('admissions').select('id').eq('cnic', row.cnic).limit(1);
    if (existing.error) throw existing.error;
    if (existing.data?.length) return res.status(409).json({ status: 'error', message: 'This CNIC is already registered.' });
    const { data, error } = await db.from('admissions').insert([row]).select().single();
    if (error || !data) throw error || new Error('Missing inserted admission');
    return res.status(200).json({ status: 'success', message: 'Registration submitted successfully.', data });
  } catch (error) { return formError(res, error, error?.code === '23505' ? 'This CNIC is already registered.' : 'Registration could not be saved. Please try again.'); }
}
