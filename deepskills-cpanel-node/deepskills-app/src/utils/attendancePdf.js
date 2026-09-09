import { jsPDF } from 'jspdf';

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
 * Generates an official DeepSkills Monthly Attendance Register Statement PDF
 */
export const createAttendanceRegisterPdf = ({
  batch = {},
  month = '',
  students = [],
  sessions = [],
  stats = {},
  generatedBy = 'DeepSkills Academic Directorate'
}) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  const batchName = batch.batch_name || batch.name || 'All Batches';
  const courseName = batch.course || 'All Courses';
  const timing = batch.time_shift || batch.timing_label || 'Regular Shift';
  const monthLabel = month ? new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month';
  const reportRef = `DS-ATT-${(month || 'NOW').replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  let y = 14;

  const renderHeader = (pageNumber, totalPages) => {
    // DeepSkills Burgundy Top Bar
    pdf.setFillColor(123, 31, 46); // #7B1F2E
    pdf.rect(margin, y, contentWidth, 22, 'F');

    // Gold Accent Stripe
    pdf.setFillColor(212, 175, 55); // #D4AF37
    pdf.rect(margin, y + 22, contentWidth, 1.5, 'F');

    // Header Titles
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('DEEPSKILLS ACADEMIC DIRECTORATE', margin + 6, y + 9);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(245, 220, 180);
    pdf.text('MONTHLY ATTENDANCE REGISTER & COHORT ELIGIBILITY STATEMENT', margin + 6, y + 16);

    // Right Verification Tag
    pdf.setFillColor(18, 140, 90);
    pdf.roundedRect(pageWidth - margin - 48, y + 4.5, 42, 13, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('OFFICIAL REGISTER', pageWidth - margin - 45, y + 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.text('VERIFIED RECORD', pageWidth - margin - 42, y + 14.5);

    y += 28;

    // Scope Card Box
    pdf.setFillColor(248, 249, 250);
    pdf.setDrawColor(220, 225, 230);
    pdf.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    pdf.setTextColor(100, 110, 120);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);

    // Meta Columns
    const colWidth = contentWidth / 5;
    
    // Col 1: Course
    pdf.text('ACADEMIC PROGRAM', margin + 4, y + 5.5);
    pdf.setTextColor(20, 25, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(pdf.splitTextToSize(courseName, colWidth - 6)[0] || '—', margin + 4, y + 12);

    // Col 2: Batch & Shift
    pdf.setTextColor(100, 110, 120);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('BATCH & SCHEDULE', margin + colWidth + 4, y + 5.5);
    pdf.setTextColor(20, 25, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(`${batchName} (${timing})`, margin + colWidth + 4, y + 12);

    // Col 3: Period
    pdf.setTextColor(100, 110, 120);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('REGISTER PERIOD', margin + (colWidth * 2) + 4, y + 5.5);
    pdf.setTextColor(20, 25, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(monthLabel, margin + (colWidth * 2) + 4, y + 12);

    // Col 4: Reference ID
    pdf.setTextColor(100, 110, 120);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('REFERENCE ID', margin + (colWidth * 3) + 4, y + 5.5);
    pdf.setTextColor(20, 25, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(reportRef, margin + (colWidth * 3) + 4, y + 12);

    // Col 5: Generated At
    pdf.setTextColor(100, 110, 120);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('DATE GENERATED', margin + (colWidth * 4) + 4, y + 5.5);
    pdf.setTextColor(20, 25, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), margin + (colWidth * 4) + 4, y + 12);

    y += 22;

    // 4 Executive KPI Cards (Only on Page 1)
    if (pageNumber === 1) {
      const kpiWidth = (contentWidth - 12) / 4;

      // Card 1: Cohort Average
      pdf.setFillColor(240, 253, 244);
      pdf.setDrawColor(187, 247, 208);
      pdf.roundedRect(margin, y, kpiWidth, 15, 2, 2, 'FD');
      pdf.setTextColor(22, 101, 52);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('COHORT AVERAGE ATTENDANCE', margin + 4, y + 5);
      pdf.setFontSize(12);
      pdf.text(`${stats.rate ?? 0}%`, margin + 4, y + 11.5);

      // Card 2: Sessions Conducted
      pdf.setFillColor(240, 249, 255);
      pdf.setDrawColor(186, 230, 253);
      pdf.roundedRect(margin + kpiWidth + 4, y, kpiWidth, 15, 2, 2, 'FD');
      pdf.setTextColor(3, 105, 161);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL SESSIONS HELD', margin + kpiWidth + 8, y + 5);
      pdf.setFontSize(12);
      pdf.text(String(sessions.length || 0), margin + kpiWidth + 8, y + 11.5);

      // Card 3: Students at Risk
      const atRiskCount = students.filter(s => (s.pct ?? s.attendance_pct ?? 0) < 75).length;
      pdf.setFillColor(254, 242, 242);
      pdf.setDrawColor(254, 202, 202);
      pdf.roundedRect(margin + (kpiWidth * 2) + 8, y, kpiWidth, 15, 2, 2, 'FD');
      pdf.setTextColor(153, 27, 27);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXAM DEFAULTERS (<75%)', margin + (kpiWidth * 2) + 12, y + 5);
      pdf.setFontSize(12);
      pdf.text(String(atRiskCount), margin + (kpiWidth * 2) + 12, y + 11.5);

      // Card 4: Perfect Attendance
      const perfectCount = students.filter(s => (s.pct ?? s.attendance_pct ?? 0) === 100).length;
      pdf.setFillColor(250, 245, 255);
      pdf.setDrawColor(233, 213, 255);
      pdf.roundedRect(margin + (kpiWidth * 3) + 12, y, kpiWidth, 15, 2, 2, 'FD');
      pdf.setTextColor(107, 33, 168);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PERFECT ATTENDANCE (100%)', margin + (kpiWidth * 3) + 16, y + 5);
      pdf.setFontSize(12);
      pdf.text(String(perfectCount), margin + (kpiWidth * 3) + 16, y + 11.5);

      y += 19;
    }
  };

  renderHeader(1, 1);

  // Table Column Definitions
  const colWidths = [12, 58, 42, 20, 20, 20, 20, 24, 25, 28];
  const colHeaders = [
    '#',
    'Student Name',
    'CNIC Number',
    'Present (P)',
    'Late (L)',
    'Absent (A)',
    'Excused (E)',
    'Total Days',
    'Attendance %',
    'Exam Eligibility'
  ];

  const renderTableHeader = () => {
    pdf.setFillColor(30, 41, 59); // Slate dark #1E293B
    pdf.rect(margin, y, contentWidth, 7.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);

    let curX = margin;
    colHeaders.forEach((h, idx) => {
      const w = colWidths[idx];
      const alignRight = idx >= 3 && idx <= 8;
      if (alignRight) {
        pdf.text(h, curX + w - 3, y + 5, { align: 'right' });
      } else {
        pdf.text(h, curX + 3, y + 5);
      }
      curX += w;
    });

    y += 7.5;
  };

  renderTableHeader();

  // Rows Rendering
  const rowHeight = 7;
  let rowIdx = 0;

  students.forEach((student, index) => {
    // Check if new page is needed
    if (y + rowHeight > pageHeight - 32) {
      pdf.addPage();
      y = 14;
      renderHeader(pdf.getNumberOfPages(), 0);
      renderTableHeader();
    }

    const isEven = rowIdx % 2 === 0;
    if (isEven) {
      pdf.setFillColor(250, 252, 255);
      pdf.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    pdf.setDrawColor(240, 242, 245);
    pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    const sName = student.name || student.student_name || 'Student';
    const sCnic = student.cnic || student.student_cnic || '—';
    const sPresent = Number(student.present ?? 0);
    const sLate = Number(student.late ?? 0);
    const sAbsent = Number(student.absent ?? 0);
    const sExcused = Number(student.excused ?? 0);
    const sTotal = Number(student.total ?? (sPresent + sLate + sAbsent + sExcused) ?? 0);
    const sPct = Number(student.pct ?? student.attendance_pct ?? (sTotal > 0 ? Math.round(((sPresent + sLate) / sTotal) * 100) : 0));
    const isEligible = sPct >= 75;

    let curX = margin;

    // # Index
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 110, 120);
    pdf.text(String(index + 1), curX + 3, y + 4.8);
    curX += colWidths[0];

    // Student Name
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(20, 25, 35);
    pdf.text(pdf.splitTextToSize(sName, colWidths[1] - 4)[0], curX + 3, y + 4.8);
    curX += colWidths[1];

    // CNIC
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(70, 80, 95);
    pdf.text(sCnic, curX + 3, y + 4.8);
    curX += colWidths[2];

    // Present (Green)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(16, 185, 129);
    pdf.text(String(sPresent), curX + colWidths[3] - 4, y + 4.8, { align: 'right' });
    curX += colWidths[3];

    // Late (Amber)
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(217, 119, 6);
    pdf.text(String(sLate), curX + colWidths[4] - 4, y + 4.8, { align: 'right' });
    curX += colWidths[4];

    // Absent (Red)
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text(String(sAbsent), curX + colWidths[5] - 4, y + 4.8, { align: 'right' });
    curX += colWidths[5];

    // Excused (Sky Blue)
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(56, 189, 248);
    pdf.text(String(sExcused), curX + colWidths[6] - 4, y + 4.8, { align: 'right' });
    curX += colWidths[6];

    // Total Days
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    pdf.text(String(sTotal), curX + colWidths[7] - 4, y + 4.8, { align: 'right' });
    curX += colWidths[7];

    // Attendance %
    pdf.setFont('helvetica', 'bold');
    if (sPct >= 80) pdf.setTextColor(16, 185, 129);
    else if (sPct >= 75) pdf.setTextColor(59, 130, 246);
    else if (sPct >= 60) pdf.setTextColor(245, 158, 11);
    else pdf.setTextColor(239, 68, 68);
    pdf.text(`${sPct}%`, curX + colWidths[8] - 4, y + 4.8, { align: 'right' });
    curX += colWidths[8];

    // Exam Standing Badge
    if (isEligible) {
      pdf.setFillColor(236, 253, 245);
      pdf.setDrawColor(167, 243, 208);
      pdf.roundedRect(curX + 2, y + 1.2, colWidths[9] - 4, 4.6, 1, 1, 'FD');
      pdf.setTextColor(5, 150, 105);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.text('ELIGIBLE', curX + (colWidths[9] / 2), y + 4.4, { align: 'center' });
    } else {
      pdf.setFillColor(254, 242, 242);
      pdf.setDrawColor(254, 202, 202);
      pdf.roundedRect(curX + 2, y + 1.2, colWidths[9] - 4, 4.6, 1, 1, 'FD');
      pdf.setTextColor(185, 28, 28);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.text('DEFAULTER', curX + (colWidths[9] / 2), y + 4.4, { align: 'center' });
    }

    y += rowHeight;
    rowIdx++;
  });

  // Check if signatures fit on this page, otherwise add a final certification page
  if (y + 32 > pageHeight - 14) {
    pdf.addPage();
    y = 20;
  } else {
    y += 10;
  }

  // Institutional Certification Signature Blocks
  const sigColWidth = contentWidth / 3;

  // Signatory 1: Course Instructor
  pdf.setDrawColor(180, 190, 200);
  pdf.line(margin + 6, y + 14, margin + sigColWidth - 10, y + 14);
  pdf.setTextColor(50, 60, 75);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('COURSE INSTRUCTOR / FACILITATOR', margin + 6, y + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(120, 130, 140);
  pdf.text('Signature & Verification Stamp', margin + 6, y + 21.5);

  // Signatory 2: Academic Coordinator
  pdf.line(margin + sigColWidth + 6, y + 14, margin + (sigColWidth * 2) - 10, y + 14);
  pdf.setTextColor(50, 60, 75);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('ACADEMIC COORDINATOR', margin + sigColWidth + 6, y + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(120, 130, 140);
  pdf.text('Attendance Register Audit', margin + sigColWidth + 6, y + 21.5);

  // Signatory 3: Director Academics
  pdf.line(margin + (sigColWidth * 2) + 6, y + 14, margin + contentWidth - 6, y + 14);
  pdf.setTextColor(50, 60, 75);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('CONTROLLER OF EXAMINATIONS / DIRECTOR', margin + (sigColWidth * 2) + 6, y + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(120, 130, 140);
  pdf.text('Final Examination Eligibility Clearance', margin + (sigColWidth * 2) + 6, y + 21.5);

  // Add Page Numbers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(140, 150, 160);
    pdf.text(
      `DeepSkills Academic Portal | Attendance Register | Report Ref: ${reportRef} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};
