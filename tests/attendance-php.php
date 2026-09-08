<?php
// Run production handler with a fully isolated database transport.
if (isset($argv[1])) {
    $scenario = $argv[1];
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['HTTP_AUTHORIZATION'] = $scenario === 'missing' ? '' : 'Bearer 11111111-1111-4111-8111-111111111111.secret';
    $GLOBALS['__OTP_TEST_HOOK__'] = function ($status, $payload) {
        echo json_encode(['code' => $status, 'body' => $payload]);
        exit;
    };
    $GLOBALS['__OTP_REQUEST_HOOK__'] = function ($method, $path) use ($scenario) {
        if ($method !== 'GET') throw new Exception('Unexpected mutation');
        if (str_starts_with($path, 'portal_sessions?')) return [[
            'id' => '11111111-1111-4111-8111-111111111111',
            'role' => $scenario === 'role' ? 'teacher' : 'student',
            'cnic' => '12345-1234567-1',
            'token_hash' => password_hash('secret', PASSWORD_BCRYPT),
            'expires_at' => $scenario === 'expired' ? '2000-01-01' : gmdate('c', time() + 3600),
            'last_seen_at' => gmdate('c')
        ]];
        if (str_starts_with($path, 'admissions?')) {
            if (!str_contains($path, 'cnic=eq.12345-1234567-1')) throw new Exception('Incorrect owner');
            return $scenario === 'no_admission' ? [] : [['id' => 'mine', 'course' => 'Course', 'batch' => 'Batch'], ['id' => 'previous', 'course' => 'Previous', 'batch' => 'Batch']];
        }
        if (str_starts_with($path, 'attendance?')) {
            if (!str_contains($path, 'student_id=in.(mine,previous)')) throw new Exception('Incorrect attendance scope');
            if ($scenario === 'failure') throw new Exception('Offline');
            if ($scenario === 'empty') return [];
            return [['id' => 'a', 'student_id' => 'mine', 'status' => 'present', 'is_locked' => false], ['id' => 'b', 'student_id' => 'previous', 'status' => 'excused', 'is_locked' => true]];
        }
        throw new Exception('Unexpected query');
    };
    require __DIR__ . '/../public/api/student/attendance.php';
    exit;
}
foreach (['success' => 200, 'empty' => 200, 'failure' => 500, 'no_admission' => 403, 'missing' => 401, 'expired' => 401, 'role' => 403] as $scenario => $expected) {
    $response = json_decode(shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__FILE__) . ' ' . escapeshellarg($scenario)), true);
    if (($response['code'] ?? null) !== $expected) throw new Exception('Failed ' . $scenario);
    if ($scenario === 'success' && array_column($response['body']['data']['records'], 'id') !== ['a', 'b']) throw new Exception('Missing records');
    if ($scenario === 'empty' && $response['body']['data']['records'] !== []) throw new Exception('Incorrect empty state');
    echo "PASS $scenario\n";
}
