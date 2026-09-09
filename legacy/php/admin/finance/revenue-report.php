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
            'message' => 'Insufficient permissions to view finance reports.'
        ]);
    }
}

$preset = $_GET['preset'] ?? 'this_month';
$queryStartDate = $_GET['startDate'] ?? null;
$queryEndDate = $_GET['endDate'] ?? null;
$courseFilter = $_GET['course'] ?? 'all';
$batchFilter = $_GET['batch'] ?? 'all';

// Determine date boundaries
$now = new DateTime();
$rangeStart = null;
$rangeEnd = null;

if ($preset === 'today') {
    $rangeStart = new DateTime($now->format('Y-m-d 00:00:00'));
    $rangeEnd = new DateTime($now->format('Y-m-d 23:59:59'));
} else if ($preset === 'yesterday') {
    $yDay = clone $now;
    $yDay->modify('-1 day');
    $rangeStart = new DateTime($yDay->format('Y-m-d 00:00:00'));
    $rangeEnd = new DateTime($yDay->format('Y-m-d 23:59:59'));
} else if ($preset === 'last_7_days') {
    $past = clone $now;
    $past->modify('-7 days');
    $rangeStart = new DateTime($past->format('Y-m-d 00:00:00'));
    $rangeEnd = new DateTime($now->format('Y-m-d 23:59:59'));
} else if ($preset === 'this_month') {
    $rangeStart = new DateTime($now->format('Y-m-01 00:00:00'));
    $rangeEnd = new DateTime($now->format('Y-m-t 23:59:59'));
} else if ($preset === 'last_month') {
    $lMonth = clone $now;
    $lMonth->modify('first day of last month');
    $rangeStart = new DateTime($lMonth->format('Y-m-01 00:00:00'));
    $rangeEnd = new DateTime($lMonth->format('Y-m-t 23:59:59'));
} else if ($preset === 'this_quarter') {
    $curMonth = (int)$now->format('n');
    $qStartMonth = floor(($curMonth - 1) / 3) * 3 + 1;
    $rangeStart = new DateTime(sprintf('%s-%02d-01 00:00:00', $now->format('Y'), $qStartMonth));
    $qEndObj = clone $rangeStart;
    $qEndObj->modify('+2 months');
    $rangeEnd = new DateTime($qEndObj->format('Y-m-t 23:59:59'));
} else if ($preset === 'this_year') {
    $rangeStart = new DateTime($now->format('Y-01-01 00:00:00'));
    $rangeEnd = new DateTime($now->format('Y-12-31 23:59:59'));
} else if ($preset === 'custom' && $queryStartDate && $queryEndDate) {
    $rangeStart = new DateTime($queryStartDate . ' 00:00:00');
    $rangeEnd = new DateTime($queryEndDate . ' 23:59:59');
}

$allPayments = otp_supabase_request('GET', 'payments?select=*');
if (!is_array($allPayments)) $allPayments = [];

$allTeacherPayments = otp_supabase_request('GET', 'teacher_payments?select=*');
if (!is_array($allTeacherPayments)) $allTeacherPayments = [];

$allFeePlans = otp_supabase_request('GET', 'fee_plans?select=*');
if (!is_array($allFeePlans)) $allFeePlans = [];

$allAdmissions = otp_supabase_request('GET', 'admissions?select=id,name,course,batch,cnic,phone,status,admission_date');
if (!is_array($allAdmissions)) $allAdmissions = [];

$allCourses = otp_supabase_request('GET', 'courses?select=id,title,fee,duration,category');
if (!is_array($allCourses)) $allCourses = [];

$allBatches = otp_supabase_request('GET', 'batches?select=id,batch_name,course,status,start_date,end_date');
if (!is_array($allBatches)) $allBatches = [];

// Index admissions & fee plans
$studentMap = [];
foreach ($allAdmissions as $stu) {
    if (!empty($stu['id'])) $studentMap[$stu['id']] = $stu;
    if (!empty($stu['cnic'])) $studentMap[$stu['cnic']] = $stu;
}

$feePlanMap = [];
foreach ($allFeePlans as $plan) {
    if (!empty($plan['student_id'])) $feePlanMap[$plan['student_id']] = $plan;
}

