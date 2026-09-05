import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { calcResult } from '../src/utils/resultUtils.js';

console.log('=== TARGETED RESULTS REPAIR LIVE VERIFICATION ===\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// 1. Verify Backup Integrity
test('1. Backup file exists and has complete pre-repair records', () => {
  const backupPath = path.resolve('scratch/backup_results_pre_repair.json');
  assert.ok(fs.existsSync(backupPath), 'Backup file must exist');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  assert.strictEqual(backup.total_rows, 2, 'Backup must contain 2 rows');
  assert.ok(backup.backup_created_at, 'Backup must have timestamp');
  for (const row of backup.rows) {
    assert.ok(row.id, 'Row must have ID');
    assert.ok(row.student_id, 'Row must have student_id');
    assert.ok(row.batch_id, 'Row must have batch_id');
    assert.ok(row.exam_type, 'Row must have exam_type');
  }
});

// 2. Load Supabase
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.REACT_APP_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// 3. Live Database Verification
await asyncTest('2. Live results table has exactly 2 rows with identity preserved', async () => {
  const { data: rows, error } = await supabase.from('results').select('*').order('exam_type', { ascending: true });
  assert.ifError(error);
  assert.strictEqual(rows.length, 2, 'Results table must have exactly 2 rows');

  const backup = JSON.parse(fs.readFileSync('scratch/backup_results_pre_repair.json', 'utf8'));
  const backupIds = new Set(backup.rows.map(r => r.id));
  for (const row of rows) {
    assert.ok(backupIds.has(row.id), `Row ID ${row.id} must match pre-repair backup`);
  }
});

await asyncTest('3. Live results reflect corrected calculation (no 10x bug)', async () => {
  const { data: rows, error } = await supabase.from('results').select('*');
  assert.ifError(error);

  const midterm = rows.find(r => r.exam_type === 'midterm');
  const finalterm = rows.find(r => r.exam_type === 'finalterm');

  assert.ok(midterm, 'Midterm row must exist');
  assert.strictEqual(Number(midterm.attendance_marks), 20, `Midterm attendance should be 20, got ${midterm.attendance_marks}`);
  assert.strictEqual(Number(midterm.total_marks), 20, `Midterm total should be 20, got ${midterm.total_marks}`);
  assert.strictEqual(midterm.grade, 'F', 'Midterm grade should be F');
  assert.strictEqual(midterm.batch_rank, 1, 'Midterm rank should be 1');

  assert.ok(finalterm, 'Finalterm row must exist');
  assert.strictEqual(Number(finalterm.attendance_marks), 15, `Finalterm attendance should be 15, got ${finalterm.attendance_marks}`);
  assert.strictEqual(Number(finalterm.total_marks), 15, `Finalterm total should be 15, got ${finalterm.total_marks}`);
  assert.strictEqual(finalterm.grade, 'F', 'Finalterm grade should be F');
  assert.strictEqual(finalterm.batch_rank, 1, 'Finalterm rank should be 1');
});

// 4. Mathematical Spot Checks
test('4. Spot check: high-performing, average, failing, partial, absences', () => {
  // High-performing
  const highAtt = Array(5).fill({ status: 'present' });
  const highTasks = [
    { category: 'Assignment', marksObtained: 95, totalMarks: 100, status: 'Submitted' },
    { category: 'Quiz', marksObtained: 90, totalMarks: 100, status: 'Submitted' },
    { category: 'Task', marksObtained: 100, totalMarks: 100, status: 'Submitted' }
  ];
  const high = calcResult(highAtt, highTasks, 'midterm');
  assert.strictEqual(high.total, 95.5);
  assert.strictEqual(high.grade, 'A+');
  assert.strictEqual(high.passed, true);

  // Average
  const avgAtt = [...Array(4).fill({ status: 'present' }), { status: 'absent' }];
  const avgTasks = [
    { category: 'Assignment', marksObtained: 70, totalMarks: 100, status: 'Submitted' },
    { category: 'Quiz', marksObtained: 65, totalMarks: 100, status: 'Submitted' },
    { category: 'Task', marksObtained: 80, totalMarks: 100, status: 'Submitted' }
  ];
  const avg = calcResult(avgAtt, avgTasks, 'midterm');
  assert.strictEqual(avg.total, 76.5);
  assert.strictEqual(avg.grade, 'B');
  assert.strictEqual(avg.passed, true);

  // Failing
  const failAtt = [{ status: 'present' }, ...Array(4).fill({ status: 'absent' })];
  const fail = calcResult(failAtt, [], 'midterm');
  assert.strictEqual(fail.total, 4);
  assert.strictEqual(fail.grade, 'F');
  assert.strictEqual(fail.passed, false);
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('🎉 ALL RESULTS REPAIR VERIFICATIONS PASSED!\n');
}
