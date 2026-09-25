import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { normalizeCnic, validatePortalSession } from '../../../lib/portalAuthServer';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  const authHeader = req.headers.authorization || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const data = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  if (!token && data.token) {
    token = String(data.token).trim();
  }

  const requestedCnic = data.cnic ? normalizeCnic(data.cnic) : null;

  try {
    const sessionRes = await validatePortalSession(supabase, token, ['teacher', 'admin'], requestedCnic);
    if (!sessionRes.ok) {
      return res.status(sessionRes.status).json({
        status: 'error',
        code: sessionRes.code,
        message: sessionRes.message
      });
    }

    const role = sessionRes.session.role;
    const cnic = sessionRes.session.cnic;

    let teacher = null;
    if (role === 'teacher') {
      const { data: teacherRows } = await supabase
        .from('teachers')
        .select('id, name, status')
        .eq('cnic', cnic)
        .limit(1);
      teacher = teacherRows?.[0];
      if (!teacher || teacher.status !== 'Active') {
        return res.status(403).json({ status: 'error', message: 'Active teacher profile not found.' });
      }
    }

    // 1. GET: Fetch batch syllabus progress
    if (req.method === 'GET') {
      const batchId = req.query.batch_id || data.batch_id;
      if (!batchId) {
        return res.status(400).json({ status: 'error', message: 'batch_id parameter is required.' });
      }

      const { data: batch, error: bErr } = await supabase
        .from('batches')
        .select('id, batch_name, course, time_shift, timing_label, status, notes, start_date')
        .eq('id', batchId)
        .maybeSingle();

      if (bErr || !batch) {
        return res.status(404).json({ status: 'error', message: 'Batch not found.' });
      }

      let syllabusProgress = {
        completed_lectures: [],
        lecture_logs: {},
        current_lecture: null
      };

      if (batch.notes) {
        try {
          const parsed = JSON.parse(batch.notes);
          if (parsed.syllabus_progress) {
            syllabusProgress = parsed.syllabus_progress;
          }
        } catch {
          // Plain text notes, leave defaults
        }
      }

      return res.status(200).json({
        status: 'success',
        batch,
        syllabus_progress: syllabusProgress
      });
    }

    // 2. POST: Save / update syllabus progress
    if (req.method === 'POST') {
      const { batch_id, completed_lectures = [], lecture_logs = {}, current_lecture = null } = req.body;
      if (!batch_id) {
        return res.status(400).json({ status: 'error', message: 'batch_id is required in request body.' });
      }

      // Fetch existing batch
      const { data: batch, error: bErr } = await supabase
        .from('batches')
        .select('id, batch_name, course, notes')
        .eq('id', batch_id)
        .maybeSingle();

      if (bErr || !batch) {
        return res.status(404).json({ status: 'error', message: 'Batch record not found.' });
      }

      let parsedNotes = {};
      if (batch.notes) {
        try {
          parsedNotes = JSON.parse(batch.notes);
        } catch {
          parsedNotes = { text_notes: batch.notes };
        }
      }

      const updatedSyllabusProgress = {
        completed_lectures: Array.isArray(completed_lectures) ? completed_lectures : [],
        lecture_logs: lecture_logs && typeof lecture_logs === 'object' ? lecture_logs : {},
        current_lecture: current_lecture || null,
        updated_at: new Date().toISOString(),
        updated_by: teacher?.name || 'Academic Faculty'
      };

      parsedNotes.syllabus_progress = updatedSyllabusProgress;

      const { error: upErr } = await supabase
        .from('batches')
        .update({ notes: JSON.stringify(parsedNotes) })
        .eq('id', batch_id);

      if (upErr) {
        console.error('[teacher/syllabus] Error updating batch notes:', upErr);
        return res.status(500).json({ status: 'error', message: 'Failed to save syllabus progress to batch.' });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Syllabus progress saved successfully.',
        syllabus_progress: updatedSyllabusProgress
      });
    }
  } catch (err) {
    console.error('[teacher/syllabus] Unhandled error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
}
