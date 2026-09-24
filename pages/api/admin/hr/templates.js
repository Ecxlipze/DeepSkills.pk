import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';

const cleanArrayField = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : String(item))).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
};

export default async function handler(req, res) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // GET: Fetch all active templates with deduplication guarantee
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('hr_jd_templates')
        .select('*')
        .eq('is_active', true)
        .order('specialization', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      // Safeguard: Deduplicate by specialization & employment_type
      const seen = new Set();
      const uniqueTemplates = (data || []).filter((tpl) => {
        const key = `${(tpl.specialization || '').trim().toLowerCase()}|${(tpl.employment_type || '').trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return res.status(200).json({ status: 'success', data: uniqueTemplates });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // Admin authorization for write operations
  const auth = await authorizeAdminOperation(req, 'hr');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  // POST: Create or update JD template
  if (req.method === 'POST') {
    const {
      id,
      specialization,
      employment_type = 'Full-time',
      title_template,
      department = 'Education',
      reporting_to = 'Academic Director',
      location_mode = 'Onsite',
      working_hours = 'Batch timing(s) shared by administration',
      responsibilities = [],
      requirements = [],
      what_we_offer = [],
      is_active = true
    } = req.body || {};

    if (!specialization || typeof specialization !== 'string' || !specialization.trim()) {
      return res.status(400).json({ status: 'error', message: 'Specialization / Role Track is required.' });
    }

    const payload = {
      specialization: specialization.trim(),
      employment_type: (employment_type && typeof employment_type === 'string' ? employment_type.trim() : 'Full-time'),
      title_template: (title_template && typeof title_template === 'string' && title_template.trim())
        ? title_template.trim()
        : '{{specialization}} Instructor',
      department: (department && typeof department === 'string' && department.trim()) ? department.trim() : 'Education',
      reporting_to: (reporting_to && typeof reporting_to === 'string' && reporting_to.trim()) ? reporting_to.trim() : 'Academic Director',
      location_mode: (location_mode && typeof location_mode === 'string' && location_mode.trim()) ? location_mode.trim() : 'Onsite',
      working_hours: (working_hours && typeof working_hours === 'string' && working_hours.trim()) ? working_hours.trim() : 'Batch timing(s) shared by administration',
      responsibilities: cleanArrayField(responsibilities),
      requirements: cleanArrayField(requirements),
      what_we_offer: cleanArrayField(what_we_offer),
      is_active: Boolean(is_active),
      updated_at: new Date().toISOString()
    };

    try {
      if (id) {
        const { data, error } = await supabase
          .from('hr_jd_templates')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ status: 'success', data, message: 'JD Template updated successfully.' });
      } else {
        const { data, error } = await supabase
          .from('hr_jd_templates')
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ status: 'success', data, message: 'JD Template created successfully.' });
      }
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to save JD template.' });
    }
  }

  // DELETE: Soft delete / archive template
  if (req.method === 'DELETE') {
    const id = req.query.id || req.body?.id;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Template ID is required.' });
    }

    try {
      // Soft-delete to preserve foreign key references on existing candidate JDs
      const { data, error } = await supabase
        .from('hr_jd_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ status: 'success', data, message: 'JD Template archived successfully.' });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to archive template.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ status: 'error', message: `Method ${req.method} not allowed.` });
}
