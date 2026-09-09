<?php
/**
 * DeepSkills Admin: Get Applications
 * Fetches all users with status 'pending'.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$usersFile = "../../data/users.json";
if (!file_exists($usersFile)) {
    echo json_encode([]);
    exit();
}

$users = json_decode(file_get_contents($usersFile), true) ?: [];
$applications = [];

foreach ($users as $user) {
    if (($user['status'] ?? '') === 'pending') {
        // Return necessary details for the admin dashboard
        $applications[] = [
            "id" => $user['id'],
            "name" => $user['name'] ?? ($user['firstName'] . ' ' . $user['lastName']),
            "email" => $user['email'],
            "mobileNo" => $user['mobileNo'],
            "lastEducation" => $user['lastEducation'],
            "selectedCourse" => $user['selectedCourse'],
            "created_at" => $user['created_at'] ?? ''
        ];
    }
}

// Sort by date (newest first)
usort($applications, function($a, $b) {
    return strcmp($b['created_at'], $a['created_at']);
});

echo json_encode($applications);
?>
