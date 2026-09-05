<?php
require_once 'public/api/auth/_otp_common.php';

echo "=== RESULTS REPAIR DRY-RUN ===\n\n";

$results = otp_supabase_request('GET', 'results?select=*&order=batch_id.asc,exam_type.asc', null, '', true);

if (!is_array($results)) {
    echo "Error fetching results\n";
    exit(1);
}

$totalRows = count($results);
$clearlyAffected = 0;
$unchanged = 0;
$needsReview = 0;

$diffs = [];

// Formulas from resultUtils.js
function dryCalcAttendance($records, $weight) {
    $total = count($records);
    if ($total === 0) return 0;
    $present = 0;
    foreach ($records as $r) {
        if (($r['status'] ?? '') === 'present' || ($r['status'] ?? '') === 'late') {
            $present++;
        }
    }
    $pct = $present / $total;
    return round($pct * $weight * 100 * 10) / 10;
}

function dryCalcAssignment($tasks, $weight) {
    $filtered = array_filter($tasks, fn($t) => ($t['category'] ?? '') === 'Assignment' && isset($t['marksObtained']) && $t['marksObtained'] !== null);
    if (empty($filtered)) return 0;
    $sum = 0;
    foreach ($filtered as $t) {
        $totalMarks = !empty($t['totalMarks']) ? $t['totalMarks'] : 100;
        $sum += ($t['marksObtained'] / $totalMarks);
    }
    $avg = $sum / count($filtered);
    return round($avg * $weight * 100 * 10) / 10;
}

function dryCalcQuiz($tasks, $weight) {
    $filtered = array_filter($tasks, fn($t) => ($t['category'] ?? '') === 'Quiz' && isset($t['marksObtained']) && $t['marksObtained'] !== null);
    if (empty($filtered)) return 0;
    $sum = 0;
    foreach ($filtered as $t) {
        $totalMarks = !empty($t['totalMarks']) ? $t['totalMarks'] : 100;
        $sum += ($t['marksObtained'] / $totalMarks);
    }
    $avg = $sum / count($filtered);
    return round($avg * $weight * 100 * 10) / 10;
}

function dryCalcTaskCompletion($tasks, $weight) {
    $assigned = array_filter($tasks, fn($t) => ($t['status'] ?? '') !== 'not_assigned');
    if (empty($assigned)) return 0;
    $submitted = 0;
    foreach ($assigned as $t) {
        $st = strtolower($t['status'] ?? '');
        if ($st === 'submitted') $submitted++;
    }
    $pct = $submitted / count($assigned);
    return round($pct * $weight * 100 * 10) / 10;
}

function dryCalcResult($attendance, $tasks, $examType) {
    $weights = $examType === 'midterm'
        ? ['attendance' => 20, 'assignment' => 30, 'quiz' => 30, 'taskCompletion' => 20, 'project' => 0]
        : ['attendance' => 15, 'assignment' => 25, 'quiz' => 25, 'taskCompletion' => 15, 'project' => 20];

    $attendanceMarks = dryCalcAttendance($attendance, $weights['attendance'] / 100);
    $assignmentMarks = dryCalcAssignment($tasks, $weights['assignment'] / 100);
    $quizMarks = dryCalcQuiz($tasks, $weights['quiz'] / 100);
    $taskMarks = dryCalcTaskCompletion($tasks, $weights['taskCompletion'] / 100);

    $projectTasks = array_filter($tasks, fn($t) => ($t['category'] ?? '') === 'Project' && isset($t['marksObtained']) && $t['marksObtained'] !== null);
    $highestProjectScore = 0;
    if (!empty($projectTasks)) {
        foreach ($projectTasks as $t) {
            $tm = !empty($t['totalMarks']) ? $t['totalMarks'] : 100;
            $score = $t['marksObtained'] / $tm;
            if ($score > $highestProjectScore) $highestProjectScore = $score;
        }
    }
    $projectMarks = $examType === 'finalterm' ? ($highestProjectScore * $weights['project']) : 0;

    $total = $attendanceMarks + $assignmentMarks + $quizMarks + $taskMarks + $projectMarks;

    $grade = $total >= 90 ? 'A+' : ($total >= 80 ? 'A' : ($total >= 70 ? 'B' : ($total >= 60 ? 'C' : ($total >= 50 ? 'D' : 'F'))));
    $remarksMap = ['A+' => 'Outstanding', 'A' => 'Excellent', 'B' => 'Very Good', 'C' => 'Good', 'D' => 'Satisfactory', 'F' => 'Fail'];
    $remarks = $remarksMap[$grade] ?? 'Fail';
    $passed = $total >= 50;

    return [
        'total' => round($total * 10) / 10,
        'grade' => $grade,
        'remarks' => $remarks,
        'passed' => $passed,
        'breakdown' => [
            'attendance' => $attendanceMarks,
            'assignment' => $assignmentMarks,
            'quiz' => $quizMarks,
            'taskCompletion' => $taskMarks,
            'project' => $projectMarks
        ]
    ];
}

