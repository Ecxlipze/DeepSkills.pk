// --- Pure Date Utilities and Validation Functions ---

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toDateStr(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isValidDateString(str) {
  if (!str || typeof str !== 'string') return false;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseDate(str) {
  if (!isValidDateString(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}
