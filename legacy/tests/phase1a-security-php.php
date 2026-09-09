<?php
// Isolated regression test suite for PHP Phase 1A security controls
// Tests: OTP header/peer spoofing resistance, blog authentication, role derivation,
// cross-author restrictions, and admin privileges without mutating live data.

$testsRun = 0;
$testsPassed = 0;
$testsFailed = 0;

function runTest($name, $callback) {
    global $testsRun, $testsPassed, $testsFailed;
    $testsRun++;
    try {
        $callback();
        echo "ok $testsRun - $name\n";
        $testsPassed++;
    } catch (Throwable $e) {
        echo "not ok $testsRun - $name\n";
        echo "  Error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
        $testsFailed++;
    }
}

function assertEquals($expected, $actual, $message = '') {
    if ($expected !== $actual) {
        $expStr = var_export($expected, true);
        $actStr = var_export($actual, true);
        throw new Exception("Assertion failed: $message (Expected: $expStr, Actual: $actStr)");
    }
}

function assertTrue($condition, $message = '') {
    if (!$condition) {
        throw new Exception("Assertion failed: $message (Expected true)");
    }
}

class TestResponseException extends Exception {
    public $status;
    public $payload;
    public function __construct($status, $payload) {
        parent::__construct("Test Response: status $status");
        $this->status = $status;
        $this->payload = $payload;
    }
}

$GLOBALS['__BLOG_TEST_HOOK__'] = function($status, $payload) {
    throw new TestResponseException($status, $payload);
};
$GLOBALS['__OTP_TEST_HOOK__'] = function($status, $payload) {
    throw new TestResponseException($status, $payload);
};

$db = [
    'portal_sessions' => [],
    'login_otps' => [],
    'users' => [],
    'allowed_cnics' => [],
    'blog_posts' => [],
    'auth_users' => []
];

$mailSentCalls = [];
$mockMailResult = true;

$GLOBALS['__OTP_MAIL_HOOK__'] = function($email, $name, $code) {
    global $mailSentCalls, $mockMailResult;
    $mailSentCalls[] = ['email' => $email, 'name' => $name, 'code' => $code];
    return $mockMailResult;
};

$GLOBALS['__BLOG_AUTH_HOOK__'] = function($token) {
    global $db;
    return $db['auth_users'][$token] ?? null;
};
$GLOBALS['__OTP_AUTH_HOOK__'] = function($token) {
    global $db;
    return $db['auth_users'][$token] ?? null;
};

function mockDbRequest($method, $path, $payload = null, $extra = null, $throwOnError = false) {
    global $db;
    $parts = explode('?', $path, 2);
    $table = $parts[0];
    $qs = $parts[1] ?? '';
    
    if (!isset($db[$table])) {
        $db[$table] = [];
    }

    $filters = [];
    if ($qs) {
        $params = explode('&', $qs);
        foreach ($params as $param) {
            $kv = explode('=', $param, 2);
            $key = urldecode($kv[0]);
            $val = isset($kv[1]) ? urldecode($kv[1]) : '';
            if (strpos($val, 'eq.') === 0) {
                $filters[] = ['type' => 'eq', 'field' => $key, 'val' => substr($val, 3)];
            } elseif (strpos($val, 'in.') === 0) {
                $inVals = explode(',', trim(substr($val, 3), '()'));
                $filters[] = ['type' => 'in', 'field' => $key, 'vals' => $inVals];
            }
        }
    }

    if ($method === 'GET') {
        $results = [];
        foreach ($db[$table] as $row) {
            $match = true;
            foreach ($filters as $f) {
                if ($f['type'] === 'eq' && (string)($row[$f['field']] ?? '') !== (string)$f['val']) {
                    $match = false;
                    break;
                }
                if ($f['type'] === 'in' && !in_array($row[$f['field']] ?? '', $f['vals'], true)) {
                    $match = false;
                    break;
                }
            }
            if ($match) {
                $results[] = $row;
            }
        }
        return $results;
    }

    if ($method === 'POST') {
        $rows = is_array($payload) ? (isset($payload[0]) ? $payload : [$payload]) : [];
        $inserted = [];
        foreach ($rows as $r) {
            if (empty($r['id'])) {
                $r['id'] = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                    mt_rand(0, 0xffff),
                    mt_rand(0, 0x0fff) | 0x4000,
                    mt_rand(0, 0x3fff) | 0x8000,
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
                );
            }
            $db[$table][] = $r;
            $inserted[] = $r;
        }
        return $inserted;
    }

    if ($method === 'PATCH') {
        $updated = [];
        foreach ($db[$table] as &$row) {
            $match = true;
            foreach ($filters as $f) {
                if ($f['type'] === 'eq' && (string)($row[$f['field']] ?? '') !== (string)$f['val']) {
                    $match = false;
                    break;
                }
            }
            if ($match) {
                foreach ($payload as $k => $v) {
                    $row[$k] = $v;
                }
                $updated[] = $row;
            }
        }
        unset($row);
        return $updated;
    }

    if ($method === 'DELETE') {
        $remaining = [];
        foreach ($db[$table] as $row) {
            $match = true;
            foreach ($filters as $f) {
                if ($f['type'] === 'eq' && (string)($row[$f['field']] ?? '') !== (string)$f['val']) {
                    $match = false;
                    break;
                }
            }
            if (!$match) {
                $remaining[] = $row;
            }
        }
        $db[$table] = $remaining;
        return [];
    }

    return [];
}

