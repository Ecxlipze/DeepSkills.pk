<?php
/**
 * DeepSkills Contact Form Handler
 * Recipient: info@deepskills.pk 
 */

// Restrict origins to the authorized domain
$allowed_origin = "https://deepskills.pk";
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit();
}

// Get JSON input
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No data provided"]);
    exit();
}

// Anti-spam Honeypot Check
if (!empty($data['bot-field'])) {
    echo json_encode(["status" => "success", "message" => "Message sent (filtered)"]);
    exit();
}

// Sanitize and Validate fields
$name = strip_tags(trim($data['name'] ?? ''));
$email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
$phone = strip_tags(trim($data['phone'] ?? ''));
$message = strip_tags(trim($data['message'] ?? ''));

// Strict Backend Validation (Mirroring Frontend)
$name_valid = preg_match("/^[a-zA-Z\s.-]+$/", $name);
$phone_valid = preg_match("/^\+?\d+$/", $phone);

if (!$name || !$email || !$phone || !$message) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "All fields are required."]);
    exit();
}

if (!$name_valid || strlen($name) > 50) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid name format or length."]);
    exit();
}

if (!$phone_valid || strlen($phone) > 15) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid phone format or length."]);
    exit();
}

if (strlen($message) > 500) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Message exceeds 500 character limit."]);
    exit();
}

// Email Configuration
$to = "info@deepskills.pk";
$subject = "DeepSkills Website Inquiry: " . $name;

// Use the authorized domain email as the sender (Crucial for deliverability)
$sender = "dev@deepskills.pk"; 

$headers = "From: DeepSkills Contact <" . $sender . ">\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Return-Path: " . $sender . "\r\n"; // Added for better host trust
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "X-Priority: 3 (Normal)\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

// Email Body (HTML)
$emailBody = "
<html>
<head>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { border: 1px solid #7a2136; padding: 20px; border-radius: 10px; max-width: 600px; }
        .header { background: #7a2136; color: white; padding: 10px; margin: -20px -20px 20px -20px; border-radius: 10px 10px 0 0; }
        strong { color: #7a2136; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2 style='margin:0;'>New Website Inquiry</h2>
        </div>
        <p><strong>Name:</strong> " . $name . "</p>
        <p><strong>Email:</strong> " . $email . "</p>
        <p><strong>Phone:</strong> " . $phone . "</p>
        <hr style='border: 0; border-top: 1px solid #7a2136;' />
        <p><strong>Message:</strong></p>
        <p>" . nl2br($message) . "</p>
    </div>
</body>
</html>
";

// Send Email
if (mail($to, $subject, $emailBody, $headers)) {
    echo json_encode(["status" => "success", "message" => "Your message has been sent successfully."]);
} else {
    // If mail fails, usually it's a server restriction
    error_log("Mail failure in contact.php for: " . $email);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error: Unable to send email. Please try again later."]);
}
?>
