import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { getAssignedTeacherBatches, getTeacherByCnic } from '../utils/teacherUtils';

const GroupChatContext = createContext();

export const GroupChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeBatch, setActiveBatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [mutes, setMutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherBatches, setTeacherBatches] = useState([]);
  const [adminBatches, setAdminBatches] = useState([]);

  useEffect(() => {
    const fetchTeacherBatches = async () => {
      if (user?.role !== 'teacher' || !user?.cnic) {
        setTeacherBatches([]);
        return;
      }

      setLoading(true);
      try {
        const teacher = await getTeacherByCnic(user.cnic);
        const assignedBatches = await getAssignedTeacherBatches(teacher.id);
        setTeacherBatches(assignedBatches.filter((batch) => batch.status === 'Active'));
      } catch (err) {
        console.error('Error fetching teacher chat batches:', err);
        setTeacherBatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherBatches();
  }, [user?.role, user?.cnic]);

  useEffect(() => {
    const fetchAdminBatches = async () => {
      if (user?.role !== 'admin') {
        setAdminBatches([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('batches')
          .select('id, batch_name, course')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setAdminBatches(data);
        }
      } catch (err) {
        console.error('Error fetching admin chat batches:', err);
      }
    };

    fetchAdminBatches();
  }, [user?.role]);

  // Parse batches and courses (handle comma separated strings)
  const availableBatches = useMemo(() => {
    if (user?.role === 'admin') {
      return adminBatches.map((batch) => ({
        batch: batch.batch_name,
        course: batch.course || 'General Course'
      }));
    }

    if (user?.role === 'teacher') {
      return teacherBatches.map((batch) => ({
        batch: batch.batch_name,
        course: batch.course || 'General Course'
      }));
    }

    if (!user?.batch) return [];
    const batchList = user.batch.split(',').map(b => b.trim()).filter(Boolean);
    const courseList = user.assigned_course ? user.assigned_course.split(',').map(c => c.trim()) : [];
    
    return batchList.map((batch, index) => ({
      batch,
      course: courseList[index] || user.assigned_course || "General Course"
    }));
  }, [adminBatches, teacherBatches, user?.role, user?.batch, user?.assigned_course]);

  useEffect(() => {
    if (availableBatches.length === 0) {
      setActiveBatch(null);
      return;
    }

    const canAccessActiveBatch = availableBatches.some((item) => item.batch === activeBatch);
    if (!activeBatch || !canAccessActiveBatch) {
      setActiveBatch(availableBatches[0].batch);
    }
  }, [availableBatches, activeBatch]);

  const batchMatches = useCallback((memberBatchValue) => {
    if (!activeBatch || !memberBatchValue) return false;
    return memberBatchValue
      .split(',')
      .map((batch) => batch.trim())
      .includes(activeBatch);
  }, [activeBatch]);

  const fetchMembers = useCallback(async () => {
    if (!activeBatch) return;
    try {
      const { data, error } = await supabase
        .from('allowed_cnics')
        .select('cnic, name, role, batch');

      if (error) throw error;
      setMembers((data || []).filter((member) => batchMatches(member.batch)));
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, [activeBatch, batchMatches]);

  const fetchMutes = useCallback(async () => {
    if (!activeBatch) return;
    try {
      const { data, error } = await supabase
        .from('group_chat_mutes')
        .select('*')
        .eq('batch', activeBatch);

      if (error) throw error;
      setMutes(data || []);
    } catch (err) {
      console.error('Error fetching mutes:', err);
    }
  }, [activeBatch]);

  const fetchMessages = useCallback(async () => {
    if (!activeBatch) return;
    try {
      const { data, error } = await supabase
        .from('group_chat_messages')
        .select('*')
        .eq('batch', activeBatch)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [activeBatch]);

  useEffect(() => {
    if (!activeBatch) {
      setMessages([]);
      setMembers([]);
      setMutes([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    Promise.all([fetchMembers(), fetchMessages(), fetchMutes()]).then(() => {
      setLoading(false);
    });

    // Real-time Subscriptions
    const channel = supabase
      .channel(`group-chat-${activeBatch}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_chat_messages', filter: `batch=eq.${activeBatch}` }, () => {
        fetchMessages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_chat_mutes', filter: `batch=eq.${activeBatch}` }, () => {
        fetchMutes();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allowed_cnics' }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBatch, fetchMembers, fetchMessages, fetchMutes]);

  const sendMessage = async (messageData) => {
    if (!user || !activeBatch || (!['teacher', 'admin'].includes(user.role) && isMuted)) return;
    try {
      const { error } = await supabase
        .from('group_chat_messages')
        .insert([{
          ...messageData,
          batch: activeBatch,
          sender_cnic: user.cnic || 'ADMIN',
          sender_name: user.name || user.full_name || 'Administrator',
          sender_role: user.role || 'admin',
          reactions: []
        }]);
      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const sendReaction = async (messageId, emoji) => {
    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      let newReactions = [...(msg.reactions || [])];
      const existingIdx = newReactions.findIndex(r => r.emoji === emoji);

      if (existingIdx > -1) {
        // Simple logic for counts (not per-user for simplicity as per requirements)
        // In a real app, you'd track which user reacted with which emoji
        newReactions[existingIdx].count += 1;
      } else {
        newReactions.push({ emoji, count: 1 });
      }

      const { error } = await supabase
        .from('group_chat_messages')
        .update({ reactions: newReactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending reaction:', err);
    }
  };

  const uploadChatFile = async (file) => {
    if (!file || !activeBatch) return null;

    const safeBatch = activeBatch.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `group-chat/${safeBatch}/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage
      .from('task_files')
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('task_files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const muteStudent = async (studentCnic, studentName) => {
    if (user.role !== 'teacher' || !activeBatch) return;
    try {
      const alreadyMuted = mutes.some((mute) => mute.user_cnic === studentCnic);
      if (alreadyMuted) return;

      const { error: muteError } = await supabase
        .from('group_chat_mutes')
        .insert([{
          batch: activeBatch,
          user_cnic: studentCnic,
          muted_by: user.name
        }]);

      if (muteError) throw muteError;

      // 2. Send system message
      await sendMessage({
        type: 'system',
        text: `⚠️ ${studentName} has been muted by the teacher.`
      });

      // 3. Send warning bubble (visible to student via type='warning' and matching cnic logic in UI)
      await sendMessage({
        type: 'warning',
        text: `You have been muted by Sir ${user.name}. You cannot send messages until unmuted.`,
        sender_cnic: 'SYSTEM', // Special marker
        target_cnic: studentCnic // Extra field for targeted warning
      });

    } catch (err) {
      console.error('Error muting student:', err);
    }
  };

  const unmuteStudent = async (studentCnic, studentName) => {
    if (user.role !== 'teacher' || !activeBatch) return;
    try {
      const { error: muteError } = await supabase
        .from('group_chat_mutes')
        .delete()
        .eq('batch', activeBatch)
        .eq('user_cnic', studentCnic);

      if (muteError) throw muteError;

      // Send system message
      await sendMessage({
        type: 'system',
        text: `✅ ${studentName} has been unmuted.`
      });
    } catch (err) {
      console.error('Error unmuting student:', err);
    }
  };

  const isMuted = mutes.some(m => m.user_cnic === user?.cnic);

  return (
    <GroupChatContext.Provider value={{
      activeBatch,
      setActiveBatch,
      availableBatches,
      messages,
      members,
      mutes,
      loading,
      isMuted,
      sendMessage,
      sendReaction,
      uploadChatFile,
      muteStudent,
      unmuteStudent,
      fetchMessages
    }}>
      {children}
    </GroupChatContext.Provider>
  );
};

export const useGroupChat = () => useContext(GroupChatContext);
