import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { getAssignedTeacherBatches, getTeacherByCnic } from '../utils/teacherUtils';
import DatePicker from '../components/DatePicker';
import { 
  FaBookOpen, FaCheckCircle, FaClock, FaCalendarAlt,
  FaChalkboardTeacher, FaEdit, FaVideo, FaFileAlt,
  FaTasks, FaTimes, FaSave, FaExternalLinkAlt, FaInfoCircle
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  color: #fff;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  h1 {
    margin: 0 0 6px;
    font-size: 1.8rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  p {
    margin: 0;
    color: #94a3b8;
    font-size: 0.9rem;
  }
`;

const ControlsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 20px;
`;

const BatchSelectWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  label {
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #888;
    letter-spacing: 0.4px;
  }

  select {
    background: #181b22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 9px 14px;
    border-radius: 9px;
    font-size: 0.92rem;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #7B1F2E;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  small {
    color: #888;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  strong {
    font-size: 1.6rem;
    font-weight: 800;
    color: #fff;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  margin-top: 4px;
  overflow: hidden;

  div {
    height: 100%;
    background: ${props => props.$color || '#10b981'};
    width: ${props => props.$progress}%;
    border-radius: 4px;
    transition: width 0.6s ease;
  }
`;

const ModuleCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 20px;
`;

const ModuleHeader = styled.div`
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  .left {
    display: flex;
    align-items: center;
    gap: 12px;

    .badge {
      background: rgba(123, 31, 46, 0.3);
      color: #ff4d6d;
      border: 1px solid rgba(123, 31, 46, 0.5);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9rem;
    }

    h3 {
      margin: 0 0 4px;
      font-size: 1.1rem;
      color: #fff;
    }
    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.82rem;
    }
  }
`;

const LectureList = styled.div`
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LectureRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  gap: 16px;
  flex-wrap: wrap;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }
`;

const LectureInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .idx {
    font-size: 0.85rem;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.35);
    min-width: 24px;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .name {
      color: #fff;
      font-size: 0.94rem;
      font-weight: 600;
    }

    .sub {
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
`;

const StatusPill = styled.button`
  border: none;
  cursor: pointer;
  padding: 5px 12px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  ${({ $status }) => {
    switch ($status) {
      case 'Completed':
        return 'background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.4);';
      case 'In Progress':
        return 'background: rgba(55, 138, 221, 0.2); color: #378ADD; border: 1px solid rgba(55, 138, 221, 0.4);';
      default:
        return 'background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.5); border: 1px solid rgba(255, 255, 255, 0.1);';
    }
  }}

  &:hover {
    filter: brightness(1.2);
  }
`;

const ActionBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &.primary {
    background: #7B1F2E;
    border-color: #9c273a;
    &:hover { background: #9c273a; }
  }
`;

// Modal
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111318;
  width: 100%;
  max-width: 560px;
  border-radius: 16px;
  border: 1px solid rgba(123, 31, 46, 0.4);
  padding: 26px;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  max-height: 90vh;
  overflow-y: auto;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
  }

  input, select, textarea {
    padding: 10px 14px;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #fff;
    outline: none;
    font-size: 0.9rem;

    &:focus {
      border-color: #7B1F2E;
    }
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }
`;

const getCourseCurriculum = (courseName) => {
  const norm = (courseName || '').toLowerCase();

  if (norm.includes('react') || norm.includes('web') || norm.includes('full stack')) {
    return [
      {
        phase: 1,
        title: "Module 1: Modern JavaScript & Frontend Architecture",
        desc: "ES6+ fundamentals, DOM manipulation, asynchronous programming, and clean modular code.",
        lectures: [
          { id: 'L1', title: "Web Architecture, Git & Modern Development Workflow", duration: "1h 45m" },
          { id: 'L2', title: "Modern JavaScript (ES6+), Closures & Promises", duration: "2h 00m" },
          { id: 'L3', title: "Async/Await, RESTful API Fetching & Error Handling", duration: "1h 50m" },
          { id: 'L4', title: "CSS Flexbox, CSS Grid & Responsive Layout Engineering", duration: "2h 15m" }
        ]
      },
      {
        phase: 2,
        title: "Module 2: React.js Component Architecture & State Hooks",
        desc: "JSX composition, component lifecycle, useState, useEffect, and custom hooks.",
        lectures: [
          { id: 'L5', title: "React Component Hierarchy, Props & JSX Composition", duration: "2h 10m" },
          { id: 'L6', title: "State Management with useState & Side Effects with useEffect", duration: "2h 20m" },
          { id: 'L7', title: "React Router, Dynamic Sub-routing & Protected Portals", duration: "1h 55m" },
          { id: 'L8', title: "Forms, Validation & User Event Handling in React", duration: "2h 05m" }
        ]
      },
      {
        phase: 3,
        title: "Module 3: Advanced APIs, State Management & Persistence",
        desc: "Context API, Zustand/Redux, Supabase/PostgreSQL integration, and authentication.",
        lectures: [
          { id: 'L9', title: "Global State Management with Context API & Zustand", duration: "2h 15m" },
          { id: 'L10', title: "Backend as a Service: Supabase Auth & Database Tables", duration: "2h 30m" },
          { id: 'L11', title: "Real-time Subscriptions, Websockets & Role-based Access", duration: "2h 00m" },
          { id: 'L12', title: "Optimistic UI, Caching & Network Error Resiliency", duration: "1h 45m" }
        ]
      },
      {
        phase: 4,
        title: "Module 4: Production Deployment & Capstone Portfolio",
        desc: "Next.js SSR/SSG, Vercel deployment, CI/CD, and freelance client project delivery.",
        lectures: [
          { id: 'L13', title: "Next.js Pages & App Router, SSR, SSG & Hybrid Rendering", duration: "2h 20m" },
          { id: 'L14', title: "API Route Handlers, Environment Variables & Security Guards", duration: "2h 00m" },
          { id: 'L15', title: "Production Build Optimization, Lighthouse Audits & CWV", duration: "1h 50m" },
          { id: 'L16', title: "Capstone Defense, Freelance Pricing & Upwork Readiness", duration: "2h 30m" }
        ]
      }
    ];
  } else if (norm.includes('laravel') || norm.includes('php')) {
    return [
      {
        phase: 1,
        title: "Module 1: PHP 8.2 Foundations & Object-Oriented Programming",
        desc: "PHP syntax, classes, inheritance, namespaces, Composer, and MySQL essentials.",
        lectures: [
          { id: 'L1', title: "PHP 8.2 Syntax, Types, Functions & Control Structures", duration: "1h 45m" },
          { id: 'L2', title: "Object-Oriented PHP: Classes, Inheritance & Polymorphism", duration: "2h 00m" },
          { id: 'L3', title: "Relational Database Design with MySQL & Normalization", duration: "2h 15m" },
          { id: 'L4', title: "Composer Dependency Management & PSR Standards", duration: "1h 30m" }
        ]
      },
      {
        phase: 2,
        title: "Module 2: Laravel MVC Architecture & Eloquent ORM",
        desc: "Routing, controllers, Blade templates, migrations, and Eloquent model relationships.",
        lectures: [
          { id: 'L5', title: "Laravel Setup, Directory Structure & Artisan CLI", duration: "1h 45m" },
          { id: 'L6', title: "Routing, Controllers, Middleware & Request Lifecycle", duration: "2h 10m" },
          { id: 'L7', title: "Database Migrations, Seeders & Eloquent Relationships", duration: "2h 20m" },
          { id: 'L8', title: "Blade Template Inheritance, Components & Asset Pipeline", duration: "1h 50m" }
        ]
      },
      {
        phase: 3,
        title: "Module 3: RESTful APIs, Sanctum Authentication & Security",
        desc: "API resources, token authentication with Laravel Sanctum, validation, and email queues.",
        lectures: [
          { id: 'L9', title: "RESTful API Design, JSON Resources & Form Requests", duration: "2h 00m" },
          { id: 'L10', title: "Token Authentication with Laravel Sanctum & Role Guards", duration: "2h 15m" },
          { id: 'L11', title: "Background Queues, Jobs, Notifications & Mailables", duration: "1h 55m" },
          { id: 'L12', title: "Security Best Practices: CSRF, SQL Injection & Rate Limiting", duration: "1h 45m" }
        ]
      },
      {
        phase: 4,
        title: "Module 4: Linux VPS Deployment, Nginx & Capstone Project",
        desc: "Configuring Ubuntu VPS, Nginx reverse proxy, SSL certs, and portfolio capstone.",
        lectures: [
          { id: 'L13', title: "Ubuntu Server Setup, SSH, Nginx & PHP-FPM Configuration", duration: "2h 15m" },
          { id: 'L14', title: "Let's Encrypt SSL, Cron Scheduled Tasks & Supervisors", duration: "1h 45m" },
          { id: 'L15', title: "Comprehensive Capstone Project Architecture & Defense", duration: "2h 30m" },
          { id: 'L16', title: "Freelance Client Handoff, Staging & Post-Launch Support", duration: "2h 00m" }
        ]
      }
    ];
  } else {
    return [
      {
        phase: 1,
        title: "Module 1: Professional Foundations & Design Principles",
        desc: "Core concepts, design theory, typography, tool setups, and modern creative workflows.",
        lectures: [
          { id: 'L1', title: "Foundations, Principles of Design & Visual Hierarchy", duration: "1h 45m" },
          { id: 'L2', title: "Typography, Color Psychology & Layout Fundamentals", duration: "2h 00m" },
          { id: 'L3', title: "Essential Tooling, Workspaces & Industry Best Practices", duration: "2h 15m" },
          { id: 'L4', title: "Asset Management, File Formats & Print vs Digital Standards", duration: "1h 30m" }
        ]
      },
      {
        phase: 2,
        title: "Module 2: Practical Projects & Core Implementation",
        desc: "Hands-on projects, client brief analysis, and structural composition.",
        lectures: [
          { id: 'L5', title: "Client Brief Decoding & Moodboarding Frameworks", duration: "1h 45m" },
          { id: 'L6', title: "Composition, Vector Drafting & Core Project Architecture", duration: "2h 10m" },
          { id: 'L7', title: "Asset Creation, Responsive Variations & Reusability", duration: "2h 00m" },
          { id: 'L8', title: "Iteration Cycles, Feedback Revisions & Quality Control", duration: "1h 50m" }
        ]
      },
      {
        phase: 3,
        title: "Module 3: Advanced Techniques & Client Delivery",
        desc: "Advanced tool mastery, animation/interaction, and client branding guidelines.",
        lectures: [
          { id: 'L9', title: "Advanced Stylings, Grid Systems & Brand Guideline Kits", duration: "2h 00m" },
          { id: 'L10', title: "Interactive Prototypes & Client Demonstration Standards", duration: "2h 15m" },
          { id: 'L11', title: "Optimization for Performance, Speed & SEO Visibility", duration: "1h 45m" },
          { id: 'L12', title: "Client Delivery Packages, Licensing & Source Handover", duration: "1h 50m" }
        ]
      },
      {
        phase: 4,
        title: "Module 4: Capstone Portfolio, Freelancing & Career Launch",
        desc: "Showcase portfolio creation, Behance/Upwork profile optimization, and client pitching.",
        lectures: [
          { id: 'L13', title: "Portfolio Presentation: Case Studies that Convert Clients", duration: "2h 15m" },
          { id: 'L14', title: "Freelance Marketplace Strategy: Upwork, Fiverr & LinkedIn", duration: "2h 00m" },
          { id: 'L15', title: "Proposal Writing, Contract Negotiation & Milestone Billing", duration: "1h 45m" },
          { id: 'L16', title: "Final Capstone Presentation & Institutional Certification", duration: "2h 30m" }
        ]
      }
    ];
  }
};

export default function TeacherSyllabus() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Syllabus progress state
  const [completedLectures, setCompletedLectures] = useState([]); // ['L1', 'L2']
  const [lectureLogs, setLectureLogs] = useState({}); // { L1: { date, method, topics, homework, replay_url } }
  
  // Logging modal state
  const [activeLogLecture, setActiveLogLecture] = useState(null);
  const [logFormData, setLogFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    method: 'Campus Lecture',
    topics: '',
    homework: '',
    replay_url: ''
  });

  // 1. Fetch Teacher's assigned batches
  useEffect(() => {
    if (!user?.cnic) return;
    const fetchBatches = async () => {
      setLoading(true);
      try {
        const t = await getTeacherByCnic(user.cnic);
        if (t?.id) {
          const assigned = await getAssignedTeacherBatches(t.id);
          setBatches(assigned);
          if (assigned.length > 0) {
            setSelectedBatch(assigned[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching batches:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, [user]);

  // 2. Fetch Syllabus progress for selected batch
  const loadBatchSyllabus = useCallback(async (batch) => {
    if (!batch?.id) return;
    try {
      // Try local storage first for instant load
      const cached = localStorage.getItem(`deepskills_syllabus_${batch.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setCompletedLectures(parsed.completed_lectures || []);
          setLectureLogs(parsed.lecture_logs || {});
        } catch {}
      }

      // Check batch notes from Supabase directly
      const { data: bData } = await supabase
        .from('batches')
        .select('notes')
        .eq('id', batch.id)
        .maybeSingle();

      if (bData?.notes) {
        try {
          const parsedNotes = JSON.parse(bData.notes);
          if (parsedNotes.syllabus_progress) {
            setCompletedLectures(parsedNotes.syllabus_progress.completed_lectures || []);
            setLectureLogs(parsedNotes.syllabus_progress.lecture_logs || {});
            localStorage.setItem(`deepskills_syllabus_${batch.id}`, JSON.stringify(parsedNotes.syllabus_progress));
          }
        } catch {
          // Plain text notes
        }
      }
    } catch (err) {
      console.error("Error loading batch syllabus:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      loadBatchSyllabus(selectedBatch);
    }
  }, [selectedBatch, loadBatchSyllabus]);

  const curriculum = useMemo(() => {
    return getCourseCurriculum(selectedBatch?.course);
  }, [selectedBatch]);

  const allLectures = useMemo(() => curriculum.flatMap(m => m.lectures), [curriculum]);
  const progressPercent = Math.round((completedLectures.length / Math.max(allLectures.length, 1)) * 100);

  // 3. Save progress
  const saveProgress = async (newCompleted, newLogs) => {
    if (!selectedBatch?.id) return;
    setSaving(true);
    try {
      const payload = {
        completed_lectures: newCompleted,
        lecture_logs: newLogs,
        updated_at: new Date().toISOString(),
        updated_by: user?.name || 'Teacher'
      };

      // Save to localStorage immediately
      localStorage.setItem(`deepskills_syllabus_${selectedBatch.id}`, JSON.stringify(payload));

      // Attempt to save to batch notes in DB
      const { data: bData } = await supabase
        .from('batches')
        .select('notes')
        .eq('id', selectedBatch.id)
        .maybeSingle();

      let notesObj = {};
      if (bData?.notes) {
        try {
          notesObj = JSON.parse(bData.notes);
        } catch {
          notesObj = { text_notes: bData.notes };
        }
      }
      notesObj.syllabus_progress = payload;

      await supabase
        .from('batches')
        .update({ notes: JSON.stringify(notesObj) })
        .eq('id', selectedBatch.id);

      toast.success("Syllabus progress updated successfully!");
    } catch (err) {
      console.warn("Could not save to remote batch notes, cached locally:", err);
      toast.success("Progress saved locally!");
    } finally {
      setSaving(false);
    }
  };

  // Toggle single lecture completed
  const toggleLectureStatus = (lecId) => {
    let nextCompleted;
    if (completedLectures.includes(lecId)) {
      nextCompleted = completedLectures.filter(id => id !== lecId);
    } else {
      nextCompleted = [...completedLectures, lecId];
    }
    setCompletedLectures(nextCompleted);
    saveProgress(nextCompleted, lectureLogs);
  };

  // Open Log Modal
  const handleOpenLogModal = (lec) => {
    setActiveLogLecture(lec);
    const existingLog = lectureLogs[lec.id] || {};
    setLogFormData({
      date: existingLog.date || new Date().toISOString().split('T')[0],
      method: existingLog.method || 'Campus Lecture',
      topics: existingLog.topics || '',
      homework: existingLog.homework || '',
      replay_url: existingLog.replay_url || ''
    });
  };

  const handleSaveLog = (e) => {
    e.preventDefault();
    if (!activeLogLecture) return;

    const updatedLogs = {
      ...lectureLogs,
      [activeLogLecture.id]: {
        ...logFormData,
        lecture_title: activeLogLecture.title,
        logged_at: new Date().toISOString()
      }
    };

    // Auto-mark as completed when delivery log is saved
    const updatedCompleted = completedLectures.includes(activeLogLecture.id)
      ? completedLectures
      : [...completedLectures, activeLogLecture.id];

    setLectureLogs(updatedLogs);
    setCompletedLectures(updatedCompleted);
    saveProgress(updatedCompleted, updatedLogs);
    setActiveLogLecture(null);
  };

  return (
    <DashboardLayout>
      <Container>
        <Header>
          <div>
            <h1><FaBookOpen /> Syllabus Progress Tracker</h1>
            <p>Log lecture delivery, record covered topics, assign homework, and share video replays with students.</p>
          </div>
        </Header>

        <ControlsBar>
          <BatchSelectWrap>
            <label>Assigned Batch Cohort</label>
            <select
              value={selectedBatch?.id || ''}
              onChange={(e) => {
                const b = batches.find(item => item.id === e.target.value);
                if (b) setSelectedBatch(b);
              }}
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} — {b.course} {b.time_shift ? `(${b.time_shift})` : ''}
                </option>
              ))}
            </select>
          </BatchSelectWrap>

          <div style={{ display: 'flex', gap: '8px' }}>
            <ActionBtn 
              onClick={() => {
                const text = `Syllabus Report for ${selectedBatch?.batch_name || 'Batch'}:\nCompleted: ${completedLectures.length} of ${allLectures.length} Lectures (${progressPercent}%)\nLogged By: ${user?.name || 'Teacher'}`;
                navigator.clipboard.writeText(text);
                toast.success("Syllabus report copied to clipboard!");
              }}
            >
              <FaFileAlt /> Copy Summary
            </ActionBtn>
          </div>
        </ControlsBar>

        {/* Telemetry Stats */}
        <StatsGrid>
          <StatCard>
            <small><FaBookOpen color="#4da6ff" /> Syllabus Completion</small>
            <strong>{progressPercent}%</strong>
            <ProgressBar $progress={progressPercent} $color="#4da6ff"><div></div></ProgressBar>
          </StatCard>

          <StatCard>
            <small><FaCheckCircle color="#10b981" /> Lectures Delivered</small>
            <strong>{completedLectures.length} / {allLectures.length}</strong>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
              {allLectures.length - completedLectures.length} lectures remaining
            </div>
          </StatCard>

          <StatCard>
            <small><FaChalkboardTeacher color="#ff4d6d" /> Active Module</small>
            <strong style={{ fontSize: '1.25rem' }}>
              {progressPercent < 25 ? 'Module 1: Foundations' :
               progressPercent < 50 ? 'Module 2: Core Architecture' :
               progressPercent < 75 ? 'Module 3: Advanced APIs' :
               'Module 4: Deployment & Portfolio'}
            </strong>
          </StatCard>
        </StatsGrid>

        {/* Curriculum Phases */}
        <div>
          {curriculum.map((module) => {
            const moduleDone = module.lectures.every(l => completedLectures.includes(l.id));
            const completedInModule = module.lectures.filter(l => completedLectures.includes(l.id)).length;
            const modulePercent = Math.round((completedInModule / module.lectures.length) * 100);

            return (
              <ModuleCard key={module.phase}>
                <ModuleHeader>
                  <div className="left">
                    <div className="badge">0{module.phase}</div>
                    <div>
                      <h3>{module.title}</h3>
                      <p>{module.desc}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', color: moduleDone ? '#10b981' : 'rgba(255,255,255,0.6)' }}>
                        {modulePercent}% Complete ({completedInModule}/{module.lectures.length})
                      </span>
                      <ProgressBar $progress={modulePercent} style={{ width: '90px', marginTop: '4px' }}>
                        <div></div>
                      </ProgressBar>
                    </div>
                  </div>
                </ModuleHeader>

                <LectureList>
                  {module.lectures.map((lec, idx) => {
                    const isDone = completedLectures.includes(lec.id);
                    const log = lectureLogs[lec.id];

                    return (
                      <LectureRow key={lec.id}>
                        <LectureInfo>
                          <div className="idx">{(module.phase - 1) * 4 + idx + 1}.</div>
                          <div className="meta">
                            <div className="name" style={{ color: isDone ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                              {lec.title}
                            </div>
                            <div className="sub">
                              <span><FaClock size={10} /> {lec.duration}</span>
                              {log?.date && (
                                <span style={{ color: '#10b981' }}>
                                  <FaCalendarAlt size={10} /> Delivered on {log.date}
                                </span>
                              )}
                              {log?.method && (
                                <span>&bull; {log.method}</span>
                              )}
                              {log?.replay_url && (
                                <a 
                                  href={log.replay_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ color: '#4da6ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <FaVideo size={10} /> Stream Linked
                                </a>
                              )}
                            </div>
                          </div>
                        </LectureInfo>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <StatusPill 
                            $status={isDone ? 'Completed' : 'Upcoming'}
                            onClick={() => toggleLectureStatus(lec.id)}
                            title="Click to toggle completion status"
                          >
                            <FaCheckCircle size={11} /> {isDone ? 'Delivered' : 'Pending'}
                          </StatusPill>

                          <ActionBtn 
                            onClick={() => handleOpenLogModal(lec)}
                            className={log ? '' : 'primary'}
                          >
                            <FaEdit size={11} /> {log ? 'Edit Log' : 'Log Delivery'}
                          </ActionBtn>
                        </div>
                      </LectureRow>
                    );
                  })}
                </LectureList>
              </ModuleCard>
            );
          })}
        </div>

      </Container>

      {/* Log Lecture Delivery Modal */}
      <AnimatePresence>
        {activeLogLecture && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLogLecture(null)}
          >
            <ModalContent
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Log Lecture Delivery</h3>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {activeLogLecture.title}
                  </div>
                </div>
                <FaTimes 
                  style={{ cursor: 'pointer', opacity: 0.6, color: '#fff' }} 
                  size={18}
                  onClick={() => setActiveLogLecture(null)} 
                />
              </div>

              <form onSubmit={handleSaveLog}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <FormGroup>
                    <label>Execution Date *</label>
                    <DatePicker 
                      required
                      value={logFormData.date}
                      onChange={e => setLogFormData({...logFormData, date: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                      aria-label="Delivery Date"
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Delivery Format</label>
                    <select
                      value={logFormData.method}
                      onChange={e => setLogFormData({...logFormData, method: e.target.value})}
                    >
                      <option value="Campus Lecture">Campus Lecture (Lab)</option>
                      <option value="Online Live Stream">Online Live Stream (Zoom/Meet)</option>
                      <option value="Hybrid Session">Hybrid Lab Session</option>
                      <option value="Workshop & Code Review">Workshop & Code Review</option>
                    </select>
                  </FormGroup>
                </div>

                <FormGroup>
                  <label>Topics & Key Concepts Covered</label>
                  <textarea 
                    placeholder="e.g. Explained React state lifecycle, implemented useState form handlers, demonstrated error boundaries..."
                    value={logFormData.topics}
                    onChange={e => setLogFormData({...logFormData, topics: e.target.value})}
                  />
                </FormGroup>

                <FormGroup>
                  <label>Homework / Lab Exercise Assigned</label>
                  <input 
                    placeholder="e.g. Build an interactive counter with step multiplier"
                    value={logFormData.homework}
                    onChange={e => setLogFormData({...logFormData, homework: e.target.value})}
                  />
                </FormGroup>

                <FormGroup>
                  <label>Class Recording / Replay URL (Optional)</label>
                  <input 
                    type="url"
                    placeholder="e.g. https://youtu.be/... or Google Drive recording link"
                    value={logFormData.replay_url}
                    onChange={e => setLogFormData({...logFormData, replay_url: e.target.value})}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)' }}>
                    If provided, students can watch this replay in their Student Progress portal.
                  </span>
                </FormGroup>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <ActionBtn 
                    type="submit" 
                    className="primary" 
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                    disabled={saving}
                  >
                    <FaSave /> {saving ? 'Saving...' : 'Save Lecture Delivery Log'}
                  </ActionBtn>
                  <ActionBtn 
                    type="button"
                    onClick={() => setActiveLogLecture(null)}
                    style={{ padding: '12px 18px' }}
                  >
                    Cancel
                  </ActionBtn>
                </div>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
