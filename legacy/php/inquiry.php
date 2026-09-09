<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
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
        __DIR__ . '/.env',
        __DIR__ . '/.env.local',
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
            $env[trim(substr($line, 0, $pos))] = trim(trim(substr($line, $pos + 1)), "\"'");
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
    if (!$url || !$key) respond(500, ['status' => 'error', 'message' => 'Supabase configuration is missing.']);
    $headers = [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
    ];
    if ($prefer) $headers[] = 'Prefer: ' . $prefer;
    $context = ['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'ignore_errors' => true]];
    if ($payload !== null) $context['http']['content'] = json_encode($payload);
    $response = file_get_contents($url . '/rest/v1/' . $path, false, stream_context_create($context));
    $status = 0;
    $headersOut = function_exists('http_get_last_response_headers') ? http_get_last_response_headers() : ($http_response_header ?? []);
    if (isset($headersOut[0]) && preg_match('/\s(\d{3})\s/', $headersOut[0], $matches)) $status = (int) $matches[1];
    $decoded = json_decode($response ?: 'null', true);
    if ($status >= 400) {
        $message = is_array($decoded) ? ($decoded['message'] ?? $decoded['error'] ?? 'Inquiry request failed.') : 'Inquiry request failed.';
        respond($status, ['status' => 'error', 'message' => $message]);
    }
    return $decoded;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) respond(400, ['status' => 'error', 'message' => 'Invalid inquiry data.']);
if (!empty($data['bot-field'])) respond(200, ['status' => 'success', 'message' => 'Inquiry received.']);

$name = clean_text($data['name'] ?? '', 120);
$phone = clean_text($data['phone'] ?? '', 30);
$email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
$cnic = clean_text($data['cnic'] ?? '', 30);
$city = clean_text($data['city'] ?? '', 80);
$course = clean_text($data['course_interest'] ?? $data['courseInterest'] ?? '', 160);
$source = clean_text($data['hear_about_us'] ?? $data['hearAboutUs'] ?? '', 120);
$message = clean_text($data['message'] ?? '', 1000);
$referralCode = clean_text($data['referral_code'] ?? $data['referralCode'] ?? '', 120);

if (!$name || !$phone || !$email || !$cnic || !$city || !$course || !$source) {
    respond(400, ['status' => 'error', 'message' => 'Please complete all required fields.']);
}

$created = supabase_request('POST', 'inquiries?select=*', [[
    'name' => $name,
    'phone' => $phone,
    'email' => $email,
    'cnic' => $cnic,
    'city' => $city,
    'course_interest' => $course,
    'hear_about_us' => $source,
    'message' => $message,
    'referral_code' => $referralCode,
    'status' => 'new',
    'submitted_at' => gmdate('c'),
    'last_updated' => gmdate('c'),
]], 'return=representation');

respond(200, ['status' => 'success', 'message' => 'Inquiry received.', 'data' => $created[0] ?? null]);
?>
