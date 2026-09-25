import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { supabase } from '../supabaseClient';
import { 
  FaTasks, FaExclamationCircle, 
  FaChartLine, FaGraduationCap, FaChevronDown, FaChevronUp, 
  FaLock, FaBookOpen, FaPlayCircle, FaFileDownload, 
  FaCheckCircle, FaClock, FaChalkboardTeacher, FaCalendarAlt,
  FaExternalLinkAlt, FaTimes, FaVideo
} from 'react-icons/fa';
import Link from 'next/link';

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 50px;
  display: flex;
  flex-direction: column;
  gap: 25px;
`;

const ViewToggleBar = styled.div`
  display: flex;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 6px;
  gap: 8px;
  width: fit-content;
  margin: 0 auto 10px auto;

  @media (max-width: 600px) {
    width: 100%;
  }
`;

const ViewToggleBtn = styled.button`
  background: ${props => props.$active ? '#7B1F2E' : 'transparent'};
  color: ${props => props.$active ? '#fff' : 'rgba(255, 255, 255, 0.65)'};
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.05)'};
  }

  @media (max-width: 600px) {
    flex: 1;
    justify-content: center;
    font-size: 0.85rem;
    padding: 8px 12px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
`;

const StatCard = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.82rem;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatValue = styled.div`
  color: #fff;
  font-size: 1.85rem;
  font-weight: bold;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  margin-top: 10px;
  overflow: hidden;
`;

const ProgressBarFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.$color || '#4caf50'};
  border-radius: 4px;
`;

const Card = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  padding: 26px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h2`
  color: #fff;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.35rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

// Course Overview Banner
const ProgramHero = styled.div`
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.25) 0%, rgba(15, 15, 20, 0.95) 100%);
  border: 1px solid rgba(123, 31, 46, 0.4);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
`;

const ProgramDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  h3 {
    margin: 0;
    color: #fff;
    font-size: 1.4rem;
  }
  
  .meta-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    color: rgba(255,255,255,0.7);
    font-size: 0.88rem;
    margin-top: 4px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }
`;

// Modules & Lectures List
const ModuleCard = styled.div`
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 18px;
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.16);
  }
`;

const ModuleHeader = styled.div`
  padding: 18px 22px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  border-bottom: ${props => props.$isOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'};

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const ModuleTitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .phase-num {
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

  .text {
    h4 {
      margin: 0 0 4px 0;
      color: #fff;
      font-size: 1.05rem;
    }
    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.55);
      font-size: 0.82rem;
    }
  }
`;

const LectureList = styled.div`
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LectureRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  gap: 15px;
  flex-wrap: wrap;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const LectureInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .index {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.85rem;
    font-weight: 600;
    min-width: 24px;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .name {
      color: #fff;
      font-size: 0.92rem;
      font-weight: 500;
    }

    .duration {
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`;

