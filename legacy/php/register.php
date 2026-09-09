<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://deepskills.pk');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload);
    exit();
}

function load_env_file() {
    $paths = [
        __DIR__ . '/../.env',
        __DIR__ . '/../.env.local',
        __DIR__ . '/../../.env',
        __DIR__ . '/../../.env.local',
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

function clean_text($value, $max = 200) {
    $value = preg_replace('/[<>]/', '', (string) $value);
    $value = preg_replace('/[\x00-\x1F\x7F]/', '', $value);
    return substr(trim($value), 0, $max);
}

function supabase_request($method, $path, $payload = null, $prefer = '') {
    $env = load_env_file();
    $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
    $key = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? $env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? $env['REACT_APP_SUPABASE_ANON_KEY'] ?? '';

    if (!$url || !$key) {
        respond(500, ['status' => 'error', 'message' => 'Supabase configuration is missing.']);
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
        $message = is_array($decoded) ? ($decoded['message'] ?? $decoded['error'] ?? 'Registration request failed.') : 'Registration request failed.';
        respond($status, ['status' => 'error', 'message' => $message]);
    }

    return $decoded;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    respond(400, ['status' => 'error', 'message' => 'Invalid registration data.']);
}

if (!empty($data['bot-field'])) {
    respond(200, ['status' => 'success', 'message' => 'Registration submitted.']);
}

$name = clean_text($data['name'] ?? trim(($data['firstName'] ?? '') . ' ' . ($data['lastName'] ?? '')), 120);
$email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
$phone = clean_text($data['phone'] ?? $data['mobileNo'] ?? '', 30);
$cnic = clean_text($data['cnic'] ?? '', 30);
$course = clean_text($data['course'] ?? $data['selectedCourse'] ?? '', 120);
$education = clean_text($data['education'] ?? $data['lastEducation'] ?? '', 120);
$hearAboutUs = clean_text($data['hear_about_us'] ?? $data['source'] ?? '', 120);
$gender = clean_text($data['gender'] ?? '', 30);
$age = isset($data['age']) ? (int) $data['age'] : null;
$referredBy = clean_text($data['referred_by'] ?? $data['referredBy'] ?? '', 120);

if (!$name || !$email || !$phone || !$cnic || !$course || !$education || !$hearAboutUs || !$gender || !$age) {
    respond(400, ['status' => 'error', 'message' => 'Please complete all required fields.']);
}

if ($age < 10 || $age > 100) {
    respond(400, ['status' => 'error', 'message' => 'Please enter a valid age.']);
}

$existing = supabase_request('GET', 'admissions?select=id&cnic=eq.' . rawurlencode($cnic) . '&limit=1');
if (is_array($existing) && count($existing) > 0) {
    respond(409, ['status' => 'error', 'message' => 'This CNIC is already registered.']);
}

$row = [
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'cnic' => $cnic,
    'course' => $course,
    'education' => $education,
    'hear_about_us' => $hearAboutUs,
    'gender' => $gender,
    'age' => $age,
    'referred_by' => $referredBy,
    'status' => 'Pending',
    'submitted_at' => gmdate('c'),
];

$created = supabase_request('POST', 'admissions?select=*', [$row], 'return=representation');
respond(200, [
    'status' => 'success',
    'message' => 'Registration submitted successfully.',
    'data' => $created[0] ?? null,
]);
?>
