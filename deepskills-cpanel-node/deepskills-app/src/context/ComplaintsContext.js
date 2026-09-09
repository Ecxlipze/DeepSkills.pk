import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { getAssignedTeacherBatches, getTeacherByCnic } from '../utils/teacherUtils';
import { createBatchNotifications, createNotification, getTeachersForBatch, notifyAdmins } from '../utils/notifications';

const ComplaintsContext = createContext();

export const ComplaintsProvider = ({ children }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('complaints').select(`
        *,
        messages:complaint_messages(*)
      `).order('updated_at', { ascending: false });

      if (user.role === 'student') {
        query = query.eq('student_cnic', user.cnic);
      } else if (user.role === 'teacher') {
        const teacher = await getTeacherByCnic(user.cnic);
        const assignedBatches = await getAssignedTeacherBatches(teacher.id);
        const teacherBatchNames = assignedBatches
          .filter(batch => batch.status === 'Active')
          .map(batch => batch.batch_name)
          .filter(Boolean);

        if (teacherBatchNames.length === 0) {
          setComplaints([]);
          setLoading(false);
          return;
        }

        query = query
          .eq('send_to', 'My Batch Teacher')
          .in('batch', teacherBatchNames);
      } else if (user.role === 'admin') {
        query = query.eq('send_to', 'Admin');
      }

      const { data, error } = await query;
      if (error) throw error;

      const processedData = data.map(complaint => ({
        ...complaint,
        messages: (complaint.messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      }));

      setComplaints(processedData);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchComplaints();

      const channelName = `complaints-channel-${user.id || user.cnic || user.role || 'user'}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'complaints' 
        }, () => {
          fetchComplaints();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'complaint_messages' 
        }, () => {
          fetchComplaints();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchComplaints]);

  const createComplaint = async (complaintData, initialMessage) => {
    try {
      const { data: newComplaint, error: compError } = await supabase
        .from('complaints')
        .insert([{
          ...complaintData,
          student_name: user.name,
          student_cnic: user.cnic,
          batch: user.batch,
          course: user.assigned_course || user.course || 'General'
        }])
        .select()
        .single();

      if (compError) throw compError;

      const { error: msgError } = await supabase
        .from('complaint_messages')
        .insert([{
          complaint_id: newComplaint.id,
          sender_role: 'student',
          sender_name: user.name,
          text: initialMessage
        }]);

      if (msgError) throw msgError;

      if (newComplaint.send_to === 'Admin') {
        await notifyAdmins({
          type: 'complaint_new',
          title: 'New Complaint Raised',
          message: `${user.name} raised: "${newComplaint.subject}"`,
          link: '/admin/academic/complaints'
        });
      } else {
        const teachers = await getTeachersForBatch(newComplaint.batch);
        await createBatchNotifications(teachers.map((teacher) => teacher.id), {
          role: 'teacher',
          type: 'complaint_new',
          title: 'New Complaint Raised',
          message: `${user.name} raised: "${newComplaint.subject}"`,
          link: '/teacher/complaints'
        });
      }

      await fetchComplaints();
      return newComplaint;
    } catch (err) {
      console.error('Error creating complaint:', err);
      throw err;
    }
  };

  const sendMessage = async (complaintId, text) => {
    try {
      const { error } = await supabase
        .from('complaint_messages')
        .insert([{
          complaint_id: complaintId,
          sender_role: user.role,
          sender_name: user.name,
          text: text
        }]);

      if (error) throw error;

      const newStatus = user.role === 'student' ? 'Open' : 'Pending Reply';
      await supabase
        .from('complaints')
        .update({ updated_at: new Date().toISOString(), status: newStatus })
        .eq('id', complaintId);

      const complaint = complaints.find((item) => item.id === complaintId);
      if (complaint) {
        if (user.role === 'student') {
          if (complaint.send_to === 'Admin') {
            await notifyAdmins({
              type: 'complaint',
              title: 'New Reply on Complaint',
              message: `${user.name} replied to: "${complaint.subject}"`,
              link: '/admin/academic/complaints'
            });
          } else {
            const teachers = await getTeachersForBatch(complaint.batch);
            await createBatchNotifications(teachers.map((teacher) => teacher.id), {
              role: 'teacher',
              type: 'complaint',
              title: 'New Reply on Complaint',
              message: `${user.name} replied to: "${complaint.subject}"`,
              link: '/teacher/complaints'
            });
          }
        } else {
          const { data: student } = await supabase
            .from('admissions')
            .select('id')
            .eq('cnic', complaint.student_cnic)
            .maybeSingle();

          if (student?.id) {
            await createNotification({
              userId: student.id,
              role: 'student',
              type: 'complaint',
              title: 'New Reply on Your Complaint',
              message: `${user.name} replied to: "${complaint.subject}"`,
              link: '/student/complaints'
            });
          }
        }
      }

      // fetchComplaints will be called by real-time subscription or manually
      await fetchComplaints();
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const closeComplaint = async (id) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'Closed', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      const complaint = complaints.find((item) => item.id === id);
      if (complaint) {
        const { data: student } = await supabase
          .from('admissions')
          .select('id')
          .eq('cnic', complaint.student_cnic)
          .maybeSingle();
        if (student?.id) {
          await createNotification({
            userId: student.id,
            role: 'student',
            type: 'complaint_resolved',
            title: 'Complaint Resolved',
            message: `Your complaint "${complaint.subject}" has been marked resolved.`,
            link: '/student/complaints'
          });
        }
      }
      await fetchComplaints();
    } catch (err) {
      console.error('Error closing complaint:', err);
      throw err;
    }
  };

  const reopenComplaint = async (id) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'Open', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchComplaints();
    } catch (err) {
      console.error('Error reopening complaint:', err);
      throw err;
    }
  };

  const toggleUrgent = async (id, currentUrgent) => {
    try {
      const newPriority = currentUrgent === 'Urgent' ? 'Normal' : 'Urgent';
      const { error } = await supabase
        .from('complaints')
        .update({ priority: newPriority })
        .eq('id', id);

      if (error) throw error;
      await fetchComplaints();
    } catch (err) {
      console.error('Error toggling priority:', err);
      throw err;
    }
  };

  return (
    <ComplaintsContext.Provider value={{ 
      complaints, 
      loading, 
      fetchComplaints, 
      createComplaint, 
      sendMessage, 
      closeComplaint,
      reopenComplaint,
      toggleUrgent 
    }}>
      {children}
    </ComplaintsContext.Provider>
  );
};

export const useComplaints = () => useContext(ComplaintsContext);
