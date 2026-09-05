<?php
/**
 * Test Enrollment Endpoint Safety and RPC Parity
 */

require_once __DIR__ . '/../public/api/auth/_otp_common.php';

$port = 8995;
$baseUrl = "http://127.0.0.1:{$port}";

$cmd = sprintf('php -S 127.0.0.1:%d -t %s > /dev/null 2>&1 & echo $!', $port, escapeshellarg(__DIR__ . '/../public'));
$serverPid = (int) shell_exec($cmd);
usleep(600000);

register_shutdown_function(function() use ($serverPid) {
    if ($serverPid > 0) {
        shell_exec("kill {$serverPid} 2>/dev/null");
    }
});

echo "=========================================================\n";
echo "=== ENROLLMENT ENDPOINT & RPC LIVE VERIFICATION ========\n";
echo "=========================================================\n";

$passCount = 0;
$failCount = 0;

function assertTest($name, $condition, $details = '') {
    global $passCount, $failCount;
    if ($condition) {
        $passCount++;
        echo "  [PASS] {$name}\n";
    } else {
        $failCount++;
        echo "  [FAIL] {$name}" . ($details ? " -> {$details}" : "") . "\n";
    }
}

function httpCall($url, $method = 'POST', $data = [], $token = null) {
    $ch = curl_init($url);
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($data !== null && $method !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $body = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    return [
        'code' => $httpCode,
        'body' => json_decode($body, true),
        'raw' => $body
    ];
}

// 1. Setup Admin session
$adminCnic = '35202-0000000-0';
$adminSession = portal_create_session($adminCnic, 'admin', null, 'user');
$adminToken = $adminSession['fullSessionToken'];
assertTest("Admin token created", !empty($adminToken));

// 2. Test Safe Rejection on Existing Paid Student (Rohan Shah)
echo "\n--- 1. Testing Existing Paid Student Schedule Protection ---\n";
$paidStudentCnic = '11111-1111111-1';
$paidStudentId = '75df2d73-707b-4707-9a09-82afb9cac9d5';

$resPaid = httpCall("{$baseUrl}/api/admin/enroll-counsellor-student.php", 'POST', [
    'payload' => [
        'admissionId' => $paidStudentId,
        'cnic' => $paidStudentCnic,
        'name' => 'Rohan Shah',
        'course' => 'Full Stack React JS',
        'batchName' => 'Full Stack React JS - Morning Batch',
        'totalFee' => 30000,
        'discountAmount' => 0,
        'finalFee' => 30000,
        'paymentPlan' => 'full',
        'installmentCount' => 1,
        'firstPayment' => 30000,
        'firstPaymentMethod' => 'cash'
    ]
], $adminToken);

assertTest("Enrollment endpoint safely rejects student with existing paid history", $resPaid['code'] === 400);
assertTest("Error message cites existing paid payment records", str_contains($resPaid['body']['message'] ?? '', 'paid payment records'), $resPaid['body']['message'] ?? '');

// Verify payment record in DB is completely untouched
$paidRow = auth_first(otp_supabase_request('GET', 'payments?entity_id=eq.' . rawurlencode($paidStudentId) . '&status=eq.paid'));
assertTest("Database confirmation: Paid voucher is intact with status 'paid'", !empty($paidRow) && $paidRow['status'] === 'paid');

// 3. Test Invalid Enrollment Atomicity (No partial records inserted)
echo "\n--- 2. Testing Invalid Enrollment Atomicity ---\n";
$fakeCnic = '99999-0000000-9';
otp_supabase_request('DELETE', 'admissions?cnic=eq.' . rawurlencode($fakeCnic));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($fakeCnic));

$resInvalid = httpCall("{$baseUrl}/api/admin/enroll-counsellor-student.php", 'POST', [
    'payload' => [
        'cnic' => $fakeCnic,
        'name' => 'Invalid Test Candidate',
        'course' => 'Full Stack React JS',
        'batchName' => 'NonExistentBatch999',
        'totalFee' => 30000
    ]
], $adminToken);

