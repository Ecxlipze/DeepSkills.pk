import smtp from '../../lib/smtp.cjs';
import { acceptPost, validEmail, escapeHtml } from '../../lib/publicForms.js';
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default async function handler(req, res) {
  if (!acceptPost(req, res)) return;
  const d = req.body;
  if (d['bot-field']) return res.status(200).json({ status: 'success', message: 'Message sent (filtered)' });
  const stripTags = value => String(value ?? '').replace(/<[^>]*>/g, '').trim();
  const name = stripTags(d.name), phone = stripTags(d.phone), message = stripTags(d.message);
  if (!name || !phone || !message || !validEmail(d.email)) return res.status(400).json({ status: 'error', message: 'All fields are required.' });
  if (!/^[a-zA-Z\s.-]+$/.test(name) || name.length > 50) return res.status(400).json({ status: 'error', message: 'Invalid name format or length.' });
  if (!/^\+?\d+$/.test(phone) || phone.length > 15) return res.status(400).json({ status: 'error', message: 'Invalid phone format or length.' });
  if (message.length > 500) return res.status(400).json({ status: 'error', message: 'Message exceeds 500 character limit.' });
  try {
    await smtp.sendEmail({ to: process.env.CONTACT_EMAIL_TO || 'info@deepskills.pk', replyTo: d.email,
      subject: `DeepSkills Website Inquiry: ${name.replace(/[\r\n]/g, ' ')}`,
      text: `Name: ${name}\nEmail: ${d.email}\nPhone: ${phone}\n\n${message}`,
      html: `<h1>New Website Inquiry</h1><p>Name: ${escapeHtml(name)}</p><p>Email: ${escapeHtml(d.email)}</p><p>Phone: ${escapeHtml(phone)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` });
    return res.status(200).json({ status: 'success', message: 'Your message has been accepted by the mail server.' });
  } catch (error) {
    console.error('[contact] Email failed:', error.code || error.name);
    return res.status(502).json({ status: 'error', message: 'Unable to confirm email delivery. Please contact us directly rather than repeatedly resubmitting.' });
  }
}
