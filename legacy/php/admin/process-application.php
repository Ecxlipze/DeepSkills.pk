<?php
/**
 * DeepSkills Admin: Process Application
 * Approves or declines a student's enrollment application.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);

$userId = $data['userId'] ?? '';
$action = $data['action'] ?? ''; // 'APPROVE' or 'DECLINE'

if (!$userId || !$action) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing userId or action"]);
    exit();
}

$usersFile = "../../data/users.json";
if (!file_exists($usersFile)) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Users database not found"]);
    exit();
}

$users = json_decode(file_get_contents($usersFile), true) ?: [];
$foundIndex = -1;

foreach ($users as $index => $user) {
    if ($user['id'] == $userId) {
        $foundIndex = $index;
        break;
    }
}

if ($foundIndex === -1) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit();
}

$user = &$users[$foundIndex];

// Email configuration
$sender = "dev@deepskills.pk";
$headers = "From: DeepSkills <" . $sender . ">\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";

if ($action === 'APPROVE') {
    // Generate Password
    function generatePassword($length = 8) {
        $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        return substr(str_shuffle($chars), 0, $length);
    }
    
    $tempPassword = generatePassword(8);
    $hashedPassword = password_hash($tempPassword, PASSWORD_DEFAULT);
    
    // Update User
    $user['status'] = 'approved';
    $user['password'] = $hashedPassword;
    $user['is_first_login'] = true;
    
    // Send Approval Email
    $subject = "DeepSkills Admission Approved - Next Steps Internally";
    $body = "
    <html>
    <body style='font-family: sans-serif; color: #333;'>
        <div style='max-width: 600px; margin: auto; border: 2px solid #7a2136; border-radius: 15px; overflow: hidden;'>
            <div style='background: #7a2136; color: white; padding: 20px; text-align: center;'>
                <h1 style='margin:0;'>Welcome to DeepSkills!</h1>
            </div>
            <div style='padding: 30px;'>
                <h3>Dear {$user['firstName']},</h3>
                <p>Congratulations! Your application for <strong>{$user['selectedCourse']}</strong> has been <strong>APPROVED</strong>.</p>
                <p>You can now access your student portal using the credentials below:</p>
                <div style='background: #fdf2f4; padding: 15px; border-radius: 8px; border-left: 5px solid #7a2136;'>
                    <p style='margin: 5px 0;'><strong>Login Email:</strong> {$user['email']}</p>
                    <p style='margin: 5px 0;'><strong>Temporary Password:</strong> <span style='color: #7a2136; font-size: 1.2rem; font-weight: 700;'>{$tempPassword}</span></p>
                </div>
                <p style='color: #666; font-size: 0.8rem; margin-top: 15px;'>
                    <em>Note: You will be required to change this password after your first login.</em>
                </p>
                <div style='text-align: center; margin-top: 30px;'>
                    <a href='https://deepskills.pk/login' style='background: #7a2136; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;'>Login Now</a>
                </div>
                <p style='margin-top: 40px;'>We are excited to have you on board!</p>
                <p>Happy Learning!<br><strong>Team DeepSkills</strong></p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    mail($user['email'], $subject, $body, $headers);
    $message = "Application approved and credentials sent to student.";

} else if ($action === 'DECLINE') {
    $user['status'] = 'declined';
    
    // Send Rejection Email
    $subject = "DeepSkills Admission Update";
    $body = "
    <html>
    <body style='font-family: sans-serif; color: #333;'>
        <div style='max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 15px; overflow: hidden;'>
            <div style='background: #f8f9fa; color: #333; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;'>
                <h1 style='margin:0;'>DeepSkills Admissions</h1>
            </div>
            <div style='padding: 30px;'>
                <h3>Dear {$user['firstName']},</h3>
                <p>Thank you for your interest in the <strong>{$user['selectedCourse']}</strong> course at DeepSkills.</p>
                <p>After careful review of your application, we regret to inform you that we are unable to offer you admission at this time.</p>
                <p>We appreciate your interest and wish you the best of luck in your future endeavors.</p>
                <p>Best Regards,<br><strong>Admissions Team, DeepSkills</strong></p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    mail($user['email'], $subject, $body, $headers);
    $message = "Application declined and student notified.";
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid action"]);
    exit();
}

file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));

echo json_encode(["status" => "success", "message" => $message]);
?>