assertTest("Invalid enrollment with nonexistent batch returns HTTP 400", $resInvalid['code'] === 400);
$checkAdm = auth_first(otp_supabase_request('GET', 'admissions?cnic=eq.' . rawurlencode($fakeCnic)));
assertTest("Atomicity check: No admission row was created", empty($checkAdm));
$checkAllowed = auth_first(otp_supabase_request('GET', 'allowed_cnics?cnic=eq.' . rawurlencode($fakeCnic)));
assertTest("Atomicity check: No allowed_cnics row was created", empty($checkAllowed));

// 4. Test Successful Enrollment with Balanced Zero-Rupee Installments
echo "\n--- 3. Testing Successful Enrollment & Balanced Installments ---\n";
$newCnic = '35201-4444444-4';
$newEmail = 'test_enroll_atomic@deepskills.pk';
$course = 'Full Stack React JS';
$batchName = 'Full Stack React JS - Morning Batch';

// Clean up prior test data
otp_supabase_request('DELETE', 'admissions?cnic=eq.' . rawurlencode($newCnic));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($newCnic));

$totalFee = 25000;
$discount = 2000;
$finalFee = 23000; // 23,000 across 3 installments: first 5000, remainder 18,000 / 2 = 9000 each
$firstPayment = 5000;

$resSuccess = httpCall("{$baseUrl}/api/admin/enroll-counsellor-student.php", 'POST', [
    'payload' => [
        'cnic' => $newCnic,
        'name' => 'Atomic Test Student',
        'email' => $newEmail,
        'course' => $course,
        'batchName' => $batchName,
        'totalFee' => $totalFee,
        'discountAmount' => $discount,
        'finalFee' => $finalFee,
        'paymentPlan' => 'installment',
        'installmentCount' => 3,
        'firstPayment' => $firstPayment,
        'firstPaymentMethod' => 'cash',
        'enrolledBy' => 'admin'
    ]
], $adminToken);

assertTest("Valid enrollment returns HTTP 200", $resSuccess['code'] === 200, json_encode($resSuccess['body']));
$newAdmissionId = $resSuccess['body']['admission']['id'] ?? null;
assertTest("Admission ID returned in response", !empty($newAdmissionId));

// Check generated payments schedule in DB
$payments = otp_supabase_request('GET', 'payments?entity_id=eq.' . rawurlencode($newAdmissionId) . '&order=installment_number.asc');
assertTest("Exactly 3 payments generated in schedule", count($payments) === 3);

$sumAmount = 0;
foreach ($payments as $p) {
    $sumAmount += (int)$p['amount'];
}
assertTest("Balanced Installment Guarantee: Sum of payments ({$sumAmount}) strictly equals final_fee ({$finalFee})", $sumAmount === $finalFee);
assertTest("First payment is marked 'paid'", ($payments[0]['status'] ?? '') === 'paid' && (int)$payments[0]['amount'] === 5000);
assertTest("Remaining installments are marked 'pending'", ($payments[1]['status'] ?? '') === 'pending' && ($payments[2]['status'] ?? '') === 'pending');

// Check allowed_cnics entry
$allowed = auth_first(otp_supabase_request('GET', 'allowed_cnics?cnic=eq.' . rawurlencode($newCnic)));
assertTest("Student is registered in allowed_cnics with role 'student'", !empty($allowed) && $allowed['role'] === 'student');

// Check fee_plan entry
$feePlan = auth_first(otp_supabase_request('GET', 'fee_plans?student_id=eq.' . rawurlencode($newAdmissionId)));
assertTest("Fee plan created with final_fee = {$finalFee}", !empty($feePlan) && (int)$feePlan['final_fee'] === $finalFee);

// 5. Teardown Test Data
echo "\n--- 4. Teardown Test Enrollment Records ---\n";
otp_supabase_request('DELETE', 'payments?entity_id=eq.' . rawurlencode($newAdmissionId));
otp_supabase_request('DELETE', 'fee_plans?student_id=eq.' . rawurlencode($newAdmissionId));
otp_supabase_request('DELETE', 'admissions?id=eq.' . rawurlencode($newAdmissionId));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($newCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($adminCnic));

$verifyClean = auth_first(otp_supabase_request('GET', 'admissions?cnic=eq.' . rawurlencode($newCnic)));
assertTest("Test student records cleaned from database", empty($verifyClean));

echo "\n=========================================================\n";
echo "SUMMARY: {$passCount} Passed, {$failCount} Failed\n";
echo "=========================================================\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
