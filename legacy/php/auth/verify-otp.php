<?php
require_once __DIR__ . '/_otp_common.php';
otp_bootstrap();

$data = otp_json_input();
$cnic = otp_normalize_cnic($data['cnic'] ?? '');
$otp = preg_replace('/\D+/', '', (string)($data['otp'] ?? ''));

if (!$cnic || strlen($otp) !== 6) {
    otp_respond(400, ['status' => 'error', 'message' => 'Please enter a valid OTP.']);
}

$now = gmdate('c');
$rows = otp_supabase_request(
    'GET',
    'login_otps?select=*&cnic=eq.' . rawurlencode($cnic) . '&consumed_at=is.null&expires_at=gt.' . rawurlencode($now) . '&order=created_at.desc&limit=1'
);

$row = is_array($rows) ? ($rows[0] ?? null) : null;
if (!$row) {
    otp_respond(400, ['status' => 'error', 'message' => 'OTP expired. Please request a new code.']);
}

if ((int)($row['attempts'] ?? 0) >= 5) {
    otp_respond(429, ['status' => 'error', 'message' => 'Too many OTP attempts. Please request a new code.']);
}

if (!password_verify($otp, $row['otp_hash'] ?? '')) {
    otp_supabase_request(
        'PATCH',
        'login_otps?id=eq.' . rawurlencode($row['id']),
        ['attempts' => ((int)($row['attempts'] ?? 0)) + 1],
        'return=minimal'
    );
    otp_respond(400, ['status' => 'error', 'message' => 'Invalid OTP. Please try again.']);
}

$token = bin2hex(random_bytes(32));
otp_supabase_request(
    'PATCH',
    'login_otps?id=eq.' . rawurlencode($row['id']),
    [
        'consumed_at' => $now,
        'token_hash' => password_hash($token, PASSWORD_DEFAULT),
        'token_expires_at' => gmdate('c', time() + 120),
    ],
    'return=minimal'
);

otp_respond(200, [
    'status' => 'success',
    'message' => 'OTP verified.',
    'verificationToken' => $token,
]);
?>
