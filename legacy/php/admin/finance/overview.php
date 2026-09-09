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
            'message' => 'Insufficient permissions to view finance data.'
        ]);
    }
}

// 1. Payments & Teacher Payments
$allPayments = otp_supabase_request('GET', 'payments?select=id,entity_id,entity_type,amount,status,due_date,paid_date');
if (!is_array($allPayments)) $allPayments = [];

$allTeacherPayments = otp_supabase_request('GET', 'teacher_payments?select=id,teacher_id,amount,month,paid_on,method,reference,status');
if (!is_array($allTeacherPayments)) $allTeacherPayments = [];

$revenue = 0;
$outstanding = 0;
$salaries = 0;

foreach ($allPayments as $p) {
    $amt = (float)($p['amount'] ?? 0);
    if (($p['entity_type'] ?? '') === 'student') {
        if (($p['status'] ?? '') === 'paid') $revenue += $amt;
        else $outstanding += $amt;
    } else if (($p['entity_type'] ?? '') === 'teacher' && ($p['status'] ?? '') === 'paid') {
        $salaries += $amt;
    }
}

foreach ($allTeacherPayments as $tp) {
    if (strtolower($tp['status'] ?? '') === 'paid') {
        $salaries += (float)($tp['amount'] ?? 0);
    }
}

$stats = [
    'totalRevenue' => $revenue,
    'outstandingFees' => $outstanding,
    'teacherSalaries' => $salaries,
    'netBalance' => $revenue - $salaries
];

// 2. Student Fees
$fees = otp_supabase_request('GET', 'fee_plans?select=*,student:admissions(name,cnic,status)');
if (!is_array($fees)) $fees = [];

$studentPayments = array_filter($allPayments, function($p) {
    return ($p['entity_type'] ?? '') === 'student';
});

$processedFees = [];
$today = date('Y-m-d');
foreach ($fees as $plan) {
    $sId = $plan['student_id'] ?? '';
    $planPays = array_values(array_filter($studentPayments, function($p) use ($sId) {
        return ($p['entity_id'] ?? '') === $sId;
    }));

    $paid = 0;
    $hasOverdue = false;
    foreach ($planPays as $p) {
        if (($p['status'] ?? '') === 'paid') {
            $paid += (float)($p['amount'] ?? 0);
        } else if (($p['status'] ?? '') === 'pending' && !empty($p['due_date']) && $p['due_date'] < $today) {
            $hasOverdue = true;
        }
    }

    $payable = isset($plan['final_fee']) ? (float)$plan['final_fee'] : (float)($plan['total_fee'] ?? 0);
    $status = 'Pending';
    if ($paid >= $payable) $status = 'Paid';
    else if ($paid > 0) $status = 'Partial';
    if ($hasOverdue && $status !== 'Paid') $status = 'Overdue';

    $planCopy = $plan;
    $planCopy['payable'] = $payable;
    $planCopy['paid'] = $paid;
    $planCopy['outstanding'] = max(0, $payable - $paid);
    $planCopy['status'] = $status;
    $planCopy['paymentRecords'] = $planPays;
    $processedFees[] = $planCopy;
}

// 3. Teachers
$teachers = otp_supabase_request('GET', 'teachers?select=id,name,specialization,salary_config:teacher_salaries(monthly_amount)');
if (!is_array($teachers)) $teachers = [];

$currentMonth = date('Y-m');
$processedTeachers = [];
foreach ($teachers as $t) {
    $tId = $t['id'] ?? '';
    $salaryConfig = $t['salary_config'] ?? [];
    $monthly = !empty($salaryConfig[0]['monthly_amount']) ? (float)$salaryConfig[0]['monthly_amount'] : 0;

    $directPay = array_values(array_filter($allTeacherPayments, function($tp) use ($tId) {
        return ($tp['teacher_id'] ?? '') === $tId;
    }));

    $dates = [];
    $paidThisMonth = false;
    foreach ($directPay as $tp) {
        if (!empty($tp['paid_on'])) $dates[] = $tp['paid_on'];
        if (($tp['month'] ?? '') === $currentMonth && strtolower($tp['status'] ?? '') === 'paid') {
            $paidThisMonth = true;
        }
    }
    rsort($dates);
    $lastPaid = !empty($dates) ? $dates[0] : 'Never';

    $tCopy = $t;
    $tCopy['monthlySalary'] = $monthly;
    $tCopy['status'] = $paidThisMonth ? 'Paid' : 'Pending';
    $tCopy['lastPaid'] = $lastPaid;
    $tCopy['paymentHistory'] = $directPay;
    $processedTeachers[] = $tCopy;
}

otp_respond(200, [
    'status' => 'success',
    'data' => [
        'stats' => $stats,
        'studentFees' => $processedFees,
        'teacherSalaries' => $processedTeachers
    ]
]);
?>
