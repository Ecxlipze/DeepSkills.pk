import { supabase } from '../supabaseClient';
import { EMAIL_EVENTS, sendAdmissionEmail } from './emailNotifications';
import { CRITICAL_NOTIFICATION_TYPES } from './notifUtils';

const normalizeUserId = (value) => (value === null || value === undefined ? '' : String(value));

export function getNotificationUserId(user) {
  return normalizeUserId(user?.id || user?.cnic);
}

export function shouldSendNotificationEmail(type, explicitValue) {
  if (typeof explicitValue === 'boolean') return explicitValue;
  return CRITICAL_NOTIFICATION_TYPES.has(type);
}

export async function sendEmailNotification({ type, title, message, emailData = {} }) {
  const email = emailData.email;
  if (!email) {
    return { ok: false, message: 'Missing recipient email.' };
  }

  return sendAdmissionEmail(emailData.event || EMAIL_EVENTS.NOTIFICATION, {
    ...emailData,
    email,
    title,
    message,
    type
  });
}

export async function createNotification({
  userId,
  role,
  type,
  title,
  message,
  link,
  sendEmail,
  emailData = {}
}) {
  const recipientId = normalizeUserId(userId);
  if (!recipientId || !role || !type || !title || !message) {
    console.warn('Notification skipped: missing required fields', { userId, role, type, title, message });
    return { ok: false, error: 'missing_fields' };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: recipientId,
      role,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
      email_sent: false,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('Notification insert error:', error);
    return { ok: false, error };
  }

  let emailSent = false;
  const shouldEmail = shouldSendNotificationEmail(type, sendEmail);

  if (shouldEmail) {
    const emailResult = await sendEmailNotification({ type, title, message, emailData });
    emailSent = Boolean(emailResult?.ok);
    if (!emailResult?.ok) {
      console.warn('Notification email failed:', emailResult?.message);
    } else {
      await supabase
        .from('notifications')
        .update({ email_sent: true, updated_at: new Date().toISOString() })
        .eq('id', data.id);
    }
  }

  return { ok: true, data: { ...data, email_sent: emailSent } };
}

export async function createBatchNotifications(userIds, notifData) {
  const uniqueIds = [...new Set((userIds || []).map(normalizeUserId).filter(Boolean))];
  if (uniqueIds.length === 0) return { ok: true, count: 0 };

  const now = new Date().toISOString();
  const records = uniqueIds.map((userId) => ({
    user_id: userId,
    role: notifData.role,
    type: notifData.type,
    title: notifData.title,
    message: notifData.message,
    link: notifData.link || null,
    is_read: false,
    email_sent: false,
    created_at: now
  }));

  const { error } = await supabase.from('notifications').insert(records);
  if (error) {
    console.error('Batch notification insert error:', error);
    return { ok: false, error };
  }
  return { ok: true, count: records.length };
}

export async function createRoleNotifications(role, notifData) {
  const table = role === 'student' ? 'admissions' : role === 'teacher' ? 'teachers' : 'users';
  const idColumn = role === 'student' ? 'id' : 'id';
  let query = supabase.from(table).select(idColumn);

  if (role === 'student') query = query.eq('status', 'Active');
  if (role === 'teacher') query = query.eq('status', 'Active');
  if (!['student', 'teacher'].includes(role)) query = query.eq('status', 'active');

  const { data, error } = await query;
  if (error) {
    console.error('Role notification recipient fetch error:', error);
    return { ok: false, error };
  }

  return createBatchNotifications((data || []).map((row) => row.id), { ...notifData, role });
}

export async function getAdminRecipients() {
  const recipients = [];

  const { data: authUsers } = await supabase
    .from('users')
    .select('id, full_name, email, role, status')
    .in('role', ['admin', 'custom'])
    .eq('status', 'active');

  (authUsers || []).forEach((user) => {
    recipients.push({
      id: user.id,
      role: user.role === 'admin' ? 'admin' : user.role,
      name: user.full_name,
      email: user.email
    });
  });

  const unique = new Map();
  recipients.forEach((recipient) => {
    if (recipient.id) unique.set(String(recipient.id), recipient);
  });
  return [...unique.values()];
}

export async function notifyAdmins(notifData) {
  const admins = await getAdminRecipients();
  await Promise.all(admins.map((admin) => createNotification({
    userId: admin.id,
    role: admin.role || 'admin',
    ...notifData,
    emailData: { ...notifData.emailData, email: admin.email, name: admin.name }
  })));
  return { ok: true, count: admins.length };
}

export async function getStudentsForCourseBatch(course, batch) {
  let query = supabase.from('admissions').select('id, name, email, cnic, course, batch').eq('status', 'Active');
  if (course) query = query.eq('course', course);
  if (batch) query = query.eq('batch', batch);
  const { data, error } = await query;
  if (error) {
    console.error('Student recipient fetch error:', error);
    return [];
  }
  return data || [];
}

export async function getTeachersForBatch(batchName) {
  if (!batchName) return [];

  const { data: batches } = await supabase
    .from('batches')
    .select('id')
    .eq('batch_name', batchName);

  const batchIds = (batches || []).map((batch) => batch.id);
  if (!batchIds.length) return [];

  const { data: assignments, error: assignmentError } = await supabase
    .from('teacher_batches')
    .select('teacher_id')
    .in('batch_id', batchIds);

  if (assignmentError) {
    console.error('Teacher assignment recipient fetch error:', assignmentError);
    return [];
  }

  const teacherIds = [...new Set((assignments || []).map((row) => row.teacher_id).filter(Boolean))];
  if (!teacherIds.length) return [];

  const { data: teachers, error: teacherError } = await supabase
    .from('teachers')
    .select('id, name, email, cnic, status')
    .in('id', teacherIds)
    .eq('status', 'Active');

  if (teacherError) {
    console.error('Teacher recipient fetch error:', teacherError);
    return [];
  }

  return teachers || [];
}

export async function cleanupOldNotifications() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return supabase.from('notifications').delete().lt('created_at', cutoff.toISOString());
}
