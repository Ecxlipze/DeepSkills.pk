import { supabase } from '../supabaseClient';
import { MODULE_KEYS } from './permissions';
import { logActivity } from './activityLogger';
import { syncStaffAccess, revokeStaffAccess } from './adminAccessApi';

const nowIso = () => new Date().toISOString();

const normalizePermissions = (permissions = {}) =>
  MODULE_KEYS.reduce((acc, key) => {
    acc[key] = permissions[key] || 'none';
    return acc;
  }, {});

const roleNameToSlug = (value = '') => value.toLowerCase().replace(/\s+/g, '_');

const findRoleIdByName = async (name) => {
  if (!name) return null;
  const { data, error } = await supabase.from('custom_roles').select('id').ilike('name', name).maybeSingle();
  if (error) throw error;
  return data?.id || null;
};

const mapRolePayload = (roleValue) => {
  if (!roleValue) return { role: 'custom', customRoleId: null, roleName: 'Custom' };

  if (roleValue.startsWith('custom-role:')) {
    const [, customRoleId] = roleValue.split(':');
    return { role: 'custom', customRoleId, roleName: 'Custom' };
  }

  return {
    role: roleNameToSlug(roleValue),
    customRoleId: null,
    roleName: roleValue
  };
};

const fetchSingleByCnic = async (table, cnic) => {
  const { data, error } = await supabase.from(table).select('*').eq('cnic', cnic).maybeSingle();
  if (error) throw error;
  return data;
};

const ensureAllowedAccess = async ({ cnic, fullName, role, assignedCourse = '', batch = '' }) => {
  return syncStaffAccess({
    cnic,
    name: fullName,
    role,
    assignedCourse,
    batch
  });
};

const removeAllowedAccess = async (cnic) => revokeStaffAccess(cnic);

