import React, { useEffect, useMemo, useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope,
  FaCheckCircle, FaEye, FaFilter, FaMoneyBillWave, FaPhone, FaPlus,
  FaSearch, FaStickyNote, FaTimes, FaUserGraduate, FaCalendarAlt, FaExclamationCircle,
  FaGraduationCap, FaClock, FaCalendarDay, FaUsers
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

const preventNegativeKeys = (e) => {
  if (['-', '+', 'e', 'E'].includes(e.key)) {
    e.preventDefault();
  }
};

const toInt = (value) => Math.max(0, Number.parseInt(value || '0', 10) || 0);
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
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [studentAction, setStudentAction] = useState(null);

  const dobRef = useRef(null);
  const payDateRef = useRef(null);
  const filterFromRef = useRef(null);
  const filterToRef = useRef(null);
  const modalPayDateRef = useRef(null);

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
  const selectedBatchSeatsUsed = selectedBatch ? (studentCountByBatch.get(selectedBatch.batch_name) || 0) : 0;
  const seatsAvailable = selectedBatch ? Math.max(0, (selectedBatch.capacity || 30) - selectedBatchSeatsUsed) : 0;
  const totalFeeInt = toInt(enrollment.totalFee);
  const discountInt = toInt(enrollment.discountAmount);
  const finalFee = Math.max(0, totalFeeInt - discountInt);
  const batchesForCourse = activeBatches.filter((batch) => !enrollment.course || batch.course === enrollment.course);
  const todayDateStr = new Date().toISOString().split('T')[0];

  const openEnroll = (inquiry = null) => {
    setSuccess(null);
    setErrors({});
    const initialCourse = inquiry?.course_interest || '';
    const course = courses.find((item) => item.title === initialCourse);
    setEnrollment({
      ...emptyEnrollment,
      inquiryId: inquiry?.id || '',
      enrollmentSource: inquiry ? 'inquiry' : 'walk_in',
      name: inquiry?.name || '',
      cnic: inquiry?.cnic ? formatCNIC(inquiry.cnic) : '',
      phone: inquiry?.phone || '',
      email: inquiry?.email || '',
      city: inquiry?.city || '',
      hearAboutUs: inquiry?.hear_about_us || '',
      referralCode: inquiry?.referral_code || '',
      course: initialCourse,
      totalFee: course?.price ? String(course.price) : '',
      firstPaymentDate: todayDateStr
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
      let nextValue = value;
      if (key === 'cnic') {
        nextValue = formatCNIC(value);
      } else if (key === 'phone') {
        nextValue = String(value || '').replace(/[^\d+]/g, '').slice(0, 15);
      } else if (['totalFee', 'discountAmount', 'firstPayment'].includes(key)) {
        // Strip non-digits and prevent any negative values
        const digitsOnly = String(value || '').replace(/\D/g, '');
        nextValue = digitsOnly === '' ? '' : digitsOnly;
      }

      const next = { ...prev, [key]: nextValue };
      if (key === 'course') {
        const course = courses.find((item) => item.title === value);
        next.batchId = '';
        next.totalFee = course?.price ? String(course.price) : prev.totalFee;
      }
      if (key === 'paymentPlan') {
        next.installmentCount = value === 'full' ? 1 : Number(value);
      }
      return next;
    });

    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const validateEnrollment = (data, batch) => {
    const errs = {};

    // 1. Full Name
    const name = String(data.name || '').trim();
    if (!name) {
      errs.name = 'Full name is required';
    } else if (name.length < 2) {
      errs.name = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s.']+$/.test(name)) {
      errs.name = 'Name should only contain letters and spaces';
    }

    // 2. Father Name
    const fatherName = String(data.fatherName || '').trim();
    if (!fatherName) {
      errs.fatherName = "Father's name is required";
    } else if (fatherName.length < 2) {
      errs.fatherName = "Father's name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s.']+$/.test(fatherName)) {
      errs.fatherName = "Father's name should only contain letters and spaces";
    }

    // 3. CNIC
    const cnicDigits = String(data.cnic || '').replace(/\D/g, '');
    if (!cnicDigits) {
      errs.cnic = 'CNIC is required';
    } else if (cnicDigits.length !== 13) {
      errs.cnic = 'CNIC must be exactly 13 digits (e.g. 35201-1234567-1)';
    }

    // 4. Date of Birth
    const dob = data.dob;
    if (!dob) {
      errs.dob = 'Date of birth is required';
    } else {
      const dobDate = new Date(dob);
      const today = new Date();
      if (isNaN(dobDate.getTime())) {
        errs.dob = 'Invalid date of birth';
      } else if (dobDate >= today) {
        errs.dob = 'Date of birth cannot be today or in the future';
      } else {
        const minAgeDate = new Date();
        minAgeDate.setFullYear(minAgeDate.getFullYear() - 5);
        if (dobDate > minAgeDate) {
          errs.dob = 'Student must be at least 5 years old';
        }
      }
    }

    // 5. Gender
    if (!data.gender) {
      errs.gender = 'Please select a gender';
    }

    // 6. Phone
    const phone = String(data.phone || '').trim();
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone) {
      errs.phone = 'Phone number is required';
    } else if (phoneDigits.length < 10 || phoneDigits.length > 12) {
      errs.phone = 'Please enter a valid mobile number (10-11 digits)';
    }

    // 7. Email
    const email = String(data.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(email)) {
      errs.email = 'Please enter a valid email address';
    }

    // 8. City
    const city = String(data.city || '').trim();
    if (!city) {
      errs.city = 'City is required';
    } else if (city.length < 2) {
      errs.city = 'City name must be at least 2 characters';
    }

    // 9. Address
    const address = String(data.address || '').trim();
    if (!address) {
      errs.address = 'Street address is required';
    } else if (address.length < 5) {
      errs.address = 'Please enter a complete address (at least 5 characters)';
    }

    // 10. Education
    if (!data.education) {
      errs.education = 'Please select education level';
    }

    // 11. How did you hear about us
    if (!data.hearAboutUs) {
      errs.hearAboutUs = 'Please select how you heard about us';
    }

    // 12. Course
    if (!data.course) {
      errs.course = 'Please select a course';
    }

    // 13. Batch
    if (!data.batchId) {
      errs.batchId = 'Please select a batch';
    } else if (batch) {
      const used = studentCountByBatch.get(batch.batch_name) || 0;
      const left = (batch.capacity || 30) - used;
      if (left <= 0) {
        errs.batchId = `Selected batch "${batch.batch_name}" is full. Please choose another.`;
      }
    }

    // 14. Fees Validation
    const total = toInt(data.totalFee);
    if (!data.totalFee || total <= 0) {
      errs.totalFee = 'Total fee must be greater than 0';
    }

    const discount = toInt(data.discountAmount);
    if (discount < 0) {
      errs.discountAmount = 'Discount cannot be negative';
    } else if (discount > total) {
      errs.discountAmount = `Discount cannot exceed total fee (Rs. ${total.toLocaleString()})`;
    }

    if (discount > 0 && !String(data.discountReason || '').trim()) {
      errs.discountReason = 'Please specify the reason for discount';
    }

    const calculatedFinal = Math.max(0, total - discount);
    const firstPayment = toInt(data.firstPayment);
    if (firstPayment < 0) {
      errs.firstPayment = 'First payment cannot be negative';
    } else if (firstPayment > calculatedFinal) {
      errs.firstPayment = `First payment cannot exceed final fee (Rs. ${calculatedFinal.toLocaleString()})`;
    }

    if (firstPayment > 0) {
      if (!data.firstPaymentDate) {
        errs.firstPaymentDate = 'First payment date is required';
      }
      if (!data.firstPaymentMethod) {
        errs.firstPaymentMethod = 'Payment method is required';
      }
      if (['bank_transfer', 'online', 'cheque'].includes(data.firstPaymentMethod) && !String(data.firstPaymentRef || '').trim()) {
        errs.firstPaymentRef = 'Reference # or Cheque # is required for non-cash payment';
      }
    }

    return errs;
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

    const formErrors = validateEnrollment(enrollment, selectedBatch);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      const firstError = Object.values(formErrors)[0];
      toast.error(firstError);
      return;
    }

    const isFullPlan = enrollment.paymentPlan === 'full';
    const computedInstallments = isFullPlan ? 1 : (Number(enrollment.installmentCount) || Number(enrollment.paymentPlan) || 1);

    const payload = {
      ...enrollment,
      batchId: enrollment.batchId,
      batchTiming: selectedBatch?.time_shift || selectedBatch?.timing_label || '',
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
    const token = sessionData?.session?.access_token || '';
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    let response;
    let data;

    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // 1. Try Next.js API route first (native on localhost and Node.js environments)
    try {
      response = await fetch('/api/admin/enroll-counsellor-student', {
        method: 'POST',
        headers,
        body: JSON.stringify({ payload })
      });
      data = await response.json().catch(() => null);
    } catch (err) {
      // Ignore network fallback to PHP
    }

    // 2. Only fallback to PHP if not on localhost AND the Next.js route wasn't found (404) or network failed
    if (!isLocalhost && (!response || response.status === 404)) {
      try {
        const phpResponse = await fetch('/api/admin/enroll-counsellor-student.php', {
          method: 'POST',
          headers,
          body: JSON.stringify({ payload })
        });
        const phpData = await phpResponse.json().catch(() => null);
        response = phpResponse;
        data = phpData;
      } catch (err) {
        // Fallback finished
      }
    }

    if (!response || !response.ok) {
      toast.error(data?.message || `Enrollment failed (${response?.status || 'network error'})`);
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
              <EnrollForm onSubmit={enrollStudent} noValidate>
                {/* Section 1: Personal Information */}
                <FormSection>
                  <SectionHeader>
                    <div className="title-group">
                      <div className="icon-wrap"><FaUserGraduate /></div>
                      <div>
                        <h3>Personal Information</h3>
                        <p>{enrollment.enrollmentSource === 'inquiry' ? 'Pre-filled from website inquiry' : 'Walk-in candidate registration'}</p>
                      </div>
                    </div>
                    <span className="step-tag">Step 1 of 3</span>
                  </SectionHeader>

                  <FormGrid>
                    <Field $hasError={!!errors.name}>
                      <label>Full Name <span className="req">*</span></label>
                      <input
                        value={enrollment.name}
                        onChange={(e) => updateEnrollment('name', e.target.value)}
                        placeholder="e.g. Muhammad Ali"
                      />
                      {errors.name && <FieldError><FaExclamationCircle /> {errors.name}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.fatherName}>
                      <label>Father's Name <span className="req">*</span></label>
                      <input
                        value={enrollment.fatherName}
                        onChange={(e) => updateEnrollment('fatherName', e.target.value)}
                        placeholder="e.g. Tariq Mehmood"
                      />
                      {errors.fatherName && <FieldError><FaExclamationCircle /> {errors.fatherName}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.cnic}>
                      <label>CNIC (13 Digits) <span className="req">*</span></label>
                      <input
                        value={enrollment.cnic}
                        maxLength={15}
                        onChange={(e) => updateEnrollment('cnic', e.target.value)}
                        placeholder="35201-1234567-1"
                      />
                      {errors.cnic && <FieldError><FaExclamationCircle /> {errors.cnic}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.dob}>
                      <label>Date of Birth <span className="req">*</span></label>
                      <input
                        ref={dobRef}
                        type="date"
                        max={todayDateStr}
                        value={enrollment.dob}
                        onChange={(e) => updateEnrollment('dob', e.target.value)}
                        onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
                      />
                      {errors.dob && <FieldError><FaExclamationCircle /> {errors.dob}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.gender}>
                      <label>Gender <span className="req">*</span></label>
                      <select value={enrollment.gender} onChange={(e) => updateEnrollment('gender', e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {errors.gender && <FieldError><FaExclamationCircle /> {errors.gender}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.phone}>
                      <label>Mobile Number <span className="req">*</span></label>
                      <input
                        value={enrollment.phone}
                        onChange={(e) => updateEnrollment('phone', e.target.value)}
                        placeholder="03001234567"
                      />
                      {errors.phone && <FieldError><FaExclamationCircle /> {errors.phone}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.email}>
                      <label>Email Address <span className="req">*</span></label>
                      <input
                        type="email"
                        value={enrollment.email}
                        onChange={(e) => updateEnrollment('email', e.target.value)}
                        placeholder="student@example.com"
                      />
                      {errors.email && <FieldError><FaExclamationCircle /> {errors.email}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.city}>
                      <label>City <span className="req">*</span></label>
                      <input
                        value={enrollment.city}
                        onChange={(e) => updateEnrollment('city', e.target.value)}
                        placeholder="e.g. Lahore"
                      />
                      {errors.city && <FieldError><FaExclamationCircle /> {errors.city}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.education}>
                      <label>Education Level <span className="req">*</span></label>
                      <select value={enrollment.education} onChange={(e) => updateEnrollment('education', e.target.value)}>
                        <option value="">Select Education</option>
                        {EDUCATION.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      {errors.education && <FieldError><FaExclamationCircle /> {errors.education}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.hearAboutUs}>
                      <label>How Did You Hear About Us? <span className="req">*</span></label>
                      <select value={enrollment.hearAboutUs} onChange={(e) => updateEnrollment('hearAboutUs', e.target.value)}>
                        <option value="">Select Option</option>
                        {SOURCES.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      {errors.hearAboutUs && <FieldError><FaExclamationCircle /> {errors.hearAboutUs}</FieldError>}
                    </Field>

                    <Field className="wide">
                      <label>Referral Code (Optional)</label>
                      <input
                        value={enrollment.referralCode}
                        onChange={(e) => updateEnrollment('referralCode', e.target.value)}
                        placeholder="Enter ambassador or student referral code"
                      />
                    </Field>

                    <Field className="wide" $hasError={!!errors.address}>
                      <label>Residential Address <span className="req">*</span></label>
                      <textarea
                        value={enrollment.address}
                        onChange={(e) => updateEnrollment('address', e.target.value)}
                        placeholder="House #, street, area, city..."
                      />
                      {errors.address && <FieldError><FaExclamationCircle /> {errors.address}</FieldError>}
                    </Field>
                  </FormGrid>
                </FormSection>

                {/* Section 2: Course & Batch Assignment */}
                <FormSection>
                  <SectionHeader>
                    <div className="title-group">
                      <div className="icon-wrap"><FaGraduationCap /></div>
                      <div>
                        <h3>Course & Batch Assignment</h3>
                        <p>Assign student to program and scheduled batch</p>
                      </div>
                    </div>
                    <span className="step-tag">Step 2 of 3</span>
                  </SectionHeader>

                  <FormGrid>
                    <Field $hasError={!!errors.course}>
                      <label>Selected Course <span className="req">*</span></label>
                      <select value={enrollment.course} onChange={(e) => updateEnrollment('course', e.target.value)}>
                        <option value="">Choose Course</option>
                        {courseTitles.map((title) => <option key={title} value={title}>{title}</option>)}
                      </select>
                      {errors.course && <FieldError><FaExclamationCircle /> {errors.course}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.batchId}>
                      <label>Assign Batch <span className="req">*</span></label>
                      <select value={enrollment.batchId} onChange={(e) => updateEnrollment('batchId', e.target.value)}>
                        <option value="">Choose Batch</option>
                        {batchesForCourse.map((batch) => {
                          const used = studentCountByBatch.get(batch.batch_name) || 0;
                          const left = (batch.capacity || 30) - used;
                          return (
                            <option key={batch.id} value={batch.id} disabled={left <= 0}>
                              {batch.batch_name} {left <= 0 ? '(FULL)' : `(${left} seats left)`}
                            </option>
                          );
                        })}
                      </select>
                      {errors.batchId && <FieldError><FaExclamationCircle /> {errors.batchId}</FieldError>}
                    </Field>

                    <Field className="wide">
                      <label>Enrollment Category</label>
                      <select value={enrollment.enrollmentType} onChange={(e) => updateEnrollment('enrollmentType', e.target.value)}>
                        <option value="new">New Student Enrollment</option>
                        <option value="re_enrollment">Re-enrollment (Alumni / Previous Student)</option>
                      </select>
                    </Field>

                    {selectedBatch && (
                      <BatchDetailsCard>
                        <div>
                          <small><FaClock /> Shift / Timing</small>
                          <strong>{selectedBatch.time_shift || selectedBatch.timing_label || 'Regular Schedule'}</strong>
                        </div>
                        <div>
                          <small><FaCalendarDay /> Start Date</small>
                          <strong>{selectedBatch.start_date || 'To be announced'}</strong>
                        </div>
                        <div>
                          <small><FaUsers /> Capacity</small>
                          <strong className={seatsAvailable > 5 ? 'good' : seatsAvailable > 0 ? 'warning' : 'danger'}>
                            {seatsAvailable > 0 ? `${seatsAvailable} seats remaining` : 'Batch Full'}
                          </strong>
                        </div>
                      </BatchDetailsCard>
                    )}
                  </FormGrid>
                </FormSection>

                {/* Section 3: Fee Setup */}
                <FormSection>
                  <SectionHeader>
                    <div className="title-group">
                      <div className="icon-wrap"><FaMoneyBillWave /></div>
                      <div>
                        <h3>Fee & Payment Setup</h3>
                        <p>Configure pricing, discounts, payment plans, and first payment voucher</p>
                      </div>
                    </div>
                    <span className="step-tag">Step 3 of 3</span>
                  </SectionHeader>

                  <FormGrid>
                    <FeeDashboard>
                      <FeeCard>
                        <small>Course Fee</small>
                        <span>Rs. {totalFeeInt.toLocaleString()}</span>
                      </FeeCard>
                      <FeeCard $variant="discount">
                        <small>Discount</small>
                        <span>- Rs. {discountInt.toLocaleString()}</span>
                      </FeeCard>
                      <FeeCard $variant="final">
                        <small>Final Payable</small>
                        <span>Rs. {finalFee.toLocaleString()}</span>
                      </FeeCard>
                      <FeeCard $variant="due">
                        <small>Remaining Due</small>
                        <span>Rs. {Math.max(0, finalFee - toInt(enrollment.firstPayment)).toLocaleString()}</span>
                      </FeeCard>
                    </FeeDashboard>

                    <Field $hasError={!!errors.totalFee}>
                      <label>Total Fee (Rs.) <span className="req">*</span></label>
                      <input
                        type="number"
                        min="0"
                        onKeyDown={preventNegativeKeys}
                        value={enrollment.totalFee}
                        onChange={(e) => updateEnrollment('totalFee', e.target.value)}
                        placeholder="e.g. 25000"
                      />
                      {errors.totalFee && <FieldError><FaExclamationCircle /> {errors.totalFee}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.discountAmount}>
                      <label>Discount Amount (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        max={enrollment.totalFee || undefined}
                        onKeyDown={preventNegativeKeys}
                        value={enrollment.discountAmount}
                        onChange={(e) => updateEnrollment('discountAmount', e.target.value)}
                        placeholder="0"
                      />
                      {errors.discountAmount && <FieldError><FaExclamationCircle /> {errors.discountAmount}</FieldError>}
                    </Field>

                    <Field className="wide" $hasError={!!errors.discountReason}>
                      <label>Discount Reason {discountInt > 0 ? <span className="req">*</span> : '(Optional)'}</label>
                      <input
                        value={enrollment.discountReason}
                        onChange={(e) => updateEnrollment('discountReason', e.target.value)}
                        placeholder={discountInt > 0 ? "Reason for discount (required)" : "e.g. Early Bird, Need-based, Merit scholarship"}
                      />
                      {errors.discountReason && <FieldError><FaExclamationCircle /> {errors.discountReason}</FieldError>}
                    </Field>

                    <Field>
                      <label>Payment Plan</label>
                      <select value={enrollment.paymentPlan} onChange={(e) => updateEnrollment('paymentPlan', e.target.value)}>
                        <option value="full">Full One-Time Payment</option>
                        <option value="2">2 Monthly Installments</option>
                        <option value="3">3 Monthly Installments</option>
                        <option value="6">6 Monthly Installments</option>
                      </select>
                    </Field>

                    <Field $hasError={!!errors.firstPayment}>
                      <label>First Payment Amount (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        max={finalFee}
                        onKeyDown={preventNegativeKeys}
                        value={enrollment.firstPayment}
                        onChange={(e) => updateEnrollment('firstPayment', e.target.value)}
                        placeholder="0"
                      />
                      {errors.firstPayment && <FieldError><FaExclamationCircle /> {errors.firstPayment}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.firstPaymentMethod}>
                      <label>Payment Method</label>
                      <select value={enrollment.firstPaymentMethod} onChange={(e) => updateEnrollment('firstPaymentMethod', e.target.value)}>
                        {PAYMENT_METHODS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                      {errors.firstPaymentMethod && <FieldError><FaExclamationCircle /> {errors.firstPaymentMethod}</FieldError>}
                    </Field>

                    <Field $hasError={!!errors.firstPaymentDate}>
                      <label>Payment Date</label>
                      <input
                        ref={payDateRef}
                        type="date"
                        value={enrollment.firstPaymentDate}
                        onChange={(e) => updateEnrollment('firstPaymentDate', e.target.value)}
                        onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
                      />
                      {errors.firstPaymentDate && <FieldError><FaExclamationCircle /> {errors.firstPaymentDate}</FieldError>}
                    </Field>

                    <Field className="wide" $hasError={!!errors.firstPaymentRef}>
                      <label>Payment Reference / Txn ID {['bank_transfer', 'online', 'cheque'].includes(enrollment.firstPaymentMethod) && toInt(enrollment.firstPayment) > 0 ? <span className="req">*</span> : '(Optional)'}</label>
                      <input
                        value={enrollment.firstPaymentRef}
                        onChange={(e) => updateEnrollment('firstPaymentRef', e.target.value)}
                        placeholder="Receipt # / Transaction ID / Cheque #"
                      />
                      {errors.firstPaymentRef && <FieldError><FaExclamationCircle /> {errors.firstPaymentRef}</FieldError>}
                    </Field>

                    <Field className="wide">
                      <label>Internal Counsellor Notes</label>
                      <textarea
                        value={enrollment.notes}
                        onChange={(e) => updateEnrollment('notes', e.target.value)}
                        placeholder="Add any internal comments, follow-up requirements, or payment promises..."
                      />
                    </Field>
                  </FormGrid>
                </FormSection>

                <SubmitButton type="submit">
                  <FaCheckCircle /> Complete & Enroll Student
                </SubmitButton>
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
              <Field compact>
                <input
                  ref={filterFromRef}
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
                  title="From Date"
                />
              </Field>
              <Field compact>
                <input
                  ref={filterToRef}
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
                  title="To Date"
                />
              </Field>
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
            {studentAction.type === 'payment' && (
              <Grid>
                <Field>
                  <label>Amount (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    onKeyDown={preventNegativeKeys}
                    value={studentAction.amount || ''}
                    onChange={(e) => setStudentAction({ ...studentAction, amount: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 10000"
                  />
                </Field>
                <Field>
                  <label>Paid Date *</label>
                  <input
                    ref={modalPayDateRef}
                    type="date"
                    value={studentAction.paidDate || todayDateStr}
                    onChange={(e) => setStudentAction({ ...studentAction, paidDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
                  />
                </Field>
                <Field>
                  <label>Method *</label>
                  <select value={studentAction.method || 'cash'} onChange={(e) => setStudentAction({ ...studentAction, method: e.target.value })}>
                    {PAYMENT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
                <Field>
                  <label>Reference</label>
                  <input
                    value={studentAction.reference || ''}
                    onChange={(e) => setStudentAction({ ...studentAction, reference: e.target.value })}
                    placeholder="Txn ID / Cheque #"
                  />
                </Field>
              </Grid>
            )}
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
const Field = styled.div`
  display: flex;
  flex-direction: ${p => p.compact ? 'row' : 'column'};
  align-items: ${p => p.compact ? 'center' : 'stretch'};
  gap: ${p => p.compact ? '8px' : '6px'};
  background: ${p => p.compact ? '#111318' : 'transparent'};
  border: ${p => p.compact ? '1px solid rgba(255,255,255,.07)' : 'none'};
  border-radius: 10px;
  padding: ${p => p.compact ? '0 12px' : '0'};
  min-width: 0;
  width: 100%;
  box-sizing: border-box;

  &.wide {
    grid-column: 1 / -1;
  }

  label {
    display: flex;
    align-items: center;
    color: ${p => p.$hasError ? '#f87171' : '#cbd5e1'};
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
    .req {
      color: #ef4444;
      margin-left: 3px;
      font-weight: 800;
    }
  }

  svg {
    color: #888;
    flex-shrink: 0;
  }

  input, select, textarea {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    background: ${p => p.compact ? 'transparent' : '#111318'};
    border: ${p => p.compact ? 'none' : `1px solid ${p.$hasError ? '#ef4444' : 'rgba(255,255,255,.09)'}`};
    color: #fff;
    border-radius: ${p => p.compact ? '0' : '10px'};
    padding: ${p => p.compact ? '10px 0' : '12px 14px'};
    font-size: 0.92rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

    &:hover {
      ${p => !p.compact && `border-color: ${p.$hasError ? '#ef4444' : 'rgba(255,255,255,.2)'};`}
    }

    &:focus {
      ${p => !p.compact ? `
        border-color: ${p.$hasError ? '#ef4444' : '#10b981'};
        box-shadow: 0 0 0 3px ${p.$hasError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.18)'};
        background: #14171f;
      ` : `
        outline: none;
      `}
    }
  }

  input[type="date"] {
    color-scheme: dark;
    cursor: pointer;
    &::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.8;
      filter: invert(0.85) brightness(1.2);
      transition: opacity 0.2s, transform 0.2s;
    }
    &::-webkit-calendar-picker-indicator:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  select {
    cursor: pointer;
  }

  textarea {
    min-height: 90px;
    resize: vertical;
    font-family: inherit;
  }

  option {
    background: #181b22;
    color: #fff;
  }
`;

const FieldError = styled.span`
  color: #ef4444;
  font-size: 0.78rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  svg {
    color: #ef4444;
    font-size: 0.8rem;
    flex-shrink: 0;
  }
`;

const FormSection = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: border-color 0.2s;
  &:focus-within {
    border-color: rgba(16, 185, 129, 0.3);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
  gap: 12px;

  .title-group {
    display: flex;
    align-items: center;
    gap: 14px;

    .icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    h3 {
      margin: 0 0 3px 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    p {
      margin: 0;
      font-size: 0.84rem;
      color: #94a3b8;
    }
  }

  .step-tag {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const BatchDetailsCard = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  background: #111318;
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
  padding: 16px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 5px;

    small {
      color: #94a3b8;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      display: flex;
      align-items: center;
      gap: 6px;
      svg {
        color: #10b981;
        font-size: 0.85rem;
      }
    }

    strong {
      color: #f8fafc;
      font-size: 0.95rem;
      font-weight: 600;

      &.good {
        color: #10b981;
      }
      &.warning {
        color: #f59e0b;
      }
      &.danger {
        color: #ef4444;
      }
    }
  }
`;

const FeeDashboard = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 4px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FeeCard = styled.div`
  background: ${p => {
    if (p.$variant === 'final') return 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.08))';
    if (p.$variant === 'discount') return 'rgba(245, 158, 11, 0.08)';
    if (p.$variant === 'due') return 'rgba(239, 68, 68, 0.08)';
    return '#111318';
  }};
  border: 1px solid ${p => {
    if (p.$variant === 'final') return 'rgba(16, 185, 129, 0.35)';
    if (p.$variant === 'discount') return 'rgba(245, 158, 11, 0.25)';
    if (p.$variant === 'due') return 'rgba(239, 68, 68, 0.25)';
    return 'rgba(255, 255, 255, 0.07)';
  }};
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  small {
    color: #94a3b8;
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  span {
    color: ${p => {
      if (p.$variant === 'final') return '#34d399';
      if (p.$variant === 'discount') return '#fbbf24';
      if (p.$variant === 'due') return '#f87171';
      return '#f1f5f9';
    }};
    font-size: 1.25rem;
    font-weight: 800;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 18px rgba(16, 185, 129, 0.3);
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    font-size: 1.2rem;
  }
`;

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
const EnrollForm = styled.form`display:flex;flex-direction:column;gap:22px;`;
const Grid = styled.div`display:grid;grid-template-columns:repeat(2,1fr);gap:14px;@media(max-width:760px){grid-template-columns:1fr;}`;
const Success = styled.div`text-align:center;svg{font-size:3rem;color:#2ecc71;}p{color:#bbb;}`;

export default CounsellorPanel;
