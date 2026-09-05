<?php
require_once __DIR__ . '/../auth/_otp_common.php';
otp_bootstrap(['POST']);

$auth = portal_authorize_admin_operation(['students', 'counsellor']);

$data = otp_json_input();
if (!is_array($data) || !is_array($data['payload'] ?? null)) {
    otp_respond(400, ['status' => 'error', 'message' => 'Enrollment payload is required.']);
}

$payload = $data['payload'];

// Normalize payment plan to 'full' or 'installment'
$rawPlan = strtolower(trim((string)($payload['paymentPlan'] ?? '')));
if ($rawPlan === 'full' || $rawPlan === 'one-time' || $rawPlan === '1') {
    $payload['paymentPlan'] = 'full';
    $payload['installmentCount'] = 1;
} else {
    $payload['paymentPlan'] = 'installment';
    $count = !empty($payload['installmentCount']) ? (int)$payload['installmentCount'] : (is_numeric($rawPlan) && (int)$rawPlan > 1 ? (int)$rawPlan : 1);
    $payload['installmentCount'] = max(1, $count);
}

// Normalize payment method to lowercase snake_case
if (!empty($payload['firstPaymentMethod'])) {
    $methodMap = [
        'cash' => 'cash',
        'bank transfer' => 'bank_transfer',
        'bank_transfer' => 'bank_transfer',
        'online' => 'online',
        'cheque' => 'cheque',
        'check' => 'cheque',
    ];
    $cleanMethod = strtolower(trim((string)$payload['firstPaymentMethod']));
    $payload['firstPaymentMethod'] = $methodMap[$cleanMethod] ?? str_replace(' ', '_', $cleanMethod);
} else {
    $payload['firstPaymentMethod'] = 'cash';
}

// Validate and sanitize numeric fees to strictly prevent negative numbers
$totalFee = max(0, (int)($payload['totalFee'] ?? 0));
$discountAmount = max(0, (int)($payload['discountAmount'] ?? 0));
if ($totalFee <= 0) {
    otp_respond(400, ['status' => 'error', 'message' => 'Total fee must be greater than 0.']);
}
if ($discountAmount > $totalFee) {
    otp_respond(400, ['status' => 'error', 'message' => 'Discount cannot exceed total fee.']);
}
$finalFee = max(0, $totalFee - $discountAmount);
$firstPayment = max(0, (int)($payload['firstPayment'] ?? 0));
if ($firstPayment > $finalFee) {
    otp_respond(400, ['status' => 'error', 'message' => 'First payment cannot exceed final fee.']);
}
$payload['totalFee'] = $totalFee;
$payload['discountAmount'] = $discountAmount;
$payload['finalFee'] = $finalFee;
$payload['firstPayment'] = $firstPayment;

$result = otp_supabase_request('POST', 'rpc/enroll_counsellor_student', ['payload' => $payload]);

if (is_array($result) && isset($result['ok']) && $result['ok'] === false) {
    otp_respond(400, ['status' => 'error', 'message' => $result['message'] ?? 'Enrollment failed.']);
}

otp_respond(200, $result ?: ['ok' => true]);
?>