const ensureStudentRecord = async (payload) => {
  const existing = await fetchSingleByCnic('admissions', payload.cnic);
  if (existing) {
    const { error } = await supabase.from('admissions').update({
      name: payload.full_name,
      phone: payload.phone,
      email: payload.email,
      status: payload.status === 'active' ? 'Active' : 'Inactive'
    }).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from('admissions').insert([{
    name: payload.full_name,
    cnic: payload.cnic,
    phone: payload.phone,
    email: payload.email,
    course: '',
    batch: '',
    batch_timing: '',
    education: '',
    status: payload.status === 'active' ? 'Active' : 'Inactive',
    submitted_at: nowIso()
  }]).select().single();
  if (error) throw error;
  return data?.id;
};

const ensureTeacherRecord = async (payload) => {
  const existing = await fetchSingleByCnic('teachers', payload.cnic);
  if (existing) {
    const { error } = await supabase.from('teachers').update({
      name: payload.full_name,
      phone: payload.phone,
      email: payload.email,
      status: payload.status === 'active' ? 'Active' : 'Inactive'
    }).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from('teachers').insert([{
    name: payload.full_name,
    cnic: payload.cnic,
    phone: payload.phone,
    email: payload.email,
    specialization: '',
    status: payload.status === 'active' ? 'Active' : 'Inactive',
    notes: ''
  }]).select().single();
  if (error) throw error;
  return data?.id;
};

const syncCompanionRecords = async (payload, previousUser = null) => {
  const role = payload.role;
  const status = payload.status || 'active';
  const shouldAllowLogin = status === 'active';

  if (role === 'student') {
    await ensureStudentRecord(payload);
  }

  if (role === 'teacher') {
    await ensureTeacherRecord(payload);
  }

  if (previousUser?.role === 'student' && role !== 'student' && previousUser.cnic) {
    await removeAllowedAccess(previousUser.cnic);
  }

  if (previousUser?.role === 'teacher' && role !== 'teacher' && previousUser.cnic) {
    await removeAllowedAccess(previousUser.cnic);
  }

  if (shouldAllowLogin) {
    await ensureAllowedAccess({
      cnic: payload.cnic,
      fullName: payload.full_name,
      role,
      assignedCourse: payload.assigned_course || '',
      batch: payload.batch || ''
    });
  } else {
    await removeAllowedAccess(payload.cnic);
  }
};

export const fetchRoles = async () => {
  const { data, error } = await supabase
    .from('custom_roles')
    .select('*')
    .order('is_builtin', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((role) => ({ ...role, permissions: normalizePermissions(role.permissions) }));
};

export const fetchUsers = async ({
  tab = 'all',
  search = '',
  role = 'all',
  status = 'all',
  lastActive = 'any',
  page = 1,
  pageSize = 20
} = {}) => {
  let query = supabase
    .from('users')
    .select('*, custom_roles(id,name,color,icon,permissions)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (tab === 'students') query = query.eq('role', 'student');
  if (tab === 'teachers') query = query.eq('role', 'teacher');
  if (tab === 'admins') query = query.eq('role', 'admin');
  if (tab === 'custom') query = query.eq('role', 'custom');
  if (role !== 'all') query = query.eq('role', role);
  if (status !== 'all') query = query.eq('status', status);

  if (lastActive !== 'any') {
    const threshold = new Date();
    if (lastActive === 'today') threshold.setHours(0, 0, 0, 0);
    if (lastActive === 'week') threshold.setDate(threshold.getDate() - 7);
    if (lastActive === 'month') threshold.setMonth(threshold.getMonth() - 1);
    query = query.gte('last_login', threshold.toISOString());
  }

  if (search.trim()) {
    const safe = search.trim();
    query = query.or(`full_name.ilike.%${safe}%,cnic.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

export const fetchUserStats = async () => {
  const { data, error } = await supabase.from('users').select('role,status');
  if (error) throw error;
  const users = data || [];
  return {
    total: users.length,
    students: users.filter((user) => user.role === 'student').length,
    teachers: users.filter((user) => user.role === 'teacher').length,
    admins: users.filter((user) => user.role === 'admin').length,
    custom: users.filter((user) => user.role === 'custom').length,
    adminPanelUsers: users.filter((user) => ['admin', 'custom'].includes(user.role)).length
  };
};

export const createRole = async (payload) => {
  const { data, error } = await supabase.from('custom_roles').insert([{
    name: payload.name,
    description: payload.description,
    icon: payload.icon,
    color: payload.color,
    permissions: normalizePermissions(payload.permissions),
    is_builtin: Boolean(payload.is_builtin),
    created_at: nowIso(),
    updated_at: nowIso()
  }]).select().single();
  if (error) throw error;
  return data;
};

export const updateRole = async (roleId, payload) => {
  const { data, error } = await supabase.from('custom_roles').update({
    name: payload.name,
    description: payload.description,
    icon: payload.icon,
    color: payload.color,
    permissions: normalizePermissions(payload.permissions),
    updated_at: nowIso()
  }).eq('id', roleId).select().single();
  if (error) throw error;
  return data;
};

export const deleteRole = async (roleId) => {
  const { count, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('custom_role_id', roleId);

  if (countError) throw countError;
  if (count > 0) {
    const blockedError = new Error(`Cannot delete: ${count} users assigned to this role`);
    blockedError.code = 'ROLE_IN_USE';
    throw blockedError;
  }

  const { error } = await supabase.from('custom_roles').delete().eq('id', roleId);
  if (error) throw error;
};

export const createUser = async (payload, actor) => {
  const roleMeta = mapRolePayload(payload.roleValue);
  const resolvedCustomRoleId = payload.customRoleId || roleMeta.customRoleId || await findRoleIdByName(payload.roleValue);
  const insertPayload = {
    full_name: payload.fullName,
    cnic: payload.cnic,
    phone: payload.phone,
    email: payload.email,
    role: roleMeta.role,
    custom_role_id: resolvedCustomRoleId,
    status: payload.status,
    account_notes: payload.accountNotes || '',
    created_by: actor?.id || null,
    created_at: nowIso(),
    updated_at: nowIso()
  };

  const { data, error } = await supabase.from('users').insert([insertPayload]).select().single();
  if (error) throw error;

  await syncCompanionRecords(insertPayload);

  await logActivity({
    userId: data.id,
    userName: data.full_name,
    userRole: data.role,
    eventType: 'action',
    description: `User created by ${actor?.name || 'Admin'}`
  });

  return data;
};

export const updateUser = async (userId, payload, actor) => {
  const { data: previousUser, error: previousError } = await supabase.from('users').select('*').eq('id', userId).single();
  if (previousError) throw previousError;

  const roleMeta = mapRolePayload(payload.roleValue);
  const resolvedCustomRoleId = payload.customRoleId || roleMeta.customRoleId || await findRoleIdByName(payload.roleValue);
  const updatePayload = {
    full_name: payload.fullName,
    cnic: payload.cnic,
    phone: payload.phone,
    email: payload.email,
    role: roleMeta.role,
    custom_role_id: resolvedCustomRoleId,
    status: payload.status,
    account_notes: payload.accountNotes || '',
    updated_at: nowIso()
  };

  const { data, error } = await supabase.from('users').update(updatePayload).eq('id', userId).select().single();
  if (error) throw error;

  if (previousUser.cnic !== updatePayload.cnic) {
    await removeAllowedAccess(previousUser.cnic);
  }

  await syncCompanionRecords(updatePayload, previousUser);

  await logActivity({
    userId: data.id,
    userName: data.full_name,
    userRole: data.role,
    eventType: previousUser.role !== data.role ? 'action' : 'profile_change',
    description: previousUser.role !== data.role
      ? `Role changed by ${actor?.name || 'Admin'} from ${previousUser.role} to ${data.role}`
      : `User updated by ${actor?.name || 'Admin'}`
  });

  return data;
};

export const suspendUser = async (userId, actor) => {
  const { data: user, error: fetchError } = await supabase.from('users').select('*').eq('id', userId).single();
  if (fetchError) throw fetchError;

  const { data, error } = await supabase.from('users').update({
    status: 'suspended',
    updated_at: nowIso()
  }).eq('id', userId).select().single();
  if (error) throw error;

  await removeAllowedAccess(user.cnic);

  await logActivity({
    userId: data.id,
    userName: data.full_name,
    userRole: data.role,
    eventType: 'suspension',
    description: `Account suspended by ${actor?.name || 'Admin'}`
  });

  return data;
};

export const reactivateUser = async (userId, actor) => {
  const { error: fetchError } = await supabase.from('users').select('*').eq('id', userId).single();
  if (fetchError) throw fetchError;

  const { data, error } = await supabase.from('users').update({
    status: 'active',
    updated_at: nowIso()
  }).eq('id', userId).select().single();
  if (error) throw error;

  if (data.role !== 'admin') {
    await ensureAllowedAccess({
      cnic: data.cnic,
      fullName: data.full_name,
      role: data.role
    });
  }

  await logActivity({
    userId: data.id,
    userName: data.full_name,
    userRole: data.role,
    eventType: 'reactivation',
    description: `Account reactivated by ${actor?.name || 'Admin'}`
  });

  return data;
};

export const bulkSuspend = async (userIds = [], actor) => Promise.all(userIds.map((userId) => suspendUser(userId, actor)));
export const bulkActivate = async (userIds = [], actor) => Promise.all(userIds.map((userId) => reactivateUser(userId, actor)));

export const bulkRoleChange = async (userIds = [], rolePayload, actor) => {
  const { data: users, error } = await supabase.from('users').select('*').in('id', userIds);
  if (error) throw error;
  return Promise.all((users || []).map((user) => updateUser(user.id, {
    fullName: user.full_name,
    cnic: user.cnic,
    phone: user.phone || '',
    email: user.email || '',
    roleValue: rolePayload.roleValue,
    customRoleId: rolePayload.customRoleId || null,
    status: user.status,
    accountNotes: user.account_notes || ''
  }, actor)));
};

export const fetchUserActivity = async (userId, { eventType = 'all', dateFrom = '', dateTo = '', page = 1, pageSize = 50 } = {}) => {
  let query = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (eventType !== 'all') query = query.eq('event_type', eventType);
  if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

export const fetchGlobalActivity = async ({ search = '', role = 'all', eventType = 'all', dateFrom = '', dateTo = '', page = 1, pageSize = 50 } = {}) => {
  let query = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (role !== 'all') query = query.eq('user_role', role);
  if (eventType !== 'all') query = query.eq('event_type', eventType);
  if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }
  if (search.trim()) {
    query = query.or(`user_name.ilike.%${search.trim()}%,event_description.ilike.%${search.trim()}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

export const fetchActivityStats = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const lastThirtyMinutes = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalToday }, { count: failedToday }, { count: suspensionsWeek }, { count: activeNow }] = await Promise.all([
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay.toISOString()),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('event_type', 'warning').gte('created_at', startOfDay.toISOString()),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('event_type', 'suspension').gte('created_at', lastWeek),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', lastThirtyMinutes)
  ]);

  return {
    totalToday: totalToday || 0,
    failedToday: failedToday || 0,
    suspensionsWeek: suspensionsWeek || 0,
    activeNow: activeNow || 0
  };
};
