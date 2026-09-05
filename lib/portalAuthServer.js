import { getSupabaseServerClient } from './supabaseServer.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const MODULE_KEYS = [
  'dashboard', 'counsellor', 'students', 'teachers', 'courses', 'attendance',
  'tasks', 'results', 'finance', 'complaints', 'announcements', 'blog',
  'referral', 'reports', 'hr', 'users', 'settings'
];

export function normalizeCnic(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 13) return '';
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function hashPassword(plainText) {
  return bcrypt.hashSync(String(plainText), 10);
}

export function verifyPassword(plainText, hash) {
  if (!plainText || !hash) return false;
  // PHP password_hash uses $2y$, bcryptjs uses $2a$
  const normHash = String(hash).replace(/^\$2y\$/, '$2a$');
  return bcrypt.compareSync(String(plainText), normHash);
}

export function normalizePermissions(permissions) {
  const source = typeof permissions === 'object' && permissions !== null ? permissions : {};
  const normalized = {};
  for (const key of MODULE_KEYS) {
    normalized[key] = source[key] || 'none';
  }
  return normalized;
}

export async function findAccountByCnic(supabase, cnic) {
  const normCnic = normalizeCnic(cnic);
  if (!normCnic) {
    return { ok: false, status: 400, message: 'Please enter a valid 13-digit CNIC.' };
  }

  const { data: allowedRows, error: allowedErr } = await supabase
    .from('allowed_cnics')
    .select('*')
    .eq('cnic', normCnic)
    .limit(1);

  if (allowedErr) {
    return { ok: false, status: 500, message: allowedErr.message };
  }

  const allowed = allowedRows?.[0];

  if (!allowed) {
    // Check if there is an admission application pending or other status
    const { data: admissions } = await supabase
      .from('admissions')
      .select('status')
      .eq('cnic', normCnic)
      .order('submitted_at', { ascending: false })
      .limit(1);

    const latest = admissions?.[0];
    if (latest?.status) {
      const status = String(latest.status).toLowerCase();
      if (status === 'pending') {
        return {
          ok: false,
          status: 403,
          message: 'Your registration is pending admin approval. You can log in after your admission is approved.'
        };
      }
      return {
        ok: false,
        status: 403,
        message: `Your admission is ${latest.status}. Please contact the administrator.`
      };
    }

    return {
      ok: false,
      status: 403,
      message: 'Access denied. No account found for this CNIC.'
    };
  }

  const role = allowed.role;
  let profile = null;

  if (role === 'student') {
    const { data: studentRows } = await supabase
      .from('admissions')
      .select('id, name, email, status, course, batch, batch_timing, cnic')
      .eq('cnic', normCnic)
      .in('status', ['Active', 'Graduated'])
      .order('submitted_at', { ascending: false })
      .limit(1);
    profile = studentRows?.[0] || null;
  } else if (role === 'teacher') {
    const { data: teacherRows } = await supabase
      .from('teachers')
      .select('id, name, email, status, cnic')
      .eq('cnic', normCnic)
      .limit(1);
    profile = teacherRows?.[0] || null;
    if (profile && !['Active', 'Pending', 'Onboarding'].includes(profile.status)) {
      return {
        ok: false,
        status: 403,
        message: `Your account is ${String(profile.status || 'inactive').toLowerCase()}. Please contact the administrator.`
      };
    }
  } else {
    const { data: userRows } = await supabase
      .from('users')
      .select('id, full_name, email, status, role, cnic')
      .eq('cnic', normCnic)
      .limit(1);
    profile = userRows?.[0] || null;
    if (profile && String(profile.status).toLowerCase() !== 'active') {
      return {
        ok: false,
        status: 403,
        message: 'Your account is not active. Please contact the administrator.'
      };
    }
  }

  if (!profile) {
    return { ok: false, status: 404, message: 'Account profile not found.' };
  }

  const email = (profile.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      ok: false,
      status: 400,
      message: 'No valid email is attached to this account. Please contact admin.'
    };
  }

  const name = profile.name || profile.full_name || allowed.name || 'DeepSkills user';

  return {
    ok: true,
    allowed,
    role,
    profile,
    email,
    name,
    cnic: normCnic
  };
}