foreach ($results as $row) {
    $studentId = $row['student_id'];
    $examType = $row['exam_type'];
    $batch = $row['batch_id'];

    $student = otp_supabase_request('GET', 'admissions?id=eq.' . rawurlencode($studentId) . '&limit=1', null, '', true);
    $studentRow = !empty($student) ? $student[0] : null;

    if (!$studentRow) {
        $needsReview++;
        $diffs[] = [
            'result_id' => $row['id'],
            'student_id' => $studentId,
            'batch' => $batch,
            'exam_type' => $examType,
            'status' => 'Needs Review: Student admission not found',
            'stored_total' => $row['total_marks'],
            'recalculated_total' => null
        ];
        continue;
    }

    $attendance = otp_supabase_request('GET', 'attendance?student_id=eq.' . rawurlencode($studentId), null, '', true);
    $tasks = otp_supabase_request('GET', 'tasks?batch=eq.' . rawurlencode($studentRow['batch']), null, '', true);
    $submissions = otp_supabase_request('GET', 'task_submissions?cnic=eq.' . rawurlencode($studentRow['cnic']), null, '', true);

    $mergedTasks = [];
    foreach (($tasks ?: []) as $t) {
        $sub = null;
        foreach (($submissions ?: []) as $s) {
            if (($s['task_id'] ?? '') === $t['id']) {
                $sub = $s;
                break;
            }
        }
        $mergedTasks[] = [
            'id' => $t['id'],
            'category' => $t['category'] ?? '',
            'totalMarks' => $t['total_marks'] ?? 100,
            'marksObtained' => $sub ? ($sub['marks_obtained'] ?? null) : null,
            'status' => $sub ? ($sub['status'] ?? 'not_assigned') : 'not_assigned'
        ];
    }

    $recomputed = dryCalcResult($attendance ?: [], $mergedTasks, $examType);

    $storedTotal = (float)$row['total_marks'];
    $recalculatedTotal = (float)$recomputed['total'];
    $storedGrade = $row['grade'];
    $recalculatedGrade = $recomputed['grade'];
    $storedPassed = (bool)$row['passed'];
    $recalculatedPassed = (bool)$recomputed['passed'];

    $isAffected = false;
    // Check if exactly 10x difference or components 10x difference
    if ($storedTotal > 0 && abs(($storedTotal * 10) - $recalculatedTotal) < 0.05) {
        $isAffected = true;
    } elseif ($storedTotal != $recalculatedTotal) {
        $isAffected = true;
    }

    if ($isAffected) {
        $clearlyAffected++;
        $diffs[] = [
            'result_id' => $row['id'],
            'student_id' => $studentId,
            'batch' => $batch,
            'exam_type' => $examType,
            'classification' => 'definitely affected (10x error signature)',
            'stored_total' => $storedTotal,
            'recalculated_total' => $recalculatedTotal,
            'stored_attendance' => (float)$row['attendance_marks'],
            'recalculated_attendance' => (float)$recomputed['breakdown']['attendance'],
            'stored_grade' => $storedGrade,
            'recalculated_grade' => $recalculatedGrade,
            'stored_passed' => $storedPassed,
            'recalculated_passed' => $recalculatedPassed,
            'stored_remarks' => $row['remarks'],
            'recalculated_remarks' => $recomputed['remarks']
        ];
    } else {
        $unchanged++;
    }
}

echo "=== SUMMARY COUNTS ===\n";
echo "Total result rows: $totalRows\n";
echo "Clearly affected: $clearlyAffected\n";
echo "Unchanged / Already correct: $unchanged\n";
echo "Needs review: $needsReview\n\n";

echo "=== DIFFERENCES FOUND ===\n";
echo json_encode($diffs, JSON_PRETTY_PRINT) . PHP_EOL;

