const EMAIL_ENDPOINT = process.env.NEXT_PUBLIC_EMAIL_ENDPOINT || '/api/admission-email.php';
const FALLBACK_EMAIL_ENDPOINT = '/api/admission-email.php';

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
  if (!payload.email) {
    return { ok: false, message: 'Missing recipient email.' };
  }

  try {
    const requestBody = JSON.stringify({ event, ...payload });
    let response;
    let result;

    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // 1. Try Next.js API route first (native on localhost and Node.js environments)
    try {
      response = await fetch('/api/admission-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });
      result = await response.json().catch(() => ({}));
    } catch (e) {
      // Fallback
    }

    // 2. Fall back to PHP endpoint ONLY if not on localhost and Next route is not present (404)
    if (!isLocalhost && (!response || response.status === 404)) {
      const targetEndpoint = EMAIL_ENDPOINT || FALLBACK_EMAIL_ENDPOINT;
      try {
        response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        });
        result = await response.json().catch(() => ({}));
      } catch (e) {
        // Fallback failed
      }
    }

    if (!response.ok || result.status === 'error') {
      return {
        ok: false,
        message: result.message || `Email request failed with status ${response.status}.`
      };
    }

    return { ok: true, message: result.message || 'Email sent.' };
  } catch (error) {
    return { ok: false, message: error.message || 'Email request failed.' };
  }
}
