import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';
import { createNotification, notifyAdmins } from '../../../../src/utils/notifications.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  // RBAC Authorization for 'complaints' module
  const auth = await authorizeAdminOperation(req, 'complaints');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // ──────────────────────────────────────────
  // GET: Fetch Tickets, Telemetry, and Metadata
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { search, status, category, batch, priority } = req.query;

      // 1. Fetch metadata (batches, courses, admissions)
      const [batchesRes, coursesRes, admissionsRes] = await Promise.all([
        supabase.from('batches').select('id, batch_name, course, time_shift, status').order('batch_name', { ascending: true }),
        supabase.from('courses').select('id, title').order('title', { ascending: true }),
        supabase.from('admissions').select('id, name, cnic, phone, email, course, batch, status').in('status', ['Active', 'Graduated'])
      ]);

      const batches = batchesRes.data || [];
      const courses = coursesRes.data || [];
      const admissions = admissionsRes.data || [];

      // Build student phone lookup map
      const studentMap = new Map();
      admissions.forEach(a => {
        if (a.cnic) studentMap.set(a.cnic, a);
      });

      // 2. Fetch Complaints with their messages
      const { data: rawComplaints, error: compErr } = await supabase
        .from('complaints')
        .select(`
          *,
          messages:complaint_messages(*)
        `)
        .order('updated_at', { ascending: false });

      if (compErr) throw compErr;

      // 3. Enrich complaints with messages sorted chronologically and student contact details
      let enriched = (rawComplaints || []).map(comp => {
        const msgs = (comp.messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const studentInfo = studentMap.get(comp.student_cnic) || {};

        return {
          ...comp,
          messages: msgs,
          message_count: msgs.length,
          last_message: lastMsg ? {
            text: lastMsg.text,
            sender_name: lastMsg.sender_name,
            sender_role: lastMsg.sender_role,
            created_at: lastMsg.created_at
          } : null,
          student_phone: studentInfo.phone || null,
          student_email: studentInfo.email || null,
          student_status: studentInfo.status || null
        };
      });

      // 4. Calculate Telemetry KPIs over ALL complaints before filtering
      const totalTickets = enriched.length;
      const openCount = enriched.filter(c => c.status === 'Open').length;
      const pendingReplyCount = enriched.filter(c => c.status === 'Pending Reply').length;
      const closedCount = enriched.filter(c => c.status === 'Closed').length;
      const urgentCount = enriched.filter(c => c.priority === 'Urgent').length;
      const resolvedCount = closedCount;
      const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 100;

      // 5. Apply filters
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        enriched = enriched.filter(c =>
          (c.student_name || '').toLowerCase().includes(q) ||
          (c.student_cnic || '').includes(q) ||
          (c.subject || '').toLowerCase().includes(q) ||
          (c.course || '').toLowerCase().includes(q) ||
          (c.batch || '').toLowerCase().includes(q)
        );
      }

      if (status && status !== 'All') {
        enriched = enriched.filter(c => c.status === status);
      }

      if (category && category !== 'All') {
        enriched = enriched.filter(c => (c.category || 'Academic') === category);
      }

      if (batch && batch !== 'All') {
        enriched = enriched.filter(c => c.batch === batch);
      }

      if (priority && priority !== 'All') {
        enriched = enriched.filter(c => (c.priority || 'Normal') === priority);
      }

      return res.status(200).json({
        status: 'success',
        data: {
          complaints: enriched,
          stats: {
            total: totalTickets,
            open: openCount,
            pending_reply: pendingReplyCount,
            closed: closedCount,
            urgent: urgentCount,
            resolved: resolvedCount,
            resolution_rate: resolutionRate
          },
          meta: {
            batches,
            courses,
            categories: ['Academic', 'Technical', 'Administration', 'Facilities', 'Examination', 'Other']
          }
        }
      });
    } catch (err) {
      console.error('Error fetching academic complaints:', err);
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to fetch grievance tickets.'
      });
    }
  }

  // ──────────────────────────────────────────
  // POST: Dispatcher for Ticket Actions
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    const isFullAccess = auth.role === 'admin' || auth.permissions?.complaints === 'full';
    if (!isFullAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions. Modification rights required.'
      });
    }

    const { action } = req.body || {};
    const adminName = auth.user?.full_name || auth.session?.full_name || auth.user?.name || 'Academic Administrator';

    try {
      // ── Action 1: Send Message ──
      if (action === 'send_message') {
        const { complaint_id, text } = req.body;
        if (!complaint_id || !text || !text.trim()) {
          return res.status(400).json({ status: 'error', message: 'complaint_id and text are required.' });
        }

        // Insert message
        const { data: newMsg, error: msgErr } = await supabase
          .from('complaint_messages')
          .insert([{
            complaint_id,
            sender_role: 'admin',
            sender_name: adminName,
            text: text.trim()
          }])
          .select()
          .single();

        if (msgErr) throw msgErr;

        // Update ticket updated_at and set status to 'Pending Reply' (waiting for student)
        await supabase
          .from('complaints')
          .update({
            status: 'Pending Reply',
            updated_at: new Date().toISOString()
          })
          .eq('id', complaint_id);

        // Fetch ticket details for notification
        const { data: comp } = await supabase
          .from('complaints')
          .select('id, student_cnic, subject')
          .eq('id', complaint_id)
          .single();

        if (comp?.student_cnic) {
          try {
            await createNotification({
              recipient_cnic: comp.student_cnic,
              title: 'New Reply on Academic Ticket',
              message: `Administrator replied to: "${comp.subject || 'Support Ticket'}".`,
              type: 'complaint',
              related_id: complaint_id
            });
          } catch (notifErr) {
            console.warn('Failed to send reply notification:', notifErr);
          }
        }

        return res.status(200).json({
          status: 'success',
          message: 'Reply sent successfully.',
          data: newMsg
        });
      }

      // ── Action 2: Resolve Ticket ──
      if (action === 'resolve') {
        const { complaint_id, resolution_note } = req.body;
        if (!complaint_id) {
          return res.status(400).json({ status: 'error', message: 'complaint_id is required.' });
        }

        // Add closing resolution note if provided or default
        const note = resolution_note && resolution_note.trim()
          ? resolution_note.trim()
          : 'Administrative Notice: This grievance has been marked as resolved by administration. Please reopen if you require further assistance.';

        await supabase
          .from('complaint_messages')
          .insert([{
            complaint_id,
            sender_role: 'admin',
            sender_name: adminName,
            text: note
          }]);

        // Update ticket status
        const { data: updatedComp, error: updateErr } = await supabase
          .from('complaints')
          .update({
            status: 'Closed',
            updated_at: new Date().toISOString()
          })
          .eq('id', complaint_id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        if (updatedComp?.student_cnic) {
          try {
            await createNotification({
              recipient_cnic: updatedComp.student_cnic,
              title: 'Academic Ticket Resolved',
              message: `Your ticket "${updatedComp.subject || 'Support Ticket'}" was marked as resolved.`,
              type: 'complaint',
              related_id: complaint_id
            });
          } catch (notifErr) {
            console.warn('Failed to send resolution notification:', notifErr);
          }
        }

        return res.status(200).json({
          status: 'success',
          message: 'Ticket successfully marked as resolved.',
          data: updatedComp
        });
      }

      // ── Action 3: Reopen Ticket ──
      if (action === 'reopen') {
        const { complaint_id } = req.body;
        if (!complaint_id) {
          return res.status(400).json({ status: 'error', message: 'complaint_id is required.' });
        }

        await supabase
          .from('complaint_messages')
          .insert([{
            complaint_id,
            sender_role: 'admin',
            sender_name: adminName,
            text: 'Administrative Notice: This ticket has been reopened for further investigation.'
          }]);

        const { data: updatedComp, error: updateErr } = await supabase
          .from('complaints')
          .update({
            status: 'Open',
            updated_at: new Date().toISOString()
          })
          .eq('id', complaint_id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        return res.status(200).json({
          status: 'success',
          message: 'Ticket reopened successfully.',
          data: updatedComp
        });
      }

      // ── Action 4: Toggle Urgent Priority ──
      if (action === 'toggle_urgent') {
        const { complaint_id, current_priority } = req.body;
        if (!complaint_id) {
          return res.status(400).json({ status: 'error', message: 'complaint_id is required.' });
        }

        const newPriority = current_priority === 'Urgent' ? 'Normal' : 'Urgent';

        const { data: updatedComp, error: updateErr } = await supabase
          .from('complaints')
          .update({
            priority: newPriority,
            updated_at: new Date().toISOString()
          })
          .eq('id', complaint_id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        return res.status(200).json({
          status: 'success',
          message: `Ticket priority updated to ${newPriority}.`,
          data: updatedComp
        });
      }

      // ── Action 5: Create Administrative Ticket (On behalf of student) ──
      if (action === 'create_ticket') {
        const {
          student_name,
          student_cnic,
          course,
          batch,
          subject,
          category,
          priority,
          initial_message
        } = req.body;

        if (!subject || !subject.trim()) {
          return res.status(400).json({ status: 'error', message: 'Subject is required.' });
        }

        const { data: newTicket, error: createErr } = await supabase
          .from('complaints')
          .insert([{
            student_name: student_name || 'Administrative Entry',
            student_cnic: student_cnic || null,
            course: course || 'General',
            batch: batch || 'All Batches',
            subject: subject.trim(),
            category: category || 'Academic',
            status: 'Open',
            priority: priority === 'Urgent' ? 'Urgent' : 'Normal',
            send_to: 'Admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createErr) throw createErr;

        // Add initial message
        const msgText = initial_message && initial_message.trim()
          ? initial_message.trim()
          : `Administrative ticket logged by ${adminName}.`;

        await supabase
          .from('complaint_messages')
          .insert([{
            complaint_id: newTicket.id,
            sender_role: 'admin',
            sender_name: adminName,
            text: msgText
          }]);

        return res.status(201).json({
          status: 'success',
          message: 'Grievance ticket created successfully.',
          data: newTicket
        });
      }

      return res.status(400).json({ status: 'error', message: `Unknown action: ${action}` });
    } catch (err) {
      console.error('Error performing complaint action:', err);
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Operation failed.'
      });
    }
  }
}
