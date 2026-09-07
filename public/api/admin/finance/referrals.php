<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $financePerm = $permissions['finance'] ?? ($permissions['referral'] ?? 'none');
    if ($financePerm !== 'view' && $financePerm !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions to view or manage referral payouts.'
        ]);
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// -------------------------------------------------------------
// GET: Retrieve hydrated referrals, settings & summary metrics
// -------------------------------------------------------------
if ($method === 'GET') {
    // 1. Settings
    $settingsRes = otp_supabase_request('GET', 'referral_settings?id=eq.1&select=*');
    $settings = [
        'id' => 1,
        'cash_reward' => 1000,
        'fee_discount' => 1500,
        'is_active' => true,
        'max_referrals_per_user' => 0
    ];
    if (is_array($settingsRes) && !empty($settingsRes)) {
        $settings = array_merge($settings, $settingsRes[0]);
    }

    // 2. Fetch referrals
    $rawRefs = otp_supabase_request('GET', 'referrals?select=*&order=referred_at.desc');
    if (!is_array($rawRefs)) {
        $rawRefs = [];
    }

    // 3. Collect Referrer and Referred IDs
    $studentIds = [];
    $teacherIds = [];
    $referredIds = [];

    foreach ($rawRefs as $r) {
        if (!empty($r['referrer_id'])) {
            if (($r['referrer_role'] ?? '') === 'teacher') {
                $teacherIds[$r['referrer_id']] = true;
            } else {
                $studentIds[$r['referrer_id']] = true;
            }
        }
        if (!empty($r['referred_id'])) {
            $referredIds[$r['referred_id']] = true;
        }
    }

    // Hydrate Student Referrers
    $studentMap = [];
    if (!empty($studentIds)) {
        $idList = implode(',', array_keys($studentIds));
        $res = otp_supabase_request('GET', 'admissions?select=id,name,course,batch,cnic,phone,email&id=in.(' . $idList . ')');
        if (is_array($res)) {
            foreach ($res as $s) {
                $studentMap[$s['id']] = $s;
            }
        }
    }

    // Hydrate Teacher Referrers
    $teacherMap = [];
    if (!empty($teacherIds)) {
        $idList = implode(',', array_keys($teacherIds));
        $res = otp_supabase_request('GET', 'teachers?select=id,name,specialization,cnic,phone,email&id=in.(' . $idList . ')');
        if (is_array($res)) {
            foreach ($res as $t) {
                $teacherMap[$t['id']] = $t;
            }
        }
    }

    // Hydrate Referred Students (for course/batch)
    $referredMap = [];
    if (!empty($referredIds)) {
        $idList = implode(',', array_keys($referredIds));
        $res = otp_supabase_request('GET', 'admissions?select=id,name,course,batch,cnic,phone,email,status&id=in.(' . $idList . ')');
        if (is_array($res)) {
            foreach ($res as $a) {
                $referredMap[$a['id']] = $a;
            }
        }
    }

    $hydrated = [];
    foreach ($rawRefs as $r) {
        $isTeacher = ($r['referrer_role'] ?? '') === 'teacher';
        $refId = $r['referrer_id'] ?? '';
        $referrerMeta = $isTeacher ? ($teacherMap[$refId] ?? null) : ($studentMap[$refId] ?? null);
        $referredId = $r['referred_id'] ?? '';
        $referredMeta = !empty($referredId) ? ($referredMap[$referredId] ?? null) : null;

        $hydrated[] = [
            'id' => $r['id'] ?? '',
            'referrer_id' => $refId,
            'referrer_role' => $r['referrer_role'] ?? ($referrerMeta['specialization'] ?? null ? 'teacher' : 'student'),
            'referrer_name' => $referrerMeta['name'] ?? ($isTeacher ? 'Faculty Member' : 'Student Referrer'),
            'referrer_cnic' => $referrerMeta['cnic'] ?? null,
            'referrer_phone' => $referrerMeta['phone'] ?? null,
            'referrer_email' => $referrerMeta['email'] ?? null,
            'referrer_program' => $referrerMeta['course'] ?? ($referrerMeta['specialization'] ?? null),
            'referrer_batch' => $referrerMeta['batch'] ?? null,

            'referred_id' => $referredId,
            'referred_name' => $r['referred_name'] ?? ($referredMeta['name'] ?? 'Prospective Student'),
            'referred_phone' => $r['referred_phone'] ?? ($referredMeta['phone'] ?? null),
            'referred_email' => $r['referred_email'] ?? ($referredMeta['email'] ?? null),
            'referred_course' => $referredMeta['course'] ?? null,
            'referred_batch' => $referredMeta['batch'] ?? null,
            'referred_status' => $referredMeta['status'] ?? ($r['status'] ?? 'registered'),

            'referred_at' => $r['referred_at'] ?? null,
            'status' => $r['status'] ?? 'registered',
            'reward_type' => $r['reward_type'] ?? 'cash',
            'reward_amount' => (int)($r['reward_amount'] ?? (($r['reward_type'] ?? 'cash') === 'fee_discount' ? $settings['fee_discount'] : $settings['cash_reward'])),
            'payout_status' => $r['payout_status'] ?? 'not_earned',
            'payout_approved_at' => $r['payout_approved_at'] ?? null,
            'payout_method' => $r['payout_method'] ?? 'bank_transfer',
            'payout_reference' => $r['payout_reference'] ?? null,
            'payout_notes' => $r['payout_notes'] ?? null,
            'approved_by' => $r['approved_by'] ?? null
        ];
    }

    $total = count($hydrated);
    $enrolled = 0;
    $pendingPayouts = 0;
    $pendingAmount = 0;
    $totalPaid = 0;

    foreach ($hydrated as $h) {
        if ($h['status'] === 'enrolled' || $h['status'] === 'approved') {
            $enrolled++;
        }
        if ($h['payout_status'] === 'pending') {
            $pendingPayouts++;
            $pendingAmount += $h['reward_amount'];
        } elseif ($h['payout_status'] === 'paid') {
            $totalPaid += $h['reward_amount'];
        }
    }

    otp_respond(200, [
        'success' => true,
        'referrals' => $hydrated,
        'settings' => $settings,
        'summary' => [
            'total' => $total,
            'enrolled' => $enrolled,
            'pendingPayouts' => $pendingPayouts,
            'pendingAmount' => $pendingAmount,
            'totalPaid' => $totalPaid,
            'conversionRate' => $total > 0 ? (int)round(($enrolled / $total) * 100) : 0
        ]
    ]);
}

