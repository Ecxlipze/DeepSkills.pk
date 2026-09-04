import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope,
  FaCheckCircle, FaEye, FaFilter, FaMoneyBillWave, FaPhone, FaPlus,
  FaSearch, FaStickyNote, FaTimes, FaUserGraduate
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { EMAIL_EVENTS, sendAdmissionEmail } from '../utils/emailNotifications';
import { createNotification } from '../utils/notifications';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' }
];
const SOURCES = ['Social Media', 'Friend', 'Google', 'Referral', 'Other'];
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online' },
  { value: 'cheque', label: 'Cheque' }
];
const normalizePaymentMethod = (method) => {
  if (!method) return 'cash';
  const val = String(method).trim().toLowerCase().replace(/\s+/g, '_');
  if (['cash', 'bank_transfer', 'online', 'cheque'].includes(val)) return val;
  if (val === 'check') return 'cheque';
  return 'cash';
};
const EDUCATION = ['Matric', 'Inter', 'Bachelor', 'Master', 'Other'];

const emptyEnrollment = {
  inquiryId: '',
  enrollmentSource: 'walk_in',
  name: '',
  fatherName: '',
  cnic: '',
  dob: '',
  gender: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  education: '',
  hearAboutUs: '',
  referralCode: '',
  course: '',
  batchId: '',
  enrollmentType: 'new',
  totalFee: '',
  discountAmount: '0',
  discountReason: '',
  paymentPlan: 'full',
  installmentCount: 1,
  firstPayment: '',
  firstPaymentMethod: 'cash',
  firstPaymentDate: new Date().toISOString().split('T')[0],
  firstPaymentRef: '',
  notes: ''
};

const formatCNIC = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length > 12) return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

const toInt = (value) => Number.parseInt(value || '0', 10) || 0;
const statusLabel = (value) => STATUS_OPTIONS.find((status) => status.value === value)?.label || value;

