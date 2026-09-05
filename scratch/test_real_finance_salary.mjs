import assert from 'node:assert';
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { canAccess } from '../src/utils/permissions.js';
import payTeacherHandler from '../pages/api/admin/finance/pay-teacher.js';
import transactionsHandler from '../pages/api/admin/finance/transactions.js';

console.log('=== REAL TEACHER SALARY PAYMENT WORKFLOW VERIFICATION ===\n');

// 1. Load Environment & Initialize Supabase Service Role Client
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
}
Object.assign(process.env, env);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.REACT_APP_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failedTests++;
  }
}

// Helper to simulate Next.js API route calls
function mockApiCall(handler, { method = 'POST', headers = {}, body = {}, query = {} } = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const resHeaders = {};
    const res = {
      setHeader(name, value) {
        resHeaders[name.toLowerCase()] = value;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: statusCode, headers: resHeaders, body: data });
      },
      send(data) {
        resolve({ status: statusCode, headers: resHeaders, body: data });
      }
    };

    const req = {
      method,
      headers: Object.keys(headers).reduce((acc, k) => {
        acc[k.toLowerCase()] = headers[k];
        return acc;
      }, {}),
      body,
      query
    };

    handler(req, res).catch((err) => {
      resolve({ status: 500, headers: resHeaders, body: { status: 'error', message: err.message } });
    });
  });
}

// Test State
const TEST_CNIC = '88888-8888888-8';
const TEST_MONTH = '2099-08';
let testRoleId = null;
let testUserId = null;
let testSessionId = null;
let testSessionToken = null;
let testAdminSessionId = null;
let testAdminSessionToken = null;
let teacher = null;
let testTeacherPaymentId = null;

