<?php
require_once __DIR__ . '/../auth/_otp_common.php';

function finance_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload);
    exit();
}

function finance_load_env_file() {
    $paths = [
        __DIR__ . '/../.env',
        __DIR__ . '/../.env.local',
        __DIR__ . '/../../.env',
        __DIR__ . '/../../.env.local',
        __DIR__ . '/../../../.env',
        __DIR__ . '/../../../.env.local',
    ];

    $env = [];
    foreach ($paths as $path) {
        if (!is_readable($path)) continue;
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            $pos = strpos($line, '=');
            if ($pos === false) continue;
            $key = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));
            $env[$key] = trim($value, "\"'");
        }
    }
    return $env;
}

function finance_supabase_request($method, $path, $payload = null, $prefer = '') {
    $env = finance_load_env_file();
    $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
    $key = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

    if (!$url || !$key) {
        finance_respond(500, ['status' => 'error', 'message' => 'Supabase service configuration is missing.']);
    }

    $headers = [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
    ];
    if ($prefer) $headers[] = 'Prefer: ' . $prefer;

    $context = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
        ],
    ];
    if ($payload !== null) {
        $context['http']['content'] = json_encode($payload);
    }

    $response = file_get_contents($url . '/rest/v1/' . $path, false, stream_context_create($context));
    $status = 0;
    $headersOut = function_exists('http_get_last_response_headers') ? http_get_last_response_headers() : ($http_response_header ?? []);
    if (isset($headersOut[0]) && preg_match('/\s(\d{3})\s/', $headersOut[0], $matches)) {
        $status = (int) $matches[1];
    }

    $decoded = json_decode($response ?: 'null', true);
    if ($status >= 400) {
        $message = is_array($decoded) ? ($decoded['message'] ?? $decoded['error'] ?? 'Supabase request failed.') : 'Supabase request failed.';
        finance_respond($status, ['status' => 'error', 'message' => $message]);
    }
    return $decoded;
}

function finance_first($rows) {
    return is_array($rows) ? ($rows[0] ?? null) : null;
}

function finance_normalize_cnic($value) {
    $digits = preg_replace('/\D+/', '', (string) $value);
    if (strlen($digits) !== 13) return '';
    return substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . substr($digits, 12, 1);
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    finance_respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$requestedCnic = !empty($data['cnic']) ? finance_normalize_cnic($data['cnic']) : null;
$cnic = otp_verify_session('teacher', $requestedCnic);

$teacher = finance_first(finance_supabase_request('GET', 'teachers?select=id,status&cnic=eq.' . rawurlencode($cnic) . '&limit=1'));
if (!$teacher || ($teacher['status'] ?? '') !== 'Active') {
    finance_respond(403, ['status' => 'error', 'message' => 'Active teacher profile not found.']);
}

$salary = finance_first(finance_supabase_request('GET', 'teacher_salaries?select=*&teacher_id=eq.' . rawurlencode($teacher['id']) . '&limit=1'));
$payments = finance_supabase_request(
    'GET',
    'payments?select=*&entity_id=eq.' . rawurlencode($teacher['id']) . '&entity_type=eq.teacher&order=paid_date.desc'
);
$payments = is_array($payments) ? $payments : [];

$currentMonth = date('F Y');
$isPaidThisMonth = false;
foreach ($payments as $payment) {
    if (($payment['status'] ?? '') === 'paid' && strpos($payment['description'] ?? '', $currentMonth) !== false) {
        $isPaidThisMonth = true;
        break;
    }
}

$lastPayment = $payments[0] ?? null;
finance_respond(200, [
    'status' => 'success',
    'data' => [
        'monthlyAmount' => $salary['monthly_amount'] ?? 0,
        'status' => $isPaidThisMonth ? 'Paid' : 'Pending',
        'lastPaymentDate' => $lastPayment['paid_date'] ?? 'N/A',
        'history' => $payments,
    ],
]);
?>
