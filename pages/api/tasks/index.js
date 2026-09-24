import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { resolveActor } from '../../../lib/timeTrackingServer.js';
import { listStaffTasks, createStaffTask, listAssignableStaff, checkAndNotifyOverdueTasks } from '../../../lib/staffTasksServer.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // Authenticate actor (Staff user or Teacher)
  const auth = await resolveActor(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  if (req.method === 'GET') {
    try {
      const { status, priority, assigneeId, department, projectId, search } = req.query;
      
      // Proactively check overdue tasks in the background without blocking render
      checkAndNotifyOverdueTasks(supabase).catch(err => {
        console.warn('[tasks] overdue check warning:', err.message);
      });

      const [tasks, assignees] = await Promise.all([
        listStaffTasks(supabase, auth, {
          status,
          priority,
          assigneeId,
          department,
          projectId,
          search
        }),
        listAssignableStaff(supabase)
      ]);
      return res.status(200).json({ status: 'success', tasks, assignees });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      if (body.action === 'check_overdue') {
        const result = await checkAndNotifyOverdueTasks(supabase);
        return res.status(200).json({ status: 'success', ...result });
      }

      const task = await createStaffTask(supabase, auth, body);
      return res.status(201).json({ status: 'success', task, message: 'Task created successfully.' });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