$GLOBALS['__BLOG_REQUEST_HOOK__'] = 'mockDbRequest';
$GLOBALS['__OTP_REQUEST_HOOK__'] = 'mockDbRequest';

function execSendOtp($body, $headers = []) {
    $_SERVER['REQUEST_METHOD'] = 'POST';
    foreach ($headers as $k => $v) {
        $_SERVER[$k] = $v;
    }
    $GLOBALS['__OTP_INPUT__'] = $body;
    try {
        include __DIR__ . '/../php/auth/send-otp.php';
        return ['status' => 200, 'payload' => null];
    } catch (TestResponseException $e) {
        return ['status' => $e->status, 'payload' => $e->payload];
    }
}

function execBlogIndex($method, $token = null, $body = null) {
    $_SERVER['REQUEST_METHOD'] = $method;
    if ($token !== null) {
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer $token";
    } else {
        unset($_SERVER['HTTP_AUTHORIZATION']);
    }
    $GLOBALS['__BLOG_INPUT__'] = $body;
    try {
        include __DIR__ . '/../php/blog/index.php';
        return ['status' => 200, 'payload' => null];
    } catch (TestResponseException $e) {
        return ['status' => $e->status, 'payload' => $e->payload];
    }
}

function execBlogDelete($id, $token = null) {
    $_SERVER['REQUEST_METHOD'] = 'DELETE';
    $_GET['id'] = $id;
    if ($token !== null) {
        $_SERVER['HTTP_AUTHORIZATION'] = "Bearer $token";
    } else {
        unset($_SERVER['HTTP_AUTHORIZATION']);
    }
    try {
        include __DIR__ . '/../php/blog/delete.php';
        return ['status' => 200, 'payload' => null];
    } catch (TestResponseException $e) {
        return ['status' => $e->status, 'payload' => $e->payload];
    }
}

