<?php
require_once __DIR__ . '/../auth/_otp_common.php';

function hr_respond($status, $payload) {
    http_response_code($status);
    echo json_encode($payload);
    exit();
}

function hr_load_env_file() {
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

function hr_supabase_request($method, $path, $payload = null, $prefer = '') {
    $env = hr_load_env_file();
    $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
    $key = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

    if (!$url || !$key) {
        hr_respond(500, ['status' => 'error', 'message' => 'Supabase service configuration is missing.']);
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
        hr_respond($status, ['status' => 'error', 'message' => $message]);
    }

    return $decoded;
}

function hr_json_input() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        hr_respond(400, ['status' => 'error', 'message' => 'Invalid request data.']);
    }
    return $data;
}

function hr_normalize_cnic($value) {
    $digits = preg_replace('/\D+/', '', (string) $value);
    if (strlen($digits) !== 13) return '';
    return substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . substr($digits, 12, 1);
}

function hr_first($rows) {
    return is_array($rows) ? ($rows[0] ?? null) : null;
}

function hr_require_teacher($cnic) {
    $cnic = hr_normalize_cnic($cnic);
    if (!$cnic) {
        hr_respond(400, ['status' => 'error', 'message' => 'Valid teacher CNIC is required.']);
    }

    $allowed = hr_first(hr_supabase_request('GET', 'allowed_cnics?select=role&cnic=eq.' . rawurlencode($cnic) . '&limit=1'));
    if (!$allowed || ($allowed['role'] ?? '') !== 'teacher') {
        hr_respond(403, ['status' => 'error', 'message' => 'Teacher access is required.']);
    }

    $teacher = hr_first(hr_supabase_request('GET', 'teachers?select=*&cnic=eq.' . rawurlencode($cnic) . '&limit=1'));
    $status = $teacher['status'] ?? '';
    if (!$teacher || !in_array($status, ['Active', 'Pending', 'Onboarding'])) {
        hr_respond(403, ['status' => 'error', 'message' => 'Valid teacher profile not found or inactive.']);
    }

    return $teacher;
}

function hr_get_or_create_profile($teacher) {
    $profile = hr_first(hr_supabase_request('GET', 'hr_profiles?select=*&teacher_id=eq.' . rawurlencode($teacher['id']) . '&limit=1'));
    if ($profile) return $profile;

    $payload = [[
        'teacher_id' => $teacher['id'],
        'full_name' => $teacher['name'] ?? '',
        'cnic' => $teacher['cnic'] ?? '',
        'personal_email' => $teacher['email'] ?? '',
        'specialization' => $teacher['specialization'] ?? '',
        'current_step' => 1,
        'hr_status' => 'pending',
        'created_at' => gmdate('c'),
        'updated_at' => gmdate('c'),
    ]];

    return hr_first(hr_supabase_request('POST', 'hr_profiles?select=*', $payload, 'return=representation'));
}

function hr_require_owned_profile($teacher, $profileId) {
    if (!$profileId) {
        hr_respond(400, ['status' => 'error', 'message' => 'HR profile is required.']);
    }

    $profile = hr_first(hr_supabase_request(
        'GET',
        'hr_profiles?select=*&id=eq.' . rawurlencode($profileId) . '&teacher_id=eq.' . rawurlencode($teacher['id']) . '&limit=1'
    ));
    if (!$profile) {
        hr_respond(403, ['status' => 'error', 'message' => 'HR profile access denied.']);
    }
    return $profile;
}

function hr_bundle($teacher, $profile) {
    $profileId = $profile['id'];
    $documents = hr_supabase_request('GET', 'hr_documents?select=*&hr_profile_id=eq.' . rawurlencode($profileId) . '&order=uploaded_at.asc');
    $jd = hr_first(hr_supabase_request('GET', 'hr_jds?select=*&hr_profile_id=eq.' . rawurlencode($profileId) . '&limit=1'));
    $signature = hr_first(hr_supabase_request('GET', 'hr_signatures?select=*&hr_profile_id=eq.' . rawurlencode($profileId) . '&limit=1'));
    $files = hr_supabase_request('GET', 'hr_files?select=*&hr_profile_id=eq.' . rawurlencode($profileId) . '&order=generated_at.desc');

    return [
        'teacher' => $teacher,
        'profile' => $profile,
        'documents' => is_array($documents) ? $documents : [],
        'jd' => $jd,
        'signature' => $signature,
        'files' => is_array($files) ? $files : [],
    ];
}

