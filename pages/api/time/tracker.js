import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import {
  resolveActor,
  getTodayDateString,
  getActiveTimer,
  startTaskTimer,
  stopActiveTimer,
  createManualTimeEntry,
  getTimeEntries
} from '../../../lib/timeTrackingServer.js';

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // Authenticate actor
  const auth = await resolveActor(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const { actorType, actorId, isAdmin, isHR } = auth;

  // ──────────────────────────────────────────
  // GET: Active timer & logged time entries
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { date, startDate, endDate } = req.query;
      const today = getTodayDateString();

      // Fetch currently running timer (if any)
      const activeTimer = await getActiveTimer(supabase, actorType, actorId);

      // Fetch entries
      const entries = await getTimeEntries(supabase, actorType, actorId, {
        date: date || (startDate || endDate ? undefined : today),
        startDate,
        endDate
      });

      // Calculate totals
      const totalSeconds = entries.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);

      return res.status(200).json({
        status: 'success',
        activeTimer,
        entries,
        totalSeconds,
        today
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // ──────────────────────────────────────────
  // POST: Start timer, stop timer, or manual entry
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { action, projectId, taskId, description, billable, date, startTime, endTime, durationSeconds, entryId } = req.body || {};

      if (!action) {
        return res.status(400).json({ status: 'error', message: 'Action is required.' });
      }

      if (action === 'start') {
        const entry = await startTaskTimer(supabase, actorType, actorId, {
          projectId,
          taskId,
          description,
          billable
        });
        return res.status(201).json({ status: 'success', entry, message: 'Timer started.' });
      }

      if (action === 'stop') {
        const stopped = await stopActiveTimer(supabase, actorType, actorId, entryId);
        if (!stopped) {
          return res.status(404).json({ status: 'error', message: 'No running timer found.' });
        }
        return res.status(200).json({ status: 'success', entry: stopped, message: 'Timer stopped.' });
      }

      if (action === 'manual') {
        if (!description && !projectId && !taskId) {
          return res.status(400).json({ status: 'error', message: 'Please provide a project, task, or description.' });
        }
        const entry = await createManualTimeEntry(supabase, actorType, actorId, {
          projectId,
          taskId,
          description,
          date,
          startTime,
          endTime,
          durationSeconds,
          billable
        });
        return res.status(201).json({ status: 'success', entry, message: 'Time logged successfully.' });
      }

      return res.status(400).json({ status: 'error', message: `Unknown tracker action: ${action}` });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }

  // ──────────────────────────────────────────
  // PATCH: Update an existing entry
  // ──────────────────────────────────────────
  if (req.method === 'PATCH') {
    try {
      const { id, description, projectId, durationSeconds, billable, date } = req.body || {};
      if (!id) return res.status(400).json({ status: 'error', message: 'Entry ID required.' });

      // Ensure ownership unless admin
      let query = supabase.from('staff_time_entries').select('*').eq('id', id);
      if (!isAdmin && !isHR) {
        query = query.eq('actor_type', actorType).eq('actor_id', actorId);
      }
      const { data: existing, error: eErr } = await query;
      if (eErr || !existing?.[0]) {
        return res.status(404).json({ status: 'error', message: 'Entry not found or access denied.' });
      }

      const updates = {
        updated_at: new Date().toISOString()
      };
      if (description !== undefined) updates.description = (description || '').trim();
      if (projectId !== undefined) updates.project_id = projectId || null;
      if (durationSeconds !== undefined) updates.duration_seconds = Math.max(0, Math.floor(Number(durationSeconds) || 0));
      if (billable !== undefined) updates.billable = Boolean(billable);
      if (date) updates.date = date;

      const { data: updated, error: uErr } = await supabase
        .from('staff_time_entries')
        .update(updates)
        .eq('id', id)
        .select('*, staff_time_projects(id, name, department, color)')
        .single();

      if (uErr) throw uErr;
      return res.status(200).json({ status: 'success', entry: updated, message: 'Entry updated.' });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }

  // ──────────────────────────────────────────
  // DELETE: Delete an entry
  // ──────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ status: 'error', message: 'Entry ID required.' });

      let query = supabase.from('staff_time_entries').delete().eq('id', id);
      if (!isAdmin && !isHR) {
        query = query.eq('actor_type', actorType).eq('actor_id', actorId);
      }

      const { error } = await query;
      if (error) throw error;

      return res.status(200).json({ status: 'success', message: 'Entry deleted successfully.' });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
