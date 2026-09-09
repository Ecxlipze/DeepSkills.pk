<?php
require_once __DIR__ . '/../auth/_otp_common.php';

function student_results_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload);
    exit();
}

function student_results_load_env_file() {
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

function student_results_supabase_request($method, $path, $payload = null, $prefer = '') {
    $env = student_results_load_env_file();
    $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
    $key = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

    if (!$url || !$key) {
        student_results_respond(500, ['status' => 'error', 'message' => 'Supabase service configuration is missing.']);
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
        student_results_respond($status, ['status' => 'error', 'message' => $message]);
    }
    return $decoded;
}

function student_results_first($rows) {
    return is_array($rows) ? ($rows[0] ?? null) : null;
}

function student_results_normalize_cnic($value) {
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
    student_results_respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$examType = preg_replace('/[^a-z]/', '', strtolower((string) ($data['examType'] ?? '')));
if (!in_array($examType, ['midterm', 'finalterm'], true)) {
    student_results_respond(400, ['status' => 'error', 'message' => 'Valid exam type is required.']);
}

$requestedCnic = !empty($data['cnic']) ? student_results_normalize_cnic($data['cnic']) : null;
$session = portal_require_session(['student'], $requestedCnic);
$cnic = $session['cnic'];

$student = student_results_first(student_results_supabase_request(
    'GET',
    'admissions?select=id,status&cnic=eq.' . rawurlencode($cnic) . '&status=in.(Active,Graduated)&order=submitted_at.desc&limit=1'
));
if (!$student) {
    student_results_respond(403, ['status' => 'error', 'message' => 'Active student admission not found.']);
}

$result = student_results_first(student_results_supabase_request(
    'GET',
    'results?select=*&student_id=eq.' . rawurlencode($student['id']) . '&exam_type=eq.' . rawurlencode($examType) . '&limit=1'
));

$stats = ['avg' => 0, 'highest' => 0, 'count' => 0];
if ($result) {
    $allResults = student_results_supabase_request(
        'GET',
        'results?select=total_marks&batch_id=eq.' . rawurlencode($result['batch_id']) . '&exam_type=eq.' . rawurlencode($examType)
    );
    $scores = [];
    if (is_array($allResults)) {
        foreach ($allResults as $row) {
            if (isset($row['total_marks'])) $scores[] = (float) $row['total_marks'];
        }
    }
    if (count($scores) > 0) {
        $stats = [
            'avg' => round((array_sum($scores) / count($scores)) * 10) / 10,
            'highest' => max($scores),
            'count' => count($scores),
        ];
    }
}

student_results_respond(200, ['status' => 'success', 'data' => ['result' => $result, 'batchStats' => $stats]]);
?>
