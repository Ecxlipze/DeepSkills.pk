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
            'message' => 'Insufficient permissions to manage fee settings.'
        ]);
    }
}

$defaultFeeSettings = [
    'general' => [
        'defaultCurrency' => 'PKR',
        'registrationFee' => 2000,
        'admissionDeposit' => 5000,
        'feeReceiptPrefix' => 'DS-REC',
        'invoiceNotes' => 'Tuition fees are strictly non-refundable once classes commence. Installments must be paid on or before the designated due date to avoid penalties.'
    ],
    'installments' => [
        'allowInstallments' => true,
        'maxInstallments' => 6,
        'defaultInstallmentCount' => 3,
        'dueDayOfMonth' => 10,
        'gracePeriodDays' => 5,
        'lumpSumDiscountPct' => 5,
        'installmentSurchargePct' => 0,
        'allowedSplits' => [1, 2, 3, 4, 6]
    ],
    'lateFeeAndConcessions' => [
        'enableLateFee' => true,
        'lateFeeType' => 'flat',
        'flatLateFeeAmount' => 500,
        'dailyLateFeeAmount' => 100,
        'maxLateFeeCap' => 2500,
        'maxCounsellorConcessionPct' => 20,
        'requireDirectorApprovalAbovePct' => 20,
        'allowPartialFeeWaiver' => true
    ],
    'scholarships' => [
        [
            'id' => 'merit',
            'name' => 'Academic Merit Scholarship',
            'discountPct' => 25,
            'maxAmount' => 10000,
            'criteria' => 'High academic performance / admission test score >= 85%',
            'isActive' => true
        ],
        [
            'id' => 'need',
            'name' => 'Need-Based Financial Assistance',
            'discountPct' => 40,
            'maxAmount' => 15000,
            'criteria' => 'Household income verification and financial hardship application',
            'isActive' => true
        ],
        [
            'id' => 'kinship',
            'name' => 'Sibling & Kinship Concession',
            'discountPct' => 15,
            'maxAmount' => 6000,
            'criteria' => 'Immediate sibling or family member currently enrolled at DeepSkills',
            'isActive' => true
        ],
        [
            'id' => 'early_bird',
            'name' => 'Early Bird Registration Incentive',
            'discountPct' => 10,
            'maxAmount' => 3500,
            'criteria' => 'Admission enrollment confirmed 14+ days prior to batch commencement',
            'isActive' => true
        ],
        [
            'id' => 'alumni',
            'name' => 'DeepSkills Alumni Re-Enrollment',
            'discountPct' => 20,
            'maxAmount' => 8000,
            'criteria' => 'Graduates of any prior certified DeepSkills vocational training program',
            'isActive' => true
        ]
    ],
    'paymentGateways' => [
        'bankAccounts' => [
            [
                'id' => 'meezan_main',
                'bankName' => 'Meezan Bank Limited',
                'accountTitle' => 'DeepSkills Institute (Pvt) Ltd',
                'accountNumber' => '01020304050607',
                'iban' => 'PK36MEZN0001020304050607',
                'branch' => 'DHA Phase 5 Branch, Lahore',
                'isActive' => true
            ],
            [
                'id' => 'hbl_operational',
                'bankName' => 'Habib Bank Limited (HBL)',
                'accountTitle' => 'DeepSkills Institute',
                'accountNumber' => '22334455667788',
                'iban' => 'PK45HABB0022334455667788',
                'branch' => 'Main Boulevard Gulberg, Lahore',
                'isActive' => true
            ]
        ],
        'mobileWallets' => [
            [
                'id' => 'jazzcash',
                'provider' => 'JazzCash',
                'accountTitle' => 'DeepSkills Central Accounts',
                'accountNumber' => '0300-1234567',
                'tillNumber' => '889900',
                'isActive' => true
            ],
            [
                'id' => 'easypaisa',
                'provider' => 'EasyPaisa',
                'accountTitle' => 'DeepSkills Central Accounts',
                'accountNumber' => '0345-7654321',
                'tillNumber' => '112233',
                'isActive' => true
            ]
        ],
        'digitalGateway' => [
            'provider' => 'payfast',
            'environment' => 'sandbox',
            'merchantId' => 'DS-MERCHANT-01',
            'securedKey' => 'pk_live_••••••••••••••••',
            'enableCreditCard' => true,
            'enableUnionPay' => true,
            'enableBankTransferCheckout' => true
        ]
    ]
];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $settingsRes = otp_supabase_request('GET', 'settings?key=eq.fee_settings&select=*');
    $coursesRes = otp_supabase_request('GET', 'courses?select=id,title,description,price,duration,category,status,reenrollment_discount_pct&order=title.asc');

    $feeSettings = $defaultFeeSettings;
    $updatedAt = null;

    if (is_array($settingsRes) && !empty($settingsRes)) {
        $row = $settingsRes[0];
        $updatedAt = $row['updated_at'] ?? null;
        if (!empty($row['value'])) {
            $parsed = is_string($row['value']) ? json_decode($row['value'], true) : $row['value'];
            if (is_array($parsed)) {
                $feeSettings = array_replace_recursive($defaultFeeSettings, $parsed);
                if (!empty($parsed['scholarships']) && is_array($parsed['scholarships'])) {
                    $feeSettings['scholarships'] = $parsed['scholarships'];
                }
            }
        }
    }

    otp_respond(200, [
        'status' => 'success',
        'data' => [
            'settings' => $feeSettings,
            'courses' => is_array($coursesRes) ? $coursesRes : [],
            'updatedAt' => $updatedAt
        ]
    ]);
}

