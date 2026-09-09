<?php
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
$data = json_decode($input, true) ?: [];
$profileId = $data['profileId'] ?? '';
$reason = $data['reason'] ?? 'No reason provided';

$to = "info@deepskills.pk";
$subject = "DeepSkill HR: Application rejected";
$body = "
<html><body style='font-family: Arial, sans-serif; color: #222;'>
  <div style='max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;'>
    <div style='background: #7a2136; color: white; padding: 18px;'>
      <h2 style='margin:0;'>HR Application Rejected</h2>
    </div>
    <div style='padding: 20px;'>
      <p>Profile <strong>" . htmlspecialchars($profileId) . "</strong> was marked as rejected.</p>
      <p><strong>Reason:</strong> " . nl2br(htmlspecialchars($reason)) . "</p>
    </div>
  </div>
</body></html>";

$headers = "From: DeepSkills HR <dev@deepskills.pk>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";

@mail($to, $subject, $body, $headers);
echo json_encode(["status" => "success"]);
?>
