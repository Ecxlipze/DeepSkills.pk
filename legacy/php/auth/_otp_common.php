<?php
function otp_respond($status, $payload) {
    if (isset($GLOBALS['__OTP_TEST_HOOK__']) && is_callable($GLOBALS['__OTP_TEST_HOOK__'])) {
        call_user_func($GLOBALS['__OTP_TEST_HOOK__'], $status, $payload);
    }
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

function otp_supabase_request($method, $path, $payload = null, $prefer = '', $throwOnError = false) {
    if (isset($GLOBALS['__OTP_REQUEST_HOOK__']) && is_callable($GLOBALS['__OTP_REQUEST_HOOK__'])) {
        return call_user_func($GLOBALS['__OTP_REQUEST_HOOK__'], $method, $path, $payload, $prefer, $throwOnError);
    }
    $env = otp_load_env_file();
    $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
    $key = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

    if (!$url || !$key) {
        if ($throwOnError) {
            throw new Exception('Supabase service configuration is missing.');
        }
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
        if ($throwOnError) {
            throw new Exception($message, $status);
        }
        otp_respond($status, ['status' => 'error', 'message' => $message]);
    }

    return $decoded;
}

function otp_json_input() {
    if (isset($GLOBALS['__OTP_INPUT__'])) {
        $data = is_string($GLOBALS['__OTP_INPUT__']) ? json_decode($GLOBALS['__OTP_INPUT__'], true) : $GLOBALS['__OTP_INPUT__'];
        if (!is_array($data)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Invalid request data.']);
        }
        return $data;
    }
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        otp_respond(400, ['status' => 'error', 'message' => 'Invalid request data.']);
    }
    return $data;
}

function otp_bootstrap($allowedMethods = ['POST']) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: ' . implode(', ', array_unique(array_merge($allowedMethods, ['OPTIONS']))));
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    if (!in_array($_SERVER['REQUEST_METHOD'], $allowedMethods, true)) {
        otp_respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
    }
}