function hr_pick_profile_fields($profile, $teacher) {
    $allowed = [
        'father_name', 'date_of_birth', 'gender', 'personal_phone', 'personal_email',
        'current_address', 'permanent_address', 'years_experience', 'last_employer',
        'linkedin', 'expected_salary', 'available_to_join', 'teaching_mode',
        'emergency_name', 'emergency_relationship', 'emergency_phone',
    ];
    $payload = [];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $profile)) {
            $payload[$field] = $profile[$field];
        }
    }
    $payload['teacher_id'] = $teacher['id'];
    $payload['full_name'] = $teacher['name'] ?? ($profile['full_name'] ?? '');
    $payload['cnic'] = $teacher['cnic'];
    $payload['specialization'] = $teacher['specialization'] ?? ($profile['specialization'] ?? '');
    $payload['updated_at'] = gmdate('c');
    return $payload;
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
    hr_respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = hr_json_input();
$action = $data['action'] ?? '';
$requestedCnic = !empty($data['cnic']) ? hr_normalize_cnic($data['cnic']) : null;
$session = portal_require_session(['teacher'], $requestedCnic);
$teacher = hr_require_teacher($session['cnic']);
$now = gmdate('c');

if ($action === 'load') {
    $profile = hr_get_or_create_profile($teacher);
    hr_respond(200, ['status' => 'success', 'data' => hr_bundle($teacher, $profile)]);
}

if ($action === 'save_profile') {
    $profileInput = is_array($data['profile'] ?? null) ? $data['profile'] : [];
    $payload = hr_pick_profile_fields($profileInput, $teacher);
    $rows = hr_supabase_request(
        'POST',
        'hr_profiles?select=*&on_conflict=teacher_id',
        [$payload],
        'resolution=merge-duplicates,return=representation'
    );
    $profile = hr_first($rows);
    if (!$profile) {
        hr_respond(500, ['status' => 'error', 'message' => 'Unable to save HR profile.']);
    }
    if ((int)($profile['current_step'] ?? 1) < 2) {
        $profile = hr_first(hr_supabase_request(
            'PATCH',
            'hr_profiles?id=eq.' . rawurlencode($profile['id']) . '&select=*',
            ['current_step' => 2, 'updated_at' => $now],
            'return=representation'
        ));
    }

    if (!empty($payload['expected_salary']) && is_numeric($payload['expected_salary'])) {
        hr_supabase_request(
            'POST',
            'teacher_salaries?on_conflict=teacher_id',
            [[
                'teacher_id' => $teacher['id'],
                'monthly_amount' => (float)$payload['expected_salary'],
                'effective_from' => gmdate('Y-m-d')
            ]],
            'resolution=merge-duplicates,return=minimal'
        );
    }

    hr_respond(200, ['status' => 'success', 'data' => $profile]);
}

if ($action === 'add_document') {
    $profile = hr_require_owned_profile($teacher, $data['profileId'] ?? '');
    $file = is_array($data['file'] ?? null) ? $data['file'] : [];
    $payload = [[
        'hr_profile_id' => $profile['id'],
        'category' => substr((string)($data['category'] ?? ''), 0, 100),
        'doc_type' => substr((string)($data['docType'] ?? ''), 0, 100),
        'file_name' => $file['fileName'] ?? null,
        'file_size' => isset($file['fileSize']) ? (string)$file['fileSize'] : null,
        'file_url' => $file['fileUrl'] ?? null,
        'file_path' => $file['filePath'] ?? null,
        'mime_type' => $file['mimeType'] ?? null,
        'link_url' => $data['linkUrl'] ?? null,
        'is_required' => (bool)($data['isRequired'] ?? false),
        'uploaded_at' => $now,
    ]];
    $doc = hr_first(hr_supabase_request('POST', 'hr_documents?select=*', $payload, 'return=representation'));
    hr_respond(200, ['status' => 'success', 'data' => $doc]);
}

