import { getAuthHeaders } from './adminAccessApi';
import { requestJson } from './requestJson';

export const EMAIL_EVENTS = {
  REGISTRATION_RECEIVED: 'registration_received',
  ADMISSION_APPROVED: 'admission_approved',
  ADMISSION_REJECTED: 'admission_rejected',
  ADMISSION_INACTIVE: 'admission_inactive',
  RE_ENROLLMENT_REQUESTED: 're_enrollment_requested',
  RE_ENROLLMENT_APPROVED: 're_enrollment_approved',
  RE_ENROLLMENT_REJECTED: 're_enrollment_rejected',
  INQUIRY_RECEIVED: 'inquiry_received',
  WELCOME: 'welcome',
  LOGIN_INSTRUCTIONS: 'login_instructions',
  NOTIFICATION: 'notification'
};

export async function sendAdmissionEmail(event, payload = {}) {
  if (!payload.email) return { ok: false, message: 'Missing recipient email.' };
  try {
    const result = await requestJson('/api/admission-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
      body: JSON.stringify({ ...payload, event })
    });
    return { ok: true, message: result.message };
  } catch (error) { return { ok: false, message: error.message || 'Email could not be confirmed.' }; }
}
