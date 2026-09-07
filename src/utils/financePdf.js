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
  promise.pdf = pdf;
  return promise;
};

const addWrappedText = (pdf, text, x, y, maxWidth, lineHeight = 6) => {
  const lines = pdf.splitTextToSize(String(text || ''), maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
};

/**
 * Creates an official DeepSkills Tuition Fee Receipt PDF
 */
export const createFeeReceiptPdf = ({
  student = {},
  feePlan = {},
  installment = null,
  allPayments = [],
  date = null
}) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  let y = 18;

  const studentName = student.name || student.full_name || feePlan.student?.name || 'Student';
  const studentCnic = student.cnic || feePlan.student?.cnic || '—';
  const studentPhone = student.phone || feePlan.student?.phone || '—';
  const studentEmail = student.email || feePlan.student?.email || '—';
  const courseName = feePlan.course || student.course || 'Vocational Training Program';
  const batchName = feePlan.batch || student.batch || 'Main Section';

  const payable = feePlan.payable != null ? Number(feePlan.payable) : Number(feePlan.total_fee || 0);
  const totalFee = Number(feePlan.total_fee || payable);
  const discount = Number(feePlan.discount || 0);
  const totalPaid = Number(feePlan.paid || 0);
  const outstanding = Math.max(0, payable - totalPaid);

  const issueDate = date || (installment?.paid_date ? installment.paid_date : new Date().toISOString().split('T')[0]);
  const paymentMethod = installment?.method ? installment.method.replace(/_/g, ' ').toUpperCase() : 'VERIFIED';
  const paymentRef = installment?.reference_number || installment?.reference || '—';
  const paymentAmount = installment?.amount ? Number(installment.amount) : totalPaid;
  const installmentLabel = installment?.installment_number
    ? `Installment #${installment.installment_number} of ${feePlan.installment_count || 'Plan'}`
    : installment?.description || (feePlan.plan_type === 'full' ? 'Full Tuition Payment' : 'Tuition Fee Payment');

  const receiptId = `DS-REC-${String(studentCnic || '00000').replace(/\D/g, '').slice(-5) || '00000'}-${String(installment?.id || Date.now()).slice(-4)}`;

  // Header Background Accent Bar
  pdf.setFillColor(123, 31, 46); // Burgundy #7B1F2E
  pdf.rect(0, 0, pageWidth, 6, 'F');

  // Gold accent band
  pdf.setFillColor(212, 175, 55); // Gold #D4AF37
  pdf.rect(0, 6, pageWidth, 1.5, 'F');

  // Institution Logo / Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(123, 31, 46);
  pdf.text('DeepSkills Institute', 15, y);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Center of Vocational Excellence & Professional Skill Development', 15, y + 5);
  pdf.text('Website: https://deepskills.pk  |  Email: finance@deepskills.pk  |  UAN: +92 300 0000000', 15, y + 9);

  // Status Badge on Top Right
  pdf.setFillColor(16, 185, 129); // Emerald Green
  pdf.roundedRect(148, y - 4, 47, 9, 2, 2, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('OFFICIAL RECEIPT', 171.5, y + 1.5, { align: 'center' });

  y += 18;

  // Horizontal separator
  pdf.setLineWidth(0.4);
  pdf.setDrawColor(226, 232, 240);
  pdf.line(15, y, 195, y);
  y += 7;

  // Receipt Reference Row
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Receipt Reference: ${receiptId}`, 15, y);
  pdf.text(`Date of Issue: ${issueDate}`, 195, y, { align: 'right' });
  y += 8;

  // Box 1: Student Information
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, 180, 36, 3, 3, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(123, 31, 46);
  pdf.text('STUDENT & ENROLLMENT PROFILE', 20, y + 7);

  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);

  // Left Column
  pdf.setFont('helvetica', 'bold');
  pdf.text('Student Name:', 20, y + 15);
  pdf.setFont('helvetica', 'normal');
  pdf.text(studentName, 52, y + 15);

  pdf.setFont('helvetica', 'bold');
  pdf.text('National CNIC:', 20, y + 22);
  pdf.setFont('helvetica', 'normal');
  pdf.text(studentCnic, 52, y + 22);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Contact Phone:', 20, y + 29);
  pdf.setFont('helvetica', 'normal');
  pdf.text(studentPhone, 52, y + 29);

  // Right Column
  pdf.setFont('helvetica', 'bold');
  pdf.text('Enrolled Course:', 110, y + 15);
  pdf.setFont('helvetica', 'normal');
  pdf.text(courseName.length > 25 ? `${courseName.slice(0, 25)}...` : courseName, 142, y + 15);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Assigned Batch:', 110, y + 22);
  pdf.setFont('helvetica', 'normal');
  pdf.text(batchName, 142, y + 22);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Fee Plan Mode:', 110, y + 29);
  pdf.setFont('helvetica', 'normal');
  pdf.text(feePlan.plan_type === 'full' ? 'Full Payment' : `Installments (${feePlan.installment_count || 'N/A'})`, 142, y + 29);

  y += 44;

  // Box 2: Payment Receipt Details (Active Transaction)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('TRANSACTION & PAYMENT RECORD', 15, y);
  y += 5;

  // Table Header
  pdf.setFillColor(123, 31, 46);
  pdf.rect(15, y, 180, 8, 'F');
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('DESCRIPTION / PARTICULARS', 20, y + 5.5);
  pdf.text('PAYMENT MODE', 105, y + 5.5);
  pdf.text('REFERENCE #', 140, y + 5.5);
  pdf.text('AMOUNT (PKR)', 190, y + 5.5, { align: 'right' });
  y += 8;

  // Table Row
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(15, y, 180, 11, 'FD');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(installmentLabel, 20, y + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(paymentMethod, 105, y + 7);
  pdf.text(paymentRef, 140, y + 7);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129);
  pdf.text(`Rs. ${paymentAmount.toLocaleString()}`, 190, y + 7, { align: 'right' });

  y += 18;

  // Box 3: Financial Summary & Account Balance
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, 180, 44, 3, 3, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(123, 31, 46);
  pdf.text('FEE ACCOUNT SUMMARY', 20, y + 7);

  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);

  const summaryRows = [
    { label: 'Total Course Tuition Fee:', value: `Rs. ${totalFee.toLocaleString()}`, isBold: false },
    { label: 'Scholarship / Discount Applied:', value: discount > 0 ? `- Rs. ${discount.toLocaleString()}` : 'Rs. 0', isBold: false, color: [245, 158, 11] },
    { label: 'Net Payable Fee:', value: `Rs. ${payable.toLocaleString()}`, isBold: true },
    { label: 'Cumulative Fee Paid to Date:', value: `Rs. ${totalPaid.toLocaleString()}`, isBold: true, color: [16, 185, 129] },
    { label: 'Remaining Outstanding Balance:', value: `Rs. ${outstanding.toLocaleString()}`, isBold: true, color: outstanding > 0 ? [239, 68, 68] : [100, 116, 139] }
  ];

  let sumY = y + 13;
  summaryRows.forEach((row) => {
    pdf.setFont('helvetica', row.isBold ? 'bold' : 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(row.label, 20, sumY);

    if (row.color) {
      pdf.setTextColor(...row.color);
    } else {
      pdf.setTextColor(15, 23, 42);
    }
    pdf.text(row.value, 190, sumY, { align: 'right' });
    sumY += 6;
  });

  y += 54;

  // Installment breakdown note if multiple payments exist
  if (allPayments && allPayments.length > 1) {
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    const paidCount = allPayments.filter(p => p.status === 'paid').length;
    pdf.text(`* Installment Schedule: ${paidCount} of ${allPayments.length} scheduled installments verified as paid.`, 15, y);
    y += 8;
  }

  // Terms & Verification Disclaimer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  const disclaimer = 'Notice: This official receipt is electronically generated by the DeepSkills Institute Portal and serves as formal acknowledgment of payment. Tuition fees are non-refundable once the batch commencement date has elapsed. For queries, contact finance@deepskills.pk.';
  y = addWrappedText(pdf, disclaimer, 15, y, 180, 4.5);

  y += 12;

  // Dual Authorization Stamp Blocks
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.3);

  // Sign Block 1
  pdf.line(20, y + 12, 75, y + 12);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Finance & Accounts Officer', 47.5, y + 16, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('DeepSkills Institute', 47.5, y + 20, { align: 'center' });

  // Sign Block 2
  pdf.line(135, y + 12, 190, y + 12);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Director of Admissions & Finance', 162.5, y + 16, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Official Seal & Verification', 162.5, y + 20, { align: 'center' });

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

/**
 * Creates an official DeepSkills Faculty Salary Payslip PDF
 */
export const createTeacherPayslipPdf = ({
  teacher = {},
  payment = null,
  month = null,
  date = null
}) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  let y = 18;

  const teacherName = teacher.name || 'Faculty Member';
  const specialization = teacher.specialization || 'Instructor / Course Specialist';
  const cnic = teacher.cnic || '—';
  const phone = teacher.phone || '—';
  const email = teacher.email || '—';
  const monthlySalary = Number(payment?.amount || teacher.monthlySalary || 0);

  const payMonth = month || payment?.month || new Date().toISOString().slice(0, 7);
  const [yearStr, monthStr] = payMonth.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const parsedMonthIdx = parseInt(monthStr, 10) - 1;
  const formattedMonthName = monthNames[parsedMonthIdx]
    ? `${monthNames[parsedMonthIdx]} ${yearStr}`
    : payMonth;

  const isPaid = !!payment || teacher.status === 'Paid';
  const issueDate = date || (payment?.paid_on ? payment.paid_on : new Date().toISOString().split('T')[0]);
  const paymentMethod = payment?.method
    ? payment.method.replace(/_/g, ' ').toUpperCase()
    : isPaid
      ? 'BANK TRANSFER'
      : 'ALLOCATION PENDING';
  const paymentRef = payment?.reference || (isPaid ? 'DIRECT SETTLEMENT' : 'PENDING DISBURSEMENT');
  const paymentNotes = payment?.notes || (isPaid ? 'Monthly faculty instructional compensation' : 'Provisional faculty remuneration voucher - pending disbursement');

  const payslipId = `DS-PAY-${payMonth.replace('-', '')}-${String(teacher.id || 'FAC').replace(/\D/g, '').slice(-4) || '1001'}`;

  // Header Background Accent Bar
  pdf.setFillColor(123, 31, 46); // Burgundy #7B1F2E
  pdf.rect(0, 0, pageWidth, 6, 'F');

  // Gold accent band
  pdf.setFillColor(212, 175, 55); // Gold #D4AF37
  pdf.rect(0, 6, pageWidth, 1.5, 'F');

  // Institution Logo / Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(123, 31, 46);
  pdf.text('DeepSkills Institute', 15, y);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Center of Vocational Excellence & Professional Skill Development', 15, y + 5);
  pdf.text('Human Resources & Faculty Payroll Directorate  |  UAN: +92 300 0000000', 15, y + 9);

  // Status Badge on Top Right
  if (isPaid) {
    pdf.setFillColor(16, 185, 129); // Emerald
    pdf.roundedRect(144, y - 4, 51, 9, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('OFFICIAL PAYSLIP', 148, y + 2);
  } else {
    pdf.setFillColor(217, 119, 6); // Amber / Gold
    pdf.roundedRect(142, y - 4, 53, 9, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SALARY VOUCHER', 147, y + 2);
  }

  // Divider Line
  y += 15;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.4);
  pdf.line(15, y, 195, y);

  // Payslip Reference & Issue Details
  y += 8;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Payslip Voucher: ${payslipId}`, 15, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Disbursement Date: ${issueDate}`, 130, y);

  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(123, 31, 46);
  pdf.text(`Pay Period: ${formattedMonthName}`, 15, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Disbursing Unit: Central Operational Account', 130, y);

  // Faculty Profile Container Box
  y += 8;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, 180, 28, 3, 3, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(123, 31, 46);
  pdf.text('FACULTY & INSTRUCTOR PROFILE', 20, y + 6);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Faculty Name:', 20, y + 13);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(teacherName), 50, y + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Specialization:', 20, y + 19);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(specialization), 50, y + 19);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Faculty ID / CNIC:', 20, y + 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(cnic), 50, y + 24);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Phone Number:', 115, y + 13);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(phone), 145, y + 13);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Email Address:', 115, y + 19);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(email).slice(0, 24), 145, y + 19);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Employment Type:', 115, y + 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text('Active Faculty / Instructor', 145, y + 24);

  // Compensation Breakdown Table
  y += 34;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Remuneration & Disbursement Particulars', 15, y);

  y += 5;
  // Table Header
  pdf.setFillColor(123, 31, 46);
  pdf.rect(15, y, 180, 8, 'F');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Earnings Description / Particulars', 20, y + 5.5);
  pdf.text('Category', 105, y + 5.5);
  pdf.text('Gross (PKR)', 140, y + 5.5);
  pdf.text('Net (PKR)', 170, y + 5.5);

  y += 8;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(15, y, 180, 9, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Monthly Faculty Base Honorarium', 20, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Core Teaching', 105, y + 6);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Rs. ${monthlySalary.toLocaleString()}`, 140, y + 6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129);
  pdf.text(`Rs. ${monthlySalary.toLocaleString()}`, 170, y + 6);

  y += 9;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(15, y, 180, 8, 'FD');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text('Curriculum Delivery & Lab Mentorship', 20, y + 5.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Instruction', 105, y + 5.5);
  pdf.text('Included', 140, y + 5.5);
  pdf.text('Included', 170, y + 5.5);

  y += 8;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(15, y, 180, 8, 'FD');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text('Deductions / Withholding (Tax / Advance)', 20, y + 5.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Statutory', 105, y + 5.5);
  pdf.text('Rs. 0', 140, y + 5.5);
  pdf.text('Rs. 0', 170, y + 5.5);

  // Total Net Disbursement Highlight Row
  y += 8;
  pdf.setFillColor(240, 253, 244); // Very light emerald
  pdf.setDrawColor(187, 247, 208);
  pdf.rect(15, y, 180, 10, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(22, 101, 52);
  pdf.text('NET DISBURSED COMPENSATION:', 20, y + 6.5);
  pdf.setFontSize(11);
  pdf.text(`PKR ${monthlySalary.toLocaleString()}`, 148, y + 7);

  // Payment Settlement Box
  y += 15;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, 180, 28, 3, 3, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(123, 31, 46);
  pdf.text('SETTLEMENT & AUDIT PARTICULARS', 20, y + 5.5);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Payment Method:', 20, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(paymentMethod), 55, y + 12);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Reference / Slip ID:', 20, y + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(paymentRef), 55, y + 18);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Disbursement Date:', 115, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(issueDate), 155, y + 12);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Disbursement Status:', 115, y + 18);
  pdf.setFont('helvetica', 'bold');
  if (isPaid) {
    pdf.setTextColor(16, 185, 129);
    pdf.text('Verified & Paid', 155, y + 18);
  } else {
    pdf.setTextColor(217, 119, 6);
    pdf.text('Pending Disbursement', 155, y + 18);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Remarks / Notes:', 20, y + 23.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(String(paymentNotes).slice(0, 65), 55, y + 23.5);

  // Signature Blocks
  y += 38;
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(20, y + 12, 75, y + 12);
  pdf.line(135, y + 12, 190, y + 12);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Faculty Member / Receiver', 23, y + 17);
  pdf.text('Authorized Finance Officer', 140, y + 17);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('DeepSkills Faculty Signature', 26, y + 21);
  pdf.text('DeepSkills Accounts Directorate', 140, y + 21);

  // Footer Band
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 283, pageWidth, 14, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(0, 283, pageWidth, 283);

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(148, 163, 184);
  pdf.text('This is an official computer-generated payroll voucher issued by DeepSkills Institute. For inquiries, contact accounts@deepskills.pk', 15, 290);
  pdf.text(`Ref: ${payslipId}`, 155, 290);

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

/**
 * Creates an official DeepSkills Master Financial Ledger Audit Report PDF
 */
export const createMasterLedgerReportPdf = ({
  transactions = [],
  summary = {},
  dateRangeText = 'All Recorded Transactions',
  filterType = 'all',
  generatedBy = 'DeepSkills Finance Directorate',
  date = null
}) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const issueDate = date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const auditRef = `DS-AUDIT-${Date.now().toString().slice(-6)}`;

  const totalIn = Number(summary.totalIn || 0);
  const totalOut = Number(summary.totalOut || 0);
  const net = Number(summary.net || totalIn - totalOut);
  const totalCount = transactions.length;
  const inflowCount = transactions.filter(t => t.flow === 'inflow' || t.entity_type === 'student').length;
  const outflowCount = transactions.filter(t => t.flow === 'outflow' || t.entity_type === 'teacher').length;

  const drawHeader = () => {
    // Burgundy Header Banner
    pdf.setFillColor(123, 31, 46);
    pdf.rect(0, 0, pageWidth, 25, 'F');

    // Gold Accent Line
    pdf.setFillColor(212, 175, 55);
    pdf.rect(0, 25, pageWidth, 1.8, 'F');

    // Header Content
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('DEEPSKILLS INSTITUTE', 14, 13);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(212, 175, 55);
    pdf.text('CENTRAL FINANCE & AUDIT DIRECTORATE • MASTER LEDGER STATEMENT', 14, 19.5);

    // Right Badge
    pdf.setFillColor(155, 44, 61);
    pdf.roundedRect(pageWidth - 62, 7, 48, 12, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OFFICIAL AUDIT REPORT', pageWidth - 59, 14.5);
  };

  const drawFooter = (pageNum, totalPages) => {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.line(0, pageHeight - 12, pageWidth, pageHeight - 12);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(148, 163, 184);
    pdf.text('This is a verified computer-generated Master Financial Ledger Audit Statement issued by DeepSkills Institute.', 14, pageHeight - 5);
    pdf.text(`Page ${pageNum} of ${totalPages} • Ref: ${auditRef}`, pageWidth - 55, pageHeight - 5);
  };

  // Draw First Page Header
  drawHeader();

  let y = 33;

  // Metadata Card
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, y, pageWidth - 28, 18, 3, 3, 'FD');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('AUDIT REFERENCE:', 18, y + 6);
  pdf.text('PERIOD / SCOPE:', 18, y + 13);

  pdf.text('GENERATED ON:', 110, y + 6);
  pdf.text('LEDGER FOCUS:', 110, y + 13);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.text(auditRef, 48, y + 6);
  pdf.text(String(dateRangeText).slice(0, 35), 48, y + 13);

  pdf.text(timestamp, 136, y + 6);
  const focusLabel = filterType === 'student' ? 'Student Tuition Inflows Only' : filterType === 'teacher' ? 'Faculty Payroll Outflows Only' : 'Combined Master Ledger';
  pdf.text(focusLabel, 136, y + 13);

  y += 24;

  // 4 Executive Summary KPI Cards
  const cardW = (pageWidth - 28 - 9) / 4;
  const cards = [
    { title: 'TUITION INFLOWS', val: `Rs. ${totalIn.toLocaleString()}`, sub: `${inflowCount} Payments`, color: [16, 185, 129] },
    { title: 'PAYROLL OUTFLOWS', val: `Rs. ${totalOut.toLocaleString()}`, sub: `${outflowCount} Disbursements`, color: [239, 68, 68] },
    { title: 'NET CASH POSITION', val: `${net >= 0 ? '+' : '-'}Rs. ${Math.abs(net).toLocaleString()}`, sub: net >= 0 ? 'Surplus Balance' : 'Net Outflow', color: net >= 0 ? [56, 189, 248] : [239, 68, 68] },
    { title: 'TOTAL RECORDED', val: `${totalCount} Records`, sub: 'Combined Ledger', color: [139, 92, 246] }
  ];

  cards.forEach((c, idx) => {
    const cardX = 14 + idx * (cardW + 3);
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(cardX, y, cardW, 20, 2, 2, 'FD');

    // Accent line at top of each card
    pdf.setFillColor(...c.color);
    pdf.roundedRect(cardX, y, cardW, 1.6, 1, 1, 'F');

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text(c.title, cardX + 3.5, y + 6.5);

    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(c.val, cardX + 3.5, y + 13);

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(c.sub, cardX + 3.5, y + 17.5);
  });

  y += 26;

  // Table Title
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('TRANSACTION LEDGER BREAKDOWN', 14, y);
  y += 4;

  const renderTableHeader = (headerY) => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(14, headerY, pageWidth - 28, 7.5, 'F');

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('DATE', 17, headerY + 5);
    pdf.text('FLOW', 38, headerY + 5);
    pdf.text('COUNTERPARTY / PERSON', 58, headerY + 5);
    pdf.text('DESCRIPTION / PARTICULARS', 106, headerY + 5);
    pdf.text('METHOD & REF', 152, headerY + 5);
    pdf.text('AMOUNT (PKR)', pageWidth - 17, headerY + 5, { align: 'right' });
  };

  renderTableHeader(y);
  y += 7.5;

  let currentPg = 1;
  const rows = transactions.slice(0, 200); // Limit to top 200 for clean audit PDF document length

  rows.forEach((t, index) => {
    // Check if new page is needed
    if (y > pageHeight - 32) {
      pdf.addPage();
      currentPg++;
      drawHeader();
      y = 34;
      renderTableHeader(y);
      y += 7.5;
    }

    const isEven = index % 2 === 0;
    if (isEven) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(14, y, pageWidth - 28, 7, 'F');
    }

    const isInflow = t.flow === 'inflow' || t.entity_type === 'student';
    const amountStr = `${isInflow ? '+' : '-'}Rs. ${Number(t.amount || 0).toLocaleString()}`;
    const flowLabel = isInflow ? 'INFLOW' : 'OUTFLOW';
    const person = String(t.person_name || t.teacher_name || 'Counterparty').slice(0, 25);
    const desc = String(t.description || (isInflow ? 'Student Tuition Fee' : 'Faculty Honorarium')).slice(0, 28);
    const methodRef = `${t.method ? String(t.method).replace('_', ' ') : 'bank'} ${t.reference_number && t.reference_number !== '—' ? '(' + t.reference_number + ')' : ''}`.slice(0, 22);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    pdf.text(String(t.paid_date || '—').slice(0, 10), 17, y + 4.8);

    // Flow pill text
    pdf.setFont('helvetica', 'bold');
    if (isInflow) {
      pdf.setTextColor(16, 185, 129);
    } else {
      pdf.setTextColor(239, 68, 68);
    }
    pdf.text(flowLabel, 38, y + 4.8);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(person, 58, y + 4.8);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(desc, 106, y + 4.8);

    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(methodRef, 152, y + 4.8);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    if (isInflow) {
      pdf.setTextColor(16, 185, 129);
    } else {
      pdf.setTextColor(239, 68, 68);
    }
    pdf.text(amountStr, pageWidth - 17, y + 4.8, { align: 'right' });

    // Row bottom border
    pdf.setDrawColor(241, 245, 249);
    pdf.line(14, y + 7, pageWidth - 14, y + 7);

    y += 7;
  });

  // Authorization Block
  if (y > pageHeight - 40) {
    pdf.addPage();
    currentPg++;
    drawHeader();
    y = 35;
  } else {
    y += 8;
  }

  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(20, y + 14, 80, y + 14);
  pdf.line(130, y + 14, 190, y + 14);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Director of Finance & Accounts', 23, y + 19);
  pdf.text('Chief Internal Auditor', 140, y + 19);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text('DeepSkills Central Accounts Directorate', 23, y + 23);
  pdf.text('Institutional Compliance & Audit Office', 140, y + 23);

  // Add footers with total page numbers
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

/**
 * Generates an official DeepSkills Referral Commission & Reward Payout Voucher PDF.
 */
export const createReferralPayoutPdf = ({
  referral = {},
  referrer = {},
  referred = {},
  paymentData = {},
  settings = {}
} = {}) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // 1. Burgundy Brand Header
  pdf.setFillColor(123, 31, 46); // #7B1F2E DeepSkills Burgundy
  pdf.rect(0, 0, pageWidth, 28, 'F');

  // Gold accent band
  pdf.setFillColor(212, 175, 55); // #D4AF37
  pdf.rect(0, 28, pageWidth, 2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.setTextColor(255, 255, 255);
  pdf.text('DEEPSKILLS', 15, 13);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(254, 226, 226);
  pdf.text('INSTITUTE OF CONTEMPORARY ART & TECHNOLOGY', 15, 18);
  pdf.text('Central Accounts & Referral Commission Directorate • Campus Audit Division', 15, 23);

  // Verification Badge
  pdf.setFillColor(16, 185, 129); // Emerald
  pdf.roundedRect(pageWidth - 62, 8, 47, 12, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('OFFICIAL PAYOUT VOUCHER', pageWidth - 60, 15.5);

  let y = 36;

  // Voucher Scope & Summary Strip
  const voucherId = `DS-REF-${String(referral.id || Date.now()).slice(-6).toUpperCase()}`;
  const settlementDate = referral.payout_approved_at 
    ? new Date(referral.payout_approved_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : (referral.paid_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));
  const payoutMethod = String(referral.payout_method || paymentData.method || 'bank_transfer').replace('_', ' ').toUpperCase();
  const payoutRef = referral.payout_reference || paymentData.reference || 'REF-' + String(referral.id || '').slice(0, 8);
  const rewardAmount = Number(referral.reward_amount || paymentData.amount || 1000);
  const rewardTypeLabel = (referral.reward_type || paymentData.type) === 'fee_discount' 
    ? 'TUITION FEE WAIVER / DISCOUNT' 
    : 'CASH COMMISSION REWARD';

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, pageWidth - 30, 15, 2, 2, 'FD');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('VOUCHER REFERENCE:', 20, y + 6);
  pdf.text('DISBURSEMENT DATE:', 80, y + 6);
  pdf.text('REWARD CLASSIFICATION:', 140, y + 6);

  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(voucherId, 20, y + 11);
  pdf.text(settlementDate, 80, y + 11);
  pdf.setTextColor(123, 31, 46);
  pdf.text(rewardTypeLabel, 140, y + 11);

  y += 21;

  // 2 Side-by-Side Profiles: Referrer (Recruiter) and Referred Student
  const cardWidth = (pageWidth - 36) / 2;

  // Left Card: Referrer (Beneficiary)
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, cardWidth, 46, 3, 3, 'FD');

  // Header pill for left card
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(15, y, cardWidth, 9, 3, 3, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(123, 31, 46);
  pdf.text('BENEFICIARY / REFERRER PROFILE', 20, y + 6);

  const referrerName = referrer.name || referral.referrer_name || 'Referral Partner';
  const referrerRole = (referrer.role || referral.referrer_role || 'student').toUpperCase();
  const referrerCnic = referrer.cnic || referral.referrer_cnic || 'Registered on record';
  const referrerPhone = referrer.phone || referral.referrer_phone || 'Provided during onboarding';
  const referrerProgram = referrer.course || referrer.specialization || referral.referrer_program || 'Instruction / Academic Enrollment';

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Name:', 20, y + 16);
  pdf.text('Role:', 20, y + 23);
  pdf.text('CNIC / ID:', 20, y + 30);
  pdf.text('Phone:', 20, y + 37);
  pdf.text('Program:', 20, y + 43);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(String(referrerName).slice(0, 24), 45, y + 16);
  pdf.setFont('helvetica', 'normal');
  pdf.text(referrerRole === 'TEACHER' ? 'FACULTY INSTRUCTOR' : 'STUDENT RECRUITER', 45, y + 23);
  pdf.text(String(referrerCnic), 45, y + 30);
  pdf.text(String(referrerPhone), 45, y + 37);
  pdf.text(String(referrerProgram).slice(0, 22), 45, y + 43);

  // Right Card: Referred Student (New Enrollment)
  const rx = 15 + cardWidth + 6;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(rx, y, cardWidth, 46, 3, 3, 'FD');

  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(rx, y, cardWidth, 9, 3, 3, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129);
  pdf.text('REFERRED APPLICANT (NEW ENROLLMENT)', rx + 5, y + 6);

  const referredName = referred.name || referral.referred_name || 'Enrolled Student';
  const referredCourse = referred.course || referral.referred_course || 'Vocational Tech Program';
  const referredBatch = referred.batch || referral.referred_batch || 'Current Active Batch';
  const referredPhone = referred.phone || referral.referred_phone || 'On file';
  const referredDate = referral.referred_at ? new Date(referral.referred_at).toLocaleDateString() : 'Active Record';

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Student:', rx + 5, y + 16);
  pdf.text('Program:', rx + 5, y + 23);
  pdf.text('Batch:', rx + 5, y + 30);
  pdf.text('Contact:', rx + 5, y + 37);
  pdf.text('Date Logged:', rx + 5, y + 43);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(String(referredName).slice(0, 24), rx + 30, y + 16);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(referredCourse).slice(0, 24), rx + 30, y + 23);
  pdf.text(String(referredBatch), rx + 30, y + 30);
  pdf.text(String(referredPhone), rx + 30, y + 37);
  pdf.text(String(referredDate), rx + 30, y + 43);

  y += 52;

  // Reward Ledger Breakdown Table
  pdf.setFillColor(30, 41, 59); // Slate dark
  pdf.rect(15, y, pageWidth - 30, 8, 'F');

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('REWARD PARTICULARS & EARNINGS BREAKDOWN', 20, y + 5.5);
  pdf.text('POLICY RATE', 125, y + 5.5);
  pdf.text('DISBURSED (PKR)', pageWidth - 20, y + 5.5, { align: 'right' });

  y += 8;

  // Item Row
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(15, y, pageWidth - 30, 9, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(rewardTypeLabel, 20, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`1 Verified Enrollment (${referredName})`, 85, y + 6);
  pdf.text(`Standard Incentive`, 125, y + 6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Rs. ${rewardAmount.toLocaleString()}`, pageWidth - 20, y + 6, { align: 'right' });

  y += 9;

  // Deductions / Withholding Row
  pdf.setFillColor(248, 250, 252);
  pdf.rect(15, y, pageWidth - 30, 8, 'FD');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Tax Deductions / Processing Surcharges', 20, y + 5.5);
  pdf.text('DeepSkills Institutional Subsidy', 125, y + 5.5);
  pdf.text('Rs. 0', pageWidth - 20, y + 5.5, { align: 'right' });

  y += 8;

  // Total Disbursed Highlight Row
  pdf.setFillColor(240, 253, 244); // Emerald light
  pdf.setDrawColor(187, 247, 208);
  pdf.rect(15, y, pageWidth - 30, 10, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(22, 101, 52);
  pdf.text('NET DISBURSED COMMISSION REWARD:', 20, y + 6.5);
  pdf.setFontSize(11);
  pdf.text(`PKR ${rewardAmount.toLocaleString()}`, pageWidth - 20, y + 7, { align: 'right' });

  y += 15;

  // Settlement & Audit Particulars Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, pageWidth - 30, 28, 3, 3, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(123, 31, 46);
  pdf.text('SETTLEMENT & AUDIT PARTICULARS', 20, y + 5.5);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Payment Method:', 20, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(payoutMethod, 55, y + 12);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Reference / Slip ID:', 20, y + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(String(payoutRef), 55, y + 18);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Settlement Date:', 115, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(settlementDate, 150, y + 12);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Audit Status:', 115, y + 18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129);
  pdf.text('Verified Settlement & Disbursed', 150, y + 18);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Bookkeeping Remarks:', 20, y + 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(String(referral.payout_notes || paymentData.notes || 'Recorded in regular institutional accounts ledger').slice(0, 65), 58, y + 24);

  y += 38;

  // Authorization Signatures
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(20, y + 14, 75, y + 14);
  pdf.line(135, y + 14, 190, y + 14);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Recipient / Referrer', 23, y + 19);
  pdf.text('Director of Finance & Accounts', 137, y + 19);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Beneficiary Acknowledgment & Stamp', 23, y + 23);
  pdf.text('DeepSkills Central Accounts Directorate', 137, y + 23);

  // Footer Band
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 283, pageWidth, 14, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(0, 283, pageWidth, 283);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text('Official DeepSkills Institutional Financial Record • Generated digitally via DeepSkills Accounts Central', 15, 290);
  pdf.text('Page 1 of 1', pageWidth - 15, 290, { align: 'right' });

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

/**
 * Creates an official DeepSkills Institutional Revenue Statement & P&L Report PDF
 */
export const createRevenueStatementPdf = ({
  metrics = {},
  period = 'this_month',
  datePresetLabel = 'This Month',
  courseFilter = 'all',
  batchFilter = 'all',
  generatedBy = 'DeepSkills Central Directorate'
}) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  let y = 18;

  const kpis = metrics.kpis || {};
  const courseBreakdown = metrics.courseBreakdown || [];
  const monthlyTimeline = metrics.monthlyTimeline || [];
  const filterSummary = metrics.filterSummary || {};

  const grossBilled = Number(kpis.grossTuitionBilled || 0);
  const collectedRevenue = Number(kpis.totalCollectedRevenue || 0);
  const facultyPayroll = Number(kpis.totalFacultyPayroll || 0);
  const referralCommissions = Number(kpis.totalReferralCommissions || 0);
  const totalOperatingExpenses = Number(kpis.totalOperatingExpenses || (facultyPayroll + referralCommissions));
  const netOperatingIncome = Number(kpis.netOperatingIncome || (collectedRevenue - totalOperatingExpenses));
  const profitMargin = kpis.profitMargin != null ? Number(kpis.profitMargin) : (collectedRevenue > 0 ? Math.round((netOperatingIncome / collectedRevenue) * 100) : 0);
  const outstanding = Number(kpis.totalOutstandingReceivable || 0);
  const collectionRate = Number(kpis.collectionEfficiency || 0);
  const avgTicket = Number(kpis.averageTransactionValue || 0);

  const documentSerial = `DS-REV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const generationDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const generationTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const renderHeader = (isFirstPage = true) => {
    // Header Bar Accent
    pdf.setFillColor(123, 31, 46); // Burgundy #7B1F2E
    pdf.rect(0, 0, pageWidth, 6, 'F');

    // Gold band
    pdf.setFillColor(212, 175, 55); // Gold #D4AF37
    pdf.rect(0, 6, pageWidth, 1.5, 'F');

    if (isFirstPage) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(123, 31, 46);
      pdf.text('DeepSkills Institute', 15, 18);

      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Center of Vocational Excellence & Professional Skill Development', 15, 23);
      pdf.text('Institutional Accounts Directorate  |  Website: https://deepskills.pk  |  UAN: +92 300 0000000', 15, 27);

      // Verification Badge Top Right
      pdf.setFillColor(16, 185, 129); // Emerald
      pdf.roundedRect(144, 13, 51, 8.5, 2, 2, 'F');
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('OFFICIAL REVENUE STATEMENT', 147, 18.5);
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(123, 31, 46);
      pdf.text('DeepSkills Institute — Official Revenue Statement', 15, 13);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Document Ref: ${documentSerial}`, pageWidth - 15, 13, { align: 'right' });
      pdf.setDrawColor(226, 232, 240);
      pdf.line(15, 16, pageWidth - 15, 16);
    }
  };

  const renderFooter = (curPage, totalPages) => {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 285, pageWidth, 12, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.line(0, 285, pageWidth, 285);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text('Confidential Institutional Finance Document • DeepSkills Directorate of Finance & Accounts', 15, 291);
    pdf.text(`Page ${curPage} of ${totalPages}`, pageWidth - 15, 291, { align: 'right' });
  };

  // PAGE 1: Header
  renderHeader(true);
  y = 35;

  // Audit Scope Metadata Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, 180, 22, 2.5, 2.5, 'FD');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Statement Reference:', 20, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(documentSerial, 55, y + 6);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Reporting Window:', 20, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  const scopeWindowStr = filterSummary.startDate && filterSummary.endDate
    ? `${datePresetLabel} (${filterSummary.startDate} to ${filterSummary.endDate})`
    : datePresetLabel;
  pdf.text(scopeWindowStr, 55, y + 12);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Program & Section:', 20, y + 18);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  const programScopeStr = `${courseFilter === 'all' ? 'All Academic Programs' : courseFilter} • ${batchFilter === 'all' ? 'All Sections' : batchFilter}`;
  pdf.text(programScopeStr, 55, y + 18);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Generated On:', 120, y + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(`${generationDate} at ${generationTime}`, 145, y + 6);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Authorized By:', 120, y + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(String(generatedBy).slice(0, 26), 145, y + 12);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Report Type:', 120, y + 18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(123, 31, 46);
  pdf.text('Audited P&L Revenue Statement', 145, y + 18);

  y += 28;

  // Executive KPI Summary Cards (2 rows of 3)
  pdf.setFontSize(9.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Executive Financial Telemetry', 15, y);
  y += 4;

  const cardW = 57.3;
  const cardH = 17;
  const gap = 4;

  // Row 1 Cards
  // Card 1: Gross Tuition Billed
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, y, cardW, cardH, 2, 2, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('GROSS TUITION BILLED', 19, y + 5.5);
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`PKR ${grossBilled.toLocaleString()}`, 19, y + 12.5);

  // Card 2: Total Collected Revenue
  pdf.setFillColor(236, 253, 245);
  pdf.setDrawColor(167, 243, 208);
  pdf.roundedRect(15 + cardW + gap, y, cardW, cardH, 2, 2, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(5, 150, 105);
  pdf.text(`COLLECTED REVENUE (${collectionRate}% RECOVERY)`, 19 + cardW + gap, y + 5.5);
  pdf.setFontSize(10.5);
  pdf.setTextColor(6, 95, 70);
  pdf.text(`PKR ${collectedRevenue.toLocaleString()}`, 19 + cardW + gap, y + 12.5);

  // Card 3: Operating Outflows
  pdf.setFillColor(254, 242, 242);
  pdf.setDrawColor(254, 202, 202);
  pdf.roundedRect(15 + (cardW + gap) * 2, y, cardW, cardH, 2, 2, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text('OPERATING EXPENSES (PAYROLL + REF)', 19 + (cardW + gap) * 2, y + 5.5);
  pdf.setFontSize(10.5);
  pdf.setTextColor(153, 27, 27);
  pdf.text(`PKR ${totalOperatingExpenses.toLocaleString()}`, 19 + (cardW + gap) * 2, y + 12.5);

  y += cardH + 4;

  // Row 2 Cards
  // Card 4: Net Operating Surplus / Margin
  const isSurplus = netOperatingIncome >= 0;
  pdf.setFillColor(isSurplus ? 240 : 254, isSurplus ? 253 : 242, isSurplus ? 250 : 242);
  pdf.setDrawColor(isSurplus ? 153 : 254, isSurplus ? 246 : 202, isSurplus ? 228 : 202);
  pdf.roundedRect(15, y, cardW, cardH, 2, 2, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(isSurplus ? 13 : 220, isSurplus ? 148 : 38, isSurplus ? 136 : 38);
  pdf.text(`NET OPERATING SURPLUS (${profitMargin}% MARGIN)`, 19, y + 5.5);
  pdf.setFontSize(10.5);
  pdf.setTextColor(isSurplus ? 17 : 153, isSurplus ? 94 : 27, isSurplus ? 89 : 27);
  pdf.text(`PKR ${netOperatingIncome.toLocaleString()}`, 19, y + 12.5);

  // Card 5: Outstanding Receivables
  pdf.setFillColor(255, 251, 235);
  pdf.setDrawColor(254, 240, 138);
  pdf.roundedRect(15 + cardW + gap, y, cardW, cardH, 2, 2, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(217, 119, 6);
  pdf.text('OUTSTANDING RECEIVABLES', 19 + cardW + gap, y + 5.5);
  pdf.setFontSize(10.5);
  pdf.setTextColor(146, 64, 14);
  pdf.text(`PKR ${outstanding.toLocaleString()}`, 19 + cardW + gap, y + 12.5);

  // Card 6: Average Transaction Value
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15 + (cardW + gap) * 2, y, cardW, cardH, 2, 2, 'FD');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('AVG TRANSACTION VALUE', 19 + (cardW + gap) * 2, y + 5.5);
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`PKR ${avgTicket.toLocaleString()}`, 19 + (cardW + gap) * 2, y + 12.5);

  y += cardH + 8;

  // Section: Course-Wise Financial Performance
  pdf.setFontSize(9.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Course-Wise Financial Performance & Recovery Breakdown', 15, y);
  y += 4;

  // Table Headers
  pdf.setFillColor(123, 31, 46);
  pdf.rect(15, y, 180, 7.5, 'F');

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Course / Training Program', 18, y + 5);
  pdf.text('Enrolled', 82, y + 5);
  pdf.text('Billed (PKR)', 112, y + 5, { align: 'right' });
  pdf.text('Collected (PKR)', 142, y + 5, { align: 'right' });
  pdf.text('Outstanding', 168, y + 5, { align: 'right' });
  pdf.text('Recovery', 190, y + 5, { align: 'right' });

  y += 7.5;

  const rowH = 6.8;
  courseBreakdown.slice(0, 10).forEach((c, index) => {
    if (y > 260) {
      pdf.addPage();
      renderHeader(false);
      y = 25;
    }

    pdf.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
    pdf.rect(15, y, 180, rowH, 'F');
    pdf.setDrawColor(241, 245, 249);
    pdf.line(15, y + rowH, 195, y + rowH);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(c.courseTitle || 'Course').slice(0, 36), 18, y + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(String(c.enrolledStudents || 0), 84, y + 4.5);

    pdf.text(Number(c.totalBilled || 0).toLocaleString(), 112, y + 4.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(5, 150, 105);
    pdf.text(Number(c.collectedRevenue || 0).toLocaleString(), 142, y + 4.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(217, 119, 6);
    pdf.text(Number(c.outstandingFees || 0).toLocaleString(), 168, y + 4.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${c.recoveryRate || 0}%`, 190, y + 4.5, { align: 'right' });

    y += rowH;
  });

  if (courseBreakdown.length === 0) {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(15, y, 180, rowH * 2, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('No active course financial records found for the selected period.', 105, y + 8, { align: 'center' });
    y += rowH * 2;
  }

  y += 7;

  // Check for page overflow before Monthly Timeline
  if (y > 210) {
    pdf.addPage();
    renderHeader(false);
    y = 25;
  }

  // Section: Monthly Operating P&L Progression
  pdf.setFontSize(9.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Monthly Operating Progression (Profit & Loss Ledger)', 15, y);
  y += 4;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(15, y, 180, 7.5, 'F');

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Month Period', 18, y + 5);
  pdf.text('Tuition Inflow (+)', 75, y + 5, { align: 'right' });
  pdf.text('Payroll (-)', 105, y + 5, { align: 'right' });
  pdf.text('Referrals (-)', 135, y + 5, { align: 'right' });
  pdf.text('Total Outflow (-)', 165, y + 5, { align: 'right' });
  pdf.text('Net Surplus', 190, y + 5, { align: 'right' });

  y += 7.5;

  monthlyTimeline.slice(0, 8).forEach((m, idx) => {
    if (y > 255) {
      pdf.addPage();
      renderHeader(false);
      y = 25;
    }

    pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    pdf.rect(15, y, 180, rowH, 'F');
    pdf.setDrawColor(241, 245, 249);
    pdf.line(15, y + rowH, 195, y + rowH);

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(m.monthLabel || m.monthKey || 'Month', 18, y + 4.5);

    pdf.setTextColor(5, 150, 105);
    pdf.text(Number(m.tuitionRevenue || 0).toLocaleString(), 75, y + 4.5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(220, 38, 38);
    pdf.text(Number(m.teacherPayroll || 0).toLocaleString(), 105, y + 4.5, { align: 'right' });

    pdf.setTextColor(147, 51, 234);
    pdf.text(Number(m.referralRewards || 0).toLocaleString(), 135, y + 4.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(185, 28, 28);
    pdf.text(Number(m.totalExpenses || 0).toLocaleString(), 165, y + 4.5, { align: 'right' });

    const isMonthSurplus = (m.netSurplus || 0) >= 0;
    pdf.setTextColor(isMonthSurplus ? 5 : 185, isMonthSurplus ? 150 : 28, isMonthSurplus ? 105 : 28);
    pdf.text(Number(m.netSurplus || 0).toLocaleString(), 190, y + 4.5, { align: 'right' });

    y += rowH;
  });

  if (monthlyTimeline.length === 0) {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(15, y, 180, rowH * 2, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('No historical chronological timeline available for the selected period.', 105, y + 8, { align: 'center' });
    y += rowH * 2;
  }

  y += 10;

  // Certification Signatures (Ensure fits on bottom or add page)
  if (y > 235) {
    pdf.addPage();
    renderHeader(false);
    y = 35;
  }

  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(20, y + 16, 80, y + 16);
  pdf.line(130, y + 16, 190, y + 16);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Director of Finance & Accounts', 23, y + 21);
  pdf.text('Chief Executive / Governing Board', 133, y + 21);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Certified Statement & Ledger Audit Verification', 23, y + 25);
  pdf.text('DeepSkills Institutional Finance Directorate', 133, y + 25);

  // Render footers across all generated pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    renderFooter(i, totalPages);
  }

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

