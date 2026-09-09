import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { normalizeCnic, findAccountByCnic, hashPassword, sendOtpEmail } from '../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const rawCnic = req.body?.cnic;
  const cnic = normalizeCnic(rawCnic);

  if (!cnic) {
    return res.status(400).json({ status: 'error', message: 'Please enter a valid 13-digit CNIC.' });
  }

  try {
    const account = await findAccountByCnic(supabase, cnic);
    if (!account.ok) {
      return res.status(account.status).json({ status: 'error', message: account.message });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashPassword(code);
    const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
    const userAgent = req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : '';
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';

    const { error: insertErr } = await supabase
      .from('login_otps')
      .insert([{
        cnic: account.cnic,
        email: account.email,
        role: account.role,
        otp_hash: codeHash,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent
      }]);

    if (insertErr) {
      console.error('[send-otp] Error saving OTP to database:', insertErr);
      return res.status(500).json({ status: 'error', message: 'Failed to record OTP. Please try again.' });
    }

    const mailResult = await sendOtpEmail({
      email: account.email,
      name: account.name,
      code,
      cnic: account.cnic,
      req
    });

    if (!mailResult.ok) {
      return res.status(500).json({ status: 'error', message: mailResult.message || 'Unable to send OTP email.' });
    }

    const masked = account.email.replace(/(^.).*(@.*$)/, '$1***$2');
    const responsePayload = {
      status: 'success',
      message: 'OTP sent to your registered email.',
      email: masked,
      expiresInSeconds: 600
    };
    if (mailResult.devOtp) {
      responsePayload.devOtp = mailResult.devOtp;
    }
    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error('[send-otp] Unexpected error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Unable to process login request.' });
  }
}
