<?php
function blog_json($status, $payload) {
    if (isset($GLOBALS['__BLOG_TEST_HOOK__']) && is_callable($GLOBALS['__BLOG_TEST_HOOK__'])) {
        call_user_func($GLOBALS['__BLOG_TEST_HOOK__'], $status, $payload);
    }
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: https://deepskills.pk');
        header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }
    echo json_encode($payload);
    exit();
}

function blog_load_env() {
    $paths = [
        __DIR__ . '/../../.env.local',
        __DIR__ . '/../../.env',
        __DIR__ . '/../../../.env',
    ];

    $env = [];
    foreach ($paths as $path) {
        if (!is_readable($path)) continue;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
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

function blog_config() {
    $env = blog_load_env();
    $url = $env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '';
    $key = $env['SUPABASE_SERVICE_ROLE_KEY'] ?? $env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? $env['REACT_APP_SUPABASE_ANON_KEY'] ?? '';
    if (!$url || !$key) {
        blog_json(500, ['error' => 'Supabase environment variables are missing.']);
    }
    return [rtrim($url, '/'), $key];
}

function blog_request($method, $path, $payload = null, $extraHeaders = []) {
    if (isset($GLOBALS['__BLOG_REQUEST_HOOK__']) && is_callable($GLOBALS['__BLOG_REQUEST_HOOK__'])) {
        return call_user_func($GLOBALS['__BLOG_REQUEST_HOOK__'], $method, $path, $payload, $extraHeaders);
    }
    [$url, $key] = blog_config();
    $headers = [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
    ];
    $headers = array_merge($headers, $extraHeaders);

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
    $headersOut = function_exists('http_get_last_response_headers') ? http_get_last_response_headers() : ($http_response_header ?? []);
    if (isset($headersOut[0]) && preg_match('/\s(\d{3})\s/', $headersOut[0], $matches)) {
        $status = (int) $matches[1];
    }

    $decoded = json_decode($response ?: 'null', true);
    if ($status >= 400) {
        $message = is_array($decoded) ? ($decoded['message'] ?? $decoded['error'] ?? 'Supabase request failed') : 'Supabase request failed';
        blog_json($status, ['error' => $message]);
    }

    return $decoded;
}

function blog_slugify($value) {
    $value = strtolower(trim((string) $value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value);
    return trim($value, '-');
}

function blog_strip_html($html) {
    $html = preg_replace('/<script[\s\S]*?<\/script>/i', '', (string) $html);
    $html = preg_replace('/<style[\s\S]*?<\/style>/i', '', $html);
    $html = preg_replace('/<[^>]+>/', ' ', $html);
    return trim(preg_replace('/\s+/', ' ', $html));
}

function blog_word_count($html) {
    $text = blog_strip_html($html);
    return $text === '' ? 0 : count(preg_split('/\s+/', $text));
}

function blog_excerpt($html, $max = 170) {
    $text = blog_strip_html($html);
    if (strlen($text) <= $max) return $text;
    return preg_replace('/\s+\S*$/', '', substr($text, 0, $max)) . '...';
}

function blog_plain($value, $max) {
    $value = preg_replace('/[<>]/', '', (string) $value);
    $value = preg_replace('/[\x00-\x1F\x7F]/', '', $value);
    return substr(trim($value), 0, $max);
}

function blog_tags($tags) {
    if (!is_array($tags)) return [];
    $out = [];
    foreach ($tags as $tag) {
        $slug = substr(blog_slugify($tag), 0, 24);
        if ($slug && !in_array($slug, $out, true)) $out[] = $slug;
        if (count($out) >= 8) break;
    }
    return $out;
}

function blog_normalize($post) {
    return [
        'id' => $post['id'] ?? null,
        'title' => $post['title'] ?? '',
        'slug' => $post['slug'] ?? '',
        'excerpt' => $post['excerpt'] ?? blog_excerpt($post['content_html'] ?? ''),
        'content' => $post['content'] ?? null,
        'contentHtml' => $post['content_html'] ?? '',
        'coverImage' => $post['cover_image'] ?? '',
        'category' => $post['category'] ?? 'General',
        'tags' => $post['tags'] ?? [],
        'authorId' => $post['author_id'] ?? '',
        'authorName' => $post['author_name'] ?? 'DeepSkills Team',
        'status' => $post['status'] ?? 'draft',
        'isFeatured' => !empty($post['is_featured']),
        'scheduledAt' => $post['scheduled_at'] ?? null,
        'publishedAt' => $post['published_at'] ?? null,
        'readingTime' => $post['reading_time'] ?? max(1, ceil(blog_word_count($post['content_html'] ?? '') / 200)),
        'viewCount' => $post['view_count'] ?? 0,
        'metaTitle' => $post['meta_title'] ?? '',
        'metaDescription' => $post['meta_description'] ?? '',
        'canonicalUrl' => $post['canonical_url'] ?? '',
        'relatedCourseIds' => $post['related_course_ids'] ?? [],
        'createdAt' => $post['created_at'] ?? null,
        'updatedAt' => $post['updated_at'] ?? null,
    ];
}

function blog_row($input) {
    $contentHtml = $input['contentHtml'] ?? $input['content_html'] ?? '';
    $status = $input['status'] ?? 'draft';
    return [
        'title' => blog_plain($input['title'] ?? '', 120),
        'slug' => substr(blog_slugify($input['slug'] ?? $input['title'] ?? ''), 0, 90),
        'excerpt' => blog_plain($input['excerpt'] ?? blog_excerpt($contentHtml), 220),
        'content' => $input['content'] ?? null,
        'content_html' => $contentHtml,
        'cover_image' => $input['coverImage'] ?? $input['cover_image'] ?? '',
        'category' => $input['category'] ?? 'General',
        'tags' => blog_tags($input['tags'] ?? []),
        'author_id' => $input['authorId'] ?? $input['author_id'] ?? null,
        'author_name' => $input['authorName'] ?? $input['author_name'] ?? 'DeepSkills Team',
        'status' => $status,
        'is_featured' => !empty($input['isFeatured']) || !empty($input['is_featured']),
        'scheduled_at' => $status === 'scheduled' ? ($input['scheduledAt'] ?? $input['scheduled_at'] ?? null) : null,
        'published_at' => $status === 'published' ? ($input['publishedAt'] ?? $input['published_at'] ?? gmdate('c')) : ($input['publishedAt'] ?? $input['published_at'] ?? null),
        'reading_time' => $input['readingTime'] ?? $input['reading_time'] ?? max(1, ceil(blog_word_count($contentHtml) / 200)),
        'meta_title' => blog_plain($input['metaTitle'] ?? $input['meta_title'] ?? '', 60),
        'meta_description' => blog_plain($input['metaDescription'] ?? $input['meta_description'] ?? '', 160),
        'canonical_url' => $input['canonicalUrl'] ?? $input['canonical_url'] ?? '',
        'related_course_ids' => $input['relatedCourseIds'] ?? $input['related_course_ids'] ?? [],
        'updated_at' => gmdate('c'),
    ];
}

function blog_get_bearer_token() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $matches)) {
        return trim($matches[1]);
    }
    return '';
}