const StatusPill = styled.span`
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;

  ${({ $status }) => {
    switch($status) {
      case 'Completed': return 'background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);';
      case 'In Progress': return 'background: rgba(55, 138, 221, 0.15); color: #378ADD; border: 1px solid rgba(55, 138, 221, 0.3);';
      case 'Upcoming': return 'background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.5); border: 1px solid rgba(255, 255, 255, 0.1);';
      default: return 'background: #222; color: #aaa;';
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionBtn = styled.button`
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &.primary {
    background: #7B1F2E;
    border-color: #9c273a;
    &:hover { background: #9c273a; }
  }
`;

// --- Roadmap Styles (Gamified Snake Road) ---
const RoadmapContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 30px 0;
  overflow-x: hidden;
`;

const RowWrapper = styled.div`
  display: flex;
  flex-direction: ${props => props.reverse ? 'row-reverse' : 'row'};
  align-items: center;
  width: 100%;
  max-width: 800px;
  position: relative;
`;

const RoadLine = styled.div`
  flex: 1;
  height: 12px;
  background: ${props => props.completed ? '#2e7d32' : '#333'};
  transition: background 0.5s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 5px;
    left: 0;
    right: 0;
    height: 2px;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 10px,
      rgba(255,255,255,0.5) 10px,
      rgba(255,255,255,0.5) 20px
    );
  }
`;

const UTurn = styled.div`
  width: 60px;
  height: 100px;
  position: absolute;
  top: 50%;
  ${props => props.right ? 'right: -30px;' : 'left: -30px;'}
  border: 12px solid ${props => props.completed ? '#2e7d32' : '#333'};
  border-top: none;
  border-bottom: none;
  border-${props => props.right ? 'left' : 'right'}: none;
  border-radius: ${props => props.right ? '0 50px 50px 0' : '50px 0 0 50px'};
  z-index: 1;
  transition: border-color 0.5s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: -6px; bottom: -6px; ${props => props.right ? 'right: -6px; left: 0;' : 'left: -6px; right: 0;'}
    border: 2px dashed rgba(255,255,255,0.5);
    border-${props => props.right ? 'left' : 'right'}: none;
    border-radius: ${props => props.right ? '0 50px 50px 0' : '50px 0 0 50px'};
  }
`;

const TaskDotWrapper = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  padding: 10px 0;
  
  &:hover .tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

const TaskDot = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.completed ? '#4caf50' : '#444'};
  border: 3px solid #111;
  box-shadow: 0 0 0 2px ${props => props.completed ? '#4caf50' : '#444'};
  transition: all 0.3s ease;
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const Car = styled(motion.div)`
  position: absolute;
  top: -35px;
  font-size: 28px;
  animation: ${bounce} 1s ease-in-out infinite;
  z-index: 10;
  pointer-events: none;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  background: #fff;
  color: #000;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 20;
  pointer-events: none;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: #fff transparent transparent transparent;
  }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(77, 166, 255, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(77, 166, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(77, 166, 255, 0); }
`;

const CheckpointMarker = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-size: 1.2rem;
  z-index: 5;
  background: ${props => props.state === 'done' ? '#4caf50' : props.state === 'active' ? '#4da6ff' : '#444'};
  border: 4px solid #111;
  position: relative;

  ${props => props.state === 'active' && css`
    animation: ${pulse} 2s infinite;
  `}

  .trophy {
    position: absolute;
    top: -25px;
    font-size: 1.5rem;
  }
  
  .lock {
    font-size: 1rem;
    opacity: 0.6;
  }
`;

const CheckpointLabel = styled.div`
  position: absolute;
  top: 50px;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${props => props.state === 'done' ? '#4caf50' : props.state === 'active' ? '#4da6ff' : '#666'};
`;

// Table Styles
const ExpandBtn = styled.button`
  background: transparent;
  color: #4da6ff;
  border: 1px solid #4da6ff;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: #4da6ff;
    color: #000;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  th {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.88rem;
  }
  
  td {
    color: #ccc;
    font-size: 0.92rem;
  }
