import { supabase } from '../supabaseClient.js';

const DEFAULT_ASSESSMENT_WEIGHTS = {
  midterm: {
    attendance: 20,
    assignment: 30,
    quiz: 30,
    taskCompletion: 20,
    project: 0,
    exam: 0
  },
  finalterm: {
    attendance: 15,
    assignment: 25,
    quiz: 25,
    taskCompletion: 15,
    project: 20,
    exam: 0
  },
  passingMarks: 50
};

const DEFAULT_GRADING_SCALE = [
  { grade: 'A+', min: 90, remarks: 'Outstanding', gpa: 4.0 },
  { grade: 'A', min: 80, remarks: 'Excellent', gpa: 3.7 },
  { grade: 'B', min: 70, remarks: 'Very Good', gpa: 3.0 },
  { grade: 'C', min: 60, remarks: 'Good', gpa: 2.5 },
  { grade: 'D', min: 50, remarks: 'Satisfactory', gpa: 2.0 },
  { grade: 'F', min: 0, remarks: 'Fail', gpa: 0.0 }
];

export function getDefaultAssessmentWeights() {
  return DEFAULT_ASSESSMENT_WEIGHTS;
}

export function getDefaultGradingScale() {
  return DEFAULT_GRADING_SCALE;
}


/**
 * Attendance Marks Calculation
 * late counts as present
 */
function calcAttendanceMarks(records, weight) {
  const totalSessions = (records || []).length;
  if (totalSessions === 0) return 0;
  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const pct = present / totalSessions;
  return Math.round(pct * weight * 100 * 10) / 10; // Round to 1 decimal place
}

/**
 * Assignment Marks Calculation
 */
function calcAssignmentMarks(tasks, weight) {
  const assignments = (tasks || []).filter(t => t.category === 'Assignment' && t.marksObtained !== null && t.marksObtained !== undefined);
  if (assignments.length === 0) return 0;
  const avg = assignments.reduce((s, t) => s + (Number(t.marksObtained) / (Number(t.totalMarks) || 100)), 0) / assignments.length;
  return Math.round(avg * weight * 100 * 10) / 10;
}

/**
 * Quiz Marks Calculation
 */
function calcQuizMarks(tasks, weight) {
  const quizzes = (tasks || []).filter(t => t.category === 'Quiz' && t.marksObtained !== null && t.marksObtained !== undefined);
  if (quizzes.length === 0) return 0;
  const avg = quizzes.reduce((s, t) => s + (Number(t.marksObtained) / (Number(t.totalMarks) || 100)), 0) / quizzes.length;
  return Math.round(avg * weight * 100 * 10) / 10;
}

/**
 * Task Completion Marks Calculation
 */
function calcTaskCompletionMarks(tasks, weight) {
  const assigned = (tasks || []).filter(t => t.status !== 'not_assigned');
  if (assigned.length === 0) return 0;
  const submitted = assigned.filter(t => String(t.status).toLowerCase() === 'submitted' || String(t.status).toLowerCase() === 'graded').length;
  const pct = submitted / assigned.length;
  return Math.round(pct * weight * 100 * 10) / 10;
}

/**
 * Resolves letter grade, remarks, and GPA from total score
 */
export function resolveGrade(totalScore, customScale = null) {
  const scale = (Array.isArray(customScale) && customScale.length > 0)
    ? [...customScale].sort((a, b) => Number(b.min) - Number(a.min))
    : DEFAULT_GRADING_SCALE;

  for (const tier of scale) {
    if (totalScore >= Number(tier.min)) {
      return {
        grade: tier.grade,
        remarks: tier.remarks || 'Pass',
        gpa: tier.gpa !== undefined ? Number(tier.gpa) : 0
      };
    }
  }

  const fallback = scale[scale.length - 1];
  return {
    grade: fallback?.grade || 'F',
    remarks: fallback?.remarks || 'Fail',
    gpa: fallback?.gpa !== undefined ? Number(fallback.gpa) : 0
  };
}

/**
 * Main Calculation Engine
 * Maintains 100% backwards compatibility for existing callers
 */
