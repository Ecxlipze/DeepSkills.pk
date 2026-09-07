import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';
import { createNotification } from '../../../../src/utils/notifications.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const auth = await authorizeAdminOperation(req, null);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, message: auth.message });
  }

  if (auth.role === 'custom') {
    const perm = auth.permissions?.finance || auth.permissions?.referral;
    if (perm !== 'view' && perm !== 'full') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view or manage referral payouts.'
      });
    }
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ success: false, message: 'Database client unavailable.' });
  }

  try {
    // -------------------------------------------------------------
    // GET: Retrieve hydrated referrals, settings & summary metrics
    // -------------------------------------------------------------
    if (req.method === 'GET') {
      // 1. Fetch referral settings
      const { data: sData } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const settings = sData || {
        id: 1,
        cash_reward: 1000,
        fee_discount: 1500,
        is_active: true,
        max_referrals_per_user: 0
      };

      // 2. Fetch all referrals
      const { data: rawReferrals, error: rErr } = await supabase
        .from('referrals')
        .select('*')
        .order('referred_at', { ascending: false });

      if (rErr) {
        return res.status(500).json({ success: false, message: rErr.message });
      }

      const list = rawReferrals || [];

      // 3. Collect referrers and referred IDs for batch hydration
      const studentReferrerIds = [];
      const teacherReferrerIds = [];
      const referredAdmissionIds = [];

      list.forEach((r) => {
        if (r.referrer_id) {
          if (r.referrer_role === 'teacher') {
            teacherReferrerIds.push(r.referrer_id);
          } else {
            studentReferrerIds.push(r.referrer_id);
          }
        }
        if (r.referred_id) {
          referredAdmissionIds.push(r.referred_id);
        }
      });

      // Hydrate Students
      const studentMap = {};
      if (studentReferrerIds.length > 0) {
        const { data: studs } = await supabase
          .from('admissions')
          .select('id, name, course, batch, cnic, phone, email')
          .in('id', [...new Set(studentReferrerIds)]);
        (studs || []).forEach((s) => {
          studentMap[s.id] = s;
        });
      }

      // Hydrate Teachers
      const teacherMap = {};
      if (teacherReferrerIds.length > 0) {
        const { data: tchrs } = await supabase
          .from('teachers')
          .select('id, name, specialization, cnic, phone, email')
          .in('id', [...new Set(teacherReferrerIds)]);
        (tchrs || []).forEach((t) => {
          teacherMap[t.id] = t;
        });
      }

      // Hydrate Referred Admissions (for course & batch)
      const referredMap = {};
      if (referredAdmissionIds.length > 0) {
        const { data: refAdms } = await supabase
          .from('admissions')
          .select('id, name, course, batch, cnic, phone, email, status')
          .in('id', [...new Set(referredAdmissionIds)]);
        (refAdms || []).forEach((a) => {
          referredMap[a.id] = a;
        });
      }

      // Build normalized hydrated items
      const hydrated = list.map((r) => {
        const isTeacher = r.referrer_role === 'teacher';
        const referrerMeta = isTeacher ? teacherMap[r.referrer_id] : studentMap[r.referrer_id];
        const referredMeta = r.referred_id ? referredMap[r.referred_id] : null;

        return {
          id: r.id,
          referrer_id: r.referrer_id,
          referrer_role: r.referrer_role || (referrerMeta?.specialization ? 'teacher' : 'student'),
          referrer_name: referrerMeta?.name || (isTeacher ? 'Faculty Member' : 'Student Referrer'),
          referrer_cnic: referrerMeta?.cnic || null,
          referrer_phone: referrerMeta?.phone || null,
          referrer_email: referrerMeta?.email || null,
          referrer_program: referrerMeta?.course || referrerMeta?.specialization || null,
          referrer_batch: referrerMeta?.batch || null,

          referred_id: r.referred_id,
          referred_name: r.referred_name || referredMeta?.name || 'Prospective Student',
          referred_phone: r.referred_phone || referredMeta?.phone || null,
          referred_email: r.referred_email || referredMeta?.email || null,
          referred_course: referredMeta?.course || null,
          referred_batch: referredMeta?.batch || null,
          referred_status: referredMeta?.status || r.status,

          referred_at: r.referred_at,
          status: r.status || 'registered',
          reward_type: r.reward_type || 'cash',
          reward_amount: r.reward_amount || (r.reward_type === 'fee_discount' ? settings.fee_discount : settings.cash_reward),
          payout_status: r.payout_status || 'not_earned',
          payout_approved_at: r.payout_approved_at,
          payout_method: r.payout_method || 'bank_transfer',
          payout_reference: r.payout_reference || null,
          payout_notes: r.payout_notes || null,
          approved_by: r.approved_by || null
        };
      });

      // Calculate Metrics
      const total = hydrated.length;
      const enrolled = hydrated.filter((r) => r.status === 'enrolled' || r.status === 'approved').length;
      const pendingList = hydrated.filter((r) => r.payout_status === 'pending');
      const pendingPayouts = pendingList.length;
      const pendingAmount = pendingList.reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);
      const paidList = hydrated.filter((r) => r.payout_status === 'paid');
      const totalPaid = paidList.reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

      return res.status(200).json({
        success: true,
        referrals: hydrated,
        settings,
        summary: {
          total,
          enrolled,
          pendingPayouts,
          pendingAmount,
          totalPaid,
          conversionRate: total > 0 ? Math.round((enrolled / total) * 100) : 0
        }
      });
    }

    // -------------------------------------------------------------
    // POST: Approve Payout or Update Settings
    // -------------------------------------------------------------
    const { action } = req.body || {};

    if (action === 'approve_payout') {
      const {
        referral_id,
        reward_type = 'cash',
        reward_amount,
        payout_method = 'bank_transfer',
        payout_reference = '',
        payout_notes = ''
      } = req.body;

      if (!referral_id) {
        return res.status(400).json({ success: false, message: 'Missing referral_id' });
      }

      // 1. Fetch current referral record
      const { data: refRow, error: fetchErr } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referral_id)
        .single();

      if (fetchErr || !refRow) {
        return res.status(404).json({ success: false, message: 'Referral record not found' });
      }

      const amountToPay = Number(reward_amount) > 0 ? Number(reward_amount) : 1000;
      const nowIso = new Date().toISOString();

      // 2. Update referrals table
      const { error: updErr } = await supabase
        .from('referrals')
        .update({
          payout_status: 'paid',
          reward_type,
          reward_amount: amountToPay,
          payout_method,
          payout_reference: payout_reference || null,
          payout_notes: payout_notes || null,
          payout_approved_at: nowIso,
          approved_by: auth.user?.id || null
        })
        .eq('id', referral_id);

      if (updErr) {
        return res.status(500).json({ success: false, message: updErr.message });
      }

      // 3. Atomically record cash flow outflow in payments ledger
      const refCode = payout_reference || `REF-${Date.now().toString().slice(-6)}`;
      const { error: payErr } = await supabase
        .from('payments')
        .insert([
          {
            entity_id: refRow.referrer_id,
            entity_type: 'referrer',
            amount: amountToPay,
            paid_date: nowIso.split('T')[0],
            method: payout_method,
            reference_number: refCode,
            description: `Referral Reward - Referred ${refRow.referred_name || 'Student'}`,
            notes: payout_notes || `Referral commission disbursed by Admin (${auth.user?.email || 'Accounts'})`,
            status: 'paid'
          }
        ]);

      if (payErr) {
        console.error('Ledger write warning for referral payout:', payErr.message);
      }

      // 4. Send in-app notification to referrer
      try {
        if (refRow.referrer_id) {
          await createNotification({
            userId: refRow.referrer_id,
            role: refRow.referrer_role || 'student',
            type: 'referral_payout',
            title: 'Referral Reward Paid',
            message: `Your referral commission of Rs. ${amountToPay.toLocaleString()} has been approved and processed via ${payout_method.replace('_', ' ')}.`,
            link: refRow.referrer_role === 'teacher' ? '/teacher/referral' : '/student/referral',
            sendEmail: false
          });
        }
      } catch (notifErr) {
        console.error('Notification warning:', notifErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Payout of Rs. ${amountToPay.toLocaleString()} approved and logged to financial ledger.`
      });
    }

    if (action === 'update_settings') {
      const { cash_reward, fee_discount, is_active, max_referrals_per_user } = req.body;

      const { error: setErr } = await supabase
        .from('referral_settings')
        .upsert({
          id: 1,
          cash_reward: Number(cash_reward) || 1000,
          fee_discount: Number(fee_discount) || 1500,
          is_active: Boolean(is_active),
          max_referrals_per_user: Number(max_referrals_per_user) || 0
        });

      if (setErr) {
        return res.status(500).json({ success: false, message: setErr.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Referral program settings updated successfully.'
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action specified' });
  } catch (err) {
    console.error('Admin referral API error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
