<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $p = $permissions['tasks'] ?? '';
    if ($p !== 'view' && $p !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions for tasks and homework management.'
        ]);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

// ──────────────────────────────────────────
// GET: Fetch Tasks, Batches, Tracking Matrix
// ──────────────────────────────────────────
if ($method === 'GET') {
    try {
        $course = $_GET['course'] ?? '';
        $batch = $_GET['batch'] ?? '';
        $category = $_GET['category'] ?? '';
        $search = trim($_GET['search'] ?? '');
        $taskId = $_GET['task_id'] ?? '';

        // 1. Batches
        $batchesRes = otp_supabase_request('GET', 'batches?select=id,batch_name,course,time_shift,status&order=batch_name.asc');
        $batches = is_array($batchesRes) ? $batchesRes : [];

        // 2. Active Admissions
        $admRes = otp_supabase_request('GET', 'admissions?select=id,name,cnic,phone,email,course,batch,photo_url,status&status=in.(Active,Graduated)&order=name.asc');
        $admissions = is_array($admRes) ? $admRes : [];

        // 3. Tasks
        $taskQuery = 'tasks?select=*&order=created_at.desc';
        if (!empty($course) && $course !== 'all') $taskQuery .= '&course=eq.' . urlencode($course);
        if (!empty($batch) && $batch !== 'all') $taskQuery .= '&batch=eq.' . urlencode($batch);
        if (!empty($category) && $category !== 'all') $taskQuery .= '&category=eq.' . urlencode($category);

        $tasksRes = otp_supabase_request('GET', $taskQuery);
        $allTasks = is_array($tasksRes) ? $tasksRes : [];

        // Search filtering
        $filteredTasks = $allTasks;
        if (!empty($search)) {
            $q = strtolower($search);
            $filteredTasks = array_filter($filteredTasks, function($t) use ($q) {
                return str_contains(strtolower($t['title'] ?? ''), $q) ||
                       str_contains(strtolower($t['assigned_by'] ?? ''), $q) ||
                       str_contains(strtolower($t['description'] ?? ''), $q);
            });
            $filteredTasks = array_values($filteredTasks);
        }

        // 4. Submissions
        $subsRes = otp_supabase_request('GET', 'task_submissions?select=*&order=submitted_at.desc');
        $submissions = is_array($subsRes) ? $subsRes : [];

        // Calculate Enrolled Counts
        $enrolledCounts = [];
        foreach ($admissions as $a) {
            $b = $a['batch'] ?? '';
            if (!empty($b)) {
                $enrolledCounts[$b] = ($enrolledCounts[$b] ?? 0) + 1;
            }
        }

        // 5. Build Detailed Submission Tracking Matrix
        $targetTask = null;
        if (!empty($taskId)) {
            foreach ($allTasks as $t) {
                if (($t['id'] ?? '') === $taskId) {
                    $targetTask = $t;
                    break;
                }
            }
        } elseif (!empty($filteredTasks)) {
            $targetTask = $filteredTasks[0];
        }

        $selectedTaskMatrix = null;
        if ($targetTask) {
            $tId = $targetTask['id'];
            $taskSubs = array_filter($submissions, function($s) use ($tId) {
                return ($s['task_id'] ?? '') === $tId;
            });

            $subMapByCnic = [];
            $subMapById = [];
            foreach ($taskSubs as $s) {
                if (!empty($s['cnic'])) $subMapByCnic[$s['cnic']] = $s;
                if (!empty($s['student_id'])) $subMapById[$s['student_id']] = $s;
            }

            $tBatch = $targetTask['batch'] ?? '';
            $tCourse = $targetTask['course'] ?? '';

            $batchStudents = array_filter($admissions, function($st) use ($tBatch, $tCourse) {
                if ($tBatch === 'All Batches' || $tBatch === 'all') {
                    return ($st['course'] ?? '') === $tCourse;
                }
                return ($st['batch'] ?? '') === $tBatch;
            });

            $matrix = [];
            foreach ($batchStudents as $st) {
                $cnic = $st['cnic'] ?? '';
                $sid = $st['id'] ?? '';
                $sub = $subMapByCnic[$cnic] ?? ($subMapById[$sid] ?? null);

                $status = 'Pending';
                $isLate = false;

                if ($sub) {
                    if (!empty($targetTask['due_date']) && !empty($sub['submitted_at'])) {
                        $due = strtotime($targetTask['due_date']);
                        $subTime = strtotime($sub['submitted_at']);
                        if ($subTime > $due) $isLate = true;
                    }

                    if (($sub['status'] ?? '') === 'Graded' || $sub['marks_obtained'] !== null) {
                        $status = $isLate ? 'Graded (Late)' : 'Graded';
                    } else {
                        $status = $isLate ? 'Late' : 'Submitted';
                    }
                }

                $matrix[] = [
                    'student_id' => $st['id'],
                    'student_name' => $st['name'],
                    'student_cnic' => $st['cnic'],
                    'student_phone' => $st['phone'] ?? '—',
                    'student_email' => $st['email'] ?? '—',
                    'photo_url' => $st['photo_url'] ?? null,
                    'course' => $st['course'] ?? '',
                    'batch' => $st['batch'] ?? '',
                    'submission_id' => $sub['id'] ?? null,
                    'status' => $status,
                    'is_late' => $isLate,
                    'submitted_at' => $sub['submitted_at'] ?? null,
                    'file_url' => $sub['file_url'] ?? null,
                    'marks_obtained' => $sub['marks_obtained'] ?? null,
                    'total_marks' => $targetTask['total_marks'] ?? 100,
                    'grade' => $sub['grade'] ?? null,
                    'feedback' => $sub['feedback'] ?? '',
                    'rubric_scores' => $sub['rubric_scores'] ?? null
                ];
            }

            $submittedCount = count(array_filter($matrix, fn($m) => $m['status'] !== 'Pending'));
            $gradedCount = count(array_filter($matrix, fn($m) => str_starts_with($m['status'], 'Graded')));
            $pendingCount = count(array_filter($matrix, fn($m) => $m['status'] === 'Pending'));
            $lateCount = count(array_filter($matrix, fn($m) => $m['is_late']));

            $selectedTaskMatrix = [
                'task' => $targetTask,
                'totalEnrolled' => count($batchStudents),
                'submittedCount' => $submittedCount,
                'gradedCount' => $gradedCount,
                'pendingCount' => $pendingCount,
                'lateCount' => $lateCount,
                'students' => $matrix
            ];
        }

        // Metrics
        $totalTasksCount = count($allTasks);
        $totalSubsCount = count($submissions);
        $gradedSubsCount = count(array_filter($submissions, function($s) {
            return ($s['status'] ?? '') === 'Graded' || $s['marks_obtained'] !== null;
        }));
        $evalRate = $totalSubsCount > 0 ? (int)round(($gradedSubsCount / $totalSubsCount) * 100) : 0;
        $pendingEvalCount = $totalSubsCount - $gradedSubsCount;

        $coursesList = array_unique(array_filter(array_map(fn($b) => $b['course'] ?? null, $batches)));

        otp_respond(200, [
            'status' => 'success',
            'data' => [
                'tasks' => $filteredTasks,
                'batches' => $batches,
                'courses' => array_values($coursesList),
                'enrolledCounts' => $enrolledCounts,
                'stats' => [
                    'totalTasks' => $totalTasksCount,
                    'totalSubmissions' => $totalSubsCount,
                    'gradedSubmissions' => $gradedSubsCount,
                    'evaluationRate' => $evalRate,
                    'pendingEvaluations' => $pendingEvalCount,
                    'activeBatches' => count($batches)
                ],
                'selectedTaskMatrix' => $selectedTaskMatrix
            ]
        ]);
    } catch (Exception $e) {
        otp_respond(500, ['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// ──────────────────────────────────────────
// POST: Create Task, Grade, Delete, Reminders
// ──────────────────────────────────────────
if ($method === 'POST') {
    $body = otp_read_json();
    $action = $body['action'] ?? '';

    // Action 1: Create Task
    if ($action === 'create_task') {
        $title = trim($body['title'] ?? '');
        $category = $body['category'] ?? 'Assignment';
        $course = $body['course'] ?? '';
        $batch = $body['batch'] ?? 'All Batches';
        $targetBatches = $body['batches'] ?? [];
        $dueDate = $body['due_date'] ?? '';
        $totalMarks = (int)($body['total_marks'] ?? 100);
        $description = trim($body['description'] ?? '');
        $fileUrl = $body['file_url'] ?? null;
        $fileUrls = $body['file_urls'] ?? [];

        if (empty($title) || empty($course) || empty($dueDate)) {
            otp_respond(400, ['status' => 'error', 'message' => 'Title, course, and due date are required.']);
        }

        $assignedBy = $auth['user']['name'] ?? ($auth['user']['full_name'] ?? 'Academic Directorate');
        $batchesToTarget = !empty($targetBatches) && is_array($targetBatches) ? $targetBatches : [$batch];

        $createdTasks = [];
        foreach ($batchesToTarget as $bName) {
            $taskPayload = [
                'title' => $title,
                'category' => $category,
                'course' => $course,
                'batch' => $bName,
                'due_date' => $dueDate,
                'total_marks' => $totalMarks,
                'description' => $description,
                'file_url' => $fileUrl ?: ($fileUrls[0]['url'] ?? null),
                'assigned_by' => $assignedBy,
                'created_at' => date('c')
            ];

            $newTask = otp_supabase_request(
                'POST',
                'tasks',
                $taskPayload,
                ['Prefer: return=representation']
            );
            $createdTasks[] = $newTask;

            // Notification
            $q = "admissions?select=id&course=eq." . urlencode($course) . "&status=in.(Active,Graduated)";
            if ($bName !== 'All Batches' && $bName !== 'all') {
                $q .= "&batch=eq." . urlencode($bName);
            }
            $studentsRes = otp_supabase_request('GET', $q);
            if (is_array($studentsRes)) {
                $notifs = [];
                $now = date('c');
                foreach ($studentsRes as $st) {
                    $notifs[] = [
                        'user_id' => $st['id'],
                        'role' => 'student',
                        'type' => 'task',
                        'title' => "New {$category} Assigned",
                        'message' => "New task \"{$title}\" has been assigned for {$course} ({$bName}). Due Date: " . date('M d, Y', strtotime($dueDate)) . ".",
                        'link' => '/student/tasks',
                        'created_at' => $now
                    ];
                }
                if (!empty($notifs)) {
                    otp_supabase_request('POST', 'notifications', $notifs);
                }
            }
        }

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Created ' . count($createdTasks) . ' assignment(s) successfully!',
            'data' => $createdTasks
        ]);
    }

    // Action 2: Grade Submission
    if ($action === 'grade_submission') {
        $submissionId = $body['submission_id'] ?? '';
        $marksObtained = $body['marks_obtained'] ?? null;
        $grade = $body['grade'] ?? null;
        $feedback = trim($body['feedback'] ?? '');
        $rubricScores = $body['rubric_scores'] ?? null;

        if (empty($submissionId) || $marksObtained === null) {
            otp_respond(400, ['status' => 'error', 'message' => 'submission_id and marks_obtained are required.']);
        }

        $now = date('c');
        $updatedSub = otp_supabase_request(
            'PATCH',
            "task_submissions?id=eq." . urlencode($submissionId),
            [
                'marks_obtained' => (float)$marksObtained,
                'grade' => $grade,
                'status' => 'Graded',
                'feedback' => !empty($feedback) ? $feedback : null,
                'rubric_scores' => $rubricScores
            ],
            ['Prefer: return=representation']
        );

        // Student Notification
        $sub = is_array($updatedSub) && isset($updatedSub[0]) ? $updatedSub[0] : null;
        if ($sub && !empty($sub['cnic'])) {
            $stRes = otp_supabase_request('GET', 'admissions?select=id&cnic=eq.' . urlencode($sub['cnic']) . '&status=in.(Active,Graduated)&limit=1');
            $st = is_array($stRes) && isset($stRes[0]) ? $stRes[0] : null;
            if ($st) {
                otp_supabase_request('POST', 'notifications', [
                    'user_id' => $st['id'],
                    'role' => 'student',
                    'type' => 'task_graded',
                    'title' => 'Assignment Graded',
                    'message' => "Your submission has been graded: {$marksObtained} Marks ({$grade}).",
                    'link' => '/student/tasks',
                    'created_at' => $now
                ]);
            }
        }

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Submission graded successfully!',
            'data' => $updatedSub
        ]);
    }

    // Action 3: Delete Task
    if ($action === 'delete_task') {
        $taskId = $body['task_id'] ?? '';
        if (empty($taskId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'task_id is required.']);
        }

        otp_supabase_request('DELETE', "task_submissions?task_id=eq." . urlencode($taskId));
        otp_supabase_request('DELETE', "tasks?id=eq." . urlencode($taskId));

        otp_respond(200, [
            'status' => 'success',
            'message' => 'Task and related submissions deleted successfully.'
        ]);
    }

    // Action 4: Send Reminders
    if ($action === 'send_reminders') {
        $taskId = $body['task_id'] ?? '';
        $studentIds = $body['student_ids'] ?? [];

        if (empty($taskId)) {
            otp_respond(400, ['status' => 'error', 'message' => 'task_id is required.']);
        }

        $tRes = otp_supabase_request('GET', 'tasks?select=*&id=eq.' . urlencode($taskId) . '&limit=1');
        $task = is_array($tRes) && isset($tRes[0]) ? $tRes[0] : null;
        if (!$task) {
            otp_respond(404, ['status' => 'error', 'message' => 'Task not found.']);
        }

        $subsRes = otp_supabase_request('GET', 'task_submissions?select=cnic&task_id=eq.' . urlencode($taskId));
        $submittedCnics = [];
        if (is_array($subsRes)) {
            foreach ($subsRes as $s) {
                if (!empty($s['cnic'])) $submittedCnics[$s['cnic']] = true;
            }
        }

        $q = "admissions?select=id,name,cnic,phone,email,course,batch&course=eq." . urlencode($task['course']) . "&status=in.(Active,Graduated)";
        if (!empty($task['batch']) && $task['batch'] !== 'All Batches' && $task['batch'] !== 'all') {
            $q .= "&batch=eq." . urlencode($task['batch']);
        }

        $allStudentsRes = otp_supabase_request('GET', $q);
        $allStudents = is_array($allStudentsRes) ? $allStudentsRes : [];

        $pendingStudents = array_filter($allStudents, function($st) use ($submittedCnics, $studentIds) {
            $cnic = $st['cnic'] ?? '';
            if (isset($submittedCnics[$cnic])) return false;
            if (!empty($studentIds) && is_array($studentIds)) {
                return in_array($st['id'] ?? '', $studentIds);
            }
            return true;
        });

        $now = date('c');
        $dueDateFormatted = !empty($task['due_date']) ? date('M d, Y', strtotime($task['due_date'])) : 'Soon';

        $notifs = [];
        $reminders = [];

        foreach ($pendingStudents as $st) {
            $notifs[] = [
                'user_id' => $st['id'],
                'role' => 'student',
                'type' => 'task_reminder',
                'title' => 'Urgent: Pending Task Reminder',
                'message' => "Reminder: Your submission for \"{$task['title']}\" is pending. Due date: {$dueDateFormatted}. Please submit your work on time.",
                'link' => '/student/tasks',
                'created_at' => $now
            ];

            $msg = "*DEEPSKILLS ACADEMIC NOTICE - PENDING ASSIGNMENT REMINDER*\n\n"
                . "Dear Student / Respected Parents,\n"
                . "This is a reminder regarding the pending academic task for *{$st['name']}* (CNIC: {$st['cnic']}) enrolled in *{$task['course']}* ({$task['batch']}).\n\n"
                . "* Task Title: {$task['title']}\n"
                . "* Due Date: {$dueDateFormatted}\n"
                . "* Current Status: PENDING / NOT SUBMITTED\n"
                . "* Maximum Marks: " . ($task['total_marks'] ?? 100) . "\n\n"
                . "Please submit your assignment on the DeepSkills Student Portal before the cutoff to ensure your coursework marks are credited.\n\n"
                . "Direct Portal Link: https://deepskills.com/student/tasks\n"
                . "DeepSkills Academic Directorate";

            $cleanPhone = preg_replace('/\D/', '', $st['phone'] ?? '');
            if (str_starts_with($cleanPhone, '0')) $cleanPhone = '92' . substr($cleanPhone, 1);
            if (!str_starts_with($cleanPhone, '92') && strlen($cleanPhone) === 10) $cleanPhone = '92' . $cleanPhone;

            $waUrl = !empty($cleanPhone) ? "https://wa.me/{$cleanPhone}?text=" . urlencode($msg) : null;

            $reminders[] = [
                'student_id' => $st['id'],
                'student_name' => $st['name'],
                'phone' => $st['phone'] ?? '',
                'whatsappUrl' => $waUrl,
                'message' => $msg
            ];
        }

        if (!empty($notifs)) {
            otp_supabase_request('POST', 'notifications', $notifs);
        }

        otp_respond(200, [
            'status' => 'success',
            'message' => "Dispatched reminder notifications to " . count($pendingStudents) . " pending student(s).",
            'count' => count($pendingStudents),
            'reminders' => $reminders
        ]);
    }

    otp_respond(400, ['status' => 'error', 'message' => "Unknown action: {$action}"]);
}
