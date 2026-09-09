import React, { useEffect, useMemo, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import {
  FaCalendarAlt, FaChartBar, FaClock, FaDownload, FaFileCsv, FaPrint,
  FaSave, FaTrash
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import { DEPARTMENTS } from '../utils/departments';

const DEPT_COLORS = {
  counsellor: '#378ADD',
  hr: '#8B5CF6',
  finance: '#10B981',
  academic: '#F59E0B',
  management: '#EF4444'
};

const CHART_COLORS = ['#4F8EF7', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0D9488'];

const BUILTIN_TEMPLATES = [
  { name: 'Monthly Summary', description: 'Cross-department overview for end of month', is_builtin: true, departments: ['counsellor', 'finance', 'academic', 'management'], config: { sections: ['overview', 'counsellor', 'finance', 'academic', 'management'], timePeriod: 'this_month' } },
  { name: 'Batch Completion Report', description: 'Full performance report for a completed batch', is_builtin: true, departments: ['academic', 'management'], config: { sections: ['academic', 'management'], timePeriod: 'batch' } },
  { name: 'Finance Statement', description: 'Revenue, expenses and net balance', is_builtin: true, departments: ['finance'], config: { sections: ['finance'], timePeriod: 'this_month' } },
  { name: 'Student Progress Report', description: 'Individual student performance, attendance and tasks', is_builtin: true, departments: ['academic'], config: { sections: ['academic'], timePeriod: 'batch' } },
  { name: 'Counsellor Conversion Report', description: 'Inquiry pipeline and conversion analytics', is_builtin: true, departments: ['counsellor'], config: { sections: ['counsellor'], timePeriod: 'this_month' } },
  { name: 'Teacher Performance Report', description: 'Per-teacher KPIs and metrics', is_builtin: true, departments: ['academic', 'management'], config: { sections: ['academic', 'management'], timePeriod: 'this_quarter' } }
];

const PrintStyles = createGlobalStyle`
  @media print {
    nav, aside, header, .no-print, [data-admin-sidebar], [data-admin-topbar] { display: none !important; }
    body { background: #fff !important; color: #111 !important; }
    .report-print-root { padding: 0 !important; color: #111 !important; }
    .report-card, .report-chart, .report-table-wrap { break-inside: avoid; background: #fff !important; border: 1px solid #ddd !important; color: #111 !important; }
    .report-card *, .report-chart *, .report-table-wrap * { color: #111 !important; }
  }
`;

const safeArray = (value) => Array.isArray(value) ? value : [];
const toNumber = (value) => Number(value || 0) || 0;
const pct = (part, total) => total > 0 ? Math.round((part / total) * 100) : 0;
const currency = (value) => `Rs. ${Math.round(toNumber(value)).toLocaleString()}`;

const dateOnly = (date) => {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const monthKey = (date) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const daysBetween = (start, end) => {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
};

const getPeriodRange = (period, selectedBatch) => {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  if (period.type === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  }
  if (period.type === 'this_quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qStart, 1);
    end = new Date(now.getFullYear(), qStart + 3, 0);
  }
  if (period.type === 'academic_year') {
    const year = Number(period.year || now.getFullYear());
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31);
  }
  if (period.type === 'custom') {
    start = period.from ? new Date(`${period.from}T00:00:00`) : start;
    end = period.to ? new Date(`${period.to}T23:59:59`) : end;
  }
  if (period.type === 'batch' && selectedBatch) {
    start = selectedBatch.start_date ? new Date(`${selectedBatch.start_date}T00:00:00`) : start;
    end = selectedBatch.end_date ? new Date(`${selectedBatch.end_date}T23:59:59`) : now;
  }

  return {
    start,
    end,
    from: dateOnly(start),
    to: dateOnly(end)
  };
};

const inRange = (value, range) => {
  if (!value) return true;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed >= range.start && parsed <= range.end;
};

const groupCount = (items, keyFn, fallback = 'Unknown') => {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item) || fallback;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].map(([name, value]) => ({ name, value }));
};

const sumBy = (items, keyFn, valueFn) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item) || 'Unknown';
    map.set(key, (map.get(key) || 0) + toNumber(valueFn(item)));
  });
  return [...map.entries()].map(([name, value]) => ({ name, value }));
};

const downloadText = (filename, text, type = 'text/csv') => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const csvEscape = (value) => {
  const raw = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
};

