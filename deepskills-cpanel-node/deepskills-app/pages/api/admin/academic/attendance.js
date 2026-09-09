import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation, normalizeCnic } from '../../../../lib/portalAuthServer.js';
import { computeAndCacheResult } from '../../../../src/utils/resultUtils.js';

export default async function handler(req, res) {
  // CORS & Methods
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  // Authorize Admin
  const auth = await authorizeAdminOperation(req, 'attendance');
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  // ──────────────────────────────────────────
  // GET: Fetch Attendance Data, Matrix, Stats
  // ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { month, batch_id, date } = req.query;
      const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
      const targetDate = date || new Date().toISOString().slice(0, 10);

      // Date range for the requested month
      const startDate = `${targetMonth}-01`;
      const nextMonthDate = new Date(startDate);
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
      const endDate = nextMonthDate.toISOString().slice(0, 10);

      // 1. Fetch Batches
      const { data: batches, error: bErr } = await supabase
        .from('batches')
        .select('*')
        .order('batch_name', { ascending: true });
      if (bErr) throw bErr;

      // 2. Fetch Active Admissions
      let admQuery = supabase
        .from('admissions')
        .select('id, name, cnic, phone, email, course, batch, batch_timing, status')
        .in('status', ['Active', 'Graduated'])
        .order('name', { ascending: true });
      
      const { data: admissions, error: aErr } = await admQuery;
      if (aErr) throw aErr;

      // 3. Fetch Monthly Attendance Logs
      let attQuery = supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lt('date', endDate);

      if (batch_id) {
        attQuery = attQuery.eq('batch_id', batch_id);
      }

      const { data: attendanceLogs, error: attErr } = await attQuery;
      if (attErr) throw attErr;

      // Filter admissions if batch_id is specified
      const currentBatch = batches?.find(b => b.id === batch_id || b.batch_name === batch_id);
      const relevantAdmissions = admissions?.filter(s => {
        if (!batch_id) return true;
        return s.batch === currentBatch?.batch_name || s.batch === batch_id;
      }) || [];

      // 4. Compute Student Stats & Defaulters
      const studentMap = {};
      relevantAdmissions.forEach(student => {
        studentMap[student.id] = {
          id: student.id,
          name: student.name,
          cnic: student.cnic,
          phone: student.phone,
          email: student.email,
          course: student.course,
          batch: student.batch,
          photo_url: student.photo_url,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
          total: 0,
          pct: 0,
          lastDate: '',
          lastStatus: ''
        };
      });

      (attendanceLogs || []).forEach(record => {
        let student = studentMap[record.student_id];
        if (!student && !batch_id) {
          student = {
            id: record.student_id,
            name: record.student_name || 'Student',
            cnic: record.student_cnic || '—',
            phone: '—',
            course: record.course,
            batch: record.batch_name,
            present: 0, late: 0, absent: 0, excused: 0, total: 0, pct: 0,
            lastDate: '', lastStatus: ''
          };
          studentMap[record.student_id] = student;
        }

        if (student) {
          student.total += 1;
          if (record.status === 'present') student.present += 1;
          else if (record.status === 'late') student.late += 1;
          else if (record.status === 'absent') student.absent += 1;
          else if (record.status === 'excused') student.excused += 1;

          if (!student.lastDate || record.date.localeCompare(student.lastDate) > 0) {
            student.lastDate = record.date;
            student.lastStatus = record.status;
          }
        }
      });

      const studentStatsList = Object.values(studentMap).map(s => {
        const attended = s.present + s.late;
        const pct = s.total > 0 ? Math.round((attended / s.total) * 100) : 100;
        return { ...s, pct };
      });

      // Defaulters (< 75% attendance)
      const defaulters = studentStatsList
        .filter(s => s.total > 0 && s.pct < 75)
        .sort((a, b) => a.pct - b.pct);

      // 5. Group Sessions
      const sessionsMap = {};
      (attendanceLogs || []).forEach(r => {
        const key = `${r.date}_${r.batch_id || r.batch_name}`;
        if (!sessionsMap[key]) {
          sessionsMap[key] = {
            key,
            date: r.date,
            day: r.day_of_week,
            batchId: r.batch_id,
            batch: r.batch_name,
            course: r.course,
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
            total: 0,
            lockedCount: 0,
            isLocked: true
          };
        }
        sessionsMap[key].total += 1;
        if (r.status === 'present') sessionsMap[key].present += 1;
        else if (r.status === 'late') sessionsMap[key].late += 1;
        else if (r.status === 'absent') sessionsMap[key].absent += 1;
        else if (r.status === 'excused') sessionsMap[key].excused += 1;
        if (r.is_locked) sessionsMap[key].lockedCount += 1;
        sessionsMap[key].isLocked = sessionsMap[key].lockedCount === sessionsMap[key].total;
      });

      const sessions = Object.values(sessionsMap).map(s => ({
        ...s,
        rate: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0
      })).sort((a, b) => b.date.localeCompare(a.date));

      // 6. Build Daily Bulk Sheet Data (for selected date and batch)
      let dailySheet = null;
      if (batch_id) {
        const { data: dateRecords } = await supabase
          .from('attendance')
          .select('*')
          .eq('date', targetDate)
          .eq('batch_id', batch_id);

        const dateRecordMap = {};
        (dateRecords || []).forEach(r => {
          dateRecordMap[r.student_id] = r;
        });

        const sheetStudents = relevantAdmissions.map(st => {
          const rec = dateRecordMap[st.id];
          const hist = studentMap[st.id];
          return {
            student_id: st.id,
            student_name: st.name,
            student_cnic: st.cnic,
            phone: st.phone,
            photo_url: st.photo_url,
            status: rec?.status || 'unmarked',
            reason: rec?.absence_reason || '',
            is_locked: Boolean(rec?.is_locked),
            attendance_id: rec?.id || null,
            history_pct: hist?.pct ?? 100
          };
        });

        const isSessionLocked = dateRecords?.length > 0 && dateRecords.every(r => r.is_locked);

        dailySheet = {
          date: targetDate,
          batch_id,
          batch_name: currentBatch?.batch_name || '',
          course: currentBatch?.course || '',
          isLocked: isSessionLocked,
          students: sheetStudents
        };
      }

      // Summary Telemetry
      const totalAttended = studentStatsList.reduce((acc, s) => acc + (s.present + s.late), 0);
      const totalPossible = studentStatsList.reduce((acc, s) => acc + s.total, 0);
      const overallRate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;

      return res.status(200).json({
        status: 'success',
        data: {
          batches: batches || [],
          admissions: relevantAdmissions,
          sessions,
          students: studentStatsList,
          defaulters,
          stats: {
            overallRate,
            totalSessions: sessions.length,
            atRiskCount: defaulters.length,
            perfectCount: studentStatsList.filter(s => s.total > 0 && s.pct === 100).length,
            totalRecords: attendanceLogs?.length || 0,
            activeStudents: relevantAdmissions.length
          },
          dailySheet
        }
      });
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'Failed to load attendance.' });
    }
  }

  // ──────────────────────────────────────────
  // POST: Bulk Save, Kiosk Check-In, Lock, Warning
  // ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { action } = req.body || {};

    // Action 1: Save Bulk Daily Attendance Register
    if (action === 'save_bulk') {
      const { batch_id, date, records = [], is_locked = false } = req.body;
      if (!batch_id || !date || !Array.isArray(records)) {
        return res.status(400).json({ status: 'error', message: 'Missing batch_id, date, or records.' });
      }

      try {
        // Fetch batch info
        const { data: batch, error: bErr } = await supabase
          .from('batches')
          .select('id, batch_name, course')
          .eq('id', batch_id)
          .single();
        if (bErr) throw bErr;

        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const now = new Date().toISOString();

        const rows = records
          .filter(r => r.status && r.status !== 'unmarked')
          .map(r => ({
            student_id: r.student_id,
            student_name: r.student_name,
            student_cnic: r.student_cnic,
            batch_id,
            batch_name: batch.batch_name,
            course: batch.course,
            date,
            day_of_week: dayOfWeek,
            status: r.status,
            marked_by: 'admin',
            marked_at: now,
            absence_reason: r.reason ? String(r.reason).trim() : null,
            is_locked: Boolean(is_locked)
          }));

        if (rows.length === 0) {
          return res.status(400).json({ status: 'error', message: 'No valid attendance marks to save.' });
        }

        const { data: upserted, error: upErr } = await supabase
          .from('attendance')
          .upsert(rows, { onConflict: 'student_id,batch_id,date' })
          .select();

        if (upErr) throw upErr;

        // Recalculate results & notify asynchronously
        (async () => {
          for (const row of rows) {
            try {
              await computeAndCacheResult(row.student_id, 'midterm', { updateRanks: false });
              await computeAndCacheResult(row.student_id, 'finalterm', { updateRanks: false });
            } catch (_) {}
          }
        })();

        return res.status(200).json({
          status: 'success',
          message: `Saved attendance for ${rows.length} students.`,
          data: upserted
        });
      } catch (err) {
        console.error('Error saving bulk attendance:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to save bulk attendance.' });
      }
    }

    // Action 2: Kiosk Check-In (by CNIC, Student ID, or QR Scan)
    if (action === 'kiosk_checkin') {
      const { identifier, batch_id, date = new Date().toISOString().slice(0, 10) } = req.body;
      if (!identifier) {
        return res.status(400).json({ status: 'error', message: 'Student CNIC or ID is required.' });
      }

      try {
        const cleanRaw = String(identifier).trim();
        const cleanCnic = normalizeCnic(cleanRaw);

        // Find Student
        let query = supabase
          .from('admissions')
          .select('*')
          .in('status', ['Active', 'Graduated']);

        if (cleanCnic) {
          query = query.or(`cnic.eq.${cleanCnic},id.eq.${cleanRaw}`);
        } else {
          query = query.or(`id.eq.${cleanRaw},cnic.ilike.%${cleanRaw}%`);
        }

        const { data: studentMatches, error: sErr } = await query.limit(1);
        if (sErr) throw sErr;

        const student = studentMatches && studentMatches[0];
        if (!student) {
          return res.status(404).json({ status: 'error', message: 'No active student found matching this identifier.' });
        }

        // Determine Batch
        let targetBatch = null;
        if (batch_id) {
          const { data: bData } = await supabase.from('batches').select('*').eq('id', batch_id).single();
          targetBatch = bData;
        } else if (student.batch) {
          const { data: bData } = await supabase
            .from('batches')
            .select('*')
            .eq('batch_name', student.batch)
            .eq('course', student.course)
            .limit(1);
          targetBatch = bData && bData[0];
        }

        const finalBatchId = targetBatch?.id || 'general';
        const finalBatchName = targetBatch?.batch_name || student.batch || 'General Batch';
        const finalCourse = targetBatch?.course || student.course || 'Training Program';

        // Check current time against batch schedule to determine 'present' vs 'late'
        let checkinStatus = 'present';
        const now = new Date();
        const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

        if (targetBatch?.time_shift) {
          const shiftLower = String(targetBatch.time_shift).toLowerCase();
          const match = shiftLower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/);
          if (match) {
            let hour = parseInt(match[1], 10);
            const minute = parseInt(match[2] || '0', 10);
            const ampm = match[3];
            if (ampm === 'pm' && hour < 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;

            const scheduleMins = hour * 60 + minute;
            const currentMins = now.getHours() * 60 + now.getMinutes();
            if (currentMins > scheduleMins + 15) {
              checkinStatus = 'late';
            }
          }
        }

        const checkinRow = {
          student_id: student.id,
          student_name: student.name,
          student_cnic: student.cnic,
          batch_id: finalBatchId,
          batch_name: finalBatchName,
          course: finalCourse,
          date,
          day_of_week: dayOfWeek,
          status: checkinStatus,
          marked_by: 'kiosk',
          marked_at: now.toISOString(),
          is_locked: false
        };

        const { data: saved, error: insErr } = await supabase
          .from('attendance')
          .upsert(checkinRow, { onConflict: 'student_id,batch_id,date' })
          .select()
          .single();

        if (insErr) throw insErr;

        return res.status(200).json({
          status: 'success',
          message: `${student.name} checked in successfully as ${checkinStatus.toUpperCase()}!`,
          data: {
            student: {
              id: student.id,
              name: student.name,
              cnic: student.cnic,
              course: finalCourse,
              batch: finalBatchName,
              photo_url: student.photo_url
            },
            record: saved,
            status: checkinStatus,
            timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        });
      } catch (err) {
        console.error('Error in kiosk check-in:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Check-in failed.' });
      }
    }

    // Action 3: Toggle Lock / Unlock Session
    if (action === 'toggle_lock') {
      const { date, batch_id, is_locked } = req.body;
      if (!date || !batch_id) {
        return res.status(400).json({ status: 'error', message: 'Date and batch_id are required.' });
      }

      try {
        const { error } = await supabase
          .from('attendance')
          .update({ is_locked: Boolean(is_locked) })
          .eq('date', date)
          .eq('batch_id', batch_id);

        if (error) throw error;

        return res.status(200).json({
          status: 'success',
          message: `Attendance for ${date} has been ${is_locked ? 'locked' : 'unlocked'}.`
        });
      } catch (err) {
        console.error('Error toggling lock:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to update lock.' });
      }
    }

    // Action 4: Send Low-Attendance Warning (In-App & WhatsApp Generator)
    if (action === 'send_warning') {
      const { student_id, student_name, student_cnic, student_phone, course, batch, attendance_pct, absent_count } = req.body;
      if (!student_id) {
        return res.status(400).json({ status: 'error', message: 'student_id is required.' });
      }

      try {
        // 1. Post In-App Notification
        await supabase
          .from('notifications')
          .insert([{
            user_id: student_id,
            role: 'student',
            type: 'attendance',
            title: 'Urgent: Low Attendance Warning',
            message: `Your current attendance is ${attendance_pct}%, which is below the mandatory 75% examination threshold (${absent_count} absences recorded). Regular attendance is required to remain eligible for examinations.`,
            link: '/student/attendance',
            created_at: new Date().toISOString()
          }]);

        // 2. Draft Professional Bilingual WhatsApp Message
        const sName = student_name || 'Student';
        const sProg = course || 'Diploma Program';
        const sBatch = batch || 'Active Batch';
        const pct = attendance_pct ?? 0;
        const abs = absent_count ?? 0;

        const whatsappText = `*DEEPSKILLS ACADEMIC DIRECTORATE - ATTENDANCE WARNING*\n\n`
          + `Dear Student / Respected Parents,\n`
          + `This is an official notice regarding the attendance record of *${sName}* (CNIC: ${student_cnic || 'Registered'}) enrolled in *${sProg}* (${sBatch}).\n\n`
          + `* Current Attendance Rate: ${pct}%\n`
          + `* Recorded Absences: ${abs} Sessions\n`
          + `* Minimum Threshold Required: 75%\n\n`
          + `As per DeepSkills academic policy, students maintaining attendance below 75% are classified as examination defaulters and may be disqualified from the upcoming midterm and final examinations.\n\n`
          + `Please ensure regular attendance or contact your Academic Coordinator immediately.\n\n`
          + `Support Helpline: +92 300 0000000\n`
          + `DeepSkills Institute of Technology & Advanced Vocational Training`;

        let phoneClean = String(student_phone || '').replace(/\D/g, '');
        if (phoneClean.startsWith('0')) phoneClean = '92' + phoneClean.slice(1);
        if (!phoneClean.startsWith('92') && phoneClean.length === 10) phoneClean = '92' + phoneClean;

        const whatsappUrl = phoneClean
          ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(whatsappText)}`
          : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

        return res.status(200).json({
          status: 'success',
          message: `In-app warning dispatched to ${sName}.`,
          whatsappUrl,
          whatsappText
        });
      } catch (err) {
        console.error('Error sending warning:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to dispatch warning.' });
      }
    }

    // Action 5: Admin Override
    if (action === 'override') {
      const { attendance_id, status, reason } = req.body;
      if (!attendance_id || !status || !reason?.trim()) {
        return res.status(400).json({ status: 'error', message: 'attendance_id, status, and reason are required.' });
      }

      try {
        const { data: updated, error: uErr } = await supabase
          .from('attendance')
          .update({
            status,
            marked_by: 'admin',
            override_reason: reason.trim(),
            overridden_by: auth.userId || auth.user?.name || 'admin',
            overridden_at: new Date().toISOString(),
            is_locked: false
          })
          .eq('id', attendance_id)
          .select()
          .single();

        if (uErr) throw uErr;

        if (updated?.student_id) {
          await computeAndCacheResult(updated.student_id, 'midterm', { updateRanks: false });
          await computeAndCacheResult(updated.student_id, 'finalterm', { updateRanks: false });
        }

        return res.status(200).json({
          status: 'success',
          message: 'Attendance override saved.',
          data: updated
        });
      } catch (err) {
        console.error('Error saving override:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Failed to save override.' });
      }
    }

    return res.status(400).json({ status: 'error', message: `Unknown action: ${action}` });
  }
}