export async function buildUserPayload(supabase, cnic) {
  const normCnic = normalizeCnic(cnic);
  if (!normCnic) {
    throw new Error('Valid CNIC is required.');
  }

  const { data: allowedRows } = await supabase
    .from('allowed_cnics')
    .select('*')
    .eq('cnic', normCnic)
    .limit(1);

  const roleData = allowedRows?.[0];
  if (!roleData) {
    throw new Error('Access denied. No account found for this CNIC.');
  }

  const role = roleData.role;

  if (role === 'teacher') {
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, name, status, specialization, phone, email')
      .eq('cnic', normCnic)
      .limit(1);
    const teacher = teachers?.[0];
    if (!teacher) throw new Error('Teacher profile not found.');
    if (!['Active', 'Pending', 'Onboarding'].includes(teacher.status)) {
      throw new Error(`Your account is ${teacher.status}. Please contact the administrator.`);
    }
    return {
      ...roleData,
      id: teacher.id,
      name: roleData.name || teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status,
      authType: 'cnic',
      permissions: {}
    };
  }

  if (role === 'student') {
    const { data: admissions } = await supabase
      .from('admissions')
      .select('*')
      .eq('cnic', normCnic)
      .in('status', ['Active', 'Graduated'])
      .order('submitted_at', { ascending: false })
      .limit(1);
    const admission = admissions?.[0];
    if (!admission) throw new Error('Student admission record not found.');
    return {
      ...roleData,
      id: admission.id,
      name: roleData.name || admission.name,
      email: admission.email,
      phone: admission.phone,
      assigned_course: admission.course || roleData.assigned_course || null,
      course: admission.course || roleData.assigned_course || null,
      batch: admission.batch || roleData.batch || null,
      batch_timing: admission.batch_timing || roleData.batch_timing || null,
      status: admission.status,
      authType: 'cnic',
      permissions: {}
    };
  }

  // Staff / Admin
  const { data: users } = await supabase
    .from('users')
    .select('*, custom_roles(id, name, color, icon, permissions)')
    .eq('cnic', normCnic)
    .limit(1);
  const directoryUser = users?.[0];
  if (!directoryUser) throw new Error('User directory record not found.');
  if (directoryUser.status !== 'active') {
    throw new Error(`Your account is ${directoryUser.status}. Please contact the administrator.`);
  }

  let permissions = {};
  if (role === 'admin') {
    for (const key of MODULE_KEYS) {
      permissions[key] = 'full';
    }
  } else {
    const customPerms = directoryUser.custom_roles?.permissions || directoryUser.permissions || {};
    permissions = normalizePermissions(customPerms);
  }

  return {
    id: directoryUser.id,
    cnic: directoryUser.cnic,
    email: directoryUser.email || null,
    phone: directoryUser.phone || null,
    name: directoryUser.full_name,
    role: directoryUser.role,
    status: directoryUser.status,
    customRoleId: directoryUser.custom_role_id || null,
    permissions,
    authType: 'cnic'
  };
}