const CounsellorPanel = ({ initialView }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedView = initialView || location.pathname.split('/')[3] || 'overview';
  const [activeTab, setActiveTab] = useState(resolvedView === 'students' ? 'students' : 'inquiries');
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState([]);
  const [notes, setNotes] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: 'all', course: 'all', source: 'all', from: '', to: '' });
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'contacted', note: '' });
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [enrollment, setEnrollment] = useState(emptyEnrollment);
  const [success, setSuccess] = useState(null);
  const [studentAction, setStudentAction] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [inqRes, noteRes, studentRes, courseRes, batchRes] = await Promise.all([
      supabase.from('inquiries').select('*').order('submitted_at', { ascending: false }),
      supabase.from('inquiry_notes').select('*').order('added_at', { ascending: false }),
      supabase.from('admissions').select('*').in('status', ['Active', 'Inactive', 'Graduated']).order('submitted_at', { ascending: false }),
      supabase.from('courses').select('*').order('title', { ascending: true }),
      supabase.from('batches').select('*').order('created_at', { ascending: false })
    ]);
    if (inqRes.error) toast.error('Failed to load inquiries');
    setInquiries(inqRes.data || []);
    setNotes(noteRes.data || []);
    setStudents(studentRes.data || []);
    setCourses(courseRes.data || []);
    setBatches(batchRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (resolvedView === 'students') setActiveTab('students');
    if (['overview', 'inquiries', 'enroll'].includes(resolvedView)) setActiveTab('inquiries');
  }, [resolvedView]);

  const courseTitles = useMemo(() => courses.map((course) => course.title).filter(Boolean), [courses]);
  const activeBatches = useMemo(() => batches.filter((batch) => (batch.status || 'Active') === 'Active'), [batches]);
  const studentCountByBatch = useMemo(() => {
    const map = new Map();
    students.filter((student) => student.status === 'Active').forEach((student) => {
      map.set(student.batch, (map.get(student.batch) || 0) + 1);
    });
    return map;
  }, [students]);

  const filteredInquiries = useMemo(() => inquiries.filter((inquiry) => {
    const search = filters.search.toLowerCase();
    const matchesSearch = !search || [inquiry.name, inquiry.phone, inquiry.cnic, inquiry.email].some((value) => String(value || '').toLowerCase().includes(search));
    const matchesStatus = filters.status === 'all' || inquiry.status === filters.status;
    const matchesCourse = filters.course === 'all' || inquiry.course_interest === filters.course;
    const matchesSource = filters.source === 'all' || inquiry.hear_about_us === filters.source;
    const submitted = inquiry.submitted_at ? new Date(inquiry.submitted_at) : null;
    const matchesFrom = !filters.from || (submitted && submitted >= new Date(filters.from));
    const matchesTo = !filters.to || (submitted && submitted <= new Date(`${filters.to}T23:59:59`));
    return matchesSearch && matchesStatus && matchesCourse && matchesSource && matchesFrom && matchesTo;
  }), [inquiries, filters]);

  const stats = useMemo(() => ({
    total: inquiries.length,
    new: inquiries.filter((i) => i.status === 'new').length,
    contacted: inquiries.filter((i) => ['contacted', 'follow_up'].includes(i.status)).length,
    enrolled: inquiries.filter((i) => i.status === 'enrolled').length,
    lost: inquiries.filter((i) => i.status === 'lost').length
  }), [inquiries]);

  const selectedBatch = activeBatches.find((batch) => batch.id === enrollment.batchId);
  const finalFee = Math.max(toInt(enrollment.totalFee) - toInt(enrollment.discountAmount), 0);
  const batchesForCourse = activeBatches.filter((batch) => !enrollment.course || batch.course === enrollment.course);

  const openEnroll = (inquiry = null) => {
    setSuccess(null);
    const initialCourse = inquiry?.course_interest || '';
    const course = courses.find((item) => item.title === initialCourse);
    setEnrollment({
      ...emptyEnrollment,
      inquiryId: inquiry?.id || '',
      enrollmentSource: inquiry ? 'inquiry' : 'walk_in',
      name: inquiry?.name || '',
      cnic: inquiry?.cnic || '',
      phone: inquiry?.phone || '',
      email: inquiry?.email || '',
      city: inquiry?.city || '',
      hearAboutUs: inquiry?.hear_about_us || '',
      referralCode: inquiry?.referral_code || '',
      course: initialCourse,
      totalFee: course?.price || '',
      firstPaymentDate: new Date().toISOString().split('T')[0]
    });
    setEnrollmentOpen(true);
  };

  useEffect(() => {
    if (resolvedView === 'enroll' && courses.length > 0 && !enrollmentOpen) {
      openEnroll();
    }
  }, [resolvedView, courses.length, enrollmentOpen]);

  const updateEnrollment = (key, value) => {
    setEnrollment((prev) => {
      const next = { ...prev, [key]: key === 'cnic' ? formatCNIC(value) : value };
      if (key === 'course') {
        const course = courses.find((item) => item.title === value);
        next.batchId = '';
        next.totalFee = course?.price || prev.totalFee;
      }
      if (key === 'paymentPlan') {
        next.installmentCount = value === 'full' ? 1 : Number(value);
      }
      return next;
    });
  };

  const updateStatus = async () => {
    if (!statusTarget) return;
    const entry = {
      note: statusForm.note || `Status changed to ${statusLabel(statusForm.status)}`,
      timestamp: new Date().toISOString(),
      by: user?.name || 'Counsellor'
    };
    const existingNotes = Array.isArray(statusTarget.counsellor_notes) ? statusTarget.counsellor_notes : [];
    const { error } = await supabase.from('inquiries').update({
      status: statusForm.status,
      counsellor_notes: [...existingNotes, entry],
      last_updated: new Date().toISOString()
    }).eq('id', statusTarget.id);
    if (error) {
      toast.error('Failed to update inquiry');
      return;
    }
    await supabase.from('inquiry_notes').insert({
      inquiry_id: statusTarget.id,
      note: entry.note,
      status_changed_to: statusForm.status,
      added_by: user?.name || 'Counsellor'
    });
    toast.success('Inquiry updated');
    setStatusTarget(null);
    setStatusForm({ status: 'contacted', note: '' });
    loadData();
  };

  const enrollStudent = async (event) => {
    event.preventDefault();
    if (!selectedBatch) {
      toast.error('Please select a batch');
      return;
    }
    const required = ['name', 'fatherName', 'cnic', 'dob', 'gender', 'phone', 'email', 'city', 'address', 'education', 'hearAboutUs', 'course'];
    const missing = required.find((key) => !String(enrollment[key] || '').trim());
    if (missing) {
      toast.error('Please complete all required fields');
      return;
    }

    const isFullPlan = enrollment.paymentPlan === 'full';
    const computedInstallments = isFullPlan ? 1 : (Number(enrollment.installmentCount) || Number(enrollment.paymentPlan) || 1);

    const payload = {
      ...enrollment,
      batchId: enrollment.batchId,
      batchTiming: selectedBatch.time_shift || selectedBatch.timing_label || '',
      finalFee,
      totalFee: toInt(enrollment.totalFee),
      discountAmount: toInt(enrollment.discountAmount),
      firstPayment: toInt(enrollment.firstPayment),
      paymentPlan: isFullPlan ? 'full' : 'installment',
      installmentCount: computedInstallments,
      firstPaymentMethod: normalizePaymentMethod(enrollment.firstPaymentMethod || 'cash'),
      counsellorName: user?.name || 'Counsellor'
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/enroll-counsellor-student.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData?.session?.access_token || ''}`
      },
      body: JSON.stringify({ payload })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(data?.message || 'Enrollment failed');
      return;
    }
    if (!data?.ok) {
      toast.error(data?.message || 'Enrollment failed');
      return;
    }

    const admission = data.admission;
    await sendAdmissionEmail(EMAIL_EVENTS.WELCOME, {
      email: admission.email,
      name: admission.name,
      cnic: admission.cnic,
      course: admission.course,
      batch: admission.batch,
      timing: admission.batch_timing
    });
    await createNotification({
      userId: admission.id,
      role: 'student',
      type: 'enrollment_approved',
      title: 'Enrollment Confirmed',
      message: `You have been enrolled in ${admission.course} - ${admission.batch}.`,
      link: '/student/dashboard',
      sendEmail: false
    });
    setSuccess(admission);
    toast.success('Student enrolled successfully');
    loadData();
  };

  const sendLoginInstructions = async (student = success) => {
    if (!student?.email) {
      toast.error('Student email missing');
      return;
    }
    const email = await sendAdmissionEmail(EMAIL_EVENTS.LOGIN_INSTRUCTIONS, {
      email: student.email,
      name: student.name,
      cnic: student.cnic,
      course: student.course,
      batch: student.batch,
      timing: student.batch_timing
    });
    if (email.ok) toast.success('Login instructions sent');
    else toast.error(email.message || 'Email failed');
  };

  const saveStudentAction = async () => {
    if (!studentAction) return;
    if (studentAction.type === 'batch') {
      const batch = activeBatches.find((item) => item.id === studentAction.batchId);
      if (!batch) return toast.error('Select a batch');
      const { error } = await supabase.from('admissions').update({
        course: batch.course,
        batch: batch.batch_name,
        batch_timing: batch.time_shift || batch.timing_label || ''
      }).eq('id', studentAction.student.id);
      if (error) return toast.error('Batch update failed');
    }
    if (studentAction.type === 'payment') {
      const { error } = await supabase.from('payments').insert({
        entity_id: studentAction.student.id,
        entity_type: 'student',
        amount: toInt(studentAction.amount),
        paid_date: studentAction.paidDate || new Date().toISOString().split('T')[0],
        method: normalizePaymentMethod(studentAction.method || 'cash'),
        reference_number: studentAction.reference || null,
        status: 'paid',
        description: 'Counsellor payment record'
      });
      if (error) return toast.error('Payment failed');
    }
    if (studentAction.type === 'note') {
      const notes = [studentAction.student.counsellor_notes, studentAction.note].filter(Boolean).join('\n\n');
      const { error } = await supabase.from('admissions').update({ counsellor_notes: notes }).eq('id', studentAction.student.id);
      if (error) return toast.error('Note update failed');
    }
    toast.success('Student updated');
    setStudentAction(null);
    loadData();
  };

  return (
    <AdminLayout>
      <Page>
        <Header>
          <div>
            <h1>Counsellor Panel</h1>
            <p>Manage inquiries, walk-ins, enrollment, batch assignment, and first payments.</p>
          </div>
          <Primary onClick={() => openEnroll()}><FaPlus /> Add Walk-in Student</Primary>
        </Header>

        {(enrollmentOpen || resolvedView === 'enroll') ? (
          <InlinePanel>
            <InlinePanelHeader>
              <div>
                <h2>{success ? 'Student Enrolled' : 'Enroll New Student'}</h2>
                <p>{success ? 'Enrollment was completed successfully.' : 'Complete the student profile, batch assignment, and fee setup on this page.'}</p>
              </div>
              <button onClick={() => { setEnrollmentOpen(false); setSuccess(null); navigate('/admin/counsellor/inquiries'); }}>Back to Inquiries</button>
            </InlinePanelHeader>

            {success ? (
              <Success>
                <FaCheckCircle /><h2>Student enrolled successfully</h2>
                <p>{success.name} - {success.course} - {success.batch}</p>
                <p>CNIC: {success.cnic}</p>
                <Actions center><button onClick={() => sendLoginInstructions()}><FaEnvelope /> Send Login Instructions</button><button onClick={() => openEnroll()}>Enroll Another Student</button><button onClick={() => navigate(`/admin/management/students/${success.id}`)}>View Student Profile</button></Actions>
              </Success>
            ) : (
              <EnrollForm onSubmit={enrollStudent}>
                <SectionTitle>{enrollment.enrollmentSource === 'inquiry' ? 'From Inquiry' : 'Walk-in'} - Personal Information</SectionTitle>
                <Grid>
                  <Field><label>Full Name *</label><input value={enrollment.name} onChange={(e) => updateEnrollment('name', e.target.value)} /></Field>
                  <Field><label>Father's Name *</label><input value={enrollment.fatherName} onChange={(e) => updateEnrollment('fatherName', e.target.value)} /></Field>
                  <Field><label>CNIC *</label><input value={enrollment.cnic} maxLength={15} onChange={(e) => updateEnrollment('cnic', e.target.value)} /></Field>
                  <Field><label>Date of Birth *</label><input type="date" value={enrollment.dob} onChange={(e) => updateEnrollment('dob', e.target.value)} /></Field>
                  <Field><label>Gender *</label><select value={enrollment.gender} onChange={(e) => updateEnrollment('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option></select></Field>
                  <Field><label>Phone *</label><input value={enrollment.phone} onChange={(e) => updateEnrollment('phone', e.target.value)} /></Field>
                  <Field><label>Email *</label><input type="email" value={enrollment.email} onChange={(e) => updateEnrollment('email', e.target.value)} /></Field>
                  <Field><label>City *</label><input value={enrollment.city} onChange={(e) => updateEnrollment('city', e.target.value)} /></Field>
                  <Field className="wide"><label>Address *</label><textarea value={enrollment.address} onChange={(e) => updateEnrollment('address', e.target.value)} /></Field>
                  <Field><label>Education *</label><select value={enrollment.education} onChange={(e) => updateEnrollment('education', e.target.value)}><option value="">Select</option>{EDUCATION.map((item) => <option key={item}>{item}</option>)}</select></Field>
                  <Field><label>How did you hear about us? *</label><select value={enrollment.hearAboutUs} onChange={(e) => updateEnrollment('hearAboutUs', e.target.value)}><option value="">Select</option>{SOURCES.map((item) => <option key={item}>{item}</option>)}</select></Field>
                  <Field><label>Referral Code</label><input value={enrollment.referralCode} onChange={(e) => updateEnrollment('referralCode', e.target.value)} /></Field>
                </Grid>
                <SectionTitle>Course & Batch Assignment</SectionTitle>
                <Grid>
                  <Field><label>Course *</label><select value={enrollment.course} onChange={(e) => updateEnrollment('course', e.target.value)}><option value="">Select course</option>{courseTitles.map((title) => <option key={title}>{title}</option>)}</select></Field>
                  <Field><label>Batch *</label><select value={enrollment.batchId} onChange={(e) => updateEnrollment('batchId', e.target.value)}><option value="">Select batch</option>{batchesForCourse.map((batch) => { const used = studentCountByBatch.get(batch.batch_name) || 0; const left = (batch.capacity || 30) - used; return <option key={batch.id} value={batch.id}>{batch.batch_name} - {left} seats left</option>; })}</select></Field>
                  <Readonly>Timing: {selectedBatch?.time_shift || selectedBatch?.timing_label || '-'}</Readonly>
                  <Readonly>Start Date: {selectedBatch?.start_date || '-'}</Readonly>
                  <Field><label>Enrollment Type</label><select value={enrollment.enrollmentType} onChange={(e) => updateEnrollment('enrollmentType', e.target.value)}><option value="new">New Student</option><option value="re_enrollment">Re-enrollment</option></select></Field>
                </Grid>
                <SectionTitle>Fee Setup</SectionTitle>
                <Grid>
                  <Field><label>Total Fee</label><input type="number" value={enrollment.totalFee} onChange={(e) => updateEnrollment('totalFee', e.target.value)} /></Field>
                  <Field><label>Discount Amount</label><input type="number" value={enrollment.discountAmount} onChange={(e) => updateEnrollment('discountAmount', e.target.value)} /></Field>
                  <Field className="wide"><label>Discount Reason</label><input value={enrollment.discountReason} onChange={(e) => updateEnrollment('discountReason', e.target.value)} /></Field>
                  <Readonly>Final Fee: Rs. {finalFee.toLocaleString()}</Readonly>
                  <Field><label>Payment Plan</label><select value={enrollment.paymentPlan} onChange={(e) => updateEnrollment('paymentPlan', e.target.value)}><option value="full">Full</option><option value="2">Installments - 2 months</option><option value="3">Installments - 3 months</option><option value="6">Installments - 6 months</option></select></Field>
                  <Field><label>First Payment</label><input type="number" value={enrollment.firstPayment} onChange={(e) => updateEnrollment('firstPayment', e.target.value)} /></Field>
                  <Field><label>First Payment Method</label><select value={enrollment.firstPaymentMethod} onChange={(e) => updateEnrollment('firstPaymentMethod', e.target.value)}>{PAYMENT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                  <Field><label>First Payment Date</label><input type="date" value={enrollment.firstPaymentDate} onChange={(e) => updateEnrollment('firstPaymentDate', e.target.value)} /></Field>
                  <Field><label>First Payment Reference</label><input value={enrollment.firstPaymentRef} onChange={(e) => updateEnrollment('firstPaymentRef', e.target.value)} /></Field>
                  <Field className="wide"><label>Internal Notes</label><textarea value={enrollment.notes} onChange={(e) => updateEnrollment('notes', e.target.value)} /></Field>
                </Grid>
                <Submit type="submit"><FaCheckCircle /> Enroll Student</Submit>
              </EnrollForm>
            )}
          </InlinePanel>
        ) : (
          <>
            <Tabs>
              <Tab $active={activeTab === 'inquiries'} onClick={() => setActiveTab('inquiries')}>Inquiries</Tab>
              <Tab $active={activeTab === 'students'} onClick={() => setActiveTab('students')}>All Students</Tab>
            </Tabs>

            {activeTab === 'inquiries' ? (
              <>
            <Stats>
              <Stat><span>{stats.total}</span><small>Total Inquiries</small></Stat>
              <Stat><span>{stats.new}</span><small>New</small></Stat>
              <Stat><span>{stats.contacted}</span><small>In Progress</small></Stat>
              <Stat><span>{stats.enrolled}</span><small>Enrolled</small></Stat>
              <Stat><span>{stats.lost}</span><small>Lost</small></Stat>
            </Stats>

            <Filters>
              <Field compact><FaSearch /><input placeholder="Search name, phone, CNIC" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></Field>
              <Field compact><FaFilter /><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="all">All Status</option>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field compact><select value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })}><option value="all">All Courses</option>{courseTitles.map((title) => <option key={title} value={title}>{title}</option>)}</select></Field>
              <Field compact><select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}><option value="all">All Sources</option>{SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}</select></Field>
              <Field compact><input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></Field>
              <Field compact><input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></Field>
            </Filters>

            <TableCard>
              <table>
                <thead><tr><th>Name</th><th>Phone</th><th>Course Interest</th><th>Source</th><th>City</th><th>Submitted</th><th>Status</th><th>Note</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredInquiries.map((inquiry) => {
                    const lastNote = notes.find((note) => note.inquiry_id === inquiry.id)?.note || (Array.isArray(inquiry.counsellor_notes) ? inquiry.counsellor_notes.at(-1)?.note : '');
                    return (
                      <tr key={inquiry.id}>
                        <td><strong>{inquiry.name}</strong><small>{inquiry.email}</small></td>
                        <td>{inquiry.phone}</td>
                        <td>{inquiry.course_interest}</td>
                        <td>{inquiry.hear_about_us}</td>
                        <td>{inquiry.city}</td>
                        <td>{inquiry.submitted_at ? new Date(inquiry.submitted_at).toLocaleDateString() : '-'}</td>
                        <td><Badge $status={inquiry.status}>{statusLabel(inquiry.status)}</Badge></td>
                        <td className="muted">{lastNote ? `${lastNote.slice(0, 55)}${lastNote.length > 55 ? '...' : ''}` : '-'}</td>
                        <td><Actions><button onClick={() => { setStatusTarget(inquiry); setStatusForm({ status: inquiry.status || 'contacted', note: '' }); }}><FaPhone /> Update</button><button onClick={() => openEnroll(inquiry)}><FaCheckCircle /> Enroll</button><button onClick={() => setSelectedInquiry(inquiry)}><FaEye /> View</button></Actions></td>
                      </tr>
                    );
                  })}
                  {!loading && filteredInquiries.length === 0 && <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40 }}>No inquiries found.</td></tr>}
                </tbody>
              </table>
            </TableCard>
              </>
            ) : (
              <StudentList students={students} batches={activeBatches} navigate={navigate} onAction={setStudentAction} />
            )}
          </>
        )}
      </Page>

      <AnimatePresence>
        {selectedInquiry && (
          <Drawer onClose={() => setSelectedInquiry(null)}>
            <h2>{selectedInquiry.name}</h2>
            <InfoGrid>
              {['phone', 'email', 'cnic', 'city', 'course_interest', 'hear_about_us', 'referral_code', 'message'].map((key) => <Info key={key}><small>{key.replace(/_/g, ' ')}</small><span>{selectedInquiry[key] || '-'}</span></Info>)}
            </InfoGrid>
            <h3>Notes Timeline</h3>
            <Timeline>{notes.filter((note) => note.inquiry_id === selectedInquiry.id).map((note) => <li key={note.id}><strong>{statusLabel(note.status_changed_to)}</strong><p>{note.note}</p><small>{note.added_by || 'Counsellor'} - {new Date(note.added_at).toLocaleString()}</small></li>)}</Timeline>
          </Drawer>
        )}
        {statusTarget && (
          <Modal onClose={() => setStatusTarget(null)} title="Update Inquiry Status">
            <Field><label>Status</label><select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>{STATUS_OPTIONS.filter((item) => item.value !== 'enrolled').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            <Field><label>Counsellor Note</label><textarea value={statusForm.note} onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })} /></Field>
            <Primary onClick={updateStatus}>Save Status</Primary>
          </Modal>
        )}
        {studentAction && (
          <Modal onClose={() => setStudentAction(null)} title={studentAction.type === 'batch' ? 'Edit Batch Assignment' : studentAction.type === 'payment' ? 'Add Payment' : 'Add Counsellor Note'}>
            {studentAction.type === 'batch' && <Field><label>Batch</label><select value={studentAction.batchId || ''} onChange={(e) => setStudentAction({ ...studentAction, batchId: e.target.value })}>{activeBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.course} - {batch.batch_name}</option>)}</select></Field>}
            {studentAction.type === 'payment' && <Grid><Field><label>Amount</label><input type="number" value={studentAction.amount || ''} onChange={(e) => setStudentAction({ ...studentAction, amount: e.target.value })} /></Field><Field><label>Paid Date</label><input type="date" value={studentAction.paidDate || new Date().toISOString().split('T')[0]} onChange={(e) => setStudentAction({ ...studentAction, paidDate: e.target.value })} /></Field><Field><label>Method</label><select value={studentAction.method || 'cash'} onChange={(e) => setStudentAction({ ...studentAction, method: e.target.value })}>{PAYMENT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field><label>Reference</label><input value={studentAction.reference || ''} onChange={(e) => setStudentAction({ ...studentAction, reference: e.target.value })} /></Field></Grid>}
            {studentAction.type === 'note' && <Field><label>Note</label><textarea value={studentAction.note || ''} onChange={(e) => setStudentAction({ ...studentAction, note: e.target.value })} /></Field>}
            <Primary onClick={saveStudentAction}>Save</Primary>
          </Modal>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

function StudentList({ students, batches, navigate, onAction }) {
  const [search, setSearch] = useState('');
  const visible = students.filter((student) => !search || [student.name, student.cnic, student.phone, student.email, student.course, student.batch].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase())));
  return (
    <>
      <Filters><Field compact><FaSearch /><input placeholder="Search students" value={search} onChange={(e) => setSearch(e.target.value)} /></Field></Filters>
      <TableCard>
        <table>
          <thead><tr><th>Student</th><th>CNIC</th><th>Course</th><th>Batch</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{visible.map((student) => <tr key={student.id}><td><strong>{student.name}</strong><small>{student.email}</small></td><td>{student.cnic}</td><td>{student.course}</td><td>{student.batch}</td><td><Badge $status={student.status}>{student.status}</Badge></td><td><Actions><button onClick={() => navigate(`/admin/management/students/${student.id}`)}><FaEye /> Profile</button><button onClick={() => onAction({ type: 'batch', student, batchId: batches.find((batch) => batch.batch_name === student.batch)?.id || '' })}>Batch</button><button onClick={() => onAction({ type: 'payment', student })}><FaMoneyBillWave /> Payment</button><button onClick={() => onAction({ type: 'note', student, note: '' })}><FaStickyNote /> Note</button></Actions></td></tr>)}</tbody>
        </table>
      </TableCard>
    </>
  );
}

function Modal({ children, onClose, title, wide }) {
  return <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ModalCard $wide={wide} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}><ModalHeader><h2>{title}</h2><button onClick={onClose}><FaTimes /></button></ModalHeader><ModalBody>{children}</ModalBody></ModalCard></Overlay>;
}

function Drawer({ children, onClose }) {
  return <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><DrawerCard initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}><ModalHeader><h2>Inquiry Details</h2><button onClick={onClose}><FaTimes /></button></ModalHeader><ModalBody>{children}</ModalBody></DrawerCard></Overlay>;
}

const Page = styled.div`color:#fff;padding:10px 0;`;
const Header = styled.div`display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;h1{margin:0 0 6px;font-size:2rem;}p{margin:0;color:#888;}`;
const Primary = styled.button`display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;border-radius:10px;padding:12px 18px;font-weight:800;cursor:pointer;&:disabled{opacity:.6;cursor:not-allowed;}`;
const InlinePanel = styled.div`background:#0f1014;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:24px;box-shadow:0 20px 70px rgba(0,0,0,.28);`;
const InlinePanelHeader = styled.div`display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.07);h2{margin:0 0 6px;color:#fff;}p{margin:0;color:#888;}button{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;}@media(max-width:760px){flex-direction:column;button{width:100%;}}`;
const Tabs = styled.div`display:flex;gap:8px;background:#111318;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:6px;width:max-content;margin-bottom:22px;`;
const Tab = styled.button`border:none;border-radius:9px;padding:10px 18px;cursor:pointer;font-weight:800;color:${p=>p.$active?'#fff':'#888'};background:${p=>p.$active?'#7B1F2E':'transparent'};`;
const Stats = styled.div`display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px;@media(max-width:900px){grid-template-columns:repeat(2,1fr);}`;
const Stat = styled.div`background:#111318;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px;span{display:block;font-size:1.6rem;font-weight:900;}small{color:#888;}`;
const Filters = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:18px;`;
const Field = styled.div`display:flex;flex-direction:${p=>p.compact?'row':'column'};align-items:${p=>p.compact?'center':'stretch'};gap:8px;background:${p=>p.compact?'#111318':'transparent'};border:${p=>p.compact?'1px solid rgba(255,255,255,.07)':'none'};border-radius:10px;padding:${p=>p.compact?'0 12px':'0'};&.wide{grid-column:1/-1;}label{color:#aaa;font-size:.82rem;font-weight:800;text-transform:uppercase;}svg{color:#777;}input,select,textarea{width:100%;background:${p=>p.compact?'transparent':'#111318'};border:${p=>p.compact?'none':'1px solid rgba(255,255,255,.08)'};color:#fff;border-radius:10px;padding:12px;outline:none;}textarea{min-height:90px;resize:vertical;}option{color:#111;}`;
const TableCard = styled.div`background:#111318;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:auto;table{width:100%;border-collapse:collapse;min-width:980px;}th,td{padding:15px;border-bottom:1px solid rgba(255,255,255,.05);text-align:left;}th{font-size:.76rem;text-transform:uppercase;color:#777;}td small{display:block;color:#777;margin-top:4px;}td.muted{color:#888;}`;
const Badge = styled.span`display:inline-flex;padding:6px 10px;border-radius:999px;font-size:.72rem;font-weight:900;text-transform:uppercase;background:${p=>p.$status==='enrolled'||p.$status==='Active'?'rgba(46,204,113,.14)':p.$status==='lost'?'rgba(239,68,68,.14)':p.$status==='follow_up'?'rgba(147,51,234,.14)':p.$status==='contacted'?'rgba(245,158,11,.14)':'rgba(79,142,247,.14)'};color:${p=>p.$status==='enrolled'||p.$status==='Active'?'#2ecc71':p.$status==='lost'?'#ef4444':p.$status==='follow_up'?'#c084fc':p.$status==='contacted'?'#f59e0b':'#4F8EF7'};`;
const Actions = styled.div`display:flex;gap:8px;flex-wrap:wrap;justify-content:${p=>p.center?'center':'flex-start'};button{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:700;}`;
const Overlay = styled(motion.div)`position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:2000;display:flex;align-items:center;justify-content:center;padding:18px;`;
const ModalCard = styled(motion.div)`width:100%;max-width:${p=>p.$wide?'1040px':'560px'};max-height:92vh;overflow:auto;background:#0f1014;border:1px solid rgba(255,255,255,.08);border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.55);`;
const DrawerCard = styled(motion.div)`margin-left:auto;width:min(520px,100%);height:100%;overflow:auto;background:#0f1014;border-left:1px solid rgba(255,255,255,.1);`;
const ModalHeader = styled.div`display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.07);h2{margin:0;}button{background:none;border:none;color:#999;cursor:pointer;font-size:1.1rem;}`;
const ModalBody = styled.div`padding:24px;`;
const InfoGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0;`;
const Info = styled.div`background:#111318;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px;small{display:block;color:#777;text-transform:uppercase;margin-bottom:5px;}span{color:#fff;}`;
const Timeline = styled.ul`list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:12px;li{border-left:3px solid #7B1F2E;background:#111318;padding:12px;border-radius:8px;}p{margin:6px 0;color:#ddd;}small{color:#777;}`;
const EnrollForm = styled.form`display:flex;flex-direction:column;gap:18px;`;
const Grid = styled.div`display:grid;grid-template-columns:repeat(2,1fr);gap:14px;@media(max-width:760px){grid-template-columns:1fr;}`;
const SectionTitle = styled.h3`margin:6px 0 0;color:#fff;border-top:1px solid rgba(255,255,255,.07);padding-top:18px;`;
const Readonly = styled.div`background:#111318;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:13px;color:#aaa;`;
const Submit = styled.button`height:54px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;`;
const Success = styled.div`text-align:center;svg{font-size:3rem;color:#2ecc71;}p{color:#bbb;}`;

export default CounsellorPanel;