$isDateInRange = function($dStr) use ($rangeStart, $rangeEnd) {
    if (!$rangeStart || !$rangeEnd) return true;
    if (empty($dStr)) return false;
    $d = new DateTime($dStr);
    return $d >= $rangeStart && $d <= $rangeEnd;
};

$isReferralPayment = function($p) {
    return ($p['entity_type'] ?? '') === 'referrer' || (!empty($p['description']) && strpos($p['description'], 'Referral Reward') === 0);
};

$isTeacherPayment = function($p) use ($isReferralPayment) {
    return !$isReferralPayment($p) && ($p['entity_type'] ?? '') === 'teacher';
};

$isStudentPayment = function($p) use ($isReferralPayment) {
    return !$isReferralPayment($p) && ($p['entity_type'] ?? '') !== 'teacher';
};

$inRangeStudentPayments = [];
$allPaidStudentPayments = [];

foreach ($allPayments as $p) {
    if (!$isStudentPayment($p) || ($p['status'] ?? '') !== 'paid') continue;
    $allPaidStudentPayments[] = $p;

    $stu = $studentMap[$p['entity_id'] ?? ''] ?? null;
    $plan = $feePlanMap[$p['entity_id'] ?? ''] ?? null;
    $studentCourse = $stu['course'] ?? ($plan['course'] ?? 'Unknown');
    $studentBatch = $stu['batch'] ?? ($plan['batch'] ?? 'Unknown');

    if ($courseFilter !== 'all' && $studentCourse !== $courseFilter) continue;
    if ($batchFilter !== 'all' && $studentBatch !== $batchFilter) continue;

    $dateField = $p['paid_date'] ?? ($p['created_at'] ?? null);
    if ($isDateInRange($dateField)) {
        $p['studentName'] = $stu['name'] ?? 'Student';
        $p['course'] = $studentCourse;
        $p['batch'] = $studentBatch;
        $p['phone'] = $stu['phone'] ?? '';
        $p['cnic'] = $stu['cnic'] ?? '';
        $inRangeStudentPayments[] = $p;
    }
}

$inRangeTeacherPayments = [];
foreach ($allTeacherPayments as $tp) {
    if (strtolower($tp['status'] ?? '') !== 'paid') continue;
    $dateField = $tp['paid_on'] ?? ($tp['created_at'] ?? null);
    if ($isDateInRange($dateField)) {
        $inRangeTeacherPayments[] = [
            'id' => $tp['id'] ?? '',
            'amount' => (float)($tp['amount'] ?? 0),
            'paid_date' => $dateField,
            'method' => $tp['method'] ?? 'bank_transfer',
            'reference_number' => $tp['reference'] ?? '',
            'description' => 'Faculty Honorarium: ' . ($tp['month'] ?? 'Payroll')
        ];
    }
}

foreach ($allPayments as $p) {
    if (!$isTeacherPayment($p) || ($p['status'] ?? '') !== 'paid') continue;
    $dateField = $p['paid_date'] ?? ($p['created_at'] ?? null);
    if ($isDateInRange($dateField)) {
        $inRangeTeacherPayments[] = [
            'id' => $p['id'] ?? '',
            'amount' => (float)($p['amount'] ?? 0),
            'paid_date' => $dateField,
            'method' => $p['method'] ?? 'bank_transfer',
            'reference_number' => $p['reference_number'] ?? '',
            'description' => $p['description'] ?? 'Faculty Payroll'
        ];
    }
}

$inRangeReferralPayments = [];
foreach ($allPayments as $p) {
    if (!$isReferralPayment($p) || ($p['status'] ?? '') !== 'paid') continue;
    $dateField = $p['paid_date'] ?? ($p['created_at'] ?? null);
    if ($isDateInRange($dateField)) {
        $inRangeReferralPayments[] = [
            'id' => $p['id'] ?? '',
            'amount' => (float)($p['amount'] ?? 0),
            'paid_date' => $dateField,
            'method' => $p['method'] ?? 'bank_transfer',
            'reference_number' => $p['reference_number'] ?? '',
            'description' => $p['description'] ?? 'Referral Commission'
        ];
    }
}