// -------------------------------------------------------------
// Test 1: Actual send-otp.php Execution & Fail-Closed Behavior
// -------------------------------------------------------------
runTest("OTP Security: Actual send-otp.php handler fails closed against spoofed headers", function() {
    global $db, $mockMailResult;
    $db['allowed_cnics'] = [['cnic' => '35201-1234567-1', 'role' => 'admin', 'name' => 'Admin User']];
    $db['users'] = [['id' => 'u1', 'cnic' => '35201-1234567-1', 'email' => 'admin@deepskills.pk', 'full_name' => 'Admin User', 'role' => 'admin', 'status' => 'active']];

    $spoofedHeaders = [
        'HTTP_HOST' => 'localhost:3000',
        'REMOTE_ADDR' => '127.0.0.1',
        'HTTP_X_FORWARDED_FOR' => '127.0.0.1'
    ];

    // 1. Under APP_ENV=production with mail failure -> must fail closed with 500
    putenv('APP_ENV=production');
    $mockMailResult = false;
    $resFail = execSendOtp(['cnic' => '35201-1234567-1'], $spoofedHeaders);
    assertEquals(500, $resFail['status'], "Must fail closed with 500 when email fails in production");
    assertEquals(false, isset($resFail['payload']['devOtp']), "Must never leak devOtp on failure");

    // 2. Under APP_ENV=production with mail success -> 200, masked email, no devOtp
    $mockMailResult = true;
    $resProd = execSendOtp(['cnic' => '35201-1234567-1'], $spoofedHeaders);
    assertEquals(200, $resProd['status']);
    assertEquals(false, isset($resProd['payload']['devOtp']), "Must never return devOtp in production");
    assertEquals('a***@deepskills.pk', $resProd['payload']['email']);

    // 3. Under unset environment -> fail closed
    putenv('APP_ENV');
    putenv('NODE_ENV');
    $resUnset = execSendOtp(['cnic' => '35201-1234567-1'], $spoofedHeaders);
    assertEquals(200, $resUnset['status']);
    assertEquals(false, isset($resUnset['payload']['devOtp']), "Must never return devOtp when environment is unset");

    // 4. Under explicit development -> devOtp is returned
    putenv('APP_ENV=development');
    $resDev = execSendOtp(['cnic' => '35201-1234567-1'], []);
    assertEquals(200, $resDev['status']);
    assertTrue(isset($resDev['payload']['devOtp']), "Returns devOtp in explicit development mode");

    putenv('APP_ENV');
});

// -------------------------------------------------------------
// Test 2: Defect 1 - Non-Admin JWT, Forged user_metadata, Inactive/Demoted Accounts
// -------------------------------------------------------------
runTest("Blog Security: Defect 1 - Non-admin JWT, forged metadata, and inactive accounts denied (403)", function() {
    global $db;
    $initialCount = count($db['blog_posts']);

    // Case 1: Verified Supabase Auth user without admin authority
    $nonAdminToken = 'jwt.non.admin';
    $db['auth_users'][$nonAdminToken] = [
        'id' => 'auth-student-1',
        'email' => 'student@deepskills.pk',
        'app_metadata' => [],
        'user_metadata' => []
    ];
    $res1 = execBlogIndex('POST', $nonAdminToken, ['title' => 'Student Post', 'slug' => 'student-post', 'content_html' => '<p>content</p>']);
    assertEquals(403, $res1['status'], "Non-admin JWT must be rejected with 403");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // Case 2: Supabase user with forged user_metadata (client editable)
    $forgedToken = 'jwt.forged.meta';
    $db['auth_users'][$forgedToken] = [
        'id' => 'auth-forger-2',
        'email' => 'forger@deepskills.pk',
        'app_metadata' => [],
        'user_metadata' => ['role' => 'admin', 'full_name' => 'Fake Admin']
    ];
    $res2 = execBlogIndex('POST', $forgedToken, ['title' => 'Forged Post', 'slug' => 'forged-post', 'content_html' => '<p>content</p>']);
    assertEquals(403, $res2['status'], "Forged user_metadata must NEVER grant admin access");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // Case 3: Supabase user with inactive status in users table
    $inactiveToken = 'jwt.inactive.user';
    $db['auth_users'][$inactiveToken] = [
        'id' => 'auth-inactive-3',
        'email' => 'suspended@deepskills.pk',
        'app_metadata' => ['role' => 'admin']
    ];
    $db['users'][] = [
        'id' => 'user-inactive-3',
        'email' => 'suspended@deepskills.pk',
        'role' => 'admin',
        'status' => 'inactive'
    ];
    $res3 = execBlogIndex('POST', $inactiveToken, ['title' => 'Inactive Post', 'slug' => 'inactive-post', 'content_html' => '<p>inactive-post</p>']);
    assertEquals(403, $res3['status'], "Inactive user must be rejected with 403");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // Case 4: Supabase user demoted in users table
    $demotedToken = 'jwt.demoted.user';
    $db['auth_users'][$demotedToken] = [
        'id' => 'auth-demoted-4',
        'email' => 'demoted@deepskills.pk',
        'app_metadata' => ['role' => 'admin']
    ];
    $db['users'][] = [
        'id' => 'user-demoted-4',
        'email' => 'demoted@deepskills.pk',
        'role' => 'student',
        'status' => 'active'
    ];
    $res4 = execBlogIndex('POST', $demotedToken, ['title' => 'Demoted Post', 'slug' => 'demoted-post', 'content_html' => '<p>demoted-post</p>']);
    assertEquals(403, $res4['status'], "Demoted user must be rejected with 403");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");
});

