import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation, normalizeCnic } from '../../../../lib/portalAuthServer.js';
import { 
  calcResult, 
  computeAndCacheResult, 
  updateBatchRanks, 
  resolveGrade,
  getDefaultAssessmentWeights, 
  getDefaultGradingScale 
} from '../../../../src/utils/resultUtils.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  // 1. RBAC Authentication
  const auth = await authorizeAdminOperation(req, 'results');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // Helper to fetch assessment weights and grading scale from app_settings
  const getAssessmentSettings = async () => {
    try {
      const { data: row } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'academic_assessment_weights')
        .maybeSingle();

      const defaults = getDefaultAssessmentWeights();
      const defaultScale = getDefaultGradingScale();

      if (row?.value) {
        return {
          weights: {
            midterm: { ...defaults.midterm, ...(row.value.midterm || {}) },
            finalterm: { ...defaults.finalterm, ...(row.value.finalterm || {}) },
            passingMarks: row.value.passingMarks !== undefined ? Number(row.value.passingMarks) : defaults.passingMarks
          },
          gradingScale: Array.isArray(row.value.gradingScale) && row.value.gradingScale.length > 0
            ? row.value.gradingScale
            : defaultScale
        };
      }

      return { weights: defaults, gradingScale: defaultScale };
    } catch (_) {
      return { weights: getDefaultAssessmentWeights(), gradingScale: getDefaultGradingScale() };
    }
  };

  // ──────────────────────────────────────────
  // GET: Fetch Batches, Marksheet Roster, Stats, Weights
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { batch, exam_type, search } = req.query;
      const rawExamType = String(exam_type || 'midterm').toLowerCase();
      const examType = rawExamType === 'finalterm' ? 'finalterm' : 'midterm';
      const selectedBatch = batch && batch !== 'all' ? batch : null;

      // 1. Fetch Batches
      const { data: batches, error: bErr } = await supabase
        .from('batches')
        .select('id, batch_name, course, time_shift, status')
        .order('batch_name', { ascending: true });
      if (bErr) throw bErr;

      // 2. Fetch Settings
      const settings = await getAssessmentSettings();

      // 3. Fetch Enrolled Admissions
      let admQuery = supabase
        .from('admissions')
        .select('id, name, cnic, phone, email, course, batch, photo_url, status')
        .in('status', ['Active', 'Graduated'])
        .order('name', { ascending: true });

      if (selectedBatch) {
        admQuery = admQuery.eq('batch', selectedBatch);
      }

      const { data: admissions, error: admErr } = await admQuery;
      if (admErr) throw admErr;

      // 4. Fetch Results
      let resultsQuery = supabase
        .from('results')
        .select('*')
        .eq('exam_type', examType)
        .order('total_marks', { ascending: false });

      if (selectedBatch) {
        resultsQuery = resultsQuery.eq('batch_id', selectedBatch);
      }

      const { data: existingResults, error: resErr } = await resultsQuery;
      if (resErr) throw resErr;

      const resultMap = new Map();
      (existingResults || []).forEach(r => {
        resultMap.set(r.student_id, r);
      });

      // 5. Build Combined Marksheet Roster
      const activeWeights = examType === 'finalterm' ? settings.weights.finalterm : settings.weights.midterm;
      let roster = (admissions || []).map(student => {
        const resRecord = resultMap.get(student.id);
        const hasResult = !!resRecord;

        return {
          student_id: student.id,
          name: student.name,
          cnic: student.cnic,
          phone: student.phone,
          email: student.email,
          course: student.course,
          batch: student.batch,
          photo_url: student.photo_url,
          has_result: hasResult,
          result_id: resRecord?.id || null,
          attendance_marks: resRecord?.attendance_marks !== undefined ? Number(resRecord.attendance_marks) : 0,
          assignment_marks: resRecord?.assignment_marks !== undefined ? Number(resRecord.assignment_marks) : 0,
          quiz_marks: resRecord?.quiz_marks !== undefined ? Number(resRecord.quiz_marks) : 0,
          task_completion_marks: resRecord?.task_completion_marks !== undefined ? Number(resRecord.task_completion_marks) : 0,
          project_marks: resRecord?.project_marks !== undefined ? Number(resRecord.project_marks) : 0,
          exam_marks: resRecord?.exam_marks !== undefined ? Number(resRecord.exam_marks) : 0,
          total_marks: resRecord?.total_marks !== undefined ? Number(resRecord.total_marks) : 0,
          grade: resRecord?.grade || (hasResult ? 'F' : '—'),
          remarks: resRecord?.remarks || '',
          passed: resRecord?.passed !== undefined ? resRecord.passed : false,
          batch_rank: resRecord?.batch_rank || null,
          computed_at: resRecord?.computed_at || null
        };
      });

      // Filter by search query if provided
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const normQ = normalizeCnic(q);
        roster = roster.filter(s => 
          s.name.toLowerCase().includes(q) ||
          (s.cnic && s.cnic.includes(normQ)) ||
          (s.batch && s.batch.toLowerCase().includes(q))
        );
      }

      // 6. Compute Executive Statistics
      const gradedStudents = roster.filter(s => s.has_result);
      const totalCandidates = roster.length;
      const passedCount = gradedStudents.filter(s => s.passed).length;
      const failedCount = gradedStudents.filter(s => !s.passed).length;
      const passRate = totalCandidates > 0 ? Math.round((passedCount / totalCandidates) * 100) : 0;
      
      const totalMarksSum = gradedStudents.reduce((acc, s) => acc + s.total_marks, 0);
      const classAverage = gradedStudents.length > 0 
        ? Math.round((totalMarksSum / gradedStudents.length) * 10) / 10 
        : 0;
      const highestScore = gradedStudents.length > 0 
        ? Math.max(...gradedStudents.map(s => s.total_marks)) 
        : 0;

      // Grade distribution
      const gradeDistribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
      gradedStudents.forEach(s => {
        if (s.grade && gradeDistribution[s.grade] !== undefined) {
          gradeDistribution[s.grade] += 1;
        } else if (s.grade && s.grade !== '—') {
          gradeDistribution['F'] += 1;
        }
      });

      return res.status(200).json({
        status: 'success',
        data: {
          batches: batches || [],
          roster,
          stats: {
            totalCandidates,
            gradedCount: gradedStudents.length,
            passed: passedCount,
            failed: failedCount,
            passRate,
            classAverage,
            highestScore,
            gradeDistribution
          },
          weights: settings.weights,
          activeWeights,
          gradingScale: settings.gradingScale,
          examType,
          selectedBatch: selectedBatch || 'all'
        }
      });
    } catch (err) {
      console.error('[admin/academic/results GET] error:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to load examination results data.' });
    }
  }

  // ──────────────────────────────────────────
  // POST: Marksheet Operations
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    if (!auth.canMutate) {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to modify results.' });
    }

    try {
      const { action } = req.body;

      // ACTION 1: Save Marksheet Adjustments
      if (action === 'save_marksheet') {
        const { batch, examType = 'midterm', entries = [] } = req.body;
        if (!batch) {
          return res.status(400).json({ status: 'error', message: 'Batch ID is required for marksheet save.' });
        }

        const settings = await getAssessmentSettings();
        const activeWeights = examType === 'finalterm' ? settings.weights.finalterm : settings.weights.midterm;

        for (const entry of entries) {
          const studentId = entry.student_id;
          if (!studentId) continue;

          const att = Number(entry.attendance_marks || 0);
          const ass = Number(entry.assignment_marks || 0);
          const quiz = Number(entry.quiz_marks || 0);
          const task = Number(entry.task_completion_marks || 0);
          const proj = Number(entry.project_marks || 0);
          const exam = Number(entry.exam_marks || 0);

          const total = Math.round((att + ass + quiz + task + proj + exam) * 10) / 10;
          const gradeInfo = resolveGrade(total, settings.gradingScale);
          const passingMarks = settings.weights.passingMarks !== undefined ? Number(settings.weights.passingMarks) : 50;
          const passed = total >= passingMarks;

          const payload = {
            student_id: studentId,
            batch_id: batch,
            exam_type: examType,
            attendance_marks: att,
            assignment_marks: ass,
            quiz_marks: quiz,
            task_completion_marks: task,
            project_marks: proj,
            exam_marks: exam,
            total_marks: total,
            grade: gradeInfo.grade,
            remarks: gradeInfo.remarks,
            passed,
            computed_at: new Date().toISOString()
          };

          const { error: upErr } = await supabase
            .from('results')
            .upsert(payload, { onConflict: 'student_id, exam_type' });

          if (upErr) {
            console.error('[save_marksheet upsert error]:', upErr);
          }
        }

        // Update ranks for this batch
        await updateBatchRanks(batch, examType);

        return res.status(200).json({
          status: 'success',
          message: `Successfully saved marksheet entries for batch ${batch}.`
        });
      }

      // ACTION 2: Batch Recomputation
      if (action === 'recompute_batch') {
        const { batch, examType = 'midterm', notifyStudents = false } = req.body;
        if (!batch || batch === 'all') {
          return res.status(400).json({ status: 'error', message: 'Please specify a concrete batch to recompute.' });
        }

        const { data: students, error: sErr } = await supabase
          .from('admissions')
          .select('id, name')
          .eq('batch', batch)
          .eq('status', 'Active');
        if (sErr) throw sErr;

        const settings = await getAssessmentSettings();
        const activeWeights = examType === 'finalterm' ? settings.weights.finalterm : settings.weights.midterm;

        for (const s of (students || [])) {
          await computeAndCacheResult(s.id, examType, {
            updateRanks: false,
            customWeights: activeWeights,
            customGradingScale: settings.gradingScale
          });
        }

        await updateBatchRanks(batch, examType);

        if (notifyStudents && students && students.length > 0) {
          const notifications = students.map(s => ({
            user_id: s.id,
            role: 'student',
            type: 'result',
            title: 'Examination Result Published',
            message: `Your ${examType === 'finalterm' ? 'Final Term' : 'Mid Term'} result has been computed and published to your portal.`,
            link: `/student/results/${examType}`,
            is_read: false,
            created_at: new Date().toISOString()
          }));

          await supabase.from('notifications').insert(notifications).catch(() => {});
        }

        return res.status(200).json({
          status: 'success',
          message: `Successfully recomputed and ranked ${students?.length || 0} students for batch ${batch}.`
        });
      }

      // ACTION 3: Save Assessment Structure Weights
      if (action === 'save_weights') {
        const { weights, gradingScale } = req.body;
        if (!weights) {
          return res.status(400).json({ status: 'error', message: 'Weights object is required.' });
        }

        const payload = {
          key: 'academic_assessment_weights',
          value: {
            midterm: weights.midterm || getDefaultAssessmentWeights().midterm,
            finalterm: weights.finalterm || getDefaultAssessmentWeights().finalterm,
            passingMarks: weights.passingMarks !== undefined ? Number(weights.passingMarks) : 50,
            gradingScale: gradingScale || getDefaultGradingScale()
          },
          updated_at: new Date().toISOString()
        };

        const { error: sErr } = await supabase
          .from('app_settings')
          .upsert(payload, { onConflict: 'key' });

        if (sErr) throw sErr;

        return res.status(200).json({
          status: 'success',
          message: 'Assessment weights and grading scale successfully saved.'
        });
      }

      // ACTION 4: Toggle Publish State
      if (action === 'toggle_publish') {
        const { batch, examType = 'midterm', isPublished = true } = req.body;
        if (!batch) {
          return res.status(400).json({ status: 'error', message: 'Batch ID is required.' });
        }

        await supabase
          .from('results')
          .update({ is_published: isPublished })
          .eq('batch_id', batch)
          .eq('exam_type', examType)
          .catch(() => {});

        return res.status(200).json({
          status: 'success',
          message: `Results publication state for ${batch} updated to ${isPublished ? 'Published' : 'Hidden'}.`
        });
      }

      return res.status(400).json({ status: 'error', message: 'Invalid or unrecognized action.' });
    } catch (err) {
      console.error('[admin/academic/results POST] error:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to process results action.' });
    }
  }
}
