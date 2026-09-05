import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { validatePortalSession, buildUserPayload } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const authHeader = req.headers.authorization || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token && req.body) {
    token = (req.body.sessionToken || req.body.token || '').trim();
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      code: 'missing_token',
      message: 'Session token is required.'
    });
  }

  try {
    const sessionRes = await validatePortalSession(supabase, token);
    if (!sessionRes.ok) {
      return res.status(sessionRes.status).json({
        status: 'error',
        code: sessionRes.code,
        message: sessionRes.message
      });
    }

    const freshUser = await buildUserPayload(supabase, sessionRes.session.cnic);
    freshUser.sessionToken = token;

    return res.status(200).json({
      status: 'success',
      message: 'Session valid.',
      user: freshUser
    });
  } catch (err) {
    console.error('[validate-session] Unexpected error:', err);
    return res.status(401).json({
      status: 'error',
      code: 'validation_failed',
      message: err.message || 'Session validation failed.'
    });
  }
}
