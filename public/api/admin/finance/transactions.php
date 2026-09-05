<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $financePerm = $permissions['finance'] ?? 'none';
    if ($financePerm !== 'view' && $financePerm !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions to view finance transactions.'
        ]);
    }
}

// 1. Fetch Student Payments
$feePayments = otp_supabase_request('GET', 'payments?select=id,amount,status,paid_date,method,reference_number,description,entity_id&status=eq.paid&order=paid_date.desc');
if (!is_array($feePayments)) {
    $feePayments = [];
}

$studentIds = [];
foreach ($feePayments as $p) {
    if (!empty($p['entity_id'])) {
        $studentIds[$p['entity_id']] = true;
    }
}

$studentMap = [];
if (!empty($studentIds)) {
    $idList = implode(',', array_keys($studentIds));
    $students = otp_supabase_request('GET', 'admissions?select=id,name&id=in.(' . $idList . ')');
    if (is_array($students)) {
        foreach ($students as $s) {
            $studentMap[$s['id']] = $s['name'] ?? '';
        }
    }
}

// 2. Fetch Teacher Payments
$salaryPayments = otp_supabase_request('GET', 'teacher_payments?select=id,teacher_id,amount,month,paid_on,method,reference,status&order=paid_on.desc');
if (!is_array($salaryPayments)) {
    $salaryPayments = [];
}

$teacherIds = [];
foreach ($salaryPayments as $tp) {
    if (!empty($tp['teacher_id'])) {
        $teacherIds[$tp['teacher_id']] = true;
    }
}

$teacherMap = [];
if (!empty($teacherIds)) {
    $tIdList = implode(',', array_keys($teacherIds));
    $teachers = otp_supabase_request('GET', 'teachers?select=id,name&id=in.(' . $tIdList . ')');
    if (is_array($teachers)) {
        foreach ($teachers as $t) {
            $teacherMap[$t['id']] = $t['name'] ?? '';
        }
    }
}

// 3. Normalize into unified timeline
$studentRows = [];
foreach ($feePayments as $p) {
    $name = $studentMap[$p['entity_id'] ?? ''] ?? '';
    $studentRows[] = [
        'id' => $p['id'] ?? '',
        'paid_date' => $p['paid_date'] ?? '',
        'entity_type' => 'student',
        'entity_id' => $p['entity_id'] ?? '',
        'person_name' => $name,
        'teacher_name' => '',
        'description' => $p['description'] ?? (!empty($name) ? "Fee Payment - {$name}" : 'Student Fee Payment'),
        'method' => $p['method'] ?? 'cash',
        'amount' => (float)($p['amount'] ?? 0),
        'reference_number' => $p['reference_number'] ?? '—',
        'status' => $p['status'] ?? 'paid'
    ];
}

$salaryRows = [];
foreach ($salaryPayments as $tp) {
    if (strtolower($tp['status'] ?? '') !== 'paid') {
        continue;
    }
    $tName = $teacherMap[$tp['teacher_id'] ?? ''] ?? 'Faculty';
    $month = $tp['month'] ?? '';
    $salaryRows[] = [
        'id' => $tp['id'] ?? '',
        'paid_date' => $tp['paid_on'] ?? '',
        'entity_type' => 'teacher',
        'entity_id' => $tp['teacher_id'] ?? '',
        'person_name' => $tName,
        'teacher_name' => $tName,
        'description' => "Salary - {$tName} ({$month})",
        'method' => $tp['method'] ?? 'bank_transfer',
        'amount' => (float)($tp['amount'] ?? 0),
        'reference_number' => $tp['reference'] ?? '—',
        'status' => $tp['status'] ?? 'Paid'
    ];
}

$allTransactions = array_merge($studentRows, $salaryRows);
usort($allTransactions, function($a, $b) {
    return strcmp($b['paid_date'] ?? '', $a['paid_date'] ?? '');
});

$totalIn = 0;
foreach ($studentRows as $p) {
    $totalIn += $p['amount'];
}
$totalOut = 0;
foreach ($salaryRows as $p) {
    $totalOut += $p['amount'];
}
$net = $totalIn - $totalOut;

otp_respond(200, [
    'status' => 'success',
    'data' => [
        'transactions' => $allTransactions,
        'summary' => [
            'totalIn' => $totalIn,
            'totalOut' => $totalOut,
            'net' => $net
        ]
    ]
]);
?>
