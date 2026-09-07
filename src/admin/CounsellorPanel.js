import React, { useEffect, useMemo, useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope,
  FaCheckCircle, FaEye, FaFilter, FaMoneyBillWave, FaPhone, FaPlus,
  FaSearch, FaStickyNote, FaTimes, FaUserGraduate, FaCalendarAlt, FaExclamationCircle,
  FaGraduationCap, FaClock, FaCalendarDay, FaUsers, FaArrowRight, FaChartLine,
  FaChartBar, FaDownload, FaShareAlt, FaLayerGroup, FaClipboardList, FaWhatsapp,
  FaBolt, FaHandshake, FaExclamationTriangle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
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

const matchesStrongSearch = (item, query) => {
  if (!query || !String(query).trim()) return true;
  const q = String(query).trim().toLowerCase();
  const digits = q.replace(/\D/g, '');

  // 1. Text inclusion across name, email, course, batch, city
  const name = String(item.name || '').toLowerCase();
  const email = String(item.email || '').toLowerCase();
  const course = String(item.course || item.course_interest || '').toLowerCase();
  const batch = String(item.batch || '').toLowerCase();
  const city = String(item.city || '').toLowerCase();

  // Multi-word name check: e.g. "ali ahmed" matches "Syed Ali Ahmed"
  const words = q.split(/\s+/).filter(Boolean);
  const matchesAllWords = words.length > 1 && words.every((w) => name.includes(w));

  if (name.includes(q) || matchesAllWords || email.includes(q) || course.includes(q) || batch.includes(q) || city.includes(q)) {
    return true;
  }

  // 2. CNIC search (with or without dashes / formatting)
  const cnicStr = String(item.cnic || '').toLowerCase();
  const cnicDigits = String(item.cnic || '').replace(/\D/g, '');
  if (cnicStr.includes(q)) return true;
  if (digits.length >= 2 && cnicDigits.includes(digits)) return true;

  // 3. Phone search (normalized digits, handling 03xx vs 923xx)
  const phoneStr = String(item.phone || '').toLowerCase();
  const phoneDigits = String(item.phone || '').replace(/\D/g, '');
  if (phoneStr.includes(q)) return true;
  if (digits.length >= 3) {
    if (phoneDigits.includes(digits)) return true;
    if (digits.startsWith('0') && phoneDigits.includes(digits.slice(1))) return true;
    if (digits.startsWith('92') && phoneDigits.includes(digits.slice(2))) return true;
    if (phoneDigits.endsWith(digits)) return true;
  }

  return false;
};

const getWhatsAppUrl = (phone, name, course) => {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;
  let intlPhone = clean;
  if (clean.startsWith('0')) {
    intlPhone = `92${clean.slice(1)}`;
  } else if (!clean.startsWith('92') && clean.length === 10) {
    intlPhone = `92${clean}`;
  }
  const text = encodeURIComponent(
    `Hi ${name || 'there'}, thank you for inquiring about ${course || 'courses'} at DeepSkills. How can we assist you with admissions today?`
  );
  return `https://wa.me/${intlPhone}?text=${text}`;
};

const getPhoneTelUrl = (phone) => {
  if (!phone) return null;
  const clean = String(phone).replace(/[^\d+]/g, '');
  return clean ? `tel:${clean}` : null;
};

const getStudentWhatsAppUrl = (phone, name, customMsg) => {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;
  let intlPhone = clean;
  if (clean.startsWith('0')) {
    intlPhone = `92${clean.slice(1)}`;
  } else if (!clean.startsWith('92') && clean.length === 10) {
    intlPhone = `92${clean}`;
  }
  const text = encodeURIComponent(customMsg || `Assalam-o-Alaikum ${name || 'Student'}, this is DeepSkills Admissions following up regarding your studies.`);
  return `https://wa.me/${intlPhone}?text=${text}`;
};

const getPaymentReceiptWhatsAppUrl = (phone, name, course, amount, remaining, reference) => {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;
  let intlPhone = clean;
  if (clean.startsWith('0')) {
    intlPhone = `92${clean.slice(1)}`;
  } else if (!clean.startsWith('92') && clean.length === 10) {
    intlPhone = `92${clean}`;
  }
  const receiptMsg = `Assalam-o-Alaikum ${name || 'Student'},\nDeepSkills Admissions has received your fee payment of Rs. ${Number(amount).toLocaleString()} for ${course || 'your course'}.${reference ? `\nReceipt/Ref: ${reference}` : ''}\nRemaining balance: Rs. ${Number(remaining).toLocaleString()}.\nThank you for choosing DeepSkills!`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(receiptMsg)}`;
};

const getCourseSyllabusWhatsAppUrl = (phone, name, courseTitle, courses) => {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;
  let intlPhone = clean;
  if (clean.startsWith('0')) {
    intlPhone = `92${clean.slice(1)}`;
  } else if (!clean.startsWith('92') && clean.length === 10) {
    intlPhone = `92${clean}`;
  }
  const courseObj = (courses || []).find((c) => c.title === courseTitle);
  const slug = courseObj?.slug || courseTitle?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-');
  const courseUrl = `https://deepskills.pk/courses/${slug}`;
  const text = encodeURIComponent(
    `Assalam-o-Alaikum ${name || 'there'},\nHere is the complete course curriculum, schedule, and details for ${courseTitle || 'our courses'} at DeepSkills:\n${courseUrl}\n\nPlease let us know if you'd like to reserve a seat in the upcoming batch!`
  );
  return `https://wa.me/${intlPhone}?text=${text}`;
};

const getNextFollowUpDate = (inquiry) => {
  if (!inquiry) return null;
  if (inquiry.follow_up_date) return inquiry.follow_up_date;
  if (!Array.isArray(inquiry.counsellor_notes)) return null;
  const withDates = inquiry.counsellor_notes.filter((e) => e && e.followUpDate);
  if (withDates.length === 0) return null;
  return withDates[withDates.length - 1].followUpDate;
};

const parseStudentNotes = (rawNotes) => {
  if (!rawNotes) return [];
  const text = String(rawNotes).trim();
  if (!text) return [];
  const chunks = text.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
  return chunks.map((chunk, idx) => {
    const match = chunk.match(/^\[(.*?)\]:\s*([\s\S]*)$/);
    if (match) {
      return {
        id: idx,
        meta: match[1],
        content: match[2]
      };
    }
    return {
      id: idx,
      meta: 'Note',
      content: chunk
    };
  });
};

const NOTE_PRESETS = [
  {
    icon: FaPhone,
    label: 'Fee Follow-Up',
    text: 'Fee Follow-Up: Discussed payment schedule with student.'
  },
  {
    icon: FaHandshake,
    label: 'Payment Promised',
    text: 'Payment Promised: Student confirmed fee submission by Friday.'
  },
  {
    icon: FaClock,
    label: 'Shift Request',
    text: 'Shift Request: Student requested adjustment in batch timing.'
  },
  {
    icon: FaExclamationTriangle,
    label: 'Attendance Notice',
    text: 'Attendance Notice: Followed up regarding recent classes missed.'
  },
  {
    icon: FaCheckCircle,
    label: 'Progress Check',
    text: 'Progress Check: Student attending regularly and progressing well.'
  }
];

