import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  getTodayDateString
} from '../lib/timeTrackingServer.js';
import {
  getDepartmentNav,
  normalizeAdminPath
} from '../src/utils/departments.js';
import { MODULE_KEYS } from '../lib/portalAuthServer.js';

test('MODULE_KEYS includes time_tracking', () => {
  assert.equal(MODULE_KEYS.includes('time_tracking'), true);
});

test('formatDuration formats seconds to HH:MM:SS properly', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(59), '00:00:59');
  assert.equal(formatDuration(60), '00:01:00');
  assert.equal(formatDuration(3600), '01:00:00');
  assert.equal(formatDuration(3665), '01:01:05');
  assert.equal(formatDuration(-10), '00:00:00');
  assert.equal(formatDuration(null), '00:00:00');
  assert.equal(formatDuration(undefined), '00:00:00');
});

test('getTodayDateString returns valid YYYY-MM-DD format', () => {
  const dateStr = getTodayDateString();
  assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
});

test('Shift duration and break calculation logic', () => {
  // Simulate a 9:00 AM to 5:00 PM shift (8 hours = 28,800s)
  // with a 1 hour lunch break (3,600s)
  const clockInTime = new Date('2026-09-24T09:00:00.000Z');
  const breakStartTime = new Date('2026-09-24T13:00:00.000Z');
  const breakEndTime = new Date('2026-09-24T14:00:00.000Z');
  const clockOutTime = new Date('2026-09-24T17:00:00.000Z');

  const breakDuration = Math.floor((breakEndTime.getTime() - breakStartTime.getTime()) / 1000);
  assert.equal(breakDuration, 3600); // 1 hour

  const totalElapsed = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 1000);
  assert.equal(totalElapsed, 28800); // 8 hours

  const netWorkSeconds = totalElapsed - breakDuration;
  assert.equal(netWorkSeconds, 25200); // 7 hours of actual work
  assert.equal(formatDuration(netWorkSeconds), '07:00:00');
});

test('Task timer start and stop duration calculation', () => {
  const startTime = new Date('2026-09-24T10:00:00.000Z');
  const stopTime = new Date('2026-09-24T11:45:30.000Z');

  const duration = Math.floor((stopTime.getTime() - startTime.getTime()) / 1000);
  assert.equal(duration, 6330); // 1 hr 45 min 30 sec
  assert.equal(formatDuration(duration), '01:45:30');
});

test('Department navigation includes Time Tracker routes for HR and Management', () => {
  const adminUser = { role: 'admin', permissions: {} };

  const hrNav = getDepartmentNav(adminUser, 'hr');
  const hrTimeTracker = hrNav.find(item => item.path === '/admin/time-tracker');
  const hrTimeReports = hrNav.find(item => item.path === '/admin/time-reports');
  assert.ok(hrTimeTracker, 'HR department navigation must contain Time Tracker');
  assert.ok(hrTimeReports, 'HR department navigation must contain Time & Attendance');

  const mgmtNav = getDepartmentNav(adminUser, 'management');
  const mgmtTimeTracker = mgmtNav.find(item => item.path === '/admin/time-tracker');
  const mgmtTimeReports = mgmtNav.find(item => item.path === '/admin/time-reports');
  assert.ok(mgmtTimeTracker, 'Management department navigation must contain Time Tracker');
  assert.ok(mgmtTimeReports, 'Management department navigation must contain Staff Time Reports');
});

test('normalizeAdminPath properly resolves time tracking paths', () => {
  assert.equal(normalizeAdminPath('/admin/time-tracker'), '/admin/time-tracker');
  assert.equal(normalizeAdminPath('/admin/time-reports'), '/admin/time-reports');
});
