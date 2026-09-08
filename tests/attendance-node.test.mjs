import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

let state, reads;
const client = { from(table) {
  reads.push(table);
  let filters = [], limit = Infinity;
  const query = {
    select() { return query; },
    eq(key, value) { filters.push(row => row[key] === value); return query; },
    in(key, values) { filters.push(row => values.includes(row[key])); return query; },
    order() { return query; },
    limit(value) { limit = value; return query; },
    then(resolve, reject) { return Promise.resolve({ data: (state[table] || []).filter(row => filters.every(filter => filter(row))).slice(0, limit), error: table === state.failTable ? new Error('Database failure') : null }).then(resolve, reject); }
  };
  return query;
} };
mock.module('../lib/supabaseServer.js', { namedExports: { getSupabaseServerClient: () => client } });
const { default: handler } = await import('../pages/api/student/attendance.js');
const sessionId = '11111111-1111-4111-8111-111111111111';
const token = `${sessionId}.secret`;
const hash = bcrypt.hashSync('secret', 4);
function reset() {
  reads = [];
  state = {
    portal_sessions: [{ id: sessionId, role: 'student', cnic: '12345-1234567-1', token_hash: hash, expires_at: new Date(Date.now() + 60000).toISOString(), last_seen_at: new Date().toISOString() }],
    admissions: [{ id: 'mine', cnic: '12345-1234567-1', status: 'Active' }, { id: 'previous', cnic: '12345-1234567-1', status: 'Graduated' }, { id: 'other', cnic: '99999-9999999-9', status: 'Active' }],
    attendance: [{ id: 'a', student_id: 'mine', status: 'present', is_locked: false }, { id: 'b', student_id: 'previous', status: 'excused', is_locked: true }, { id: 'private', student_id: 'other', status: 'absent' }]
  };
}
async function request(auth = token, method = 'POST') {
  const res = { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method, headers: { authorization: auth ? `Bearer ${auth}` : '' }, body: { student_id: 'other', cnic: '99999-9999999-9' } }, res);
  return res;
}
test('student reads saved editable and locked attendance only for owned enrollments', async () => {
  reset();
  const res = await request();
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.data.records.map(row => row.id), ['a', 'b']);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  state.attendance[0].status = 'late';
  assert.equal((await request()).body.data.records[0].status, 'late');
});
test('missing, expired and wrong-role sessions cannot query attendance', async () => {
  reset(); assert.equal((await request('')).code, 401); assert.equal(reads.length, 0);
  reset(); state.portal_sessions[0].expires_at = '2000-01-01'; assert.equal((await request()).code, 401); assert.ok(!reads.includes('attendance'));
  reset(); state.portal_sessions[0].role = 'teacher'; assert.equal((await request()).code, 403); assert.ok(!reads.includes('admissions'));
});
test('empty attendance is distinct from a database failure or missing admission', async () => {
  reset(); state.attendance = []; assert.deepEqual((await request()).body.data.records, []);
  reset(); state.failTable = 'attendance'; assert.equal((await request()).code, 500);
  reset(); state.admissions = []; assert.equal((await request()).code, 403);
  reset(); assert.equal((await request(token, 'GET')).code, 405); assert.equal(reads.length, 0);
});
