import { jsPDF } from 'jspdf';
import { getDefaultAssessmentWeights, getDefaultGradingScale } from './resultUtils.js';


export const downloadBlob = (blob, filename) => {
  if (typeof window === 'undefined' || !blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const attachSaveMethods = (pdf, blob) => {
  blob.save = (filename) => {
    try {
      pdf.save(filename);
    } catch (_) {
      downloadBlob(blob, filename);
    }
  };
  blob.output = (...args) => pdf.output(...args);
  blob.getNumberOfPages = () => pdf.getNumberOfPages();
  blob.internal = pdf.internal;
  blob.pdf = pdf;

  const promise = Promise.resolve(blob);
  promise.save = (filename) => blob.save(filename);
  promise.output = (...args) => pdf.output(...args);
  promise.getNumberOfPages = () => pdf.getNumberOfPages();
  promise.pdf = pdf;
  return promise;
};

/**
 * Official DeepSkills Academic Transcript / Statement of Results PDF Generator
 * Orientation: Portrait A4 (210mm x 297mm)
 */
export const createTranscriptPdf = ({
  student = {},
  result = {},
  batchStats = {},
  weights = null,
  gradingScale = null,
  instituteInfo = {}
}) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  const studentName = student.name || result.admissions?.name || student.student_name || 'Enrolled Student';
  const cnic = student.cnic || result.admissions?.cnic || student.student_cnic || 'N/A';
  const course = student.course || student.assigned_course || result.admissions?.course || 'Certified Professional Program';
  const batchId = result.batch_id || student.batch || student.batch_name || 'N/A';
  const rawExamType = String(result.exam_type || 'midterm').toLowerCase();
  const examTitle = rawExamType === 'finalterm' ? 'FINAL TERM EXAMINATION' : 'MID TERM EXAMINATION';
  const sessionName = rawExamType === 'finalterm' ? 'Final Examination & Capstone Defense' : 'Midterm Evaluation & Assessment';
  const issueDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  const docRef = `DS-TRX-${batchId.replace(/[^a-zA-Z0-9]/g, '')}-${cnic.slice(-4) || '0000'}-${Math.floor(1000 + Math.random() * 9000)}`;

  const activeWeights = weights || (rawExamType === 'finalterm' ? getDefaultAssessmentWeights().finalterm : getDefaultAssessmentWeights().midterm);
  const activeScale = gradingScale || getDefaultGradingScale();

  let y = 14;

  // 1. Burgundy Top Banner
  pdf.setFillColor(123, 31, 46); // DeepSkills Burgundy #7B1F2E
  pdf.rect(margin, y, contentWidth, 24, 'F');

  // Gold Accent Stripe
  pdf.setFillColor(212, 175, 55); // #D4AF37
  pdf.rect(margin, y + 24, contentWidth, 1.5, 'F');

  // Header Typography
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('DEEPSKILLS ACADEMIC DIRECTORATE', margin + 6, y + 9);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(245, 220, 180);
  pdf.text('CENTRAL CONTROLLER OF EXAMINATIONS & ACADEMIC STANDARDS', margin + 6, y + 16);

  pdf.setFontSize(7);
  pdf.setTextColor(220, 220, 220);
  pdf.text('OFFICIAL ACADEMIC TRANSCRIPT & STATEMENT OF EVALUATION', margin + 6, y + 21);

  // Right Verification Tag
  pdf.setFillColor(18, 140, 90);
  pdf.roundedRect(pageWidth - margin - 45, y + 4.5, 40, 15, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('OFFICIAL TRANSCRIPT', pageWidth - margin - 42, y + 10.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text('VERIFIED DOCUMENT', pageWidth - margin - 40, y + 15);

  y += 30;

  // 2. Candidate & Academic Profile Box
  pdf.setFillColor(248, 249, 250);
  pdf.setDrawColor(220, 225, 230);
  pdf.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  const col1 = margin + 5;
  const col2 = margin + (contentWidth * 0.52);

  pdf.setTextColor(110, 115, 120);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('CANDIDATE FULL NAME:', col1, y + 6);
  pdf.text('NATIONAL ID / CNIC:', col1, y + 13);
  pdf.text('ASSIGNED PROGRAM / COURSE:', col1, y + 20);

  pdf.setTextColor(20, 25, 30);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text(String(studentName).toUpperCase(), col1 + 42, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(cnic, col1 + 42, y + 13);
  pdf.text(course, col1 + 42, y + 20);

  pdf.setTextColor(110, 115, 120);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('COHORT / BATCH:', col2, y + 6);
  pdf.text('EXAMINATION SESSION:', col2, y + 13);
  pdf.text('TRANSCRIPT REF / DATE:', col2, y + 20);

  pdf.setTextColor(20, 25, 30);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(batchId, col2 + 38, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(examTitle, col2 + 38, y + 13);
  pdf.text(`${docRef}  |  ${issueDate}`, col2 + 38, y + 20);

  y += 28;

  // 3. Section Title: Assessment Breakdown
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(123, 31, 46);
  pdf.text('ACADEMIC ASSESSMENT SCORE BREAKDOWN', margin, y + 4);

  y += 8;

  // Breakdown Table Header
  pdf.setFillColor(40, 45, 55);
  pdf.rect(margin, y, contentWidth, 7.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);

  const tCols = [
    { label: '#', x: margin + 3, w: 10, align: 'left' },
    { label: 'ASSESSMENT COMPONENT', x: margin + 14, w: 65, align: 'left' },
    { label: 'WEIGHTAGE', x: margin + 82, w: 25, align: 'center' },
    { label: 'EVALUATION STATUS', x: margin + 110, w: 35, align: 'center' },
    { label: 'CONTRIBUTED SCORE', x: margin + 150, w: 32, align: 'right' }
  ];

  tCols.forEach(col => {
    pdf.text(col.label, col.x, y + 5);
  });

  y += 7.5;

  const attScore = Number(result.attendance_marks || 0);
  const assScore = Number(result.assignment_marks || 0);
  const quizScore = Number(result.quiz_marks || 0);
  const taskScore = Number(result.task_completion_marks || 0);
  const projScore = Number(result.project_marks || 0);
  const examScore = Number(result.exam_marks || 0);
  const totalScore = Number(result.total_marks || 0);

  const rows = [
    {
      idx: '01',
      title: 'Class Attendance & Session Presence',
      weight: `${activeWeights.attendance || 0}%`,
      status: attScore > 0 ? 'Verified Recorded' : 'Evaluated',
      score: `${attScore.toFixed(1)} / ${activeWeights.attendance || 0}`
    },
    {
      idx: '02',
      title: 'Continuous Coursework & Assignments',
      weight: `${activeWeights.assignment || 0}%`,
      status: assScore > 0 ? 'Graded Submissions' : 'Assessed',
      score: `${assScore.toFixed(1)} / ${activeWeights.assignment || 0}`
    },
    {
      idx: '03',
      title: 'Quizzes & Conceptual Assessments',
      weight: `${activeWeights.quiz || 0}%`,
      status: quizScore > 0 ? 'Completed' : 'Assessed',
      score: `${quizScore.toFixed(1)} / ${activeWeights.quiz || 0}`
    },
    {
      idx: '04',
      title: 'Practical Tasks & Lab Exercises',
      weight: `${activeWeights.taskCompletion || 0}%`,
      status: taskScore > 0 ? 'Verified Completed' : 'Evaluated',
      score: `${taskScore.toFixed(1)} / ${activeWeights.taskCompletion || 0}`
    }
  ];

  if ((activeWeights.project && activeWeights.project > 0) || rawExamType === 'finalterm') {
    rows.push({
      idx: '05',
      title: 'Final Capstone Project & Viva Defense',
      weight: `${activeWeights.project || 20}%`,
      status: projScore > 0 ? 'Jury Evaluated' : 'Submitted / Assessed',
      score: `${projScore.toFixed(1)} / ${activeWeights.project || 20}`
    });
  }

  if (activeWeights.exam && activeWeights.exam > 0) {
    rows.push({
      idx: '06',
      title: 'Theory & Practical Examination Paper',
      weight: `${activeWeights.exam}%`,
      status: examScore > 0 ? 'Exam Marked' : 'Assessed',
      score: `${examScore.toFixed(1)} / ${activeWeights.exam}`
    });
  }

  rows.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    pdf.setFillColor(isEven ? 255 : 249, isEven ? 255 : 250, isEven ? 255 : 252);
    pdf.rect(margin, y, contentWidth, 7, 'F');
    pdf.setDrawColor(230, 235, 240);
    pdf.line(margin, y + 7, margin + contentWidth, y + 7);

    pdf.setTextColor(50, 55, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(r.idx, margin + 4, y + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.text(r.title, margin + 14, y + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.text(r.weight, margin + 90, y + 5);

    pdf.setTextColor(80, 90, 100);
    pdf.text(r.status, margin + 115, y + 5);

    pdf.setTextColor(20, 25, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.text(r.score, margin + contentWidth - 4, y + 5, { align: 'right' });

    y += 7;
  });

  // Table Total Row
  pdf.setFillColor(242, 244, 248);
  pdf.rect(margin, y, contentWidth, 8, 'F');
  pdf.setDrawColor(123, 31, 46);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y + 8, margin + contentWidth, y + 8);
  pdf.setLineWidth(0.2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(123, 31, 46);
  pdf.text('CUMULATIVE RESULT TOTAL:', margin + 14, y + 5.5);

  pdf.setFontSize(9);
  pdf.setTextColor(20, 25, 30);
  pdf.text(`${totalScore.toFixed(1)} / 100`, margin + contentWidth - 4, y + 5.5, { align: 'right' });

  y += 13;

  // 4. Executive Standing & Performance Box
  pdf.setFillColor(252, 252, 253);
  pdf.setDrawColor(215, 220, 228);
  pdf.roundedRect(margin, y, contentWidth, 38, 2.5, 2.5, 'FD');

  // Left Score Badge
  const grade = result.grade || 'F';
  const passed = result.passed !== undefined ? result.passed : (totalScore >= 50);
  const remarks = result.remarks || (passed ? 'Successful Completion' : 'Unsuccessful');
  const rank = result.batch_rank || 'N/A';
  const totalInBatch = batchStats.count || batchStats.total || 'N/A';

  // Badge Container
  const badgeWidth = 44;
  pdf.setFillColor(passed ? 240 : 254, passed ? 249 : 242, passed ? 244 : 242);
  pdf.setDrawColor(passed ? 46 : 231, passed ? 204 : 76, passed ? 113 : 60);
  pdf.roundedRect(margin + 5, y + 5, badgeWidth, 28, 2, 2, 'FD');

  pdf.setTextColor(passed ? 30 : 180, passed ? 130 : 40, passed ? 60 : 40);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(grade, margin + 5 + (badgeWidth / 2), y + 17, { align: 'center' });

  pdf.setFontSize(7.5);
  pdf.text(passed ? 'STATUS: PASSED' : 'STATUS: FAILED', margin + 5 + (badgeWidth / 2), y + 24, { align: 'center' });

  // Center Details
  const midX = margin + badgeWidth + 12;
  pdf.setTextColor(100, 105, 115);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('OVERALL ACADEMIC REMARKS:', midX, y + 9);
  pdf.text('COHORT POSITION / RANKING:', midX, y + 17);
  pdf.text('CERTIFICATION ELIGIBILITY:', midX, y + 25);

  pdf.setTextColor(20, 25, 30);
  pdf.setFontSize(8.5);
  pdf.text(`${remarks}`, midX + 50, y + 9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Rank #${rank} out of ${totalInBatch} Candidates`, midX + 50, y + 17);
  pdf.setTextColor(passed ? 18 : 180, passed ? 140 : 40, passed ? 90 : 40);
  pdf.text(passed ? 'Eligible for DeepSkills Certification' : 'Remediation Required for Certification', midX + 50, y + 25);

  // Right Cohort Comparison Mini-Stats
  const rightBoxX = margin + contentWidth - 42;
  pdf.setFillColor(245, 247, 250);
  pdf.roundedRect(rightBoxX, y + 5, 37, 28, 1.5, 1.5, 'F');

  pdf.setTextColor(110, 115, 125);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.text('COHORT METRICS', rightBoxX + 18.5, y + 10, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`Batch Avg: ${batchStats.avg || 'N/A'}%`, rightBoxX + 18.5, y + 16, { align: 'center' });
  pdf.text(`Highest: ${batchStats.highest || 'N/A'}%`, rightBoxX + 18.5, y + 21, { align: 'center' });
  pdf.text(`Your Score: ${totalScore}%`, rightBoxX + 18.5, y + 27, { align: 'center' });

  y += 44;

  // 5. Official Grading Scale Legend
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(123, 31, 46);
  pdf.text('INSTITUTIONAL GRADING CRITERIA & PERFORMANCE MATRIX', margin, y + 4);

  y += 7;

  const scaleWidth = contentWidth / activeScale.length;
  activeScale.forEach((s, idx) => {
    const boxX = margin + (idx * scaleWidth);
    pdf.setFillColor(248, 249, 251);
    pdf.setDrawColor(225, 230, 235);
    pdf.rect(boxX, y, scaleWidth, 12, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(20, 25, 30);
    pdf.text(`${s.grade}`, boxX + (scaleWidth / 2), y + 4.5, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(90, 95, 105);
    pdf.text(`${s.min}% & above`, boxX + (scaleWidth / 2), y + 8, { align: 'center' });
    pdf.text(s.remarks || '', boxX + (scaleWidth / 2), y + 11, { align: 'center' });
  });

  y += 18;

  // 6. Verification Notice Box
  pdf.setFillColor(254, 251, 243);
  pdf.setDrawColor(235, 215, 160);
  pdf.roundedRect(margin, y, contentWidth, 13, 1.5, 1.5, 'FD');

  pdf.setTextColor(140, 100, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('OFFICIAL RECORD AUTHENTICATION & VERIFICATION NOTICE', margin + 4, y + 4.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(90, 80, 50);
  pdf.text('This academic transcript is digitally generated and certified by the DeepSkills Central Examination Directorate.', margin + 4, y + 8.5);
  pdf.text('To authenticate this transcript, verify Reference Ref ID against the official registry portal at deepskill.org/verify-result', margin + 4, y + 11.5);

  y += 20;

  // 7. Official Signatures
  const sigColWidth = (contentWidth - 20) / 2;

  // Left: Course Instructor
  const sig1X = margin + 5;
  pdf.setDrawColor(180, 185, 195);
  pdf.line(sig1X, y + 14, sig1X + sigColWidth, y + 14);

  pdf.setTextColor(30, 35, 45);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('LEAD COURSE INSTRUCTOR', sig1X + (sigColWidth / 2), y + 18, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(110, 115, 125);
  pdf.text('Department of Academic Delivery & Instruction', sig1X + (sigColWidth / 2), y + 21.5, { align: 'center' });

  // Right: Controller of Examinations
  const sig2X = margin + contentWidth - sigColWidth - 5;
  pdf.line(sig2X, y + 14, sig2X + sigColWidth, y + 14);

  pdf.setTextColor(30, 35, 45);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('CONTROLLER OF EXAMINATIONS', sig2X + (sigColWidth / 2), y + 18, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(110, 115, 125);
  pdf.text('Directorate of Quality, Examination & Certification', sig2X + (sigColWidth / 2), y + 21.5, { align: 'center' });

  // Bottom Footer
  pdf.setTextColor(150, 155, 165);
  pdf.setFontSize(6);
  pdf.text(`DeepSkills Academic Directorate | Form DS-EXAM-04 | Generated on ${new Date().toISOString()}`, pageWidth / 2, pageHeight - 6, { align: 'center' });

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

/**
 * Official DeepSkills Examination Tabulation Sheet PDF Generator
 * Orientation: Landscape A4 (297mm x 210mm)
 */
export const createTabulationSheetPdf = ({
  batch = {},
  examType = 'midterm',
  results = [],
  stats = {},
  weights = null,
  generatedBy = 'DeepSkills Central Examination Directorate'
}) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  const batchName = batch.batch_name || batch.name || 'All Batches';
  const courseName = batch.course || 'Certified Program';
  const rawType = String(examType).toLowerCase();
  const examTitle = rawType === 'finalterm' ? 'FINAL TERM EXAMINATION' : 'MID TERM EXAMINATION';
  const reportRef = `DS-TAB-${batchName.replace(/[^a-zA-Z0-9]/g, '')}-${rawType.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });

  const activeWeights = weights || (rawType === 'finalterm' ? getDefaultAssessmentWeights().finalterm : getDefaultAssessmentWeights().midterm);

  let y = 12;

  const renderHeader = (pageNumber, totalPages) => {
    // Burgundy Header Bar
    pdf.setFillColor(123, 31, 46);
    pdf.rect(margin, y, contentWidth, 20, 'F');

    // Gold Accent Stripe
    pdf.setFillColor(212, 175, 55);
    pdf.rect(margin, y + 20, contentWidth, 1.5, 'F');

    // Header Titles
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('DEEPSKILLS ACADEMIC DIRECTORATE', margin + 6, y + 8);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(245, 220, 180);
    pdf.text(`OFFICIAL EXAMINATION TABULATION SHEET & MARKS REGISTER — ${examTitle}`, margin + 6, y + 15);

    // Verification Badge
    pdf.setFillColor(18, 140, 90);
    pdf.roundedRect(pageWidth - margin - 46, y + 3.5, 40, 13, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('TABULATION REGISTER', pageWidth - margin - 44, y + 8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text('OFFICIAL RECORD', pageWidth - margin - 40, y + 13);

    y += 26;

    // Cohort Scope Card
    pdf.setFillColor(248, 249, 251);
    pdf.setDrawColor(220, 225, 230);
    pdf.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    const sc1 = margin + 5;
    const sc2 = margin + 65;
    const sc3 = margin + 130;
    const sc4 = margin + 200;

    pdf.setTextColor(110, 115, 125);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.text('ACADEMIC PROGRAM:', sc1, y + 5.5);
    pdf.text('BATCH / COHORT:', sc2, y + 5.5);
    pdf.text('EXAM SESSION:', sc3, y + 5.5);
    pdf.text('REGISTER REF & DATE:', sc4, y + 5.5);

    pdf.setTextColor(20, 25, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(courseName, sc1, y + 11.5);
    pdf.text(batchName, sc2, y + 11.5);
    pdf.text(examTitle, sc3, y + 11.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(`${reportRef} | ${dateStr}`, sc4, y + 11.5);

    y += 20;

    // Executive Stats Strip
    const statBoxWidth = (contentWidth - 15) / 6;
    const statCards = [
      { label: 'TOTAL ENROLLED', val: String(stats.totalCandidates || results.length || 0) },
      { label: 'PASSED', val: String(stats.passed || 0), color: [18, 140, 90] },
      { label: 'FAILED', val: String(stats.failed || 0), color: [220, 50, 50] },
      { label: 'PASSING RATE', val: `${stats.passRate || (stats.totalCandidates > 0 ? Math.round((stats.passed / stats.totalCandidates) * 100) : 0)}%` },
      { label: 'COHORT AVERAGE', val: `${stats.classAverage || 0} / 100` },
      { label: 'HIGHEST SCORE', val: `${stats.highestScore || 0} / 100`, color: [180, 130, 20] }
    ];

    statCards.forEach((c, idx) => {
      const bx = margin + (idx * (statBoxWidth + 3));
      pdf.setFillColor(252, 252, 254);
      pdf.setDrawColor(225, 230, 235);
      pdf.roundedRect(bx, y, statBoxWidth, 12, 1.5, 1.5, 'FD');

      pdf.setTextColor(110, 115, 125);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.5);
      pdf.text(c.label, bx + (statBoxWidth / 2), y + 4.5, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      if (c.color) pdf.setTextColor(...c.color);
      else pdf.setTextColor(20, 25, 30);
      pdf.text(c.val, bx + (statBoxWidth / 2), y + 9.5, { align: 'center' });
    });

    y += 16;
  };

  const renderTableHeader = () => {
    pdf.setFillColor(40, 45, 55);
    pdf.rect(margin, y, contentWidth, 7, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);

    const cols = [
      { label: 'RANK', x: margin + 3, w: 10 },
      { label: 'CANDIDATE NAME', x: margin + 14, w: 55 },
      { label: 'CNIC / ROLL NO', x: margin + 70, w: 32 },
      { label: `ATT (${activeWeights.attendance}%)`, x: margin + 104, w: 18, align: 'center' },
      { label: `ASS (${activeWeights.assignment}%)`, x: margin + 124, w: 18, align: 'center' },
      { label: `QUIZ (${activeWeights.quiz}%)`, x: margin + 144, w: 18, align: 'center' },
      { label: `TASK (${activeWeights.taskCompletion}%)`, x: margin + 164, w: 18, align: 'center' },
      { label: `PROJ/EXAM`, x: margin + 184, w: 22, align: 'center' },
      { label: 'TOTAL / 100', x: margin + 208, w: 20, align: 'center' },
      { label: 'GRADE', x: margin + 230, w: 14, align: 'center' },
      { label: 'STATUS', x: margin + 246, w: 16, align: 'center' },
      { label: 'REMARKS', x: margin + 264, w: 18, align: 'left' }
    ];

    cols.forEach(c => {
      pdf.text(c.label, c.x, y + 4.5);
    });

    y += 7;
  };

  renderHeader(1, 1);
  renderTableHeader();

  const sortedResults = [...results].sort((a, b) => (a.batch_rank || 999) - (b.batch_rank || 999));

  sortedResults.forEach((r, idx) => {
    // New page check
    if (y > pageHeight - 35) {
      pdf.addPage();
      y = 12;
      renderHeader(pdf.internal.getNumberOfPages(), pdf.internal.getNumberOfPages());
      renderTableHeader();
    }

    const isEven = idx % 2 === 0;
    pdf.setFillColor(isEven ? 255 : 249, isEven ? 255 : 250, isEven ? 255 : 252);
    pdf.rect(margin, y, contentWidth, 6.5, 'F');
    pdf.setDrawColor(230, 235, 240);
    pdf.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

    const sName = r.admissions?.name || r.name || 'Candidate';
    const sCnic = r.admissions?.cnic || r.cnic || 'N/A';
    const rankText = r.batch_rank ? `#${r.batch_rank}` : `#${idx + 1}`;
    const att = Number(r.attendance_marks || 0).toFixed(1);
    const ass = Number(r.assignment_marks || 0).toFixed(1);
    const quiz = Number(r.quiz_marks || 0).toFixed(1);
    const task = Number(r.task_completion_marks || 0).toFixed(1);
    const proj = Number((r.project_marks || 0) + (r.exam_marks || 0)).toFixed(1);
    const total = Number(r.total_marks || 0).toFixed(1);
    const grade = r.grade || 'F';
    const passed = r.passed !== undefined ? r.passed : (Number(total) >= 50);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(r.batch_rank <= 3 ? 180 : 80, r.batch_rank <= 3 ? 130 : 85, r.batch_rank <= 3 ? 20 : 95);
    pdf.text(rankText, margin + 3, y + 4.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(20, 25, 30);
    pdf.text(sName.length > 28 ? sName.slice(0, 26) + '...' : sName, margin + 14, y + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(90, 95, 105);
    pdf.text(sCnic, margin + 70, y + 4.5);

    pdf.text(att, margin + 110, y + 4.5);
    pdf.text(ass, margin + 130, y + 4.5);
    pdf.text(quiz, margin + 150, y + 4.5);
    pdf.text(task, margin + 170, y + 4.5);
    pdf.text(proj, margin + 192, y + 4.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(20, 25, 30);
    pdf.text(total, margin + 214, y + 4.5);

    pdf.setTextColor(passed ? 18 : 200, passed ? 140 : 40, passed ? 90 : 40);
    pdf.text(grade, margin + 234, y + 4.5);
    pdf.text(passed ? 'PASS' : 'FAIL', margin + 248, y + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(90, 95, 105);
    pdf.text(r.remarks || (passed ? 'Promoted' : 'Remediation'), margin + 264, y + 4.5);

    y += 6.5;
  });

  // Footer Signatures
  if (y > pageHeight - 30) {
    pdf.addPage();
    y = 20;
  } else {
    y = Math.max(y + 12, pageHeight - 28);
  }

  const sigColW = (contentWidth - 30) / 3;
  const sigTitles = [
    { title: 'COURSE INSTRUCTOR', sub: 'Evaluator & Grade Assessor' },
    { title: 'ACADEMIC COORDINATOR', sub: 'Department Administration' },
    { title: 'CONTROLLER OF EXAMINATIONS', sub: 'Official Certification Directorate' }
  ];

  sigTitles.forEach((st, i) => {
    const sx = margin + (i * (sigColW + 15));
    pdf.setDrawColor(180, 185, 195);
    pdf.line(sx, y + 10, sx + sigColW, y + 10);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(30, 35, 45);
    pdf.text(st.title, sx + (sigColW / 2), y + 14, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(110, 115, 125);
    pdf.text(st.sub, sx + (sigColW / 2), y + 17.5, { align: 'center' });
  });

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};
