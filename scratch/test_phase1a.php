<?php
/**
 * Phase 1A Automated Security & Regression Test Suite
 * DeepSkills Portal Authentication & allowed_cnics Lockdown
 */

require_once __DIR__ . '/../public/api/auth/_otp_common.php';

$port = 8999;
$baseUrl = "http://127.0.0.1:{$port}";

// Start local PHP web server
$cmd = sprintf('php -S 127.0.0.1:%d -t %s > /dev/null 2>&1 & echo $!', $port, escapeshellarg(__DIR__ . '/../public'));
$serverPid = (int) shell_exec($cmd);
usleep(600000); // 0.6s wait

register_shutdown_function(function() use ($serverPid) {
    if ($serverPid > 0) {
        shell_exec("kill {$serverPid} 2>/dev/null");
    }
});

echo "========================================================\n";
echo "=== PHASE 1A AUTOMATED SECURITY & REGRESSION SUITE ===\n";
echo "========================================================\n";
echo "Local PHP server running at {$baseUrl} (PID: {$serverPid})\n\n";

$passCount = 0;
$failCount = 0;

function assertTest($name, $condition, $details = '') {
    global $passCount, $failCount;
    if ($condition) {
        $passCount++;
        echo "  [PASS] {$name}\n";
    } else {
        $failCount++;
        echo "  [FAIL] {$name}" . ($details ? " -> {$details}" : "") . "\n";
    }
}

function httpCall($url, $method = 'POST', $data = [], $token = null) {
    $ch = curl_init($url);
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($data !== null && $method !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);

    $body = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    return [
        'code' => $httpCode,
        'data' => json_decode($body ?: 'null', true),
        'raw' => $body
    ];
}

$env = otp_load_env_file();
$supabaseUrl = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? '', '/');
$anonKey = $env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
$serviceKey = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

echo "--- 1. Testing Supabase Direct Anon Client Access ---\n";

function anonSupabaseCall($path, $method = 'GET', $payload = null) {
    global $supabaseUrl, $anonKey;
    $ch = curl_init($supabaseUrl . '/rest/v1/' . $path);
    $headers = [
        'apikey: ' . $anonKey,
        'Authorization: Bearer ' . $anonKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ];
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return ['code' => $code, 'data' => json_decode($res ?: 'null', true)];
}

// 1.1 Direct anon access to allowed_cnics
$anonRead = anonSupabaseCall('allowed_cnics?select=*&limit=1');
assertTest("Anon SELECT allowed_cnics is rejected/inaccessible", $anonRead['code'] === 401 || empty($anonRead['data']), "HTTP {$anonRead['code']}");

$anonInsert = anonSupabaseCall('allowed_cnics', 'POST', [
    'cnic' => '00000-0000000-0',
    'name' => 'Attacker',
    'role' => 'admin'
]);
assertTest("Anon INSERT allowed_cnics is strictly rejected", $anonInsert['code'] === 401 || $anonInsert['code'] === 403, "HTTP {$anonInsert['code']}");

$anonUpdate = anonSupabaseCall('allowed_cnics?cnic=eq.00000-0000000-0', 'PATCH', [
    'name' => 'Hacked'
]);
assertTest("Anon UPDATE allowed_cnics is strictly rejected", $anonUpdate['code'] === 401 || $anonUpdate['code'] === 403, "HTTP {$anonUpdate['code']}");

$anonDelete = anonSupabaseCall('allowed_cnics?cnic=eq.00000-0000000-0', 'DELETE');
assertTest("Anon DELETE allowed_cnics is strictly rejected", $anonDelete['code'] === 401 || $anonDelete['code'] === 403, "HTTP {$anonDelete['code']}");

echo "\n--- 2. Setup Test Identities via Service Role ---\n";
$now = time();
$studentCnic = '35202-7653865-7';
$studentOtherCnic = '11111-1111111-1';
$teacherCnic = '35201-0000001-9';
$customStaffCnic = '35201-9999999-9';

// Ensure student is in allowed_cnics
otp_supabase_request('POST', 'allowed_cnics?on_conflict=cnic', [[
    'cnic' => $studentCnic,
    'name' => 'Automated Test Student',
    'role' => 'student',
    'assigned_course' => 'Web Development',
    'batch' => 'Batch 01'
]], 'resolution=merge-duplicates,return=minimal');