// -------------------------------------------------------------
// Test 3: Defect 2 - Session Expiry Parsing, Revocation, and login_otps Fallback
// -------------------------------------------------------------
runTest("Blog Security: Defect 2 - Missing, invalid, expired, or revoked session tokens rejected (401)", function() {
    global $db;
    $initialCount = count($db['blog_posts']);
    $secret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    $tokenHash = password_hash($secret, PASSWORD_DEFAULT);

    // 1. Session with null expires_at in portal_sessions
    $id1 = '11111111-0000-0000-0000-000000000001';
    $db['portal_sessions'][] = [
        'id' => $id1,
        'cnic' => '35201-1111111-1',
        'role' => 'admin',
        'token_hash' => $tokenHash,
        'expires_at' => null,
        'revoked_at' => null
    ];
    $res1 = execBlogIndex('POST', "$id1.$secret", ['title' => 'Null Expiry Post', 'slug' => 'null-post', 'content_html' => '<p>abc</p>']);
    assertEquals(401, $res1['status'], "Null expires_at must be rejected with 401");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // 2. Session with invalid date string in portal_sessions
    $id2 = '11111111-0000-0000-0000-000000000002';
    $db['portal_sessions'][] = [
        'id' => $id2,
        'cnic' => '35201-1111111-2',
        'role' => 'admin',
        'token_hash' => $tokenHash,
        'expires_at' => 'not-a-valid-date',
        'revoked_at' => null
    ];
    $res2 = execBlogIndex('POST', "$id2.$secret", ['title' => 'Invalid Date Post', 'slug' => 'invalid-post', 'content_html' => '<p>abc</p>']);
    assertEquals(401, $res2['status'], "Invalid date expires_at must be rejected with 401");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // 3. Session expired (past date)
    $id3 = '11111111-0000-0000-0000-000000000003';
    $db['portal_sessions'][] = [
        'id' => $id3,
        'cnic' => '35201-1111111-3',
        'role' => 'admin',
        'token_hash' => $tokenHash,
        'expires_at' => gmdate('c', time() - 3600),
        'revoked_at' => null
    ];
    $res3 = execBlogIndex('POST', "$id3.$secret", ['title' => 'Expired Post', 'slug' => 'expired-post', 'content_html' => '<p>abc</p>']);
    assertEquals(401, $res3['status'], "Expired session must be rejected with 401");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // 4. Session exactly now
    $id4 = '11111111-0000-0000-0000-000000000004';
    $db['portal_sessions'][] = [
        'id' => $id4,
        'cnic' => '35201-1111111-4',
        'role' => 'admin',
        'token_hash' => $tokenHash,
        'expires_at' => gmdate('c', time()),
        'revoked_at' => null
    ];
    $res4 = execBlogIndex('POST', "$id4.$secret", ['title' => 'Now Post', 'slug' => 'now-post', 'content_html' => '<p>abc</p>']);
    assertEquals(401, $res4['status'], "Exactly-now session must be rejected with 401");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // 5. Session revoked
    $id5 = '11111111-0000-0000-0000-000000000005';
    $db['portal_sessions'][] = [
        'id' => $id5,
        'cnic' => '35201-1111111-5',
        'role' => 'admin',
        'token_hash' => $tokenHash,
        'expires_at' => gmdate('c', time() + 86400),
        'revoked_at' => gmdate('c', time() - 100)
    ];
    $res5 = execBlogIndex('POST', "$id5.$secret", ['title' => 'Revoked Post', 'slug' => 'revoked-post', 'content_html' => '<p>abc</p>']);
    assertEquals(401, $res5['status'], "Revoked session must be rejected with 401");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // 6. login_otps fallback with null token_expires_at
    $id6 = '22222222-0000-0000-0000-000000000001';
    $db['login_otps'][] = [
        'id' => $id6,
        'cnic' => '35201-2222222-1',
        'role' => 'admin',
        'token_hash' => $tokenHash,
        'token_expires_at' => null
    ];
    $res6 = execBlogIndex('POST', "$id6.$secret", ['title' => 'Fallback Null Post', 'slug' => 'fallback-null', 'content_html' => '<p>abc</p>']);
    assertEquals(401, $res6['status'], "Fallback login_otps with null expiry must be rejected");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");

    // 7. login_otps fallback with expired token_expires_at
    $id7 = '22222222-0000-0000-0000-000000000002';
    $db['login_otps'][] = [
        'id' => $id7,
        'cnic' => '35201-2222222-2',
        'role' => 'admin',
        'token_hash' => $tokenHash,
        'token_expires_at' => gmdate('c', time() - 100)
    ];
    $res7 = execBlogIndex('POST', "$id7.$secret", ['title' => 'Fallback Exp Post', 'slug' => 'fallback-exp', 'content_html' => '<p>abc</p>']);
    assertEquals(401, $res7['status'], "Fallback login_otps with expired timestamp must be rejected");
    assertEquals($initialCount, count($db['blog_posts']), "Zero database mutations on rejection");
});

