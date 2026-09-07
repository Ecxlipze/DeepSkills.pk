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
$feePayments = otp_supabase_request('GET', 'payments?select=*&status=eq.paid&order=paid_date.desc');
if (!is_array($feePayments)) {
    $feePayments = [];
}

// 2. Fetch Teacher Salary Payments
$salaryPayments = otp_supabase_request('GET', 'teacher_payments?select=*&order=paid_on.desc');
if (!is_array($salaryPayments)) {
    $salaryPayments = [];
}

$studentRowsRaw = [];
$legacyTeacherPayments = [];
$referralPaymentsRaw = [];

foreach ($feePayments as $p) {
    $entityType = $p['entity_type'] ?? '';
    $desc = $p['description'] ?? '';
    $isReferral = ($entityType === 'referrer') || (strpos($desc, 'Referral Reward') === 0);

    if ($isReferral) {
        $referralPaymentsRaw[] = $p;
    } elseif ($entityType === 'teacher') {
        $legacyTeacherPayments[] = $p;
    } else {
        $studentRowsRaw[] = $p;
    }
}

// Hydrate Students
$studentIds = [];
foreach ($studentRowsRaw as $p) {
    if (!empty($p['entity_id'])) {
        $studentIds[$p['entity_id']] = true;
    }
}
foreach ($referralPaymentsRaw as $rp) {
    if (!empty($rp['entity_id'])) {
        $studentIds[$rp['entity_id']] = true;
    }
}

$studentMap = [];
if (!empty($studentIds)) {
    $idList = implode(',', array_keys($studentIds));
    $students = otp_supabase_request('GET', 'admissions?select=id,name,course,batch,cnic,phone&id=in.(' . $idList . ')');
    if (is_array($students)) {
        foreach ($students as $s) {
            $studentMap[$s['id']] = $s;
        }
    }
}

// Hydrate Teachers
$teacherIds = [];
foreach ($salaryPayments as $tp) {
    if (!empty($tp['teacher_id'])) {
        $teacherIds[$tp['teacher_id']] = true;
    }
}
foreach ($legacyTeacherPayments as $lp) {
    if (!empty($lp['entity_id'])) {
        $teacherIds[$lp['entity_id']] = true;
    }
}
foreach ($referralPaymentsRaw as $rp) {
    if (!empty($rp['entity_id'])) {
        $teacherIds[$rp['entity_id']] = true;
    }
}

$teacherMap = [];
if (!empty($teacherIds)) {
    $tIdList = implode(',', array_keys($teacherIds));
    $teachers = otp_supabase_request('GET', 'teachers?select=id,name,specialization,cnic,phone,email&id=in.(' . $tIdList . ')');
    if (is_array($teachers)) {
        foreach ($teachers as $t) {
            $teacherMap[$t['id']] = $t;
        }
    }
}

// 3. Normalize into unified timeline
$studentRows = [];
foreach ($studentRowsRaw as $p) {
    $student = $studentMap[$p['entity_id'] ?? ''] ?? [];
    $studentName = $student['name'] ?? 'Enrolled Student';
    $studentRows[] = [
        'id' => $p['id'] ?? '',
        'paid_date' => $p['paid_date'] ?? (!empty($p['created_at']) ? substr($p['created_at'], 0, 10) : ''),
        'entity_type' => 'student',
        'flow' => 'inflow',
        'entity_id' => $p['entity_id'] ?? '',
        'person_name' => $studentName,
        'person_cnic' => $student['cnic'] ?? '',
        'person_phone' => $student['phone'] ?? '',
        'program_name' => $student['course'] ?? 'Vocational Training',
        'batch_name' => $student['batch'] ?? '',
        'teacher_name' => '',
        'description' => $p['description'] ?? "Tuition Payment - {$studentName}",
        'method' => $p['method'] ?? 'cash',
        'amount' => (float)($p['amount'] ?? 0),
        'reference_number' => $p['reference_number'] ?? '—',
        'notes' => $p['notes'] ?? '',
        'status' => $p['status'] ?? 'paid'
    ];
}

$seenTeacherPaymentIds = [];
$salaryRows = [];

