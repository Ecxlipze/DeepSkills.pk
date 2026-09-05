<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['POST']);

$auth = portal_authorize_admin_operation('hr');

$data = otp_json_input();
$profileId = trim((string)($data['profileId'] ?? ''));
$adminNote = trim((string)($data['adminNote'] ?? ''));

if (!$profileId) {
    otp_respond(400, ['status' => 'error', 'message' => 'HR Profile ID is required.']);
}

// 1. Fetch HR profile
$profile = auth_first(otp_supabase_request('GET', 'hr_profiles?id=eq.' . rawurlencode($profileId) . '&limit=1'));
if (!$profile) {
    otp_respond(404, ['status' => 'error', 'message' => 'HR profile not found.']);
}

$now = gmdate('c');

// 2. Update HR profile
otp_supabase_request('PATCH', 'hr_profiles?id=eq.' . rawurlencode($profileId), [
    'hr_status' => 'hired',
    'hired_at' => $now,
    'current_step' => 5,
    'updated_at' => $now
], 'return=minimal');

// 3. Update teacher status to Active
$teacherId = $profile['teacher_id'] ?? null;
$teacher = null;
if ($teacherId) {
    $teacher = auth_first(otp_supabase_request('GET', 'teachers?id=eq.' . rawurlencode($teacherId) . '&limit=1'));
    if ($teacher) {
        otp_supabase_request('PATCH', 'teachers?id=eq.' . rawurlencode($teacherId), [
            'status' => 'Active'
        ], 'return=minimal');

        // 4. Ensure allowed_cnics is active
        if (!empty($teacher['cnic'])) {
            $cnic = otp_normalize_cnic($teacher['cnic']);
            if ($cnic) {
                otp_supabase_request('POST', 'allowed_cnics?on_conflict=cnic', [[
                    'cnic' => $cnic,
                    'name' => $teacher['name'] ?? '',
                    'role' => 'teacher',
                    'assigned_course' => $teacher['specialization'] ?: 'Teacher'
                ]], 'resolution=merge-duplicates,return=minimal');
            }
        }
    }
}

// 5. Send notification email
$to = "info@deepskills.pk";
$subject = "DeepSkill HR: Hiring finalized";
$body = "
<html><body style='font-family: Arial, sans-serif; color: #222;'>
  <div style='max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;'>
    <div style='background: #7a2136; color: white; padding: 18px;'>
      <h2 style='margin:0;'>Hiring Finalized</h2>
    </div>
    <div style='padding: 20px;'>
      <p>The HR process for teacher <strong>" . htmlspecialchars($teacher['name'] ?? $profileId) . "</strong> has been finalized and status is now <strong>Active</strong>.</p>
      " . ($adminNote ? "<p><strong>Admin Note:</strong> " . nl2br(htmlspecialchars($adminNote)) . "</p>" : "") . "
    </div>
  </div>
</body></html>";

$headers = "From: DeepSkills HR <dev@deepskills.pk>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";

@mail($to, $subject, $body, $headers);

otp_respond(200, [
    'status' => 'success',
    'message' => 'Hiring process finalized and teacher activated.',
    'teacherId' => $teacherId
]);
?>