function otp_send_mail($email, $name, $code) {
    if (isset($GLOBALS['__OTP_MAIL_HOOK__']) && is_callable($GLOBALS['__OTP_MAIL_HOOK__'])) {
        return call_user_func($GLOBALS['__OTP_MAIL_HOOK__'], $email, $name, $code);
    }
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

function auth_first($rows) {
    return is_array($rows) ? ($rows[0] ?? null) : null;
}

function auth_permissions($permissions) {
    $moduleKeys = [
        'dashboard', 'counsellor', 'students', 'teachers', 'courses', 'attendance',
        'tasks', 'results', 'finance', 'complaints', 'announcements', 'blog',
        'referral', 'reports', 'hr', 'users', 'settings'
    ];
    $source = is_array($permissions) ? $permissions : [];
    $normalized = [];
    foreach ($moduleKeys as $key) {
        $normalized[$key] = $source[$key] ?? 'none';
    }
    return $normalized;
}

function auth_build_user($cnic) {
    $roleData = auth_first(otp_supabase_request(
        'GET',
        'allowed_cnics?select=*&cnic=eq.' . rawurlencode($cnic) . '&limit=1'
    ));

    if (!$roleData) {
        $latestAdmission = auth_first(otp_supabase_request(
            'GET',
            'admissions?select=status&cnic=eq.' . rawurlencode($cnic) . '&order=submitted_at.desc&limit=1'
        ));

        if (!empty($latestAdmission['status'])) {
            $status = strtolower($latestAdmission['status']);
            if ($status === 'pending') {
                otp_respond(403, ['status' => 'error', 'message' => 'Your registration is pending admin approval. You can log in after your admission is approved.']);
            }
            otp_respond(403, ['status' => 'error', 'message' => 'Your admission is ' . $status . '. Please contact the administrator.']);
        }

        otp_respond(403, ['status' => 'error', 'message' => 'Access denied. No account found for this CNIC.']);
    }

    $role = $roleData['role'] ?? '';
    if ($role === 'teacher') {
        $teacher = auth_first(otp_supabase_request(
            'GET',
            'teachers?select=id,status&cnic=eq.' . rawurlencode($cnic) . '&limit=1'
        ));
        if (!$teacher) {
            otp_respond(404, ['status' => 'error', 'message' => 'Teacher profile not found.']);
        }
        $teacherStatus = $teacher['status'] ?? 'Inactive';
        if (!in_array($teacherStatus, ['Active', 'Pending', 'Onboarding'])) {
            otp_respond(403, ['status' => 'error', 'message' => 'Your account is ' . strtolower($teacherStatus) . '. Please contact the administrator.']);
        }
        return array_merge($roleData, [
            'id' => $teacher['id'] ?? ($roleData['id'] ?? null),
            'name' => $roleData['name'] ?? '',
            'status' => $teacherStatus,
            'authType' => 'cnic',
            'permissions' => (object) [],
        ]);
    }

    if ($role === 'student') {
        $admission = auth_first(otp_supabase_request(
            'GET',
            'admissions?select=*&cnic=eq.' . rawurlencode($cnic) . '&status=in.(Active,Graduated)&order=submitted_at.desc&limit=1'
        ));
        if (!$admission) {
            otp_respond(404, ['status' => 'error', 'message' => 'Student admission record not found.']);
        }
        return array_merge($roleData, [
            'id' => $admission['id'] ?? ($roleData['id'] ?? null),
            'name' => $roleData['name'] ?? ($admission['name'] ?? ''),
            'assigned_course' => $admission['course'] ?? ($roleData['assigned_course'] ?? null),
            'course' => $admission['course'] ?? ($roleData['assigned_course'] ?? null),
            'batch' => $admission['batch'] ?? ($roleData['batch'] ?? null),
            'batch_timing' => $admission['batch_timing'] ?? ($roleData['batch_timing'] ?? null),
            'status' => $admission['status'],
            'authType' => 'cnic',
            'permissions' => (object) [],
        ]);
    }

    $directoryUser = auth_first(otp_supabase_request(
        'GET',
        'users?select=*,custom_roles(id,name,color,icon,permissions)&cnic=eq.' . rawurlencode($cnic) . '&limit=1'
    ));
    if (!$directoryUser) {
        otp_respond(404, ['status' => 'error', 'message' => 'User directory record not found.']);
    }
    if (($directoryUser['status'] ?? '') !== 'active') {
        otp_respond(403, ['status' => 'error', 'message' => 'Your account is ' . ($directoryUser['status'] ?? 'inactive') . '. Please contact the administrator.']);
    }

    $customRole = is_array($directoryUser['custom_roles'] ?? null) ? $directoryUser['custom_roles'] : null;
    $permissions = $role === 'admin' ? null : auth_permissions($customRole['permissions'] ?? ($directoryUser['permissions'] ?? []));
    if ($role === 'admin') {
        $permissions = [];
        foreach (auth_permissions([]) as $key => $_) {
            $permissions[$key] = 'full';
        }
    }

    return [
        'id' => $directoryUser['id'],
        'cnic' => $directoryUser['cnic'],
        'email' => $directoryUser['email'] ?? null,
        'phone' => $directoryUser['phone'] ?? null,
        'name' => $directoryUser['full_name'],
        'role' => $directoryUser['role'],
        'status' => $directoryUser['status'],
        'customRoleId' => $directoryUser['custom_role_id'] ?? null,
        'permissions' => $permissions,
        'authType' => 'cnic',
    ];
}

function portal_create_session($cnic, $role, $actorId = null, $actorType = 'user') {
    $sessionSecret = bin2hex(random_bytes(32));
    $tokenHash = password_hash($sessionSecret, PASSWORD_DEFAULT);
    $now = gmdate('c');
    $sessionExpiry = gmdate('c', time() + (86400 * 30)); // 30 days
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';

    $row = [
        'token_hash' => $tokenHash,
        'cnic' => $cnic,
        'role' => $role,
        'actor_id' => $actorId,
        'actor_type' => $actorType,
        'created_at' => $now,
        'expires_at' => $sessionExpiry,
        'user_agent' => $userAgent,
        'ip_address' => $ipAddress,
    ];

    try {
        $inserted = otp_supabase_request('POST', 'portal_sessions', [$row], 'return=representation', true);
        if (is_array($inserted) && isset($inserted[0]['id'])) {
            $sessionId = $inserted[0]['id'];
            return [
                'sessionId' => $sessionId,
                'sessionSecret' => $sessionSecret,
                'fullSessionToken' => $sessionId . '.' . $sessionSecret,
                'expiresAt' => $sessionExpiry,
                'table' => 'portal_sessions'
            ];
        }
    } catch (Exception $e) {
        // Table may not exist yet in live DB during transition; fallback to login_otps
    }

    // Backwards-compatible fallback
    $fallbackRow = [
        'cnic' => $cnic,
        'email' => 'session_' . substr(md5($cnic), 0, 8) . '@deepskills.pk',
        'role' => $role,
        'otp_hash' => password_hash(bin2hex(random_bytes(6)), PASSWORD_DEFAULT),
        'expires_at' => $now,
        'consumed_at' => $now,
        'token_hash' => $tokenHash,
        'token_expires_at' => $sessionExpiry,
        'token_used_at' => $now,
        'user_agent' => $userAgent,
        'ip_address' => $ipAddress,
    ];
    $inserted = otp_supabase_request('POST', 'login_otps', [$fallbackRow], 'return=representation');
    $sessionId = $inserted[0]['id'] ?? '';
    return [
        'sessionId' => $sessionId,
        'sessionSecret' => $sessionSecret,
        'fullSessionToken' => $sessionId . '.' . $sessionSecret,
        'expiresAt' => $sessionExpiry,
        'table' => 'login_otps'
    ];
}

function portal_require_session($allowedRoles = [], $requestedCnic = null, $tokenOverride = null) {
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
    $row = null;
    $isPortalSession = false;

    // 1. Check portal_sessions first
    try {
        $rows = otp_supabase_request(
            'GET',
            'portal_sessions?select=*&id=eq.' . rawurlencode($rowId) . '&limit=1',
            null,
            '',
            true
        );
        if (is_array($rows) && !empty($rows[0])) {
            $row = $rows[0];
            $isPortalSession = true;
        }
    } catch (Exception $e) {
        // Fallback if portal_sessions table not yet present in schema
    }

    // 2. Check login_otps fallback
    if (!$row) {
        $rows = otp_supabase_request(
            'GET',
            'login_otps?select=id,cnic,role,token_hash,token_expires_at&id=eq.' . rawurlencode($rowId) . '&limit=1'
        );
        $row = is_array($rows) ? ($rows[0] ?? null) : null;
        if ($row) {
            $row['expires_at'] = $row['token_expires_at'] ?? null;
            $row['revoked_at'] = null;
            $row['actor_id'] = null;
            $row['actor_type'] = $row['role'] === 'student' ? 'student' : ($row['role'] === 'teacher' ? 'teacher' : 'user');
        }
    }

    if (!$row || empty($row['token_hash'])) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'session_not_found',
            'message' => 'Session not found or expired. Please log in again.'
        ]);
    }

    if (!empty($row['revoked_at'])) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'session_revoked',
            'message' => 'Session has been logged out or revoked. Please log in again.'
        ]);
    }

    if (empty($row['expires_at'])) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'session_expiry_missing',
            'message' => 'Session expiry is missing. Please log in again.'
        ]);
    }

    $expiry = strtotime($row['expires_at']);
    if ($expiry === false) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'session_expiry_invalid',
            'message' => 'Session expiry is invalid. Please log in again.'
        ]);
    }

    if ($expiry <= time()) {
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

    $roles = is_array($allowedRoles) ? $allowedRoles : (is_string($allowedRoles) && $allowedRoles !== '' ? [$allowedRoles] : []);
    if (!empty($roles) && !in_array($row['role'] ?? '', $roles, true)) {
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

    if ($isPortalSession) {
        $lastSeen = !empty($row['last_seen_at']) ? strtotime($row['last_seen_at']) : 0;
        if (time() - $lastSeen > 300) {
            otp_supabase_request('PATCH', 'portal_sessions?id=eq.' . rawurlencode($row['id']), [
                'last_seen_at' => $now
            ], 'return=minimal');
        }
    }

    return [
        'id' => $row['id'],
        'cnic' => $sessionCnic,
        'role' => $row['role'],
        'actor_id' => $row['actor_id'] ?? null,
        'actor_type' => $row['actor_type'] ?? ($row['role'] === 'student' ? 'student' : ($row['role'] === 'teacher' ? 'teacher' : 'user')),
        'expires_at' => $row['expires_at'],
        'table' => $isPortalSession ? 'portal_sessions' : 'login_otps',
    ];
}

function otp_verify_session($expectedRole, $requestedCnic = null, $tokenOverride = null) {
    $roles = $expectedRole ? [$expectedRole] : [];
    $session = portal_require_session($roles, $requestedCnic, $tokenOverride);
    return $session['cnic'];
}

function portal_authorize_admin_operation($requiredPermissionKey = null) {
    $token = otp_get_bearer_token();
    if (!$token) {
        otp_respond(401, [
            'status' => 'error',
            'code' => 'missing_token',
            'message' => 'Authentication token is required for this operation.'
        ]);
    }

    $segments = explode('.', $token);

    // 1. Supabase JWT (Super Admin)
    if (count($segments) === 3) {
        $user = null;
        if (isset($GLOBALS['__OTP_AUTH_HOOK__']) && is_callable($GLOBALS['__OTP_AUTH_HOOK__'])) {
            $user = call_user_func($GLOBALS['__OTP_AUTH_HOOK__'], $token);
        } else {
            $env = otp_load_env_file();
            $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
            $anonKey = $env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? $env['REACT_APP_SUPABASE_ANON_KEY'] ?? '';

            $ch = curl_init($url . '/auth/v1/user');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'apikey: ' . $anonKey,
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code === 200) {
                $user = json_decode($res, true);
            }
        }

        if (!is_array($user) || empty($user['id'])) {
            otp_respond(401, [
                'status' => 'error',
                'code' => 'invalid_admin_token',
                'message' => 'Invalid or expired Super Admin credentials.'
            ]);
        }

        $isTrustedAdmin = false;
        if (($user['app_metadata']['role'] ?? '') === 'admin' || !empty($user['app_metadata']['claims_admin'])) {
            $isTrustedAdmin = true;
        }

        try {
            $queryPath = !empty($user['email'])
                ? 'users?select=id,full_name,role,status,custom_roles(permissions),permissions&email=ilike.' . rawurlencode(trim($user['email'])) . '&limit=1'
                : 'users?select=id,full_name,role,status,custom_roles(permissions),permissions&id=eq.' . rawurlencode($user['id']) . '&limit=1';
            $userRow = auth_first(otp_supabase_request('GET', $queryPath));
            if ($userRow) {
                if (($userRow['status'] ?? '') !== 'active') {
                    otp_respond(403, [
                        'status' => 'error',
                        'code' => 'account_inactive',
                        'message' => 'User account is inactive, suspended, or demoted.'
                    ]);
                }
                $userRole = strtolower($userRow['role'] ?? '');
                if (in_array($userRole, ['admin', 'super_admin', 'superadmin', 'owner'], true)) {
                    $isTrustedAdmin = true;
                } else if ($userRole === 'custom') {
                    $isTrustedAdmin = false;
                    $customRole = is_array($userRow['custom_roles'] ?? null) ? $userRow['custom_roles'] : null;
                    $permissions = auth_permissions($customRole['permissions'] ?? ($userRow['permissions'] ?? []));
                    if ($requiredPermissionKey) {
                        $requiredKeys = is_array($requiredPermissionKey) ? $requiredPermissionKey : [$requiredPermissionKey];
                        $hasPerm = ($permissions['all'] ?? 'none') === 'full';
                        if (!$hasPerm) {
                            foreach ($requiredKeys as $key) {
                                if (($permissions[$key] ?? 'none') === 'full') {
                                    $hasPerm = true;
                                    break;
                                }
                            }
                        }
                        if (!$hasPerm) {
                            $keyList = implode(' or ', $requiredKeys);
                            otp_respond(403, [
                                'status' => 'error',
                                'code' => 'insufficient_permissions',
                                'message' => "Insufficient permissions (requires 'full' on {$keyList})."
                            ]);
                        }
                    }
                    return [
                        'type' => 'supabase_admin',
                        'user' => $user,
                        'role' => 'custom',
                        'permissions' => $permissions
                    ];
                }
            } else {
                // Any verified Supabase Auth user not explicitly demoted or custom in the directory is trusted as Super Admin
                $isTrustedAdmin = true;
            }
        } catch (Exception $e) {
            // Fallback for directory lookup error - trust verified Supabase Auth user
            $isTrustedAdmin = true;
        }

        if ($isTrustedAdmin) {
            return [
                'type' => 'supabase_admin',
                'user' => $user,
                'role' => 'admin',
                'permissions' => ['all' => 'full']
            ];
        }

        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Access denied: administrator privileges required.'
        ]);
    }

    // 2. Portal Session Token (<uuid>.<secret>)
    if (count($segments) === 2 && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $segments[0])) {
        $session = portal_require_session(['admin', 'custom'], null, $token);
        $role = $session['role'];

        $directoryUser = auth_first(otp_supabase_request(
            'GET',
            'users?select=*,custom_roles(permissions)&cnic=eq.' . rawurlencode($session['cnic']) . '&limit=1'
        ));

        if ($directoryUser) {
            if (($directoryUser['status'] ?? '') !== 'active') {
                otp_respond(403, [
                    'status' => 'error',
                    'code' => 'account_inactive',
                    'message' => 'Staff account is inactive, suspended, or demoted.'
                ]);
            }
            $dirRole = strtolower($directoryUser['role'] ?? '');
            if (!in_array($dirRole, ['admin', 'super_admin', 'superadmin', 'owner'], true) && $role === 'admin') {
                otp_respond(403, [
                    'status' => 'error',
                    'code' => 'insufficient_permissions',
                    'message' => 'Access denied: administrator role has been revoked.'
                ]);
            }
        }

        $resolvedRole = strtolower($directoryUser['role'] ?? $role);
        if (in_array($resolvedRole, ['admin', 'super_admin', 'superadmin', 'owner'], true) || ($role === 'admin' && (!$directoryUser || ($directoryUser['role'] ?? '') === 'admin'))) {
            return [
                'type' => 'portal_session',
                'session' => $session,
                'role' => 'admin',
                'permissions' => ['all' => 'full']
            ];
        }

        if (!$directoryUser) {
            otp_respond(403, [
                'status' => 'error',
                'code' => 'account_inactive',
                'message' => 'Staff account not found in directory.'
            ]);
        }

        $customRole = is_array($directoryUser['custom_roles'] ?? null) ? $directoryUser['custom_roles'] : null;
        $permissions = auth_permissions($customRole['permissions'] ?? ($directoryUser['permissions'] ?? []));

        if ($requiredPermissionKey) {
            $requiredKeys = is_array($requiredPermissionKey) ? $requiredPermissionKey : [$requiredPermissionKey];
            $hasPermission = ($permissions['all'] ?? 'none') === 'full';
            if (!$hasPermission) {
                foreach ($requiredKeys as $key) {
                    if (($permissions[$key] ?? 'none') === 'full') {
                        $hasPermission = true;
                        break;
                    }
                }
            }
            if (!$hasPermission) {
                $keyList = implode(' or ', $requiredKeys);
                otp_respond(403, [
                    'status' => 'error',
                    'code' => 'insufficient_permissions',
                    'message' => "Insufficient permissions (requires 'full' on {$keyList})."
                ]);
            }
        }

        return [
            'type' => 'portal_session',
            'session' => $session,
            'role' => 'custom',
            'permissions' => $permissions
        ];
    }

    otp_respond(401, [
        'status' => 'error',
        'code' => 'invalid_token_format',
        'message' => 'Invalid token format. Bearer token must be either Supabase JWT or Portal Session Token.'
    ]);
}
?>