foreach ($salaryPayments as $tp) {
    if (strtolower($tp['status'] ?? '') !== 'paid') continue;
    $id = $tp['id'] ?? '';
    if ($id) $seenTeacherPaymentIds[$id] = true;
    $teacher = $teacherMap[$tp['teacher_id'] ?? ''] ?? [];
    $teacherName = $teacher['name'] ?? 'Faculty Member';
    $month = $tp['month'] ?? ($tp['month_year'] ?? '');
    $salaryRows[] = [
        'id' => $id,
        'paid_date' => $tp['paid_on'] ?? (!empty($tp['created_at']) ? substr($tp['created_at'], 0, 10) : ''),
        'entity_type' => 'teacher',
        'flow' => 'outflow',
        'entity_id' => $tp['teacher_id'] ?? '',
        'person_name' => $teacherName,
        'person_cnic' => $teacher['cnic'] ?? '',
        'person_phone' => $teacher['phone'] ?? '',
        'program_name' => $teacher['specialization'] ?? 'Instruction',
        'batch_name' => '',
        'teacher_name' => $teacherName,
        'month' => $month,
        'description' => $month ? "Salary - {$teacherName} ({$month})" : ($tp['notes'] ?? "Salary - {$teacherName}"),
        'method' => $tp['method'] ?? ($tp['payment_method'] ?? 'bank_transfer'),
        'amount' => (float)($tp['amount'] ?? 0),
        'reference_number' => $tp['reference'] ?? ($tp['notes'] ?? '—'),
        'notes' => $tp['notes'] ?? '',
        'status' => $tp['status'] ?? 'Paid'
    ];
}

foreach ($legacyTeacherPayments as $lp) {
    $id = $lp['id'] ?? '';
    if ($id && isset($seenTeacherPaymentIds[$id])) continue;
    if ($id) $seenTeacherPaymentIds[$id] = true;
    $teacher = $teacherMap[$lp['entity_id'] ?? ''] ?? [];
    $teacherName = $teacher['name'] ?? 'Faculty Member';
    $salaryRows[] = [
        'id' => $id,
        'paid_date' => $lp['paid_date'] ?? (!empty($lp['created_at']) ? substr($lp['created_at'], 0, 10) : ''),
        'entity_type' => 'teacher',
        'flow' => 'outflow',
        'entity_id' => $lp['entity_id'] ?? '',
        'person_name' => $teacherName,
        'person_cnic' => $teacher['cnic'] ?? '',
        'person_phone' => $teacher['phone'] ?? '',
        'program_name' => $teacher['specialization'] ?? 'Instruction',
        'batch_name' => '',
        'teacher_name' => $teacherName,
        'month' => '',
        'description' => $lp['description'] ?? "Salary - {$teacherName}",
        'method' => $lp['method'] ?? 'bank_transfer',
        'amount' => (float)($lp['amount'] ?? 0),
        'reference_number' => $lp['reference_number'] ?? '—',
        'notes' => $lp['notes'] ?? '',
        'status' => $lp['status'] ?? 'paid'
    ];
}

// 4. Normalize Referral Reward Outflows
$referralRows = [];
foreach ($referralPaymentsRaw as $rp) {
    $isTeacher = isset($teacherMap[$rp['entity_id'] ?? '']);
    $referrer = $isTeacher ? $teacherMap[$rp['entity_id']] : ($studentMap[$rp['entity_id'] ?? ''] ?? []);
    $referrerName = $referrer['name'] ?? 'Referral Partner';
    $referralRows[] = [
        'id' => $rp['id'] ?? '',
        'paid_date' => $rp['paid_date'] ?? (!empty($rp['created_at']) ? substr($rp['created_at'], 0, 10) : ''),
        'entity_type' => $isTeacher ? 'teacher' : 'student',
        'flow' => 'outflow',
        'entity_id' => $rp['entity_id'] ?? '',
        'person_name' => $referrerName,
        'person_cnic' => $referrer['cnic'] ?? '',
        'person_phone' => $referrer['phone'] ?? '',
        'program_name' => 'Referral Commission Reward',
        'batch_name' => '',
        'teacher_name' => $isTeacher ? $referrerName : '',
        'month' => '',
        'description' => $rp['description'] ?? "Referral Payout - {$referrerName}",
        'method' => $rp['method'] ?? 'bank_transfer',
        'amount' => (float)($rp['amount'] ?? 0),
        'reference_number' => $rp['reference_number'] ?? '—',
        'notes' => $rp['notes'] ?? '',
        'status' => $rp['status'] ?? 'paid'
    ];
}

$outflows = array_merge($salaryRows, $referralRows);
$allTransactions = array_merge($studentRows, $outflows);
usort($allTransactions, function($a, $b) {
    return strcmp($b['paid_date'] ?? '', $a['paid_date'] ?? '');
});

$totalIn = 0;
foreach ($studentRows as $p) {
    $totalIn += $p['amount'];
}
$totalOut = 0;
foreach ($outflows as $p) {
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
            'net' => $net,
            'inflowCount' => count($studentRows),
            'outflowCount' => count($outflows),
            'totalCount' => count($allTransactions)
        ]
    ]
]);
?>