if ($action === 'remove_document') {
    $doc = hr_first(hr_supabase_request('GET', 'hr_documents?select=*&id=eq.' . rawurlencode($data['documentId'] ?? '') . '&limit=1'));
    if (!$doc) {
        hr_respond(404, ['status' => 'error', 'message' => 'Document not found.']);
    }
    hr_require_owned_profile($teacher, $doc['hr_profile_id']);
    hr_supabase_request('DELETE', 'hr_documents?id=eq.' . rawurlencode($doc['id']), null, 'return=minimal');
    hr_respond(200, ['status' => 'success']);
}

if ($action === 'submit_documents') {
    $profile = hr_require_owned_profile($teacher, $data['profileId'] ?? '');
    hr_supabase_request(
        'PATCH',
        'hr_profiles?id=eq.' . rawurlencode($profile['id']),
        ['current_step' => 3, 'hr_status' => 'pending', 'documents_submitted_at' => $now, 'updated_at' => $now],
        'return=minimal'
    );
    hr_respond(200, ['status' => 'success']);
}

if ($action === 'approve_jd') {
    $profile = hr_require_owned_profile($teacher, $data['profileId'] ?? '');
    $jd = hr_first(hr_supabase_request(
        'GET',
        'hr_jds?select=*&id=eq.' . rawurlencode($data['jdId'] ?? '') . '&hr_profile_id=eq.' . rawurlencode($profile['id']) . '&limit=1'
    ));
    if (!$jd) {
        hr_respond(404, ['status' => 'error', 'message' => 'Job description not found.']);
    }
    hr_supabase_request('PATCH', 'hr_jds?id=eq.' . rawurlencode($jd['id']), ['teacher_status' => 'approved', 'approved_at' => $now, 'updated_at' => $now], 'return=minimal');
    hr_supabase_request('PATCH', 'hr_profiles?id=eq.' . rawurlencode($profile['id']), ['current_step' => 4, 'hr_status' => 'jd_approved', 'updated_at' => $now], 'return=minimal');
    hr_respond(200, ['status' => 'success']);
}

if ($action === 'request_jd_changes') {
    $profile = hr_get_or_create_profile($teacher);
    $jd = hr_first(hr_supabase_request(
        'GET',
        'hr_jds?select=*&id=eq.' . rawurlencode($data['jdId'] ?? '') . '&hr_profile_id=eq.' . rawurlencode($profile['id']) . '&limit=1'
    ));
    if (!$jd) {
        hr_respond(404, ['status' => 'error', 'message' => 'Job description not found.']);
    }
    hr_supabase_request(
        'PATCH',
        'hr_jds?id=eq.' . rawurlencode($jd['id']),
        [
            'teacher_status' => 'changes_requested',
            'change_request' => substr((string)($data['message'] ?? ''), 0, 2000),
            'is_sent_to_teacher' => false,
            'updated_at' => $now,
        ],
        'return=minimal'
    );
    hr_respond(200, ['status' => 'success']);
}

if ($action === 'save_signature') {
    $profile = hr_require_owned_profile($teacher, $data['profileId'] ?? '');
    $signature = is_array($data['signature'] ?? null) ? $data['signature'] : [];
    $row = [
        'hr_profile_id' => $profile['id'],
        'signature_type' => $signature['signatureType'] ?? 'typed',
        'signature_data' => $signature['signatureData'] ?? '',
        'signed_at' => $now,
    ];
    $existing = hr_first(hr_supabase_request('GET', 'hr_signatures?select=*&hr_profile_id=eq.' . rawurlencode($profile['id']) . '&limit=1'));
    if ($existing) {
        $saved = hr_first(hr_supabase_request('PATCH', 'hr_signatures?id=eq.' . rawurlencode($existing['id']) . '&select=*', $row, 'return=representation'));
    } else {
        $saved = hr_first(hr_supabase_request('POST', 'hr_signatures?select=*', [$row], 'return=representation'));
    }
    hr_supabase_request('PATCH', 'hr_profiles?id=eq.' . rawurlencode($profile['id']), ['current_step' => 5, 'hr_status' => 'signed', 'updated_at' => $now], 'return=minimal');
    hr_respond(200, ['status' => 'success', 'data' => $saved]);
}

hr_respond(400, ['status' => 'error', 'message' => 'Unknown HR action.']);
?>