// Telemetry
$totalCollectedRevenue = 0;
foreach ($inRangeStudentPayments as $p) $totalCollectedRevenue += (float)($p['amount'] ?? 0);

$totalFacultyPayroll = 0;
foreach ($inRangeTeacherPayments as $tp) $totalFacultyPayroll += (float)($tp['amount'] ?? 0);

$totalReferralCommissions = 0;
foreach ($inRangeReferralPayments as $rp) $totalReferralCommissions += (float)($rp['amount'] ?? 0);

$totalOperatingExpenses = $totalFacultyPayroll + $totalReferralCommissions;
$netOperatingIncome = $totalCollectedRevenue - $totalOperatingExpenses;
$profitMargin = $totalCollectedRevenue > 0 ? (int)round(($netOperatingIncome / $totalCollectedRevenue) * 100) : 0;

$grossTuitionBilled = 0;
$totalOutstandingReceivable = 0;

foreach ($allFeePlans as $plan) {
    $studentCourse = $plan['course'] ?? ($studentMap[$plan['student_id'] ?? '']['course'] ?? 'Unknown');
    $studentBatch = $plan['batch'] ?? ($studentMap[$plan['student_id'] ?? '']['batch'] ?? 'Unknown');

    if ($courseFilter !== 'all' && $studentCourse !== $courseFilter) continue;
    if ($batchFilter !== 'all' && $studentBatch !== $batchFilter) continue;

    $billed = isset($plan['final_fee']) && $plan['final_fee'] !== null ? (float)$plan['final_fee'] : (float)($plan['total_fee'] ?? 0);
    $grossTuitionBilled += $billed;

    $studentPaid = 0;
    foreach ($allPaidStudentPayments as $p) {
        if (($p['entity_id'] ?? '') === ($plan['student_id'] ?? '')) {
            $studentPaid += (float)($p['amount'] ?? 0);
        }
    }
    $totalOutstandingReceivable += max(0, $billed - $studentPaid);
}

$totalReceivablePool = $totalCollectedRevenue + $totalOutstandingReceivable;
$collectionEfficiency = $totalReceivablePool > 0 ? (int)round(($totalCollectedRevenue / $totalReceivablePool) * 100) : 0;
$totalPaidTransactions = count($inRangeStudentPayments);
$averageTransactionValue = $totalPaidTransactions > 0 ? (int)round($totalCollectedRevenue / $totalPaidTransactions) : 0;

// Course Breakdown
$courseStatsMap = [];
foreach ($allCourses as $c) {
    $t = $c['title'] ?? 'Course';
    $courseStatsMap[$t] = [
        'courseTitle' => $t,
        'category' => $c['category'] ?? 'Professional',
        'baseFee' => (float)($c['fee'] ?? 0),
        'enrolledStudents' => 0,
        'totalBilled' => 0,
        'collectedRevenue' => 0,
        'outstandingFees' => 0,
        'activeBatches' => 0
    ];
}

foreach ($allBatches as $b) {
    $cName = $b['course'] ?? '';
    if (isset($courseStatsMap[$cName])) {
        $courseStatsMap[$cName]['activeBatches'] += 1;
    }
}

foreach ($allFeePlans as $plan) {
    $cName = $plan['course'] ?? ($studentMap[$plan['student_id'] ?? '']['course'] ?? 'Other');
    if (!isset($courseStatsMap[$cName])) {
        $courseStatsMap[$cName] = [
            'courseTitle' => $cName,
            'category' => 'Vocational',
            'baseFee' => 0,
            'enrolledStudents' => 0,
            'totalBilled' => 0,
            'collectedRevenue' => 0,
            'outstandingFees' => 0,
            'activeBatches' => 0
        ];
    }
    $courseStatsMap[$cName]['enrolledStudents'] += 1;
    $billed = isset($plan['final_fee']) && $plan['final_fee'] !== null ? (float)$plan['final_fee'] : (float)($plan['total_fee'] ?? 0);
    $courseStatsMap[$cName]['totalBilled'] += $billed;

    $studentPaid = 0;
    foreach ($allPaidStudentPayments as $p) {
        if (($p['entity_id'] ?? '') === ($plan['student_id'] ?? '')) {
            $studentPaid += (float)($p['amount'] ?? 0);
        }
    }
    $courseStatsMap[$cName]['outstandingFees'] += max(0, $billed - $studentPaid);
}

