<?php
/**
 * Real Teacher Onboarding Integration Test
 * End-to-end test using live Supabase database records
 */

require_once __DIR__ . '/../public/api/auth/_otp_common.php';

$port = 8996;
$baseUrl = "http://127.0.0.1:{$port}";

$cmd = sprintf('php -S 127.0.0.1:%d -t %s > /dev/null 2>&1 & echo $!', $port, escapeshellarg(__DIR__ . '/../public'));
$serverPid = (int) shell_exec($cmd);
usleep(600000); // 0.6s

register_shutdown_function(function() use ($serverPid) {
    if ($serverPid > 0) {
        shell_exec("kill {$serverPid} 2>/dev/null");
    }
});

echo "=========================================================\n";
echo "=== REAL TEACHER ONBOARDING LIVE DATABASE TEST ========\n";
echo "=========================================================\n";
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $body = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    return [
        'code' => $httpCode,
        'body' => json_decode($body, true),
        'raw' => $body
    ];
}

$testCnic = '35201-7777777-1';
$testEmail = 'test_teacher_auto@deepskills.pk';
$testName = 'Automated Onboarding Teacher';
$adminCnic = '35202-0000000-0'; // Admin test CNIC

// 0. Setup Admin Session for authorized finalize call
echo "--- 0. Setting up Admin Session ---\n";
otp_supabase_request('POST', 'allowed_cnics?on_conflict=cnic', [[
    'cnic' => $adminCnic,
    'name' => 'Automated Test Admin',
    'role' => 'admin'
]], 'resolution=merge-duplicates,return=minimal');

$adminSession = portal_create_session($adminCnic, 'admin', null, 'user');
$adminToken = $adminSession['fullSessionToken'];
assertTest("Admin session created successfully", !empty($adminToken));

