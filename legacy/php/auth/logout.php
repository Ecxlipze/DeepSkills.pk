<?php
require_once __DIR__ . '/_otp_common.php';
otp_bootstrap(['POST']);

$token = otp_get_bearer_token();
if (!$token) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (is_array($input) && !empty($input['sessionToken'])) {
        $token = trim((string)$input['sessionToken']);
    } elseif (is_array($input) && !empty($input['token'])) {
        $token = trim((string)$input['token']);
    }
}

if (!$token) {
    otp_respond(200, [
        'status' => 'success',
        'message' => 'No active session token provided.'
    ]);
}

try {
    $session = portal_require_session([], null, $token);
    $now = gmdate('c');

    if (($session['table'] ?? '') === 'portal_sessions') {
        otp_supabase_request('PATCH', 'portal_sessions?id=eq.' . rawurlencode($session['id']), [
            'revoked_at' => $now,
            'revoked_reason' => 'logout',
        ], 'return=minimal');
    } else {
        // Fallback row in login_otps
        otp_supabase_request('PATCH', 'login_otps?id=eq.' . rawurlencode($session['id']), [
            'token_expires_at' => $now,
        ], 'return=minimal');
    }

    // Log logout event
    otp_supabase_request(
        'POST',
        'activity_logs',
        [[
            'user_id' => in_array($session['role'], ['student', 'teacher'], true) ? null : ($session['actor_id'] ?? null),
            'user_name' => $session['cnic'],
            'user_role' => $session['role'],
            'event_type' => 'logout',
            'event_description' => 'Logged out',
            'created_at' => $now,
        ]],
        'return=minimal'
    );
} catch (Exception $e) {
    // Even if logging out an already expired session fails, succeed gracefully
}

otp_respond(200, [
    'status' => 'success',
    'message' => 'Logged out successfully.'
]);
?>