// -------------------------------------------------------------
// Test 4: Contributor Draft Workflow, Boundaries & Deletion Denial
// -------------------------------------------------------------
runTest("Blog Security: Contributor draft boundaries, own-draft editing, and deletion denial", function() {
    global $db;

    $secretAlice = 'alice_secret_12345678901234567890123456789012';
    $secretBob   = 'bob_secret_1234567890123456789012345678901234';

    $sessAliceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    $sessBobId   = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    $db['portal_sessions'][] = [
        'id' => $sessAliceId,
        'cnic' => '35201-1111111-1',
        'role' => 'custom',
        'token_hash' => password_hash($secretAlice, PASSWORD_DEFAULT),
        'expires_at' => gmdate('c', time() + 86400),
        'revoked_at' => null
    ];
    $db['portal_sessions'][] = [
        'id' => $sessBobId,
        'cnic' => '35201-2222222-2',
        'role' => 'custom',
        'token_hash' => password_hash($secretBob, PASSWORD_DEFAULT),
        'expires_at' => gmdate('c', time() + 86400),
        'revoked_at' => null
    ];

    $db['users'][] = [
        'id' => 'alice-user-id',
        'cnic' => '35201-1111111-1',
        'full_name' => 'Alice Contributor',
        'role' => 'custom',
        'status' => 'active',
        'permissions' => ['blog' => 'full']
    ];
    $db['users'][] = [
        'id' => 'bob-user-id',
        'cnic' => '35201-2222222-2',
        'full_name' => 'Bob Contributor',
        'role' => 'custom',
        'status' => 'active',
        'permissions' => ['blog' => 'full']
    ];

    $tokenAlice = "$sessAliceId.$secretAlice";
    $tokenBob = "$sessBobId.$secretBob";

    // 1. Contributor Alice creates post requesting published status & featured
    $resCreate = execBlogIndex('POST', $tokenAlice, [
        'title' => 'Alice First Post',
        'slug' => 'alice-first-post',
        'content_html' => '<p>Alice content</p>',
        'status' => 'published',
        'is_featured' => true,
        'author_id' => 'forged-author-id',
        'author_name' => 'Forged Author'
    ]);
    assertEquals(200, $resCreate['status']);

    // Verify draft was forced
    $createdPost = null;
    foreach ($db['blog_posts'] as $p) {
        if ($p['slug'] === 'alice-first-post') {
            $createdPost = $p;
            break;
        }
    }
    assertTrue($createdPost !== null, "Alice draft must be created in DB");
    assertEquals('draft', $createdPost['status'], "Contributor post must be forced to draft");
    assertEquals(false, $createdPost['is_featured'], "Contributor post cannot be featured");
    assertEquals('alice-user-id', $createdPost['author_id'], "Author ID must be derived from verified session");
    assertEquals('Alice Contributor', $createdPost['author_name'], "Author Name must be derived from verified session");

    // 2. Contributor Bob attempts to edit Alice draft -> Denied 403
    $resBobEdit = execBlogIndex('POST', $tokenBob, [
        'id' => $createdPost['id'],
        'title' => 'Hacked By Bob',
        'slug' => 'alice-first-post',
        'content_html' => '<p>hacked</p>'
    ]);
    assertEquals(403, $resBobEdit['status'], "Cross-author draft edit must be denied with 403");

    // 3. Contributor Alice attempts to delete post -> Denied 403
    $resDel = execBlogDelete($createdPost['id'], $tokenAlice);
    assertEquals(403, $resDel['status'], "Contributor delete must be denied with 403");
    $stillExists = false;
    foreach ($db['blog_posts'] as $p) {
        if ($p['id'] === $createdPost['id']) $stillExists = true;
    }
    assertTrue($stillExists, "Post must not be deleted by contributor");

    // 4. Contributor Alice edits her own draft -> Allowed 200
    $resAliceEdit = execBlogIndex('POST', $tokenAlice, [
        'id' => $createdPost['id'],
        'title' => 'Alice Post Updated',
        'slug' => 'alice-first-post',
        'content_html' => '<p>Alice updated content</p>'
    ]);
    assertEquals(200, $resAliceEdit['status'], "Contributor must be able to edit their own draft");
});

