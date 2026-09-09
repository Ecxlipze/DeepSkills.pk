import { jsPDF } from 'jspdf';

const addWrappedText = (pdf, text, x, y, maxWidth, lineHeight = 7) => {
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const addBulletSection = (pdf, title, bullets, y) => {
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 15, y);
  let nextY = y + 7;
  pdf.setFont('helvetica', 'normal');
  bullets.forEach((bullet) => {
    nextY = addWrappedText(pdf, `• ${bullet}`, 18, nextY, 175);
  });
  return nextY + 4;
};

const maybeAddSignature = (pdf, signature, x, y, width = 48, height = 18) => {
  if (!signature?.signature_data) {
    return y;
  }
  if (signature.signature_type === 'drawn' && signature.signature_data.startsWith('data:image')) {
    pdf.addImage(signature.signature_data, 'PNG', x, y - height + 2, width, height);
    return y;
  }
  pdf.setFont('times', 'italic');
  pdf.text(signature.signature_data, x, y);
  pdf.setFont('helvetica', 'normal');
  return y;
};

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
  blob.pdf = pdf;

  const promise = Promise.resolve(blob);
  promise.save = (filename) => blob.save(filename);
  promise.output = (...args) => pdf.output(...args);
  promise.pdf = pdf;
  return promise;
};

export const createAcceptanceLetterPdf = async ({
  teacher,
  jd,
  signature,
  adminNote,
  date
}) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 18;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DeepSkill Institute', 15, y);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  y += 8;
  pdf.text(date, 15, y);
  y += 12;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Letter of Acceptance', 15, y);
  y += 12;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  y = addWrappedText(pdf, `${teacher.full_name || teacher.name}\n${teacher.current_address || teacher.permanent_address || ''}`, 15, y, 90);
  y += 6;
  y = addWrappedText(pdf, `Dear ${teacher.full_name || teacher.name},`, 15, y, 180);
  y += 6;
  y = addWrappedText(
    pdf,
    `We are pleased to inform you that following your application, profile review, and document verification, DeepSkill Institute has decided to offer you the position of ${jd.position_title || jd.positionTitle}.`,
    15,
    y,
    180
  );
  y += 6;
  y = addWrappedText(
    pdf,
    `Your employment will commence on ${teacher.available_to_join || 'the agreed joining date'}. Your monthly compensation will be ${jd.compensation_text || 'as agreed in your Job Description'}. Reporting manager: ${jd.reporting_to || 'Academic Director'}. Working hours: ${jd.working_hours || 'To be shared by administration'}.`,
    15,
    y,
    180
  );

  if (adminNote) {
    y += 8;
    y = addWrappedText(pdf, adminNote, 15, y, 180);
  }

  y += 8;
  y = addWrappedText(pdf, 'We look forward to welcoming you to the DeepSkill family. Please retain this letter for your records.', 15, y, 180);
  y += 14;
  pdf.text('Sincerely,', 15, y);
  y += 8;
  pdf.text('DeepSkill HR Department', 15, y);

  y += 20;
  pdf.line(15, y, 75, y);
  pdf.line(120, y, 180, y);
  pdf.text('Authorized Signatory', 15, y + 6);
  maybeAddSignature(pdf, signature, 120, y - 2);
  pdf.text(`${teacher.full_name || teacher.name} - Teacher`, 120, y + 6);

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

