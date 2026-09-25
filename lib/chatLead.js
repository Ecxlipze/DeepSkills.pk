// Turns a chat conversation into a counsellor inquiry.
//
// Chat leads are written to the same `inquiries` table as the website inquiry
// form, so they appear in the counsellor panel with everything else. The chat
// form only asks for a name and phone number — asking a visitor mid-chat for a
// CNIC and city (which the full inquiry form requires) loses the lead — so the
// remaining columns stay null and the counsellor collects them on the call.

import { cleanText, validEmail } from './publicForms.js';

export const CHAT_LEAD_SOURCE = 'Website Chatbot';

export const normalizePhone = (value) => cleanText(value, 30).replace(/[^\d+]/g, '');

// Permissive on formatting, strict on having enough digits to actually call.
export const validPhone = (value) => {
  const digits = normalizePhone(value).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

export function validateChatLead(input = {}) {
  const name = cleanText(input.name, 120);
  const phone = normalizePhone(input.phone);
  const email = cleanText(input.email, 254);

  if (name.length < 2) return { ok: false, message: 'Please enter your name.' };
  if (!validPhone(phone)) return { ok: false, message: 'Please enter a valid phone number.' };
  if (email && !validEmail(email)) return { ok: false, message: 'Please enter a valid email address, or leave it blank.' };

  return { ok: true, name, phone, email };
}

export function buildInquiryRow(input = {}) {
  const valid = validateChatLead(input);
  if (!valid.ok) return null;

  const question = cleanText(input.question, 400);
  const page = cleanText(input.path, 200);
  const notes = [
    'Submitted through the website chatbot.',
    question ? `Visitor asked: "${question}"` : '',
    page ? `Page: ${page}` : '',
  ].filter(Boolean).join(' ');

  const now = new Date().toISOString();
  return {
    name: valid.name,
    phone: valid.phone,
    email: valid.email || null,
    course_interest: cleanText(input.course, 160) || null,
    hear_about_us: CHAT_LEAD_SOURCE,
    message: notes.slice(0, 1000),
    status: 'new',
    submitted_at: now,
    last_updated: now,
  };
}