// Ensure teacher is in allowed_cnics and teachers table
otp_supabase_request('POST', 'allowed_cnics?on_conflict=cnic', [[
    'cnic' => $teacherCnic,
    'name' => 'Automated Test Teacher',
    'role' => 'teacher',
    'assigned_course' => 'Web Development',
    'batch' => 'Batch 01'
]], 'resolution=merge-duplicates,return=minimal');

// Create active teacher if missing
$existingTeacher = auth_first(otp_supabase_request('GET', 'teachers?select=id,status&cnic=eq.' . rawurlencode($teacherCnic) . '&limit=1'));
if (!$existingTeacher) {
    $tRes = otp_supabase_request('POST', 'teachers', [[
        'cnic' => $teacherCnic,
        'name' => 'Automated Test Teacher',
        'status' => 'Active'
    ]], 'return=representation');
    $teacherId = $tRes[0]['id'] ?? null;
} else {
    $teacherId = $existingTeacher['id'];
}

// Create custom role and custom staff user for permission testing
$roleName = 'Test_Counsellor_Role';
$existingRole = auth_first(otp_supabase_request('GET', 'custom_roles?select=id&name=eq.' . rawurlencode($roleName) . '&limit=1'));
if (!$existingRole) {
    $roleRes = otp_supabase_request('POST', 'custom_roles', [[
        'name' => $roleName,
        'color' => '#3b82f6',
        'permissions' => [
            'dashboard' => 'view',
            'counsellor' => 'full',
            'students' => 'none', // Deliberately 'none' to test permission enforcement
            'teachers' => 'none',
            'users' => 'none'
        ]
    ]], 'return=representation');
    $customRoleId = $roleRes[0]['id'] ?? null;
} else {
    $customRoleId = $existingRole['id'];
}

// Ensure staff user exists in allowed_cnics & users table
otp_supabase_request('POST', 'allowed_cnics?on_conflict=cnic', [[
    'cnic' => $customStaffCnic,
    'name' => 'Test Counsellor Staff',
    'role' => 'custom'
]], 'resolution=merge-duplicates,return=minimal');

$existingStaff = auth_first(otp_supabase_request('GET', 'users?select=id&cnic=eq.' . rawurlencode($customStaffCnic) . '&limit=1'));
if (!$existingStaff) {
    $uRes = otp_supabase_request('POST', 'users', [[
        'cnic' => $customStaffCnic,
        'full_name' => 'Test Counsellor Staff',
        'email' => 'counsellor_test@deepskills.pk',
        'role' => 'custom',
        'custom_role_id' => $customRoleId,
        'status' => 'active'
    ]], 'return=representation');
    $staffUserId = $uRes[0]['id'] ?? null;
} else {
    $staffUserId = $existingStaff['id'];
    otp_supabase_request('PATCH', 'users?id=eq.' . rawurlencode($staffUserId), [
        'custom_role_id' => $customRoleId,
        'status' => 'active'
    ], 'return=minimal');
}

echo "  Setup complete.\n";

echo "\n--- 3. Session Creation & Validation Lifecycle ---\n";

// 3.1 Create student session
$studentSession = portal_create_session($studentCnic, 'student', null, 'student');
$studentToken = $studentSession['fullSessionToken'];
assertTest('portal_create_session issues valid format token', 
    !empty($studentToken) && count(explode('.', $studentToken)) === 2,
    "Token: {$studentToken}"
);

// 3.2 Validate active student session via validate-session.php
$valRes = httpCall($baseUrl . '/api/auth/validate-session.php', 'POST', [], $studentToken);
assertTest('validate-session.php returns 200 for valid student session', 
    $valRes['code'] === 200 && ($valRes['data']['status'] ?? '') === 'success' && ($valRes['data']['user']['cnic'] ?? '') === $studentCnic,
    "HTTP {$valRes['code']}, response: " . json_encode($valRes['data'])
);

// 3.3 Validate session with GET request
$valGetRes = httpCall($baseUrl . '/api/auth/validate-session.php', 'GET', null, $studentToken);
assertTest('validate-session.php supports GET with Bearer token', 
    $valGetRes['code'] === 200 && ($valGetRes['data']['status'] ?? '') === 'success'
);

