import { supabase } from '../supabaseClient';
import { createNotification, notifyAdmins } from './notifications';
import { computeAndCacheResult } from './resultUtils';

export const DEFAULT_ATTENDANCE_SETTINGS = {
  instituteName: 'DeepSkill Main Campus',
  latitude: 31.5204,
  longitude: 74.3587,
  radiusMeters: 100,
  maxAccuracyBufferMeters: 200,
  onTimeWindowMins: 15,
  lateThresholdMins: 15,
  absentCutoffMins: 60,
  weekendDays: ['Saturday', 'Sunday'],
  isActive: true
};

const SETTINGS_KEY = 'attendance_location';

const parseSettingsValue = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return {};
    }
  }
  return value;
};

export const formatAttendanceDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

export const formatAttendanceDay = (date = new Date()) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'long'
  }).format(date);

export const formatAttendanceTime = (date = new Date()) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);

export async function fetchAttendanceSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.warn('Attendance settings unavailable:', error.message);
    return { ...DEFAULT_ATTENDANCE_SETTINGS };
  }

  return {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...parseSettingsValue(data?.value)
  };
}

export async function saveAttendanceSettings(settings) {
  const payload = {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...settings,
    latitude: Number(settings.latitude),
    longitude: Number(settings.longitude),
    radiusMeters: Number(settings.radiusMeters),
    maxAccuracyBufferMeters: Number(settings.maxAccuracyBufferMeters || DEFAULT_ATTENDANCE_SETTINGS.maxAccuracyBufferMeters),
    onTimeWindowMins: Number(settings.onTimeWindowMins),
    lateThresholdMins: Number(settings.lateThresholdMins),
    absentCutoffMins: Number(settings.absentCutoffMins),
    weekendDays: settings.weekendDays?.length ? settings.weekendDays : DEFAULT_ATTENDANCE_SETTINGS.weekendDays,
    isActive: Boolean(settings.isActive)
  };

  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      key: SETTINGS_KEY,
      value: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2)
    + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function getAttendanceStatus(batchStartTime, settings, now = new Date()) {
  const resolvedStartTime = normalizeBatchStartTime(batchStartTime);
  if (!resolvedStartTime) return 'missing_time';

  const [startHour, startMin] = resolvedStartTime.split(':').map(Number);
  if (Number.isNaN(startHour) || Number.isNaN(startMin)) return 'missing_time';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const [hour, minute] = formatter.format(now).split(':').map(Number);
  const currentMins = (hour * 60) + minute;
  const startMins = (startHour * 60) + startMin;
  const diffMins = currentMins - startMins;

  if (diffMins < -Number(settings.onTimeWindowMins || 0)) return 'too_early';
  if (diffMins <= Number(settings.lateThresholdMins || 0)) return 'present';
  if (diffMins <= Number(settings.absentCutoffMins || 0)) return 'late';
  return 'absent_cutoff';
}

export function normalizeBatchStartTime(value) {
  if (!value) return '';
  const raw = String(value).trim();
  const direct24h = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (direct24h) {
    return `${direct24h[1].padStart(2, '0')}:${direct24h[2]}`;
  }

  const amPm = raw.match(/\b(1[0-2]|0?\d)(?::([0-5]\d))?\s*(AM|PM)\b/i);
  if (!amPm) return '';

  let hour = Number(amPm[1]);
  const minute = amPm[2] || '00';
  const suffix = amPm[3].toUpperCase();
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

export function requestStudentLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ error: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      (err) => resolve({ error: err.message || 'Location access denied' }),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  });
}

function getEffectiveRadius(settings, location) {
  const radius = Number(settings.radiusMeters || DEFAULT_ATTENDANCE_SETTINGS.radiusMeters);
  const accuracy = Number(location?.accuracy || 0);
  const maxBuffer = Number(settings.maxAccuracyBufferMeters || DEFAULT_ATTENDANCE_SETTINGS.maxAccuracyBufferMeters);
  const accuracyBuffer = Number.isFinite(accuracy) ? Math.min(Math.max(accuracy, 0), maxBuffer) : 0;
  return {
    radius,
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    accuracyBuffer: Math.round(accuracyBuffer),
    effectiveRadius: Math.round(radius + accuracyBuffer)
  };
}