export function calcResult(
  attendance, 
  tasks, 
  examType, 
  customWeights = null, 
  customGradingScale = null,
  directScores = {}
) {
  const defaultWeights = examType === 'midterm'
    ? { attendance: 20, assignment: 30, quiz: 30, taskCompletion: 20, project: 0, exam: 0 }
    : { attendance: 15, assignment: 25, quiz: 25, taskCompletion: 15, project: 20, exam: 0 };

  const activeWeights = customWeights
    ? {
        attendance: customWeights.attendance !== undefined ? Number(customWeights.attendance) : defaultWeights.attendance,
        assignment: customWeights.assignment !== undefined ? Number(customWeights.assignment) : defaultWeights.assignment,
        quiz: customWeights.quiz !== undefined ? Number(customWeights.quiz) : defaultWeights.quiz,
        taskCompletion: customWeights.taskCompletion !== undefined ? Number(customWeights.taskCompletion) : defaultWeights.taskCompletion,
        project: customWeights.project !== undefined ? Number(customWeights.project) : defaultWeights.project,
        exam: customWeights.exam !== undefined ? Number(customWeights.exam) : defaultWeights.exam
      }
    : defaultWeights;

  const attendanceMarks = directScores?.attendance !== undefined 
    ? Number(directScores.attendance) 
    : calcAttendanceMarks(attendance, activeWeights.attendance / 100);

  const assignmentMarks = directScores?.assignment !== undefined 
    ? Number(directScores.assignment) 
    : calcAssignmentMarks(tasks, activeWeights.assignment / 100);

  const quizMarks = directScores?.quiz !== undefined 
    ? Number(directScores.quiz) 
    : calcQuizMarks(tasks, activeWeights.quiz / 100);

  const taskMarks = directScores?.taskCompletion !== undefined 
    ? Number(directScores.taskCompletion) 
    : calcTaskCompletionMarks(tasks, activeWeights.taskCompletion / 100);
  
  // Final project marks
  let projectMarks = 0;
  if (directScores?.project !== undefined) {
    projectMarks = Number(directScores.project);
  } else {
    const projectTasks = (tasks || []).filter(t => t.category === 'Project' && t.marksObtained !== null && t.marksObtained !== undefined);
    const highestProjectScore = projectTasks.length > 0 
      ? Math.max(...projectTasks.map(t => (Number(t.marksObtained) / (Number(t.totalMarks) || 100))))
      : 0;
    projectMarks = (examType === 'finalterm' || (activeWeights.project && activeWeights.project > 0)) 
      ? highestProjectScore * activeWeights.project 
      : 0;
    projectMarks = Math.round(projectMarks * 10) / 10;
  }

  // Optional theory / term exam marks
  const examMarks = directScores?.exam !== undefined 
    ? Number(directScores.exam) 
    : (directScores?.exam_marks !== undefined ? Number(directScores.exam_marks) : 0);

  const total = Math.round((attendanceMarks + assignmentMarks + quizMarks + taskMarks + projectMarks + examMarks) * 10) / 10;
  
  const gradeInfo = resolveGrade(total, customGradingScale);
  const passingMarks = customWeights?.passingMarks !== undefined ? Number(customWeights.passingMarks) : 50;
  const passed = total >= passingMarks;

  return { 
    total, 
    grade: gradeInfo.grade, 
    remarks: gradeInfo.remarks,
    gpa: gradeInfo.gpa,
    passed,
    breakdown: { 
      attendance: attendanceMarks, 
      assignment: assignmentMarks, 
      quiz: quizMarks, 
      taskCompletion: taskMarks, 
      project: projectMarks,
      exam: examMarks
    },
    weights: activeWeights
  };
}

/**
 * Compute and Cache Result for a student
 */
export async function computeAndCacheResult(studentId, examType, { updateRanks = false, customWeights = null, customGradingScale = null, directScores = {} } = {}) {
  try {
    // 1. Fetch Student Info (to get batch)
    const { data: student } = await supabase.from('admissions').select('batch, cnic').eq('id', studentId).single();
    if (!student) return;

    // 2. Fetch Attendance Records
    const { data: attendance } = await supabase.from('attendance').select('*').eq('student_id', studentId);

    // 3. Fetch Tasks and Submissions
    const { data: tasks } = await supabase.from('tasks').select('*').eq('batch', student.batch);
    const { data: submissions } = await supabase.from('task_submissions').select('*').eq('cnic', student.cnic);

    // 4. Merge Submissions into Tasks for Calculation
    const mergedTasks = (tasks || []).map(t => {
      const sub = (submissions || []).find(s => s.task_id === t.id);
      return {
        ...t,
        category: t.category,
        totalMarks: t.total_marks,
        marksObtained: sub ? sub.marks_obtained : null,
        status: sub ? sub.status : 'not_assigned'
      };
    });

    // 5. Calculate
    const result = calcResult(attendance || [], mergedTasks, examType, customWeights, customGradingScale, directScores);
    
    // 6. Upsert to Results table
    const { error: upsertError } = await supabase.from('results').upsert({
      student_id: studentId,
      batch_id: student.batch,
      exam_type: examType,
      attendance_marks: result.breakdown.attendance,
      assignment_marks: result.breakdown.assignment,
      quiz_marks: result.breakdown.quiz,
      task_completion_marks: result.breakdown.taskCompletion,
      project_marks: result.breakdown.project,
      total_marks: result.total,
      grade: result.grade,
      remarks: result.remarks,
      passed: result.passed,
      computed_at: new Date().toISOString()
    }, { onConflict: 'student_id, exam_type' });

    if (upsertError) console.error('Error caching result:', upsertError);

    // 7. Update ranks for the batch (only when explicitly requested, e.g. Results workflow)
    if (updateRanks) {
      await updateBatchRanks(student.batch, examType);
    }

    return result;
  } catch (error) {
    console.error('Failed to compute result:', error);
  }
}


export async function updateBatchRanks(batchId, examType) {
  const { data: batchResults } = await supabase
    .from('results')
    .select('id, total_marks')
    .eq('batch_id', batchId)
    .eq('exam_type', examType)
    .order('total_marks', { ascending: false });

  if (batchResults) {
    const updates = batchResults.map((r, index) => ({
      id: r.id,
      batch_rank: index + 1
    }));

    for (const update of updates) {
      await supabase.from('results').update({ batch_rank: update.batch_rank }).eq('id', update.id);
    }
  }
}