foreach ($inRangeStudentPayments as $p) {
    $cName = $p['course'] ?? 'Other';
    if (isset($courseStatsMap[$cName])) {
        $courseStatsMap[$cName]['collectedRevenue'] += (float)($p['amount'] ?? 0);
    }
}

$courseBreakdown = [];
foreach ($courseStatsMap as $c) {
    if ($c['enrolledStudents'] > 0 || $c['collectedRevenue'] > 0) {
        $c['recoveryRate'] = $c['totalBilled'] > 0 ? min(100, (int)round(($c['collectedRevenue'] / $c['totalBilled']) * 100)) : 0;
        $courseBreakdown[] = $c;
    }
}
usort($courseBreakdown, function($a, $b) {
    return $b['collectedRevenue'] <=> $a['collectedRevenue'];
});

// Batch Breakdown
$batchStatsMap = [];
foreach ($allBatches as $b) {
    $bName = $b['batch_name'] ?? 'Batch';
    $batchStatsMap[$bName] = [
        'batchName' => $bName,
        'courseTitle' => $b['course'] ?? '',
        'status' => $b['status'] ?? 'Active',
        'studentCount' => 0,
        'totalBilled' => 0,
        'collectedRevenue' => 0
    ];
}

foreach ($allFeePlans as $plan) {
    $bName = $plan['batch'] ?? ($studentMap[$plan['student_id'] ?? '']['batch'] ?? null);
    if ($bName && isset($batchStatsMap[$bName])) {
        $batchStatsMap[$bName]['studentCount'] += 1;
        $billed = isset($plan['final_fee']) && $plan['final_fee'] !== null ? (float)$plan['final_fee'] : (float)($plan['total_fee'] ?? 0);
        $batchStatsMap[$bName]['totalBilled'] += $billed;
    }
}

foreach ($inRangeStudentPayments as $p) {
    $bName = $p['batch'] ?? null;
    if ($bName && isset($batchStatsMap[$bName])) {
        $batchStatsMap[$bName]['collectedRevenue'] += (float)($p['amount'] ?? 0);
    }
}

$batchBreakdown = [];
foreach ($batchStatsMap as $b) {
    if ($b['studentCount'] > 0 || $b['collectedRevenue'] > 0) {
        $batchBreakdown[] = $b;
    }
}
usort($batchBreakdown, function($a, $b) {
    return $b['collectedRevenue'] <=> $a['collectedRevenue'];
});

// Monthly Timeline
$monthlyLedger = [];
$addToMonth = function($dateStr, $type, $amount) use (&$monthlyLedger) {
    if (empty($dateStr)) return;
    $d = new DateTime($dateStr);
    $key = $d->format('Y-m');
    $label = $d->format('M Y');
    if (!isset($monthlyLedger[$key])) {
        $monthlyLedger[$key] = [
            'monthKey' => $key,
            'monthLabel' => $label,
            'tuitionRevenue' => 0,
            'teacherPayroll' => 0,
            'referralRewards' => 0
        ];
    }
    $monthlyLedger[$key][$type] += (float)$amount;
};

foreach ($inRangeStudentPayments as $p) {
    $addToMonth($p['paid_date'] ?? ($p['created_at'] ?? null), 'tuitionRevenue', $p['amount'] ?? 0);
}
foreach ($inRangeTeacherPayments as $tp) {
    $addToMonth($tp['paid_date'], 'teacherPayroll', $tp['amount'] ?? 0);
}
foreach ($inRangeReferralPayments as $rp) {
    $addToMonth($rp['paid_date'], 'referralRewards', $rp['amount'] ?? 0);
}