const toCsv = (headers, rows) => [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

async function safeSelect(table, queryBuilder) {
  try {
    const query = queryBuilder ? queryBuilder(supabase.from(table)) : supabase.from(table).select('*');
    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

function useReportData() {
  const [state, setState] = useState({ loading: true, setupWarnings: [], data: {} });

  useEffect(() => {
    let mounted = true;
    async function load() {
      const entries = await Promise.all([
        ['inquiries', safeSelect('inquiries', (q) => q.select('*'))],
        ['inquiryNotes', safeSelect('inquiry_notes', (q) => q.select('*'))],
        ['admissions', safeSelect('admissions', (q) => q.select('*'))],
        ['payments', safeSelect('payments', (q) => q.select('*'))],
        ['feePlans', safeSelect('fee_plans', (q) => q.select('*'))],
        ['teachers', safeSelect('teachers', (q) => q.select('*'))],
        ['teacherSalaries', safeSelect('teacher_salaries', (q) => q.select('*'))],
        ['referrals', safeSelect('referrals', (q) => q.select('*'))],
        ['attendance', safeSelect('attendance', (q) => q.select('*'))],
        ['tasks', safeSelect('tasks', (q) => q.select('*'))],
        ['taskSubmissions', safeSelect('task_submissions', (q) => q.select('*'))],
        ['results', safeSelect('results', (q) => q.select('*'))],
        ['complaints', safeSelect('complaints', (q) => q.select('*'))],
        ['batches', safeSelect('batches', (q) => q.select('*'))],
        ['courses', safeSelect('courses', (q) => q.select('*'))],
        ['templates', safeSelect('report_templates', (q) => q.select('*').order('created_at', { ascending: false }))],
        ['schedules', safeSelect('scheduled_reports', (q) => q.select('*, template:report_templates(name)').order('created_at', { ascending: false }))]
      ]);
      if (!mounted) return;
      const data = {};
      const setupWarnings = [];
      entries.forEach(([key, result]) => {
        data[key] = result.data;
        if (result.error && ['templates', 'schedules'].includes(key)) {
          setupWarnings.push('Saved report storage is unavailable. Confirm the reports migration is applied and that you are using an authenticated admin session.');
        }
      });
      if (!data.templates?.length) data.templates = BUILTIN_TEMPLATES;
      setState({ loading: false, setupWarnings: [...new Set(setupWarnings)], data });
    }
    load();
    return () => { mounted = false; };
  }, []);

  return state;
}

function buildScopedData(data, period) {
  const batches = safeArray(data.batches);
  const selectedBatch = batches.find((batch) => batch.id === period.batchId);
  const range = getPeriodRange(period, selectedBatch);
  const batchName = selectedBatch?.batch_name;

  const admissions = safeArray(data.admissions);
  const scopedStudents = batchName ? admissions.filter((student) => student.batch === batchName) : admissions;
  const scopedStudentIds = new Set(scopedStudents.map((student) => student.id));
  const scopedCnics = new Set(scopedStudents.map((student) => student.cnic));

  const scoped = {
    range,
    selectedBatch,
    students: scopedStudents,
    inquiries: safeArray(data.inquiries).filter((item) => inRange(item.submitted_at, range) && (!selectedBatch || item.course_interest === selectedBatch.course)),
    admissions: admissions.filter((item) => inRange(item.approved_at || item.submitted_at, range) && (!selectedBatch || item.batch === batchName)),
    payments: safeArray(data.payments).filter((item) => inRange(item.paid_date || item.due_date || item.created_at, range) && (!selectedBatch || scopedStudentIds.has(item.entity_id))),
    feePlans: safeArray(data.feePlans).filter((item) => !selectedBatch || scopedStudentIds.has(item.student_id)),
    attendance: safeArray(data.attendance).filter((item) => inRange(item.date, range) && (!selectedBatch || item.batch_id === selectedBatch.id || item.batch_name === batchName)),
    tasks: safeArray(data.tasks).filter((item) => inRange(item.created_at || item.due_date, range) && (!selectedBatch || item.batch === batchName)),
    taskSubmissions: safeArray(data.taskSubmissions).filter((item) => inRange(item.submitted_at || item.created_at, range) && (!selectedBatch || scopedCnics.has(item.cnic))),
    results: safeArray(data.results).filter((item) => inRange(item.calculated_at || item.updated_at || item.created_at, range) && (!selectedBatch || scopedStudentIds.has(item.student_id))),
    complaints: safeArray(data.complaints).filter((item) => inRange(item.created_at, range) && (!selectedBatch || scopedCnics.has(item.student_cnic))),
    teachers: safeArray(data.teachers),
    teacherSalaries: safeArray(data.teacherSalaries),
    referrals: safeArray(data.referrals).filter((item) => inRange(item.referred_at || item.created_at, range)),
    batches,
    courses: safeArray(data.courses),
    templates: safeArray(data.templates),
    schedules: safeArray(data.schedules)
  };
  return scoped;
}

function buildMetrics(scoped) {
  const inquiries = scoped.inquiries;
  const enrolledInquiries = inquiries.filter((item) => item.status === 'enrolled');
  const paidStudentPayments = scoped.payments.filter((item) => item.entity_type === 'student' && item.status === 'paid');
  const pendingStudentPayments = scoped.payments.filter((item) => item.entity_type === 'student' && item.status !== 'paid');
  const paidTeacherPayments = scoped.payments.filter((item) => item.entity_type === 'teacher' && item.status === 'paid');
  const referralPayouts = scoped.referrals.filter((item) => item.payout_status === 'paid' || item.status === 'paid');
  const revenue = paidStudentPayments.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const outstanding = pendingStudentPayments.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const salaries = paidTeacherPayments.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const referralPaid = referralPayouts.reduce((sum, row) => sum + toNumber(row.reward_amount), 0);
  const attendanceRows = scoped.attendance;
  const presentRows = attendanceRows.filter((row) => ['present', 'late'].includes(row.status));
  const taskCount = scoped.tasks.length;
  const submittedTaskIds = new Set(scoped.taskSubmissions.map((row) => row.task_id));
  const resultScores = scoped.results.map((row) => toNumber(row.percentage || row.final_percentage || row.score || row.total_score)).filter(Boolean);
  const complaints = scoped.complaints;
  const openComplaints = complaints.filter((item) => !['resolved', 'closed'].includes(String(item.status || '').toLowerCase()));
  const activeStudents = scoped.students.filter((student) => student.status === 'Active');
  const activeBatches = scoped.batches.filter((batch) => (batch.status || 'Active') === 'Active');

  return {
    counsellor: {
      stats: [
        { label: 'Total Inquiries', value: inquiries.length },
        { label: 'Enrolled', value: enrolledInquiries.length },
        { label: 'Conversion Rate', value: `${pct(enrolledInquiries.length, inquiries.length)}%` },
        { label: 'Avg Days to Convert', value: Math.round(enrolledInquiries.reduce((sum, row) => sum + (daysBetween(row.submitted_at, row.last_updated) || 0), 0) / (enrolledInquiries.length || 1)) }
      ],
      sources: groupCount(inquiries, (row) => row.hear_about_us || 'Other'),
      funnel: ['new', 'contacted', 'follow_up', 'enrolled', 'lost'].map((status) => ({ name: status.replace('_', ' '), value: inquiries.filter((row) => row.status === status).length })),
      monthly: Object.values([...inquiries, ...scoped.admissions].reduce((acc, row) => {
        const key = monthKey(row.submitted_at || row.approved_at);
        acc[key] ||= { month: key, inquiries: 0, enrollments: 0 };
        if (row.course_interest !== undefined) acc[key].inquiries += 1;
        else acc[key].enrollments += 1;
        return acc;
      }, {})),
      counsellors: [{ name: 'Counsellor Team', inquiries: inquiries.length, enrolled: enrolledInquiries.length, conversion: `${pct(enrolledInquiries.length, inquiries.length)}%`, avgDays: Math.round(enrolledInquiries.reduce((sum, row) => sum + (daysBetween(row.submitted_at, row.last_updated) || 0), 0) / (enrolledInquiries.length || 1)), revenue }],
      referralCodes: groupCount(inquiries.filter((row) => row.referral_code), (row) => row.referral_code)
    },
    finance: {
      stats: [
        { label: 'Total Revenue', value: currency(revenue) },
        { label: 'Outstanding', value: currency(outstanding) },
        { label: 'Salaries Paid', value: currency(salaries) },
        { label: 'Net Balance', value: currency(revenue - salaries - referralPaid) }
      ],
      monthly: Object.values(scoped.payments.reduce((acc, row) => {
        const key = monthKey(row.paid_date || row.due_date || row.created_at);
        acc[key] ||= { month: key, revenue: 0, salaries: 0, referral: 0, net: 0 };
        if (row.entity_type === 'student' && row.status === 'paid') acc[key].revenue += toNumber(row.amount);
        if (row.entity_type === 'teacher' && row.status === 'paid') acc[key].salaries += toNumber(row.amount);
        acc[key].net = acc[key].revenue - acc[key].salaries - acc[key].referral;
        return acc;
      }, {})),
      feeStatus: groupCount(scoped.payments.filter((row) => row.entity_type === 'student'), (row) => row.status || 'pending'),
      courseRevenue: sumBy(paidStudentPayments, (row) => scoped.feePlans.find((plan) => plan.student_id === row.entity_id)?.course || 'Unknown', (row) => row.amount),
      batchRevenue: sumBy(paidStudentPayments, (row) => scoped.feePlans.find((plan) => plan.student_id === row.entity_id)?.batch || 'Unknown', (row) => row.amount),
      overdueAging: ['0-7 days', '8-30 days', '31-60 days', '60+ days'].map((bucket) => ({ bucket, amount: 0 })),
      table: Object.values(scoped.payments.reduce((acc, row) => {
        const key = monthKey(row.paid_date || row.due_date || row.created_at);
        acc[key] ||= { month: key, fees: 0, salaries: 0, referrals: 0, other: 0, net: 0 };
        if (row.entity_type === 'student' && row.status === 'paid') acc[key].fees += toNumber(row.amount);
        else if (row.entity_type === 'teacher' && row.status === 'paid') acc[key].salaries += toNumber(row.amount);
        else acc[key].other += row.status === 'paid' ? toNumber(row.amount) : 0;
        acc[key].net = acc[key].fees - acc[key].salaries - acc[key].referrals - acc[key].other;
        return acc;
      }, {}))
    },
    academic: {
      stats: [
        { label: 'Avg Attendance', value: `${pct(presentRows.length, attendanceRows.length)}%` },
        { label: 'Tasks Submitted', value: `${pct(submittedTaskIds.size, taskCount)}%` },
        { label: 'Avg Result Score', value: `${Math.round(resultScores.reduce((a, b) => a + b, 0) / (resultScores.length || 1))}%` },
        { label: 'Open Complaints', value: openComplaints.length }
      ],
      attendanceTrend: Object.values(attendanceRows.reduce((acc, row) => {
        const key = dateOnly(row.date);
        acc[key] ||= { date: key, total: 0, present: 0, attendance: 0 };
        acc[key].total += 1;
        if (['present', 'late'].includes(row.status)) acc[key].present += 1;
        acc[key].attendance = pct(acc[key].present, acc[key].total);
        return acc;
      }, {})),
      taskCompletion: groupCount(scoped.taskSubmissions, (row) => scoped.tasks.find((task) => task.id === row.task_id)?.batch || 'Unknown'),
      grades: groupCount(scoped.results, (row) => row.grade || (toNumber(row.percentage) >= 80 ? 'A' : toNumber(row.percentage) >= 60 ? 'B' : toNumber(row.percentage) >= 50 ? 'C' : 'F')),
      complaints: groupCount(complaints, (row) => row.category || row.type || 'Other'),
      batchTable: scoped.batches.map((batch) => {
        const students = scoped.students.filter((student) => student.batch === batch.batch_name);
        const attendance = attendanceRows.filter((row) => row.batch_id === batch.id || row.batch_name === batch.batch_name);
        const present = attendance.filter((row) => ['present', 'late'].includes(row.status));
        const tasks = scoped.tasks.filter((task) => task.batch === batch.batch_name);
        const submissions = scoped.taskSubmissions.filter((sub) => tasks.some((task) => task.id === sub.task_id));
        const results = scoped.results.filter((row) => students.some((student) => student.id === row.student_id));
        const scores = results.map((row) => toNumber(row.percentage || row.final_percentage || row.score)).filter(Boolean);
        return { batch: batch.batch_name, students: students.length, attendance: `${pct(present.length, attendance.length)}%`, tasks: `${pct(submissions.length, tasks.length)}%`, score: `${Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1))}%`, pass: `${pct(scores.filter((score) => score >= 50).length, scores.length)}%` };
      }).filter((row) => row.students || row.batch)
    },
    management: {
      stats: [
        { label: 'Total Students', value: scoped.students.length },
        { label: 'Active Students', value: activeStudents.length },
        { label: 'Active Batches', value: activeBatches.length },
        { label: 'Courses', value: scoped.courses.length }
      ],
      enrollmentTrend: groupCount(scoped.admissions, (row) => monthKey(row.submitted_at || row.approved_at)),
      statusBreakdown: groupCount(scoped.students, (row) => row.status || 'Unknown'),
      courseDistribution: groupCount(scoped.students, (row) => row.course || 'Unknown'),
      batchFill: scoped.batches.map((batch) => ({ name: batch.batch_name, fill: pct(scoped.students.filter((student) => student.batch === batch.batch_name).length, batch.capacity || 30) })),
      coursePopularity: scoped.courses.map((course) => ({ name: course.title, inquiries: scoped.inquiries.filter((row) => row.course_interest === course.title).length, enrollments: scoped.students.filter((student) => student.course === course.title).length }))
    },
    overview: {
      health: [
        { dept: 'Counsellor', color: DEPT_COLORS.counsellor, metrics: [`${inquiries.length} inquiries`, `${pct(enrolledInquiries.length, inquiries.length)}% conversion`, `${enrolledInquiries.length} enrolled`] },
        { dept: 'HR', color: DEPT_COLORS.hr, metrics: [`${scoped.teachers.length} teachers`, 'JD metrics pending', 'Hiring files tracked'] },
        { dept: 'Finance', color: DEPT_COLORS.finance, metrics: [`${currency(revenue)} revenue`, `${pendingStudentPayments.length} pending fees`, `${currency(revenue - salaries)} net`] },
        { dept: 'Academic', color: DEPT_COLORS.academic, metrics: [`${pct(presentRows.length, attendanceRows.length)}% attendance`, `${pct(submittedTaskIds.size, taskCount)}% task rate`, `${openComplaints.length} open complaints`] },
        { dept: 'Management', color: DEPT_COLORS.management, metrics: [`${scoped.students.length} students`, `${activeBatches.length} active batches`, `${scoped.courses.length} courses`] }
      ],
      combined: Object.values(scoped.admissions.reduce((acc, row) => {
        const key = monthKey(row.submitted_at || row.approved_at);
        acc[key] ||= { month: key, enrollments: 0, revenue: 0, attendance: pct(presentRows.length, attendanceRows.length), tasks: pct(submittedTaskIds.size, taskCount) };
        acc[key].enrollments += 1;
        return acc;
      }, {})),
      highlights: [
        `${enrolledInquiries.length} inquiries converted in this period`,
        `${currency(revenue)} collected from student fees`,
        `${pct(presentRows.length, attendanceRows.length)}% attendance average`,
        `${openComplaints.length} complaints currently open`
      ]
    }
  };
}

function TimePeriodSelector({ period, setPeriod, batches }) {
  const years = [2024, 2025, 2026, 2027];
  const selectedBatch = batches.find((batch) => batch.id === period.batchId);
  const range = getPeriodRange(period, selectedBatch);

  return (
    <FilterBar className="no-print">
      <div className="period-buttons">
        {[
          ['this_month', 'This Month'],
          ['last_month', 'Last Month'],
          ['this_quarter', 'This Quarter'],
          ['batch', 'By Batch'],
          ['academic_year', 'Academic Year'],
          ['custom', 'Custom Range']
        ].map(([type, label]) => (
          <button key={type} type="button" className={period.type === type ? 'active' : ''} onClick={() => setPeriod((prev) => ({ ...prev, type }))}>{label}</button>
        ))}
      </div>
      <div className="period-controls">
        {period.type === 'batch' && (
          <select value={period.batchId || ''} onChange={(event) => setPeriod((prev) => ({ ...prev, batchId: event.target.value }))}>
            <option value="">Select batch</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_name}</option>)}
          </select>
        )}
        {period.type === 'academic_year' && (
          <select value={period.year || new Date().getFullYear()} onChange={(event) => setPeriod((prev) => ({ ...prev, year: event.target.value }))}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        )}
        {period.type === 'custom' && (
          <>
            <input type="date" value={period.from || ''} onChange={(event) => setPeriod((prev) => ({ ...prev, from: event.target.value }))} />
            <input type="date" value={period.to || ''} onChange={(event) => setPeriod((prev) => ({ ...prev, to: event.target.value }))} />
          </>
        )}
        <Badge><FaCalendarAlt /> {selectedBatch ? selectedBatch.batch_name : `${range.from} to ${range.to}`}</Badge>
      </div>
    </FilterBar>
  );
}