async function fetchStudentAdmission(user) {
  if (!user?.id && !user?.cnic) return null;

  let query = supabase.from('admissions').select('*').order('submitted_at', { ascending: false }).limit(1);
  query = user.id ? query.eq('id', user.id) : query.eq('cnic', user.cnic);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchBatchForStudent(student) {
  const batchName = student?.batch;
  if (!batchName) return null;

  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .eq('batch_name', batchName)
    .eq('course', student.course)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const matches = data || [];
  if (matches.length <= 1) return matches[0] || null;

  const studentTiming = String(student.batch_timing || '').trim().toLowerCase();
  if (studentTiming) {
    const timingMatch = matches.find((batch) => [
      batch.time_shift,
      batch.timing_label,
      batch.start_time && batch.end_time ? `${batch.start_time}-${batch.end_time}` : ''
    ].some((value) => String(value || '').trim().toLowerCase() === studentTiming));
    if (timingMatch) return timingMatch;
  }

  return matches[0] || null;
}

async function checkAttendanceThreshold(student) {
  const { data } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', student.id);

  const records = data || [];
  if (records.length === 0) return;

  const attended = records.filter((row) => row.status === 'present' || row.status === 'late').length;
  const percentage = Math.round((attended / records.length) * 100);

  if (percentage < 75) {
    await createNotification({
      userId: student.id,
      role: 'student',
      type: 'attendance',
      title: 'Low Attendance Alert',
      message: `Your attendance is ${percentage}%. Please contact your teacher if you need help.`,
      link: '/student/attendance'
    });
  }
}

export async function markAttendance(student, batch, status, meta = {}) {
  const today = formatAttendanceDate();
  const now = new Date().toISOString();

  const record = {
    student_id: student.id,
    student_name: student.name,
    student_cnic: student.cnic,
    batch_id: batch.id,
    batch_name: batch.batch_name || student.batch,
    course: student.course || batch.course || null,
    date: today,
    day_of_week: formatAttendanceDay(),
    status,
    marked_by: meta.markedBy || 'auto',
    latitude: meta.latitude || null,
    longitude: meta.longitude || null,
    distance_meters: meta.distanceMeters ?? null,
    absence_reason: meta.reason || null,
    is_locked: meta.isLocked ?? true,
    marked_at: now
  };

  if (meta.overrideReason) {
    record.override_reason = meta.overrideReason;
    record.overridden_by = meta.overriddenBy || null;
    record.overridden_at = now;
  }

  const { data, error } = await supabase
    .from('attendance')
    .upsert(record, { onConflict: 'student_id,batch_id,date' })
    .select()
    .single();

  if (error) throw error;

  await createNotification({
    userId: student.id,
    role: 'student',
    type: 'attendance',
    title: `Attendance Marked - ${status.toUpperCase()}`,
    message: `Your attendance for ${today} has been marked as ${status.toUpperCase()}.`,
    link: '/student/attendance'
  });

  await checkAttendanceThreshold(student);
  await computeAndCacheResult(student.id, 'midterm', { updateRanks: false });
  await computeAndCacheResult(student.id, 'finalterm', { updateRanks: false });

  return data;
}

export async function getTodayAttendanceLoginStatus(user) {
  const settings = await fetchAttendanceSettings();
  if (!settings.isActive) return { status: 'disabled', settings };

  const today = formatAttendanceDate();
  const dayOfWeek = formatAttendanceDay();
  if ((settings.weekendDays || []).includes(dayOfWeek)) {
    return { status: 'no_class', reason: 'Weekend', settings };
  }

  const student = await fetchStudentAdmission(user);
  if (!student) return { status: 'student_not_found', settings };
  if (student.status && !['Active', 'Graduated'].includes(student.status)) {
    return { status: 'inactive_student', settings, student };
  }

  const batch = await fetchBatchForStudent(student);
  if (!batch?.id) return { status: 'batch_not_found', student, settings };

  const { data: existing, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', student.id)
    .eq('batch_id', batch.id)
    .eq('date', today)
    .maybeSingle();

  if (error) throw error;
  if (existing) return { status: 'already_marked', existing, student, batch, settings };

  const startTime = batch.start_time || batch.startTime || batch.time_shift || batch.batch_timing || batch.timing_label;
  const attendanceStatus = getAttendanceStatus(startTime, settings);

  if (attendanceStatus === 'missing_time') {
    await notifyAdmins({
      type: 'attendance',
      title: 'Auto-attendance needs batch timing',
      message: `${batch.batch_name || student.batch} has no start time configured. Add a start time or a timing label like "Morning (9:00 AM - 12:00 PM)".`,
      link: '/admin/management/courses'
    });
    return { status: 'missing_time', student, batch, settings };
  }

  if (attendanceStatus === 'too_early') {
    return { status: 'too_early', student, batch, settings };
  }

  return { status: 'needs_check', student, batch, settings };
}

export async function triggerAutoAttendance(user, options = {}) {
  const settings = await fetchAttendanceSettings();
  if (!settings.isActive) return { status: 'disabled', settings };

  const today = formatAttendanceDate();
  const dayOfWeek = formatAttendanceDay();
  if ((settings.weekendDays || []).includes(dayOfWeek)) {
    return { status: 'no_class', reason: 'Weekend', settings };
  }

  const student = await fetchStudentAdmission(user);
  if (!student) return { status: 'student_not_found', settings };
  if (student.status && !['Active', 'Graduated'].includes(student.status)) {
    return { status: 'inactive_student', settings, student };
  }

  const batch = await fetchBatchForStudent(student);
  if (!batch?.id) return { status: 'batch_not_found', student, settings };

  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', student.id)
    .eq('batch_id', batch.id)
    .eq('date', today)
    .maybeSingle();

  if (existing) return { status: 'already_marked', existing, student, batch, settings };

  if (options.selfReportedAbsent) {
    const record = await markAttendance(student, batch, 'absent', { reason: 'self_reported_absent' });
    return { status: 'absent', reason: 'self_reported_absent', record, student, batch, settings };
  }

  const location = options.location || await requestStudentLocation();
  if (location.error) {
    const record = await markAttendance(student, batch, 'absent', { reason: 'location_denied' });
    return { status: 'location_denied', reason: location.error, record, student, batch, settings };
  }

  const distance = calculateDistance(
    Number(location.latitude),
    Number(location.longitude),
    Number(settings.latitude),
    Number(settings.longitude)
  );
  const distanceMeters = Math.round(distance);
  const radiusCheck = getEffectiveRadius(settings, location);

  if (distance > radiusCheck.effectiveRadius) {
    const record = await markAttendance(student, batch, 'absent', {
      latitude: location.latitude,
      longitude: location.longitude,
      distanceMeters,
      reason: 'outside_location'
    });
    return {
      status: 'absent',
      reason: 'outside_location',
      distance: distanceMeters,
      accuracy: radiusCheck.accuracy,
      effectiveRadius: radiusCheck.effectiveRadius,
      record,
      student,
      batch,
      settings
    };
  }

  const startTime = batch.start_time || batch.startTime || batch.time_shift || batch.batch_timing || batch.timing_label;
  const attendanceStatus = getAttendanceStatus(startTime, settings);

  if (attendanceStatus === 'missing_time') {
    await notifyAdmins({
      type: 'attendance',
      title: 'Auto-attendance needs batch timing',
      message: `${batch.batch_name || student.batch} has no start time configured. Add a start time or a timing label like "Morning (9:00 AM - 12:00 PM)".`,
      link: '/admin/management/courses'
    });
    return { status: 'missing_time', student, batch, settings, distance: distanceMeters, accuracy: radiusCheck.accuracy, effectiveRadius: radiusCheck.effectiveRadius };
  }

  if (attendanceStatus === 'too_early') {
    return { status: 'too_early', student, batch, settings, distance: distanceMeters, accuracy: radiusCheck.accuracy, effectiveRadius: radiusCheck.effectiveRadius };
  }

  if (attendanceStatus === 'absent_cutoff') {
    const record = await markAttendance(student, batch, 'absent', {
      latitude: location.latitude,
      longitude: location.longitude,
      distanceMeters,
      reason: 'too_late'
    });
    return { status: 'absent', reason: 'too_late', distance: distanceMeters, accuracy: radiusCheck.accuracy, effectiveRadius: radiusCheck.effectiveRadius, record, student, batch, settings };
  }

  const record = await markAttendance(student, batch, attendanceStatus, {
    latitude: location.latitude,
    longitude: location.longitude,
    distanceMeters,
    reason: 'auto'
  });

  return {
    status: attendanceStatus,
    distance: distanceMeters,
    accuracy: radiusCheck.accuracy,
    effectiveRadius: radiusCheck.effectiveRadius,
    record,
    student,
    batch,
    settings,
    loginTime: formatAttendanceTime()
  };
}
