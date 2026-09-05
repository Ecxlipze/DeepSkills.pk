import { supabase } from '../supabaseClient.js';

/**
 * Attendance Marks Calculation
 * late counts as present
 */
function calcAttendanceMarks(records, weight) {
  const totalSessions = records.length;
  if (totalSessions === 0) return 0;
  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const pct = present / totalSessions;
  return Math.round(pct * weight * 100 * 10) / 10; // Round to 1 decimal place
}

/**
 * Assignment Marks Calculation
 */
function calcAssignmentMarks(tasks, weight) {
  const assignments = tasks.filter(t => t.category === 'Assignment' && t.marksObtained !== null);
  if (assignments.length === 0) return 0;
  const avg = assignments.reduce((s, t) => s + (t.marksObtained / (t.totalMarks || 100)), 0) / assignments.length;
  return Math.round(avg * weight * 100 * 10) / 10;
}

/**
 * Quiz Marks Calculation
 */
function calcQuizMarks(tasks, weight) {
  const quizzes = tasks.filter(t => t.category === 'Quiz' && t.marksObtained !== null);
  if (quizzes.length === 0) return 0;
  const avg = quizzes.reduce((s, t) => s + (t.marksObtained / (t.totalMarks || 100)), 0) / quizzes.length;
  return Math.round(avg * weight * 100 * 10) / 10;
}

/**
 * Task Completion Marks Calculation
 */
function calcTaskCompletionMarks(tasks, weight) {
  const assigned = tasks.filter(t => t.status !== 'not_assigned');
  if (assigned.length === 0) return 0;
  const submitted = assigned.filter(t => t.status === 'Submitted' || t.status === 'submitted').length;
  const pct = submitted / assigned.length;
  return Math.round(pct * weight * 100 * 10) / 10;
}

/**
 * Main Calculation Engine
 */
export function calcResult(attendance, tasks, examType) {
  const weights = examType === 'midterm'
    ? { attendance: 20, assignment: 30, quiz: 30, taskCompletion: 20, project: 0 }
    : { attendance: 15, assignment: 25, quiz: 25, taskCompletion: 15, project: 20 };

  const attendanceMarks = calcAttendanceMarks(attendance, weights.attendance / 100);
  const assignmentMarks = calcAssignmentMarks(tasks, weights.assignment / 100);
  const quizMarks = calcQuizMarks(tasks, weights.quiz / 100);
  const taskMarks = calcTaskCompletionMarks(tasks, weights.taskCompletion / 100);
  
  // Final project: only one task of category "Project" counts (highest marks)
  const projectTasks = tasks.filter(t => t.category === 'Project' && t.marksObtained !== null);
  const highestProjectScore = projectTasks.length > 0 
    ? Math.max(...projectTasks.map(t => (t.marksObtained / (t.totalMarks || 100))))
    : 0;
  const projectMarks = examType === 'finalterm' ? highestProjectScore * weights.project : 0;

  const total = attendanceMarks + assignmentMarks + quizMarks + taskMarks + projectMarks;
  
  const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B'
              : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F';
              
  const remarks = { 'A+':'Outstanding','A':'Excellent','B':'Very Good','C':'Good','D':'Satisfactory','F':'Fail' }[grade];
  const passed = total >= 50;

  return { 
    total: Math.round(total * 10) / 10, 
    grade, 
    remarks, 
    passed,
    breakdown: { 
      attendance: attendanceMarks, 
      assignment: assignmentMarks,
      quiz: quizMarks, 
      taskCompletion: taskMarks, 
      project: projectMarks 
    } 
  };
}

/**
 * Compute and Cache Result for a student
 */
export async function computeAndCacheResult(studentId, examType, { updateRanks = false } = {}) {
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
    const result = calcResult(attendance || [], mergedTasks, examType);
    
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