const CounsellorPanel = ({ initialView }) => {
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'counsellor', 'full');
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegment = location.pathname.split('/')[3];
  const resolvedView = initialView || pathSegment || 'overview';
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState([]);
  const [notes, setNotes] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [feePlans, setFeePlans] = useState([]);
  const [studentPayments, setStudentPayments] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: 'all', course: 'all', source: 'all', from: '', to: '', dueTodayOnly: false });
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'contacted', note: '', followUpDate: '' });
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    course: '',
    source: 'Walk-in',
    note: '',
    followUpDate: ''
  });
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [enrollment, setEnrollment] = useState(emptyEnrollment);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [studentAction, setStudentAction] = useState(null);
  const [paymentReceiptModal, setPaymentReceiptModal] = useState(null);

  const dobRef = useRef(null);
  const payDateRef = useRef(null);
  const filterFromRef = useRef(null);
  const filterToRef = useRef(null);
  const modalPayDateRef = useRef(null);
  const leadFollowUpRef = useRef(null);
  const statusFollowUpRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    const [inqRes, noteRes, studentRes, courseRes, batchRes, feeRes, payRes] = await Promise.all([
      supabase.from('inquiries').select('*').order('submitted_at', { ascending: false }),
      supabase.from('inquiry_notes').select('*').order('added_at', { ascending: false }),
      supabase.from('admissions').select('*').in('status', ['Active', 'Inactive', 'Graduated']).order('submitted_at', { ascending: false }),
      supabase.from('courses').select('*').order('title', { ascending: true }),
      supabase.from('batches').select('*').order('created_at', { ascending: false }),
      supabase.from('fee_plans').select('*'),
      supabase.from('payments').select('*').eq('entity_type', 'student')
    ]);
    if (inqRes.error) toast.error('Failed to load inquiries');
    setInquiries(inqRes.data || []);
    setNotes(noteRes.data || []);
    setStudents(studentRes.data || []);
    setCourses(courseRes.data || []);
    setBatches(batchRes.data || []);
    setFeePlans(feeRes.data || []);
    setStudentPayments(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (resolvedView !== 'enroll') {
      setEnrollmentOpen(false);
      setSuccess(null);
    }
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

  const studentFeeMap = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      const plan = feePlans.find((p) => p.student_id === student.id);
      const studentPays = studentPayments.filter((p) => p.entity_id === student.id);
      const paid = studentPays.filter((p) => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalFee = plan?.final_fee != null ? Number(plan.final_fee) : Number(plan?.total_fee || 0);
      const outstanding = Math.max(0, totalFee - paid);
      const pendingInstallments = studentPays.filter((p) => p.status === 'pending').sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));

      let feeStatus = 'No Plan';
      if (totalFee > 0) {
        if (outstanding === 0) feeStatus = 'Paid';
        else if (paid > 0) feeStatus = 'Partial';
        else feeStatus = 'Unpaid';
      }

      map.set(student.id, {
        plan,
        totalFee,
        paid,
        outstanding,
        pendingInstallments,
        feeStatus,
        paymentRecords: studentPays
      });
    });
    return map;
  }, [students, feePlans, studentPayments]);

  const dueTodayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return inquiries.filter((inq) => {
      if (inq.status === 'enrolled' || inq.status === 'lost') return false;
      const d = getNextFollowUpDate(inq);
      return d && d <= today;
    }).length;
  }, [inquiries]);

  const filteredInquiries = useMemo(() => inquiries.filter((inquiry) => {
    const matchesSearch = matchesStrongSearch(inquiry, filters.search);
    const matchesStatus = filters.status === 'all' || inquiry.status === filters.status;
    const matchesCourse = filters.course === 'all' || inquiry.course_interest === filters.course;
    const matchesSource = filters.source === 'all' || inquiry.hear_about_us === filters.source;
    const submitted = inquiry.submitted_at ? new Date(inquiry.submitted_at) : null;
    const matchesFrom = !filters.from || (submitted && submitted >= new Date(filters.from));
    const matchesTo = !filters.to || (submitted && submitted <= new Date(`${filters.to}T23:59:59`));
    const matchesDueToday = !filters.dueTodayOnly || (() => {
      if (inquiry.status === 'enrolled' || inquiry.status === 'lost') return false;
      const d = getNextFollowUpDate(inquiry);
      const today = new Date().toISOString().split('T')[0];
      return d && d <= today;
    })();
    return matchesSearch && matchesStatus && matchesCourse && matchesSource && matchesFrom && matchesTo && matchesDueToday;
  }), [inquiries, filters]);

  const hasActiveInquiryFilters = Boolean(
    filters.search ||
    filters.status !== 'all' ||
    filters.course !== 'all' ||
    filters.source !== 'all' ||
    filters.from ||
    filters.to ||
    filters.dueTodayOnly
  );

  const resetInquiryFilters = () => {
    setFilters({ search: '', status: 'all', course: 'all', source: 'all', from: '', to: '', dueTodayOnly: false });
  };

  const getLinkedStudent = (inquiry) => {
    if (!inquiry) return null;
    const inqCnicDigits = String(inquiry.cnic || '').replace(/\D/g, '');
    const inqEmail = String(inquiry.email || '').trim().toLowerCase();
    const inqPhoneDigits = String(inquiry.phone || '').replace(/\D/g, '');

    return students.find((s) => {
      if (inquiry.id && s.inquiry_id === inquiry.id) return true;
      if (inqCnicDigits && inqCnicDigits.length >= 10 && String(s.cnic || '').replace(/\D/g, '') === inqCnicDigits) return true;
      if (inqEmail && String(s.email || '').trim().toLowerCase() === inqEmail) return true;
      if (inqPhoneDigits && inqPhoneDigits.length >= 7 && String(s.phone || '').replace(/\D/g, '').endsWith(inqPhoneDigits.slice(-7))) return true;
      return false;
    });
  };

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
    if (!canMutate) {
      toast.error('You have view-only access. Enrolling students is not permitted.');
      return;
    }
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
    if (resolvedView !== 'enroll') {
      navigate('/admin/counsellor/enroll');
    }
  };

  useEffect(() => {
    if (resolvedView === 'enroll' && courses.length > 0 && !enrollmentOpen && !success) {
      openEnroll();
    }
  }, [resolvedView, courses.length, enrollmentOpen, success]);

  const conversionRate = inquiries.length > 0 ? Math.round((stats.enrolled / inquiries.length) * 100) : 0;

  const sourcesBreakdown = useMemo(() => {
    const counts = {};
    SOURCES.forEach((s) => { counts[s] = 0; });
    inquiries.forEach((i) => {
      const src = i.hear_about_us || 'Other';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([source, count]) => ({
      source,
      count,
      pct: inquiries.length > 0 ? Math.round((count / inquiries.length) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  }, [inquiries]);

  const recentInquiries = useMemo(() => {
    return inquiries.slice(0, 5);
  }, [inquiries]);

  const courseBreakdown = useMemo(() => {
    const map = {};
    inquiries.forEach((i) => {
      const c = i.course_interest || 'General';
      if (!map[c]) map[c] = { course: c, total: 0, enrolled: 0 };
      map[c].total += 1;
      if (i.status === 'enrolled') map[c].enrolled += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [inquiries]);

  const avgDaysToConvert = useMemo(() => {
    const enrolledWithDates = inquiries.filter((i) => i.status === 'enrolled' && i.submitted_at && i.last_updated);
    if (enrolledWithDates.length === 0) return 0;
    const totalDays = enrolledWithDates.reduce((acc, i) => {
      const diff = Math.max(0, (new Date(i.last_updated) - new Date(i.submitted_at)) / (1000 * 60 * 60 * 24));
      return acc + diff;
    }, 0);
    return Math.round(totalDays / enrolledWithDates.length);
  }, [inquiries]);

  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Inquiries', stats.total],
      ['New Inquiries', stats.new],
      ['In Progress', stats.contacted],
      ['Enrolled', stats.enrolled],
      ['Lost', stats.lost],
      ['Conversion Rate', `${conversionRate}%`],
      ['Avg Days to Convert', `${avgDaysToConvert} days`],
      [],
      ['Lead Source', 'Count', 'Percentage'],
      ...sourcesBreakdown.map((s) => [s.source, s.count, `${s.pct}%`]),
      [],
      ['Course', 'Inquiries', 'Enrolled', 'Conversion Rate'],
      ...courseBreakdown.map((c) => [c.course, c.total, c.enrolled, `${c.total > 0 ? Math.round((c.enrolled / c.total) * 100) : 0}%`])
    ];
    const escapeCell = (cell) => {
      const text = String(cell ?? '').replace(/"/g, '""');
      return /[",\n]/.test(text) ? `"${text}"` : text;
    };
    const csvContent = rows.map((r) => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `counsellor-performance-${todayDateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Performance report downloaded');
  };

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
    if (!canMutate) {
      toast.error('You have view-only access. Updating inquiries is not permitted.');
      return;
    }
    if (!statusTarget) return;
    const entry = {
      note: statusForm.note || `Status changed to ${statusLabel(statusForm.status)}`,
      timestamp: new Date().toISOString(),
      by: user?.name || 'Counsellor',
      followUpDate: statusForm.followUpDate || null
    };
    const existingNotes = Array.isArray(statusTarget.counsellor_notes) ? statusTarget.counsellor_notes : [];
    const updatePayload = {
      status: statusForm.status,
      counsellor_notes: [...existingNotes, entry],
      last_updated: new Date().toISOString()
    };
    if (statusForm.followUpDate) {
      updatePayload.follow_up_date = statusForm.followUpDate;
    }
    let { error } = await supabase.from('inquiries').update(updatePayload).eq('id', statusTarget.id);
    if (error && error.message && error.message.includes('follow_up_date')) {
      delete updatePayload.follow_up_date;
      const retry = await supabase.from('inquiries').update(updatePayload).eq('id', statusTarget.id);
      error = retry.error;
    }
    if (error) {
      toast.error('Failed to update inquiry: ' + error.message);
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
    setStatusForm({ status: 'contacted', note: '', followUpDate: '' });
    loadData();
  };

  const handleCreateLead = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canMutate) {
      toast.error('You have view-only access. Creating leads is not permitted.');
      return;
    }
    const name = String(newLeadForm.name || '').trim();
    const phone = String(newLeadForm.phone || '').trim();
    const email = String(newLeadForm.email || '').trim();
    const city = String(newLeadForm.city || '').trim();
    const course = newLeadForm.course || '';
    const source = newLeadForm.source || 'Walk-in';
    const noteText = String(newLeadForm.note || '').trim();
    const followUpDate = newLeadForm.followUpDate || '';

    if (!name) {
      return toast.error('Lead name is required');
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone && !email) {
      return toast.error('At least phone or email is required');
    }
    if (phone && phoneDigits.length < 10) {
      return toast.error('Please enter a valid phone number (at least 10 digits)');
    }

    const notesArr = [];
    if (noteText || followUpDate) {
      notesArr.push({
        note: noteText || (followUpDate ? `Scheduled follow-up for ${followUpDate}` : 'Initial lead captured by counsellor'),
        timestamp: new Date().toISOString(),
        by: user?.name || 'Counsellor',
        followUpDate: followUpDate || null
      });
    }

    const payload = {
      name,
      phone,
      email: email || null,
      city: city || null,
      course_interest: course || null,
      hear_about_us: source,
      status: 'new',
      counsellor_notes: notesArr,
      submitted_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    if (followUpDate) {
      payload.follow_up_date = followUpDate;
    }

    let { data, error } = await supabase.from('inquiries').insert([payload]).select();
    if (error && error.message && error.message.includes('follow_up_date')) {
      delete payload.follow_up_date;
      const retry = await supabase.from('inquiries').insert([payload]).select();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      return toast.error('Failed to create lead: ' + error.message);
    }

    if (notesArr.length > 0 && data?.[0]?.id) {
      try {
        await supabase.from('inquiry_notes').insert({
          inquiry_id: data[0].id,
          note: notesArr[0].note,
          status_changed_to: 'new',
          added_by: user?.name || 'Counsellor'
        });
      } catch (_) {}
    }

    toast.success('New lead captured successfully!');
    setNewLeadOpen(false);
    setNewLeadForm({
      name: '',
      phone: '',
      email: '',
      city: '',
      course: '',
      source: 'Walk-in',
      note: '',
      followUpDate: ''
    });
    loadData();
  };

  const exportInquiriesCsv = () => {
    if (filteredInquiries.length === 0) {
      toast.error('No inquiries to export');
      return;
    }
    const headers = [
      'Name',
      'Phone',
      'Email',
      'CNIC',
      'City',
      'Course Interest',
      'Source',
      'Status',
      'Submitted At',
      'Next Follow-Up',
      'Latest Note'
    ];
    const escapeCell = (cell) => {
      const text = String(cell ?? '').replace(/"/g, '""');
      return /[",\n]/.test(text) ? `"${text}"` : text;
    };
    const rows = filteredInquiries.map((inq) => {
      const lastNote = notes.find((n) => n.inquiry_id === inq.id)?.note || (Array.isArray(inq.counsellor_notes) ? inq.counsellor_notes.at(-1)?.note : '') || '';
      const followUp = getNextFollowUpDate(inq) || '';
      return [
        inq.name || '',
        inq.phone || '',
        inq.email || '',
        inq.cnic || '',
        inq.city || '',
        inq.course_interest || '',
        inq.hear_about_us || '',
        inq.status || '',
        inq.submitted_at ? new Date(inq.submitted_at).toLocaleDateString() : '',
        followUp,
        lastNote
      ];
    });
    const csvContent = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deepskills-inquiries-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredInquiries.length} inquiries to CSV`);
  };

  const enrollStudent = async (event) => {
    event.preventDefault();
    if (!canMutate) {
      toast.error('You have view-only access. Enrolling students is not permitted.');
      return;
    }

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
    if (!canMutate) {
      toast.error('You have view-only access. Sending instructions is not permitted.');
      return;
    }
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
    if (!canMutate) {
      toast.error('You have view-only access. Modifying students is not permitted.');
      return;
    }
    if (!studentAction) return;

    if (studentAction.type === 'batch') {
      const batch = activeBatches.find((item) => item.id === studentAction.batchId);
      if (!batch) return toast.error('Select a batch');
      const { error } = await supabase.from('admissions').update({
        course: batch.course,
        batch: batch.batch_name,
        batch_timing: batch.time_shift || batch.timing_label || ''
      }).eq('id', studentAction.student.id);
      if (error) return toast.error('Batch update failed: ' + error.message);
      toast.success('Batch updated successfully');
      setStudentAction(null);
      loadData();
      return;
    }

    if (studentAction.type === 'payment') {
      const amount = toInt(studentAction.amount);
      if (!amount || amount <= 0) {
        return toast.error('Please enter a valid payment amount greater than 0');
      }

      const paidDate = studentAction.paidDate || todayDateStr;
      const method = normalizePaymentMethod(studentAction.method || 'cash');
      const reference = studentAction.reference ? String(studentAction.reference).trim() : null;
      const paymentNote = studentAction.note ? String(studentAction.note).trim() : '';

      // Check if student has a scheduled pending installment in payments table
      const pendingInst = (studentAction.feeSummary?.pendingInstallments || []).find((p) => p.status === 'pending');
      let paymentError = null;

      if (pendingInst) {
        // Settle the earliest scheduled pending installment
        const { error } = await supabase
          .from('payments')
          .update({
            status: 'paid',
            paid_date: paidDate,
            method: method,
            reference_number: reference,
            amount: amount,
            description: paymentNote ? `Counsellor payment: ${paymentNote}` : (pendingInst.description || 'Installment Payment')
          })
          .eq('id', pendingInst.id);
        paymentError = error;
      } else {
        // Direct payment record
        const { error } = await supabase.from('payments').insert({
          entity_id: studentAction.student.id,
          entity_type: 'student',
          amount: amount,
          paid_date: paidDate,
          method: method,
          reference_number: reference,
          status: 'paid',
          description: paymentNote ? `Counsellor payment: ${paymentNote}` : 'Counsellor fee payment'
        });
        paymentError = error;
      }

      if (paymentError) return toast.error('Payment record failed: ' + paymentError.message);

      const currentDue = studentAction.feeSummary?.outstanding || 0;
      const newRemaining = Math.max(0, currentDue - amount);

      toast.success(`Payment of Rs. ${amount.toLocaleString()} recorded successfully!`);

      // Trigger payment receipt modal if student has a phone number
      if (studentAction.student.phone) {
        setPaymentReceiptModal({
          studentName: studentAction.student.name,
          course: studentAction.student.course,
          phone: studentAction.student.phone,
          amount: amount,
          remaining: newRemaining,
          method: method,
          reference: reference,
          date: paidDate
        });
      }

      setStudentAction(null);
      loadData();
      return;
    }

    if (studentAction.type === 'note') {
      const cleanNote = String(studentAction.note || '').trim();
      if (!cleanNote) return toast.error('Please enter a note');

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const author = user?.name || user?.email?.split('@')[0] || 'Counsellor';
      const stampedNote = `[${dateStr}, ${timeStr} - ${author}]: ${cleanNote}`;

      const existingNotes = studentAction.student.counsellor_notes ? String(studentAction.student.counsellor_notes).trim() : '';
      const updatedNotes = existingNotes ? `${existingNotes}\n\n${stampedNote}` : stampedNote;

      const { error } = await supabase.from('admissions').update({ counsellor_notes: updatedNotes }).eq('id', studentAction.student.id);
      if (error) return toast.error('Failed to update note: ' + error.message);

      toast.success('Counsellor note saved');
      setStudentAction(null);
      loadData();
    }
  };

  return (
    <AdminLayout>
      <Page>
        <Header>
          <div>
            <h1>
              {resolvedView === 'overview' && 'Counsellor Overview'}
              {resolvedView === 'inquiries' && 'Inquiry Pipeline'}
              {resolvedView === 'enroll' && 'Student Enrollment'}
              {resolvedView === 'students' && 'Enrolled Students'}
              {resolvedView === 'performance' && 'Counsellor Performance'}
            </h1>
            <p>
              {resolvedView === 'overview' && 'High-level lead tracking, conversion metrics, and batch capacity.'}
              {resolvedView === 'inquiries' && 'Manage inquiries, update lead stages, and track candidate follow-ups.'}
              {resolvedView === 'enroll' && 'Complete candidate registration, batch assignment, and fee configuration.'}
              {resolvedView === 'students' && 'Directory of admitted students with batch adjustments and payment records.'}
              {resolvedView === 'performance' && 'Lead sources, conversion rates, and counselor team analytics.'}
            </p>
          </div>
          {canMutate && resolvedView !== 'enroll' && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {resolvedView === 'inquiries' && (
                <>
                  <button
                    type="button"
                    onClick={exportInquiriesCsv}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f1f5f9',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Export currently filtered inquiries to CSV spreadsheet"
                  >
                    <FaDownload /> Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewLeadOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(59, 130, 246, 0.18)',
                      border: '1px solid #3b82f6',
                      color: '#93c5fd',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Capture a new inquiry from walk-in, phone call, or external referral"
                  >
                    <FaPlus /> New Lead
                  </button>
                </>
              )}
              <Primary onClick={() => openEnroll()}><FaPlus /> Add Walk-in Student</Primary>
            </div>
          )}
        </Header>

        {resolvedView === 'enroll' ? (
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
                <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', marginTop: '6px' }}>
                  <FaCheckCircle size={12} /> Automated confirmation email dispatched to {success.email}
                </p>
                <Actions center>
                  <button onClick={() => sendLoginInstructions()} title="Resend credentials email to the student">
                    <FaEnvelope /> Resend Login Instructions
                  </button>
                  <button onClick={() => openEnroll()}>Enroll Another Student</button>
                  <button onClick={() => navigate(`/admin/management/students/${success.id}?from=counsellor`)}>View Student Profile</button>
                </Actions>
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
        ) : resolvedView === 'overview' ? (
          <OverviewContent
            stats={stats}
            conversionRate={conversionRate}
            navigate={navigate}
            openEnroll={openEnroll}
            canMutate={canMutate}
            activeBatches={activeBatches}
            studentCountByBatch={studentCountByBatch}
            recentInquiries={recentInquiries}
            sourcesBreakdown={sourcesBreakdown}
            onSelectInquiry={setSelectedInquiry}
            onUpdateStatus={(inq) => { setStatusTarget(inq); setStatusForm({ status: inq.status || 'contacted', note: '', followUpDate: getNextFollowUpDate(inq) || '' }); }}
            getLinkedStudent={getLinkedStudent}
            dueTodayCount={dueTodayCount}
          />
        ) : resolvedView === 'performance' ? (
          <PerformanceContent
            stats={stats}
            conversionRate={conversionRate}
            avgDaysToConvert={avgDaysToConvert}
            sourcesBreakdown={sourcesBreakdown}
            courseBreakdown={courseBreakdown}
            exportCsv={exportCsv}
          />
        ) : (
          <>
            {resolvedView === 'inquiries' ? (
              <>
                <Stats>
                  <Stat><span>{stats.total}</span><small>Total Inquiries</small></Stat>
                  <Stat><span>{stats.new}</span><small>New</small></Stat>
                  <Stat><span>{stats.contacted}</span><small>In Progress</small></Stat>
                  <Stat><span>{stats.enrolled}</span><small>Enrolled</small></Stat>
                  <Stat><span>{stats.lost}</span><small>Lost</small></Stat>
                  <Stat
                    onClick={() => setFilters((f) => ({ ...f, dueTodayOnly: !f.dueTodayOnly }))}
                    style={{
                      cursor: 'pointer',
                      border: filters.dueTodayOnly ? '1px solid #f59e0b' : undefined,
                      background: filters.dueTodayOnly ? 'rgba(245, 158, 11, 0.14)' : undefined,
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to filter inquiries due for follow-up today or overdue"
                  >
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaClock size={20} /> {dueTodayCount}
                    </span>
                    <small style={{ color: filters.dueTodayOnly ? '#fbbf24' : '#f59e0b', fontWeight: filters.dueTodayOnly ? 700 : 500 }}>
                      {filters.dueTodayOnly ? 'Filtering: Due Today' : 'Follow-ups Due'}
                    </small>
                  </Stat>
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
                  {hasActiveInquiryFilters && (
                    <button
                      type="button"
                      onClick={resetInquiryFilters}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '42px'
                      }}
                    >
                      <FaTimes /> Reset
                    </button>
                  )}
                </Filters>

                <TableCard>
                  <table>
                    <thead><tr><th>Name</th><th>Phone</th><th>Course Interest</th><th>Source</th><th>City</th><th>Submitted</th><th>Status</th><th>Note</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredInquiries.map((inquiry) => {
                        const lastNote = notes.find((note) => note.inquiry_id === inquiry.id)?.note || (Array.isArray(inquiry.counsellor_notes) ? inquiry.counsellor_notes.at(-1)?.note : '');
                        const linkedStudent = getLinkedStudent(inquiry);
                        const isEnrolled = inquiry.status === 'enrolled' || !!linkedStudent;
                        return (
                          <tr key={inquiry.id}>
                            <td><strong>{inquiry.name}</strong><small>{inquiry.email}</small></td>
                            <td>{inquiry.phone}</td>
                            <td>{inquiry.course_interest}</td>
                            <td>{inquiry.hear_about_us}</td>
                            <td>{inquiry.city}</td>
                            <td>{inquiry.submitted_at ? new Date(inquiry.submitted_at).toLocaleDateString() : '-'}</td>
                            <td>
                              <Badge $status={inquiry.status}>{statusLabel(inquiry.status)}</Badge>
                              {(() => {
                                const fDate = getNextFollowUpDate(inquiry);
                                if (!fDate) return null;
                                const today = new Date().toISOString().split('T')[0];
                                const isOverdue = fDate < today;
                                const isToday = fDate === today;
                                return (
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      color: isOverdue ? '#ef4444' : isToday ? '#f59e0b' : '#94a3b8',
                                      marginTop: '4px'
                                    }}
                                    title={isOverdue ? `Overdue follow-up was scheduled for ${fDate}` : isToday ? 'Follow-up scheduled for today' : `Follow-up scheduled for ${fDate}`}
                                  >
                                    <FaClock size={10} /> {isToday ? 'Due Today' : isOverdue ? `Overdue (${fDate})` : `Follow: ${fDate}`}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="muted">{lastNote ? `${lastNote.slice(0, 55)}${lastNote.length > 55 ? '...' : ''}` : '-'}</td>
                            <td>
                              <Actions>
                                {canMutate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStatusTarget(inquiry);
                                      setStatusForm({ status: inquiry.status || 'contacted', note: '', followUpDate: getNextFollowUpDate(inquiry) || '' });
                                    }}
                                    title="Call & Update Status"
                                  >
                                    <FaPhone /> Update
                                  </button>
                                )}
                                {canMutate && (
                                  isEnrolled ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigate(linkedStudent ? `/admin/management/students/${linkedStudent.id}?from=counsellor` : '/admin/counsellor/students');
                                      }}
                                      title="View Enrolled Student Profile"
                                      style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)' }}
                                    >
                                      <FaUserGraduate /> Profile
                                    </button>
                                  ) : (
                                    <button type="button" onClick={() => openEnroll(inquiry)} title="Enroll Candidate">
                                      <FaCheckCircle /> Enroll
                                    </button>
                                  )
                                )}
                                <button type="button" onClick={() => setSelectedInquiry(inquiry)} title="View Full Details">
                                  <FaEye /> View
                                </button>
                              </Actions>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && filteredInquiries.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            No inquiries found matching your filter criteria.
                            {hasActiveInquiryFilters && (
                              <div style={{ marginTop: '10px' }}>
                                <button
                                  type="button"
                                  onClick={resetInquiryFilters}
                                  style={{
                                    background: '#7B1F2E',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reset Filters
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableCard>
              </>
            ) : (
              <StudentList
                students={students}
                batches={batches}
                courses={courses}
                navigate={navigate}
                onAction={setStudentAction}
                canMutate={canMutate}
                feeMap={studentFeeMap}
              />
            )}
          </>
        )}
      </Page>

      <AnimatePresence>
        {selectedInquiry && (() => {
          const waUrl = getWhatsAppUrl(selectedInquiry.phone, selectedInquiry.name, selectedInquiry.course_interest);
          const telUrl = getPhoneTelUrl(selectedInquiry.phone);
          const linked = getLinkedStudent(selectedInquiry);
          const isEnrolled = selectedInquiry.status === 'enrolled' || !!linked;
          const candidateNotes = notes.filter((note) => note.inquiry_id === selectedInquiry.id);

          return (
            <Drawer onClose={() => setSelectedInquiry(null)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#fff' }}>{selectedInquiry.name}</h2>
                  <small style={{ color: '#94a3b8' }}>
                    Submitted: {selectedInquiry.submitted_at ? new Date(selectedInquiry.submitted_at).toLocaleString() : 'Recent'}
                  </small>
                </div>
                <Badge $status={selectedInquiry.status}>{statusLabel(selectedInquiry.status)}</Badge>
              </div>

              {/* Quick Communication Bar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#25D366',
                      color: '#fff',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <FaWhatsapp style={{ fontSize: '1rem' }} /> WhatsApp
                  </a>
                )}
                {(() => {
                  const syllabusUrl = getCourseSyllabusWhatsAppUrl(selectedInquiry.phone, selectedInquiry.name, selectedInquiry.course_interest, courses);
                  if (!syllabusUrl) return null;
                  return (
                    <a
                      href={syllabusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(37, 211, 102, 0.15)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        color: '#25D366',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                      title="Send complete course curriculum & syllabus link on WhatsApp"
                    >
                      <FaShareAlt /> Share Syllabus
                    </a>
                  );
                })()}
                {telUrl && (
                  <a
                    href={telUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <FaPhone /> Call ({selectedInquiry.phone || 'No phone'})
                  </a>
                )}
                {selectedInquiry.email && (
                  <a
                    href={`mailto:${selectedInquiry.email}?subject=DeepSkills Inquiry - ${encodeURIComponent(selectedInquiry.course_interest || '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      textDecoration: 'none'
                    }}
                  >
                    <FaEnvelope /> Email
                  </a>
                )}
              </div>

              {/* Action Bar inside Drawer */}
              <div style={{
                display: 'flex',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
                {canMutate && (
                  <button
                    type="button"
                    onClick={() => {
                      const inq = selectedInquiry;
                      setSelectedInquiry(null);
                      setStatusTarget(inq);
                      setStatusForm({ status: inq.status || 'contacted', note: '' });
                    }}
                    style={{
                      background: 'rgba(55, 138, 221, 0.18)',
                      border: '1px solid #378ADD',
                      color: '#60a5fa',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaPhone /> Update Status & Add Note
                  </button>
                )}

                {canMutate && (
                  isEnrolled ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInquiry(null);
                        navigate(linked ? `/admin/management/students/${linked.id}?from=counsellor` : '/admin/counsellor/students');
                      }}
                      style={{
                        background: 'rgba(16, 185, 129, 0.18)',
                        border: '1px solid #10b981',
                        color: '#34d399',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaUserGraduate /> View Student Profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const inq = selectedInquiry;
                        setSelectedInquiry(null);
                        openEnroll(inq);
                      }}
                      style={{
                        background: 'rgba(16, 185, 129, 0.18)',
                        border: '1px solid #10b981',
                        color: '#34d399',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaCheckCircle /> Enroll This Candidate
                    </button>
                  )
                )}
              </div>

              <InfoGrid>
                {['phone', 'email', 'cnic', 'city', 'course_interest', 'hear_about_us', 'referral_code'].map((key) => (
                  <Info key={key}>
                    <small>{key.replace(/_/g, ' ')}</small>
                    <span>{selectedInquiry[key] || '-'}</span>
                  </Info>
                ))}
                {(() => {
                  const nextFDate = getNextFollowUpDate(selectedInquiry);
                  if (!nextFDate) return null;
                  const today = new Date().toISOString().split('T')[0];
                  const isOverdue = nextFDate < today;
                  const isToday = nextFDate === today;
                  return (
                    <Info>
                      <small>Next Follow-Up</small>
                      <span style={{ color: isOverdue ? '#ef4444' : isToday ? '#f59e0b' : '#38bdf8', fontWeight: 700 }}>
                        {nextFDate} {isToday ? '(Today)' : isOverdue ? '(Overdue)' : ''}
                      </span>
                    </Info>
                  );
                })()}
              </InfoGrid>

              {selectedInquiry.message && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  margin: '16px 0'
                }}>
                  <small style={{ color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>Candidate Message</small>
                  <p style={{ margin: 0, color: '#f1f5f9', fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>{selectedInquiry.message}</p>
                </div>
              )}

              <h3>Notes Timeline ({candidateNotes.length})</h3>
              <Timeline>
                {candidateNotes.length === 0 ? (
                  <li style={{ color: '#64748b' }}>No follow-up notes logged yet.</li>
                ) : (
                  candidateNotes.map((note) => (
                    <li key={note.id}>
                      <strong>{statusLabel(note.status_changed_to)}</strong>
                      <p>{note.note}</p>
                      <small>{note.added_by || 'Counsellor'} - {new Date(note.added_at).toLocaleString()}</small>
                    </li>
                  ))
                )}
              </Timeline>
            </Drawer>
          );
        })()}
        {statusTarget && (() => {
          const waUrl = getWhatsAppUrl(statusTarget.phone, statusTarget.name, statusTarget.course_interest);
          const telUrl = getPhoneTelUrl(statusTarget.phone);
          const candidateNotes = notes.filter((note) => note.inquiry_id === statusTarget.id);
          const latestNote = candidateNotes[0];

          return (
            <Modal onClose={() => setStatusTarget(null)} title="Follow-up & Update Status">
              {/* Candidate Info Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#fff' }}>{statusTarget.name}</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.84rem' }}>
                      Course: <strong style={{ color: '#60a5fa' }}>{statusTarget.course_interest || 'General'}</strong>
                      {statusTarget.city ? ` • ${statusTarget.city}` : ''}
                    </p>
                  </div>
                  <Badge $status={statusTarget.status}>{statusLabel(statusTarget.status)}</Badge>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#25D366',
                        color: '#fff',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      <FaWhatsapp style={{ fontSize: '1rem' }} /> WhatsApp Lead
                    </a>
                  )}
                  {(() => {
                    const syllabusUrl = getCourseSyllabusWhatsAppUrl(statusTarget.phone, statusTarget.name, statusTarget.course_interest, courses);
                    if (!syllabusUrl) return null;
                    return (
                      <a
                        href={syllabusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(37, 211, 102, 0.15)',
                          border: '1px solid rgba(37, 211, 102, 0.35)',
                          color: '#25D366',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                        title="Send complete course curriculum & syllabus link on WhatsApp"
                      >
                        <FaShareAlt /> Share Syllabus
                      </a>
                    );
                  })()}
                  {telUrl && (
                    <a
                      href={telUrl}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      <FaPhone /> Call ({statusTarget.phone || 'No phone'})
                    </a>
                  )}
                  {statusTarget.email && (
                    <a
                      href={`mailto:${statusTarget.email}?subject=DeepSkills Inquiry - ${encodeURIComponent(statusTarget.course_interest || '')}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        textDecoration: 'none'
                      }}
                    >
                      <FaEnvelope /> Email
                    </a>
                  )}
                </div>

                {latestNote && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Previous Note:</span> {latestNote.note} <small style={{ color: '#64748b' }}>({new Date(latestNote.added_at).toLocaleDateString()})</small>
                  </div>
                )}
              </div>

              <Field>
                <label>Status <span className="req">*</span></label>
                <select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                  {STATUS_OPTIONS.filter((item) => item.value !== 'enrolled').map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </Field>

              <Field>
                <label>Next Follow-Up Date</label>
                <input
                  ref={statusFollowUpRef}
                  type="date"
                  min={todayDateStr}
                  value={statusForm.followUpDate || ''}
                  onChange={(e) => setStatusForm({ ...statusForm, followUpDate: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
                />
              </Field>

              <Field>
                <label>Counsellor Follow-up Note</label>
                <textarea
                  placeholder="Record outcome of phone call, meeting notes, discount discussion, or next follow-up date..."
                  value={statusForm.note}
                  onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                />
              </Field>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const inq = statusTarget;
                    setStatusTarget(null);
                    openEnroll(inq);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#10b981',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FaCheckCircle /> Ready to Enroll? Start Registration →
                </button>

                <Primary onClick={updateStatus}>Save Status</Primary>
              </div>
            </Modal>
          );
        })()}
        {studentAction && (
          <Modal
            wide={studentAction.type === 'payment' || studentAction.type === 'note'}
            onClose={() => setStudentAction(null)}
            title={
              studentAction.type === 'batch'
                ? 'Edit Batch Assignment'
                : studentAction.type === 'payment'
                ? `Record Payment — ${studentAction.student.name}`
                : `Counsellor Notes — ${studentAction.student.name}`
            }
          >
            {/* Context Header for Payment & Note */}
            {(studentAction.type === 'payment' || studentAction.type === 'note') && (
              <StudentActionHeader>
                <div className="meta">
                  <h3>{studentAction.student.name}</h3>
                  <p>
                    <strong>Course:</strong> {studentAction.student.course || '—'} &bull;{' '}
                    <strong>Batch:</strong> {studentAction.student.batch || 'Unassigned'} &bull;{' '}
                    <strong>CNIC:</strong> {studentAction.student.cnic || '—'}
                  </p>
                </div>
                <div className="contacts">
                  {studentAction.student.phone && (
                    <>
                      <a
                        href={getPhoneTelUrl(studentAction.student.phone)}
                        className="call"
                        title={`Call ${studentAction.student.phone}`}
                      >
                        <FaPhone /> Call
                      </a>
                      <a
                        href={getStudentWhatsAppUrl(studentAction.student.phone, studentAction.student.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="wa"
                        title="Open WhatsApp Chat"
                      >
                        <FaWhatsapp /> WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </StudentActionHeader>
            )}

            {studentAction.type === 'batch' && (
              <Field>
                <label>Batch</label>
                <select
                  value={studentAction.batchId || ''}
                  onChange={(e) => setStudentAction({ ...studentAction, batchId: e.target.value })}
                >
                  {activeBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.course} - {batch.batch_name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {studentAction.type === 'payment' && (
              <>
                {studentAction.feeSummary && (
                  <>
                    <FeeStatsGrid>
                      <div className="stat-card">
                        <span className="stat-label">Total Fee</span>
                        <span className="stat-val">
                          Rs. {Number(studentAction.feeSummary.totalFee || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">Paid So Far</span>
                        <span className="stat-val paid">
                          Rs. {Number(studentAction.feeSummary.paid || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">Remaining Balance</span>
                        <span
                          className={`stat-val ${
                            studentAction.feeSummary.outstanding === 0 ? 'cleared' : 'due'
                          }`}
                        >
                          Rs. {Number(studentAction.feeSummary.outstanding || 0).toLocaleString()}
                        </span>
                      </div>
                    </FeeStatsGrid>

                    {studentAction.feeSummary.outstanding > 0 ? (
                      <QuickFillBar>
                        <span>Student has Rs. {Number(studentAction.feeSummary.outstanding).toLocaleString()} outstanding balance.</span>
                        <button
                          type="button"
                          onClick={() =>
                            setStudentAction((prev) => ({
                              ...prev,
                              amount: String(studentAction.feeSummary.outstanding)
                            }))
                          }
                        >
                          <FaBolt size={12} /> Pay Full Balance (Rs. {Number(studentAction.feeSummary.outstanding).toLocaleString()})
                        </button>
                      </QuickFillBar>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: '#10b981',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          marginBottom: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FaCheckCircle /> All scheduled fees for this student are fully settled. Additional payments will be recorded as direct credits.
                      </div>
                    )}
                  </>
                )}

                <Grid>
                  <Field>
                    <label>Amount (Rs.) <span className="req">*</span></label>
                    <input
                      type="number"
                      min="1"
                      onKeyDown={preventNegativeKeys}
                      value={studentAction.amount || ''}
                      onChange={(e) =>
                        setStudentAction({ ...studentAction, amount: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="e.g. 15000"
                    />
                  </Field>
                  <Field>
                    <label>Paid Date <span className="req">*</span></label>
                    <input
                      ref={modalPayDateRef}
                      type="date"
                      value={studentAction.paidDate || todayDateStr}
                      onChange={(e) => setStudentAction({ ...studentAction, paidDate: e.target.value })}
                      onClick={(e) => {
                        try {
                          e.target.showPicker?.();
                        } catch (_) {}
                      }}
                    />
                  </Field>
                  <Field>
                    <label>Payment Method <span className="req">*</span></label>
                    <select
                      value={studentAction.method || 'cash'}
                      onChange={(e) => setStudentAction({ ...studentAction, method: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field>
                    <label>Reference # / Cheque #</label>
                    <input
                      value={studentAction.reference || ''}
                      onChange={(e) => setStudentAction({ ...studentAction, reference: e.target.value })}
                      placeholder="Txn ID, Cheque #, or Receipt #"
                    />
                  </Field>
                  <Field className="wide">
                    <label>Remarks / Payment Notes (Optional)</label>
                    <input
                      value={studentAction.note || ''}
                      onChange={(e) => setStudentAction({ ...studentAction, note: e.target.value })}
                      placeholder="e.g. Installment fee collected at reception"
                    />
                  </Field>
                </Grid>
              </>
            )}

            {studentAction.type === 'note' && (() => {
              const parsedNotes = parseStudentNotes(studentAction.student.counsellor_notes);
              return (
                <>
                  <div style={{ marginBottom: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
                    Previous Notes Timeline ({parsedNotes.length})
                  </div>
                  <NotesFeed>
                    {parsedNotes.length === 0 ? (
                      <div className="empty-notes">
                        No previous notes recorded for this student yet. Add the first follow-up remark below.
                      </div>
                    ) : (
                      parsedNotes.map((item) => (
                        <div key={item.id} className="note-item">
                          <div className="note-meta">
                            <FaStickyNote style={{ color: '#7B1F2E' }} />
                            <span>{item.meta}</span>
                          </div>
                          <div className="note-content">{item.content}</div>
                        </div>
                      ))
                    )}
                  </NotesFeed>

                  <PresetChips>
                    <span className="chip-label">Quick Presets:</span>
                    {NOTE_PRESETS.map((preset, idx) => {
                      const PresetIcon = preset.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setStudentAction((prev) => ({
                              ...prev,
                              note: prev.note ? `${prev.note}\n${preset.text}` : preset.text
                            }))
                          }
                        >
                          <PresetIcon size={12} style={{ marginRight: '5px', verticalAlign: '-1px' }} />
                          {preset.label}
                        </button>
                      );
                    })}
                  </PresetChips>

                  <Field>
                    <label>Add New Follow-Up Note <span className="req">*</span></label>
                    <textarea
                      rows="4"
                      value={studentAction.note || ''}
                      onChange={(e) => setStudentAction({ ...studentAction, note: e.target.value })}
                      placeholder="Write follow-up notes, call remarks, payment promises, or batch requests... (Author and timestamp are automatically appended)"
                    />
                  </Field>
                </>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setStudentAction(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ccc',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                Cancel
              </button>
              <Primary onClick={saveStudentAction}>
                {studentAction.type === 'payment' ? 'Save Payment' : studentAction.type === 'note' ? 'Save Note' : 'Save'}
              </Primary>
            </div>
          </Modal>
        )}

        {/* Post-Payment Instant WhatsApp Receipt Modal */}
        {paymentReceiptModal && (
          <Modal onClose={() => setPaymentReceiptModal(null)} title="Payment Receipt Generated">
            <ReceiptModalCard>
              <div className="receipt-icon">
                <FaCheckCircle />
              </div>
              <h3>Rs. {Number(paymentReceiptModal.amount).toLocaleString()} Received</h3>
              <p className="desc">
                Payment successfully recorded for <strong>{paymentReceiptModal.studentName}</strong> ({paymentReceiptModal.course}).
              </p>

              <div className="details-box">
                <div className="row">
                  <span className="lbl">Payment Method:</span>
                  <span className="val">{String(paymentReceiptModal.method).toUpperCase()}</span>
                </div>
                <div className="row">
                  <span className="lbl">Payment Date:</span>
                  <span className="val">{paymentReceiptModal.date}</span>
                </div>
                {paymentReceiptModal.reference && (
                  <div className="row">
                    <span className="lbl">Reference #:</span>
                    <span className="val">{paymentReceiptModal.reference}</span>
                  </div>
                )}
                <div className="row">
                  <span className="lbl">Remaining Due:</span>
                  <span
                    className="val"
                    style={{
                      color: paymentReceiptModal.remaining === 0 ? '#10b981' : '#f59e0b'
                    }}
                  >
                    Rs. {Number(paymentReceiptModal.remaining).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="btn-group">
                {paymentReceiptModal.phone && (
                  <a
                    className="wa-btn"
                    href={getPaymentReceiptWhatsAppUrl(
                      paymentReceiptModal.phone,
                      paymentReceiptModal.studentName,
                      paymentReceiptModal.course,
                      paymentReceiptModal.amount,
                      paymentReceiptModal.remaining,
                      paymentReceiptModal.reference
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaWhatsapp size={18} /> Send WhatsApp Payment Receipt
                  </a>
                )}
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setPaymentReceiptModal(null)}
                >
                  Done
                </button>
              </div>
            </ReceiptModalCard>
          </Modal>
        )}
        {newLeadOpen && (
          <Modal onClose={() => setNewLeadOpen(false)} title="Capture New Lead / Walk-in Inquiry" wide>
            <form onSubmit={handleCreateLead} noValidate>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
                marginBottom: '14px'
              }}>
                <Field>
                  <label>Full Name <span className="req" style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    placeholder="e.g. Ali Ahmed"
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <label>Contact Phone / WhatsApp <span className="req" style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    placeholder="03001234567"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <label>Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="ali@example.com"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  />
                </Field>
                <Field>
                  <label>City / Location</label>
                  <input
                    placeholder="e.g. Lahore"
                    value={newLeadForm.city}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                  />
                </Field>
                <Field>
                  <label>Course of Interest</label>
                  <select
                    value={newLeadForm.course}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, course: e.target.value })}
                  >
                    <option value="">Select Course</option>
                    {courseTitles.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <label>Lead Source</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  >
                    <option value="Walk-in">Walk-in Visit</option>
                    <option value="Phone Call">Phone Call / Inbound</option>
                    <option value="WhatsApp">WhatsApp Inquiry</option>
                    <option value="Social Media">Social Media (FB / IG / LinkedIn)</option>
                    <option value="Friend">Friend / Word of Mouth</option>
                    <option value="Referral">Referral</option>
                    <option value="Google">Google Search</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field>
                  <label>Next Follow-Up Date</label>
                  <input
                    ref={leadFollowUpRef}
                    type="date"
                    min={todayDateStr}
                    value={newLeadForm.followUpDate}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, followUpDate: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
                  />
                </Field>
              </div>

              <Field style={{ marginBottom: '18px' }}>
                <label>Initial Discussion & Counsellor Notes</label>
                <textarea
                  placeholder="Record what the candidate asked, current qualification, preferred shift, or scheduled visit..."
                  value={newLeadForm.note}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, note: e.target.value })}
                  rows={3}
                />
              </Field>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setNewLeadOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <Primary type="submit">
                  <FaPlus /> Save & Add Lead
                </Primary>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

function StudentList({ students = [], batches = [], courses = [], navigate, onAction, canMutate = true, feeMap }) {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    feeStatus: 'all',
    course: 'all',
    batch: 'all',
    from: '',
    to: ''
  });

  const filterFromRef = useRef(null);
  const filterToRef = useRef(null);

  // Available courses
  const courseOptions = useMemo(() => {
    const fromCourses = (courses || []).map((c) => c.title).filter(Boolean);
    const fromStudents = (students || []).map((s) => s.course).filter(Boolean);
    return Array.from(new Set([...fromCourses, ...fromStudents])).sort();
  }, [courses, students]);

  // Available batches (filtered by selected course if selected)
  const batchOptions = useMemo(() => {
    let list = batches || [];
    if (filters.course !== 'all') {
      list = list.filter((b) => b.course === filters.course);
    }
    const names = list.map((b) => b.batch_name || b.name).filter(Boolean);
    (students || []).forEach((s) => {
      if (s.batch && (filters.course === 'all' || s.course === filters.course)) {
        names.push(s.batch);
      }
    });
    return Array.from(new Set(names)).sort();
  }, [batches, filters.course, students]);

  // Available statuses
  const statusOptions = useMemo(() => {
    const set = new Set(['Active', 'Inactive', 'Graduated']);
    (students || []).forEach((s) => {
      if (s.status) set.add(s.status);
    });
    return Array.from(set);
  }, [students]);

  // Key stats
  const stats = useMemo(() => {
    let duesCount = 0;
    students.forEach((s) => {
      const f = feeMap?.get(s.id);
      if (f && f.outstanding > 0) duesCount++;
    });
    return {
      total: students.length,
      active: students.filter((s) => s.status === 'Active').length,
      inactive: students.filter((s) => s.status === 'Inactive').length,
      graduated: students.filter((s) => s.status === 'Graduated').length,
      dues: duesCount
    };
  }, [students, feeMap]);

  // Filtered student list using strong search & multi-criteria filtering
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = matchesStrongSearch(student, filters.search);
      const matchesStatus = filters.status === 'all' || String(student.status || '').toLowerCase() === filters.status.toLowerCase();
      const matchesCourse = filters.course === 'all' || student.course === filters.course;
      const matchesBatch = filters.batch === 'all' || student.batch === filters.batch;

      const matchesFeeStatus = filters.feeStatus === 'all' || (() => {
        const fee = feeMap?.get(student.id);
        if (!fee) return filters.feeStatus === 'no_plan';
        if (filters.feeStatus === 'due') return fee.outstanding > 0;
        if (filters.feeStatus === 'paid') return fee.outstanding === 0 && fee.totalFee > 0;
        if (filters.feeStatus === 'unpaid') return fee.paid === 0 && fee.totalFee > 0;
        if (filters.feeStatus === 'no_plan') return !fee.plan || fee.totalFee === 0;
        return true;
      })();
      
      const admittedAt = student.submitted_at || student.created_at || student.admission_date;
      const date = admittedAt ? new Date(admittedAt) : null;
      const matchesFrom = !filters.from || (date && date >= new Date(filters.from));
      const matchesTo = !filters.to || (date && date <= new Date(`${filters.to}T23:59:59`));

      return matchesSearch && matchesStatus && matchesFeeStatus && matchesCourse && matchesBatch && matchesFrom && matchesTo;
    });
  }, [students, filters, feeMap]);

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.status !== 'all' ||
    filters.feeStatus !== 'all' ||
    filters.course !== 'all' ||
    filters.batch !== 'all' ||
    filters.from ||
    filters.to
  );

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      feeStatus: 'all',
      course: 'all',
      batch: 'all',
      from: '',
      to: ''
    });
  };

  return (
    <>
      <Stats>
        <Stat><span>{stats.total}</span><small>Total Students</small></Stat>
        <Stat><span style={{ color: '#2ecc71' }}>{stats.active}</span><small>Active</small></Stat>
        <Stat
          onClick={() => setFilters((f) => ({ ...f, feeStatus: f.feeStatus === 'due' ? 'all' : 'due' }))}
          style={{
            cursor: 'pointer',
            border: filters.feeStatus === 'due' ? '1px solid #ef4444' : undefined,
            background: filters.feeStatus === 'due' ? 'rgba(239, 68, 68, 0.12)' : undefined,
            transition: 'all 0.2s ease'
          }}
          title="Click to toggle students with pending fee dues"
        >
          <span style={{ color: '#f87171' }}>{stats.dues}</span>
          <small style={{ color: filters.feeStatus === 'due' ? '#fca5a5' : undefined }}>
            {filters.feeStatus === 'due' ? 'Filtering: Dues' : 'Dues Outstanding'}
          </small>
        </Stat>
        <Stat><span style={{ color: '#94a3b8' }}>{stats.inactive}</span><small>Inactive</small></Stat>
        <Stat><span style={{ color: '#38bdf8' }}>{stats.graduated}</span><small>Graduated</small></Stat>
      </Stats>

      <Filters>
        <Field compact>
          <FaSearch />
          <input
            placeholder="Search name, phone, CNIC, email"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </Field>
        <Field compact>
          <FaFilter />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All Status</option>
            {statusOptions.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </Field>
        <Field compact>
          <FaMoneyBillWave />
          <select
            value={filters.feeStatus}
            onChange={(e) => setFilters({ ...filters, feeStatus: e.target.value })}
          >
            <option value="all">All Fee Status</option>
            <option value="due">Dues Outstanding</option>
            <option value="paid">Fully Paid</option>
            <option value="unpaid">Completely Unpaid</option>
            <option value="no_plan">No Fee Plan</option>
          </select>
        </Field>
        <Field compact>
          <select
            value={filters.course}
            onChange={(e) => setFilters({ ...filters, course: e.target.value, batch: 'all' })}
          >
            <option value="all">All Courses</option>
            {courseOptions.map((title) => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </Field>
        <Field compact>
          <select
            value={filters.batch}
            onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
          >
            <option value="all">All Batches</option>
            {batchOptions.map((bName) => (
              <option key={bName} value={bName}>{bName}</option>
            ))}
          </select>
        </Field>
        <Field compact>
          <input
            ref={filterFromRef}
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
            title="Enrolled From"
          />
        </Field>
        <Field compact>
          <input
            ref={filterToRef}
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
            title="Enrolled To"
          />
        </Field>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '10px',
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '42px'
            }}
          >
            <FaTimes /> Reset
          </button>
        )}
      </Filters>

      <TableCard>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Phone</th>
              <th>CNIC</th>
              <th>Course</th>
              <th>Batch</th>
              <th>Enrolled</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const enrolledDate = student.submitted_at || student.created_at || student.admission_date;
              const fee = feeMap?.get(student.id);
              const hasNotes = Boolean(student.counsellor_notes && String(student.counsellor_notes).trim());
              return (
                <tr key={student.id}>
                  <td>
                    <strong>{student.name}</strong>
                    <small>{student.email || 'No email'}</small>
                  </td>
                  <td>{student.phone || '-'}</td>
                  <td>{student.cnic || '-'}</td>
                  <td>{student.course || '-'}</td>
                  <td>{student.batch || '-'}</td>
                  <td>{enrolledDate ? new Date(enrolledDate).toLocaleDateString() : '-'}</td>
                  <td>
                    <Badge $status={student.status}>{student.status}</Badge>
                    {fee && fee.totalFee > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        {fee.outstanding === 0 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                            <FaCheckCircle size={10} /> Fee Paid
                          </span>
                        ) : fee.paid > 0 ? (
                          <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, background: 'rgba(245, 158, 11, 0.12)', padding: '2px 6px', borderRadius: '4px' }} title={`Paid: Rs. ${fee.paid.toLocaleString()} / Total: Rs. ${fee.totalFee.toLocaleString()}`}>
                            Due: Rs. {fee.outstanding.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', padding: '2px 6px', borderRadius: '4px' }} title={`Total Fee: Rs. ${fee.totalFee.toLocaleString()}`}>
                            Unpaid: Rs. {fee.outstanding.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <Actions>
                      <button
                        type="button"
                        title="View student profile dossier (academics, attendance, fees, notes)"
                        onClick={() => navigate(`/admin/management/students/${student.id}?from=counsellor`)}
                      >
                        <FaUserGraduate /> Profile
                      </button>
                      {canMutate && (
                        <button
                          type="button"
                          title="Record fee installment or direct payment"
                          onClick={() => onAction({ type: 'payment', student, feeSummary: fee })}
                        >
                          <FaMoneyBillWave /> Payment
                        </button>
                      )}
                      {canMutate && (
                        <button
                          type="button"
                          title="View notes timeline and log counsellor remarks"
                          onClick={() => onAction({ type: 'note', student, feeSummary: fee, note: '' })}
                        >
                          <FaStickyNote /> Note
                          {hasNotes && (
                            <span
                              style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa', display: 'inline-block', marginLeft: '3px' }}
                              title="Has previous notes"
                            />
                          )}
                        </button>
                      )}
                    </Actions>
                  </td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  No students found matching your criteria.
                  {hasActiveFilters && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={resetFilters}
                        style={{
                          background: '#7B1F2E',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
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
const Stats = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:20px;@media(max-width:900px){grid-template-columns:repeat(2,1fr);}`;
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
const Badge = styled.span`display:inline-flex;padding:6px 10px;border-radius:999px;font-size:.72rem;font-weight:900;text-transform:uppercase;background:${p=>p.$status==='enrolled'||p.$status==='Active'?'rgba(46,204,113,.14)':p.$status==='lost'||p.$status==='Inactive'?'rgba(239,68,68,.14)':p.$status==='Graduated'?'rgba(56,189,248,.14)':p.$status==='follow_up'?'rgba(147,51,234,.14)':p.$status==='contacted'?'rgba(245,158,11,.14)':'rgba(79,142,247,.14)'};color:${p=>p.$status==='enrolled'||p.$status==='Active'?'#2ecc71':p.$status==='lost'||p.$status==='Inactive'?'#ef4444':p.$status==='Graduated'?'#38bdf8':p.$status==='follow_up'?'#c084fc':p.$status==='contacted'?'#f59e0b':'#4F8EF7'};`;
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

const StudentActionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;

  .meta {
    h3 {
      margin: 0 0 4px;
      font-size: 1.15rem;
      color: #fff;
    }
    p {
      margin: 0;
      font-size: 0.82rem;
      color: #94a3b8;
    }
  }

  .contacts {
    display: flex;
    gap: 8px;
    align-items: center;

    a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.85;
      }

      &.call {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      &.wa {
        background: rgba(37, 211, 102, 0.15);
        color: #25d366;
        border: 1px solid rgba(37, 211, 102, 0.3);
      }
    }
  }
`;

const FeeStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }

  .stat-card {
    background: #111318;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .stat-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      font-weight: 700;
    }

    .stat-val {
      font-size: 1.15rem;
      font-weight: 800;
      color: #fff;

      &.paid {
        color: #10b981;
      }
      &.due {
        color: #f59e0b;
      }
      &.cleared {
        color: #38bdf8;
      }
    }
  }
`;

const QuickFillBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(245, 158, 11, 0.08);
  border: 1px dashed rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;

  span {
    font-size: 0.82rem;
    color: #fbbf24;
    font-weight: 600;
  }

  button {
    background: #f59e0b;
    color: #000;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 0.8rem;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: transform 0.15s ease;

    &:hover {
      transform: scale(1.02);
    }
  }
`;

const NotesFeed = styled.div`
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }

  .empty-notes {
    text-align: center;
    color: #64748b;
    font-size: 0.85rem;
    padding: 24px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border: 1px dashed rgba(255, 255, 255, 0.06);
  }

  .note-item {
    background: #111318;
    border-left: 3px solid #7B1F2E;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 10px 12px;

    .note-meta {
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .note-content {
      font-size: 0.86rem;
      color: #e2e8f0;
      white-space: pre-wrap;
      line-height: 1.4;
    }
  }
`;

const PresetChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;

  .chip-label {
    font-size: 0.75rem;
    color: #888;
    align-self: center;
    margin-right: 4px;
    font-weight: 700;
  }

  button {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    border-radius: 6px;
    padding: 4px 9px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.25);
    }
  }
`;

const ReceiptModalCard = styled.div`
  text-align: center;
  padding: 10px 0;

  .receipt-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto 16px;
  }

  h3 {
    margin: 0 0 6px;
    font-size: 1.5rem;
    color: #fff;
  }

  p.desc {
    margin: 0 0 20px;
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .details-box {
    background: #111318;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 22px;
    text-align: left;

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.86rem;

      &:last-child {
        border-bottom: none;
      }

      .lbl {
        color: #888;
      }

      .val {
        color: #fff;
        font-weight: 700;
      }
    }
  }

  .btn-group {
    display: flex;
    flex-direction: column;
    gap: 10px;

    a.wa-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #25d366;
      color: #000;
      font-weight: 800;
      padding: 12px;
      border-radius: 10px;
      text-decoration: none;
      font-size: 0.92rem;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.9;
      }
    }

    button.close-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      padding: 10px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.88rem;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }
`;
function OverviewContent({
  stats,
  conversionRate,
  navigate,
  openEnroll,
  canMutate,
  activeBatches,
  studentCountByBatch,
  recentInquiries,
  sourcesBreakdown,
  onSelectInquiry,
  onUpdateStatus,
  getLinkedStudent,
  dueTodayCount = 0
}) {
  return (
    <>
      <OverviewGrid>
        <OverviewStatCard $highlight>
          <span className="label">Total Leads</span>
          <span className="value" style={{ color: '#60a5fa' }}>{stats.total}</span>
          <span className="sub">All web & walk-in inquiries</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">New Leads</span>
          <span className="value" style={{ color: stats.new > 0 ? '#fbbf24' : '#94a3b8' }}>{stats.new}</span>
          <span className="sub">{stats.new > 0 ? 'Pending initial contact' : 'All caught up'}</span>
        </OverviewStatCard>
        <OverviewStatCard
          onClick={() => navigate('/admin/counsellor/inquiries')}
          style={{ cursor: 'pointer' }}
          title="Click to view inquiries with pending follow-ups"
        >
          <span className="label">Follow-ups Due</span>
          <span className="value" style={{ color: dueTodayCount > 0 ? '#f59e0b' : '#94a3b8' }}>{dueTodayCount}</span>
          <span className="sub">{dueTodayCount > 0 ? 'Due today or overdue' : 'All up to date'}</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">In Follow-Up</span>
          <span className="value" style={{ color: '#c084fc' }}>{stats.contacted}</span>
          <span className="sub">Contacted & scheduled</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">Enrolled</span>
          <span className="value" style={{ color: '#34d399' }}>{stats.enrolled}</span>
          <span className="sub">Converted to students</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">Conversion Rate</span>
          <span className="value" style={{ color: '#38bdf8' }}>{conversionRate}%</span>
          <span className="sub">Lead-to-admission ratio</span>
        </OverviewStatCard>
      </OverviewGrid>

      <DashboardGrid>
        <CardPanel>
          <div className="panel-header">
            <h3><FaClipboardList /> Recent Inquiries</h3>
            <button type="button" onClick={() => navigate('/admin/counsellor/inquiries')}>
              View All ({stats.total}) <FaArrowRight />
            </button>
          </div>
          {recentInquiries.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No inquiries received yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentInquiries.map((inq) => {
                const linked = getLinkedStudent ? getLinkedStudent(inq) : null;
                const isEnrolled = inq.status === 'enrolled' || !!linked;
                return (
                  <div key={inq.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <strong style={{ color: '#f8fafc', fontSize: '0.92rem', display: 'block' }}>{inq.name}</strong>
                      <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        {inq.phone} • <span style={{ color: '#60a5fa' }}>{inq.course_interest || 'General'}</span> • {inq.submitted_at ? new Date(inq.submitted_at).toLocaleDateString() : 'Recent'}
                      </small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge $status={inq.status}>{statusLabel(inq.status)}</Badge>
                      <Actions>
                        {canMutate && (
                          <button type="button" onClick={() => onUpdateStatus(inq)} title="Call & Update Status">
                            <FaPhone />
                          </button>
                        )}
                        {canMutate && (
                          isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => navigate(linked ? `/admin/management/students/${linked.id}?from=counsellor` : '/admin/counsellor/students')}
                              title="View Enrolled Student Profile"
                              style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)' }}
                            >
                              <FaUserGraduate />
                            </button>
                          ) : (
                            <button type="button" onClick={() => openEnroll(inq)} title="Enroll Candidate">
                              <FaCheckCircle />
                            </button>
                          )
                        )}
                        <button type="button" onClick={() => onSelectInquiry(inq)} title="View Candidate Details">
                          <FaEye />
                        </button>
                      </Actions>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardPanel>

        <CardPanel>
          <div className="panel-header">
            <h3><FaGraduationCap /> Active Batches & Seats</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{activeBatches.length} active</span>
          </div>
          {activeBatches.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No active batches configured.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeBatches.map((b) => {
                const used = studentCountByBatch.get(b.batch_name) || 0;
                const capacity = b.capacity || 30;
                const remaining = Math.max(0, capacity - used);
                const pct = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
                const isFull = remaining === 0;
                const isLow = remaining > 0 && remaining <= 5;
                const color = isFull ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';

                return (
                  <BatchItem key={b.id} $isFull={isFull} $isLow={isLow}>
                    <div className="top">
                      <strong>{b.course}</strong>
                      <small>{b.batch_name}</small>
                    </div>
                    <ProgressBar $pct={pct} $color={color}>
                      <div className="fill" />
                    </ProgressBar>
                    <div className="meta">
                      <span>{used} of {capacity} seats filled ({pct}%)</span>
                      <span className="seats">
                        {isFull ? 'Batch Full' : `${remaining} seats available`}
                      </span>
                    </div>
                  </BatchItem>
                );
              })}
            </div>
          )}
        </CardPanel>
      </DashboardGrid>

      <CardPanel>
        <div className="panel-header">
          <h3><FaShareAlt /> Lead Sources Breakdown</h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Channel distribution</span>
        </div>
        <SourceGrid>
          {sourcesBreakdown.map((s) => (
            <SourceBox key={s.source}>
              <span>{s.source}</span>
              <strong>{s.count}</strong>
              <small>{s.pct}% of leads</small>
              <ProgressBar $pct={s.pct} $color="#378ADD" style={{ height: '4px', marginTop: '4px' }}>
                <div className="fill" />
              </ProgressBar>
            </SourceBox>
          ))}
        </SourceGrid>
      </CardPanel>
    </>
  );
}

function PerformanceContent({
  stats,
  conversionRate,
  avgDaysToConvert,
  sourcesBreakdown,
  courseBreakdown,
  exportCsv
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Conversion & Channel Analytics</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Track inquiry lifecycle and recruitment channel efficiency.</p>
        </div>
        <Actions>
          <button type="button" onClick={exportCsv}><FaDownload /> Export CSV</button>
        </Actions>
      </div>

      <OverviewGrid>
        <OverviewStatCard>
          <span className="label">Total Pipeline</span>
          <span className="value" style={{ color: '#60a5fa' }}>{stats.total}</span>
          <span className="sub">All-time inquiries</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">Converted Students</span>
          <span className="value" style={{ color: '#34d399' }}>{stats.enrolled}</span>
          <span className="sub">Successfully enrolled</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">Overall Conversion</span>
          <span className="value" style={{ color: '#38bdf8' }}>{conversionRate}%</span>
          <span className="sub">Enrolled / total ratio</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">Avg Conversion Time</span>
          <span className="value" style={{ color: '#c084fc' }}>{avgDaysToConvert}</span>
          <span className="sub">Days from lead to enrollment</span>
        </OverviewStatCard>
        <OverviewStatCard>
          <span className="label">Lost Opportunities</span>
          <span className="value" style={{ color: '#f87171' }}>{stats.lost}</span>
          <span className="sub">Marked lost or dropped</span>
        </OverviewStatCard>
      </OverviewGrid>

      <DashboardGrid>
        <CardPanel>
          <div className="panel-header">
            <h3><FaLayerGroup /> Pipeline Funnel Stages</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Lifecycle breakdown</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'New Uncontacted', count: stats.new, color: '#fbbf24' },
              { label: 'Contacted & Follow-up', count: stats.contacted, color: '#c084fc' },
              { label: 'Enrolled Students', count: stats.enrolled, color: '#34d399' },
              { label: 'Lost / Disqualified', count: stats.lost, color: '#ef4444' }
            ].map((stage) => {
              const pct = stats.total > 0 ? Math.round((stage.count / stats.total) * 100) : 0;
              return (
                <div key={stage.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{stage.label}</span>
                    <span style={{ color: stage.color, fontWeight: 700 }}>{stage.count} ({pct}%)</span>
                  </div>
                  <ProgressBar $pct={pct} $color={stage.color}>
                    <div className="fill" />
                  </ProgressBar>
                </div>
              );
            })}
          </div>
        </CardPanel>

        <CardPanel>
          <div className="panel-header">
            <h3><FaShareAlt /> Lead Sources Effectiveness</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Inquiries per channel</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sourcesBreakdown.map((s) => (
              <div key={s.source} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{s.source}</span>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>{s.count} leads ({s.pct}%)</span>
                </div>
                <ProgressBar $pct={s.pct} $color="#378ADD">
                  <div className="fill" />
                </ProgressBar>
              </div>
            ))}
          </div>
        </CardPanel>
      </DashboardGrid>

      <CardPanel>
        <div className="panel-header">
          <h3><FaGraduationCap /> Course Interest & Conversion</h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Program-level inquiry metrics</span>
        </div>
        <TableCard>
          <table>
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Inquiries</th>
                <th>Enrolled</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {courseBreakdown.map((c) => {
                const rate = c.total > 0 ? Math.round((c.enrolled / c.total) * 100) : 0;
                return (
                  <tr key={c.course}>
                    <td><strong style={{ color: '#f1f5f9' }}>{c.course}</strong></td>
                    <td>{c.total}</td>
                    <td style={{ color: '#34d399', fontWeight: 700 }}>{c.enrolled}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '200px' }}>
                        <ProgressBar $pct={rate} $color={rate >= 30 ? '#10b981' : rate >= 15 ? '#f59e0b' : '#ef4444'} style={{ height: '6px', flex: 1 }}>
                          <div className="fill" />
                        </ProgressBar>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '36px' }}>{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {courseBreakdown.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No course interest data available.</td></tr>
              )}
            </tbody>
          </table>
        </TableCard>
      </CardPanel>
    </>
  );
}

const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
  @media (max-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 640px) { grid-template-columns: repeat(2, 1fr); }
`;

const OverviewStatCard = styled.div`
  background: #111318;
  border: 1px solid ${p => p.$highlight ? 'rgba(55, 138, 221, 0.35)' : 'rgba(255, 255, 255, 0.07)'};
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;

  ${p => p.$highlight && `
    box-shadow: 0 0 20px rgba(55, 138, 221, 0.12);
  `}

  .label {
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }

  .value {
    font-size: 1.8rem;
    font-weight: 800;
    color: ${p => p.$color || '#fff'};
    line-height: 1.1;
  }

  .sub {
    font-size: 0.74rem;
    color: #64748b;
  }
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
  @media (max-width: 960px) { grid-template-columns: 1fr; }
`;

const CardPanel = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
      svg { color: #378ADD; font-size: 0.95rem; }
    }

    button, a {
      background: none;
      border: none;
      color: #378ADD;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0;
      &:hover { color: #60a5fa; text-decoration: underline; }
    }
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;

  .fill {
    height: 100%;
    width: ${p => Math.min(100, Math.max(0, p.$pct || 0))}%;
    background: ${p => p.$color || '#10b981'};
    border-radius: 999px;
    transition: width 0.4s ease;
  }
`;

const BatchItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;

    strong {
      color: #f1f5f9;
      font-size: 0.88rem;
    }

    small {
      color: #94a3b8;
      font-size: 0.75rem;
    }
  }

  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.76rem;
    color: #94a3b8;

    .seats {
      font-weight: 700;
      color: ${p => p.$isFull ? '#ef4444' : p.$isLow ? '#f59e0b' : '#10b981'};
    }
  }
`;

const SourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
`;

const SourceBox = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: #94a3b8;
    font-size: 0.76rem;
    text-transform: uppercase;
    font-weight: 700;
  }

  strong {
    font-size: 1.3rem;
    color: #fff;
    font-weight: 800;
  }

  small {
    color: #64748b;
    font-size: 0.72rem;
  }
`;

export default CounsellorPanel;
