<?php
require_once __DIR__ . '/../auth/_otp_common.php';
otp_bootstrap(['POST']);

// Authorize caller (Super Admin or Staff with permissions.users === 'full')
$auth = portal_authorize_admin_operation('users');

$data = otp_json_input();
$action = strtolower(trim((string)($data['action'] ?? 'sync')));
$cnic = otp_normalize_cnic($data['cnic'] ?? '');

if (!$cnic) {
    otp_respond(400, ['status' => 'error', 'message' => 'A valid 13-digit CNIC is required.']);
}

if ($action === 'revoke') {
    otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($cnic), null, 'return=minimal');
    otp_respond(200, ['status' => 'success', 'message' => 'Staff login access revoked.']);
}

if ($action === 'sync') {
    $name = otp_clean_text($data['name'] ?? '', 150);
    $role = otp_clean_text($data['role'] ?? 'custom', 50);
    $course = otp_clean_text($data['assignedCourse'] ?? $data['course'] ?? '', 255);
    $batch = otp_clean_text($data['batch'] ?? '', 255);

    $row = [
        'cnic' => $cnic,
        'name' => $name,
        'role' => $role,
        'assigned_course' => $course,
        'batch' => $batch,
    ];

    otp_supabase_request('POST', 'allowed_cnics?on_conflict=cnic', [$row], 'resolution=merge-duplicates,return=minimal');
    otp_respond(200, ['status' => 'success', 'message' => 'Staff login access synchronized.']);
}

otp_respond(400, ['status' => 'error', 'message' => 'Invalid action. Supported actions are sync, revoke.']);
?>
