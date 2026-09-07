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