function blog_authenticate() {
    $token = blog_get_bearer_token();
    if (!$token) {
        blog_json(401, ['error' => 'Authentication token is required.']);
    }

    $parts = explode('.', $token);

    // 1. Supabase JWT (Super Admin)
    if (count($parts) === 3) {
        $user = null;
        if (isset($GLOBALS['__BLOG_AUTH_HOOK__']) && is_callable($GLOBALS['__BLOG_AUTH_HOOK__'])) {
            $user = call_user_func($GLOBALS['__BLOG_AUTH_HOOK__'], $token);
        } else {
            $env = blog_load_env();
            $url = rtrim($env['NEXT_PUBLIC_SUPABASE_URL'] ?? $env['REACT_APP_SUPABASE_URL'] ?? '', '/');
            $anonKey = $env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? $env['REACT_APP_SUPABASE_ANON_KEY'] ?? ($env['SUPABASE_SERVICE_ROLE_KEY'] ?? '');

            if (!$url || !$anonKey) {
                blog_json(500, ['error' => 'Supabase environment configuration missing.']);
            }

            $headers = [
                'apikey: ' . $anonKey,
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ];
            $context = [
                'http' => [
                    'method' => 'GET',
                    'header' => implode("\r\n", $headers),
                    'ignore_errors' => true
                ]
            ];
            $res = file_get_contents($url . '/auth/v1/user', false, stream_context_create($context));
            $status = 0;
            $headersOut = function_exists('http_get_last_response_headers') ? http_get_last_response_headers() : ($http_response_header ?? []);
            if (isset($headersOut[0]) && preg_match('/\s(\d{3})\s/', $headersOut[0], $matches)) {
                $status = (int)$matches[1];
            }

            if ($status === 200) {
                $user = json_decode($res, true);
            }
        }

        if (!is_array($user) || empty($user['id'])) {
            blog_json(401, ['error' => 'Invalid or expired Super Admin credentials.']);
        }

        $isTrustedAdmin = false;
        $isTrustedContributor = false;
        $actorId = $user['id'];
        $actorName = $user['email'] ?? 'Administrator';
        $permissions = [];

        // Check server app_metadata (service role only; cannot be edited by client)
        if (($user['app_metadata']['role'] ?? '') === 'admin' || !empty($user['app_metadata']['claims_admin'])) {
            $isTrustedAdmin = true;
        }

        // Query users table for server authority and active status
        $userRecord = null;
        try {
            $queryPath = !empty($user['email'])
                ? 'users?select=id,full_name,email,role,status,custom_roles(permissions),permissions&email=eq.' . rawurlencode($user['email']) . '&limit=1'
                : 'users?select=id,full_name,email,role,status,custom_roles(permissions),permissions&id=eq.' . rawurlencode($user['id']) . '&limit=1';
            $userRows = blog_request('GET', $queryPath);
            $userRecord = is_array($userRows) ? ($userRows[0] ?? null) : null;
        } catch (Exception $e) {
            // Ignore lookup error
        }

        if ($userRecord) {
            if (($userRecord['status'] ?? '') !== 'active') {
                blog_json(403, ['error' => 'Account is inactive, suspended, or demoted.']);
            }

            $actorId = $userRecord['id'] ?? $actorId;
            $actorName = $userRecord['full_name'] ?? $actorName;

            if (($userRecord['role'] ?? '') === 'admin') {
                $isTrustedAdmin = true;
            } else {
                $isTrustedAdmin = false;
                $perms = $userRecord['custom_roles']['permissions'] ?? ($userRecord['permissions'] ?? []);
                if (($perms['blog'] ?? '') === 'full') {
                    $isTrustedContributor = true;
                    $permissions = $perms;
                }
            }
        }

        if ($isTrustedAdmin) {
            return [
                'isAdmin' => true,
                'isContributor' => false,
                'actorId' => $actorId,
                'actorName' => $actorName,
                'role' => 'admin'
            ];
        }

        if ($isTrustedContributor) {
            return [
                'isAdmin' => false,
                'isContributor' => true,
                'actorId' => $actorId,
                'actorName' => $actorName,
                'role' => 'contributor',
                'permissions' => $permissions
            ];
        }

        blog_json(403, ['error' => 'Access denied: account does not have blog management authority.']);
    }

    // 2. Portal Session Token (<uuid>.<secret>)
    if (count($parts) === 2 && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $parts[0])) {
        $rowId = $parts[0];
        $rawSecret = $parts[1];

        // Check portal_sessions table
        $row = null;
        try {
            $rows = blog_request('GET', 'portal_sessions?select=*&id=eq.' . rawurlencode($rowId) . '&limit=1');
            $row = is_array($rows) ? ($rows[0] ?? null) : null;
        } catch (Exception $e) {
            // fallback
        }

        if (!$row) {
            $rows = blog_request('GET', 'login_otps?select=id,cnic,role,token_hash,token_expires_at&id=eq.' . rawurlencode($rowId) . '&limit=1');
            $row = is_array($rows) ? ($rows[0] ?? null) : null;
            if ($row) {
                $row['expires_at'] = $row['token_expires_at'] ?? null;
                $row['revoked_at'] = null;
                $row['actor_id'] = null;
            }
        }

        if (!$row || empty($row['token_hash'])) {
            blog_json(401, ['error' => 'Session not found or expired. Please log in again.']);
        }

        if (!empty($row['revoked_at'])) {
            blog_json(401, ['error' => 'Session has been revoked. Please log in again.']);
        }

        if (empty($row['expires_at'])) {
            blog_json(401, ['error' => 'Session expiry is missing. Please log in again.']);
        }

        $expiry = strtotime($row['expires_at']);
        if ($expiry === false) {
            blog_json(401, ['error' => 'Session expiry is invalid. Please log in again.']);
        }

        if ($expiry <= time()) {
            blog_json(401, ['error' => 'Session expired. Please log in again.']);
        }

        if (!password_verify($rawSecret, $row['token_hash'])) {
            blog_json(401, ['error' => 'Invalid authentication token.']);
        }

        // Check users table by CNIC for trusted authority
        $directoryUser = null;
        try {
            $userRows = blog_request('GET', 'users?select=id,full_name,role,status,custom_roles(permissions),permissions&cnic=eq.' . rawurlencode($row['cnic']) . '&limit=1');
            $directoryUser = is_array($userRows) ? ($userRows[0] ?? null) : null;
        } catch (Exception $e) {
            // fallback
        }

        if ($directoryUser) {
            if (($directoryUser['status'] ?? '') !== 'active') {
                blog_json(403, ['error' => 'Staff account is inactive, suspended, or demoted.']);
            }

            if (($directoryUser['role'] ?? '') === 'admin') {
                return [
                    'isAdmin' => true,
                    'isContributor' => false,
                    'actorId' => $directoryUser['id'] ?? ($row['actor_id'] ?? $row['cnic']),
                    'actorName' => $directoryUser['full_name'] ?? 'DeepSkills Admin',
                    'role' => 'admin'
                ];
            }

            $perms = $directoryUser['custom_roles']['permissions'] ?? ($directoryUser['permissions'] ?? []);
            if (($perms['blog'] ?? '') === 'full') {
                return [
                    'isAdmin' => false,
                    'isContributor' => true,
                    'actorId' => $directoryUser['id'] ?? ($row['actor_id'] ?? $row['cnic']),
                    'actorName' => $directoryUser['full_name'] ?? 'Blog Contributor',
                    'role' => 'contributor',
                    'permissions' => $perms
                ];
            }

            blog_json(403, ['error' => 'Access denied: insufficient permissions to manage blog posts.']);
        }

        // If user is not in users table, check allowed_cnics where role = 'admin'
        if (($row['role'] ?? '') === 'admin') {
            try {
                $allowedRows = blog_request('GET', 'allowed_cnics?select=cnic,role,name&cnic=eq.' . rawurlencode($row['cnic']) . '&limit=1');
                $allowed = is_array($allowedRows) ? ($allowedRows[0] ?? null) : null;
                if ($allowed && ($allowed['role'] ?? '') === 'admin') {
                    return [
                        'isAdmin' => true,
                        'isContributor' => false,
                        'actorId' => $row['actor_id'] ?? $row['cnic'],
                        'actorName' => $allowed['name'] ?? 'DeepSkills Admin',
                        'role' => 'admin'
                    ];
                }
            } catch (Exception $e) {
                // fallback
            }
        }

        blog_json(403, ['error' => 'Access denied: account does not have blog management authority.']);
    }

    blog_json(401, ['error' => 'Invalid authentication token format.']);
}
?>
