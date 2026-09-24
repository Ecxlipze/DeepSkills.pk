import test from 'node:test';
import assert from 'node:assert/strict';
import { findCnicConflict, getCnicVariants, normalizeCnic } from '../lib/cnicServer.js';

// Build a mock database with custom table contents
function createMockDb(tables = {}) {
  return {
    from(table) {
      let filters = [];
      let limitCount = null;

      const q = {
        select() { return q; },
        eq(col, val) {
          filters.push(row => row[col] === val);
          return q;
        },
        neq(col, val) {
          filters.push(row => row[col] !== val);
          return q;
        },
        in(col, list) {
          filters.push(row => list.includes(row[col]));
          return q;
        },
        limit(n) {
          limitCount = n;
          return q;
        },
        maybeSingle() {
          const rows = (tables[table] || []).filter(r => filters.every(f => f(r)));
          return Promise.resolve({ data: rows[0] || null, error: null });
        },
        single() {
          const rows = (tables[table] || []).filter(r => filters.every(f => f(r)));
          return Promise.resolve({ data: rows[0] || null, error: null });
        },
        then(resolve, reject) {
          const rows = (tables[table] || []).filter(r => filters.every(f => f(r)));
          const data = limitCount ? rows.slice(0, limitCount) : rows;
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        }
      };
      return q;
    }
  };
}

test('CNIC formatting and variant generation', () => {
  assert.equal(normalizeCnic('3520112345671'), '35201-1234567-1');
  assert.equal(normalizeCnic('35201-1234567-1'), '35201-1234567-1');
  assert.equal(normalizeCnic('123'), '');

  const variants = getCnicVariants('35201-1234567-1');
  assert.ok(variants.includes('35201-1234567-1'));
  assert.ok(variants.includes('3520112345671'));
});

test('findCnicConflict: flags conflict when enrolling student with teacher CNIC', async () => {
  const db = createMockDb({
    teachers: [{ id: 't-1', name: 'Zeeshan Ali', cnic: '35201-1234567-1', email: 'zeeshan@example.com' }],
    users: [],
    admissions: [],
    allowed_cnics: [{ cnic: '35201-1234567-1', role: 'teacher', name: 'Zeeshan Ali' }]
  });

  const result = await findCnicConflict(db, '35201-1234567-1', {
    targetRole: 'student',
    studentName: 'Hamza Khan'
  });

  assert.equal(result.conflict, true);
  assert.equal(result.type, 'teacher');
  assert.match(result.message, /already registered to faculty instructor/);
});

test('findCnicConflict: flags conflict when enrolling student with staff CNIC', async () => {
  const db = createMockDb({
    teachers: [],
    users: [{ id: 'u-1', full_name: 'Sara Ahmed', cnic: '35201-7654321-1', role: 'admin' }],
    admissions: [],
    allowed_cnics: [{ cnic: '35201-7654321-1', role: 'admin', name: 'Sara Ahmed' }]
  });

  const result = await findCnicConflict(db, '35201-7654321-1', {
    targetRole: 'student',
    studentName: 'Hamza Khan'
  });

  assert.equal(result.conflict, true);
  assert.equal(result.type, 'staff');
  assert.match(result.message, /already registered to administrative staff/);
});

test('findCnicConflict: flags conflict when registering staff with student CNIC', async () => {
  const db = createMockDb({
    teachers: [],
    users: [],
    admissions: [{ id: 'adm-1', name: 'Bilal Tariq', cnic: '35201-9999999-1', status: 'Active' }],
    allowed_cnics: [{ cnic: '35201-9999999-1', role: 'student', name: 'Bilal Tariq' }]
  });

  const result = await findCnicConflict(db, '35201-9999999-1', {
    targetRole: 'staff'
  });

  assert.equal(result.conflict, true);
  assert.equal(result.type, 'student');
  assert.match(result.message, /already registered to student/);
});

test('findCnicConflict: flags conflict when registering teacher with student CNIC', async () => {
  const db = createMockDb({
    teachers: [],
    users: [],
    admissions: [{ id: 'adm-1', name: 'Usman Ghani', cnic: '35201-8888888-1', status: 'Active' }],
    allowed_cnics: [{ cnic: '35201-8888888-1', role: 'student', name: 'Usman Ghani' }]
  });

  const result = await findCnicConflict(db, '35201-8888888-1', {
    targetRole: 'teacher'
  });

  assert.equal(result.conflict, true);
  assert.equal(result.type, 'student');
  assert.match(result.message, /already registered to student/);
});

test('findCnicConflict: flags conflict when different person tries to enroll with an existing student CNIC', async () => {
  const db = createMockDb({
    teachers: [],
    users: [],
    admissions: [{ id: 'adm-1', name: 'Original Student', cnic: '35201-5555555-1', status: 'Active' }],
    allowed_cnics: [{ cnic: '35201-5555555-1', role: 'student', name: 'Original Student' }]
  });

  const result = await findCnicConflict(db, '35201-5555555-1', {
    targetRole: 'student',
    studentName: 'Completely Different Name'
  });

  assert.equal(result.conflict, true);
  assert.equal(result.code, 'CNIC_STUDENT_IDENTITY_MISMATCH');
  assert.match(result.message, /Two different individuals cannot share the same CNIC/);
});

test('findCnicConflict: permits re-enrollment for the SAME student taking another course', async () => {
  const db = createMockDb({
    teachers: [],
    users: [],
    admissions: [{ id: 'adm-1', name: 'Ali Raza', cnic: '35201-3333333-1', status: 'Active' }],
    allowed_cnics: [{ cnic: '35201-3333333-1', role: 'student', name: 'Ali Raza' }]
  });

  const result = await findCnicConflict(db, '35201-3333333-1', {
    targetRole: 'student',
    studentName: 'Ali Raza'
  });

  assert.equal(result.conflict, false);
  assert.equal(result.available, true);
});

test('findCnicConflict: returns available for a brand new unique CNIC', async () => {
  const db = createMockDb({
    teachers: [],
    users: [],
    admissions: [],
    allowed_cnics: []
  });

  const result = await findCnicConflict(db, '35201-0000000-1', {
    targetRole: 'teacher'
  });

  assert.equal(result.conflict, false);
  assert.equal(result.available, true);
});
