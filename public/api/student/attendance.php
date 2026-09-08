<?php
require_once __DIR__ . '/../auth/_otp_common.php';
header('Content-Type: application/json');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    otp_respond(405, ['status' => 'error', 'message' => 'Method not allowed']);
}
$session = portal_require_session(['student']);
try {
    $students = otp_supabase_request('GET', 'admissions?select=id,course,batch&cnic=eq.' . rawurlencode($session['cnic']) . '&status=in.(Active,Graduated)&order=submitted_at.desc', null, '', true);
    if (!is_array($students)) throw new Exception('Student lookup failed');
    if (!$students) otp_respond(403, ['status' => 'error', 'message' => 'Active student admission not found.']);
    $ids = implode(',', array_map(function ($student) { return rawurlencode($student['id']); }, $students));
    $records = otp_supabase_request('GET', 'attendance?select=id,student_id,date,day_of_week,batch_id,batch_name,course,status,marked_at,is_locked&student_id=in.(' . $ids . ')&order=date.desc', null, '', true);
    if (!is_array($records)) throw new Exception('Attendance lookup failed');
    otp_respond(200, ['status' => 'success', 'data' => ['records' => $records, 'enrollments' => $students]]);
} catch (Exception $error) {
    otp_respond(500, ['status' => 'error', 'message' => 'Failed to load attendance. Please try again.']);
}
