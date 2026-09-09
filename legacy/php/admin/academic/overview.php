<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $hasAcademicPerm = false;
    foreach (['attendance', 'tasks', 'results', 'announcements', 'complaints', 'reports'] as $k) {
        $p = $permissions[$k] ?? '';
        if ($p === 'view' || $p === 'full') {
            $hasAcademicPerm = true;
            break;
        }
    }
    if (!$hasAcademicPerm) {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions to view academic overview.'
        ]);
    }
}

try {
    $batchesRes = otp_supabase_request('GET', 'batches?select=id,course,batch_name,time_shift,status,created_at,capacity,start_date,end_date,start_time,end_time,timing_label,notes&order=created_at.desc');
    $admissionsRes = otp_supabase_request('GET', 'admissions?select=id,name,course,batch,status,phone,email,submitted_at&status=in.(Active,Graduated)');
    $attendanceRes = otp_supabase_request('GET', 'attendance?select=id,student_id,batch_id,batch_name,course,date,status,is_locked,teacher_id&order=date.desc&limit=2000');
    $tasksRes = otp_supabase_request('GET', 'tasks?select=id,title,course,batch,assigned_by,created_at,due_date&order=created_at.desc');
    $submissionsRes = otp_supabase_request('GET', 'task_submissions?select=id,task_id,student_id,status,score,grade,submitted_at');
    $resultsRes = otp_supabase_request('GET', 'results?select=id,student_id,batch_id,exam_type,total_marks,grade,passed,computed_at');
    $complaintsRes = otp_supabase_request('GET', 'complaints?select=id,student_id,student_name,subject,category,status,created_at&order=created_at.desc');
    $teachersRes = otp_supabase_request('GET', 'teachers?select=id,name,cnic,phone,email,specialization,status');
    $announcementsRes = otp_supabase_request('GET', 'announcements?select=id,title,content,target_type,target_course,target_batch,priority,created_at&order=created_at.desc&limit=10');

    $allBatches = is_array($batchesRes) ? $batchesRes : [];
    $allAdmissions = is_array($admissionsRes) ? $admissionsRes : [];
    $allAttendance = is_array($attendanceRes) ? $attendanceRes : [];
    $allTasks = is_array($tasksRes) ? $tasksRes : [];
    $allSubmissions = is_array($submissionsRes) ? $submissionsRes : [];
    $allResults = is_array($resultsRes) ? $resultsRes : [];
    $allComplaints = is_array($complaintsRes) ? $complaintsRes : [];
    $allTeachers = is_array($teachersRes) ? $teachersRes : [];
    $allAnnouncements = is_array($announcementsRes) ? $announcementsRes : [];

    // Active calculations
    $activeBatches = array_filter($allBatches, function($b) {
        $s = strtolower($b['status'] ?? '');
        return $s === 'active' || $s === 'running' || $s === 'ongoing' || empty($s);
    });

    $activeStudents = array_filter($allAdmissions, function($a) {
        return ($a['status'] ?? '') === 'Active';
    });
    $graduatedStudents = array_filter($allAdmissions, function($a) {
        return ($a['status'] ?? '') === 'Graduated';
    });

    // Attendance Telemetry
    $totalAttRecords = count($allAttendance);
    $presentAttCount = 0;
    foreach ($allAttendance as $a) {
        $st = strtolower($a['status'] ?? '');
        if ($st === 'present' || $st === 'late') {
            $presentAttCount++;
        }
    }
    $overallAttendanceRate = $totalAttRecords > 0
        ? round(($presentAttCount / $totalAttRecords) * 100)
        : 85;

    // Task Completion Rate
    $gradedSubmissions = array_filter($allSubmissions, function($s) {
        $st = $s['status'] ?? '';
        return $st === 'graded' || $st === 'submitted';
    });
    $totalPossibleSubmissions = count($allTasks) > 0 ? (count($allTasks) * max(1, count($activeStudents))) : 1;
    $taskCompletionRate = min(100, round((count($gradedSubmissions) / $totalPossibleSubmissions) * 100));

    // Results & Exam Pass Rate
    $passedResults = array_filter($allResults, function($r) {
        return (!empty($r['passed']) && $r['passed'] === true) || ((float)($r['total_marks'] ?? 0) >= 50);
    });
    $overallPassRate = count($allResults) > 0
        ? round((count($passedResults) / count($allResults)) * 100)
        : 88;

    // Complaints count
    $openComplaints = array_filter($allComplaints, function($c) {
        $st = strtolower($c['status'] ?? '');
        return $st === 'open' || $st === 'pending' || $st === 'in_progress';
    });

    // Active Teachers
    $activeTeachers = array_filter($allTeachers, function($t) {
        return ($t['status'] ?? 'Active') === 'Active';
    });

    // Batch Enrolled Map
    $batchEnrolledMap = [];
    foreach ($activeStudents as $a) {
        $b = $a['batch'] ?? '';
        if ($b) {
            $batchEnrolledMap[$b] = ($batchEnrolledMap[$b] ?? 0) + 1;
        }
    }

    // Batch Attendance Map
    $batchAttendanceMap = [];
    foreach ($allAttendance as $att) {
        $k = $att['batch_name'] ?? $att['batch_id'] ?? '';
        if (!$k) continue;
        if (!isset($batchAttendanceMap[$k])) {
            $batchAttendanceMap[$k] = ['total' => 0, 'present' => 0];
        }
        $batchAttendanceMap[$k]['total']++;
        $st = strtolower($att['status'] ?? '');
        if ($st === 'present' || $st === 'late') {
            $batchAttendanceMap[$k]['present']++;
        }
    }

    // Batch Tasks Map
    $batchTasksMap = [];
    foreach ($allTasks as $t) {
        $bKey = $t['batch'] ?? '';
        if ($bKey) {
            $batchTasksMap[$bKey] = ($batchTasksMap[$bKey] ?? 0) + 1;
        }
    }

    // Batch Results Map
    $batchResultsMap = [];
    foreach ($allResults as $r) {
        $bKey = $r['batch_id'] ?? '';
        if (!$bKey) continue;
        if (!isset($batchResultsMap[$bKey])) {
            $batchResultsMap[$bKey] = ['total' => 0, 'passed' => 0, 'marksSum' => 0];
        }
        $batchResultsMap[$bKey]['total']++;
        $batchResultsMap[$bKey]['marksSum'] += (float)($r['total_marks'] ?? 0);
        if ((!empty($r['passed']) && $r['passed'] === true) || ((float)($r['total_marks'] ?? 0) >= 50)) {
            $batchResultsMap[$bKey]['passed']++;
        }
    }

    // Compile Batch Health Matrix
    $batchHealthMatrix = [];
    $coursesSet = [];

    foreach ($allBatches as $batch) {
        $bName = $batch['batch_name'] ?? 'Unnamed Batch';
        $bCourse = $batch['course'] ?? 'General';
        if (!empty($batch['course'])) $coursesSet[$batch['course']] = true;

        $enrolled = $batchEnrolledMap[$bName] ?? 0;
        $capacity = (int)($batch['capacity'] ?? 30);
        $capacityPct = min(100, round(($enrolled / max(1, $capacity)) * 100));

        $attStat = $batchAttendanceMap[$bName] ?? $batchAttendanceMap[$batch['id'] ?? ''] ?? ['total' => 0, 'present' => 0];
        $attendanceRate = $attStat['total'] > 0
            ? round(($attStat['present'] / $attStat['total']) * 100)
            : null;

        $tasksCount = $batchTasksMap[$bName] ?? 0;

        $resStat = $batchResultsMap[$batch['id'] ?? ''] ?? $batchResultsMap[$bName] ?? ['total' => 0, 'passed' => 0, 'marksSum' => 0];
        $avgScore = $resStat['total'] > 0 ? round($resStat['marksSum'] / $resStat['total']) : null;
        $passRate = $resStat['total'] > 0 ? round(($resStat['passed'] / $resStat['total']) * 100) : null;

        $healthStatus = 'Optimal';
        if ($attendanceRate !== null) {
            if ($attendanceRate < 65) $healthStatus = 'At Risk';
            else if ($attendanceRate < 80) $healthStatus = 'Needs Attention';
        } else if ($enrolled === 0) {
            $healthStatus = 'New / Unassigned';
        }

        $matchedInstructor = null;
        $bNotes = strtolower($batch['notes'] ?? '');
        if ($bNotes) {
            foreach ($allTeachers as $t) {
                if (!empty($t['name']) && strpos($bNotes, strtolower($t['name'])) !== false) {
                    $matchedInstructor = $t;
                    break;
                }
            }
        }
        if (!$matchedInstructor && !empty($allTeachers)) {
            foreach ($allTeachers as $t) {
                if (!empty($t['specialization']) && stripos($bCourse, $t['specialization']) !== false) {
                    $matchedInstructor = $t;
                    break;
                }
            }
            if (!$matchedInstructor) $matchedInstructor = $allTeachers[0];
        }

        $batchHealthMatrix[] = [
            'id' => $batch['id'] ?? '',
            'batchName' => $bName,
            'course' => $bCourse,
            'timeShift' => $batch['time_shift'] ?? $batch['timing_label'] ?? 'Morning / Flexible',
            'status' => $batch['status'] ?? 'Active',
            'startDate' => $batch['start_date'] ?? null,
            'endDate' => $batch['end_date'] ?? null,
            'capacity' => $capacity,
            'enrolledStudents' => $enrolled,
            'capacityFillPct' => $capacityPct,
            'attendanceRatePct' => $attendanceRate,
            'tasksCount' => $tasksCount,
            'averageExamScore' => $avgScore,
            'examPassRatePct' => $passRate,
            'healthStatus' => $healthStatus,
            'instructor' => $matchedInstructor ? [
                'id' => $matchedInstructor['id'] ?? '',
                'name' => $matchedInstructor['name'] ?? '',
                'email' => $matchedInstructor['email'] ?? '',
                'specialization' => $matchedInstructor['specialization'] ?? ''
            ] : null
        ];
    }

    otp_respond(200, [
        'status' => 'success',
        'data' => [
            'kpis' => [
                'activeBatchesCount' => count($activeBatches),
                'totalBatchesCount' => count($allBatches),
                'activeStudentsCount' => count($activeStudents),
                'graduatedStudentsCount' => count($graduatedStudents),
                'overallAttendanceRate' => $overallAttendanceRate,
                'taskCompletionRate' => $taskCompletionRate,
                'overallPassRate' => $overallPassRate,
                'openComplaintsCount' => count($openComplaints),
                'activeTeachersCount' => count($activeTeachers),
                'totalTasksCount' => count($allTasks)
            ],
            'batchHealthMatrix' => $batchHealthMatrix,
            'recentAnnouncements' => array_slice($allAnnouncements, 0, 5),
            'recentComplaints' => array_slice(array_values($openComplaints), 0, 5),
            'coursesList' => array_keys($coursesSet),
            'timestamp' => date('c')
        ]
    ]);

} catch (Exception $e) {
    otp_respond(500, [
        'status' => 'error',
        'message' => $e->getMessage() ?: 'Internal server error aggregating academic overview.'
    ]);
}
?>
