import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { createBatchNotifications } from '../utils/notifications';

const AnnouncementsContext = createContext();

export const AnnouncementsProvider = ({ children }) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all announcements
  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`*, announcement_attachments(*)`)
        .order('is_pinned', { ascending: false })
        .order('posted_at', { ascending: false });

      if (error) throw error;

      // Filter based on role + audience
      const visible = (data || []).filter(a => filterForUser(a, user));
      setAnnouncements(visible);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch read status for current user
  const fetchReads = useCallback(async () => {
    if (!user) return;
    const userId = user.id || user.cnic;
    const { data } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId);
    if (data) setReadIds(data.map(r => r.announcement_id));
  }, [user]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchReads();

      const channel = supabase
        .channel('announcements-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'announcements'
        }, () => {
          fetchAnnouncements();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchAnnouncements, fetchReads]);

  // Filter logic: which announcements a user can see
  function filterForUser(announcement, currentUser) {
    if (!announcement.is_active) {
      // Admin can see inactive ones
      if (currentUser.role === 'admin') return true;
      return false;
    }

    // Admin sees everything
    if (currentUser.role === 'admin') return true;

    // Check scheduled — only show if posted_at <= now
    if (announcement.scheduled_at && new Date(announcement.scheduled_at) > new Date()) {
      return false;
    }

    // Teacher-posted: only visible to their batch
    if (announcement.posted_by_role === 'teacher') {
      const userBatch = currentUser.batch || currentUser.assigned_batch;
      return announcement.audience_batches?.includes(userBatch);
    }

    // Admin broadcast
    if (announcement.audience_type === 'broadcast') {
      return announcement.audience_roles?.includes(currentUser.role);
    }

    // Admin targeted
    if (announcement.audience_type === 'targeted') {
      const roleMatch = announcement.audience_roles?.includes(currentUser.role);
      const userBatch = currentUser.batch || currentUser.assigned_batch;
      const userCourse = currentUser.course || currentUser.assigned_course;
      const batchMatch = announcement.audience_batches?.includes(userBatch);
      const courseMatch = announcement.audience_courses?.includes(userCourse);
      return roleMatch && (batchMatch || courseMatch);
    }

    return false;
  }

  // Unread count
  const unreadCount = announcements.filter(a => a.is_active && !readIds.includes(a.id)).length;

  // Mark a single announcement as read
  const markAsRead = async (announcementId) => {
    if (!user || readIds.includes(announcementId)) return;
    const userId = user.id || user.cnic;
    try {
      await supabase
        .from('announcement_reads')
        .upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: 'announcement_id, user_id' });
      setReadIds(prev => [...prev, announcementId]);
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  // Create announcement (admin or teacher)
  const createAnnouncement = async (announcementData, attachments = []) => {
    try {
      const { data: newAnn, error } = await supabase
        .from('announcements')
        .insert([announcementData])
        .select()
        .single();

      if (error) throw error;

      // Insert attachments if any
      if (attachments.length > 0) {
        const attachmentRows = attachments.map(att => ({
          announcement_id: newAnn.id,
          file_name: att.file_name,
          file_size: att.file_size,
          file_url: att.file_url,
          file_type: att.file_type
        }));
        await supabase.from('announcement_attachments').insert(attachmentRows);
      }

      const isLiveNow = newAnn.is_active !== false && (!newAnn.scheduled_at || new Date(newAnn.scheduled_at) <= new Date());
      if (isLiveNow) {
        const roles = newAnn.audience_roles || [];
        const title = 'New Announcement';
        const message = `${newAnn.posted_by_name || 'DeepSkills'}: "${newAnn.title}"`;

        if (roles.includes('student')) {
          const { data: allStudents } = await supabase
            .from('admissions')
            .select('id, batch, course')
            .eq('status', 'Active');
          const batches = newAnn.audience_batches || [];
          const courses = newAnn.audience_courses || [];
          const students = newAnn.audience_type === 'targeted'
            ? (allStudents || []).filter((student) => batches.includes(student.batch) || courses.includes(student.course))
            : (allStudents || []);

          await createBatchNotifications(students.map((student) => student.id), {
            role: 'student',
            type: 'announcement',
            title,
            message,
            link: '/student/announcements'
          });
        }

        if (roles.includes('teacher')) {
          let teacherIds = [];
          if (newAnn.audience_type === 'targeted' && (newAnn.audience_batches || []).length) {
            const { data: batches } = await supabase
              .from('batches')
              .select('id')
              .in('batch_name', newAnn.audience_batches);
            const batchIds = (batches || []).map((batch) => batch.id);
            if (batchIds.length) {
              const { data: assignments } = await supabase
                .from('teacher_batches')
                .select('teacher_id')
                .in('batch_id', batchIds);
              teacherIds = (assignments || []).map((assignment) => assignment.teacher_id);
            }
          } else {
            const { data: teachers } = await supabase.from('teachers').select('id').eq('status', 'Active');
            teacherIds = (teachers || []).map((teacher) => teacher.id);
          }

          await createBatchNotifications(teacherIds, {
            role: 'teacher',
            type: 'announcement',
            title,
            message,
            link: '/teacher/announcements'
          });
        }
      }

      await fetchAnnouncements();
      return newAnn;
    } catch (err) {
      console.error('Error creating announcement:', err);
      throw err;
    }
  };

  // Update announcement
  const updateAnnouncement = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      await fetchAnnouncements();
    } catch (err) {
      console.error('Error updating announcement:', err);
      throw err;
    }
  };

  // Toggle pin
  const togglePin = async (id, currentPinned) => {
    await updateAnnouncement(id, { is_pinned: !currentPinned });
  };

  // Soft delete (deactivate)
  const deleteAnnouncement = async (id) => {
    await updateAnnouncement(id, { is_active: false });
  };

  // Reactivate
  const activateAnnouncement = async (id) => {
    await updateAnnouncement(id, { is_active: true });
  };

  return (
    <AnnouncementsContext.Provider value={{
      announcements,
      loading,
      unreadCount,
      readIds,
      fetchAnnouncements,
      createAnnouncement,
      updateAnnouncement,
      markAsRead,
      togglePin,
      deleteAnnouncement,
      activateAnnouncement
    }}>
      {children}
    </AnnouncementsContext.Provider>
  );
};

export const useAnnouncements = () => useContext(AnnouncementsContext);
