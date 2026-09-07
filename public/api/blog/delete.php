<?php
require_once __DIR__ . '/_supabase.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    blog_json(200, ['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    header('Allow: DELETE');
    blog_json(405, ['error' => 'Method not allowed']);
}

$auth = blog_authenticate();
if (empty($auth['isAdmin'])) {
    blog_json(403, ['error' => 'Only admins can delete blog posts.']);
}

$id = $_GET['id'] ?? '';
if (!$id) {
    blog_json(400, ['error' => 'Blog post id is required.']);
}

blog_request('DELETE', 'blog_posts?id=eq.' . rawurlencode($id));
blog_json(200, ['deleted' => true]);
?>
