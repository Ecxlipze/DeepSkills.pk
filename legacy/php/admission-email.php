<?php
/**
 * Sends admission and enrollment status emails.
 * Expected JSON: { event, email, name, course, cnic, reason?, batch?, timing? }
 */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || empty($data['event']) || empty($data['email'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Event and email are required."]);
    exit;
}

function clean_text($value, $max = 160) {
    $value = trim((string)($value ?? ''));
    $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value);
    return htmlspecialchars(substr($value, 0, $max), ENT_QUOTES, 'UTF-8');
}

$event = clean_text($data['event'], 60);
$email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
$name = clean_text($data['name'] ?? 'Student', 120);
$course = clean_text($data['course'] ?? 'your selected course', 160);
$cnic = clean_text($data['cnic'] ?? '', 30);
$reason = clean_text($data['reason'] ?? 'Please contact admin for details.', 300);
$batch = clean_text($data['batch'] ?? '', 120);
$timing = clean_text($data['timing'] ?? '', 120);
$title = clean_text($data['title'] ?? '', 160);
$messageText = clean_text($data['message'] ?? '', 500);
$link = clean_text($data['link'] ?? '', 200);

if (!$email) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid email address."]);
    exit;
}

$allowedEvents = [
    'registration_received',
    'admission_approved',
    'admission_rejected',
    'admission_inactive',
    're_enrollment_requested',
    're_enrollment_approved',
    're_enrollment_rejected',
    'inquiry_received',
    'welcome',
    'login_instructions',
    'notification'
];

if (!in_array($event, $allowedEvents, true)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid email event."]);
    exit;
}

$brand = "DeepSkills";
$fromEmail = "info@deepskills.pk";
$replyTo = "info@deepskills.pk";
$subject = "";
$intro = "";
$body = "";
$cta = "";

switch ($event) {
    case 'registration_received':
        $subject = "DeepSkills: Application received";
        $intro = "Application received";
        $body = "Thank you for applying for <strong>{$course}</strong>. Your application is pending admin approval. Our team will review your details and update you soon.";
        $cta = "You will be able to log in with your CNIC after your admission is approved.";
        break;

    case 'admission_approved':
        $subject = "DeepSkills: Admission approved";
        $intro = "Your admission is approved";
        $batchText = $batch ? "<p><strong>Batch:</strong> {$batch}</p>" : "";
        $timingText = $timing ? "<p><strong>Timing:</strong> {$timing}</p>" : "";
        $body = "Your admission for <strong>{$course}</strong> has been approved. You can now log in using your CNIC.<p><strong>CNIC:</strong> {$cnic}</p>{$batchText}{$timingText}";
        $cta = "Login at https://deepskills.pk/login";
        break;

    case 'admission_rejected':
        $subject = "DeepSkills: Admission update";
        $intro = "Please contact admin";
        $body = "Your admission application for <strong>{$course}</strong> was not approved at this time.<p><strong>Reason:</strong> {$reason}</p>";
        $cta = "Please contact DeepSkills admin for next steps.";
        break;

    case 'admission_inactive':
        $subject = "DeepSkills: Account status update";
        $intro = "Please contact admin";
        $body = "Your admission/account status for <strong>{$course}</strong> is inactive or blocked.";
        $cta = "Please contact DeepSkills admin to resolve this.";
        break;

    case 're_enrollment_requested':
        $subject = "DeepSkills: Re-enrollment request received";
        $intro = "Re-enrollment request received";
        $body = "Your re-enrollment request for <strong>{$course}</strong> has been submitted and is pending admin approval.";
        $cta = "We will update you after review.";
        break;

    case 're_enrollment_approved':
        $subject = "DeepSkills: Re-enrollment approved";
        $intro = "Your re-enrollment is approved";
        $batchText = $batch ? "<p><strong>Batch:</strong> {$batch}</p>" : "";
        $timingText = $timing ? "<p><strong>Timing:</strong> {$timing}</p>" : "";
        $body = "Your re-enrollment for <strong>{$course}</strong> has been approved.{$batchText}{$timingText}";
        $cta = "Login at https://deepskills.pk/login";
        break;

    case 're_enrollment_rejected':
        $subject = "DeepSkills: Re-enrollment update";
        $intro = "Please contact admin";
        $body = "Your re-enrollment request for <strong>{$course}</strong> was not approved at this time.<p><strong>Reason:</strong> {$reason}</p>";
        $cta = "Please contact DeepSkills admin for next steps.";
        break;

    case 'inquiry_received':
        $subject = "DeepSkills: Inquiry received";
        $intro = "We received your inquiry";
        $body = "Thank you for your interest in <strong>{$course}</strong>. Our counsellor will contact you within 24 hours to guide you through course, batch, and fee details.";
        $cta = "You do not need to log in yet. Dashboard access is enabled after counsellor enrollment.";
        break;

    case 'welcome':
        $subject = "Welcome to DeepSkills";
        $intro = "Your enrollment is confirmed";
        $batchText = $batch ? "<p><strong>Batch:</strong> {$batch}</p>" : "";
        $timingText = $timing ? "<p><strong>Timing:</strong> {$timing}</p>" : "";
        $body = "Welcome to <strong>{$course}</strong>. Your enrollment has been confirmed.{$batchText}{$timingText}<p><strong>CNIC:</strong> {$cnic}</p>";
        $cta = "Login at https://deepskills.pk/login. You will receive an email OTP during login.";
        break;

    case 'login_instructions':
        $subject = "DeepSkills: Login instructions";
        $intro = "Your dashboard login";
        $body = "Use your CNIC to sign in to your DeepSkills dashboard.<p><strong>CNIC:</strong> {$cnic}</p><p>You will receive a one-time password on this email during login.</p>";
        $cta = "Login at https://deepskills.pk/login";
        break;

    case 'notification':
        $subject = $title ? "DeepSkills: {$title}" : "DeepSkills: Important notification";
        $intro = $title ?: "Important notification";
        $body = $messageText ?: "You have a new important notification from DeepSkills.";
        $cta = $link ? "Open: https://deepskills.pk{$link}" : "Login at https://deepskills.pk/login";
        break;
}

$message = "
<html>
<body style='margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#222;'>
  <div style='max-width:640px;margin:0 auto;background:#ffffff;'>
    <div style='background:#7B1F2E;color:#ffffff;padding:24px 28px;'>
      <h1 style='margin:0;font-size:24px;'>{$brand}</h1>
    </div>
    <div style='padding:28px;'>
      <h2 style='margin:0 0 16px;color:#7B1F2E;font-size:22px;'>{$intro}</h2>
      <p>Dear {$name},</p>
      <div style='font-size:15px;line-height:1.7;'>{$body}</div>
      <p style='margin-top:24px;padding:14px 16px;background:#f8eef0;border-left:4px solid #7B1F2E;'>{$cta}</p>
      <p style='margin-top:28px;'>Regards,<br><strong>DeepSkills Team</strong></p>
    </div>
  </div>
</body>
</html>";

$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-type:text/html;charset=UTF-8\r\n";
$headers .= "From: DeepSkills <{$fromEmail}>\r\n";
$headers .= "Reply-To: {$replyTo}\r\n";

if (mail($email, $subject, $message, $headers)) {
    echo json_encode(["status" => "success", "message" => "Email sent."]);
} else {
    error_log("Admission email failed for {$email} event {$event}");
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Unable to send email."]);
}
?>
