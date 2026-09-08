<?php
require_once __DIR__ . '/../../auth/_otp_common.php';
otp_bootstrap(['GET', 'POST']);

$auth = portal_authorize_admin_operation();
if (($auth['role'] ?? '') === 'custom') {
    $permissions = $auth['permissions'] ?? [];
    $p = $permissions['results'] ?? '';
    if ($p !== 'view' && $p !== 'full') {
        otp_respond(403, [
            'status' => 'error',
            'code' => 'insufficient_permissions',
            'message' => 'Insufficient permissions for examination and grading management.'
        ]);
    }
}

$canMutate = ($auth['role'] ?? '') === 'admin' || (($auth['permissions']['results'] ?? '') === 'full');
$method = $_SERVER['REQUEST_METHOD'];

function get_default_assessment_settings() {
    return [
        'weights' => [
            'midterm' => [
                'attendance' => 20,
                'assignment' => 30,
                'quiz' => 30,
                'taskCompletion' => 20,
                'project' => 0,
                'exam' => 0
            ],
            'finalterm' => [
                'attendance' => 15,
                'assignment' => 25,
                'quiz' => 25,
                'taskCompletion' => 15,
                'project' => 20,
                'exam' => 0
            ],
            'passingMarks' => 50
        ],
        'gradingScale' => [
            ['grade' => 'A+', 'min' => 90, 'remarks' => 'Outstanding', 'gpa' => 4.0],
            ['grade' => 'A', 'min' => 80, 'remarks' => 'Excellent', 'gpa' => 3.7],
            ['grade' => 'B', 'min' => 70, 'remarks' => 'Very Good', 'gpa' => 3.0],
            ['grade' => 'C', 'min' => 60, 'remarks' => 'Good', 'gpa' => 2.5],
            ['grade' => 'D', 'min' => 50, 'remarks' => 'Satisfactory', 'gpa' => 2.0],
            ['grade' => 'F', 'min' => 0, 'remarks' => 'Fail', 'gpa' => 0.0]
        ]
    ];
}

function resolve_php_grade($score, $scale) {
    if (!is_array($scale) || empty($scale)) {
        $scale = get_default_assessment_settings()['gradingScale'];
    }
    usort($scale, function($a, $b) {
        return ($b['min'] ?? 0) <=> ($a['min'] ?? 0);
    });

    foreach ($scale as $tier) {
        if ($score >= ($tier['min'] ?? 0)) {
            return [
                'grade' => $tier['grade'] ?? 'Pass',
                'remarks' => $tier['remarks'] ?? 'Pass',
                'gpa' => $tier['gpa'] ?? 0
            ];
        }
    }
    return ['grade' => 'F', 'remarks' => 'Fail', 'gpa' => 0];
}

