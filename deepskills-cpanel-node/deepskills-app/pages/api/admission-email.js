import { getSupabaseServerClient } from '../../lib/supabaseServer.js';
import { authorizeAdminOperation, validatePortalSession, findAccountByCnic } from '../../lib/portalAuthServer.js';
import { admissionEmail, emailSubjects } from '../../lib/admissionEmail.js';
import smtp from '../../lib/smtp.cjs';

// Short-lived duplicate suppression; a network/SMTP failure may be ambiguous.
const recent = new Map();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
  let payload = { ...req.body };
  if (!Object.hasOwn(emailSubjects, payload.event) || typeof payload.email !== 'string' || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(payload.email)) {
    return res.status(400).json({ status: 'error', message: 'A valid event and single recipient email are required.' });
  }
  try {
    const supabase = req.__supabase || getSupabaseServerClient();
    if (!supabase) throw new Error('Database client unavailable.');
    if (payload.event === 'inquiry_received') {
      // The public form can only confirm an actual saved inquiry. Use the
      // saved recipient and content, not an arbitrary email payload.
      if (!payload.inquiry_id) return res.status(400).json({ status: 'error', message: 'Saved inquiry ID is required.' });
      const { data, error } = await supabase.from('inquiries').select('id,email,name,course_interest,submitted_at').eq('id', payload.inquiry_id).eq('email', payload.email).limit(1);
      const inquiry = data?.[0];
      const age = Date.now() - Date.parse(inquiry?.submitted_at);
      if (error || !inquiry || !Number.isFinite(age) || age < 0 || age > 600000) return res.status(403).json({ status: 'error', message: 'Recent inquiry not found.' });
      payload = { event: payload.event, email: inquiry.email, name: inquiry.name, course: inquiry.course_interest };
    } else {
      const auth = await authorizeAdminOperation(req);
      if (!auth.ok) {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        const session = payload.event === 're_enrollment_requested' ? await validatePortalSession(supabase, token, ['student']) : null;
        if (!session?.ok) return res.status(auth.status).json({ status: 'error', message: auth.message });
        const account = await findAccountByCnic(supabase, session.session.cnic);
        if (!account.ok || account.email?.toLowerCase() !== payload.email.toLowerCase()) return res.status(403).json({ status: 'error', message: 'Recipient must match your account.' });
        payload = { ...payload, email: account.email, cnic: session.session.cnic, name: account.name };
      }
    }
    smtp.smtpConfig();
    const now = Date.now();
    for (const [key, expires] of recent) if (expires <= now) recent.delete(key);
    const key = `${payload.event}:${payload.email.toLowerCase()}`;
    if (recent.has(key)) return res.status(429).json({ status: 'error', message: 'Please wait before requesting this email again.' });
    recent.set(key, now + 60000);
    await smtp.sendEmail(admissionEmail(payload));
    return res.status(200).json({ status: 'success', ok: true, message: 'Email accepted by the mail server.' });
  } catch (error) {
    console.error('[admission-email] Dispatch failed:', error.code || error.name || 'Unknown error');
    return res.status(502).json({ status: 'error', ok: false, message: 'Email could not be confirmed. Check SMTP configuration and mail-server logs before retrying.' });
  }
}
