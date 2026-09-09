import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { normalizeCnic, verifyPassword, buildUserPayload, createPortalSession } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const { cnic: rawCnic, verificationToken } = req.body || {};
  const cnic = normalizeCnic(rawCnic);
  const cleanToken = String(verificationToken || '').trim();

  if (!cnic || !cleanToken) {
    return res.status(400).json({ status: 'error', message: 'OTP verification is required.' });
  }

  const now = new Date().toISOString();

  try {
    const { data: rows, error: fetchErr } = await supabase
      .from('login_otps')
      .select('*')
      .eq('cnic', cnic)
      .is('token_used_at', null)
      .gt('token_expires_at', now)
      .order('consumed_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error('[validate-token] Database fetch error:', fetchErr);
      return res.status(500).json({ status: 'error', message: 'Database lookup failed.' });
    }

    const row = rows?.[0];
    if (!row || !verifyPassword(cleanToken, row.token_hash)) {
      return res.status(401).json({ status: 'error', message: 'OTP verification expired. Please request a new code.' });
    }

    // Mark verification token as used
    await supabase
      .from('login_otps')
      .update({ token_used_at: now })
      .eq('id', row.id);

    // Build authoritative user payload
    const user = await buildUserPayload(supabase, cnic);
    const role = user.role || 'user';
    const actorType = role === 'student' ? 'student' : (role === 'teacher' ? 'teacher' : 'user');
    const actorId = user.id || null;

    // Create session in portal_sessions
    const session = await createPortalSession(supabase, cnic, role, actorId, actorType, req);
    user.sessionToken = session.fullSessionToken;

    // Update last login in users table if staff
    if (!['student', 'teacher'].includes(role)) {
      await supabase
        .from('users')
        .update({ last_login: now, updated_at: now })
        .eq('cnic', cnic);
    }

    // Log login event in activity_logs
    try {
      await supabase.from('activity_logs').insert([{
        user_id: ['student', 'teacher'].includes(role) ? null : actorId,
        user_name: user.name || cnic,
        user_role: role,
        event_type: 'login',
        event_description: 'Logged in via CNIC OTP',
        created_at: now
      }]);
    } catch (e) {
      // Activity log failure should not block login
    }

    return res.status(200).json({
      status: 'success',
      message: 'Login verified.',
      user,
      sessionToken: session.fullSessionToken
    });
  } catch (err) {
    console.error('[validate-token] Unexpected error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Login verification failed.' });
  }
}
