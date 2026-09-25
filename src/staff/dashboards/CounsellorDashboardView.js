import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaPhoneAlt, FaCalendarCheck, FaUserGraduate, FaClipboardList,
  FaClock, FaWhatsapp, FaPlus, FaFilter, FaArrowRight, FaCheckCircle,
  FaTimes, FaFire, FaTasks, FaSignInAlt, FaSignOutAlt, FaCoffee,
  FaPlay, FaStop, FaCalendarAlt, FaExclamationCircle, FaUserCheck
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../../components/portal/PortalTheme';
import { supabase } from '../../supabaseClient';
import { formatPhone, validateRequired, validateEmail } from '../../utils/formValidation';
import { formatHourDecimal } from '../../utils/timeTrackingApi';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1240px;
  margin: 0 auto;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.22) 0%, rgba(123, 31, 46, 0.35) 50%, rgba(20, 24, 33, 0.95) 100%);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: ${portalTheme.radii.lg};
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);

  .text-side {
    display: flex;
    flex-direction: column;
    gap: 6px;

    h1 {
      font-size: 1.65rem;
      font-weight: 800;
      margin: 0;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    p {
      margin: 0;
      font-size: 0.92rem;
      color: rgba(255, 255, 255, 0.75);
    }
  }

  .actions-side {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #FBBF24;
  padding: 4px 12px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.8rem;
  font-weight: 700;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border: 1px solid rgba(245, 158, 11, 0.6);
  color: #111827;
  padding: 10px 18px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(245, 158, 11, 0.35);
  }
`;

const SecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 10px 16px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    color: #fff;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${props => props.$border || portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  transition: all 0.2s ease;

  ${props => props.$alert && `
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(30, 34, 46, 0.9) 100%);
    border-color: rgba(239, 68, 68, 0.35);
  `}

  .icon {
    width: 50px;
    height: 50px;
    border-radius: ${portalTheme.radii.md};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: ${props => props.$bg || 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.$color || '#fff'};
    flex-shrink: 0;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .val {
      font-size: 1.6rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
    }

    .lbl {
      font-size: 0.8rem;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .sub {
      font-size: 0.76rem;
      color: ${props => props.$subColor || '#94A3B8'};
      font-weight: 500;
    }
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1.65fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 14px;

    h3 {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;

      .badge {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: ${portalTheme.radii.pill};
        font-weight: 700;
      }
    }

    a {
      font-size: 0.82rem;
      color: #38BDF8;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 600;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const QueueItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${props => props.$isOverdue ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.07)'};
  border-left: 4px solid ${props => props.$isOverdue ? '#EF4444' : '#F59E0B'};
  border-radius: ${portalTheme.radii.sm};
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .left-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 200px;
    flex: 1;

    .top-line {
      display: flex;
      align-items: center;
      gap: 10px;

      .name {
        font-weight: 700;
        font-size: 0.95rem;
        color: #fff;
      }

      .course-tag {
        font-size: 0.74rem;
        padding: 2px 8px;
        background: rgba(56, 189, 248, 0.12);
        border: 1px solid rgba(56, 189, 248, 0.25);
        color: #38BDF8;
        border-radius: 4px;
        font-weight: 600;
      }

      .status-pill {
        font-size: 0.72rem;
        padding: 2px 7px;
        border-radius: 4px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        background: ${props => props.$status === 'new' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
        color: ${props => props.$status === 'new' ? '#60A5FA' : '#FBBF24'};
      }
    }

    .bottom-line {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 0.78rem;
      color: ${portalTheme.colors.textMuted};

      .phone {
        font-family: monospace;
      }

      .due-tag {
        display: flex;
        align-items: center;
        gap: 4px;
        color: ${props => props.$isOverdue ? '#F87171' : '#FBBF24'};
        font-weight: 600;
      }
    }

    .note-snip {
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.6);
      font-style: italic;
      margin-top: 2px;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
`;

const IconBtn = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$color || '#fff'};
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.06);

  &:hover {
    filter: brightness(1.2);
    transform: scale(1.05);
  }
