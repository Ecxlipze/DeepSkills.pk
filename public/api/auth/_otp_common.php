<?php
function otp_respond($status, $payload) {
    if (!headers_sent()) {
        http_response_code($status);
    }
    echo json_encode($payload);
    exit();
}

function otp_load_env_file() {
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

function otp_clean_text($value, $max = 200) {
    $value = preg_replace('/[<>]/', '', (string) $value);
    $value = preg_replace('/[\x00-\x1F\x7F]/', '', $value);
    return substr(trim($value), 0, $max);
}

function otp_normalize_cnic($value) {
    $digits = preg_replace('/\D+/', '', (string) $value);
    if (strlen($digits) !== 13) return '';
    return substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . substr($digits, 12, 1);
}

function otp_supabase_request($method, $path, $payload = null, $prefer = '') {
    $env = otp_load_env_file();
    $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
    $key = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

    if (!$url || !$key) {
        otp_respond(500, ['status' => 'error', 'message' => 'Supabase service configuration is missing.']);
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
        otp_respond($status, ['status' => 'error', 'message' => $message]);
    }

    return $decoded;
}

function otp_json_input() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        otp_respond(400, ['status' => 'error', 'message' => 'Invalid request data.']);
    }
    return $data;
}

function otp_bootstrap() {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        otp_respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
    }
}

function otp_send_mail($email, $name, $code) {
    $safeName = htmlspecialchars($name ?: 'DeepSkills user', ENT_QUOTES, 'UTF-8');
    $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    $subject = 'DeepSkills login OTP';
    $fromEmail = 'info@deepskills.pk';
    $message = "
    <html>
    <body style='margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#222;'>
      <div style='max-width:620px;margin:0 auto;background:#ffffff;'>
        <div style='background:#7B1F2E;color:#ffffff;padding:22px 26px;'>
          <h1 style='margin:0;font-size:23px;'>DeepSkills</h1>
        </div>
        <div style='padding:28px;'>
          <h2 style='margin:0 0 14px;color:#7B1F2E;font-size:21px;'>Login verification</h2>
          <p>Dear {$safeName},</p>
          <p>Your one-time login code is:</p>
          <div style='font-size:30px;letter-spacing:8px;font-weight:700;background:#f8eef0;color:#7B1F2E;padding:16px 18px;text-align:center;border-radius:10px;'>{$safeCode}</div>
          <p style='margin-top:22px;'>This code expires in 10 minutes. Do not share it with anyone.</p>
          <p>Regards,<br><strong>DeepSkills Team</strong></p>
        </div>
      </div>
    </body>
    </html>";

    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8\r\n";
    $headers .= "From: DeepSkills <{$fromEmail}>\r\n";
    $headers .= "Reply-To: {$fromEmail}\r\n";

    return mail($email, $subject, $message, $headers);
}

function otp_get_bearer_token() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $matches)) {
        return trim($matches[1]);
    }
    return '';
}

function otp_verify_session($expectedRole, $requestedCnic = null, $tokenOverride = null) {
    $token = $tokenOverride ?: otp_get_bearer_token();
    if (!$token) {
        $input = json_decode(file_get_contents('php://input'), true);
        if (is_array($input) && !empty($input['token'])) {
            $token = trim((string)$input['token']);
        } elseif (is_array($input) && !empty($input['sessionToken'])) {
            $token = trim((string)$input['sessionToken']);
        }
    }

    if (!$token) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'missing_token',
            'message' => 'Authentication token is required. Please log in again.'
        ]);
    }

    $parts = explode('.', $token, 2);
    if (count($parts) !== 2 || empty($parts[0]) || empty($parts[1])) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'invalid_token_format',
            'message' => 'Invalid authentication token format. Please log in again.'
        ]);
    }

    $rowId = $parts[0];
    $rawSecret = $parts[1];

    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $rowId)) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'invalid_token_format',
            'message' => 'Invalid authentication token format. Please log in again.'
        ]);
    }

    $now = gmdate('c');
    $rows = otp_supabase_request(
        'GET',
        'login_otps?select=id,cnic,role,token_hash,token_expires_at&id=eq.' . rawurlencode($rowId) . '&limit=1'
    );

    $row = is_array($rows) ? ($rows[0] ?? null) : null;
    if (!$row || empty($row['token_hash'])) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'session_not_found',
            'message' => 'Session not found or expired. Please log in again.'
        ]);
    }

    if (!empty($row['token_expires_at']) && $row['token_expires_at'] < $now) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'session_expired',
            'message' => 'Session expired. Please log in again.'
        ]);
    }

    if (!password_verify($rawSecret, $row['token_hash'])) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'invalid_token',
            'message' => 'Invalid authentication token. Please log in again.'
        ]);
    }

    if ($expectedRole && ($row['role'] ?? '') !== $expectedRole) {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'role_mismatch',
            'message' => 'Access denied: token role does not match required role.'
        ]);
    }

    $sessionCnic = otp_normalize_cnic($row['cnic'] ?? '');
    if (!$sessionCnic) {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'invalid_session_cnic',
            'message' => 'Session record is missing a valid CNIC.'
        ]);
    }

    if ($requestedCnic) {
        $normRequested = otp_normalize_cnic($requestedCnic);
        if ($normRequested && $normRequested !== $sessionCnic) {
            otp_respond(403, [
                'status' => 'error',
                'code' => 'ownership_violation',
                'message' => 'Access denied: token does not belong to the requested user.'
            ]);
        }
    }

    return $sessionCnic;
}
?>
