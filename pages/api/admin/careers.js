import { getSupabaseServerClient } from '../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../lib/portalAuthServer.js';
import { slugify, sanitizeText, MOCK_JOB_POSTINGS } from '../../../lib/careers.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};

async function triggerRevalidation(res, paths = []) {
  const secret = process.env.REVALIDATE_SECRET || process.env.NEXT_PUBLIC_REVALIDATE_SECRET;
  if (!secret || !res.revalidate) return;
  for (const p of paths) {
    try {
      await res.revalidate(p);
    } catch (e) {
      console.warn(`[revalidate] Failed for ${p}:`, e.message);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  // Authorize admin
  const auth = await authorizeAdminOperation(req, ['settings', 'hr', 'management']);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const { action, payload } = req.body || {};
  const supabase = getSupabaseServerClient();

  try {
    switch (action) {
      case 'list_jobs': {
        const { data: jobs, error: jobsErr } = await supabase
          .from('job_postings')
          .select(`
            *,
            job_applications (count)
          `)
          .order('created_at', { ascending: false });

        if (jobsErr || !jobs || jobs.length === 0) {
          return res.status(200).json({
            status: 'success',
            data: MOCK_JOB_POSTINGS.map((j) => ({ ...j, application_count: 0 }))
          });
        }

        const formatted = (jobs || []).map((j) => ({
          ...j,
          application_count: j.job_applications?.[0]?.count || 0
        }));

        return res.status(200).json({ status: 'success', data: formatted });
      }

      case 'save_job': {
        const job = payload || {};
        if (!job.title?.trim()) {
          return res.status(400).json({ status: 'error', message: 'Job title is required.' });
        }

        const rawSlug = job.slug?.trim() || slugify(job.title);
        const finalSlug = slugify(rawSlug);

        const jobRecord = {
          title: sanitizeText(job.title, 150),
          slug: finalSlug,
          department: sanitizeText(job.department, 80) || 'General',
          job_type: job.job_type || 'Full-time',
          workplace_type: job.workplace_type || 'On-site',
          location: sanitizeText(job.location, 100) || 'Lahore, Pakistan',
          experience_level: job.experience_level || 'Mid Level',
          salary_range: sanitizeText(job.salary_range, 80) || null,
          description: job.description || '',
          responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.filter(Boolean) : [],
          requirements: Array.isArray(job.requirements) ? job.requirements.filter(Boolean) : [],
          benefits: Array.isArray(job.benefits) ? job.benefits.filter(Boolean) : [],
          status: ['draft', 'published', 'closed'].includes(job.status) ? job.status : 'draft',
          is_featured: Boolean(job.is_featured),
          deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
          updated_at: new Date().toISOString()
        };

        let savedJob = null;

        if (job.id) {
          const { data, error } = await supabase
            .from('job_postings')
            .update(jobRecord)
            .eq('id', job.id)
            .select()
            .single();

          if (error) throw error;
          savedJob = data;
        } else {
          jobRecord.created_at = new Date().toISOString();
          const { data, error } = await supabase
            .from('job_postings')
            .insert([jobRecord])
            .select()
            .single();

          if (error) throw error;
          savedJob = data;
        }

        // Trigger on-demand ISR revalidation
        await triggerRevalidation(res, ['/careers', `/careers/${finalSlug}`]);

        return res.status(200).json({ status: 'success', data: savedJob });
      }

      case 'delete_job': {
        const { id, slug } = payload || {};
        if (!id) {
          return res.status(400).json({ status: 'error', message: 'Job ID is required.' });
        }

        const { error } = await supabase
          .from('job_postings')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await triggerRevalidation(res, ['/careers', slug ? `/careers/${slug}` : null].filter(Boolean));

        return res.status(200).json({ status: 'success', message: 'Job posting deleted.' });
      }

      case 'list_applications': {
        const { job_id, status } = payload || {};
        let query = supabase
          .from('job_applications')
          .select(`
            *,
            job:job_postings (id, title, department, slug)
          `)
          .order('created_at', { ascending: false });

        if (job_id && job_id !== 'all') {
          query = query.eq('job_id', job_id);
        }
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data: apps, error: appsErr } = await query;
        if (appsErr) throw appsErr;

        return res.status(200).json({ status: 'success', data: apps || [] });
      }

      case 'update_application': {
        const { id, status: newStatus, admin_notes } = payload || {};
        if (!id) {
          return res.status(400).json({ status: 'error', message: 'Application ID is required.' });
        }

        const updates = {
          updated_at: new Date().toISOString()
        };
        if (newStatus) updates.status = newStatus;
        if (admin_notes !== undefined) updates.admin_notes = admin_notes;

        const { data, error } = await supabase
          .from('job_applications')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            job:job_postings (id, title, department)
          `)
          .single();

        if (error) throw error;

        return res.status(200).json({ status: 'success', data });
      }

      case 'delete_application': {
        const { id } = payload || {};
        if (!id) {
          return res.status(400).json({ status: 'error', message: 'Application ID is required.' });
        }

        const { error } = await supabase
          .from('job_applications')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ status: 'success', message: 'Application removed.' });
      }

      default:
        return res.status(400).json({ status: 'error', message: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[admin/careers] Error performing ${action}:`, err);
    return res.status(500).json({ status: 'error', message: err.message || 'Server error occurred.' });
  }
}