`;

// Video Replay Modal
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #121212;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  
  h3 { margin: 0; color: #fff; font-size: 1.15rem; }
`;

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// Dynamic Curriculum Generator based on enrolled program
const getCourseCurriculum = (courseName) => {
  const norm = (courseName || '').toLowerCase();

  if (norm.includes('react') || norm.includes('web') || norm.includes('full stack')) {
    return [
      {
        phase: 1,
        title: "Module 1: Modern JavaScript & Frontend Architecture",
        desc: "ES6+ fundamentals, DOM manipulation, asynchronous programming, and clean modular code.",
        lectures: [
          { id: 'L1', title: "Web Architecture, Git & Modern Development Workflow", duration: "1h 45m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L2', title: "Modern JavaScript (ES6+), Closures & Promises", duration: "2h 00m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L3', title: "Async/Await, RESTful API Fetching & Error Handling", duration: "1h 50m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L4', title: "CSS Flexbox, CSS Grid & Responsive Layout Engineering", duration: "2h 15m", status: "Completed", slides: "#", replayAvailable: true }
        ]
      },
      {
        phase: 2,
        title: "Module 2: React.js Component Architecture & State Hooks",
        desc: "JSX composition, component lifecycle, useState, useEffect, and custom hooks.",
        lectures: [
          { id: 'L5', title: "React Component Hierarchy, Props & JSX Composition", duration: "2h 10m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L6', title: "State Management with useState & Side Effects with useEffect", duration: "2h 20m", status: "In Progress", slides: "#", replayAvailable: true },
          { id: 'L7', title: "React Router, Dynamic Sub-routing & Protected Portals", duration: "1h 55m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L8', title: "Forms, Validation & User Event Handling in React", duration: "2h 05m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      },
      {
        phase: 3,
        title: "Module 3: Advanced APIs, State Management & Persistence",
        desc: "Context API, Zustand/Redux, Supabase/PostgreSQL integration, and authentication.",
        lectures: [
          { id: 'L9', title: "Global State Management with Context API & Zustand", duration: "2h 15m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L10', title: "Backend as a Service: Supabase Auth & Database Tables", duration: "2h 30m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L11', title: "Real-time Subscriptions, Websockets & Role-based Access", duration: "2h 00m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L12', title: "Optimistic UI, Caching & Network Error Resiliency", duration: "1h 45m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      },
      {
        phase: 4,
        title: "Module 4: Production Deployment & Capstone Portfolio",
        desc: "Next.js SSR/SSG, Vercel deployment, CI/CD, and freelance client project delivery.",
        lectures: [
          { id: 'L13', title: "Next.js Pages & App Router, SSR, SSG & Hybrid Rendering", duration: "2h 20m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L14', title: "API Route Handlers, Environment Variables & Security Guards", duration: "2h 00m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L15', title: "Production Build Optimization, Lighthouse Audits & CWV", duration: "1h 50m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L16', title: "Capstone Defense, Freelance Pricing & Upwork Readiness", duration: "2h 30m", status: "Upcoming", slides: "#", replayAvailable: false }
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
          { id: 'L1', title: "PHP 8.2 Syntax, Types, Functions & Control Structures", duration: "1h 45m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L2', title: "Object-Oriented PHP: Classes, Inheritance & Polymorphism", duration: "2h 00m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L3', title: "Relational Database Design with MySQL & Normalization", duration: "2h 15m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L4', title: "Composer Dependency Management & PSR Standards", duration: "1h 30m", status: "Completed", slides: "#", replayAvailable: true }
        ]
      },
      {
        phase: 2,
        title: "Module 2: Laravel MVC Architecture & Eloquent ORM",
        desc: "Routing, controllers, Blade templates, migrations, and Eloquent model relationships.",
        lectures: [
          { id: 'L5', title: "Laravel Setup, Directory Structure & Artisan CLI", duration: "1h 45m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L6', title: "Routing, Controllers, Middleware & Request Lifecycle", duration: "2h 10m", status: "In Progress", slides: "#", replayAvailable: true },
          { id: 'L7', title: "Database Migrations, Seeders & Eloquent Relationships", duration: "2h 20m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L8', title: "Blade Template Inheritance, Components & Asset Pipeline", duration: "1h 50m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      },
      {
        phase: 3,
        title: "Module 3: RESTful APIs, Sanctum Authentication & Security",
        desc: "API resources, token authentication with Laravel Sanctum, validation, and email queues.",
        lectures: [
          { id: 'L9', title: "RESTful API Design, JSON Resources & Form Requests", duration: "2h 00m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L10', title: "Token Authentication with Laravel Sanctum & Role Guards", duration: "2h 15m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L11', title: "Background Queues, Jobs, Notifications & Mailables", duration: "1h 55m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L12', title: "Security Best Practices: CSRF, SQL Injection & Rate Limiting", duration: "1h 45m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      },
      {
        phase: 4,
        title: "Module 4: Linux VPS Deployment, Nginx & Capstone Project",
        desc: "Configuring Ubuntu VPS, Nginx reverse proxy, SSL certs, and portfolio capstone.",
        lectures: [
          { id: 'L13', title: "Ubuntu Server Setup, SSH, Nginx & PHP-FPM Configuration", duration: "2h 15m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L14', title: "Let's Encrypt SSL, Cron Scheduled Tasks & Supervisors", duration: "1h 45m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L15', title: "Comprehensive Capstone Project Architecture & Defense", duration: "2h 30m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L16', title: "Freelance Client Handoff, Staging & Post-Launch Support", duration: "2h 00m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      }
    ];
  } else {
    // Graphic Design / WordPress / Default
    return [
      {
        phase: 1,
        title: "Module 1: Professional Foundations & Design Principles",
        desc: "Core concepts, design theory, typography, tool setups, and modern creative workflows.",
        lectures: [
          { id: 'L1', title: "Foundations, Principles of Design & Visual Hierarchy", duration: "1h 45m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L2', title: "Typography, Color Psychology & Layout Fundamentals", duration: "2h 00m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L3', title: "Essential Tooling, Workspaces & Industry Best Practices", duration: "2h 15m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L4', title: "Asset Management, File Formats & Print vs Digital Standards", duration: "1h 30m", status: "Completed", slides: "#", replayAvailable: true }
        ]
      },
      {
        phase: 2,
        title: "Module 2: Practical Projects & Core Implementation",
        desc: "Hands-on projects, client brief analysis, and structural composition.",
        lectures: [
          { id: 'L5', title: "Client Brief Decoding & Moodboarding Frameworks", duration: "1h 45m", status: "Completed", slides: "#", replayAvailable: true },
          { id: 'L6', title: "Composition, Vector Drafting & Core Project Architecture", duration: "2h 10m", status: "In Progress", slides: "#", replayAvailable: true },
          { id: 'L7', title: "Asset Creation, Responsive Variations & Reusability", duration: "2h 00m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L8', title: "Iteration Cycles, Feedback Revisions & Quality Control", duration: "1h 50m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      },
      {
        phase: 3,
        title: "Module 3: Advanced Techniques & Client Delivery",
        desc: "Advanced tool mastery, animation/interaction, and client branding guidelines.",
        lectures: [
          { id: 'L9', title: "Advanced Stylings, Grid Systems & Brand Guideline Kits", duration: "2h 00m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L10', title: "Interactive Prototypes & Client Demonstration Standards", duration: "2h 15m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L11', title: "Optimization for Performance, Speed & SEO Visibility", duration: "1h 45m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L12', title: "Client Delivery Packages, Licensing & Source Handover", duration: "1h 50m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      },
      {
        phase: 4,
        title: "Module 4: Capstone Portfolio, Freelancing & Career Launch",
        desc: "Showcase portfolio creation, Behance/Upwork profile optimization, and client pitching.",
        lectures: [
          { id: 'L13', title: "Portfolio Presentation: Case Studies that Convert Clients", duration: "2h 15m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L14', title: "Freelance Marketplace Strategy: Upwork, Fiverr & LinkedIn", duration: "2h 00m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L15', title: "Proposal Writing, Contract Negotiation & Milestone Billing", duration: "1h 45m", status: "Upcoming", slides: "#", replayAvailable: false },
          { id: 'L16', title: "Final Capstone Presentation & Institutional Certification", duration: "2h 30m", status: "Upcoming", slides: "#", replayAvailable: false }
        ]
      }
    ];
  }
};

const StudentProgress = () => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' | 'roadmap'
  const [openModules, setOpenModules] = useState({ 0: true, 1: true });
  const [showTable, setShowTable] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  
  // Real batch and instructor state
  const [batchInfo, setBatchInfo] = useState(null);
  const [instructorName, setInstructorName] = useState('Lead Course Faculty');
  const [attendancePercent, setAttendancePercent] = useState(null);

  const studentCnic = user?.cnic || "";
  const studentCourse = user?.assigned_course || user?.course || "Full Stack React JS";
  const studentBatch = user?.batch || "";

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        if (!studentCnic) return;

        // Fetch admission and batch details
        const { data: admissions } = await supabase
          .from('admissions')
          .select('id, batch, course, batch_timing')
          .eq('cnic', studentCnic)
          .in('status', ['Active', 'Graduated'])
          .order('submitted_at', { ascending: false })
          .limit(1);

        const admission = admissions?.[0];
        if (admission?.batch) {
          const { data: bData } = await supabase
            .from('batches')
            .select('id, batch_name, course, time_shift, timing_label, status, start_date')
            .eq('batch_name', admission.batch)
            .limit(1);

          const b = bData?.[0];
          if (b) {
            setBatchInfo(b);
            const { data: tbData } = await supabase
              .from('teacher_batches')
              .select('role, teachers(name, specialization)')
              .eq('batch_id', b.id);

            if (tbData && tbData.length > 0) {
              const mainTeacher = tbData.find(tb => tb.role === 'Main') || tbData[0];
              if (mainTeacher?.teachers?.name) {
                setInstructorName(mainTeacher.teachers.name);
              }
            }
          }
        }

        // Fetch student attendance summary
        const { data: attRecords } = await supabase
          .from('attendance')
          .select('status')
          .eq('cnic', studentCnic);

        if (attRecords && attRecords.length > 0) {
          const presents = attRecords.filter(a => a.status === 'Present').length;
          setAttendancePercent(Math.round((presents / attRecords.length) * 100));
        }
      } catch (err) {
        console.error("Error loading progress metadata:", err);
      }
    };

    fetchMetadata();
  }, [studentCnic]);

  // Tasks & Checkpoints
  const tasksPerCheckpoint = 5;
  const myTasks = tasks.filter(t => t.course === studentCourse && t.batch === studentBatch);
  const totalTasks = myTasks.length;
  const totalCheckpoints = Math.max(1, Math.ceil(totalTasks / tasksPerCheckpoint));
  
  const roadmapTasks = myTasks.map((task, index) => {
    const isSubmitted = task.submissions?.some(s => s.cnic === studentCnic);
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
    return {
      ...task,
      taskNumber: index + 1,
      status: isSubmitted ? 'Submitted' : (isOverdue ? 'Overdue' : 'Pending')
    };
  });

  const submittedTasksCount = roadmapTasks.filter(t => t.status === 'Submitted').length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((submittedTasksCount / totalTasks) * 100) : 0;
  
  const currentCheckpointIndex = totalTasks > 0
    ? Math.min(Math.floor(submittedTasksCount / tasksPerCheckpoint) + 1, totalCheckpoints)
    : 0;

  const getCheckpointState = (cpIndex) => {
    if (totalTasks === 0) return "locked";
    const tasksNeeded = Math.min(cpIndex * tasksPerCheckpoint, totalTasks);
    if (submittedTasksCount >= tasksNeeded) return "done";
    if (submittedTasksCount >= (cpIndex - 1) * tasksPerCheckpoint) return "active";
    return "locked";
  };

  const rows = [];
  for (let i = 0; i < totalCheckpoints; i++) {
    const startIndex = i * tasksPerCheckpoint;
    const rowTasks = roadmapTasks.slice(startIndex, startIndex + tasksPerCheckpoint);
    rows.push({
      index: i + 1,
      tasks: rowTasks,
      isReverse: i % 2 !== 0,
      state: getCheckpointState(i + 1)
    });
  }

  // Curriculum calculations
  const curriculum = getCourseCurriculum(studentCourse);
  const allLectures = curriculum.flatMap(m => m.lectures);
  const completedLectures = allLectures.filter(l => l.status === 'Completed').length;
  const syllabusProgressPercent = Math.round((completedLectures / allLectures.length) * 100);

  const toggleModule = (index) => {
    setOpenModules(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <DashboardLayout>
      <Container>
        
        {/* View Switcher Toggle */}
        <ViewToggleBar>
          <ViewToggleBtn 
            $active={activeTab === 'curriculum'} 
            onClick={() => setActiveTab('curriculum')}
          >
            <FaBookOpen /> Course Curriculum & Lectures
          </ViewToggleBtn>
          <ViewToggleBtn 
            $active={activeTab === 'roadmap'} 
            onClick={() => setActiveTab('roadmap')}
          >
            <FaTasks /> Gamified Milestone Roadmap
          </ViewToggleBtn>
        </ViewToggleBar>

        {/* Top Telemetry Stats */}
        <StatsGrid>
          <StatCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <StatLabel><FaBookOpen color="#4da6ff" /> Syllabus Completion</StatLabel>
            <StatValue>{syllabusProgressPercent}%</StatValue>
            <ProgressBarContainer>
              <ProgressBarFill 
                $color="#4da6ff"
                initial={{ width: 0 }} 
                animate={{ width: `${syllabusProgressPercent}%` }} 
                transition={{ duration: 0.8 }}
              />
            </ProgressBarContainer>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatLabel><FaTasks color="#10B981" /> Assignments Done</StatLabel>
            <StatValue>{submittedTasksCount} / {totalTasks || '—'}</StatValue>
            <ProgressBarContainer>
              <ProgressBarFill 
                $color="#10B981"
                initial={{ width: 0 }} 
                animate={{ width: `${taskProgressPercent}%` }} 
                transition={{ duration: 0.8 }}
              />
            </ProgressBarContainer>
          </StatCard>
          
          <StatCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatLabel><FaClock color="#ff9800" /> Attendance Record</StatLabel>
            <StatValue style={{ color: attendancePercent !== null ? (attendancePercent >= 80 ? '#10B981' : '#ff9800') : '#fff' }}>
              {attendancePercent !== null ? `${attendancePercent}%` : 'Good'}
            </StatValue>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: '6px' }}>
              Minimum 80% required for certification
            </div>
          </StatCard>

          <StatCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <StatLabel><FaGraduationCap color="#ff4d6d" /> Active Milestone</StatLabel>
            <StatValue style={{ fontSize: '1.4rem' }}>
              Phase 2: Core
            </StatValue>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: '6px' }}>
              Checkpoint {currentCheckpointIndex} of {totalCheckpoints}
            </div>
          </StatCard>
        </StatsGrid>

        {/* Tab 1: Course Curriculum & Lectures */}
        {activeTab === 'curriculum' && (
          <>
            <ProgramHero>
              <ProgramDetails>
                <h3>{studentCourse}</h3>
                <div className="meta-row">
                  <span>
                    <FaChalkboardTeacher color="#ff4d6d" /> {instructorName}
                  </span>
                  <span>
                    <FaCalendarAlt color="#4da6ff" /> Batch: {studentBatch || 'General Cohort'} 
                    {batchInfo?.time_shift ? ` (${batchInfo.time_shift})` : ''}
                  </span>
                  <span>
                    <FaClock color="#10B981" /> {allLectures.length} Total Lectures &bull; 4 Comprehensive Phases
                  </span>
                </div>
              </ProgramDetails>

              <Link href="/student/tasks" style={{ textDecoration: 'none' }}>
                <ActionBtn className="primary" style={{ padding: '10px 18px', fontSize: '0.9rem' }}>
                  <FaTasks /> Open Assignment Board
                </ActionBtn>
              </Link>
            </ProgramHero>

            <div>
              {curriculum.map((module, mIdx) => {
                const isOpen = openModules[mIdx] ?? false;
                const moduleDone = module.lectures.every(l => l.status === 'Completed');
                const moduleProgress = Math.round(
                  (module.lectures.filter(l => l.status === 'Completed').length / module.lectures.length) * 100
                );

                return (
                  <ModuleCard key={module.phase}>
                    <ModuleHeader $isOpen={isOpen} onClick={() => toggleModule(mIdx)}>
                      <ModuleTitleArea>
                        <div className="phase-num">0{module.phase}</div>
                        <div className="text">
                          <h4>{module.title}</h4>
                          <p>{module.desc}</p>
                        </div>
                      </ModuleTitleArea>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', color: moduleDone ? '#10B981' : 'rgba(255,255,255,0.6)' }}>
                            {moduleProgress}% complete
                          </span>
                          <ProgressBarContainer style={{ width: '80px', marginTop: '4px' }}>
                            <ProgressBarFill 
                              $color={moduleDone ? '#10B981' : '#4da6ff'} 
                              style={{ width: `${moduleProgress}%` }} 
                            />
                          </ProgressBarContainer>
                        </div>
                        {isOpen ? <FaChevronUp color="rgba(255,255,255,0.6)" /> : <FaChevronDown color="rgba(255,255,255,0.6)" />}
                      </div>
                    </ModuleHeader>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <LectureList>
                            {module.lectures.map((lec, lIdx) => (
                              <LectureRow key={lec.id}>
                                <LectureInfo>
                                  <div className="index">{(mIdx * 4) + lIdx + 1}.</div>
                                  <div className="details">
                                    <div className="name">{lec.title}</div>
                                    <div className="duration">
                                      <FaClock size={10} /> {lec.duration} &bull; Instructor: {instructorName}
                                    </div>
                                  </div>
                                </LectureInfo>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <StatusPill $status={lec.status}>
                                    {lec.status === 'Completed' && <FaCheckCircle size={10} />}
                                    {lec.status}
                                  </StatusPill>

                                  <ActionButtons>
                                    {lec.replayAvailable ? (
                                      <ActionBtn onClick={() => setSelectedLecture(lec)}>
                                        <FaPlayCircle color="#4da6ff" /> Watch Replay
                                      </ActionBtn>
                                    ) : (
                                      <ActionBtn disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                                        <FaLock size={10} /> Replay Locked
                                      </ActionBtn>
                                    )}

                                    <ActionBtn 
                                      onClick={() => {
                                        window.open(`https://deepskills.edu.pk/resources/${studentCourse.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, '_blank');
                                      }}
                                      title="Download lecture slides & code starter"
                                    >
                                      <FaFileDownload size={11} /> Slides
                                    </ActionBtn>
                                  </ActionButtons>
                                </div>
                              </LectureRow>
                            ))}
                          </LectureList>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ModuleCard>
                );
              })}
            </div>
          </>
        )}

        {/* Tab 2: Gamified Milestone Roadmap */}
        {activeTab === 'roadmap' && (
          <>
            <Card initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <Title><FaTasks color="#ff4d6d" /> Task Checkpoint Journey</Title>
              
              <RoadmapContainer>
                {totalTasks === 0 ? (
                  <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>
                    <FaExclamationCircle size={28} color="#ff9800" style={{ marginBottom: '10px' }} /><br />
                    No course assignments scheduled for your batch cohort yet.
                  </div>
                ) : rows.map((row, rowIndex) => {
                  const isLastRow = rowIndex === rows.length - 1;
                  const hasUTurn = !isLastRow;
                  
                  return (
                    <RowWrapper key={row.index} reverse={row.isReverse} style={{ marginBottom: hasUTurn ? '50px' : '0' }}>
                      <div style={{ width: '40px' }}></div>

                      {row.tasks.map((task, taskIndex) => {
                        const isCompleted = task.status === 'Submitted';
                        const globalTaskIndex = (row.index - 1) * tasksPerCheckpoint + taskIndex;
                        const isCarPosition = globalTaskIndex === submittedTasksCount && submittedTasksCount < totalTasks;

                        return (
                          <React.Fragment key={task.id}>
                            <TaskDotWrapper>
                              <TaskDot completed={isCompleted} />
                              {isCarPosition && (
                                <Car>🚗</Car>
                              )}
                              <Tooltip className="tooltip">
                                {task.taskNumber}. {task.title}<br/>
                                <span style={{ color: isCompleted ? '#2e7d32' : '#666' }}>{task.status}</span>
                              </Tooltip>
                            </TaskDotWrapper>
                            
                            <RoadLine completed={isCompleted} />
                          </React.Fragment>
                        );
                      })}

                      <CheckpointMarker state={row.state}>
                        {row.state === 'done' && <div className="trophy">🏆</div>}
                        {row.state === 'done' ? '✓' : row.state === 'active' ? row.index : <FaLock className="lock" />}
                        <CheckpointLabel state={row.state}>
                          {row.state === 'done' ? `Checkpoint ${row.index} Done` : 
                           row.state === 'active' ? `Checkpoint ${row.index} In Progress` : 
                           `Locked`}
                        </CheckpointLabel>
                      </CheckpointMarker>

                      {hasUTurn && (
                        <UTurn 
                          right={!row.isReverse} 
                          completed={row.state === 'done'}
                        />
                      )}

                      <div style={{ width: '40px' }}></div>
                    </RowWrapper>
                  );
                })}
              </RoadmapContainer>
            </Card>

            <Card initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Title style={{ border: 'none', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Coursework Milestone Ledger
                <ExpandBtn onClick={() => setShowTable(!showTable)}>
                  {showTable ? <FaChevronUp /> : <FaChevronDown />}
                  {showTable ? 'Hide Ledger' : 'View Full Ledger'}
                </ExpandBtn>
              </Title>
              
              <AnimatePresence>
                {showTable && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <StyledTable>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Task Title</th>
                          <th>Category</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roadmapTasks.map(t => (
                          <tr key={t.id}>
                            <td>{t.taskNumber}</td>
                            <td style={{ color: '#fff', fontWeight: 500 }}>{t.title}</td>
                            <td>{t.category}</td>
                            <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td>
                            <td>
                              <StatusPill $status={t.status === 'Submitted' ? 'Completed' : t.status}>
                                {t.status}
                              </StatusPill>
                            </td>
                            <td>
                              <Link href="/student/tasks" style={{ color: '#4da6ff', textDecoration: 'none', fontSize: '0.85rem' }}>
                                View Details &rarr;
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {roadmapTasks.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', color: '#666', padding: '30px' }}>
                              No assigned tasks found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </StyledTable>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </>
        )}

      </Container>

      {/* Video Replay Modal */}
      <AnimatePresence>
        {selectedLecture && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLecture(null)}
          >
            <ModalContent
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <ModalHeader>
                <div>
                  <h3 style={{ margin: 0 }}>Class Lecture Replay</h3>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                    {selectedLecture.title} &bull; {selectedLecture.duration}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLecture(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                >
                  <FaTimes size={18} />
                </button>
              </ModalHeader>

              <ModalBody>
                {/* Embedded Video Placeholder */}
                <div style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: '#050505',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                  position: 'relative'
                }}>
                  <FaVideo size={48} color="#7B1F2E" style={{ marginBottom: '12px' }} />
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                    DeepSkills Recorded Stream
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '4px' }}>
                    Instructor: {instructorName} &bull; HD 1080p
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem', marginBottom: '6px' }}>
                    Key Takeaways & Core Concepts:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <li>Adheres to vocational industry standards and production patterns.</li>
                    <li>Refer to the lecture slide deck for starter boilerplates and exercises.</li>
                    <li>Complete the related weekly assignment on your Task Board to earn marks.</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <Link href="/student/tasks" style={{ flex: 1, textDecoration: 'none' }}>
                    <ActionBtn className="primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                      <FaTasks /> Open Related Assignment
                    </ActionBtn>
                  </Link>
                  <ActionBtn onClick={() => setSelectedLecture(null)} style={{ flex: 1, justifyContent: 'center' }}>
                    Close Player
                  </ActionBtn>
                </div>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
};

export default StudentProgress;
