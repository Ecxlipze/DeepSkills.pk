<?php
require_once __DIR__ . '/_otp_common.php';
otp_bootstrap();

$data = otp_json_input();
$cnic = otp_normalize_cnic($data['cnic'] ?? '');

if (!$cnic) {
    otp_respond(400, ['status' => 'error', 'message' => 'Please enter a valid CNIC.']);
}

$allowed = otp_supabase_request('GET', 'allowed_cnics?select=*&cnic=eq.' . rawurlencode($cnic) . '&limit=1');
if (!is_array($allowed) || count($allowed) === 0) {
    otp_respond(403, ['status' => 'error', 'message' => 'Access denied. No account found for this CNIC.']);
}

$roleData = $allowed[0];
$role = $roleData['role'] ?? '';
$profile = null;

if ($role === 'student') {
    $rows = otp_supabase_request('GET', 'admissions?select=id,name,email,status,course,batch,batch_timing,cnic&cnic=eq.' . rawurlencode($cnic) . '&status=in.(Active,Graduated)&order=submitted_at.desc&limit=1');
    $profile = $rows[0] ?? null;
} elseif ($role === 'teacher') {
    $rows = otp_supabase_request('GET', 'teachers?select=id,name,email,status,cnic&cnic=eq.' . rawurlencode($cnic) . '&limit=1');
    $profile = $rows[0] ?? null;
    $teacherStatus = $profile['status'] ?? '';
    if ($profile && !in_array($teacherStatus, ['Active', 'Pending', 'Onboarding'])) {
        otp_respond(403, ['status' => 'error', 'message' => 'Your account is ' . strtolower($teacherStatus ?: 'inactive') . '. Please contact the administrator.']);
    }
} else {
    $rows = otp_supabase_request('GET', 'users?select=id,full_name,email,status,role,cnic&cnic=eq.' . rawurlencode($cnic) . '&limit=1');
    $profile = $rows[0] ?? null;
    if ($profile && strtolower($profile['status'] ?? '') !== 'active') {
        otp_respond(403, ['status' => 'error', 'message' => 'Your account is not active. Please contact the administrator.']);
    }
}

if (!$profile) {
    otp_respond(404, ['status' => 'error', 'message' => 'Account profile not found.']);
}

$email = filter_var($profile['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email) {
    otp_respond(400, ['status' => 'error', 'message' => 'No valid email is attached to this account. Please contact admin.']);
}

$code = (string) random_int(100000, 999999);
$name = $profile['name'] ?? $profile['full_name'] ?? $roleData['name'] ?? 'DeepSkills user';
$now = time();

otp_supabase_request(
    'POST',
    'login_otps',
    [[
        'cnic' => $cnic,
        'email' => $email,
        'role' => $role,
        'otp_hash' => password_hash($code, PASSWORD_DEFAULT),
        'expires_at' => gmdate('c', $now + 600),
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
    ]],
    'return=minimal'
);

$env = otp_load_env_file();
$appEnv = getenv('APP_ENV') ?: (getenv('NODE_ENV') ?: ($env['APP_ENV'] ?? ($env['NODE_ENV'] ?? 'production')));
$isDev = ($appEnv === 'development');

$mailSent = otp_send_mail($email, $name, $code);
if (!$mailSent && !$isDev) {
    otp_respond(500, ['status' => 'error', 'message' => 'Unable to send OTP email. Please try again.']);
}

$masked = preg_replace('/(^.).*(@.*$)/', '$1***$2', $email);
$responsePayload = [
    'status' => 'success',
    'message' => 'OTP sent to your registered email.',
    'email' => $masked,
    'expiresInSeconds' => 600,
];
if ($isDev) {
    $responsePayload['devOtp'] = $code;
}

otp_respond(200, $responsePayload);
?>