// -------------------------------------------------------------
// POST: Approve Payout or Update Settings
// -------------------------------------------------------------
$body = otp_get_json_input();
$action = $body['action'] ?? '';

if ($action === 'approve_payout') {
    $refId = $body['referral_id'] ?? '';
    if (empty($refId)) {
        otp_respond(400, ['success' => false, 'message' => 'Missing referral_id']);
    }

    $raw = otp_supabase_request('GET', 'referrals?id=eq.' . $refId . '&select=*');
    if (!is_array($raw) || empty($raw)) {
        otp_respond(404, ['success' => false, 'message' => 'Referral record not found']);
    }
    $refRow = $raw[0];

    $amountToPay = !empty($body['reward_amount']) ? (int)$body['reward_amount'] : 1000;
    $nowIso = date('c');
    $today = date('Y-m-d');
    $payoutMethod = $body['payout_method'] ?? 'bank_transfer';
    $payoutRef = $body['payout_reference'] ?? ('REF-' . substr((string)time(), -6));
    $payoutNotes = $body['payout_notes'] ?? '';

    // Update referrals
    otp_supabase_request('PATCH', 'referrals?id=eq.' . $refId, [
        'payout_status' => 'paid',
        'reward_type' => $body['reward_type'] ?? 'cash',
        'reward_amount' => $amountToPay,
        'payout_method' => $payoutMethod,
        'payout_reference' => $payoutRef,
        'payout_notes' => $payoutNotes,
        'payout_approved_at' => $nowIso,
        'approved_by' => $auth['user_id'] ?? null
    ]);

    // Record cash outflow in payments
    otp_supabase_request('POST', 'payments', [
        'entity_id' => $refRow['referrer_id'] ?? null,
        'entity_type' => 'referrer',
        'amount' => $amountToPay,
        'paid_date' => $today,
        'method' => $payoutMethod,
        'reference_number' => $payoutRef,
        'description' => 'Referral Reward - Referred ' . ($refRow['referred_name'] ?? 'Student'),
        'notes' => $payoutNotes ?: 'Referral reward payout approved by Admin',
        'status' => 'paid'
    ]);

    otp_respond(200, [
        'success' => true,
        'message' => 'Payout approved and logged to financial ledger.'
    ]);
}

if ($action === 'update_settings') {
    otp_supabase_request('POST', 'referral_settings', [
        'id' => 1,
        'cash_reward' => (int)($body['cash_reward'] ?? 1000),
        'fee_discount' => (int)($body['fee_discount'] ?? 1500),
        'is_active' => !empty($body['is_active']),
        'max_referrals_per_user' => (int)($body['max_referrals_per_user'] ?? 0)
    ], [
        'Prefer: resolution=merge-duplicates'
    ]);

    otp_respond(200, [
        'success' => true,
        'message' => 'Referral program settings updated successfully.'
    ]);
}

otp_respond(400, ['success' => false, 'message' => 'Invalid action specified']);