function StatGrid({ stats }) {
  return <StatsGrid>{stats.map((stat) => <StatCard className="report-card" key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></StatCard>)}</StatsGrid>;
}

function ChartPanel({ title, children }) {
  return <ChartCard className="report-chart"><h3>{title}</h3><div className="chart">{children}</div></ChartCard>;
}

function EmptyChart() {
  return <Empty>No data available for this period.</Empty>;
}

function BarChartBlock({ data, dataKey = 'value', color = CHART_COLORS[0] }) {
  if (!data?.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartBlock({ data, lines }) {
  if (!data?.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="month" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip />
        <Legend />
        {lines.map((line, index) => <Line key={line} type="monotone" dataKey={line} stroke={CHART_COLORS[index]} strokeWidth={3} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartBlock({ data }) {
  if (!data?.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={88} label>
          {data.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DataTable({ headers, rows }) {
  return (
    <TableWrap className="report-table-wrap">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No rows for this period.</td></tr>}
        </tbody>
      </table>
    </TableWrap>
  );
}

function CounsellorReport({ metrics }) {
  const tableRows = metrics.counsellors.map((row) => [row.name, row.inquiries, row.enrolled, row.conversion, row.avgDays, currency(row.revenue)]);
  return (
    <>
      <StatGrid stats={metrics.stats} />
      <Grid2>
        <ChartPanel title="Inquiry Sources"><BarChartBlock data={metrics.sources} color={DEPT_COLORS.counsellor} /></ChartPanel>
        <ChartPanel title="Inquiry Status Funnel"><BarChartBlock data={metrics.funnel} color="#8B5CF6" /></ChartPanel>
        <ChartPanel title="Monthly Trend"><LineChartBlock data={metrics.monthly} lines={['inquiries', 'enrollments']} /></ChartPanel>
        <ChartPanel title="Referral Code Performance"><BarChartBlock data={metrics.referralCodes} color="#0D9488" /></ChartPanel>
      </Grid2>
      <DataTable headers={['Counsellor', 'Inquiries', 'Enrolled', 'Conversion', 'Avg Response Days', 'Revenue Attributed']} rows={tableRows} />
    </>
  );
}

function FinanceReport({ metrics }) {
  const tableRows = metrics.table.map((row) => [row.month, currency(row.fees), currency(row.salaries), currency(row.referrals), currency(row.other), currency(row.net)]);
  return (
    <>
      <StatGrid stats={metrics.stats} />
      <Grid2>
        <ChartPanel title="Revenue vs Expenses"><LineChartBlock data={metrics.monthly} lines={['revenue', 'salaries', 'net']} /></ChartPanel>
        <ChartPanel title="Fee Collection Status"><PieChartBlock data={metrics.feeStatus} /></ChartPanel>
        <ChartPanel title="Course-wise Revenue"><BarChartBlock data={metrics.courseRevenue} color={DEPT_COLORS.finance} /></ChartPanel>
        <ChartPanel title="Batch Revenue"><BarChartBlock data={metrics.batchRevenue} color="#0D9488" /></ChartPanel>
      </Grid2>
      <DataTable headers={['Month', 'Fees Collected', 'Salaries Paid', 'Referral Payouts', 'Other', 'Net']} rows={tableRows} />
    </>
  );
}

function AcademicReport({ metrics }) {
  const tableRows = metrics.batchTable.map((row) => [row.batch, row.students, row.attendance, row.tasks, row.score, row.pass]);
  return (
    <>
      <StatGrid stats={metrics.stats} />
      <Grid2>
        <ChartPanel title="Attendance Trend"><LineChartBlock data={metrics.attendanceTrend.map((row) => ({ ...row, month: row.date }))} lines={['attendance']} /></ChartPanel>
        <ChartPanel title="Task Completion by Batch"><BarChartBlock data={metrics.taskCompletion} color={DEPT_COLORS.academic} /></ChartPanel>
        <ChartPanel title="Grade Distribution"><BarChartBlock data={metrics.grades} color="#8B5CF6" /></ChartPanel>
        <ChartPanel title="Complaints by Category"><PieChartBlock data={metrics.complaints} /></ChartPanel>
      </Grid2>
      <DataTable headers={['Batch', 'Students', 'Avg Attendance', 'Task Completion', 'Avg Score', 'Pass Rate']} rows={tableRows} />
    </>
  );
}

function ManagementReport({ metrics }) {
  return (
    <>
      <StatGrid stats={metrics.stats} />
      <Grid2>
        <ChartPanel title="Enrollment Trend"><BarChartBlock data={metrics.enrollmentTrend} color={DEPT_COLORS.management} /></ChartPanel>
        <ChartPanel title="Student Status Breakdown"><PieChartBlock data={metrics.statusBreakdown} /></ChartPanel>
        <ChartPanel title="Course Distribution"><PieChartBlock data={metrics.courseDistribution} /></ChartPanel>
        <ChartPanel title="Batch Fill Rate"><BarChartBlock data={metrics.batchFill} dataKey="fill" color="#F59E0B" /></ChartPanel>
      </Grid2>
      <DataTable headers={['Course', 'Inquiries', 'Enrollments']} rows={metrics.coursePopularity.map((row) => [row.name, row.inquiries, row.enrollments])} />
    </>
  );
}

function OverviewReport({ metrics }) {
  return (
    <>
      <HealthGrid>
        {metrics.health.map((dept) => (
          <HealthCard className="report-card" key={dept.dept} $color={dept.color}>
            <h3>{dept.dept}</h3>
            {dept.metrics.map((metric) => <p key={metric}>{metric}</p>)}
          </HealthCard>
        ))}
      </HealthGrid>
      <ChartPanel title="Combined Department Trend">
        {metrics.combined.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={metrics.combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis yAxisId="left" stroke="#9ca3af" />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="enrollments" fill={DEPT_COLORS.counsellor} />
              <Line yAxisId="right" type="monotone" dataKey="attendance" stroke={DEPT_COLORS.academic} strokeWidth={3} />
              <Line yAxisId="right" type="monotone" dataKey="tasks" stroke={DEPT_COLORS.finance} strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </ChartPanel>
      <Highlights className="report-card">
        <h3>Recent Highlights</h3>
        {metrics.highlights.map((item) => <p key={item}>{item}</p>)}
      </Highlights>
    </>
  );
}

function TemplatesTab({ templates, scoped, metrics, setupWarnings }) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', departments: ['finance'], timePeriod: 'this_month' });

  const saveTemplate = async () => {
    if (!form.name.trim()) return toast.error('Template name is required');
    const payload = {
      name: form.name,
      description: form.description,
      departments: form.departments,
      config: { timePeriod: form.timePeriod, sections: form.departments },
      is_builtin: false,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('report_templates').upsert(payload, { onConflict: 'name' });
    if (error) return toast.error('Run reports migration before saving templates');
    toast.success('Template saved');
    setFormOpen(false);
  };

  const deleteTemplate = async (template) => {
    if (template.is_builtin) return toast.error('Built-in templates cannot be deleted');
    const { error } = await supabase.from('report_templates').delete().eq('id', template.id);
    if (error) return toast.error('Failed to delete template');
    toast.success('Template deleted');
  };

  const exportTemplateZip = async (template) => {
    const zip = new JSZip();
    const sections = template.config?.sections || template.departments || [];
    if (sections.includes('counsellor')) zip.file('counsellor.csv', toCsv(['Metric', 'Value'], metrics.counsellor.stats.map((row) => [row.label, row.value])));
    if (sections.includes('finance')) zip.file('finance.csv', toCsv(['Metric', 'Value'], metrics.finance.stats.map((row) => [row.label, row.value])));
    if (sections.includes('academic')) zip.file('academic.csv', toCsv(['Metric', 'Value'], metrics.academic.stats.map((row) => [row.label, row.value])));
    if (sections.includes('management')) zip.file('management.csv', toCsv(['Metric', 'Value'], metrics.management.stats.map((row) => [row.label, row.value])));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}-report.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel>
      {setupWarnings.map((warning) => <Notice key={warning}>{warning}</Notice>)}
      <Actions className="no-print"><button type="button" onClick={() => setFormOpen(!formOpen)}><FaSave /> New Template</button></Actions>
      {formOpen && (
        <Builder className="no-print">
          <input placeholder="Template name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <textarea placeholder="Description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <div className="checks">
            {['counsellor', 'finance', 'academic', 'management'].map((dept) => (
              <label key={dept}><input type="checkbox" checked={form.departments.includes(dept)} onChange={(event) => setForm((prev) => ({ ...prev, departments: event.target.checked ? [...prev.departments, dept] : prev.departments.filter((item) => item !== dept) }))} /> {dept}</label>
            ))}
          </div>
          <select value={form.timePeriod} onChange={(event) => setForm((prev) => ({ ...prev, timePeriod: event.target.value }))}>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="batch">By Batch</option>
            <option value="academic_year">Academic Year</option>
          </select>
          <button type="button" onClick={saveTemplate}>Save Template</button>
        </Builder>
      )}
      <TemplateGrid>
        {templates.map((template) => (
          <TemplateCard className="report-card" key={template.id || template.name}>
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <div>{safeArray(template.departments).map((dept) => <DeptTag key={dept} $color={DEPT_COLORS[dept] || '#777'}>{dept}</DeptTag>)}</div>
            <small>Last run: {template.last_run_at ? new Date(template.last_run_at).toLocaleString() : 'Never'}</small>
            <div className="buttons">
              <button type="button" onClick={() => exportTemplateZip(template)}><FaFileCsv /> CSV ZIP</button>
              <button type="button" onClick={() => window.print()}><FaPrint /> Print</button>
              <button type="button" disabled={template.is_builtin} onClick={() => deleteTemplate(template)}><FaTrash /> Delete</button>
            </div>
          </TemplateCard>
        ))}
      </TemplateGrid>
      <small>Current scope: {scoped.range.from} to {scoped.range.to}</small>
    </Panel>
  );
}

function ScheduledTab({ schedules, templates, setupWarnings }) {
  const [form, setForm] = useState({ name: '', template_id: '', frequency: 'monthly', send_time: '08:00', recipients: '', subject_line: 'DeepSkills report - {{date}}', include_pdf: true, include_csv: false, is_active: true });

  const saveSchedule = async () => {
    if (!form.name.trim()) return toast.error('Schedule name is required');
    const payload = {
      ...form,
      template_id: form.template_id || null,
      recipients: form.recipients.split(',').map((item) => item.trim()).filter(Boolean),
      next_send_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('scheduled_reports').insert(payload);
    if (error) return toast.error('Run reports migration before saving schedules');
    toast.success('Schedule saved. Automation is pending cron setup.');
  };

  const toggleSchedule = async (schedule) => {
    const { error } = await supabase.from('scheduled_reports').update({ is_active: !schedule.is_active }).eq('id', schedule.id);
    if (error) return toast.error('Failed to update schedule');
    toast.success('Schedule updated');
  };

  return (
    <Panel>
      {setupWarnings.map((warning) => <Notice key={warning}>{warning}</Notice>)}
      <Notice>Automation pending cron setup. These schedules are saved configurations only in v1.</Notice>
      <Builder className="no-print">
        <input placeholder="Report name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        <select value={form.template_id} onChange={(event) => setForm((prev) => ({ ...prev, template_id: event.target.value }))}>
          <option value="">Select template</option>
          {templates.map((template) => <option key={template.id || template.name} value={template.id || ''}>{template.name}</option>)}
        </select>
        <select value={form.frequency} onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.target.value }))}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="end_of_batch">End of Batch</option>
        </select>
        <input type="time" value={form.send_time} onChange={(event) => setForm((prev) => ({ ...prev, send_time: event.target.value }))} />
        <input placeholder="Recipients, comma-separated" value={form.recipients} onChange={(event) => setForm((prev) => ({ ...prev, recipients: event.target.value }))} />
        <input placeholder="Subject line" value={form.subject_line} onChange={(event) => setForm((prev) => ({ ...prev, subject_line: event.target.value }))} />
        <button type="button" onClick={saveSchedule}>Save Schedule</button>
      </Builder>
      <DataTable
        headers={['Report', 'Frequency', 'Recipients', 'Last Sent', 'Next Send', 'Status', 'Action']}
        rows={schedules.map((schedule) => [
          schedule.name,
          schedule.frequency,
          safeArray(schedule.recipients).join(', '),
          schedule.last_sent_at ? new Date(schedule.last_sent_at).toLocaleDateString() : 'Never',
          schedule.next_send_at ? new Date(schedule.next_send_at).toLocaleDateString() : 'Pending',
          schedule.is_active ? 'Active' : 'Paused',
          <button key={schedule.id} type="button" onClick={() => toggleSchedule(schedule)}>{schedule.is_active ? 'Pause' : 'Activate'}</button>
        ])}
      />
    </Panel>
  );
}

export default function ReportsSystem({ mode = 'master' }) {
  const { loading, setupWarnings, data } = useReportData();
  const [period, setPeriod] = useState({ type: 'this_month', year: new Date().getFullYear(), from: '', to: '', batchId: '' });
  const [activeTab, setActiveTab] = useState(mode === 'master' ? 'overview' : mode);
  const scoped = useMemo(() => buildScopedData(data, period), [data, period]);
  const metrics = useMemo(() => buildMetrics(scoped), [scoped]);
  const isMaster = mode === 'master';
  const tabs = isMaster ? ['overview', 'counsellor', 'finance', 'academic', 'management', 'templates', 'scheduled'] : [mode];
  const currentTab = isMaster ? activeTab : mode;

  const exportCurrentCsv = () => {
    const metricSet = metrics[currentTab];
    if (!metricSet?.stats) return toast.error('This tab uses template exports.');
    downloadText(`${currentTab}-report.csv`, toCsv(['Metric', 'Value'], metricSet.stats.map((row) => [row.label, row.value])));
  };

  return (
    <AdminLayout>
      <PrintStyles />
      <Container className="report-print-root">
        <Header>
          <div>
            <h1>{isMaster ? 'Reports Hub' : `${currentTab[0].toUpperCase()}${currentTab.slice(1)} Report`}</h1>
            <p>{isMaster ? 'Cross-department analytics and insights.' : 'Department quick report with period-aware analytics.'}</p>
          </div>
          <Actions className="no-print">
            <button type="button" onClick={exportCurrentCsv}><FaDownload /> CSV</button>
            <button type="button" onClick={() => window.print()}><FaPrint /> Print / PDF</button>
          </Actions>
        </Header>

        <TimePeriodSelector period={period} setPeriod={setPeriod} batches={safeArray(data.batches).filter((batch) => ['Active', 'Completed'].includes(batch.status || 'Active'))} />
        {setupWarnings.map((warning) => <Notice key={warning}>{warning}</Notice>)}

        {isMaster && (
          <TabBar className="no-print">
            {tabs.map((tab) => <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
          </TabBar>
        )}

        {loading ? <Empty>Loading reports...</Empty> : (
          <>
            {currentTab === 'overview' && <OverviewReport metrics={metrics.overview} />}
            {currentTab === 'counsellor' && <CounsellorReport metrics={metrics.counsellor} />}
            {currentTab === 'finance' && <FinanceReport metrics={metrics.finance} />}
            {currentTab === 'academic' && <AcademicReport metrics={metrics.academic} />}
            {currentTab === 'management' && <ManagementReport metrics={metrics.management} />}
            {currentTab === 'templates' && <TemplatesTab templates={scoped.templates} scoped={scoped} metrics={metrics} setupWarnings={setupWarnings} />}
            {currentTab === 'scheduled' && <ScheduledTab schedules={scoped.schedules} templates={scoped.templates} setupWarnings={setupWarnings} />}
          </>
        )}
      </Container>
    </AdminLayout>
  );
}

const Container = styled.div`padding:20px 0;color:#fff;`;
const Header = styled.div`display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px;h1{margin:0 0 6px;font-size:2rem;}p{margin:0;color:#9ca3af;}`;
const Actions = styled.div`display:flex;gap:10px;flex-wrap:wrap;button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;border-radius:10px;padding:10px 14px;display:inline-flex;gap:8px;align-items:center;cursor:pointer;}button:hover{border-color:#378ADD;}`;
const FilterBar = styled.div`position:sticky;top:0;z-index:5;background:#0b0d11;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px;margin-bottom:18px;.period-buttons,.period-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.period-buttons{margin-bottom:10px}button,select,input{background:#111318;border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:9px;padding:9px 12px}button.active{background:rgba(55,138,221,.18);border-color:#378ADD;color:#8ec5ff}`;
const Badge = styled.span`display:inline-flex;gap:7px;align-items:center;color:#cbd5e1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 12px;font-size:.85rem;`;
const Notice = styled.div`background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.28);color:#fbbf24;border-radius:12px;padding:12px 14px;margin-bottom:14px;`;
const TabBar = styled.div`display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;button{text-transform:capitalize;background:#111318;color:#9ca3af;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 14px;cursor:pointer}button.active{color:#fff;border-color:#378ADD;background:rgba(55,138,221,.14)}`;
const StatsGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:18px;`;
const StatCard = styled.div`background:#111318;border:1px solid rgba(255,255,255,.07);border-radius:15px;padding:18px;span{display:block;color:#7b8494;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}strong{font-size:1.55rem;color:#fff;}`;
const Grid2 = styled.div`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:18px;@media(max-width:900px){grid-template-columns:1fr;}`;
const ChartCard = styled.div`background:#111318;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:18px;h3{margin:0 0 14px;font-size:1rem}.chart{height:280px;}`;
const Empty = styled.div`display:flex;align-items:center;justify-content:center;min-height:180px;color:#7b8494;background:rgba(255,255,255,.03);border-radius:12px;text-align:center;padding:18px;`;
const TableWrap = styled.div`overflow:auto;background:#111318;border:1px solid rgba(255,255,255,.07);border-radius:16px;margin-bottom:18px;table{width:100%;border-collapse:collapse;min-width:760px}th,td{padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.05);text-align:left;color:#d1d5db}th{color:#7b8494;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em;background:rgba(255,255,255,.02)}button{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:7px 10px;}`;
const HealthGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:18px;`;
const HealthCard = styled.div`background:#111318;border:1px solid ${({ $color }) => `${$color}55`};border-radius:16px;padding:18px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02);h3{margin:0 0 12px;color:${({ $color }) => $color}}p{margin:6px 0;color:#d1d5db;}`;
const Highlights = styled.div`background:#111318;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:18px;margin-bottom:18px;h3{margin-top:0}p{color:#d1d5db;}`;
const Panel = styled.div`display:flex;flex-direction:column;gap:14px;`;
const TemplateGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;`;
const TemplateCard = styled.div`background:#111318;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:18px;h3{margin:0 0 8px}p{color:#9ca3af}.buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}button{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:8px 10px;display:inline-flex;gap:6px;align-items:center;}button:disabled{opacity:.45;cursor:not-allowed;}`;
const DeptTag = styled.span`display:inline-flex;margin:4px 5px 4px 0;padding:4px 8px;border-radius:999px;background:${({ $color }) => `${$color}22`};color:${({ $color }) => $color};font-size:.75rem;text-transform:capitalize;`;
const Builder = styled.div`background:#111318;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;display:grid;gap:10px;input,textarea,select{background:#090b0f;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;padding:11px}textarea{min-height:80px}.checks{display:flex;gap:12px;flex-wrap:wrap;color:#d1d5db}button{background:#378ADD;border:none;color:#fff;border-radius:10px;padding:11px 14px;font-weight:700;}`;