// ──────────────────────────────────────────
// GET: Fetch Batches, Marksheet Roster, Stats, Weights
// ──────────────────────────────────────────
if ($method === 'GET') {
    try {
        $batch = $_GET['batch'] ?? '';
        $rawExamType = strtolower($_GET['exam_type'] ?? 'midterm');
        $examType = $rawExamType === 'finalterm' ? 'finalterm' : 'midterm';
        $search = trim($_GET['search'] ?? '');
        $selectedBatch = (!empty($batch) && $batch !== 'all') ? $batch : null;

        // 1. Fetch Batches
        $batchesRes = otp_supabase_request('GET', 'batches?select=id,batch_name,course,time_shift,status&order=batch_name.asc');
        $batches = is_array($batchesRes) ? $batchesRes : [];

        // 2. Fetch Settings from app_settings
        $settingsDefaults = get_default_assessment_settings();
        $settingsRes = otp_supabase_request('GET', 'app_settings?select=value&key=eq.academic_assessment_weights');
        $savedSettings = (is_array($settingsRes) && !empty($settingsRes[0]['value'])) ? $settingsRes[0]['value'] : null;

        $weights = $settingsDefaults['weights'];
        $gradingScale = $settingsDefaults['gradingScale'];
        if ($savedSettings) {
            if (!empty($savedSettings['midterm'])) $weights['midterm'] = array_merge($weights['midterm'], $savedSettings['midterm']);
            if (!empty($savedSettings['finalterm'])) $weights['finalterm'] = array_merge($weights['finalterm'], $savedSettings['finalterm']);
            if (isset($savedSettings['passingMarks'])) $weights['passingMarks'] = (float)$savedSettings['passingMarks'];
            if (!empty($savedSettings['gradingScale']) && is_array($savedSettings['gradingScale'])) {
                $gradingScale = $savedSettings['gradingScale'];
            }
        }

        // 3. Fetch Enrolled Admissions
        $admQuery = 'admissions?select=id,name,cnic,phone,email,course,batch,photo_url,status&status=in.(Active,Graduated)&order=name.asc';
        if ($selectedBatch) {
            $admQuery .= '&batch=eq.' . urlencode($selectedBatch);
        }
        $admRes = otp_supabase_request('GET', $admQuery);
        $admissions = is_array($admRes) ? $admRes : [];

        // 4. Fetch Results
        $resQuery = 'results?select=*&exam_type=eq.' . urlencode($examType) . '&order=total_marks.desc';
        if ($selectedBatch) {
            $resQuery .= '&batch_id=eq.' . urlencode($selectedBatch);
        }
        $resultsRes = otp_supabase_request('GET', $resQuery);
        $allResults = is_array($resultsRes) ? $resultsRes : [];

        $resultMap = [];
        foreach ($allResults as $r) {
            if (!empty($r['student_id'])) {
                $resultMap[$r['student_id']] = $r;
            }
        }

        // 5. Build Combined Roster
        $roster = [];
        foreach ($admissions as $student) {
            $sId = $student['id'] ?? '';
            $resRecord = $resultMap[$sId] ?? null;
            $hasResult = !empty($resRecord);

            $roster[] = [
                'student_id' => $sId,
                'name' => $student['name'] ?? '',
                'cnic' => $student['cnic'] ?? '',
                'phone' => $student['phone'] ?? '',
                'email' => $student['email'] ?? '',
                'course' => $student['course'] ?? '',
                'batch' => $student['batch'] ?? '',
                'photo_url' => $student['photo_url'] ?? '',
                'has_result' => $hasResult,
                'result_id' => $resRecord['id'] ?? null,
                'attendance_marks' => isset($resRecord['attendance_marks']) ? (float)$resRecord['attendance_marks'] : 0,
                'assignment_marks' => isset($resRecord['assignment_marks']) ? (float)$resRecord['assignment_marks'] : 0,
                'quiz_marks' => isset($resRecord['quiz_marks']) ? (float)$resRecord['quiz_marks'] : 0,
                'task_completion_marks' => isset($resRecord['task_completion_marks']) ? (float)$resRecord['task_completion_marks'] : 0,
                'project_marks' => isset($resRecord['project_marks']) ? (float)$resRecord['project_marks'] : 0,
                'exam_marks' => isset($resRecord['exam_marks']) ? (float)$resRecord['exam_marks'] : 0,
                'total_marks' => isset($resRecord['total_marks']) ? (float)$resRecord['total_marks'] : 0,
                'grade' => $resRecord['grade'] ?? ($hasResult ? 'F' : '—'),
                'remarks' => $resRecord['remarks'] ?? '',
                'passed' => !empty($resRecord['passed']),
                'batch_rank' => isset($resRecord['batch_rank']) ? (int)$resRecord['batch_rank'] : null,
                'computed_at' => $resRecord['computed_at'] ?? null
            ];
        }

        // Search Filter
        if (!empty($search)) {
            $q = strtolower($search);
            $roster = array_filter($roster, function($s) use ($q) {
                return str_contains(strtolower($s['name'] ?? ''), $q) ||
                       str_contains(strtolower($s['cnic'] ?? ''), $q) ||
                       str_contains(strtolower($s['batch'] ?? ''), $q);
            });
            $roster = array_values($roster);
        }

        // 6. Compute Statistics
        $gradedStudents = array_filter($roster, function($s) { return $s['has_result']; });
        $totalCandidates = count($roster);
        $passedCount = count(array_filter($gradedStudents, function($s) { return $s['passed']; }));
        $failedCount = count(array_filter($gradedStudents, function($s) { return !$s['passed']; }));
        $passRate = $totalCandidates > 0 ? round(($passedCount / $totalCandidates) * 100) : 0;

        $totalMarksSum = 0;
        $highestScore = 0;
        $gradeDistribution = ['A+' => 0, 'A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0];

        foreach ($gradedStudents as $s) {
            $mark = $s['total_marks'];
            $totalMarksSum += $mark;
            if ($mark > $highestScore) $highestScore = $mark;
            $g = $s['grade'];
            if (isset($gradeDistribution[$g])) {
                $gradeDistribution[$g] += 1;
            } elseif ($g !== '—') {
                $gradeDistribution['F'] += 1;
            }
        }

        $gradedCount = count($gradedStudents);
        $classAverage = $gradedCount > 0 ? round(($totalMarksSum / $gradedCount) * 10) / 10 : 0;

        $activeWeights = $examType === 'finalterm' ? $weights['finalterm'] : $weights['midterm'];

        otp_respond(200, [
            'status' => 'success',
            'data' => [
                'batches' => $batches,
                'roster' => $roster,
                'stats' => [
                    'totalCandidates' => $totalCandidates,
                    'gradedCount' => $gradedCount,
                    'passed' => $passedCount,
                    'failed' => $failedCount,
                    'passRate' => $passRate,
                    'classAverage' => $classAverage,
                    'highestScore' => $highestScore,
                    'gradeDistribution' => $gradeDistribution
                ],
                'weights' => $weights,
                'activeWeights' => $activeWeights,
                'gradingScale' => $gradingScale,
                'examType' => $examType,
                'selectedBatch' => $selectedBatch ?: 'all'
            ]
        ]);
    } catch (Throwable $e) {
        error_log('[results.php GET] error: ' . $e->getMessage());
        otp_respond(500, ['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// ──────────────────────────────────────────
// POST: Marksheet Operations
// ──────────────────────────────────────────
if ($method === 'POST') {
    if (!$canMutate) {
        otp_respond(403, ['status' => 'error', 'message' => 'You do not have permission to modify results.']);
    }

    try {
        $body = otp_read_json();
        $action = $body['action'] ?? '';

        // ACTION 1: Save Marksheet Adjustments
        if ($action === 'save_marksheet') {
            $batch = $body['batch'] ?? '';
            $examType = strtolower($body['examType'] ?? 'midterm') === 'finalterm' ? 'finalterm' : 'midterm';
            $entries = is_array($body['entries'] ?? null) ? $body['entries'] : [];

            if (empty($batch)) {
                otp_respond(400, ['status' => 'error', 'message' => 'Batch ID is required.']);
            }

            $settingsDefaults = get_default_assessment_settings();
            $settingsRes = otp_supabase_request('GET', 'app_settings?select=value&key=eq.academic_assessment_weights');
            $savedSettings = (is_array($settingsRes) && !empty($settingsRes[0]['value'])) ? $settingsRes[0]['value'] : null;
            $gradingScale = $savedSettings['gradingScale'] ?? $settingsDefaults['gradingScale'];
            $passingMarks = (float)($savedSettings['passingMarks'] ?? $settingsDefaults['weights']['passingMarks']);

            foreach ($entries as $entry) {
                $studentId = $entry['student_id'] ?? '';
                if (empty($studentId)) continue;

                $att = (float)($entry['attendance_marks'] ?? 0);
                $ass = (float)($entry['assignment_marks'] ?? 0);
                $quiz = (float)($entry['quiz_marks'] ?? 0);
                $task = (float)($entry['task_completion_marks'] ?? 0);
                $proj = (float)($entry['project_marks'] ?? 0);
                $exam = (float)($entry['exam_marks'] ?? 0);

                $total = round(($att + $ass + $quiz + $task + $proj + exam) * 10) / 10;
                $gradeInfo = resolve_php_grade($total, $gradingScale);
                $passed = $total >= $passingMarks;

                $payload = [
                    'student_id' => $studentId,
                    'batch_id' => $batch,
                    'exam_type' => $examType,
                    'attendance_marks' => $att,
                    'assignment_marks' => $ass,
                    'quiz_marks' => $quiz,
                    'task_completion_marks' => $task,
                    'project_marks' => $proj,
                    'exam_marks' => $exam,
                    'total_marks' => $total,
                    'grade' => $gradeInfo['grade'],
                    'remarks' => $gradeInfo['remarks'],
                    'passed' => $passed,
                    'computed_at' => date('c')
                ];

                otp_supabase_request('POST', 'results?on_conflict=student_id,exam_type', $payload, [
                    'Prefer: resolution=merge-duplicates'
                ]);
            }

            // Update batch ranks
            $allBatchResults = otp_supabase_request('GET', 'results?select=id,total_marks&batch_id=eq.' . urlencode($batch) . '&exam_type=eq.' . urlencode($examType) . '&order=total_marks.desc');
            if (is_array($allBatchResults)) {
                foreach ($allBatchResults as $idx => $r) {
                    $rank = $idx + 1;
                    otp_supabase_request('PATCH', 'results?id=eq.' . urlencode($r['id']), ['batch_rank' => $rank]);
                }
            }

            otp_respond(200, [
                'status' => 'success',
                'message' => "Successfully saved marksheet entries for batch {$batch}."
            ]);
        }

        // ACTION 2: Save Assessment Structure Weights
        if ($action === 'save_weights') {
            $weights = $body['weights'] ?? null;
            $gradingScale = $body['gradingScale'] ?? null;

            if (!$weights) {
                otp_respond(400, ['status' => 'error', 'message' => 'Weights payload is required.']);
            }

            $defaults = get_default_assessment_settings();
            $payload = [
                'key' => 'academic_assessment_weights',
                'value' => [
                    'midterm' => $weights['midterm'] ?? $defaults['weights']['midterm'],
                    'finalterm' => $weights['finalterm'] ?? $defaults['weights']['finalterm'],
                    'passingMarks' => isset($weights['passingMarks']) ? (float)$weights['passingMarks'] : 50,
                    'gradingScale' => $gradingScale ?: $defaults['gradingScale']
                ],
                'updated_at' => date('c')
            ];

            otp_supabase_request('POST', 'app_settings?on_conflict=key', $payload, [
                'Prefer: resolution=merge-duplicates'
            ]);

            otp_respond(200, [
                'status' => 'success',
                'message' => 'Assessment weights and grading scale successfully saved.'
            ]);
        }

        // ACTION 3: Toggle Publish State
        if ($action === 'toggle_publish') {
            $batch = $body['batch'] ?? '';
            $examType = strtolower($body['examType'] ?? 'midterm') === 'finalterm' ? 'finalterm' : 'midterm';
            $isPublished = !empty($body['isPublished']);

            if (empty($batch)) {
                otp_respond(400, ['status' => 'error', 'message' => 'Batch ID is required.']);
            }

            otp_supabase_request('PATCH', 'results?batch_id=eq.' . urlencode($batch) . '&exam_type=eq.' . urlencode($examType), [
                'is_published' => $isPublished
            ]);

            otp_respond(200, [
                'status' => 'success',
                'message' => "Results publication state for {$batch} updated to " . ($isPublished ? 'Published' : 'Hidden') . '.'
            ]);
        }

        otp_respond(400, ['status' => 'error', 'message' => 'Invalid or unrecognized action.']);
    } catch (Throwable $e) {
        error_log('[results.php POST] error: ' . $e->getMessage());
        otp_respond(500, ['status' => 'error', 'message' => $e->getMessage()]);
    }
}