if ($method === 'POST') {
    if (($auth['role'] ?? '') === 'custom' && ($auth['permissions']['finance'] ?? '') !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'read_only_permissions',
            'message' => 'Modifications require full finance access.'
        ]);
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: [];
    $action = $input['action'] ?? 'update_fee_settings';

    if ($action === 'update_fee_settings') {
        $newSettings = $input['settings'] ?? null;
        if (!is_array($newSettings)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Valid settings object is required.']);
        }

        $valStr = json_encode($newSettings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $payload = [
            'key' => 'fee_settings',
            'value' => $valStr,
            'updated_at' => (new DateTime())->format('Y-m-d H:i:sP')
        ];

        $res = otp_supabase_request('POST', 'settings?on_conflict=key', $payload, [
            'Prefer: resolution=merge-duplicates'
        ]);

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Fee settings updated successfully.',
            'data' => $newSettings
        ]);
    }

    if ($action === 'update_course_tuition') {
        $courseId = $input['courseId'] ?? null;
        $updates = $input['courseUpdates'] ?? [];
        if (!$courseId) {
            otp_respond(400, ['status' => 'error', 'message' => 'courseId is required.']);
        }

        $allowed = ['price', 'duration', 'reenrollment_discount_pct', 'status', 'category'];
        $cleanUpdates = [];
        foreach ($allowed as $f) {
            if (isset($updates[$f])) {
                $cleanUpdates[$f] = $updates[$f];
            }
        }

        $res = otp_supabase_request('PATCH', "courses?id=eq.{$courseId}", $cleanUpdates);

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Course tuition pricing updated successfully.',
            'data' => $cleanUpdates
        ]);
    }

    if ($action === 'reset_defaults') {
        $valStr = json_encode($defaultFeeSettings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $payload = [
            'key' => 'fee_settings',
            'value' => $valStr,
            'updated_at' => (new DateTime())->format('Y-m-d H:i:sP')
        ];

        $res = otp_supabase_request('POST', 'settings?on_conflict=key', $payload, [
            'Prefer: resolution=merge-duplicates'
        ]);

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Fee settings reset to institutional defaults.',
            'data' => $defaultFeeSettings
        ]);
    }

    otp_respond(400, ['status' => 'error', 'message' => 'Unknown action requested.']);
}
