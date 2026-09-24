import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import {
  resolveActor,
  getTodayDateString,
  getTodayShift,
  clockInShift,
  startShiftBreak,
  endShiftBreak,
  clockOutShift
} from '../../../lib/timeTrackingServer.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = req.__supabase || getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // Authenticate actor (staff user or teacher)
  const auth = await resolveActor(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const { actorType, actorId } = auth;

  // ──────────────────────────────────────────
  // GET: Fetch today's shift status
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const date = req.query.date || getTodayDateString();
      const shift = await getTodayShift(supabase, actorType, actorId, date);
      return res.status(200).json({
        status: 'success',
        shift,
        actor: {
          id: actorId,
          type: actorType,
          name: auth.name,
          role: auth.role
        }
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // ──────────────────────────────────────────
  // POST: Execute shift actions (clock-in, break, clock-out)
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { action, notes } = req.body || {};

      if (!action) {
        return res.status(400).json({ status: 'error', message: 'Action is required.' });
      }

      let updatedShift;
      switch (action) {
        case 'clock-in':
          updatedShift = await clockInShift(supabase, actorType, actorId, notes);
          break;
        case 'break-start':
          updatedShift = await startShiftBreak(supabase, actorType, actorId);
          break;
        case 'break-end':
          updatedShift = await endShiftBreak(supabase, actorType, actorId);
          break;
        case 'clock-out':
          updatedShift = await clockOutShift(supabase, actorType, actorId);
          break;
        default:
          return res.status(400).json({ status: 'error', message: `Unknown shift action: ${action}` });
      }

      return res.status(200).json({
        status: 'success',
        shift: updatedShift,
        message: `Shift action '${action}' completed successfully.`
      });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
