import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { resolveActor } from '../../../lib/timeTrackingServer.js';
import {
  getTaskTimeDetails,
  updateStaffTask,
  deleteStaffTask,
  addTaskSubtask,
  toggleTaskSubtask,
  deleteTaskSubtask,
  addTaskAttachment,
  deleteTaskAttachment
} from '../../../lib/staffTasksServer.js';

export default async function handler(req, res) {
  if (!['GET', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const auth = await resolveActor(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ status: 'error', message: 'Task ID is required.' });
  }

  if (req.method === 'GET') {
    try {
      const details = await getTaskTimeDetails(supabase, id);
      return res.status(200).json({ status: 'success', ...details });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = req.body || {};
      let task;

      if (body.action === 'add_subtask') {
        task = await addTaskSubtask(supabase, auth, id, body.title);
      } else if (body.action === 'toggle_subtask') {
        task = await toggleTaskSubtask(supabase, auth, id, body.subtaskId);
      } else if (body.action === 'delete_subtask') {
        task = await deleteTaskSubtask(supabase, auth, id, body.subtaskId);
      } else if (body.action === 'add_attachment') {
        task = await addTaskAttachment(supabase, auth, id, body.attachment);
      } else if (body.action === 'delete_attachment') {
        task = await deleteTaskAttachment(supabase, auth, id, body.attachmentId);
      } else {
        task = await updateStaffTask(supabase, auth, id, body);
      }

      return res.status(200).json({ status: 'success', task, message: 'Task updated successfully.' });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await deleteStaffTask(supabase, auth, id);
      return res.status(200).json({ status: 'success', ...result });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