// 3.4 Tampered session secret -> 401
$tamperedToken = explode('.', $studentToken)[0] . '.' . bin2hex(random_bytes(32));
$tamperedRes = httpCall($baseUrl . '/api/auth/validate-session.php', 'POST', [], $tamperedToken);
assertTest('validate-session.php returns 401 for modified token secret', 
    $tamperedRes['code'] === 401 && ($tamperedRes['data']['code'] ?? '') === 'invalid_token',
    "HTTP {$tamperedRes['code']}, code: " . ($tamperedRes['data']['code'] ?? '')
);

// 3.5 Malformed token format -> 401
$badRes = httpCall($baseUrl . '/api/auth/validate-session.php', 'POST', [], 'not-a-valid-token');
assertTest('validate-session.php returns 401 for invalid format', 
    $badRes['code'] === 401 && ($badRes['data']['code'] ?? '') === 'invalid_token_format'
);

// 3.6 Non-existent session UUID -> 401
$fakeUuid = '00000000-0000-0000-0000-000000000000.' . bin2hex(random_bytes(32));
$fakeRes = httpCall($baseUrl . '/api/auth/validate-session.php', 'POST', [], $fakeUuid);
assertTest('validate-session.php returns 401 for non-existent session UUID', 
    $fakeRes['code'] === 401
);

// 3.7 Server-side Logout
$logoutRes = httpCall($baseUrl . '/api/auth/logout.php', 'POST', [], $studentToken);
assertTest('logout.php returns 200', 
    $logoutRes['code'] === 200 && ($logoutRes['data']['status'] ?? '') === 'success'
);

// 3.8 Validate logged-out/revoked session -> 401
$revokedCheck = httpCall($baseUrl . '/api/auth/validate-session.php', 'POST', [], $studentToken);
assertTest('validate-session.php rejects revoked session with 401', 
    $revokedCheck['code'] === 401,
    "HTTP {$revokedCheck['code']}, code: " . ($revokedCheck['data']['code'] ?? '')
);

echo "\n--- 4. BOLA & Role Enforcement on Portal Endpoints ---\n";

// Create fresh active student session
$freshStudentSession = portal_create_session($studentCnic, 'student', null, 'student');
$freshStudentToken = $freshStudentSession['fullSessionToken'];

// 4.1 Student accessing own finance
$ownFin = httpCall($baseUrl . '/api/student/finance.php', 'POST', ['cnic' => $studentCnic], $freshStudentToken);
assertTest('Student token accessing own finance returns 200', 
    $ownFin['code'] === 200,
    "HTTP {$ownFin['code']}"
);

// 4.2 Student accessing other student finance -> 403
$otherFin = httpCall($baseUrl . '/api/student/finance.php', 'POST', ['cnic' => $studentOtherCnic], $freshStudentToken);
assertTest('Student token accessing other student finance rejected with 403', 
    $otherFin['code'] === 403 && ($otherFin['data']['code'] ?? '') === 'ownership_violation',
    "HTTP {$otherFin['code']}, code: " . ($otherFin['data']['code'] ?? '')
);

// 4.3 Student token accessing teacher finance -> 403
$roleMismatchFin = httpCall($baseUrl . '/api/teacher/finance.php', 'POST', ['cnic' => $studentCnic], $freshStudentToken);
assertTest('Student token accessing teacher finance rejected with 403 role_mismatch', 
    $roleMismatchFin['code'] === 403 && ($roleMismatchFin['data']['code'] ?? '') === 'role_mismatch',
    "HTTP {$roleMismatchFin['code']}, code: " . ($roleMismatchFin['data']['code'] ?? '')
);

// Create teacher session
$teacherSession = portal_create_session($teacherCnic, 'teacher', $teacherId, 'teacher');
$teacherToken = $teacherSession['fullSessionToken'];

// 4.4 Teacher accessing own finance -> 200
$tFin = httpCall($baseUrl . '/api/teacher/finance.php', 'POST', ['cnic' => $teacherCnic], $teacherToken);
assertTest('Teacher token accessing own finance returns 200', 
    $tFin['code'] === 200,
    "HTTP {$tFin['code']}"
);

// 4.5 Teacher token accessing student finance -> 403
$tStudentFin = httpCall($baseUrl . '/api/student/finance.php', 'POST', ['cnic' => $studentCnic], $teacherToken);
assertTest('Teacher token accessing student finance rejected with 403 role_mismatch', 
    $tStudentFin['code'] === 403 && ($tStudentFin['data']['code'] ?? '') === 'role_mismatch',
    "HTTP {$tStudentFin['code']}, code: " . ($tStudentFin['data']['code'] ?? '')
);