export async function createPortalSession(supabase, cnic, role, actorId = null, actorType = 'user', req = null) {
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashPassword(sessionSecret);
  const now = new Date().toISOString();
  const sessionExpiry = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
  const userAgent = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : '';
  const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || '';

  try {
    const { data: inserted, error: sessionErr } = await supabase
      .from('portal_sessions')
      .insert([{
        token_hash: tokenHash,
        cnic,
        role,
        actor_id: actorId,
        actor_type: actorType,
        created_at: now,
        expires_at: sessionExpiry,
        user_agent: userAgent,
        ip_address: ipAddress
      }])
      .select('id')
      .single();

    if (!sessionErr && inserted?.id) {
      return {
        sessionId: inserted.id,
        sessionSecret,
        fullSessionToken: `${inserted.id}.${sessionSecret}`,
        expiresAt: sessionExpiry,
        table: 'portal_sessions'
      };
    }
  } catch {
    // Fallback if portal_sessions not present
  }

  // Fallback row in login_otps
  const dummyOtpHash = hashPassword(crypto.randomBytes(6).toString('hex'));
  const { data: fallbackRows } = await supabase
    .from('login_otps')
    .insert([{
      cnic,
      email: `session_${crypto.createHash('md5').update(cnic).digest('hex').slice(0, 8)}@deepskills.pk`,
      role,
      otp_hash: dummyOtpHash,
      expires_at: now,
      consumed_at: now,
      token_hash: tokenHash,
      token_expires_at: sessionExpiry,
      token_used_at: now,
      user_agent: userAgent,
      ip_address: ipAddress
    }])
    .select('id')
    .single();

  const fallbackId = fallbackRows?.id || '';
  return {
    sessionId: fallbackId,
    sessionSecret,
    fullSessionToken: `${fallbackId}.${sessionSecret}`,
    expiresAt: sessionExpiry,
    table: 'login_otps'
  };
}

