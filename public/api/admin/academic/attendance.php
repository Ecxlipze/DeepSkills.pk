<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $p = $permissions['attendance'] ?? '';
    if ($p !== 'view' && $p !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions for attendance management.'
        ]);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

// ──────────────────────────────────────────
// GET: Fetch Attendance Records, Sessions, Defaulters
// ──────────────────────────────────────────
if ($method === 'GET') {
    try {
        $month = $_GET['month'] ?? date('Y-m');
        $batchId = $_GET['batch_id'] ?? '';
        $targetDate = $_GET['date'] ?? date('Y-m-d');

        $startDate = "{$month}-01";
        $nextMonth = date('Y-m-d', strtotime("{$startDate} +1 month"));

        // 1. Batches
        $batchesRes = otp_supabase_request('GET', 'batches?select=*&order=batch_name.asc');
        $batches = is_array($batchesRes) ? $batchesRes : [];

        // 2. Active Admissions
        $admRes = otp_supabase_request('GET', 'admissions?select=id,name,cnic,phone,email,course,batch,batch_timing,photo_url,status&status=in.(Active,Graduated)&order=name.asc');
        $allAdmissions = is_array($admRes) ? $admRes : [];

        // Find current batch if batchId provided
        $currentBatch = null;
        if (!empty($batchId)) {
            foreach ($batches as $b) {
                if (($b['id'] ?? '') === $batchId || ($b['batch_name'] ?? '') === $batchId) {
                    $currentBatch = $b;
                    break;
                }
            }
        }

        $relevantAdmissions = array_filter($allAdmissions, function($s) use ($batchId, $currentBatch) {
            if (empty($batchId)) return true;
            $bName = $currentBatch['batch_name'] ?? $batchId;
            return ($s['batch'] ?? '') === $bName;
        });
        $relevantAdmissions = array_values($relevantAdmissions);

        // 3. Monthly Attendance logs
        $query = "attendance?select=*&date=gte.{$startDate}&date=lt.{$nextMonth}";
        if (!empty($batchId)) {
            $query .= "&batch_id=eq." . urlencode($batchId);
        }
        $attRes = otp_supabase_request('GET', $query);
        $attendanceLogs = is_array($attRes) ? $attRes : [];

        // 4. Student Stats & Defaulters
        $studentMap = [];
        foreach ($relevantAdmissions as $st) {
            $sid = $st['id'];
            $studentMap[$sid] = [
                'id' => $sid,
                'name' => $st['name'] ?? 'Student',
                'cnic' => $st['cnic'] ?? '—',
                'phone' => $st['phone'] ?? '—',
                'email' => $st['email'] ?? '—',
                'course' => $st['course'] ?? '',
                'batch' => $st['batch'] ?? '',
                'photo_url' => $st['photo_url'] ?? null,
                'present' => 0,
                'late' => 0,
                'absent' => 0,
                'excused' => 0,
                'total' => 0,
                'pct' => 0,
                'lastDate' => '',
                'lastStatus' => ''
            ];
        }

        foreach ($attendanceLogs as $r) {
            $sid = $r['student_id'] ?? '';
            if (empty($sid)) continue;
            if (!isset($studentMap[$sid]) && empty($batchId)) {
                $studentMap[$sid] = [
                    'id' => $sid,
                    'name' => $r['student_name'] ?? 'Student',
                    'cnic' => $r['student_cnic'] ?? '—',
                    'phone' => '—',
                    'course' => $r['course'] ?? '',
                    'batch' => $r['batch_name'] ?? '',
                    'present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0, 'total' => 0, 'pct' => 0,
                    'lastDate' => '', 'lastStatus' => ''
                ];
            }

            if (isset($studentMap[$sid])) {
                $studentMap[$sid]['total'] += 1;
                $status = $r['status'] ?? '';
                if ($status === 'present') $studentMap[$sid]['present'] += 1;
                elseif ($status === 'late') $studentMap[$sid]['late'] += 1;
                elseif ($status === 'absent') $studentMap[$sid]['absent'] += 1;
                elseif ($status === 'excused') $studentMap[$sid]['excused'] += 1;

                if (empty($studentMap[$sid]['lastDate']) || strcmp($r['date'], $studentMap[$sid]['lastDate']) > 0) {
                    $studentMap[$sid]['lastDate'] = $r['date'];
                    $studentMap[$sid]['lastStatus'] = $status;
                }
            }
        }

        $studentStatsList = [];
        foreach ($studentMap as $st) {
            $attended = $st['present'] + $st['late'];
            $st['pct'] = $st['total'] > 0 ? (int)round(($attended / $st['total']) * 100) : 100;
            $studentStatsList[] = $st;
        }

        // Defaulters (<75%)
        $defaulters = array_filter($studentStatsList, function($s) {
            return $s['total'] > 0 && $s['pct'] < 75;
        });
        usort($defaulters, function($a, $b) {
            return $a['pct'] <=> $b['pct'];
        });
        $defaulters = array_values($defaulters);

        // 5. Sessions Map
        $sessionsMap = [];
        foreach ($attendanceLogs as $r) {
            $bId = $r['batch_id'] ?? ($r['batch_name'] ?? '');
            $key = ($r['date'] ?? '') . '_' . $bId;
            if (!isset($sessionsMap[$key])) {
                $sessionsMap[$key] = [
                    'key' => $key,
                    'date' => $r['date'] ?? '',
                    'day' => $r['day_of_week'] ?? '',
                    'batchId' => $r['batch_id'] ?? '',
                    'batch' => $r['batch_name'] ?? '',
                    'course' => $r['course'] ?? '',
                    'present' => 0,
                    'late' => 0,
                    'absent' => 0,
                    'excused' => 0,
                    'total' => 0,
                    'lockedCount' => 0,
                    'isLocked' => true
                ];
            }
            $sessionsMap[$key]['total'] += 1;
            $st = $r['status'] ?? '';
            if ($st === 'present') $sessionsMap[$key]['present'] += 1;
            elseif ($st === 'late') $sessionsMap[$key]['late'] += 1;
            elseif ($st === 'absent') $sessionsMap[$key]['absent'] += 1;
            elseif ($st === 'excused') $sessionsMap[$key]['excused'] += 1;

            if (!empty($r['is_locked'])) $sessionsMap[$key]['lockedCount'] += 1;
            $sessionsMap[$key]['isLocked'] = $sessionsMap[$key]['lockedCount'] === $sessionsMap[$key]['total'];
        }

        $sessions = [];
        foreach ($sessionsMap as $s) {
            $s['rate'] = $s['total'] > 0 ? (int)round((($s['present'] + $s['late']) / $s['total']) * 100) : 0;
            $sessions[] = $s;
        }
        usort($sessions, function($a, $b) {
            return strcmp($b['date'], $a['date']);
        });

        // 6. Daily Sheet for Date
        $dailySheet = null;
        if (!empty($batchId)) {
            $dateLogs = otp_supabase_request('GET', "attendance?select=*&date=eq.{$targetDate}&batch_id=eq." . urlencode($batchId));
            $dateRecords = is_array($dateLogs) ? $dateLogs : [];

            $dateRecordMap = [];
            foreach ($dateRecords as $dr) {
                $dateRecordMap[$dr['student_id']] = $dr;
            }

            $sheetStudents = [];
            foreach ($relevantAdmissions as $st) {
                $rec = $dateRecordMap[$st['id']] ?? null;
                $hist = $studentMap[$st['id']] ?? null;
                $sheetStudents[] = [
                    'student_id' => $st['id'],
                    'student_name' => $st['name'],
                    'student_cnic' => $st['cnic'],
                    'phone' => $st['phone'] ?? '—',
                    'photo_url' => $st['photo_url'] ?? null,
                    'status' => $rec['status'] ?? 'unmarked',
                    'reason' => $rec['absence_reason'] ?? '',
                    'is_locked' => !empty($rec['is_locked']),
                    'attendance_id' => $rec['id'] ?? null,
                    'history_pct' => $hist['pct'] ?? 100
                ];
            }

            $isLocked = !empty($dateRecords) && count($dateRecords) > 0;
            foreach ($dateRecords as $dr) {
                if (empty($dr['is_locked'])) {
                    $isLocked = false;
                    break;
                }
            }

            $dailySheet = [
                'date' => $targetDate,
                'batch_id' => $batchId,
                'batch_name' => $currentBatch['batch_name'] ?? '',
                'course' => $currentBatch['course'] ?? '',
                'isLocked' => $isLocked,
                'students' => $sheetStudents
            ];
        }

        // Stats summary
        $totalAttended = 0;
        $totalPossible = 0;
        $perfectCount = 0;
        foreach ($studentStatsList as $s) {
            $totalAttended += ($s['present'] + $s['late']);
            $totalPossible += $s['total'];
            if ($s['total'] > 0 && $s['pct'] === 100) $perfectCount++;
        }
        $overallRate = $totalPossible > 0 ? (int)round(($totalAttended / $totalPossible) * 100) : 0;

        otp_respond(200, [
            'status' => 'success',
            'data' => [
                'batches' => $batches,
                'admissions' => $relevantAdmissions,
                'sessions' => $sessions,
                'students' => $studentStatsList,
                'defaulters' => $defaulters,
                'stats' => [
                    'overallRate' => $overallRate,
                    'totalSessions' => count($sessions),
                    'atRiskCount' => count($defaulters),
                    'perfectCount' => $perfectCount,
                    'totalRecords' => count($attendanceLogs),
                    'activeStudents' => count($relevantAdmissions)
                ],
                'dailySheet' => $dailySheet
            ]
        ]);
    } catch (Exception $e) {
        otp_respond(500, ['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// ──────────────────────────────────────────
// POST: Bulk Save, Kiosk Check-In, Lock, Warning
// ──────────────────────────────────────────
if ($method === 'POST') {
    $body = otp_read_json();
    $action = $body['action'] ?? '';

    // Action 1: Save Bulk
    if ($action === 'save_bulk') {
        $batchId = $body['batch_id'] ?? '';
        $date = $body['date'] ?? '';
        $records = $body['records'] ?? [];
        $isLocked = !empty($body['is_locked']);

        if (empty($batchId) || empty($date) || !is_array($records)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Missing batch_id, date, or records.']);
        }

        // Fetch batch
        $bRes = otp_supabase_request('GET', 'batches?select=id,batch_name,course&id=eq.' . urlencode($batchId));
        $batch = is_array($bRes) && isset($bRes[0]) ? $bRes[0] : null;
        if (!$batch) {
            otp_respond(404, ['status' => 'error', 'message' => 'Batch not found.']);
        }

        $dayOfWeek = date('l', strtotime($date));
        $now = date('c');

        $rows = [];
        foreach ($records as $r) {
            $st = $r['status'] ?? '';
            if (empty($st) || $st === 'unmarked') continue;

            $rows[] = [
                'student_id' => $r['student_id'] ?? '',
                'student_name' => $r['student_name'] ?? '',
                'student_cnic' => $r['student_cnic'] ?? '',
                'batch_id' => $batchId,
                'batch_name' => $batch['batch_name'] ?? '',
                'course' => $batch['course'] ?? '',
                'date' => $date,
                'day_of_week' => $dayOfWeek,
                'status' => $st,
                'marked_by' => 'admin',
                'marked_at' => $now,
                'absence_reason' => !empty($r['reason']) ? trim($r['reason']) : null,
                'is_locked' => $isLocked
            ];
        }

        if (empty($rows)) {
            otp_respond(400, ['status' => 'error', 'message' => 'No valid marks to save.']);
        }

        $res = otp_supabase_request(
            'POST',
            'attendance?on_conflict=student_id,batch_id,date',
            $rows,
            ['Prefer: resolution=merge-duplicates,return=representation']
        );

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Saved attendance for ' . count($rows) . ' students.',
            'data' => $res
        ]);
    }

    // Action 2: Kiosk Check-In
    if ($action === 'kiosk_checkin') {
        $identifier = trim($body['identifier'] ?? '');
        $batchId = $body['batch_id'] ?? '';
        $date = $body['date'] ?? date('Y-m-d');

        if (empty($identifier)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Student CNIC or ID is required.']);
        }

        // Clean digits
        $digits = preg_replace('/\D/', '', $identifier);
        $normCnic = strlen($digits) === 13 ? substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . substr($digits, 12) : '';

        // Query student
        $query = "admissions?select=*&status=in.(Active,Graduated)";
        if (!empty($normCnic)) {
            $query .= "&or=(cnic.eq." . urlencode($normCnic) . ",id.eq." . urlencode($identifier) . ")";
        } else {
            $query .= "&or=(id.eq." . urlencode($identifier) . ",cnic.ilike.*" . urlencode($identifier) . "*)";
        }

        $sRes = otp_supabase_request('GET', $query);
        $student = is_array($sRes) && isset($sRes[0]) ? $sRes[0] : null;
        if (!$student) {
            otp_respond(404, ['status' => 'error', 'message' => 'No active student found matching this identifier.']);
        }

        // Batch details
        $batch = null;
        if (!empty($batchId)) {
            $bRes = otp_supabase_request('GET', 'batches?select=*&id=eq.' . urlencode($batchId));
            $batch = is_array($bRes) && isset($bRes[0]) ? $bRes[0] : null;
        } elseif (!empty($student['batch'])) {
            $bRes = otp_supabase_request('GET', 'batches?select=*&batch_name=eq.' . urlencode($student['batch']));
            $batch = is_array($bRes) && isset($bRes[0]) ? $bRes[0] : null;
        }

        $finalBatchId = $batch['id'] ?? 'general';
        $finalBatchName = $batch['batch_name'] ?? ($student['batch'] ?? 'General Batch');
        $finalCourse = $batch['course'] ?? ($student['course'] ?? 'Training Program');

        $now = date('c');
        $dayOfWeek = date('l');
        $checkinStatus = 'present';

        $checkinRow = [
            'student_id' => $student['id'],
            'student_name' => $student['name'],
            'student_cnic' => $student['cnic'],
            'batch_id' => $finalBatchId,
            'batch_name' => $finalBatchName,
            'course' => $finalCourse,
            'date' => $date,
            'day_of_week' => $dayOfWeek,
            'status' => $checkinStatus,
            'marked_by' => 'kiosk',
            'marked_at' => $now,
            'is_locked' => false
        ];

        $insRes = otp_supabase_request(
            'POST',
            'attendance?on_conflict=student_id,batch_id,date',
            [$checkinRow],
            ['Prefer: resolution=merge-duplicates,return=representation']
        );

        otp_respond(200, [
            'status' => 'success',
            'message' => "{$student['name']} checked in successfully as " . strtoupper($checkinStatus) . "!",
            'data' => [
                'student' => [
                    'id' => $student['id'],
                    'name' => $student['name'],
                    'cnic' => $student['cnic'],
                    'course' => $finalCourse,
                    'batch' => $finalBatchName,
                    'photo_url' => $student['photo_url'] ?? null
                ],
                'status' => $checkinStatus,
                'timestamp' => date('h:i A')
            ]
        ]);
    }

    // Action 3: Toggle Lock
    if ($action === 'toggle_lock') {
        $date = $body['date'] ?? '';
        $batchId = $body['batch_id'] ?? '';
        $isLocked = !empty($body['is_locked']);

        if (empty($date) || empty($batchId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Date and batch_id are required.']);
        }

        otp_supabase_request(
            'PATCH',
            "attendance?date=eq.{$date}&batch_id=eq." . urlencode($batchId),
            ['is_locked' => $isLocked]
        );

        otp_respond(200, [
            'status' => 'success',
            'message' => "Attendance for {$date} has been " . ($isLocked ? 'locked' : 'unlocked') . "."
        ]);
    }

    // Action 4: Send Warning
    if ($action === 'send_warning') {
        $studentId = $body['student_id'] ?? '';
        $sName = $body['student_name'] ?? 'Student';
        $sCnic = $body['student_cnic'] ?? '—';
        $sPhone = $body['student_phone'] ?? '';
        $sCourse = $body['course'] ?? 'Diploma Program';
        $sBatch = $body['batch'] ?? 'Active Batch';
        $pct = $body['attendance_pct'] ?? 0;
        $abs = $body['absent_count'] ?? 0;

        if (empty($studentId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'student_id is required.']);
        }

        // 1. Post in-app notification
        otp_supabase_request('POST', 'notifications', [
            'user_id' => $studentId,
            'role' => 'student',
            'type' => 'attendance',
            'title' => 'Urgent: Low Attendance Warning',
            'message' => "Your current attendance is {$pct}%, which is below the mandatory 75% examination threshold ({$abs} absences recorded). Regular attendance is required to remain eligible for examinations.",
            'link' => '/student/attendance',
            'created_at' => date('c')
        ]);

        $whatsappText = "*DEEPSKILLS ACADEMIC DIRECTORATE - ATTENDANCE WARNING*\n\n"
            . "Dear Student / Respected Parents,\n"
            . "This is an official notice regarding the attendance record of *{$sName}* (CNIC: {$sCnic}) enrolled in *{$sCourse}* ({$sBatch}).\n\n"
            . "Current Attendance Rate: {$pct}%\n"
            . "Recorded Absences: {$abs} Sessions\n"
            . "Minimum Threshold Required: 75%\n\n"
            . "As per DeepSkills academic policy, students maintaining attendance below 75% are classified as examination defaulters and may be disqualified from the upcoming examinations.\n\n"
            . "Please ensure regular attendance or contact your Academic Coordinator immediately.\n\n"
            . "Support Helpline: +92 300 0000000\nDeepSkills Institute of Technology";

        $cleanPhone = preg_replace('/\D/', '', $sPhone);
        if (str_starts_with($cleanPhone, '0')) $cleanPhone = '92' . substr($cleanPhone, 1);
        if (!str_starts_with($cleanPhone, '92') && strlen($cleanPhone) === 10) $cleanPhone = '92' . $cleanPhone;

        $whatsappUrl = !empty($cleanPhone)
            ? "https://wa.me/{$cleanPhone}?text=" . urlencode($whatsappText)
            : "https://wa.me/?text=" . urlencode($whatsappText);

        otp_respond(200, [
            'status' => 'success',
            'message' => "In-app warning dispatched to {$sName}.",
            'whatsappUrl' => $whatsappUrl,
            'whatsappText' => $whatsappText
        ]);
    }

    // Action 5: Override
    if ($action === 'override') {
        $attendanceId = $body['attendance_id'] ?? '';
        $status = $body['status'] ?? '';
        $reason = trim($body['reason'] ?? '');

        if (empty($attendanceId) || empty($status) || empty($reason)) {
            otp_respond(400, ['status' => 'error', 'message' => 'attendance_id, status, and reason are required.']);
        }

        $updated = otp_supabase_request(
            'PATCH',
            "attendance?id=eq." . urlencode($attendanceId),
            [
                'status' => $status,
                'marked_by' => 'admin',
                'override_reason' => $reason,
                'overridden_by' => $auth['userId'] ?? 'admin',
                'overridden_at' => date('c'),
                'is_locked' => false
            ],
            ['Prefer: return=representation']
        );

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Attendance override saved.',
            'data' => $updated
        ]);
    }

    otp_respond(400, ['status' => 'error', 'message' => "Unknown action: {$action}"]);
}
