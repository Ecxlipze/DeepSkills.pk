import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { validatePortalSession } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
    return res.status(200).json({
      status: 'success',
      message: 'No active session token provided.'
    });
  }

  const now = new Date().toISOString();

  try {
    const sessionRes = await validatePortalSession(supabase, token);
    if (sessionRes.ok) {
      const session = sessionRes.session;
      if (session.table === 'portal_sessions') {
        await supabase
          .from('portal_sessions')
          .update({
            revoked_at: now,
            revoked_reason: 'logout'
          })
          .eq('id', session.id);
      } else {
        await supabase
          .from('login_otps')
          .update({ token_expires_at: now })
          .eq('id', session.id);
      }

      // Log logout event in activity_logs
      try {
        await supabase.from('activity_logs').insert([{
          user_id: ['student', 'teacher'].includes(session.role) ? null : session.actor_id,
          user_name: session.cnic,
          user_role: session.role,
          event_type: 'logout',
          event_description: 'Logged out',
          created_at: now
        }]);
      } catch (e) {
        // Activity log failure should not block logout
      }
    }
  } catch (err) {
    console.warn('[logout] Error revoking session:', err);
  }

  return res.status(200).json({
    status: 'success',
    message: 'Logged out successfully.'
  });
}
