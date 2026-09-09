import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getNotificationUserId } from '../utils/notifications';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = getNotificationUserId(user);
  const [notifications, setNotifications] = useState([]);
  const [toastQueue, setToastQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Notification fetch error:', error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const notification = payload.new;
        setNotifications((current) => [notification, ...current].slice(0, 50));
        setToastQueue((current) => [...current, { ...notification, toastId: `${notification.id}-${Date.now()}` }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Notification mark read error:', error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Notification mark all read error:', error);
      return;
    }

    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
  }, [userId]);

  const dismissToast = useCallback((toastId) => {
    setToastQueue((current) => current.filter((toast) => toast.toastId !== toastId));
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.is_read).length,
    toastQueue,
    loading,
    userId,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissToast
  }), [dismissToast, fetchNotifications, loading, markAllAsRead, markAsRead, notifications, toastQueue, userId]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