export const createHiringFilePdf = async ({
  teacher,
  documents,
  jd,
  signature,
  adminNote,
  date
}) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 16;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('DeepSkill Hiring File', 15, y);
  y += 8;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${date}`, 15, y);
  y += 10;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Personal Information', 15, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  const profileLines = [
    `Full Name: ${teacher.full_name || teacher.name || '-'}`,
    `Father's Name: ${teacher.father_name || '-'}`,
    `CNIC: ${teacher.cnic || '-'}`,
    `Email: ${teacher.personal_email || teacher.email || '-'}`,
    `Phone: ${teacher.personal_phone || '-'}`,
    `Specialization: ${teacher.specialization || '-'}`,
    `Years Experience: ${teacher.years_experience || '-'}`,
    `Expected Salary: Rs. ${Number(teacher.expected_salary || 0).toLocaleString()}`,
    `Teaching Mode: ${teacher.teaching_mode || '-'}`,
    `Available to Join: ${teacher.available_to_join || '-'}`
  ];
  profileLines.forEach((line) => {
    y = addWrappedText(pdf, line, 15, y, 180, 6);
  });

  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Submitted Documents', 15, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  documents.forEach((document) => {
    y = addWrappedText(pdf, `• ${document.doc_type}: ${document.file_name || document.link_url || 'Uploaded'}`, 18, y, 175, 6);
  });

  y += 4;
  y = addBulletSection(pdf, 'Responsibilities', jd.responsibilities || [], y);
  y = addBulletSection(pdf, 'Requirements', jd.requirements || [], y);
  y = addBulletSection(pdf, 'What We Offer', jd.what_we_offer || [], y);

  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature', 15, y);
  y += 10;
  maybeAddSignature(pdf, signature, 15, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Signed At: ${signature?.signed_at || date}`, 15, y + 10);

  if (adminNote) {
    y += 22;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Admin Note', 15, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    addWrappedText(pdf, adminNote, 15, y, 180);
  }

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};

export const createExperienceCertificatePdf = ({
  teacher,
  specialization,
  coursesTaught = [],
  startDate,
  endDate,
  adminNote,
  date
}) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 22;

  // Header & Branding
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DeepSkills Institute', 105, y, { align: 'center' });
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  pdf.text('Center of Vocational Excellence & Professional Skill Development', 105, y, { align: 'center' });
  y += 5;
  pdf.text('Website: https://deepskills.pk  |  Email: hr@deepskills.pk', 105, y, { align: 'center' });
  pdf.setTextColor(0);
  y += 10;

  // Divider Line
  pdf.setLineWidth(0.5);
  pdf.setDrawColor(123, 31, 46);
  pdf.line(15, y, 195, y);
  y += 14;

  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TO WHOM IT MAY CONCERN', 105, y, { align: 'center' });
  y += 8;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(123, 31, 46);
  pdf.text('CERTIFICATE OF EXPERIENCE', 105, y, { align: 'center' });
  pdf.setTextColor(0);
  y += 14;

  // Date and Ref
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Date of Issue: ${date || new Date().toLocaleDateString()}`, 15, y);
  const refCode = `DS-EXP-${String(teacher.cnic || teacher.id || 'HR').replace(/\D/g, '').slice(-6) || '2026'}`;
  pdf.text(`Reference No: ${refCode}`, 195, y, { align: 'right' });
  y += 12;

  // Main Body
  const teacherName = teacher.full_name || teacher.name || 'Instructor';
  const cnicText = teacher.cnic ? ` bearing CNIC No. ${teacher.cnic}` : '';
  const specText = specialization || teacher.specialization || 'Technical Instructor';
  const startText = startDate ? new Date(startDate).toLocaleDateString() : 'commencement of tenure';
  const endText = endDate ? new Date(endDate).toLocaleDateString() : 'the date of this certificate';

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  y = addWrappedText(
    pdf,
    `This is to certify that Mr./Ms. ${teacherName}${cnicText} has served as a ${specText} at DeepSkills Institute from ${startText} to ${endText}.`,
    15,
    y,
    180,
    7
  );
  y += 6;

  const coursesList = coursesTaught.length > 0 ? coursesTaught.join(', ') : specText;
  y = addWrappedText(
    pdf,
    `During their association with the Institute, they were actively involved in conducting hands-on training batches, preparing instructional curriculum, and mentoring students in ${coursesList}.`,
    15,
    y,
    180,
    7
  );
  y += 6;

  y = addWrappedText(
    pdf,
    `Throughout their tenure, we found ${teacherName} to be a diligent, professional, and knowledgeable educator with strong pedagogical skills and an exemplary professional demeanor. They consistently demonstrated commitment to vocational student empowerment and institutional excellence.`,
    15,
    y,
    180,
    7
  );
  y += 6;

  if (adminNote) {
    y = addWrappedText(pdf, adminNote, 15, y, 180, 7);
    y += 6;
  }

  y = addWrappedText(
    pdf,
    `We extend our sincere gratitude for their valuable contribution to DeepSkills and wish them continued success in all their future professional endeavors.`,
    15,
    y,
    180,
    7
  );
  y += 20;

  // Signature Block
  pdf.setFont('helvetica', 'bold');
  pdf.text('Authorized Signatory', 15, y);
  pdf.text('Official Seal', 145, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.text('Head of Human Resources', 15, y);
  pdf.text('DeepSkills Institute', 15, y + 6);
  pdf.text('Verified & Issued by HR Dept.', 145, y);

  const blob = pdf.output('blob');
  return attachSaveMethods(pdf, blob);
};
