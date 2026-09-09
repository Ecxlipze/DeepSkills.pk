import crypto from 'crypto';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { normalizeCnic, hashPassword, verifyPassword } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const { cnic: rawCnic, otp: rawOtp } = req.body || {};
  const cnic = normalizeCnic(rawCnic);
  const otp = String(rawOtp || '').replace(/\D/g, '');

  if (!cnic || otp.length !== 6) {
    return res.status(400).json({ status: 'error', message: 'Please enter a valid 6-digit OTP.' });
  }

  const now = new Date().toISOString();

  try {
    const { data: rows, error: fetchErr } = await supabase
      .from('login_otps')
      .select('*')
      .eq('cnic', cnic)
      .is('consumed_at', null)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error('[verify-otp] Database fetch error:', fetchErr);
      return res.status(500).json({ status: 'error', message: 'Failed to query OTP record.' });
    }

    const row = rows?.[0];
    if (!row) {
      return res.status(400).json({ status: 'error', message: 'OTP expired or not found. Please request a new code.' });
    }

    const currentAttempts = row.attempts || 0;
    if (currentAttempts >= 5) {
      return res.status(429).json({ status: 'error', message: 'Too many OTP attempts. Please request a new code.' });
    }

    const isValid = verifyPassword(otp, row.otp_hash);
    if (!isValid) {
      await supabase
        .from('login_otps')
        .update({ attempts: currentAttempts + 1 })
        .eq('id', row.id);

      return res.status(400).json({ status: 'error', message: 'Invalid OTP. Please try again.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashPassword(verificationToken);
    const tokenExpiresAt = new Date(Date.now() + 120 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from('login_otps')
      .update({
        consumed_at: now,
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt
      })
      .eq('id', row.id);

    if (updateErr) {
      console.error('[verify-otp] Update error:', updateErr);
      return res.status(500).json({ status: 'error', message: 'Failed to verify OTP record.' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'OTP verified.',
      verificationToken
    });
  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Verification failed.' });
  }
}
