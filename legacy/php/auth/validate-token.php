<?php
require_once __DIR__ . '/_otp_common.php';
otp_bootstrap(['POST']);

$data = otp_json_input();
$cnic = otp_normalize_cnic($data['cnic'] ?? '');
$token = otp_clean_text($data['verificationToken'] ?? '', 200);

if (!$cnic || !$token) {
    otp_respond(400, ['status' => 'error', 'message' => 'OTP verification is required.']);
}

$now = gmdate('c');
$rows = otp_supabase_request(
    'GET',
    'login_otps?select=*&cnic=eq.' . rawurlencode($cnic) . '&token_used_at=is.null&token_expires_at=gt.' . rawurlencode($now) . '&order=consumed_at.desc&limit=1'
);

$row = is_array($rows) ? ($rows[0] ?? null) : null;
if (!$row || !password_verify($token, $row['token_hash'] ?? '')) {
    otp_respond(401, ['status' => 'error', 'message' => 'OTP verification expired. Please request a new code.']);
}

// Mark OTP token as consumed
otp_supabase_request(
    'PATCH',
    'login_otps?id=eq.' . rawurlencode($row['id']),
    [
        'token_used_at' => $now,
    ],
    'return=minimal'
);

// Resolve authoritative user identity
$user = auth_build_user($cnic);
$role = $user['role'] ?? 'user';
$actorType = $role === 'student' ? 'student' : ($role === 'teacher' ? 'teacher' : 'user');
$actorId = $user['id'] ?? null;

// Create proper revocable portal session
$session = portal_create_session($cnic, $role, $actorId, $actorType);
$fullSessionToken = $session['fullSessionToken'];
$user['sessionToken'] = $fullSessionToken;

// Update last login in users table if staff
if (!in_array($role, ['student', 'teacher'], true)) {
    otp_supabase_request(
        'PATCH',
        'users?cnic=eq.' . rawurlencode($cnic),
        ['last_login' => $now, 'updated_at' => $now],
        'return=minimal'
    );
}

// Log login event
otp_supabase_request(
    'POST',
    'activity_logs',
    [[
        'user_id' => in_array($role, ['student', 'teacher'], true) ? null : ($user['id'] ?? null),
        'user_name' => $user['name'] ?? $cnic,
        'user_role' => $role,
        'event_type' => 'login',
        'event_description' => 'Logged in via CNIC OTP',
        'created_at' => $now,
    ]],
    'return=minimal'
);

otp_respond(200, [
    'status' => 'success',
    'message' => 'Login verified.',
    'user' => $user,
    'sessionToken' => $fullSessionToken
]);
?>
