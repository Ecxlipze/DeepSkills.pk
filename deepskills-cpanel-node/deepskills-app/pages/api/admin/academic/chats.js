import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  // RBAC Authorization for chats (allowed for admin or custom staff with tasks permission)
  const auth = await authorizeAdminOperation(req, 'tasks');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // ──────────────────────────────────────────
  // GET: Fetch Batches, Active Channel Stats, and Members
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { batch } = req.query;

      // 1. Fetch all batches for channel switching
      const { data: batches, error: batchErr } = await supabase
        .from('batches')
        .select('id, batch_name, course, time_shift, status')
        .order('batch_name', { ascending: true });

      if (batchErr) throw batchErr;

      const activeBatchName = batch || (batches && batches.length > 0 ? batches[0].batch_name : null);

      // 2. If a batch is specified/available, fetch its members, mutes, and stats
      let members = [];
      let mutes = [];
      let totalMessages = 0;

      if (activeBatchName) {
        const [admissionsRes, mutesRes, messagesCountRes] = await Promise.all([
          supabase.from('admissions').select('cnic, name, batch, phone, email').eq('batch', activeBatchName).in('status', ['Active', 'Graduated']),
          supabase.from('group_chat_mutes').select('*').eq('batch', activeBatchName),
          supabase.from('group_chat_messages').select('id', { count: 'exact', head: true }).eq('batch', activeBatchName)
        ]);

        mutes = mutesRes.data || [];
        totalMessages = messagesCountRes.count || 0;

        // Fetch instructors assigned to this batch
        const { data: batchData } = await supabase
          .from('batches')
          .select('id')
          .eq('batch_name', activeBatchName)
          .maybeSingle();

        let instructors = [];
        if (batchData?.id) {
          const { data: teacherBatches } = await supabase
            .from('teacher_batches')
            .select('teachers(cnic, name, phone, email, status)')
            .eq('batch_id', batchData.id);

          if (teacherBatches) {
            instructors = teacherBatches
              .map(tb => tb.teachers)
              .filter(t => t && t.status === 'Active')
              .map(t => ({
                cnic: t.cnic,
                name: t.name,
                role: 'teacher',
                batch: activeBatchName,
                phone: t.phone,
                email: t.email
              }));
          }
        }

        const studentMembers = (admissionsRes.data || []).map(s => ({
          cnic: s.cnic,
          name: s.name,
          role: 'student',
          batch: s.batch,
          phone: s.phone,
          email: s.email
        }));

        members = [...instructors, ...studentMembers];
      }

      return res.status(200).json({
        status: 'success',
        data: {
          batches: batches || [],
          activeBatch: activeBatchName,
          stats: {
            totalBatches: (batches || []).length,
            channelMembers: members.length,
            channelMutes: mutes.length,
            channelMessages: totalMessages
          },
          members,
          mutes
        }
      });
    } catch (err) {
      console.error('Error in chats API GET:', err);
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to fetch group chat metadata.'
      });
    }
  }

  // ──────────────────────────────────────────
  // POST: Moderation Dispatcher
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    const isFullAccess = auth.role === 'admin' || auth.permissions?.tasks === 'full';
    if (!isFullAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions. Moderation rights required.'
      });
    }

    const { action, batch, student_cnic, student_name } = req.body || {};
    const moderatorName = auth.user?.full_name || auth.session?.full_name || auth.user?.name || 'Administrator';

    if (!batch) {
      return res.status(400).json({ status: 'error', message: 'Batch is required.' });
    }

    try {
      // ── Action 1: Mute Student ──
      if (action === 'mute_student') {
        if (!student_cnic) {
          return res.status(400).json({ status: 'error', message: 'student_cnic is required.' });
        }

        // Insert mute row
        const { error: muteError } = await supabase
          .from('group_chat_mutes')
          .insert([{
            batch,
            user_cnic: student_cnic,
            muted_by: moderatorName
          }]);

        if (muteError) throw muteError;

        // Broadcast system notice to channel
        await supabase
          .from('group_chat_messages')
          .insert([{
            batch,
            sender_cnic: 'SYSTEM',
            sender_name: 'Moderation System',
            sender_role: 'system',
            type: 'system',
            text: `${student_name || 'Student'} has been muted by administration.`
          }]);

        // Send warning bubble targeted to student
        await supabase
          .from('group_chat_messages')
          .insert([{
            batch,
            sender_cnic: 'SYSTEM',
            sender_name: 'Moderation System',
            sender_role: 'system',
            type: 'warning',
            text: `You have been muted by Administration (${moderatorName}). You cannot send messages until unmuted.`,
            target_cnic: student_cnic
          }]);

        return res.status(200).json({
          status: 'success',
          message: `${student_name || 'Student'} successfully muted.`
        });
      }

      // ── Action 2: Unmute Student ──
      if (action === 'unmute_student') {
        if (!student_cnic) {
          return res.status(400).json({ status: 'error', message: 'student_cnic is required.' });
        }

        const { error: unmuteError } = await supabase
          .from('group_chat_mutes')
          .delete()
          .eq('batch', batch)
          .eq('user_cnic', student_cnic);

        if (unmuteError) throw unmuteError;

        // Broadcast system notice to channel
        await supabase
          .from('group_chat_messages')
          .insert([{
            batch,
            sender_cnic: 'SYSTEM',
            sender_name: 'Moderation System',
            sender_role: 'system',
            type: 'system',
            text: `${student_name || 'Student'} has been unmuted by administration.`
          }]);

        return res.status(200).json({
          status: 'success',
          message: `${student_name || 'Student'} successfully unmuted.`
        });
      }

      // ── Action 3: Broadcast System Announcement into Chat ──
      if (action === 'broadcast_system_message') {
        const { text } = req.body;
        if (!text || !text.trim()) {
          return res.status(400).json({ status: 'error', message: 'Text is required.' });
        }

        const { data: newMsg, error: msgError } = await supabase
          .from('group_chat_messages')
          .insert([{
            batch,
            sender_cnic: 'ADMIN',
            sender_name: moderatorName,
            sender_role: 'admin',
            type: 'text',
            text: text.trim()
          }])
          .select()
          .single();

        if (msgError) throw msgError;

        return res.status(200).json({
          status: 'success',
          message: 'System dispatch broadcasted to batch channel.',
          data: newMsg
        });
      }

      // ── Action 4: Delete Message ──
      if (action === 'delete_message') {
        const { message_id } = req.body;
        if (!message_id) {
          return res.status(400).json({ status: 'error', message: 'message_id is required.' });
        }

        const { error: delError } = await supabase
          .from('group_chat_messages')
          .delete()
          .eq('id', message_id);

        if (delError) throw delError;

        return res.status(200).json({
          status: 'success',
          message: 'Message removed by administrator.'
        });
      }

      return res.status(400).json({ status: 'error', message: `Unknown action: ${action}` });
    } catch (err) {
      console.error('Error in chats API POST:', err);
      return res.status(500).json({
        status: 'error',
        message: err.message || 'Operation failed.'
      });
    }
  }
}
