<?php
require_once __DIR__ . '/_supabase.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    blog_json(200, ['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    blog_json(405, ['error' => 'Method not allowed']);
}

$auth = blog_authenticate();
$isAdmin = !empty($auth['isAdmin']);
$actorId = $auth['actorId'];
$actorName = $auth['actorName'];

$payload = isset($GLOBALS['__BLOG_INPUT__'])
    ? (is_string($GLOBALS['__BLOG_INPUT__']) ? json_decode($GLOBALS['__BLOG_INPUT__'], true) : $GLOBALS['__BLOG_INPUT__'])
    : (json_decode(file_get_contents('php://input'), true) ?: []);
$row = blog_row($payload ?: []);

if ($isAdmin) {
    $row['author_id'] = $row['author_id'] ?: $actorId;
    $row['author_name'] = $row['author_name'] ?: $actorName;
} else {
    $row['status'] = 'draft';
    $row['is_featured'] = false;
    $row['published_at'] = null;
    $row['scheduled_at'] = null;
    $row['author_id'] = $actorId;
    $row['author_name'] = $actorName;
}

if (!$row['title'] || !$row['slug']) {
    blog_json(400, ['error' => 'Title and slug are required.']);
}

if (strlen($row['content_html']) > 30000 || blog_word_count($row['content_html']) > 2500) {
    blog_json(400, ['error' => 'Blog content is limited to 2500 words.']);
}

if (!$isAdmin && !empty($payload['id'])) {
    $id = rawurlencode($payload['id']);
    $existing = blog_request('GET', "blog_posts?id=eq.$id&select=id,author_id,status");
    $existing = $existing[0] ?? null;
    if (!$existing) blog_json(404, ['error' => 'Draft not found.']);
    if (($existing['status'] ?? '') !== 'draft') {
        blog_json(403, ['error' => 'Contributors can only edit draft posts.']);
    }
    if (($existing['author_id'] ?? '') !== $actorId) {
        blog_json(403, ['error' => 'Contributors can only edit their own drafts.']);
    }
}

if ($isAdmin && $row['is_featured']) {
    blog_request('PATCH', 'blog_posts?is_featured=eq.true', ['is_featured' => false]);
}

if (!empty($payload['id'])) {
    $id = rawurlencode($payload['id']);
    $result = blog_request('PATCH', "blog_posts?id=eq.$id&select=*", $row, ['Prefer: return=representation']);
} else {
    $row['created_at'] = gmdate('c');
    $result = blog_request('POST', 'blog_posts?select=*', [$row], ['Prefer: return=representation']);
}

$post = is_array($result) ? ($result[0] ?? $result) : null;
blog_json(200, ['post' => blog_normalize($post ?: [])]);
?>
