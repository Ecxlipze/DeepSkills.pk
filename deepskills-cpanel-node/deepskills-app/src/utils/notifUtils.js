export const NOTIFICATION_TYPES = {
  TASK: 'task',
  TASK_SUBMITTED: 'task_submitted',
  TASK_OVERDUE: 'task_overdue',
  COMPLAINT: 'complaint',
  COMPLAINT_NEW: 'complaint_new',
  COMPLAINT_RESOLVED: 'complaint_resolved',
  FEE_REMINDER: 'fee_reminder',
  FEE_OVERDUE: 'fee_overdue',
  ANNOUNCEMENT: 'announcement',
  ATTENDANCE: 'attendance',
  ATTENDANCE_WARNING: 'attendance_warning',
  ENROLLMENT: 'enrollment',
  ENROLLMENT_APPROVED: 'enrollment_approved',
  ENROLLMENT_REJECTED: 'enrollment_rejected',
  BATCH: 'batch',
  REFERRAL: 'referral',
  REFERRAL_PAYOUT: 'referral_payout',
  HR_JD: 'hr_jd',
  HR_HIRED: 'hr_hired',
  ADMISSION: 'admission',
  RESULT: 'result'
};

export const CRITICAL_NOTIFICATION_TYPES = new Set([
  NOTIFICATION_TYPES.FEE_REMINDER,
  NOTIFICATION_TYPES.FEE_OVERDUE,
  NOTIFICATION_TYPES.ATTENDANCE_WARNING,
  NOTIFICATION_TYPES.ENROLLMENT,
  NOTIFICATION_TYPES.ENROLLMENT_APPROVED,
  NOTIFICATION_TYPES.ENROLLMENT_REJECTED,
  NOTIFICATION_TYPES.BATCH,
  NOTIFICATION_TYPES.REFERRAL_PAYOUT,
  NOTIFICATION_TYPES.HR_JD,
  NOTIFICATION_TYPES.HR_HIRED,
  NOTIFICATION_TYPES.ADMISSION
]);

export function getNotifIcon(type) {
  const icons = {
    task: '📋',
    task_submitted: '✅',
    task_overdue: '⏰',
    complaint: '💬',
    complaint_new: '🆕',
    complaint_resolved: '✔️',
    fee_reminder: '💳',
    fee_overdue: '⚠️',
    announcement: '📢',
    attendance: '📋',
    attendance_warning: '🚨',
    enrollment: '📝',
    enrollment_approved: '🎉',
    enrollment_rejected: '❌',
    batch: '🎓',
    referral: '🔗',
    referral_payout: '💰',
    hr_jd: '📄',
    hr_hired: '🤝',
    admission: '👤',
    result: '📊'
  };
  return icons[type] || '🔔';
}

export function getNotifColor(type) {
  const colors = {
    task: '#4F8EF7',
    task_submitted: '#10B981',
    task_overdue: '#F59E0B',
    complaint: '#F59E0B',
    complaint_new: '#F59E0B',
    complaint_resolved: '#10B981',
    fee_reminder: '#F59E0B',
    fee_overdue: '#EF4444',
    announcement: '#10B981',
    attendance: '#8B5CF6',
    attendance_warning: '#EF4444',
    enrollment: '#4F8EF7',
    enrollment_approved: '#10B981',
    enrollment_rejected: '#EF4444',
    batch: '#10B981',
    referral: '#8B5CF6',
    referral_payout: '#10B981',
    hr_jd: '#4F8EF7',
    hr_hired: '#10B981',
    admission: '#4F8EF7',
    result: '#8B5CF6'
  };
  return colors[type] || '#6B7280';
}

export function formatTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}