echo "\n--- 5. Authorized Admin Access Endpoints & RBAC ---\n";

// Create custom staff session (has counsellor = full, but students = none)
$staffSession = portal_create_session($customStaffCnic, 'custom', $staffUserId, 'user');
$staffToken = $staffSession['fullSessionToken'];

// 5.1 Unauthenticated request to student-access.php -> 401
$unauthSync = httpCall($baseUrl . '/api/admin/student-access.php', 'POST', ['cnic' => '35202-1234567-1']);
assertTest('Unauthenticated call to student-access.php returns 401', 
    $unauthSync['code'] === 401
);

// 5.2 Student token calling student-access.php -> 403
$studentAdminSync = httpCall($baseUrl . '/api/admin/student-access.php', 'POST', ['cnic' => '35202-1234567-1'], $freshStudentToken);
assertTest('Student token calling student-access.php returns 403', 
    $studentAdminSync['code'] === 403
);

// 5.3 Staff token without students permission calling student-access.php -> 403
$staffNoPermSync = httpCall($baseUrl . '/api/admin/student-access.php', 'POST', [
    'action' => 'sync',
    'cnic' => '35202-1234567-1',
    'name' => 'Sync Test Student',
    'course' => 'Web Dev',
    'batch' => 'Batch 01'
], $staffToken);
assertTest('Staff without students:full calling student-access.php rejected with 403', 
    $staffNoPermSync['code'] === 403 && ($staffNoPermSync['data']['code'] ?? '') === 'insufficient_permissions',
    "HTTP {$staffNoPermSync['code']}, code: " . ($staffNoPermSync['data']['code'] ?? '')
);

// 5.4 Grant students: 'full' to custom role and re-test
otp_supabase_request('PATCH', 'custom_roles?id=eq.' . rawurlencode($customRoleId), [
    'permissions' => [
        'dashboard' => 'view',
        'counsellor' => 'full',
        'students' => 'full', // Granted full
        'teachers' => 'full',
        'users' => 'none'
    ]
], 'return=minimal');

$staffAuthorizedSync = httpCall($baseUrl . '/api/admin/student-access.php', 'POST', [
    'action' => 'sync',
    'cnic' => '35202-1234567-1',
    'name' => 'Sync Test Student',
    'course' => 'Web Dev',
    'batch' => 'Batch 01'
], $staffToken);
assertTest('Staff with students:full calling student-access.php succeeds with 200', 
    $staffAuthorizedSync['code'] === 200 && ($staffAuthorizedSync['data']['status'] ?? '') === 'success',
    "HTTP {$staffAuthorizedSync['code']}, msg: " . ($staffAuthorizedSync['data']['message'] ?? '')
);

// 5.5 Revoke student access via student-access.php
$staffRevoke = httpCall($baseUrl . '/api/admin/student-access.php', 'POST', [
    'action' => 'revoke',
    'cnic' => '35202-1234567-1'
], $staffToken);
assertTest('Staff with students:full revoking student access succeeds with 200', 
    $staffRevoke['code'] === 200 && ($staffRevoke['data']['status'] ?? '') === 'success',
    "HTTP {$staffRevoke['code']}"
);

// 5.6 Staff without users:full calling staff-access.php -> 403
$staffNoUsersPerm = httpCall($baseUrl . '/api/admin/staff-access.php', 'POST', [
    'action' => 'sync',
    'cnic' => '35202-7777777-7',
    'name' => 'New Staff Member',
    'role' => 'custom'
], $staffToken);
assertTest('Staff without users:full calling staff-access.php rejected with 403', 
    $staffNoUsersPerm['code'] === 403 && ($staffNoUsersPerm['data']['code'] ?? '') === 'insufficient_permissions',
    "HTTP {$staffNoUsersPerm['code']}"
);

// Clean up test records
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode('35202-1234567-1'));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($teacherCnic));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($studentOtherCnic));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($customStaffCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($teacherCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($studentOtherCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($studentCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($customStaffCnic));
otp_supabase_request('DELETE', 'users?cnic=eq.' . rawurlencode($customStaffCnic));
otp_supabase_request('DELETE', 'custom_roles?id=eq.' . rawurlencode($customRoleId));

echo "\n========================================================\n";
echo "=== RESULTS: {$passCount} PASSED, {$failCount} FAILED ===\n";
echo "========================================================\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
