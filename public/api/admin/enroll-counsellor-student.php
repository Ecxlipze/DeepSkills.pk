<?php
function enroll_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload);
    exit();
}

function enroll_load_env_file() {
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

function enroll_http_json($method, $url, $headers, $payload = null) {
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

    $response = file_get_contents($url, false, stream_context_create($context));
    $status = 0;
    $headersOut = function_exists('http_get_last_response_headers') ? http_get_last_response_headers() : ($http_response_header ?? []);
    if (isset($headersOut[0]) && preg_match('/\s(\d{3})\s/', $headersOut[0], $matches)) {
        $status = (int) $matches[1];
    }

    return [$status, json_decode($response ?: 'null', true)];
}

function enroll_require_admin_session($supabaseUrl, $anonKey) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        enroll_respond(401, ['status' => 'error', 'message' => 'Admin session is required.']);
    }

    [$status, $user] = enroll_http_json('GET', $supabaseUrl . '/auth/v1/user', [
        'apikey: ' . $anonKey,
        'Authorization: Bearer ' . $matches[1],
        'Content-Type: application/json',
    ]);

    if ($status >= 400 || !is_array($user) || empty($user['id'])) {
        enroll_respond(401, ['status' => 'error', 'message' => 'Admin session is invalid or expired.']);
    }

    return $user;
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
    enroll_respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$env = enroll_load_env_file();
$supabaseUrl = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
$anonKey = $env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? $env['REACT_APP_SUPABASE_ANON_KEY'] ?? '';
$serviceKey = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!$supabaseUrl || !$anonKey || !$serviceKey) {
    enroll_respond(500, ['status' => 'error', 'message' => 'Supabase service configuration is missing.']);
}

enroll_require_admin_session($supabaseUrl, $anonKey);

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data) || !is_array($data['payload'] ?? null)) {
    enroll_respond(400, ['status' => 'error', 'message' => 'Enrollment payload is required.']);
}

$payload = $data['payload'];

// Normalize payment plan to 'full' or 'installment'
$rawPlan = strtolower(trim((string)($payload['paymentPlan'] ?? '')));
if ($rawPlan === 'full' || $rawPlan === 'one-time' || $rawPlan === '1') {
    $payload['paymentPlan'] = 'full';
    $payload['installmentCount'] = 1;
} else {
    $payload['paymentPlan'] = 'installment';
    if (is_numeric($rawPlan) && (int)$rawPlan > 1 && empty($payload['installmentCount'])) {
        $payload['installmentCount'] = (int)$rawPlan;
    }
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

[$status, $result] = enroll_http_json('POST', $supabaseUrl . '/rest/v1/rpc/enroll_counsellor_student', [
    'apikey: ' . $serviceKey,
    'Authorization: Bearer ' . $serviceKey,
    'Content-Type: application/json',
], ['payload' => $payload]);

if ($status >= 400) {
    $message = is_array($result) ? ($result['message'] ?? $result['error'] ?? 'Enrollment failed.') : 'Enrollment failed.';
    enroll_respond($status, ['status' => 'error', 'message' => $message]);
}

echo json_encode($result);
?>
