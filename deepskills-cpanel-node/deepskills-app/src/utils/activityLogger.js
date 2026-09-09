import { supabase } from '../supabaseClient';

const getDeviceInfo = () => {
  if (typeof navigator === 'undefined') return 'Unknown';
  const insideParens = navigator.userAgent.split('(')[1]?.split(')')[0];
  return insideParens || navigator.userAgent || 'Unknown';
};

export const logActivity = async ({
  userId = null,
  userName = 'Unknown',
  userRole = 'unknown',
  eventType,
  description,
  ipAddress = null,
  deviceInfo
}) => {
  if (!eventType || !description) return;

  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      event_type: eventType,
      event_description: description,
      ip_address: ipAddress,
      device_info: deviceInfo || getDeviceInfo(),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const updateLastLogin = async (cnic, timestamp = new Date().toISOString()) => {
  if (!cnic) return;
  try {
    await supabase.from('users').update({ last_login: timestamp, updated_at: timestamp }).eq('cnic', cnic);
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
};
