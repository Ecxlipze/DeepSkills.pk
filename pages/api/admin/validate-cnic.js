import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer.js';
import { findCnicConflict, normalizeCnic } from '../../../lib/cnicServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed.' });
  }

  const auth = await authorizeAdminOperation(req, ['users', 'teachers', 'hr', 'students', 'counsellor']);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Supabase server client unavailable.' });
  }

  const params = req.method === 'GET' ? req.query : req.body;
  const { cnic, targetRole, studentName, excludeId, excludeTable } = params || {};

  const normCnic = normalizeCnic(cnic);
  if (!normCnic) {
    return res.status(400).json({
      status: 'error',
      available: false,
      message: 'Please provide a valid 13-digit Pakistani CNIC.'
    });
  }

  try {
    const result = await findCnicConflict(supabase, normCnic, {
      targetRole,
      studentName,
      excludeId,
      excludeTable
    });

    if (result.conflict) {
      return res.status(200).json({
        status: 'conflict',
        available: false,
        conflict: true,
        code: result.code,
        role: result.role,
        type: result.type,
        name: result.name,
        email: result.email,
        message: result.message
      });
    }

    return res.status(200).json({
      status: 'success',
      available: true,
      conflict: false,
      normalizedCnic: result.normalizedCnic,
      message: 'CNIC is unique and available across all roles.'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'CNIC validation failed.'
    });
  }
}
