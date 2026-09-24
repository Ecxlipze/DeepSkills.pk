import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { resolveActor } from '../../../lib/timeTrackingServer.js';

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
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

  // ──────────────────────────────────────────
  // GET: List all active projects
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const includeInactive = req.query.all === 'true' && (auth.isAdmin || auth.isHR);
      let query = supabase
        .from('staff_time_projects')
        .select('*')
        .order('department', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: projects, error } = await query;
      if (error) throw error;

      return res.status(200).json({ status: 'success', projects: projects || [] });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // Administrative check for mutations
  if (!auth.isAdmin && !auth.isHR) {
    return res.status(403).json({ status: 'error', message: 'Only Administrators or HR managers can manage projects.' });
  }

  // ──────────────────────────────────────────
  // POST: Add new project category
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { name, department, color } = req.body || {};
      if (!name || !department) {
        return res.status(400).json({ status: 'error', message: 'Name and department are required.' });
      }

      const { data: created, error } = await supabase
        .from('staff_time_projects')
        .insert([{
          name: name.trim(),
          department: department.trim(),
          color: color || '#378ADD',
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ status: 'success', project: created, message: 'Project created.' });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }

  // ──────────────────────────────────────────
  // PATCH: Update project
  // ──────────────────────────────────────────
  if (req.method === 'PATCH') {
    try {
      const { id, name, department, color, is_active } = req.body || {};
      if (!id) return res.status(400).json({ status: 'error', message: 'Project ID is required.' });

      const updates = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name.trim();
      if (department !== undefined) updates.department = department.trim();
      if (color !== undefined) updates.color = color;
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      const { data: updated, error } = await supabase
        .from('staff_time_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ status: 'success', project: updated, message: 'Project updated.' });
    } catch (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