try {
  // Setup: Find an existing teacher
  const { data: teachers, error: tErr } = await supabase.from('teachers').select('id, name').limit(1);
  assert.ifError(tErr);
  assert.ok(teachers && teachers.length > 0, 'At least one teacher must exist in DB');
  teacher = teachers[0];

  // Clean pre-existing test records for safety
  await supabase.from('teacher_payments').delete().eq('month', TEST_MONTH);
  await supabase.from('portal_sessions').delete().eq('cnic', TEST_CNIC);
  await supabase.from('users').delete().eq('cnic', TEST_CNIC);
  await supabase.from('allowed_cnics').delete().eq('cnic', TEST_CNIC);

  // 1. Create a custom role with finance: 'view'
  const { data: roleData, error: rErr } = await supabase
    .from('custom_roles')
    .insert({
      name: 'Test Finance Officer',
      permissions: { finance: 'view' }
    })
    .select()
    .single();
  assert.ifError(rErr);
  testRoleId = roleData.id;

  // 2. Create staff user linked to that role
  const { data: userData, error: uErr } = await supabase
    .from('users')
    .insert({
      cnic: TEST_CNIC,
      full_name: 'Test Finance Staff',
      email: 'finance-test@deepskills.test',
      role: 'custom',
      custom_role_id: testRoleId,
      status: 'active'
    })
    .select()
    .single();
  assert.ifError(uErr);
  testUserId = userData.id;

  // 3. Create allowed_cnics record
  await supabase.from('allowed_cnics').insert({
    cnic: TEST_CNIC,
    role: 'custom',
    is_active: true
  });

  // 4. Generate real portal session for custom finance staff
  const rawSecret = crypto.randomBytes(32).toString('hex');
  const tokenHash = bcrypt.hashSync(rawSecret, 10);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: sessionData, error: sErr } = await supabase
    .from('portal_sessions')
    .insert({
      cnic: TEST_CNIC,
      role: 'custom',
      token_hash: tokenHash,
      expires_at: expiresAt
    })
    .select()
    .single();
  assert.ifError(sErr);
  testSessionId = sessionData.id;
  testSessionToken = `${sessionData.id}.${rawSecret}`;

  // 5. Generate real portal session for admin user
  const adminSecret = crypto.randomBytes(32).toString('hex');
  const adminHash = bcrypt.hashSync(adminSecret, 10);
  const { data: adminSessionData, error: asErr } = await supabase
    .from('portal_sessions')
    .insert({
      cnic: '00000-0000000-0',
      role: 'admin',
      token_hash: adminHash,
      expires_at: expiresAt
    })
    .select()
    .single();
  assert.ifError(asErr);
  testAdminSessionId = adminSessionData.id;
  testAdminSessionToken = `${adminSessionData.id}.${adminSecret}`;

  // -------------------------------------------------------------
  // TEST CASE A: finance:view
  // -------------------------------------------------------------
  await test('Case A.1: finance:view UI mutation check is blocked', () => {
    const user = { role: 'custom', permissions: { finance: 'view' } };
    const canMutate = user.role === 'admin' || canAccess(user.permissions, 'finance', 'full');
    assert.strictEqual(canMutate, false, 'finance:view user must not have mutation rights in UI');
  });

  await test('Case A.2: pay-teacher endpoint rejects finance:view staff with 403', async () => {
    const res = await mockApiCall(payTeacherHandler, {
      method: 'POST',
      headers: { Authorization: `Bearer ${testSessionToken}` },
      body: {
        teacherId: teacher.id,
        amount: 80000,
        month: TEST_MONTH,
        paidDate: '2099-08-01',
        method: 'bank_transfer',
        reference: 'TXN-VIEW-ATTEMPT'
      }
    });

    assert.strictEqual(res.status, 403, `Expected HTTP 403, got ${res.status}`);
    assert.strictEqual(res.body.status, 'error');
    assert.ok(res.body.message.includes('Insufficient permissions'), 'Message must indicate insufficient permissions');

    // Confirm no record was created in teacher_payments
    const { data: rows } = await supabase
      .from('teacher_payments')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('month', TEST_MONTH);
    assert.strictEqual(rows.length, 0, 'No payment record must be created on 403');
  });

  // -------------------------------------------------------------
  // TEST CASE B: finance:full
  // -------------------------------------------------------------
  await test('Case B.1: Upgrade staff permissions to finance:full and verify UI check allows mutation', async () => {
    const { error: upErr } = await supabase
      .from('custom_roles')
      .update({ permissions: { finance: 'full' } })
      .eq('id', testRoleId);
    assert.ifError(upErr);

    const user = { role: 'custom', permissions: { finance: 'full' } };
    const canMutate = user.role === 'admin' || canAccess(user.permissions, 'finance', 'full');
    assert.strictEqual(canMutate, true, 'finance:full user must have mutation rights in UI');
  });

  await test('Case B.2: pay-teacher endpoint succeeds for finance:full staff', async () => {
    const res = await mockApiCall(payTeacherHandler, {
      method: 'POST',
      headers: { Authorization: `Bearer ${testSessionToken}` },
      body: {
        teacherId: teacher.id,
        amount: 85000,
        month: TEST_MONTH,
        paidDate: '2099-08-05',
        method: 'bank_transfer',
        reference: 'TXN-FULL-001',
        notes: 'Monthly faculty salary'
      }
    });

    assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status} (${JSON.stringify(res.body)})`);
    assert.strictEqual(res.body.status, 'success');
    assert.ok(res.body.data?.id, 'Response must include inserted record data with id');
    testTeacherPaymentId = res.body.data.id;

    // Verify record in teacher_payments
    const { data: record, error: recErr } = await supabase
      .from('teacher_payments')
      .select('*')
      .eq('id', testTeacherPaymentId)
      .single();

    assert.ifError(recErr);
    assert.strictEqual(record.teacher_id, teacher.id, 'teacher_id must match');
    assert.strictEqual(Number(record.amount), 85000, 'amount must match');
    assert.strictEqual(record.month, TEST_MONTH, 'month must match');
    assert.strictEqual(record.paid_on, '2099-08-05', 'paid_on must match');
    assert.strictEqual(record.method, 'bank_transfer', 'method must match');
    assert.strictEqual(record.reference, 'TXN-FULL-001', 'reference must match');
    assert.strictEqual(record.notes, 'Monthly faculty salary', 'notes must match');
    assert.strictEqual(record.status, 'Paid', 'status must be Paid');
  });

  await test('Case B.3: Duplicate payment for same teacher and month is rejected with 409 Conflict', async () => {
    const res = await mockApiCall(payTeacherHandler, {
      method: 'POST',
      headers: { Authorization: `Bearer ${testSessionToken}` },
      body: {
        teacherId: teacher.id,
        amount: 85000,
        month: TEST_MONTH,
        paidDate: '2099-08-05',
        method: 'bank_transfer',
        reference: 'TXN-DUPLICATE'
      }
    });

    assert.strictEqual(res.status, 409, `Expected HTTP 409 Conflict, got ${res.status}`);
    assert.strictEqual(res.body.status, 'error');
    assert.ok(
      res.body.message.includes('already been recorded'),
      `Error message should state already recorded, got: ${res.body.message}`
    );
  });

  await test('Case B.4: TransactionHistory visibility and search by teacher name', async () => {
    const res = await mockApiCall(transactionsHandler, {
      method: 'GET',
      headers: { Authorization: `Bearer ${testSessionToken}` }
    });

    assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    assert.strictEqual(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data?.transactions), 'Transactions must be an array');

    const txns = res.body.data.transactions;
    // Find our test salary payment
    const salaryTxn = txns.find(t => t.id === testTeacherPaymentId);
    assert.ok(salaryTxn, 'Newly recorded teacher salary must appear in transactions ledger');
    assert.strictEqual(salaryTxn.entity_type, 'teacher', 'entity_type must be teacher');
    assert.strictEqual(salaryTxn.amount, 85000, 'amount must be 85000');
    assert.strictEqual(salaryTxn.teacher_name, teacher.name, 'teacher_name must match teacher');
    assert.strictEqual(salaryTxn.paid_date, '2099-08-05', 'paid_date must match');
    assert.ok(salaryTxn.description.includes(teacher.name), 'description must contain teacher name');

    // Verify search matching
    const search = teacher.name.toLowerCase();
    const matched = txns.filter(t =>
      t.description?.toLowerCase().includes(search) ||
      t.teacher_name?.toLowerCase().includes(search) ||
      t.person_name?.toLowerCase().includes(search)
    );
    assert.ok(matched.length > 0, `Search by '${teacher.name}' must return transactions`);
    assert.ok(matched.some(t => t.id === testTeacherPaymentId), 'Matched search must include test salary');

    // Verify summary totals include outflow
    assert.ok(res.body.data.summary.totalOut >= 85000, 'totalOut must include teacher salary outflow');
  });

  // -------------------------------------------------------------
  // TEST CASE C: Super Admin
  // -------------------------------------------------------------
  await test('Case C: Super Admin portal session can submit salary payment', async () => {
    const adminMonth = '2099-09';
    await supabase.from('teacher_payments').delete().eq('month', adminMonth);

    const res = await mockApiCall(payTeacherHandler, {
      method: 'POST',
      headers: { Authorization: `Bearer ${testAdminSessionToken}` },
      body: {
        teacherId: teacher.id,
        amount: 90000,
        month: adminMonth,
        paidDate: '2099-09-01',
        method: 'online',
        reference: 'TXN-ADMIN-001'
      }
    });

    assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    assert.strictEqual(res.body.status, 'success');

    // Verify record in teacher_payments
    const { data: adminRecord } = await supabase
      .from('teacher_payments')
      .select('*')
      .eq('id', res.body.data.id)
      .single();

    assert.strictEqual(Number(adminRecord.amount), 90000);
    assert.strictEqual(adminRecord.month, adminMonth);

    // Clean up admin test record
    await supabase.from('teacher_payments').delete().eq('id', res.body.data.id);
  });

  // -------------------------------------------------------------
  // ATOMICITY & SINGLE-SOURCE CONSTRAINT VERIFICATION
  // -------------------------------------------------------------
  await test('Constraint Check: payments table strictly rejects teacher UUID due to FK constraint', async () => {
    const { data, error } = await supabase.from('payments').insert({
      entity_id: teacher.id,
      entity_type: 'teacher',
      amount: 1000,
      paid_date: '2099-08-01',
      status: 'paid'
    });

    assert.ok(error, 'Inserting teacher ID into payments must produce an error');
    assert.strictEqual(error.code, '23503', 'Must violate foreign key constraint 23503');
    assert.ok(
      error.message.includes('payments_entity_id_fkey') || error.details.includes('admissions'),
      'Must reference payments_entity_id_fkey / admissions'
    );
  });

} finally {
  // Teardown: Clean up all test data
  console.log('\n--- Cleaning up test records ---');
  if (testTeacherPaymentId) {
    await supabase.from('teacher_payments').delete().eq('id', testTeacherPaymentId);
  }
  await supabase.from('teacher_payments').delete().eq('month', TEST_MONTH);
  await supabase.from('teacher_payments').delete().eq('month', '2099-09');

  if (testSessionId) {
    await supabase.from('portal_sessions').delete().eq('id', testSessionId);
  }
  if (testAdminSessionId) {
    await supabase.from('portal_sessions').delete().eq('id', testAdminSessionId);
  }
  await supabase.from('portal_sessions').delete().eq('cnic', TEST_CNIC);
  await supabase.from('allowed_cnics').delete().eq('cnic', TEST_CNIC);
  if (testUserId) {
    await supabase.from('users').delete().eq('id', testUserId);
  }
  if (testRoleId) {
    await supabase.from('custom_roles').delete().eq('id', testRoleId);
  }

  const { data: remTp } = await supabase.from('teacher_payments').select('id').in('month', [TEST_MONTH, '2099-09']);
  const { data: remSess } = await supabase.from('portal_sessions').select('id').eq('cnic', TEST_CNIC);
  const { data: remUsers } = await supabase.from('users').select('id').eq('cnic', TEST_CNIC);

  assert.strictEqual(remTp.length, 0, 'No test teacher_payments should remain in DB');
  assert.strictEqual(remSess.length, 0, 'No test portal_sessions should remain in DB');
  assert.strictEqual(remUsers.length, 0, 'No test users should remain in DB');
  console.log('✅ Teardown complete: 0 test records remain.');
}

console.log(`\n=========================================`);
console.log(`Summary: ${passedTests} passed, ${failedTests} failed`);
console.log(`=========================================`);

if (failedTests > 0) {
  process.exit(1);
}
