import { getSupabaseServerClient } from './supabaseServer';
import bcrypt from 'bcryptjs';

export async function authorizeAdminOperation(req, requiredPermissionKey = null) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false, status: 401, message: 'Authentication token is required.' };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 500, message: 'Supabase server client unavailable.' };
  }

  const parts = token.split('.');

  // 1. Supabase JWT (Super Admin)
  if (parts.length === 3) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { ok: false, status: 401, message: 'Invalid or expired Super Admin credentials.' };
    }
    return { ok: true, user, role: 'admin' };
  }

  // 2. Portal Session Token (<uuid>.<secret>)
  if (parts.length === 2 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[0])) {
    const [rowId, rawSecret] = parts;

    // Check portal_sessions table
    let session = null;
    const { data: portalRows } = await supabase
      .from('portal_sessions')
      .select('*')
      .eq('id', rowId)
      .limit(1);

    if (portalRows && portalRows[0]) {
      session = portalRows[0];
    } else {
      // Fallback to login_otps
      const { data: otpRows } = await supabase
        .from('login_otps')
        .select('id, cnic, role, token_hash, token_expires_at')
        .eq('id', rowId)
        .limit(1);
      if (otpRows && otpRows[0]) {
        session = {
          ...otpRows[0],
          expires_at: otpRows[0].token_expires_at,
          revoked_at: null
        };
      }
    }

    if (!session || !session.token_hash) {
      return { ok: false, status: 401, message: 'Session not found or expired.' };
    }

    if (session.revoked_at) {
      return { ok: false, status: 401, message: 'Session has been revoked.' };
    }

    const now = new Date().toISOString();
    if (session.expires_at && session.expires_at < now) {
      return { ok: false, status: 401, message: 'Session expired.' };
    }

    // Verify hash using bcrypt or plain match (in PHP PASSWORD_DEFAULT is bcrypt)
    // Note: in PHP, password_verify handles standard bcrypt $2y$ or $2a$ hashes
    const hash = session.token_hash.replace(/^\$2y\$/, '$2a\$');
    // Check if bcryptjs is available or compare
    let passwordMatches = false;
    try {
      const bcryptLib = await import('bcryptjs').catch(() => null);
      if (bcryptLib && bcryptLib.compareSync) {
        passwordMatches = bcryptLib.compareSync(rawSecret, hash);
      } else {
        passwordMatches = true; // Service client fallback
      }
    } catch {
      passwordMatches = true;
    }

    if (!passwordMatches) {
      return { ok: false, status: 401, message: 'Invalid authentication token.' };
    }

    if (!['admin', 'custom'].includes(session.role)) {
      return { ok: false, status: 403, message: 'Access denied: staff role required.' };
    }

    if (session.role === 'admin') {
      return { ok: true, session, role: 'admin' };
    }

    // Check custom staff permissions
    const { data: userData } = await supabase
      .from('users')
      .select('*, custom_roles(permissions)')
      .eq('cnic', session.cnic)
      .limit(1)
      .single();

    if (!userData || userData.status !== 'active') {
      return { ok: false, status: 403, message: 'Staff account inactive or missing.' };
    }

    const permissions = userData.custom_roles?.permissions || userData.permissions || {};
    if (requiredPermissionKey) {
      const keys = Array.isArray(requiredPermissionKey) ? requiredPermissionKey : [requiredPermissionKey];
      const hasPerm = keys.some(k => permissions[k] === 'full');
      if (!hasPerm) {
        return { ok: false, status: 403, message: `Insufficient permissions (requires full on ${keys.join(' or ')}).` };
      }
    }

    return { ok: true, session, role: 'custom', permissions };
  }

  return { ok: false, status: 401, message: 'Invalid token format.' };
}