export async function validatePortalSession(supabase, token, allowedRoles = [], requestedCnic = null) {
  if (!token) {
    return { ok: false, status: 401, code: 'missing_token', message: 'Authentication token is required. Please log in again.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, status: 401, code: 'invalid_token_format', message: 'Invalid authentication token format.' };
  }

  const [rowId, rawSecret] = parts;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rowId);
  if (!isUuid) {
    return { ok: false, status: 401, code: 'invalid_token_format', message: 'Invalid authentication token format.' };
  }

  const now = new Date().toISOString();
  let row = null;
  let isPortalSession = false;

  // 1. Check portal_sessions
  try {
    const { data: portalRows } = await supabase
      .from('portal_sessions')
      .select('*')
      .eq('id', rowId)
      .limit(1);
    if (portalRows && portalRows[0]) {
      row = portalRows[0];
      isPortalSession = true;
    }
  } catch {
    // Ignore fallback
  }

  // 2. Check login_otps fallback
  if (!row) {
    const { data: otpRows } = await supabase
      .from('login_otps')
      .select('id, cnic, role, token_hash, token_expires_at')
      .eq('id', rowId)
      .limit(1);
    if (otpRows && otpRows[0]) {
      row = {
        ...otpRows[0],
        expires_at: otpRows[0].token_expires_at,
        revoked_at: null,
        actor_id: null,
        actor_type: otpRows[0].role === 'student' ? 'student' : (otpRows[0].role === 'teacher' ? 'teacher' : 'user')
      };
    }
  }

  if (!row || !row.token_hash) {
    return { ok: false, status: 401, code: 'session_not_found', message: 'Session not found or expired. Please log in again.' };
  }

  if (row.revoked_at) {
    return { ok: false, status: 401, code: 'session_revoked', message: 'Session has been logged out or revoked. Please log in again.' };
  }

  if (row.expires_at && row.expires_at < now) {
    return { ok: false, status: 401, code: 'session_expired', message: 'Session expired. Please log in again.' };
  }

  if (!verifyPassword(rawSecret, row.token_hash)) {
    return { ok: false, status: 401, code: 'invalid_token', message: 'Invalid authentication token. Please log in again.' };
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : (allowedRoles ? [allowedRoles] : []);
  if (roles.length > 0 && !roles.includes(row.role)) {
    return { ok: false, status: 403, code: 'role_mismatch', message: 'Access denied: token role does not match required role.' };
  }

  const sessionCnic = normalizeCnic(row.cnic);
  if (!sessionCnic) {
    return { ok: false, status: 403, code: 'invalid_session_cnic', message: 'Session record is missing a valid CNIC.' };
  }

  if (requestedCnic) {
    const normReq = normalizeCnic(requestedCnic);
    if (normReq && normReq !== sessionCnic) {
      return { ok: false, status: 403, code: 'ownership_violation', message: 'Access denied: token does not belong to the requested user.' };
    }
  }

  if (isPortalSession) {
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
    if (Date.now() - lastSeen > 300000) {
      await supabase.from('portal_sessions').update({ last_seen_at: now }).eq('id', row.id);
    }
  }

  return {
    ok: true,
    session: {
      id: row.id,
      cnic: sessionCnic,
      role: row.role,
      actor_id: row.actor_id || null,
      actor_type: row.actor_type || (row.role === 'student' ? 'student' : (row.role === 'teacher' ? 'teacher' : 'user')),
      expires_at: row.expires_at,
      table: isPortalSession ? 'portal_sessions' : 'login_otps'
    }
  };
}

export async function sendOtpEmail({ email, name, code, cnic, req = null }) {
  const safeName = name || 'DeepSkills user';
  const safeCode = code;
  const host = req?.headers?.host || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || process.env.NODE_ENV !== 'production';

  // Check SMTP config from environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpFrom = process.env.SMTP_FROM || 'DeepSkills <info@deepskills.pk>';
  const hasSmtp = Boolean(smtpHost && smtpUser && smtpPass);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#222;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.05);">
        <div style="background:#7B1F2E;color:#ffffff;padding:24px 28px;">
          <h1 style="margin:0;font-size:24px;letter-spacing:1px;">DeepSkills</h1>
          <p style="margin:4px 0 0;font-size:13px;opacity:0.85;">Empowering Future Leaders</p>
        </div>
        <div style="padding:32px 28px;">
          <h2 style="margin:0 0 16px;color:#7B1F2E;font-size:20px;">Login Verification Code</h2>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Dear <strong>${safeName}</strong>,</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">Your one-time login verification code for DeepSkills portal is:</p>
          <div style="font-size:32px;letter-spacing:10px;font-weight:700;background:#f8eef0;color:#7B1F2E;padding:18px;text-align:center;border-radius:10px;border:1px solid rgba(123,31,46,0.2);">
            ${safeCode}
          </div>
          <p style="margin-top:24px;font-size:14px;color:#666;line-height:1.5;">This code expires in <strong>10 minutes</strong>. Never share your OTP with anyone.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />
          <p style="margin:0;font-size:13px;color:#888;">Regards,<br><strong style="color:#222;">DeepSkills IT &amp; Admissions Team</strong><br>Lahore, Pakistan</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log OTP visibly in the terminal for developers
  if (isLocalhost) {
    console.log('\n======================================================');
    console.log('🔑 [DEEPSKILLS LOCAL TEST OTP]');
    console.log(`👤 Name:     ${safeName}`);
    console.log(`🪪 CNIC:     ${cnic || 'N/A'}`);
    console.log(`📧 Email:    ${email}`);
    console.log(`👉 OTP CODE: \x1b[1m\x1b[32m${safeCode}\x1b[0m`);
    console.log(`⏳ Expiry:   10 minutes (Valid for login)`);
    console.log('======================================================\n');
  }

  // If SMTP is configured, attempt real email transmission
  if (hasSmtp) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: 'DeepSkills Login OTP',
        html: htmlContent
      });

      return {
        ok: true,
        sentEmail: true,
        devOtp: isLocalhost ? safeCode : undefined
      };
    } catch (err) {
      console.warn('[Email Warning] SMTP dispatch failed:', err.message);
      if (isLocalhost) {
        // On localhost, don't break development flow if SMTP fails
        return {
          ok: true,
          sentEmail: false,
          devOtp: safeCode,
          devNotice: 'SMTP failed, using terminal dev OTP'
        };
      }
      return {
        ok: false,
        message: 'Unable to send OTP email. Please check SMTP settings.'
      };
    }
  }

  // If SMTP is NOT configured
  if (isLocalhost) {
    // In local development, succeed gracefully with the dev OTP
    return {
      ok: true,
      sentEmail: false,
      devOtp: safeCode,
      devNotice: 'Localhost testing mode (see terminal)'
    };
  }

  return {
    ok: false,
    message: 'Email service is not configured. Please contact administrator.'
  };
}

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

    if (!verifyPassword(rawSecret, session.token_hash)) {
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