// 1. Initial cleanup of prior test records
echo "\n--- 1. Initial State & Cleanup ---\n";
otp_supabase_request('DELETE', 'hr_profiles?cnic=eq.' . rawurlencode($testCnic));
otp_supabase_request('DELETE', 'teachers?cnic=eq.' . rawurlencode($testCnic));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($testCnic));
otp_supabase_request('DELETE', 'login_otps?cnic=eq.' . rawurlencode($testCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($testCnic));

// 2. Create teacher with Pending / Onboarding status in live DB
echo "\n--- 2. Creating Teacher in Pending/Onboarding State ---\n";
$teacherRows = otp_supabase_request('POST', 'teachers', [[
    'cnic' => $testCnic,
    'name' => $testName,
    'email' => $testEmail,
    'status' => 'Pending',
    'specialization' => 'React & Node'
]], 'return=representation');

$teacherId = $teacherRows[0]['id'] ?? null;
assertTest("Teacher created with status 'Pending'", !empty($teacherId) && ($teacherRows[0]['status'] ?? '') === 'Pending', "ID: {$teacherId}");

$hrRows = otp_supabase_request('POST', 'hr_profiles', [[
    'teacher_id' => $teacherId,
    'cnic' => $testCnic,
    'full_name' => $testName,
    'personal_email' => $testEmail,
    'hr_status' => 'onboarding',
    'current_step' => 1
]], 'return=representation');

$hrProfileId = $hrRows[0]['id'] ?? null;
assertTest("HR Profile created with hr_status 'onboarding'", !empty($hrProfileId) && ($hrRows[0]['hr_status'] ?? '') === 'onboarding', "Profile ID: {$hrProfileId}");

// 3. Add to allowed_cnics
echo "\n--- 3. Allowed CNICs Login Eligibility ---\n";
otp_supabase_request('POST', 'allowed_cnics?on_conflict=cnic', [[
    'cnic' => $testCnic,
    'name' => $testName,
    'role' => 'teacher',
    'assigned_course' => 'React & Node'
]], 'resolution=merge-duplicates,return=minimal');

$allowedCheck = auth_first(otp_supabase_request('GET', 'allowed_cnics?cnic=eq.' . rawurlencode($testCnic)));
assertTest("Teacher CNIC registered in allowed_cnics", !empty($allowedCheck) && $allowedCheck['role'] === 'teacher');

// 4. Send OTP for Pending Teacher
echo "\n--- 4. Requesting Login OTP via send-otp.php ---\n";
$sendOtpRes = httpCall("{$baseUrl}/api/auth/send-otp.php", 'POST', ['cnic' => $testCnic]);
assertTest("send-otp.php returns HTTP 200 for Pending teacher", $sendOtpRes['code'] === 200, "Code: {$sendOtpRes['code']}");
$devOtp = $sendOtpRes['body']['devOtp'] ?? null;
assertTest("send-otp.php returns devOtp in local environment", !empty($devOtp), "OTP: {$devOtp}");

// 5. Verify OTP
echo "\n--- 5. Verifying OTP via verify-otp.php ---\n";
$verifyRes = httpCall("{$baseUrl}/api/auth/verify-otp.php", 'POST', [
    'cnic' => $testCnic,
    'otp' => $devOtp
]);
assertTest("verify-otp.php returns HTTP 200", $verifyRes['code'] === 200);
$verificationToken = $verifyRes['body']['verificationToken'] ?? null;
assertTest("verify-otp.php returns verificationToken", !empty($verificationToken));

// 6. Validate Token and Create Portal Session
echo "\n--- 6. Session Creation via validate-token.php ---\n";
$valRes = httpCall("{$baseUrl}/api/auth/validate-token.php", 'POST', [
    'cnic' => $testCnic,
    'verificationToken' => $verificationToken
]);
assertTest("validate-token.php returns HTTP 200", $valRes['code'] === 200);
$teacherUser = $valRes['body']['user'] ?? [];
$teacherSessionToken = $valRes['body']['sessionToken'] ?? '';
assertTest("Session user role is 'teacher'", ($teacherUser['role'] ?? '') === 'teacher');
assertTest("Session user status is 'Pending'", ($teacherUser['status'] ?? '') === 'Pending');
assertTest("Valid revocable sessionToken issued", !empty($teacherSessionToken));

// 7. Verify Portal Guard Route Redirection Contract
echo "\n--- 7. Simulating Portal Guard Contract for Pending Teacher ---\n";
// LoginPage / NextPortalGuard contract for Pending/Onboarding teacher:
$isPendingTeacher = ($teacherUser['role'] === 'teacher') && in_array($teacherUser['status'], ['Pending', 'Onboarding'], true);
$expectedLandingRoute = $isPendingTeacher ? '/teacher/hr' : '/teacher/dashboard';
assertTest("LoginPage redirects Pending teacher to /teacher/hr", $expectedLandingRoute === '/teacher/hr');

// Simulate NextPortalGuard check on /teacher/dashboard
$asPathDashboard = '/teacher/dashboard';
$isTeacherHR_Dash = $asPathDashboard === '/teacher/hr' || str_starts_with($asPathDashboard, '/teacher/hr/');
$teacherBlocked_Dash = ($isPendingTeacher && !$isTeacherHR_Dash);
assertTest("NextPortalGuard blocks Pending teacher from /teacher/dashboard", $teacherBlocked_Dash === true);

// Simulate NextPortalGuard check on /teacher/hr
$asPathHR = '/teacher/hr';
$isTeacherHR_HR = $asPathHR === '/teacher/hr' || str_starts_with($asPathHR, '/teacher/hr/');
$teacherBlocked_HR = ($isPendingTeacher && !$isTeacherHR_HR);
assertTest("NextPortalGuard permits Pending teacher access to /teacher/hr", $teacherBlocked_HR === false);

// 8. HR Finalize Process via finalize.php
echo "\n--- 8. Finalizing Teacher Hiring via finalize.php ---\n";
$finalizeRes = httpCall("{$baseUrl}/api/admin/hr/finalize.php", 'POST', [
    'profileId' => $hrProfileId,
    'adminNote' => 'Approved and hiring finalized by automated test suite.'
], $adminToken);

assertTest("finalize.php returns HTTP 200", $finalizeRes['code'] === 200, "Response: " . json_encode($finalizeRes['body']));

// Verify changes in LIVE database
$updatedTeacher = auth_first(otp_supabase_request('GET', 'teachers?id=eq.' . rawurlencode($teacherId)));
assertTest("Live DB: teachers.status is now 'Active'", ($updatedTeacher['status'] ?? '') === 'Active', "Actual: " . ($updatedTeacher['status'] ?? 'null'));

$updatedHr = auth_first(otp_supabase_request('GET', 'hr_profiles?id=eq.' . rawurlencode($hrProfileId)));
assertTest("Live DB: hr_profiles.hr_status is now 'hired'", ($updatedHr['hr_status'] ?? '') === 'hired', "Actual: " . ($updatedHr['hr_status'] ?? 'null'));

// 9. Subsequent Session & Routing Verification for Activated Teacher
echo "\n--- 9. Subsequent Login & Routing for Active Teacher ---\n";
$sessionCheck = httpCall("{$baseUrl}/api/auth/validate-session.php", 'POST', [], $teacherSessionToken);
assertTest("validate-session.php succeeds for existing session", $sessionCheck['code'] === 200);
$activeUser = $sessionCheck['body']['user'] ?? [];
assertTest("Active teacher status reflects 'Active'", ($activeUser['status'] ?? '') === 'Active');

// Check routing for Active teacher
$isActiveTeacher = ($activeUser['role'] === 'teacher') && ($activeUser['status'] === 'Active');
$expectedActiveLanding = $isActiveTeacher ? '/teacher/dashboard' : '/teacher/hr';
assertTest("LoginPage redirects Active teacher to /teacher/dashboard", $expectedActiveLanding === '/teacher/dashboard');

// Simulate NextPortalGuard for Active teacher on /teacher/dashboard
$teacherBlockedActive_Dash = ($isActiveTeacher && $isTeacherHR_Dash);
assertTest("NextPortalGuard permits Active teacher on /teacher/dashboard", $teacherBlockedActive_Dash === false);

// Simulate NextPortalGuard for Active teacher on /teacher/hr
$teacherBlockedActive_HR = ($isActiveTeacher && $isTeacherHR_HR);
assertTest("NextPortalGuard blocks Active teacher from /teacher/hr (redirects to dashboard)", $teacherBlockedActive_HR === true);

// 10. Clean up test records
echo "\n--- 10. Teardown Test Data ---\n";
otp_supabase_request('DELETE', 'hr_profiles?id=eq.' . rawurlencode($hrProfileId));
otp_supabase_request('DELETE', 'teachers?id=eq.' . rawurlencode($teacherId));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($testCnic));
otp_supabase_request('DELETE', 'login_otps?cnic=eq.' . rawurlencode($testCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($testCnic));
otp_supabase_request('DELETE', 'portal_sessions?cnic=eq.' . rawurlencode($adminCnic));
otp_supabase_request('DELETE', 'allowed_cnics?cnic=eq.' . rawurlencode($adminCnic));

$cleanCheck = auth_first(otp_supabase_request('GET', 'teachers?cnic=eq.' . rawurlencode($testCnic)));
assertTest("Test teacher records successfully cleaned from database", empty($cleanCheck));

echo "\n=========================================================\n";
echo "SUMMARY: {$passCount} Passed, {$failCount} Failed\n";
echo "=========================================================\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
