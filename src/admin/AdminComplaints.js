import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  FaComments, FaUserShield, FaExclamationCircle, FaCheckCircle,
  FaUndo, FaPaperPlane, FaPlus, FaFilter, FaSearch, FaSync,
  FaDownload, FaWhatsapp, FaTimes, FaInbox, FaChevronDown,
  FaClock, FaUserGraduate, FaLayerGroup, FaBolt, FaPhoneAlt,
  FaCalendarCheck, FaTasks, FaAward, FaBullhorn, FaBookOpen, FaChartBar
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { downloadCsv } from '../utils/csvExport';
import { supabase } from '../supabaseClient';
import { getAuthHeaders } from '../utils/adminAccessApi';
import { requestComplaints } from '../utils/complaintsApi';

// ──────────────────────────────────────────
// Styled Components (DeepSkills Glassmorphic)
// ──────────────────────────────────────────

const Container = styled.div`
  padding: 10px 0 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
`;

const SubNavRibbon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 6px;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
`;

const NavChip = styled.button`
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => props.$active ? '#c084fc' : '#94a3b8'};
  border: 1px solid ${props => props.$active ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
  padding: 7px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(168, 85, 247, 0.2);
    color: #fff;
    border-color: rgba(168, 85, 247, 0.5);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  .title-area {
    h1 {
      font-size: 1.7rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    p {
      color: #94a3b8;
      font-size: 0.88rem;
      margin: 0;
    }
  }

  .action-cluster {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const HeaderBtn = styled.button`
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &.primary {
    background: #7B1F2E;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 15px rgba(123, 31, 46, 0.35);

    &:hover {
      background: #9b283b;
      transform: translateY(-1px);
    }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
`;

const StatCard = styled.div`
  background: rgba(18, 20, 26, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 16px 20px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.14);
    transform: translateY(-2px);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .icon-box {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: ${props => props.$accentBg || 'rgba(123, 31, 46, 0.15)'};
      color: ${props => props.$accentColor || '#ef4444'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
    }

    .badge {
      font-size: 0.72rem;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
      font-weight: 600;
    }
  }

  .value {
    font-size: 1.65rem;
    font-weight: 800;
    color: #fff;
    line-height: 1.2;
  }

  .label {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 600;
  }
`;

// ─── Workspace Layout (Master-Detail) ───

const Workspace = styled.div`
  display: grid;
  grid-template-columns: 410px 1fr;
  gap: 18px;
  min-height: 720px;
  height: calc(100vh - 240px);

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const TicketRegistryPanel = styled.div`
  background: rgba(14, 16, 22, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(12px);

  @media (max-width: 1100px) {
    max-height: 520px;
  }
`;

const RegistryHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 12px;
    color: #64748b;
    font-size: 0.85rem;
  }

  input {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 8px 12px 8px 34px;
    color: #fff;
    font-size: 0.84rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #7B1F2E;
    }
    &::placeholder {
      color: #64748b;
    }
  }
`;

const FilterChipsRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  &::-webkit-scrollbar { display: none; }
`;

const FilterChip = styled.button`
  padding: 5px 12px;
  background: ${props => props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.04)'};
  color: ${props => props.$active ? '#fff' : '#94a3b8'};
  border: 1px solid ${props => props.$active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 16px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    border-color: ${props => props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.15)'};
  }
`;

const SecondaryFiltersRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  .select-wrap {
    position: relative;
    select {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      padding: 6px 24px 6px 8px;
      border-radius: 8px;
      font-size: 0.75rem;
      appearance: none;
      outline: none;
      cursor: pointer;
      &:focus { border-color: #7B1F2E; }
      option {
        background: #111318;
        color: #fff;
      }
    }
    .arrow {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      font-size: 0.65rem;
      color: #64748b;
    }
  }
`;

const TicketList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const TicketCard = styled.div`
  padding: 14px 16px;
  border-radius: 12px;
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.15)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${props => props.$active ? 'rgba(123, 31, 46, 0.45)' : 'rgba(255, 255, 255, 0.05)'};
  border-left: 4px solid ${props => {
    if (props.$isUrgent) return '#ef4444';
    if (props.$active) return '#7B1F2E';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:hover {
    background: ${props => props.$active ? 'rgba(123, 31, 46, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
    border-color: ${props => props.$active ? 'rgba(123, 31, 46, 0.6)' : 'rgba(255, 255, 255, 0.12)'};
    transform: translateX(2px);
  }

  .ticket-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .student-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .time-label {
      font-size: 0.7rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .subject-line {
    font-size: 0.82rem;
    color: #cbd5e1;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .last-preview {
    font-size: 0.74rem;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .badge-cluster {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
`;

const StatusPill = styled.span`
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    switch (props.$status) {
      case 'Open': return 'rgba(34, 197, 94, 0.15)';
      case 'Pending Reply': return 'rgba(234, 179, 8, 0.15)';
      case 'Closed': return 'rgba(148, 163, 184, 0.15)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'Open': return '#4ade80';
      case 'Pending Reply': return '#fde047';
      case 'Closed': return '#94a3b8';
      default: return '#cbd5e1';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'Open': return 'rgba(34, 197, 94, 0.3)';
      case 'Pending Reply': return 'rgba(234, 179, 8, 0.3)';
      case 'Closed': return 'rgba(148, 163, 184, 0.3)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
`;

const TagPill = styled.span`
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  background: ${props => props.$bg || 'rgba(56, 189, 248, 0.12)'};
  color: ${props => props.$color || '#38bdf8'};
  border: 1px solid ${props => props.$border || 'rgba(56, 189, 248, 0.25)'};
`;

// ─── Detail Resolution Center ───

const ResolutionCenterPanel = styled.div`
  background: rgba(14, 16, 22, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(12px);
`;

const ResolutionHeader = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(18, 20, 26, 0.5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;

  .meta-col {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .subject {
      font-size: 1.15rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .student-info {
      font-size: 0.8rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;

      span {
        display: flex;
        align-items: center;
        gap: 5px;
      }
    }
  }

  .action-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const ControlBtn = styled.button`
  padding: 7px 13px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.whatsapp {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.35);
    &:hover {
      background: rgba(34, 197, 94, 0.25);
      transform: translateY(-1px);
    }
  }

  &.urgent {
    background: ${props => props.$active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.$active ? '#f87171' : '#94a3b8'};
    border-color: ${props => props.$active ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
    &:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #f87171;
    }
  }

  &.resolve {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.4);
    &:hover {
      background: rgba(34, 197, 94, 0.3);
      transform: translateY(-1px);
    }
  }

  &.reopen {
    background: rgba(234, 179, 8, 0.2);
    color: #fde047;
    border-color: rgba(234, 179, 8, 0.4);
    &:hover {
      background: rgba(234, 179, 8, 0.3);
      transform: translateY(-1px);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ChatBody = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
  }
`;

const MessageBubble = styled.div`
  max-width: 76%;
  align-self: ${props => props.$isOwn ? 'flex-end' : 'flex-start'};
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const BubbleContent = styled.div`
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #fff;
  background: ${props => {
    if (props.$role === 'admin') return '#7B1F2E';
    if (props.$role === 'teacher') return 'rgba(168, 85, 247, 0.25)';
    return 'rgba(255, 255, 255, 0.06)';
  }};
  border: 1px solid ${props => {
    if (props.$role === 'admin') return 'rgba(255, 255, 255, 0.15)';
    if (props.$role === 'teacher') return 'rgba(168, 85, 247, 0.4)';
    return 'rgba(255, 255, 255, 0.08)';
  }};
  border-bottom-right-radius: ${props => props.$isOwn ? '2px' : '14px'};
  border-bottom-left-radius: ${props => props.$isOwn ? '14px' : '2px'};
  word-break: break-word;
`;

const BubbleMeta = styled.div`
  font-size: 0.72rem;
  color: #64748b;
  text-align: ${props => props.$isOwn ? 'right' : 'left'};
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: ${props => props.$isOwn ? 'flex-end' : 'flex-start'};
`;

const CannedRepliesBar = styled.div`
  padding: 10px 24px;
  background: rgba(18, 20, 26, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }

  .label {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748b;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const CannedChip = styled.button`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const InputSection = styled.div`
  padding: 16px 24px 20px;
  background: rgba(18, 20, 26, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  .closed-banner {
    text-align: center;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    font-size: 0.82rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .view-only-banner {
    text-align: center;
    padding: 10px;
    color: #64748b;
    font-size: 0.82rem;
  }
`;

const InputRow = styled.div`
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 8px 8px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  &:focus-within {
    border-color: #7B1F2E;
  }

  input {
    flex: 1;
    background: none;
    border: none;
    color: #fff;
    outline: none;
    font-size: 0.88rem;

    &::placeholder {
      color: #64748b;
    }
  }

  button {
    background: #7B1F2E;
    color: #fff;
    border: none;
    padding: 9px 18px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.84rem;
    font-weight: 700;
    transition: all 0.2s;

    &:hover {
      background: #9b283b;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const EmptySelectState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #64748b;
  text-align: center;
  gap: 12px;

  svg {
    font-size: 3rem;
    opacity: 0.3;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #94a3b8;
  }

  p {
    margin: 0;
    font-size: 0.84rem;
    max-width: 320px;
    line-height: 1.5;
  }
`;

// ─── Modal Styles ───

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 20px;
  overflow-y: auto;
`;

const ModalCard = styled(motion.div)`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 600px;
  padding: 26px;
  color: #fff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  position: relative;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    h3 {
      font-size: 1.2rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    button {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      &:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;

    label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #cbd5e1;
    }

    input, select, textarea {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 14px;
      color: #fff;
      font-size: 0.86rem;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #7B1F2E;
      }
      &::placeholder {
        color: #64748b;
      }
    }

    select option {
      background: #111318;
      color: #fff;
    }

    textarea {
      min-height: 90px;
      resize: vertical;
    }
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
`;

// ──────────────────────────────────────────
// Main AdminComplaints Component
// ──────────────────────────────────────────

export function AdminComplaints() {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'complaints', 'full');

  // State
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    pending_reply: 0,
    closed: 0,
    urgent: 0,
    resolved: 0,
    resolution_rate: 100
  });
  const [meta, setMeta] = useState({
    batches: [],
    courses: [],
    categories: ['Academic', 'Technical', 'Administration', 'Facilities', 'Examination', 'Other']
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // Chat Input
  const [newMessage, setNewMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const chatBodyRef = useRef(null);

  // Log Ticket Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    student_name: '',
    student_cnic: '',
    course: '',
    batch: '',
    subject: '',
    category: 'Academic',
    priority: 'Normal',
    initial_message: ''
  });

  // ──────────────────────────────────────────
  // Data Fetching
  // ──────────────────────────────────────────

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // Build query string
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterCategory !== 'All') params.append('category', filterCategory);
      if (filterBatch !== 'All') params.append('batch', filterBatch);
      if (filterPriority !== 'All') params.append('priority', filterPriority);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await requestComplaints({
        headers: await getAuthHeaders(),
        query: qs
      });
      applyData(data);
    } catch (err) {
      console.warn('API fetch error, using Supabase client fallback:', err);
      await fetchViaSupabaseClient();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterStatus, filterCategory, filterBatch, filterPriority]);

  const applyData = (data) => {
    const list = data.complaints || [];
    setComplaints(list);
    if (data.stats) setStats(data.stats);
    if (data.meta) setMeta(data.meta);

    // Auto-select first ticket if current active is not in list
    if (list.length > 0) {
      setActiveId(prev => (list.some(c => c.id === prev) ? prev : list[0].id));
    } else {
      setActiveId(null);
    }
  };

  // Safe client-side fallback using direct Supabase queries
  const fetchViaSupabaseClient = async () => {
    try {
      const [batchesRes, coursesRes, compRes] = await Promise.all([
        supabase.from('batches').select('id, batch_name, course, time_shift, status').order('batch_name', { ascending: true }),
        supabase.from('courses').select('id, title').order('title', { ascending: true }),
        supabase.from('complaints').select(`*, messages:complaint_messages(*)`).order('updated_at', { ascending: false })
      ]);

      const bData = batchesRes.data || [];
      const cData = coursesRes.data || [];
      const rawComps = compRes.data || [];

      const enriched = rawComps.map(c => {
        const msgs = (c.messages || []).sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
        return {
          ...c,
          messages: msgs,
          message_count: msgs.length,
          last_message: msgs.length > 0 ? msgs[msgs.length - 1] : null
        };
      });

      const total = enriched.length;
      const open = enriched.filter(c => c.status === 'Open').length;
      const pending_reply = enriched.filter(c => c.status === 'Pending Reply').length;
      const closed = enriched.filter(c => c.status === 'Closed').length;
      const urgent = enriched.filter(c => c.priority === 'Urgent').length;
      const rate = total > 0 ? Math.round((closed / total) * 100) : 100;

      let filtered = enriched;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(c =>
          (c.student_name || '').toLowerCase().includes(q) ||
          (c.student_cnic || '').includes(q) ||
          (c.subject || '').toLowerCase().includes(q)
        );
      }
      if (filterStatus !== 'All') filtered = filtered.filter(c => c.status === filterStatus);
      if (filterCategory !== 'All') filtered = filtered.filter(c => (c.category || 'Academic') === filterCategory);
      if (filterBatch !== 'All') filtered = filtered.filter(c => c.batch === filterBatch);
      if (filterPriority !== 'All') filtered = filtered.filter(c => (c.priority || 'Normal') === filterPriority);

      setComplaints(filtered);
      setStats({
        total,
        open,
        pending_reply,
        closed,
        urgent,
        resolved: closed,
        resolution_rate: rate
      });
      setMeta({
        batches: bData,
        courses: cData,
        categories: ['Academic', 'Technical', 'Administration', 'Facilities', 'Examination', 'Other']
      });

      if (filtered.length > 0) {
        setActiveId(prev => (filtered.some(c => c.id === prev) ? prev : filtered[0].id));
      } else {
        setActiveId(null);
      }
    } catch (fallbackErr) {
      console.error('Supabase fallback error:', fallbackErr);
      toast.error('Failed to load complaints registry.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Supabase Subscription
  useEffect(() => {
    const channelName = `admin-complaints-rt-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaint_messages' }, () => {
        fetchData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Active Ticket Object
  const activeTicket = useMemo(() => {
    return complaints.find(c => c.id === activeId) || null;
  }, [complaints, activeId]);

  // Scroll Chat to bottom on message updates
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [activeTicket?.messages, activeId]);

  // ──────────────────────────────────────────
  // Actions
  // ──────────────────────────────────────────

  const executeAction = async (payload, successMsg) => {
    try {
      const data = await requestComplaints({
        headers: await getAuthHeaders(),
        method: 'POST',
        body: payload
      });
      if (successMsg) toast.success(successMsg);
      await fetchData(true);
      return data;
    } catch (err) {
      toast.error(err.message || 'Action failed.');
      throw err;
    }
  };

  const handleSendMessage = async (customText = null) => {
    if (!canMutate) {
      toast.error('You have view-only access. Sending replies is not permitted.');
      return;
    }
    const textToSend = customText || newMessage;
    if (!textToSend.trim() || !activeId) return;

    setSubmittingReply(true);
    try {
      await executeAction({
        action: 'send_message',
        complaint_id: activeId,
        text: textToSend.trim()
      }, 'Reply sent');
      setNewMessage('');
    } catch {
      // toast already handled
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!canMutate) {
      toast.error('You have view-only access. Resolving complaints is not permitted.');
      return;
    }
    if (!activeId) return;
    if (window.confirm('Mark this grievance ticket as resolved? A notification will be dispatched to the student.')) {
      try {
        await executeAction({
          action: 'resolve',
          complaint_id: activeId,
          resolution_note: 'Administrative Notice: Your grievance has been investigated and resolved by the Academic Administration. Please reopen if the issue persists.'
        }, 'Grievance ticket marked as resolved.');
      } catch {
        // error handled
      }
    }
  };

  const handleReopenTicket = async () => {
    if (!canMutate) {
      toast.error('You have view-only access. Modifying ticket state is not permitted.');
      return;
    }
    if (!activeId) return;
    try {
      await executeAction({
        action: 'reopen',
        complaint_id: activeId
      }, 'Grievance ticket reopened.');
    } catch {
      // error handled
    }
  };

  const handleToggleUrgent = async () => {
    if (!canMutate) {
      toast.error('You have view-only access. Updating priority is not permitted.');
      return;
    }
    if (!activeTicket) return;
    try {
      await executeAction({
        action: 'toggle_urgent',
        complaint_id: activeTicket.id,
        current_priority: activeTicket.priority || 'Normal'
      }, `Ticket marked as ${activeTicket.priority === 'Urgent' ? 'Normal' : 'Urgent'}`);
    } catch {
      // error handled
    }
  };

  const handleOpenWhatsApp = () => {
    if (!activeTicket) return;
    const phone = activeTicket.student_phone;
    if (!phone) {
      toast.error('Student contact phone number not found.');
      return;
    }
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const greeting = encodeURIComponent(`Assalam-o-Alaikum ${activeTicket.student_name}, regarding your grievance ticket "${activeTicket.subject}" at DeepSkills Academy: `);
    window.open(`https://wa.me/${intlPhone}?text=${greeting}`, '_blank');
  };

  // Canned Responses
  const cannedReplies = [
    'Your issue is being investigated by the academic coordinator.',
    'Please visit the campus administration office tomorrow at 2:00 PM.',
    'Your portal attendance/marks have been verified and updated.',
    'Your request has been forwarded to your batch instructor for review.'
  ];

  // Administrative Ticket Submission
  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim()) {
      toast.error('Ticket subject is required.');
      return;
    }

    setCreatingTicket(true);
    try {
      await executeAction({
        action: 'create_ticket',
        ...newTicketForm
      }, 'Administrative ticket logged successfully.');
      setCreateModalOpen(false);
      setNewTicketForm({
        student_name: '',
        student_cnic: '',
        course: '',
        batch: '',
        subject: '',
        category: 'Academic',
        priority: 'Normal',
        initial_message: ''
      });
    } catch {
      // error handled
    } finally {
      setCreatingTicket(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (complaints.length === 0) {
      toast.error('No complaints available to export.');
      return;
    }

    const rows = complaints.map(c => ({
      'Ticket ID': c.id,
      'Student Name': c.student_name || 'N/A',
      'Student CNIC': c.student_cnic || 'N/A',
      'Student Phone': c.student_phone || 'N/A',
      'Course': c.course || 'N/A',
      'Batch': c.batch || 'N/A',
      'Subject': c.subject || 'N/A',
      'Category': c.category || 'Academic',
      'Priority': c.priority || 'Normal',
      'Status': c.status || 'Open',
      'Total Messages': c.message_count || 0,
      'Created At': c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A',
      'Last Updated': c.updated_at ? new Date(c.updated_at).toLocaleString() : 'N/A'
    }));

    downloadCsv(rows, `DeepSkills_Grievance_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Grievance registry CSV exported successfully.');
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 86400000 && now.getDate() === date.getDate()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const hasActiveFilters = search || filterStatus !== 'All' || filterCategory !== 'All' || filterBatch !== 'All' || filterPriority !== 'All';

  return (
    <Container>
      {/* Navigation Ribbon */}
      <SubNavRibbon>
        <NavChip onClick={() => router.push('/admin/academic')}>
          <FaChartBar /> Academic Hub
        </NavChip>
        <NavChip onClick={() => router.push('/admin/academic/attendance')}>
          <FaCalendarCheck /> Attendance
        </NavChip>
        <NavChip onClick={() => router.push('/admin/academic/tasks')}>
          <FaTasks /> Tasks & Homework
        </NavChip>
        <NavChip onClick={() => router.push('/admin/academic/results')}>
          <FaAward /> Exams & Results
        </NavChip>
        <NavChip onClick={() => router.push('/admin/academic/announcements')}>
          <FaBullhorn /> Announcements
        </NavChip>
        <NavChip $active onClick={() => router.push('/admin/academic/complaints')}>
          <FaComments /> Grievances Desk
        </NavChip>
        <NavChip onClick={() => router.push('/admin/academic/chats')}>
          <FaComments /> Group Chats
        </NavChip>
        <NavChip onClick={() => router.push('/admin/academic/reports')}>
          <FaBookOpen /> Academic Reports
        </NavChip>
      </SubNavRibbon>

      {/* Header Bar */}
      <Header>
        <div className="title-area">
          <h1><FaComments style={{ color: '#7B1F2E' }} /> Student Grievance & Resolution Desk</h1>
          <p>Triage student inquiries, resolve academic disputes, and communicate across batch escalation channels</p>
        </div>
        <div className="action-cluster">
          {canMutate && (
            <HeaderBtn className="primary" onClick={() => setCreateModalOpen(true)}>
              <FaPlus /> Log Administrative Ticket
            </HeaderBtn>
          )}
          <HeaderBtn className="secondary" onClick={handleExportCSV}>
            <FaDownload /> Export CSV
          </HeaderBtn>
          <HeaderBtn className="secondary" onClick={() => fetchData(true)} disabled={refreshing}>
            <FaSync className={refreshing ? 'fa-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh Desk'}
          </HeaderBtn>
        </div>
      </Header>

      {/* Telemetry KPI Cards */}
      <StatsGrid>
        <StatCard $accentBg="rgba(56, 189, 248, 0.15)" $accentColor="#38bdf8">
          <div className="card-top">
            <div className="icon-box"><FaComments /></div>
            <span className="badge">All Time</span>
          </div>
          <div className="value">{stats.total}</div>
          <div className="label">Total Grievances</div>
        </StatCard>

        <StatCard $accentBg="rgba(34, 197, 94, 0.15)" $accentColor="#4ade80">
          <div className="card-top">
            <div className="icon-box"><FaClock /></div>
            <span className="badge">Active</span>
          </div>
          <div className="value">{stats.open + stats.pending_reply}</div>
          <div className="label">Open &amp; Pending ({stats.open} Open)</div>
        </StatCard>

        <StatCard $accentBg="rgba(239, 68, 68, 0.15)" $accentColor="#f87171">
          <div className="card-top">
            <div className="icon-box"><FaExclamationCircle /></div>
            <span className="badge">High Alert</span>
          </div>
          <div className="value">{stats.urgent}</div>
          <div className="label">Urgent Escalations</div>
        </StatCard>

        <StatCard $accentBg="rgba(168, 85, 247, 0.15)" $accentColor="#c084fc">
          <div className="card-top">
            <div className="icon-box"><FaCheckCircle /></div>
            <span className="badge">Efficiency</span>
          </div>
          <div className="value">{stats.resolution_rate}%</div>
          <div className="label">Resolution Rate ({stats.closed} Closed)</div>
        </StatCard>
      </StatsGrid>

      {/* Master-Detail Workspace */}
      <Workspace>
        {/* Left Registry Panel */}
        <TicketRegistryPanel>
          <RegistryHeader>
            <SearchBox>
              <FaSearch />
              <input
                type="text"
                placeholder="Search candidate, CNIC, subject, batch..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </SearchBox>

            <FilterChipsRow>
              {['All', 'Open', 'Pending Reply', 'Closed', 'Urgent'].map(f => (
                <FilterChip
                  key={f}
                  $active={f === 'Urgent' ? filterPriority === 'Urgent' : filterStatus === f}
                  onClick={() => {
                    if (f === 'Urgent') {
                      setFilterPriority(filterPriority === 'Urgent' ? 'All' : 'Urgent');
                    } else {
                      setFilterStatus(f);
                    }
                  }}
                >
                  {f}
                </FilterChip>
              ))}
            </FilterChipsRow>

            <SecondaryFiltersRow>
              <div className="select-wrap">
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  aria-label="Filter by Category"
                >
                  <option value="All">All Categories</option>
                  {(meta.categories || []).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <FaChevronDown className="arrow" />
              </div>

              <div className="select-wrap">
                <select
                  value={filterBatch}
                  onChange={e => setFilterBatch(e.target.value)}
                  aria-label="Filter by Batch"
                >
                  <option value="All">All Batches</option>
                  {(meta.batches || []).map(b => (
                    <option key={b.id || b.batch_name} value={b.batch_name}>{b.batch_name}</option>
                  ))}
                </select>
                <FaChevronDown className="arrow" />
              </div>
            </SecondaryFiltersRow>

            {hasActiveFilters && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFilterStatus('All');
                    setFilterCategory('All');
                    setFilterBatch('All');
                    setFilterPriority('All');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c084fc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FaUndo size={10} /> Reset Filters
                </button>
              </div>
            )}
          </RegistryHeader>

          <TicketList>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div style={{ height: '14px', width: '60%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ height: '12px', width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ height: '10px', width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
                </div>
              ))
            ) : complaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <FaInbox size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ fontSize: '0.86rem', margin: 0 }}>No grievance tickets found.</p>
              </div>
            ) : (
              complaints.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  $active={activeId === ticket.id}
                  $isUrgent={ticket.priority === 'Urgent'}
                  onClick={() => setActiveId(ticket.id)}
                >
                  <div className="ticket-top">
                    <div className="student-title">
                      <FaUserGraduate style={{ color: '#94a3b8', fontSize: '0.75rem' }} />
                      {ticket.student_name || 'Anonymous Student'}
                    </div>
                    <div className="time-label">
                      <FaClock size={10} />
                      {formatTime(ticket.updated_at)}
                    </div>
                  </div>

                  <div className="subject-line" title={ticket.subject}>
                    {ticket.subject}
                  </div>

                  {ticket.last_message && (
                    <div className="last-preview" title={ticket.last_message.text}>
                      <strong style={{ color: '#cbd5e1' }}>{ticket.last_message.sender_name}:</strong> {ticket.last_message.text}
                    </div>
                  )}

                  <div className="badge-cluster">
                    <StatusPill $status={ticket.status}>{ticket.status}</StatusPill>
                    <TagPill>{ticket.category || 'Academic'}</TagPill>
                    {ticket.priority === 'Urgent' && (
                      <TagPill $bg="rgba(239, 68, 68, 0.2)" $color="#f87171" $border="rgba(239, 68, 68, 0.4)">
                        Urgent
                      </TagPill>
                    )}
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto' }}>
                      {ticket.batch || 'General'}
                    </span>
                  </div>
                </TicketCard>
              ))
            )}
          </TicketList>
        </TicketRegistryPanel>

        {/* Right Detail Resolution Center */}
        <ResolutionCenterPanel>
          {activeTicket ? (
            <>
              {/* Header */}
              <ResolutionHeader>
                <div className="meta-col">
                  <h2 className="subject">
                    {activeTicket.subject}
                    {activeTicket.priority === 'Urgent' && (
                      <TagPill $bg="rgba(239, 68, 68, 0.2)" $color="#f87171" $border="rgba(239, 68, 68, 0.4)">
                        Urgent
                      </TagPill>
                    )}
                  </h2>
                  <div className="student-info">
                    <span><FaUserGraduate /> {activeTicket.student_name}</span>
                    {activeTicket.student_cnic && <span>• CNIC: {activeTicket.student_cnic}</span>}
                    {activeTicket.batch && <span><FaLayerGroup /> {activeTicket.batch}</span>}
                    {activeTicket.course && <span>• {activeTicket.course}</span>}
                  </div>
                </div>

                <div className="action-controls">
                  {activeTicket.student_phone && (
                    <ControlBtn className="whatsapp" onClick={handleOpenWhatsApp} title="Open Direct WhatsApp Chat">
                      <FaWhatsapp /> WhatsApp Candidate
                    </ControlBtn>
                  )}

                  {canMutate && (
                    <>
                      <ControlBtn
                        className="urgent"
                        $active={activeTicket.priority === 'Urgent'}
                        onClick={handleToggleUrgent}
                        title="Toggle Urgent Escalation Flag"
                      >
                        <FaBolt /> {activeTicket.priority === 'Urgent' ? 'Urgent' : 'Mark Urgent'}
                      </ControlBtn>

                      {activeTicket.status === 'Closed' ? (
                        <ControlBtn className="reopen" onClick={handleReopenTicket} title="Reopen Grievance Ticket">
                          <FaUndo /> Reopen Ticket
                        </ControlBtn>
                      ) : (
                        <ControlBtn className="resolve" onClick={handleResolveTicket} title="Mark Ticket as Resolved">
                          <FaCheckCircle /> Resolve Ticket
                        </ControlBtn>
                      )}
                    </>
                  )}
                </div>
              </ResolutionHeader>

              {/* Chat Thread */}
              <ChatBody ref={chatBodyRef}>
                {(activeTicket.messages || []).map((msg, idx) => {
                  const isOwn = msg.sender_role === 'admin';
                  return (
                    <MessageBubble key={msg.id || idx} $isOwn={isOwn}>
                      <BubbleContent $isOwn={isOwn} $role={msg.sender_role}>
                        {msg.text}
                      </BubbleContent>
                      <BubbleMeta $isOwn={isOwn}>
                        <strong>{msg.sender_name}</strong> ({msg.sender_role}) • {formatTime(msg.created_at)}
                      </BubbleMeta>
                    </MessageBubble>
                  );
                })}
              </ChatBody>

              {/* Canned Quick Replies */}
              {canMutate && activeTicket.status !== 'Closed' && (
                <CannedRepliesBar>
                  <span className="label"><FaBolt size={10} /> Quick Answers:</span>
                  {cannedReplies.map((reply, i) => (
                    <CannedChip key={i} onClick={() => setNewMessage(reply)}>
                      {reply.length > 36 ? reply.slice(0, 36) + '...' : reply}
                    </CannedChip>
                  ))}
                </CannedRepliesBar>
              )}

              {/* Input Section */}
              <InputSection>
                {activeTicket.status === 'Closed' ? (
                  <div className="closed-banner">
                    <FaCheckCircle style={{ color: '#4ade80' }} />
                    This grievance ticket is marked as resolved and closed.
                    {canMutate && (
                      <button
                        onClick={handleReopenTicket}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c084fc',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Reopen ticket to reply
                      </button>
                    )}
                  </div>
                ) : canMutate ? (
                  <InputRow>
                    <input
                      type="text"
                      placeholder="Type administrative dispatch reply..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!newMessage.trim() || submittingReply}
                    >
                      <FaPaperPlane /> {submittingReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </InputRow>
                ) : (
                  <div className="view-only-banner">
                    You have view-only access. Resolving or replying to grievances is disabled.
                  </div>
                )}
              </InputSection>
            </>
          ) : (
            <EmptySelectState>
              <FaComments />
              <h3>No Grievance Ticket Selected</h3>
              <p>Select a student inquiry from the registry on the left to view message history, candidate details, or post resolution actions.</p>
            </EmptySelectState>
          )}
        </ResolutionCenterPanel>
      </Workspace>

      {/* Log Administrative Ticket Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCreateModalOpen(false)}
          >
            <ModalCard
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3><FaComments style={{ color: '#7B1F2E' }} /> Log Administrative Ticket</h3>
                <button type="button" onClick={() => setCreateModalOpen(false)} aria-label="Close modal">
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateTicketSubmit}>
                <div className="form-group">
                  <label>Subject / Grievance Summary *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Request for batch transfer, Attendance review..."
                    value={newTicketForm.subject}
                    onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Student Name</label>
                    <input
                      type="text"
                      placeholder="Candidate full name"
                      value={newTicketForm.student_name}
                      onChange={e => setNewTicketForm({ ...newTicketForm, student_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Student CNIC</label>
                    <input
                      type="text"
                      placeholder="35201-XXXXXXX-X"
                      value={newTicketForm.student_cnic}
                      onChange={e => setNewTicketForm({ ...newTicketForm, student_cnic: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Batch Assignment</label>
                    <select
                      value={newTicketForm.batch}
                      onChange={e => setNewTicketForm({ ...newTicketForm, batch: e.target.value })}
                    >
                      <option value="">Select Target Batch</option>
                      {(meta.batches || []).map(b => (
                        <option key={b.id || b.batch_name} value={b.batch_name}>{b.batch_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newTicketForm.category}
                      onChange={e => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    >
                      {(meta.categories || []).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Priority Level</label>
                  <select
                    value={newTicketForm.priority}
                    onChange={e => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent Escalation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Initial Message / Problem Description</label>
                  <textarea
                    placeholder="Provide details about the issue or student request..."
                    value={newTicketForm.initial_message}
                    onChange={e => setNewTicketForm({ ...newTicketForm, initial_message: e.target.value })}
                  />
                </div>

                <div className="modal-actions">
                  <HeaderBtn type="button" className="secondary" onClick={() => setCreateModalOpen(false)}>
                    Cancel
                  </HeaderBtn>
                  <HeaderBtn type="submit" className="primary" disabled={creatingTicket}>
                    {creatingTicket ? 'Logging Ticket...' : 'Create Grievance Ticket'}
                  </HeaderBtn>
                </div>
              </form>
            </ModalCard>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
}

const AdminComplaintsPage = () => (
  <AdminLayout>
    <AdminComplaints />
  </AdminLayout>
);

export default AdminComplaintsPage;
