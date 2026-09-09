<?php
require_once __DIR__ . '/blog/_supabase.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    blog_json(200, ['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    blog_json(405, ['error' => 'Method not allowed']);
}

$payload = json_decode(file_get_contents('php://input'), true) ?: [];
$slug = $payload['slug'] ?? '';
if (!$slug) {
    blog_json(400, ['error' => 'Post slug is required.']);
}

blog_request('POST', 'rpc/increment_blog_view', ['post_slug' => $slug]);
blog_json(200, ['counted' => true]);
?>
