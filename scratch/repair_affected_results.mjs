import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { calcResult } from '../src/utils/resultUtils.js';

console.log('=== EXECUTING SAFE PRODUCTION RESULTS REPAIR ===\n');

// 1. Safety Check: Verify Backup Exists
const backupPath = path.resolve('scratch/backup_results_pre_repair.json');
if (!fs.existsSync(backupPath)) {
  console.error('FATAL: Pre-repair backup not found at', backupPath);
  process.exit(1);
}
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
console.log(`[Safety] Pre-repair backup verified: ${backupData.total_rows} rows stored at ${backupData.backup_created_at}`);

// 2. Load Service Role Credentials
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.REACT_APP_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('FATAL: Supabase configuration missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  // 3. Fetch existing results
  const { data: existingRows, error: fetchErr } = await supabase
    .from('results')
    .select('*')
    .order('id', { ascending: true });

  if (fetchErr || !existingRows) {
    console.error('Failed to fetch results:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${existingRows.length} total result row(s) in database.\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  const affectedGroups = new Set();
  const repairAuditLog = [];

  for (const row of existingRows) {
    // Determine student info
    const { data: student, error: sErr } = await supabase
      .from('admissions')
      .select('id, batch, cnic')
      .eq('id', row.student_id)
      .single();

    if (sErr || !student) {
      console.warn(`[Skip] Student ${row.student_id} not found in admissions. Skipping row ${row.id}.`);
      skippedCount++;
      continue;
    }

    // Fetch student data for recalculation
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', row.student_id);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('batch', student.batch);

    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('cnic', student.cnic);

    // Merge tasks and submissions exactly as computeAndCacheResult does
    const mergedTasks = (tasks || []).map((t) => {
      const sub = (submissions || []).find((s) => s.task_id === t.id);
      return {
        ...t,
        category: t.category,
        totalMarks: t.total_marks,
        marksObtained: sub ? sub.marks_obtained : null,
        status: sub ? sub.status : 'not_assigned'
      };
    });

    // Run production calculation logic
    const recomputed = calcResult(attendance || [], mergedTasks, row.exam_type);

    // Check if row is affected
    const storedTotal = Number(row.total_marks);
    const newTotal = Number(recomputed.total);
    const storedAttendance = Number(row.attendance_marks);
    const newAttendance = Number(recomputed.breakdown.attendance);

    const isAffected = (
      Math.abs(storedTotal - newTotal) > 0.05 ||
      Math.abs(storedAttendance - newAttendance) > 0.05
    );

    if (!isAffected) {
      console.log(`[Unchanged] Result ${row.id} (${row.exam_type}) total ${storedTotal} is already correct.`);
      skippedCount++;
      continue;
    }

    console.log(`[Repairing] Result ${row.id}:`);
    console.log(`   Exam: ${row.exam_type} | Batch: ${row.batch_id}`);
    console.log(`   Attendance: ${storedAttendance} -> ${newAttendance}`);
    console.log(`   Total Marks: ${storedTotal} -> ${newTotal}`);
    console.log(`   Grade: ${row.grade} -> ${recomputed.grade}`);
    console.log(`   Passed: ${row.passed} -> ${recomputed.passed}`);

    // Update the row preserving identity (id)
    const { error: updateErr } = await supabase
      .from('results')
      .update({
        attendance_marks: recomputed.breakdown.attendance,
        assignment_marks: recomputed.breakdown.assignment,
        quiz_marks: recomputed.breakdown.quiz,
        task_completion_marks: recomputed.breakdown.taskCompletion,
        project_marks: recomputed.breakdown.project,
        total_marks: recomputed.total,
        grade: recomputed.grade,
        remarks: recomputed.remarks,
        passed: recomputed.passed,
        computed_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (updateErr) {
      console.error(`Failed to update result ${row.id}:`, updateErr);
      process.exit(1);
    }

    repairAuditLog.push({
      result_id: row.id,
      student_id: row.student_id,
      batch_id: row.batch_id,
      exam_type: row.exam_type,
      before: {
        total: storedTotal,
        attendance: storedAttendance,
        grade: row.grade,
        passed: row.passed
      },
      after: {
        total: newTotal,
        attendance: newAttendance,
        grade: recomputed.grade,
        passed: recomputed.passed
      }
    });

    updatedCount++;
    affectedGroups.add(JSON.stringify({ batch_id: row.batch_id, exam_type: row.exam_type }));
  }

  // 4. Update Batch Rankings ONCE per affected (batch_id, exam_type)
  console.log(`\n[Ranks] Recomputing batch ranks for ${affectedGroups.size} group(s)...`);
  for (const groupStr of affectedGroups) {
    const { batch_id, exam_type } = JSON.parse(groupStr);
    console.log(`   Updating ranks for batch "${batch_id}", exam "${exam_type}"...`);

    const { data: batchResults, error: rErr } = await supabase
      .from('results')
      .select('id, total_marks')
      .eq('batch_id', batch_id)
      .eq('exam_type', exam_type)
      .order('total_marks', { ascending: false });

    if (rErr) {
      console.error('Failed to fetch batch results for ranking:', rErr);
      continue;
    }

    if (batchResults) {
      for (let i = 0; i < batchResults.length; i++) {
        const item = batchResults[i];
        const newRank = i + 1;
        await supabase
          .from('results')
          .update({ batch_rank: newRank })
          .eq('id', item.id);
      }
    }
  }

  console.log('\n=== REPAIR COMPLETE ===');
  console.log(`Rows updated: ${updatedCount}`);
  console.log(`Rows skipped: ${skippedCount}`);
  console.log(`Batch/exam ranking groups recomputed: ${affectedGroups.size}`);

  fs.writeFileSync('scratch/repair_audit_log.json', JSON.stringify(repairAuditLog, null, 2));
}

main().catch((err) => {
  console.error('Repair failed with exception:', err);
  process.exit(1);
});
