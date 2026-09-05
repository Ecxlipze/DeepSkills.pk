<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['POST']);

$auth = portal_authorize_admin_operation('finance');

$data = otp_json_input();
if (!is_array($data)) {
    otp_respond(400, ['status' => 'error', 'message' => 'Invalid JSON payload.']);
}

$teacherId = trim((string)($data['teacherId'] ?? $data['teacher_id'] ?? ''));
$rawAmount = $data['amount'] ?? 0;
$month = trim((string)($data['month'] ?? ''));
$paidDate = trim((string)($data['paidDate'] ?? $data['paid_on'] ?? ''));
$rawMethod = strtolower(trim((string)($data['method'] ?? 'cash')));
$rawMethod = str_replace(' ', '_', $rawMethod);
$reference = !empty($data['reference']) ? trim((string)$data['reference']) : null;
$notes = !empty($data['notes']) ? trim((string)$data['notes']) : null;

// 1. Validate Teacher UUID
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $teacherId)) {
    otp_respond(400, ['status' => 'error', 'message' => 'Valid Teacher ID is required.']);
}

$teacherResult = otp_supabase_request('GET', 'teachers?select=id,name&id=eq.' . rawurlencode($teacherId) . '&limit=1');
$teacher = auth_first($teacherResult);
if (!$teacher) {
    otp_respond(404, ['status' => 'error', 'message' => 'Teacher not found.']);
}

// 2. Validate Amount
if (!is_numeric($rawAmount) || (float)$rawAmount <= 0) {
    otp_respond(400, ['status' => 'error', 'message' => 'Payment amount must be greater than 0.']);
}
$amount = (float)$rawAmount;

// 3. Validate Month (YYYY-MM)
if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
    otp_respond(400, ['status' => 'error', 'message' => 'Invalid month format. Expected YYYY-MM.']);
}

// 4. Validate Paid Date (YYYY-MM-DD)
if (empty($paidDate)) {
    $paidDate = date('Y-m-d');
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $paidDate)) {
    otp_respond(400, ['status' => 'error', 'message' => 'Invalid payment date format. Expected YYYY-MM-DD.']);
}

// 5. Normalize Method
$methodMap = [
    'cash' => 'cash',
    'bank_transfer' => 'bank_transfer',
    'online' => 'online',
    'cheque' => 'cheque',
    'check' => 'cheque'
];
$cleanMethod = $methodMap[$rawMethod] ?? 'cash';

// 6. Enforce Duplicate Protection with Concurrency Lock
$lockFile = sys_get_temp_dir() . '/salary_' . md5($teacherId . '_' . $month) . '.lock';
$lockFp = fopen($lockFile, 'c+');
if ($lockFp) {
    flock($lockFp, LOCK_EX);
}

try {
    $existingCheck = otp_supabase_request('GET', 'teacher_payments?select=id&teacher_id=eq.' . rawurlencode($teacherId) . '&month=eq.' . rawurlencode($month) . '&limit=1', null, '', true);
    $existing = auth_first($existingCheck);
    if ($existing) {
        if ($lockFp) {
            flock($lockFp, LOCK_UN);
            fclose($lockFp);
            $lockFp = null;
        }
        otp_respond(409, [
            'status' => 'error',
            'message' => 'Salary for this teacher and month has already been recorded.'
        ]);
    }

    // 7. Insert Record into teacher_payments
    $payload = [
        'teacher_id' => $teacherId,
        'amount' => $amount,
        'month' => $month,
        'paid_on' => $paidDate,
        'method' => $cleanMethod,
        'reference' => $reference,
        'notes' => $notes,
        'status' => 'Paid'
    ];

    try {
        $insertResult = otp_supabase_request('POST', 'teacher_payments', $payload, 'return=representation', true);
    } catch (Exception $e) {
        $errCode = (int)$e->getCode();
        $errMsg = strtolower($e->getMessage());
        if (
            $errCode === 409 ||
            strpos($errMsg, '23505') !== false ||
            strpos($errMsg, 'duplicate') !== false ||
            strpos($errMsg, 'unique') !== false
        ) {
            if ($lockFp) {
                flock($lockFp, LOCK_UN);
                fclose($lockFp);
                $lockFp = null;
            }
            otp_respond(409, [
                'status' => 'error',
                'message' => 'Salary for this teacher and month has already been recorded.'
            ]);
        }
        if ($lockFp) {
            flock($lockFp, LOCK_UN);
            fclose($lockFp);
            $lockFp = null;
        }
        otp_respond(500, ['status' => 'error', 'message' => 'Failed to record salary payment.']);
    }

    if ($lockFp) {
        flock($lockFp, LOCK_UN);
        fclose($lockFp);
        $lockFp = null;
    }

    $record = is_array($insertResult) ? ($insertResult[0] ?? $insertResult) : $payload;

    otp_respond(200, [
        'status' => 'success',
        'message' => 'Salary paid successfully for ' . ($teacher['name'] ?? 'teacher') . '!',
        'data' => $record
    ]);
} catch (Exception $outerErr) {
    if ($lockFp) {
        flock($lockFp, LOCK_UN);
        fclose($lockFp);
    }
    otp_respond(500, ['status' => 'error', 'message' => 'Failed to process salary payment.']);
}
?>
