<?php
require_once __DIR__ . '/_otp_common.php';
otp_bootstrap();

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
        if (($teacher['status'] ?? '') !== 'Active') {
            otp_respond(403, ['status' => 'error', 'message' => 'Your account is ' . strtolower($teacher['status'] ?? 'inactive') . '. Please contact the administrator.']);
        }
        return array_merge($roleData, [
            'id' => $teacher['id'] ?? ($roleData['id'] ?? null),
            'name' => $roleData['name'] ?? '',
            'status' => $teacher['status'],
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

$data = otp_json_input();
$cnic = otp_normalize_cnic($data['cnic'] ?? '');
$token = otp_clean_text($data['verificationToken'] ?? '', 200);

if (!$cnic || !$token) {
    otp_respond(400, ['status' => 'error', 'message' => 'OTP verification is required.']);
}

$now = gmdate('c');
$rows = otp_supabase_request(
    'GET',
    'login_otps?select=*&cnic=eq.' . rawurlencode($cnic) . '&token_used_at=is.null&token_expires_at=gt.' . rawurlencode($now) . '&order=consumed_at.desc&limit=1'
);

$row = is_array($rows) ? ($rows[0] ?? null) : null;
if (!$row || !password_verify($token, $row['token_hash'] ?? '')) {
    otp_respond(401, ['status' => 'error', 'message' => 'OTP verification expired. Please request a new code.']);
}

$sessionTokenSecret = bin2hex(random_bytes(32));
$fullSessionToken = $row['id'] . '.' . $sessionTokenSecret;
$sessionExpiry = gmdate('c', time() + (86400 * 30));

otp_supabase_request(
    'PATCH',
    'login_otps?id=eq.' . rawurlencode($row['id']),
    [
        'token_used_at' => $now,
        'token_hash' => password_hash($sessionTokenSecret, PASSWORD_DEFAULT),
        'token_expires_at' => $sessionExpiry,
    ],
    'return=minimal'
);

$user = auth_build_user($cnic);
$user['sessionToken'] = $fullSessionToken;

otp_supabase_request(
    'PATCH',
    'users?cnic=eq.' . rawurlencode($cnic),
    ['last_login' => $now, 'updated_at' => $now],
    'return=minimal'
);

otp_supabase_request(
    'POST',
    'activity_logs',
    [[
        'user_id' => in_array(($user['role'] ?? ''), ['student', 'teacher'], true) ? null : ($user['id'] ?? null),
        'user_name' => $user['name'] ?? $cnic,
        'user_role' => $user['role'] ?? 'unknown',
        'event_type' => 'login',
        'event_description' => 'Logged in',
        'created_at' => $now,
    ]],
    'return=minimal'
);

otp_respond(200, [
    'status' => 'success',
    'message' => 'Login verified.',
    'user' => $user,
    'sessionToken' => $fullSessionToken
]);
?>