ksort($monthlyLedger);
$monthlyTimeline = [];
foreach ($monthlyLedger as $m) {
    $totExp = $m['teacherPayroll'] + $m['referralRewards'];
    $netSur = $m['tuitionRevenue'] - $totExp;
    $m['totalExpenses'] = $totExp;
    $m['netSurplus'] = $netSur;
    $m['marginPct'] = $m['tuitionRevenue'] > 0 ? (int)round(($netSur / $m['tuitionRevenue']) * 100) : 0;
    $monthlyTimeline[] = $m;
}

// Payment Methods Breakdown
$methodCounts = [];
foreach ($inRangeStudentPayments as $p) {
    $raw = strtolower(trim($p['method'] ?? 'bank_transfer'));
    $label = 'Bank Transfer / IBFT';
    if (strpos($raw, 'cash') !== false) $label = 'Cash in Hand';
    else if (strpos($raw, 'jazz') !== false) $label = 'JazzCash';
    else if (strpos($raw, 'easy') !== false || strpos($raw, 'paisa') !== false) $label = 'EasyPaisa';
    else if (strpos($raw, 'online') !== false || strpos($raw, 'stripe') !== false || strpos($raw, 'card') !== false) $label = 'Online / Card';
    else if (strpos($raw, 'cheque') !== false) $label = 'Cheque';

    if (!isset($methodCounts[$label])) {
        $methodCounts[$label] = ['method' => $label, 'amount' => 0, 'count' => 0];
    }
    $methodCounts[$label]['amount'] += (float)($p['amount'] ?? 0);
    $methodCounts[$label]['count'] += 1;
}

$paymentMethods = array_values($methodCounts);
usort($paymentMethods, function($a, $b) {
    return $b['amount'] <=> $a['amount'];
});

// Recent Transactions
usort($inRangeStudentPayments, function($a, $b) {
    $da = $a['paid_date'] ?? ($a['created_at'] ?? '');
    $db = $b['paid_date'] ?? ($b['created_at'] ?? '');
    return strcmp($db, $da);
});

$recentTransactions = [];
$topRecent = array_slice($inRangeStudentPayments, 0, 15);
foreach ($topRecent as $p) {
    $recentTransactions[] = [
        'id' => $p['id'] ?? '',
        'studentName' => $p['studentName'] ?? 'Student',
        'course' => $p['course'] ?? '',
        'batch' => $p['batch'] ?? '',
        'amount' => (float)($p['amount'] ?? 0),
        'method' => $p['method'] ?? '',
        'paidDate' => $p['paid_date'] ?? '',
        'referenceNumber' => $p['reference_number'] ?? ''
    ];
}

$courseOptions = array_values(array_filter(array_map(function($c) { return $c['title'] ?? null; }, $allCourses)));
$batchOptions = array_values(array_filter(array_map(function($b) { return $b['batch_name'] ?? null; }, $allBatches)));

otp_respond(200, [
    'status' => 'success',
    'data' => [
        'filterSummary' => [
            'preset' => $preset,
            'startDate' => $rangeStart ? $rangeStart->format('Y-m-d') : null,
            'endDate' => $rangeEnd ? $rangeEnd->format('Y-m-d') : null,
            'course' => $courseFilter,
            'batch' => $batchFilter
        ],
        'kpis' => [
            'grossTuitionBilled' => $grossTuitionBilled,
            'totalCollectedRevenue' => $totalCollectedRevenue,
            'totalOutstandingReceivable' => $totalOutstandingReceivable,
            'totalFacultyPayroll' => $totalFacultyPayroll,
            'totalReferralCommissions' => $totalReferralCommissions,
            'totalOperatingExpenses' => $totalOperatingExpenses,
            'netOperatingIncome' => $netOperatingIncome,
            'profitMargin' => $profitMargin,
            'collectionEfficiency' => $collectionEfficiency,
            'totalPaidTransactions' => $totalPaidTransactions,
            'averageTransactionValue' => $averageTransactionValue
        ],
        'courseBreakdown' => $courseBreakdown,
        'batchBreakdown' => $batchBreakdown,
        'monthlyTimeline' => $monthlyTimeline,
        'paymentMethods' => $paymentMethods,
        'recentTransactions' => $recentTransactions,
        'filterOptions' => [
            'courses' => $courseOptions,
            'batches' => $batchOptions
        ]
    ]
]);
