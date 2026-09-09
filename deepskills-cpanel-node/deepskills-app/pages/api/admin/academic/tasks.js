import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation, normalizeCnic } from '../../../../lib/portalAuthServer.js';
import { computeAndCacheResult } from '../../../../src/utils/resultUtils.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  // RBAC Authentication
  const auth = await authorizeAdminOperation(req, 'tasks');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // ──────────────────────────────────────────
  // GET: Fetch Tasks, Batches, Matrix, Stats
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { course, batch, category, search, task_id } = req.query;

      // 1. Fetch Batches
      const { data: batches, error: bErr } = await supabase
        .from('batches')
        .select('id, batch_name, course, time_shift, status')
        .order('batch_name', { ascending: true });
      if (bErr) throw bErr;

      // 2. Fetch Active Admissions
      const { data: admissions, error: admErr } = await supabase
        .from('admissions')
        .select('id, name, cnic, phone, email, course, batch, photo_url, status')
        .in('status', ['Active', 'Graduated'])
        .order('name', { ascending: true });
      if (admErr) throw admErr;

      // 3. Fetch Tasks
      let taskQuery = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (course && course !== 'all') taskQuery = taskQuery.eq('course', course);
      if (batch && batch !== 'all') taskQuery = taskQuery.eq('batch', batch);
      if (category && category !== 'all') taskQuery = taskQuery.eq('category', category);

      const { data: allTasks, error: tErr } = await taskQuery;
      if (tErr) throw tErr;

      // Filter search
      let filteredTasks = allTasks || [];
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filteredTasks = filteredTasks.filter(t =>
          String(t.title || '').toLowerCase().includes(q) ||
          String(t.assigned_by || '').toLowerCase().includes(q) ||
          String(t.description || '').toLowerCase().includes(q)
        );
      }

      // 4. Fetch Submissions
      const { data: allSubmissions, error: sErr } = await supabase
        .from('task_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (sErr) throw sErr;

      const submissions = allSubmissions || [];

      // Calculate Enrolled Student Counts per Batch
      const enrolledCounts = {};
      (admissions || []).forEach(a => {
        if (a.batch) {
          enrolledCounts[a.batch] = (enrolledCounts[a.batch] || 0) + 1;
        }
      });

      // 5. Build Detailed Submission Tracking Matrix if task_id provided
      let selectedTaskMatrix = null;
      let targetTask = null;

      if (task_id) {
        targetTask = (allTasks || []).find(t => t.id === task_id);
      } else if (filteredTasks.length > 0) {
        targetTask = filteredTasks[0];
      }

      if (targetTask) {
        const taskSubs = submissions.filter(s => s.task_id === targetTask.id);
        const subMapByCnic = {};
        const subMapById = {};
        taskSubs.forEach(s => {
          if (s.cnic) subMapByCnic[s.cnic] = s;
          if (s.student_id) subMapById[s.student_id] = s;
        });

        // Filter active students enrolled in this batch
        const batchStudents = (admissions || []).filter(st => {
          if (targetTask.batch === 'All Batches' || targetTask.batch === 'all') {
            return st.course === targetTask.course;
          }
          return st.batch === targetTask.batch;
        });

        const matrix = batchStudents.map(st => {
          const sub = subMapByCnic[st.cnic] || subMapById[st.id] || null;
          let status = 'Pending';
          let isLate = false;

          if (sub) {
            if (targetTask.due_date && sub.submitted_at) {
              const due = new Date(targetTask.due_date).getTime();
              const subDate = new Date(sub.submitted_at).getTime();
              if (subDate > due) isLate = true;
            }

            if (sub.status === 'Graded' || (sub.marks_obtained !== null && sub.marks_obtained !== undefined)) {
              status = isLate ? 'Graded (Late)' : 'Graded';
            } else {
              status = isLate ? 'Late' : 'Submitted';
            }
          }

          return {
            student_id: st.id,
            student_name: st.name,
            student_cnic: st.cnic,
            student_phone: st.phone,
            student_email: st.email,
            photo_url: st.photo_url,
            course: st.course,
            batch: st.batch,
            submission_id: sub?.id || null,
            status,
            is_late: isLate,
            submitted_at: sub?.submitted_at || null,
            file_url: sub?.file_url || null,
            marks_obtained: sub?.marks_obtained ?? null,
            total_marks: targetTask.total_marks || 100,
            grade: sub?.grade || null,
            feedback: sub?.feedback || '',
            rubric_scores: sub?.rubric_scores || null
          };
        });

        selectedTaskMatrix = {
          task: targetTask,
          totalEnrolled: batchStudents.length,
          submittedCount: matrix.filter(m => m.status !== 'Pending').length,
          gradedCount: matrix.filter(m => m.status.startsWith('Graded')).length,
          pendingCount: matrix.filter(m => m.status === 'Pending').length,
          lateCount: matrix.filter(m => m.is_late).length,
          students: matrix
        };
      }

      // Compute Overall Telemetry
      const totalTasksCount = (allTasks || []).length;
      const totalSubsCount = submissions.length;
      const gradedSubsCount = submissions.filter(s => s.status === 'Graded' || s.marks_obtained !== null).length;
      const evalRate = totalSubsCount > 0 ? Math.round((gradedSubsCount / totalSubsCount) * 100) : 0;
      const pendingEvalCount = totalSubsCount - gradedSubsCount;

      // Unique courses
      const courseOptions = Array.from(new Set((batches || []).map(b => b.course).filter(Boolean)));

      return res.status(200).json({
        status: 'success',
        data: {
          tasks: filteredTasks,
          batches: batches || [],
          courses: courseOptions,
          enrolledCounts,
          stats: {
            totalTasks: totalTasksCount,
            totalSubmissions: totalSubsCount,
            gradedSubmissions: gradedSubsCount,
            evaluationRate: evalRate,
            pendingEvaluations: pendingEvalCount,
            activeBatches: (batches || []).length
          },
          selectedTaskMatrix
        }
      });
    } catch (err) {
      console.error('Error in tasks GET API:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to load tasks data.' });
    }
  }

  // ──────────────────────────────────────────
  // POST: Create Task, Grade, Delete, Reminders
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { action } = req.body || {};

    // Action 1: Create Batch-Wide Assignment
    if (action === 'create_task') {
      const {
        title,
        category = 'Assignment',
        course,
        batch,
        batches: targetBatches,
        due_date,
        total_marks = 100,
        description = '',
        file_url = null,
        file_urls = [],
        rubric = []
      } = req.body;

      if (!title || !course || !due_date) {
        return res.status(400).json({ status: 'error', message: 'Title, course, and due date are required.' });
      }

      try {
        const assignedBy = auth.userId ? (auth.user?.name || auth.user?.full_name || 'Academic Directorate') : 'Academic Directorate';
        const batchesToTarget = Array.isArray(targetBatches) && targetBatches.length > 0
          ? targetBatches
          : [batch || 'All Batches'];

        const createdTasks = [];

        for (const bName of batchesToTarget) {
          const taskPayload = {
            title: title.trim(),
            category,
            course,
            batch: bName,
            due_date,
            total_marks: Number(total_marks) || 100,
            description: description.trim(),
            file_url: file_url || (file_urls?.[0]?.url || null),
            assigned_by: assignedBy,
            created_at: new Date().toISOString()
          };

          const { data: newTask, error: insErr } = await supabase
            .from('tasks')
            .insert([taskPayload])
            .select()
            .single();

          if (insErr) throw insErr;
          createdTasks.push(newTask);

          // Notify targeted students asynchronously
          (async () => {
            try {
              let admQ = supabase
                .from('admissions')
                .select('id')
                .eq('course', course)
                .in('status', ['Active', 'Graduated']);

              if (bName !== 'All Batches' && bName !== 'all') {
                admQ = admQ.eq('batch', bName);
              }

              const { data: enrolledStudents } = await admQ;
              if (enrolledStudents && enrolledStudents.length > 0) {
                const notifications = enrolledStudents.map(st => ({
                  user_id: st.id,
                  role: 'student',
                  type: 'task',
                  title: `New ${category} Assigned`,
                  message: `New task "${title}" has been assigned for ${course} (${bName}). Due Date: ${new Date(due_date).toLocaleDateString()}.`,
                  link: '/student/tasks',
                  created_at: new Date().toISOString()
                }));

                await supabase.from('notifications').insert(notifications);
              }
            } catch (notifErr) {
              console.warn('Failed to dispatch task assignment notifications:', notifErr);
            }
          })();
        }

        return res.status(200).json({
          status: 'success',
          message: `Created ${createdTasks.length} assignment(s) successfully!`,
          data: createdTasks
        });
      } catch (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to create assignment.' });
      }
    }

    // Action 2: Rubric Grade Submission
    if (action === 'grade_submission') {
      const {
        submission_id,
        marks_obtained,
        grade,
        feedback = '',
        rubric_scores = null
      } = req.body;

      if (!submission_id || marks_obtained === undefined || marks_obtained === null) {
        return res.status(400).json({ status: 'error', message: 'submission_id and marks_obtained are required.' });
      }

      try {
        const evaluatorName = auth.user?.name || auth.user?.full_name || 'Academic Evaluator';
        const now = new Date().toISOString();

        const { data: updatedSub, error: upErr } = await supabase
          .from('task_submissions')
          .update({
            marks_obtained: Number(marks_obtained),
            grade: grade || null,
            status: 'Graded',
            feedback: feedback ? String(feedback).trim() : null,
            rubric_scores: rubric_scores || null
          })
          .eq('id', submission_id)
          .select('*, task:tasks(id, title, total_marks, course, batch)')
          .single();

        if (upErr) throw upErr;

        // Recalculate student results cache asynchronously
        (async () => {
          try {
            if (updatedSub.cnic) {
              const { data: stRows } = await supabase
                .from('admissions')
                .select('id')
                .eq('cnic', updatedSub.cnic)
                .in('status', ['Active', 'Graduated'])
                .limit(1);

              const st = stRows && stRows[0];
              if (st?.id) {
                await computeAndCacheResult(st.id, 'midterm', { updateRanks: false });
                await computeAndCacheResult(st.id, 'finalterm', { updateRanks: false });

                // Send notification to student
                await supabase.from('notifications').insert([{
                  user_id: st.id,
                  role: 'student',
                  type: 'task_graded',
                  title: 'Assignment Graded',
                  message: `Your submission for "${updatedSub.task?.title || 'Assignment'}" has been graded: ${marks_obtained} / ${updatedSub.task?.total_marks || 100} (${grade || 'Graded'}).`,
                  link: '/student/tasks',
                  created_at: now
                }]);
              }
            }
          } catch (resErr) {
            console.warn('Error recalculating results on grading:', resErr);
          }
        })();

        return res.status(200).json({
          status: 'success',
          message: 'Submission graded successfully!',
          data: updatedSub
        });
      } catch (err) {
        console.error('Error grading submission:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to grade submission.' });
      }
    }

    // Action 3: Delete Task
    if (action === 'delete_task') {
      const { task_id } = req.body;
      if (!task_id) {
        return res.status(400).json({ status: 'error', message: 'task_id is required.' });
      }

      try {
        // Delete submissions first
        await supabase.from('task_submissions').delete().eq('task_id', task_id);
        const { error: dErr } = await supabase.from('tasks').delete().eq('id', task_id);
        if (dErr) throw dErr;

        return res.status(200).json({
          status: 'success',
          message: 'Task and related submissions deleted successfully.'
        });
      } catch (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to delete task.' });
      }
    }

    // Action 4: Automated WhatsApp & In-App Submission Reminders
    if (action === 'send_reminders') {
      const { task_id, student_ids = [] } = req.body;
      if (!task_id) {
        return res.status(400).json({ status: 'error', message: 'task_id is required.' });
      }

      try {
        // Fetch task
        const { data: task, error: tErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .single();
        if (tErr) throw tErr;

        // Fetch submissions
        const { data: subs } = await supabase
          .from('task_submissions')
          .select('cnic')
          .eq('task_id', task_id);

        const submittedCnics = new Set((subs || []).map(s => s.cnic));

        // Fetch enrolled students
        let admQ = supabase
          .from('admissions')
          .select('id, name, cnic, phone, email, course, batch')
          .eq('course', task.course)
          .in('status', ['Active', 'Graduated']);

        if (task.batch && task.batch !== 'All Batches' && task.batch !== 'all') {
          admQ = admQ.eq('batch', task.batch);
        }

        const { data: allStudents } = await admQ;

        // Filter non-submitters
        let pendingStudents = (allStudents || []).filter(st => !submittedCnics.has(st.cnic));

        if (Array.isArray(student_ids) && student_ids.length > 0) {
          pendingStudents = pendingStudents.filter(st => student_ids.includes(st.id));
        }

        const now = new Date().toISOString();
        const dueDateFormatted = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Soon';

        // 1. In-App Notifications
        if (pendingStudents.length > 0) {
          const notifications = pendingStudents.map(st => ({
            user_id: st.id,
            role: 'student',
            type: 'task_reminder',
            title: 'Urgent: Pending Task Reminder',
            message: `Reminder: Your submission for "${task.title}" is pending. Due date: ${dueDateFormatted}. Please submit your work on time.`,
            link: '/student/tasks',
            created_at: now
          }));

          await supabase.from('notifications').insert(notifications);
        }

        // 2. Draft WhatsApp Payloads
        const reminders = pendingStudents.map(st => {
          const msg = `*DEEPSKILLS ACADEMIC NOTICE - PENDING ASSIGNMENT REMINDER*\n\n`
            + `Dear Student / Respected Parents,\n`
            + `This is a reminder regarding the pending academic task for *${st.name}* (CNIC: ${st.cnic}) enrolled in *${task.course}* (${task.batch}).\n\n`
            + `* Task Title: ${task.title}\n`
            + `* Due Date: ${dueDateFormatted}\n`
            + `* Current Status: PENDING / NOT SUBMITTED\n`
            + `* Maximum Marks: ${task.total_marks || 100}\n\n`
            + `Please submit your assignment on the DeepSkills Student Portal before the cutoff to ensure your coursework marks are credited.\n\n`
            + `Direct Portal Link: https://deepskills.com/student/tasks\n`
            + `DeepSkills Academic Directorate`;

          let cleanPhone = String(st.phone || '').replace(/\D/g, '');
          if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.slice(1);
          if (!cleanPhone.startsWith('92') && cleanPhone.length === 10) cleanPhone = '92' + cleanPhone;

          const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : null;

          return {
            student_id: st.id,
            student_name: st.name,
            phone: st.phone,
            whatsappUrl: waUrl,
            message: msg
          };
        });

        return res.status(200).json({
          status: 'success',
          message: `Dispatched reminder notifications to ${pendingStudents.length} pending student(s).`,
          count: pendingStudents.length,
          reminders
        });
      } catch (err) {
        console.error('Error dispatching reminders:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to dispatch reminders.' });
      }
    }

    return res.status(400).json({ status: 'error', message: `Unknown action: ${action}` });
  }
}