`;

const MiniActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  background: ${props => props.$variant === 'amber' ? 'rgba(245, 158, 11, 0.2)' : (props.$variant === 'green' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255, 255, 255, 0.08)')};
  color: ${props => props.$variant === 'amber' ? '#FBBF24' : '#fff'};
  border: 1px solid ${props => props.$variant === 'amber' ? 'rgba(245, 158, 11, 0.4)' : 'transparent'};

  &:hover {
    filter: brightness(1.15);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalBox = styled.div`
  background: #181B26;
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: ${portalTheme.radii.lg};
  width: 100%;
  max-width: 540px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 18px;

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    button {
      background: none;
      border: none;
      color: ${portalTheme.colors.textMuted};
      font-size: 1.1rem;
      cursor: pointer;

      &:hover {
        color: #fff;
      }
    }
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
    }

    input, select, textarea {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 9px 12px;
      color: #fff;
      font-size: 0.88rem;

      &:focus {
        outline: none;
        border-color: #F59E0B;
      }
    }

    .error-msg {
      font-size: 0.75rem;
      color: #EF4444;
    }
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
`;

const CourseDemandBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  .bar-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;

    .title {
      font-weight: 600;
      color: #fff;
    }

    .count {
      color: #FBBF24;
      font-weight: 700;
    }
  }

  .bar-track {
    height: 8px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    overflow: hidden;

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #F59E0B, #EF4444);
      border-radius: 4px;
    }
  }
`;

const ShiftStatusBox = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${portalTheme.radii.md};
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  .shift-info {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .status-text {
      font-size: 0.85rem;
      font-weight: 700;
      color: ${props => props.$color || '#fff'};
    }

    .time-text {
      font-size: 0.82rem;
      color: ${portalTheme.colors.textMuted};
    }
  }

  .shift-buttons {
    display: flex;
    gap: 8px;
  }
