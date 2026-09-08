const escapeHtml = value => String(value ?? '').slice(0, 1000).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export const emailSubjects = {
  registration_received: 'Application received', admission_approved: 'Admission approved',
  admission_rejected: 'Admission update', admission_inactive: 'Account status update',
  re_enrollment_requested: 'Re-enrollment request received', re_enrollment_approved: 'Re-enrollment approved',
  re_enrollment_rejected: 'Re-enrollment update', inquiry_received: 'Inquiry received',
  welcome: 'Welcome to DeepSkills', login_instructions: 'Login instructions', notification: 'Important notification'
};

export function admissionEmail(payload) {
  const p = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, escapeHtml(value)]));
  const messages = {
    registration_received: `Thank you for applying for ${p.course || 'a course'}. Your application is pending approval.`,
    admission_approved: `Your admission for ${p.course || 'your course'} has been approved.`,
    admission_rejected: `Your admission was not approved. ${p.reason || 'Please contact administration for details.'}`,
    admission_inactive: 'Your account is inactive or blocked. Please contact administration.',
    re_enrollment_requested: `Your re-enrollment request for ${p.course || 'your course'} is pending approval.`,
    re_enrollment_approved: `Your re-enrollment for ${p.course || 'your course'} has been approved.`,
    re_enrollment_rejected: `Your re-enrollment was not approved. ${p.reason || 'Please contact administration for details.'}`,
    inquiry_received: `Thank you for your interest in ${p.course || 'DeepSkills'}. Our counsellor will contact you.`,
    welcome: `Your enrollment in ${p.course || 'your course'} is confirmed. Welcome to DeepSkills!`,
    login_instructions: 'Sign in using your CNIC. A one-time login code will be emailed to you.',
    notification: p.message || 'You have a new notification in your portal.'
  };
  if (!Object.hasOwn(emailSubjects, payload.event)) throw new Error('Invalid email event.');
  const subject = `DeepSkills: ${emailSubjects[payload.event]}`;
  const url = new URL('/login/', process.env.NEXT_PUBLIC_SITE_URL || 'https://deepskills.pk').href;
  const details = ['course', 'batch', 'timing', 'cnic'].filter(key => p[key]).map(key => `<p>${key.toUpperCase()}: ${p[key]}</p>`).join('');
  return {
    to: payload.email, subject,
    html: `<html><body style="font-family:Arial,sans-serif;color:#222"><h1>DeepSkills</h1><p>Dear ${p.name || 'Student'},</p><p>${messages[payload.event]}</p>${details}<p><a href="${escapeHtml(url)}">Open your portal</a></p><p>DeepSkills Team</p></body></html>`,
    text: `${subject}\n\nOpen your portal: ${url}`
  };
}
