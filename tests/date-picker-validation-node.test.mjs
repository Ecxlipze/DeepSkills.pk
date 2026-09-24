import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidDateString,
  parseDate,
  getTodayStr,
  toDateStr,
  pad2
} from '../src/utils/dateUtils.js';
import {
  validateDate,
  validateDateRange
} from '../src/utils/formValidation.js';

test('pad2 correctly zero-pads 1-digit numbers', () => {
  assert.equal(pad2(1), '01');
  assert.equal(pad2(9), '09');
  assert.equal(pad2(10), '10');
  assert.equal(pad2(25), '25');
});

test('toDateStr formats year, month, day into YYYY-MM-DD', () => {
  assert.equal(toDateStr(2026, 9, 25), '2026-09-25');
  assert.equal(toDateStr(2024, 2, 9), '2024-02-09');
});

test('getTodayStr returns valid YYYY-MM-DD string', () => {
  const today = getTodayStr();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(isValidDateString(today), true);
});

test('isValidDateString strictly validates valid and invalid calendar dates', () => {
  // Valid dates
  assert.equal(isValidDateString('2026-09-25'), true);
  assert.equal(isValidDateString('2024-02-29'), true); // 2024 is leap year
  assert.equal(isValidDateString('2023-12-31'), true);

  // Invalid formats
  assert.equal(isValidDateString(''), false);
  assert.equal(isValidDateString(null), false);
  assert.equal(isValidDateString('25-09-2026'), false);
  assert.equal(isValidDateString('2026/09/25'), false);
  assert.equal(isValidDateString('not-a-date'), false);

  // Invalid calendar dates
  assert.equal(isValidDateString('2025-02-29'), false); // 2025 is not leap year
  assert.equal(isValidDateString('2026-04-31'), false); // April has 30 days
  assert.equal(isValidDateString('2026-02-30'), false); // Feb never has 30 days
  assert.equal(isValidDateString('2026-13-01'), false); // Month 13
  assert.equal(isValidDateString('2026-00-10'), false); // Month 0
  assert.equal(isValidDateString('1850-01-01'), false); // Year < 1900
  assert.equal(isValidDateString('2150-01-01'), false); // Year > 2100
});

test('parseDate decomposes valid date into year, month, and day', () => {
  const parsed = parseDate('2026-09-25');
  assert.deepEqual(parsed, { year: 2026, month: 9, day: 25 });
  assert.equal(parseDate('invalid'), null);
});

test('validateDate checks presence, format, calendar validity, and min/max bounds', () => {
  // Required check
  assert.equal(validateDate('', { required: true, fieldName: 'Birth Date' }), 'Birth Date is required.');
  assert.equal(validateDate('', { required: false }), null);

  // Format check
  assert.equal(validateDate('2026-9-5', { fieldName: 'Event Date' }), 'Please enter a valid event date in YYYY-MM-DD format.');
  assert.equal(validateDate('2025-02-29', { fieldName: 'Joining Date' }), 'Please enter a valid calendar date for joining date.');

  // Bounds check (min / max)
  assert.equal(validateDate('2026-01-01', { min: '2026-05-01', fieldName: 'Start Date' }), 'Start Date cannot be earlier than 2026-05-01.');
  assert.equal(validateDate('2026-12-31', { max: '2026-10-01', fieldName: 'End Date' }), 'End Date cannot be later than 2026-10-01.');
  assert.equal(validateDate('2026-06-15', { min: '2026-01-01', max: '2026-12-31' }), null);
});

test('validateDateRange validates paired date ranges', () => {
  assert.equal(validateDateRange('2026-05-10', '2026-05-01', { startLabel: 'Start Date', endLabel: 'End Date' }), 'End Date cannot be earlier than start date.');
  assert.equal(validateDateRange('2026-05-01', '2026-05-10'), null);
  assert.equal(validateDateRange('2026-05-01', '2026-05-01'), null);
});