`;

export default function CounsellorDashboardView({
  user,
  shift,
  todaySeconds,
  myTasks,
  activeTimer,
  handleShiftPunch,
  handleToggleTimer,
  onRefresh
}) {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Faisalabad',
    course: '',
    source: 'Walk-in',
    note: '',
    followUpDate: ''
  });
  const [walkInErrors, setWalkInErrors] = useState({});

  const [statusModalTarget, setStatusModalTarget] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: 'contacted',
    note: '',
    followUpDate: ''
  });

  const loadCounsellorData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [inqRes, courseRes, admRes] = await Promise.all([
        supabase.from('inquiries').select('*').order('submitted_at', { ascending: false }),
        supabase.from('courses').select('id, title, category, fee').order('title', { ascending: true }),
        supabase.from('admissions').select('*', { count: 'exact', head: true })
      ]);

      if (inqRes.data) setInquiries(inqRes.data);
      if (courseRes.data) setCourses(courseRes.data);
      if (admRes.count != null) setEnrolledCount(admRes.count);
    } catch (err) {
      console.error('Failed to load counsellor dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounsellorData();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute metrics
  const metrics = useMemo(() => {
    const dueToday = inquiries.filter(i => {
      if (i.status === 'enrolled' || i.status === 'lost') return false;
      const d = i.follow_up_date || (Array.isArray(i.counsellor_notes) && i.counsellor_notes[i.counsellor_notes.length - 1]?.followUpDate);
      return Boolean(d && d <= todayStr);
    });

    const overdueCount = dueToday.filter(i => {
      const d = i.follow_up_date || (Array.isArray(i.counsellor_notes) && i.counsellor_notes[i.counsellor_notes.length - 1]?.followUpDate);
      return Boolean(d && d < todayStr);
    }).length;

    const newLeads = inquiries.filter(i => i.status === 'new');
    const activePipeline = inquiries.filter(i => ['contacted', 'follow_up'].includes(i.status));
    const enrolledLeads = inquiries.filter(i => i.status === 'enrolled');

    const conversionRate = inquiries.length > 0
      ? Math.round((enrolledLeads.length / inquiries.length) * 100)
      : 0;

    return {
      dueToday,
      dueTodayCount: dueToday.length,
      overdueCount,
      newLeadsCount: newLeads.length,
      activePipelineCount: activePipeline.length,
      enrolledCount: enrolledCount || enrolledLeads.length,
      conversionRate
    };
  }, [inquiries, todayStr, enrolledCount]);

  // Course demand breakdown
  const topCourses = useMemo(() => {
    const countMap = {};
    inquiries.forEach(i => {
      if (i.course_interest) {
        countMap[i.course_interest] = (countMap[i.course_interest] || 0) + 1;
      }
    });

    const sorted = Object.entries(countMap)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = sorted.length > 0 ? sorted[0].count : 1;
    return sorted.map(c => ({ ...c, percentage: Math.round((c.count / maxCount) * 100) }));
  }, [inquiries]);

  // Recent leads (top 5 non-enrolled or latest)
  const recentLeads = useMemo(() => {
    return inquiries.slice(0, 5);
  }, [inquiries]);

  // WhatsApp & Phone Helpers
  const getWhatsAppLink = (phone, name, course) => {
    if (!phone) return null;
    const clean = String(phone).replace(/\D/g, '');
    if (!clean) return null;
    let intl = clean;
    if (clean.startsWith('0')) intl = `92${clean.slice(1)}`;
    else if (!clean.startsWith('92') && clean.length === 10) intl = `92${clean}`;
    const text = encodeURIComponent(`Assalam-o-Alaikum ${name || 'there'}, this is DeepSkills Admissions following up regarding your interest in ${course || 'our courses'}. How can we assist you today?`);
    return `https://wa.me/${intl}?text=${text}`;
  };

  const getTelLink = (phone) => {
    if (!phone) return null;
    const clean = String(phone).replace(/[^\d+]/g, '');
    return clean ? `tel:${clean}` : null;
  };

  // Submit quick walk-in lead
  const handleSaveWalkIn = async (e) => {
    e.preventDefault();
    const reqErr = validateRequired(walkInForm.name, 'Name');
    const phoneErr = validateRequired(walkInForm.phone, 'Phone number');
    if (reqErr || phoneErr) {
      setWalkInErrors({ name: reqErr, phone: phoneErr });
      return;
    }

    try {
      const notesArr = [];
      if (walkInForm.note || walkInForm.followUpDate) {
        notesArr.push({
          note: walkInForm.note || (walkInForm.followUpDate ? `Scheduled follow-up for ${walkInForm.followUpDate}` : 'Walk-in candidate inquiry captured at reception'),
          timestamp: new Date().toISOString(),
          by: user?.name || user?.full_name || 'Admission Counsellor',
          followUpDate: walkInForm.followUpDate || null
        });
      }

      const payload = {
        name: walkInForm.name.trim(),
        phone: formatPhone(walkInForm.phone),
        email: walkInForm.email?.trim() || null,
        city: walkInForm.city?.trim() || null,
        course_interest: walkInForm.course || null,
        hear_about_us: walkInForm.source || 'Walk-in',
        status: 'new',
        counsellor_notes: notesArr,
        submitted_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        follow_up_date: walkInForm.followUpDate || null
      };

      const { data, error } = await supabase.from('inquiries').insert([payload]).select();
      if (error) throw error;

      if (notesArr.length > 0 && data?.[0]?.id) {
        await supabase.from('inquiry_notes').insert({
          inquiry_id: data[0].id,
          note: notesArr[0].note,
          status_changed_to: 'new',
          added_by: user?.name || user?.full_name || 'Admission Counsellor'
        });
      }

      toast.success(`Walk-in lead saved for ${walkInForm.name}!`);
      setWalkInModalOpen(false);
      setWalkInForm({
        name: '',
        phone: '',
        email: '',
        city: 'Faisalabad',
        course: '',
        source: 'Walk-in',
        note: '',
        followUpDate: ''
      });
      loadCounsellorData();
    } catch (err) {
      toast.error('Failed to save walk-in: ' + (err.message || err));
    }
  };

  // Submit quick status update
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusModalTarget) return;

    try {
      const entry = {
        note: statusForm.note || `Status updated to ${statusForm.status}`,
        timestamp: new Date().toISOString(),
        by: user?.name || user?.full_name || 'Admission Counsellor',
        followUpDate: statusForm.followUpDate || null
      };

      const existingNotes = Array.isArray(statusModalTarget.counsellor_notes) ? statusModalTarget.counsellor_notes : [];
      const updatePayload = {
        status: statusForm.status,
        counsellor_notes: [...existingNotes, entry],
        last_updated: new Date().toISOString()
      };
      if (statusForm.followUpDate) {
        updatePayload.follow_up_date = statusForm.followUpDate;
      }

      const { error } = await supabase.from('inquiries').update(updatePayload).eq('id', statusModalTarget.id);
      if (error) throw error;

      await supabase.from('inquiry_notes').insert({
        inquiry_id: statusModalTarget.id,
        note: entry.note,
        status_changed_to: statusForm.status,
        added_by: user?.name || user?.full_name || 'Admission Counsellor'
      });

      toast.success('Inquiry updated successfully');
      setStatusModalTarget(null);
      setStatusForm({ status: 'contacted', note: '', followUpDate: '' });
      loadCounsellorData();
    } catch (err) {
      toast.error('Failed to update: ' + (err.message || err));
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Container>
      {/* ── WELCOME BANNER ── */}
      <WelcomeBanner>
        <div className="text-side">
          <h1>
            {getGreeting()}, {user?.name || user?.full_name || 'Counsellor'} 👋
            <RoleBadge><FaPhoneAlt /> Admission Counsellor</RoleBadge>
          </h1>
          <p>
            Welcome to your Admissions Command Center. You have <strong>{metrics.dueTodayCount} follow-ups scheduled</strong> for today.
          </p>
        </div>
        <div className="actions-side">
          <PrimaryBtn onClick={() => setWalkInModalOpen(true)}>
            <FaPlus /> + Walk-in Lead
          </PrimaryBtn>
          <SecondaryBtn to="/staff/enroll">
            <FaUserGraduate /> Enroll Student
          </SecondaryBtn>
          <SecondaryBtn to="/staff/inquiries">
            <FaClipboardList /> Inquiries CRM
          </SecondaryBtn>
        </div>
      </WelcomeBanner>

      {/* ── KPI METRICS GRID ── */}
      <StatsGrid>
        <StatCard
          $border={metrics.overdueCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.35)'}
          $bg={metrics.overdueCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}
          $color={metrics.overdueCount > 0 ? '#F87171' : '#FBBF24'}
          $alert={metrics.overdueCount > 0}
        >
          <div className="icon"><FaPhoneAlt /></div>
          <div className="meta">
            <span className="val">{metrics.dueTodayCount}</span>
            <span className="lbl">Follow-ups Due</span>
            <span className="sub">
              {metrics.overdueCount > 0
                ? `🚨 ${metrics.overdueCount} overdue callbacks!`
                : 'All on schedule for today'}
            </span>
          </div>
        </StatCard>

        <StatCard $bg="rgba(56, 189, 248, 0.15)" $color="#38BDF8">
          <div className="icon"><FaClipboardList /></div>
          <div className="meta">
            <span className="val">{metrics.newLeadsCount}</span>
            <span className="lbl">New Inquiries</span>
            <span className="sub">Awaiting first contact</span>
          </div>
        </StatCard>

        <StatCard $bg="rgba(139, 92, 246, 0.15)" $color="#A78BFA">
          <div className="icon"><FaCalendarCheck /></div>
          <div className="meta">
            <span className="val">{metrics.activePipelineCount}</span>
            <span className="lbl">Active Pipeline</span>
            <span className="sub">Contacted & counseling in progress</span>
          </div>
        </StatCard>

        <StatCard $bg="rgba(16, 185, 129, 0.15)" $color="#34D399">
          <div className="icon"><FaUserGraduate /></div>
          <div className="meta">
            <span className="val">{metrics.enrolledCount}</span>
            <span className="lbl">Enrolled Students</span>
            <span className="sub">{metrics.conversionRate}% conversion rate</span>
          </div>
        </StatCard>
      </StatsGrid>

      {/* ── TWO COLUMN OPERATIONAL SECTION ── */}
      <TwoColumnGrid>
        {/* LEFT COLUMN: Daily Action Queue & Recent Leads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Today's Action Queue */}
          <Card>
            <div className="card-header">
              <h3>
                <FaPhoneAlt style={{ color: '#F59E0B' }} />
                Today's Follow-up Queue
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' }}>
                  {metrics.dueTodayCount} due
                </span>
              </h3>
              <Link to="/staff/inquiries">Open Inquiries CRM <FaArrowRight /></Link>
            </div>

            {metrics.dueToday.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: portalTheme.colors.textMuted }}>
                <FaCheckCircle style={{ fontSize: '2.4rem', color: '#10B981', opacity: 0.8, marginBottom: '10px' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1rem' }}>No Pending Follow-ups Due Today!</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>All leads are up to date. You can review new incoming leads or enroll walk-ins.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {metrics.dueToday.slice(0, 6).map((inq) => {
                  const d = inq.follow_up_date || (Array.isArray(inq.counsellor_notes) && inq.counsellor_notes[inq.counsellor_notes.length - 1]?.followUpDate);
                  const isOverdue = Boolean(d && d < todayStr);
                  const waUrl = getWhatsAppLink(inq.phone, inq.name, inq.course_interest);
                  const telUrl = getTelLink(inq.phone);
                  const lastNote = Array.isArray(inq.counsellor_notes) && inq.counsellor_notes.length > 0
                    ? inq.counsellor_notes[inq.counsellor_notes.length - 1].note
                    : inq.message;

                  return (
                    <QueueItem key={inq.id} $isOverdue={isOverdue} $status={inq.status}>
                      <div className="left-details">
                        <div className="top-line">
                          <span className="name">{inq.name}</span>
                          {inq.course_interest && <span className="course-tag">{inq.course_interest}</span>}
                          <span className="status-pill">{inq.status}</span>
                        </div>
                        <div className="bottom-line">
                          <span className="phone">📞 {inq.phone}</span>
                          <span className="due-tag">
                            <FaCalendarAlt /> {isOverdue ? `Overdue (${d})` : `Due Today (${d})`}
                          </span>
                        </div>
                        {lastNote && <div className="note-snip">"{lastNote}"</div>}
                      </div>

                      <div className="actions">
                        {waUrl && (
                          <IconBtn
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            $bg="rgba(16, 185, 129, 0.2)"
                            $color="#34D399"
                            title="Chat on WhatsApp"
                          >
                            <FaWhatsapp />
                          </IconBtn>
                        )}
                        {telUrl && (
                          <IconBtn
                            href={telUrl}
                            $bg="rgba(56, 189, 248, 0.2)"
                            $color="#38BDF8"
                            title="Direct Phone Call"
                          >
                            <FaPhoneAlt />
                          </IconBtn>
                        )}
                        <MiniActionBtn
                          $variant="amber"
                          onClick={() => {
                            setStatusModalTarget(inq);
                            setStatusForm({ status: inq.status, note: '', followUpDate: inq.follow_up_date || '' });
                          }}
                        >
                          Log Call
                        </MiniActionBtn>
                        <MiniActionBtn
                          $variant="green"
                          onClick={() => navigate(`/staff/enroll?inquiryId=${inq.id}`)}
                        >
                          Enroll
                        </MiniActionBtn>
                      </div>
                    </QueueItem>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Card 2: Recent Incoming Leads */}
          <Card>
            <div className="card-header">
              <h3>
                <FaFire style={{ color: '#EF4444' }} />
                Recent Leads Stream
              </h3>
              <Link to="/staff/inquiries">Full Pipeline <FaArrowRight /></Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentLeads.map((inq) => {
                const waUrl = getWhatsAppLink(inq.phone, inq.name, inq.course_interest);
                return (
                  <div
                    key={inq.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: portalTheme.radii.sm,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{inq.name}</span>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#94A3B8' }}>
                          {inq.hear_about_us || 'Web Form'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#38BDF8' }}>
                        {inq.course_interest || 'General Inquiry'} • {inq.phone}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {waUrl && (
                        <IconBtn href={waUrl} target="_blank" rel="noopener noreferrer" $bg="rgba(16, 185, 129, 0.15)" $color="#34D399">
                          <FaWhatsapp />
                        </IconBtn>
                      )}
                      <MiniActionBtn
                        $variant="green"
                        onClick={() => navigate(`/staff/enroll?inquiryId=${inq.id}`)}
                      >
                        Enroll
                      </MiniActionBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Operational Shift, Daily Tasks, and Course Demand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 3: Shift Attendance & Hours */}
          <Card>
            <div className="card-header">
              <h3><FaClock style={{ color: '#60A5FA' }} /> Daily Shift & Attendance</h3>
              <Link to="/staff/time-tracker">Time Hub <FaArrowRight /></Link>
            </div>

            <ShiftStatusBox $color={shift?.status === 'on_duty' ? '#10B981' : (shift?.status === 'on_break' ? '#F59E0B' : '#9CA3AF')}>
              <div className="shift-info">
                <span className="status-text">
                  {shift?.status === 'on_duty' && '• Clocked In & On Duty'}
                  {shift?.status === 'on_break' && '• On Lunch / Break'}
                  {shift?.status === 'completed' && '✓ Shift Ended for Today'}
                  {!shift && 'Shift: Not Clocked In Yet'}
                </span>
                <span className="time-text">
                  {shift?.clock_in
                    ? `Clock-in: ${new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Punch in to start tracking your daily shift'}
                </span>
              </div>

              <div className="shift-buttons">
                {!shift && (
                  <MiniActionBtn $variant="green" onClick={() => handleShiftPunch('clock-in')}>
                    <FaSignInAlt /> Clock In
                  </MiniActionBtn>
                )}
                {shift && shift.status === 'on_duty' && (
                  <>
                    <MiniActionBtn $variant="amber" onClick={() => handleShiftPunch('break-start')}>
                      <FaCoffee /> Break
                    </MiniActionBtn>
                    <MiniActionBtn style={{ background: '#EF4444', color: '#fff' }} onClick={() => handleShiftPunch('clock-out')}>
                      <FaSignOutAlt /> Clock Out
                    </MiniActionBtn>
                  </>
                )}
                {shift && shift.status === 'on_break' && (
                  <>
                    <MiniActionBtn $variant="green" onClick={() => handleShiftPunch('break-end')}>
                      Resume
                    </MiniActionBtn>
                    <MiniActionBtn style={{ background: '#EF4444', color: '#fff' }} onClick={() => handleShiftPunch('clock-out')}>
                      Clock Out
                    </MiniActionBtn>
                  </>
                )}
              </div>
            </ShiftStatusBox>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.84rem', color: '#94A3B8' }}>Logged Task Work Today</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#34D399' }}>{formatHourDecimal(todaySeconds)}h</span>
            </div>
          </Card>

          {/* Card 4: Top In-Demand Courses */}
          <Card>
            <div className="card-header">
              <h3><FaFire style={{ color: '#F59E0B' }} /> Top Course Demand</h3>
              <Link to="/staff/courses">View Batches <FaArrowRight /></Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topCourses.length === 0 ? (
                <div style={{ color: portalTheme.colors.textMuted, fontSize: '0.84rem' }}>No course inquiries logged yet.</div>
              ) : (
                topCourses.map((c) => (
                  <CourseDemandBar key={c.title}>
                    <div className="bar-meta">
                      <span className="title">{c.title}</span>
                      <span className="count">{c.count} inquiries</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${c.percentage}%` }} />
                    </div>
                  </CourseDemandBar>
                ))
              )}
            </div>
          </Card>

          {/* Card 5: My Daily Assigned Tasks */}
          <Card>
            <div className="card-header">
              <h3><FaTasks style={{ color: '#38BDF8' }} /> My Assigned Tasks</h3>
              <Link to="/staff/tasks">Jira Board <FaArrowRight /></Link>
            </div>

            {myTasks.length === 0 ? (
              <div style={{ padding: '18px 0', textAlign: 'center', color: portalTheme.colors.textMuted, fontSize: '0.85rem' }}>
                <p style={{ margin: 0 }}>No active Jira tasks assigned to you right now.</p>
                <Link to="/staff/tasks" style={{ color: '#38BDF8', fontSize: '0.8rem', marginTop: '6px', display: 'inline-block' }}>
                  + Create task on Board
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myTasks.map((t) => {
                  const isRunning = Boolean(activeTimer && activeTimer.task_id === t.id);
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: portalTheme.radii.sm,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700 }}>
                          {t.task_key}
                        </span>
                        <span style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleTimer(t)}
                        style={{
                          background: isRunning ? '#EF4444' : '#10B981',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {isRunning ? <FaStop /> : <FaPlay />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </TwoColumnGrid>

      {/* ── MODAL 1: QUICK WALK-IN INQUIRY ── */}
      {walkInModalOpen && (
        <ModalOverlay onClick={() => setWalkInModalOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3><FaPlus style={{ color: '#F59E0B' }} /> Quick Walk-in Inquiry Intake</h3>
              <button onClick={() => setWalkInModalOpen(false)}><FaTimes /></button>
            </div>

            <form onSubmit={handleSaveWalkIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-grid-2">
                <div className="form-row">
                  <label>Candidate Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ali Raza"
                    value={walkInForm.name}
                    onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                  />
                  {walkInErrors.name && <span className="error-msg">{walkInErrors.name}</span>}
                </div>
                <div className="form-row">
                  <label>WhatsApp / Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0300-1234567"
                    value={walkInForm.phone}
                    onChange={(e) => setWalkInForm({ ...walkInForm, phone: formatPhone(e.target.value) })}
                  />
                  {walkInErrors.phone && <span className="error-msg">{walkInErrors.phone}</span>}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Course Interest</label>
                  <select
                    value={walkInForm.course}
                    onChange={(e) => setWalkInForm({ ...walkInForm, course: e.target.value })}
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.title}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Lead Source</label>
                  <select
                    value={walkInForm.source}
                    onChange={(e) => setWalkInForm({ ...walkInForm, source: e.target.value })}
                  >
                    <option value="Walk-in">Campus Walk-in</option>
                    <option value="Phone Call">Direct Phone Call</option>
                    <option value="WhatsApp">WhatsApp Inquiry</option>
                    <option value="Social Media">Social Media (Meta/Insta)</option>
                    <option value="Friend/Referral">Friend / Student Referral</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-row">
                  <label>Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={walkInForm.email}
                    onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={walkInForm.followUpDate}
                    onChange={(e) => setWalkInForm({ ...walkInForm, followUpDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Discussion Notes & Background</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Inquired about evening batch, interested in discount, promised to visit on Saturday."
                  value={walkInForm.note}
                  onChange={(e) => setWalkInForm({ ...walkInForm, note: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <MiniActionBtn type="button" onClick={() => setWalkInModalOpen(false)}>
                  Cancel
                </MiniActionBtn>
                <PrimaryBtn type="submit">
                  Save Walk-in Lead
                </PrimaryBtn>
              </div>
            </form>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* ── MODAL 2: LOG CALL & RESCHEDULE FOLLOW-UP ── */}
      {statusModalTarget && (
        <ModalOverlay onClick={() => setStatusModalTarget(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <FaPhoneAlt style={{ color: '#F59E0B' }} />
                Log Interaction & Follow-Up for {statusModalTarget.name}
              </h3>
              <button onClick={() => setStatusModalTarget(null)}><FaTimes /></button>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-grid-2">
                <div className="form-row">
                  <label>Update Lead Stage</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  >
                    <option value="new">New (Uncontacted)</option>
                    <option value="contacted">Contacted / In Discussion</option>
                    <option value="follow_up">Scheduled Callback / Follow-Up</option>
                    <option value="enrolled">Mark Enrolled</option>
                    <option value="lost">Lost / Not Interested</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Reschedule Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={statusForm.followUpDate}
                    onChange={(e) => setStatusForm({ ...statusForm, followUpDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Interaction Note / Outcome</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Spoke to student. They requested 10% fee concession and will confirm by Friday."
                  value={statusForm.note}
                  onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <MiniActionBtn type="button" onClick={() => setStatusModalTarget(null)}>
                  Cancel
                </MiniActionBtn>
                <PrimaryBtn type="submit">
                  Save Interaction
                </PrimaryBtn>
              </div>
            </form>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
}
