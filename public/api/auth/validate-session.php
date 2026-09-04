<?php
require_once __DIR__ . '/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

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
    otp_respond(401, [
        'status' => 'error',
        'code' => 'missing_token',
        'message' => 'Session token is required.'
    ]);
}

// Validate active, unexpired, unrevoked session
$session = portal_require_session([], null, $token);

// Fetch fresh user state from authoritative database records
$freshUser = auth_build_user($session['cnic']);

// Attach session token to user object
$freshUser['sessionToken'] = $token;

otp_respond(200, [
    'status' => 'success',
    'message' => 'Session valid.',
    'user' => $freshUser
]);
?>