// -------------------------------------------------------------
// Test 5: Legitimate Administrator Operations
// -------------------------------------------------------------
runTest("Blog Security: Legitimate Super Admin operations via Supabase JWT", function() {
    global $db;

    $adminToken = 'jwt.admin.verified';
    $db['auth_users'][$adminToken] = [
        'id' => 'auth-admin-uuid',
        'email' => 'admin@deepskills.pk',
        'app_metadata' => ['role' => 'admin'],
        'user_metadata' => ['full_name' => 'Lead Administrator']
    ];
    $db['users'][] = [
        'id' => 'user-admin-uuid',
        'email' => 'admin@deepskills.pk',
        'full_name' => 'Lead Administrator',
        'role' => 'admin',
        'status' => 'active'
    ];

    // 1. Admin creates published, featured post
    $resCreate = execBlogIndex('POST', $adminToken, [
        'title' => 'Official News',
        'slug' => 'official-news',
        'content_html' => '<p>Announcement</p>',
        'status' => 'published',
        'is_featured' => true
    ]);
    assertEquals(200, $resCreate['status']);

    $adminPost = null;
    foreach ($db['blog_posts'] as $p) {
        if ($p['slug'] === 'official-news') {
            $adminPost = $p;
            break;
        }
    }
    assertTrue($adminPost !== null, "Admin post must be created in DB");
    assertEquals('published', $adminPost['status'], "Admin can directly publish posts");
    assertEquals(true, $adminPost['is_featured'], "Admin can feature posts");

    // 2. Admin deletes post
    $resDel = execBlogDelete($adminPost['id'], $adminToken);
    assertEquals(200, $resDel['status']);
    $postStillExists = false;
    foreach ($db['blog_posts'] as $p) {
        if ($p['id'] === $adminPost['id']) $postStillExists = true;
    }
    assertEquals(false, $postStillExists, "Post must be deleted by admin");
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n1..$testsRun\n";
echo "# tests $testsRun\n";
echo "# pass  $testsPassed\n";
echo "# fail  $testsFailed\n";

if ($testsFailed > 0) {
    exit(1);
}
