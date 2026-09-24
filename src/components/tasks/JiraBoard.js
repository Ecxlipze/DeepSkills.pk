import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlay, FaStop, FaPlus, FaTrash, FaEdit, FaClock, FaCalendarAlt,
  FaSearch, FaFilter, FaArrowRight, FaArrowLeft, FaTimes, FaUser,
  FaExclamationTriangle, FaColumns, FaStream, FaList, FaCheck,
  FaCheckCircle, FaTag, FaHourglassHalf, FaRegClock, FaExternalLinkAlt,
  FaFileExport, FaDownload, FaPaperclip, FaCheckSquare, FaFilePdf,
  FaFileImage, FaUpload, FaSpinner
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../portal/PortalTheme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import {
  getAuthToken,
  fetchTrackerData,
  startTaskTimer,
  stopTaskTimer,
  logManualTime,
  fetchProjects,
  formatSeconds,
  formatHourDecimal
} from '../../utils/timeTrackingApi';
import {
  fetchStaffTasks,
  fetchStaffTasksData,
  fetchTaskDetails,
  createStaffTask,
  updateStaffTask,
  deleteStaffTask,
  reorderStaffTasks,
  addTaskSubtaskApi,
  toggleTaskSubtaskApi,
  deleteTaskSubtaskApi,
  addTaskAttachmentApi,
  deleteTaskAttachmentApi,
  checkOverdueTasksApi,
  downloadJiraCsv
} from '../../utils/staffTasksApi';
import DatePicker from '../DatePicker';

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

export const STAGES = [
  { id: 'todo', label: 'To Do', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)' },
  { id: 'in_progress', label: 'In Progress', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.2)' },
  { id: 'in_review', label: 'In Review', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)' },
  { id: 'done', label: 'Done', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)' }
];

export const PRIORITIES = [
  { id: 'lowest', label: 'Lowest', color: '#94A3B8', icon: '🔽' },
  { id: 'low', label: 'Low', color: '#38BDF8', icon: '🔽' },
  { id: 'medium', label: 'Medium', color: '#FBBF24', icon: '➖' },
  { id: 'high', label: 'High', color: '#F97316', icon: '🔼' },
  { id: 'highest', label: 'Highest', color: '#EF4444', icon: '🔺' }
];

// ──────────────────────────────────────────
// STYLED COMPONENTS
// ──────────────────────────────────────────

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  color: ${portalTheme.colors.textPrimary};
`;

const TopControlBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 16px 20px;
  backdrop-filter: blur(12px);
`;

const LeftControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 12px;
    color: ${portalTheme.colors.textMuted};
    font-size: 0.85rem;
  }

  input {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: ${portalTheme.radii.sm};
    padding: 8px 14px 8px 34px;
    color: #fff;
    font-size: 0.88rem;
    outline: none;
    width: 220px;
    transition: all 0.2s;

    &:focus {
      border-color: rgba(123, 31, 46, 0.8);
      width: 260px;
      background: rgba(255, 255, 255, 0.07);
    }

    &::placeholder {
      color: ${portalTheme.colors.textMuted};
    }
  }
`;

const FilterSelect = styled.select`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${portalTheme.radii.sm};
  padding: 8px 12px;
  color: #fff;
  font-size: 0.84rem;
  outline: none;
  cursor: pointer;

  option {
    background: #11131a;
    color: #fff;
  }

  &:focus {
    border-color: rgba(123, 31, 46, 0.8);
  }
`;

const ViewToggleGroup = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  padding: 3px;
  border-radius: ${portalTheme.radii.sm};
  border: 1px solid rgba(255, 255, 255, 0.08);
  gap: 2px;
`;

const ViewToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.5)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : portalTheme.colors.textMuted};
  border: 1px solid ${props => props.$active ? 'rgba(123, 31, 46, 0.8)' : 'transparent'};
  transition: all 0.15s;

  &:hover {
    color: #fff;
  }
`;

const CreateTaskButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #7B1F2E 0%, #a8263c 100%);
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: ${portalTheme.radii.sm};
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(123, 31, 46, 0.4);

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.1);
  }
`;

const ExportCsvButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 9px 16px;
  border-radius: ${portalTheme.radii.sm};
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    color: #38BDF8;
  }
`;

const OverdueAlertBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.16) 0%, rgba(245, 158, 11, 0.12) 100%);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: ${portalTheme.radii.md};
  padding: 12px 18px;
  color: #fff;

  .left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;

    svg {
      color: #EF4444;
      font-size: 1.1rem;
    }

    strong {
      color: #F87171;
    }
  }

  .right {
    display: flex;
    align-items: center;
    gap: 10px;

    .filter-overdue-btn {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fff;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: rgba(239, 68, 68, 0.35);
      }
    }

    .notify-btn {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #FDE047;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: rgba(245, 158, 11, 0.35);
      }
    }
  }
`;

const SubtaskBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: ${props => props.$allDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.12)'};
  border: 1px solid ${props => props.$allDone ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.25)'};
  color: ${props => props.$allDone ? '#10B981' : '#38BDF8'};
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: ${portalTheme.radii.pill};
`;

const AttachmentBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.25);
  color: #C084FC;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: ${portalTheme.radii.pill};
`;

const SubtaskSectionWrapper = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: ${portalTheme.radii.md};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
    }

    .count-chip {
      font-size: 0.76rem;
      color: ${portalTheme.colors.textMuted};
      font-weight: 600;
    }
  }

  .subtasks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 220px;
    overflow-y: auto;
  }

  .add-subtask-form {
    display: flex;
    gap: 8px;
    margin-top: 4px;

    input {
      flex: 1;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 8px 12px;
      color: #fff;
      font-size: 0.84rem;
      outline: none;

      &:focus {
        border-color: rgba(56, 189, 248, 0.6);
      }
    }

    button {
      background: rgba(56, 189, 248, 0.18);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38BDF8;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;

      &:hover:not(:disabled) {
        background: rgba(56, 189, 248, 0.28);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
`;

const SubtaskProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;

  .bar {
    width: ${props => Math.min(100, Math.max(0, props.$percent || 0))}%;
    height: 100%;
    background: ${props => props.$percent === 100 ? '#10B981' : '#38BDF8'};
    border-radius: 999px;
    transition: width 0.3s ease;
  }
`;

const SubtaskItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  input[type="checkbox"] {
    accent-color: #38BDF8;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .item-title {
    flex: 1;
    font-size: 0.85rem;
    color: ${props => props.$done ? portalTheme.colors.textMuted : '#fff'};
    text-decoration: ${props => props.$done ? 'line-through' : 'none'};
    cursor: pointer;
    user-select: none;
  }

  .delete-subtask-btn {
    background: none;
    border: none;
    color: ${portalTheme.colors.textMuted};
    cursor: pointer;
    font-size: 0.8rem;
    padding: 3px;
    border-radius: 4px;
    opacity: 0.6;
    transition: all 0.15s;

    &:hover {
      opacity: 1;
      color: #EF4444;
      background: rgba(239, 68, 68, 0.1);
    }
  }
`;

const AttachmentsSectionWrapper = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: ${portalTheme.radii.md};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
    }

    .upload-btn-label {
      background: rgba(168, 85, 247, 0.18);
      border: 1px solid rgba(168, 85, 247, 0.35);
      color: #C084FC;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;

      &:hover {
        background: rgba(168, 85, 247, 0.28);
      }

      .spin {
        animation: spin 1s linear infinite;
      }
    }
  }

  .attachments-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 220px;
    overflow-y: auto;
  }
`;

const EmptyAttachmentDrop = styled.div`
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  color: ${portalTheme.colors.textMuted};
  font-size: 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(168, 85, 247, 0.4);
    background: rgba(168, 85, 247, 0.04);
    color: #fff;
  }
`;

const AttachmentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 14px;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .icon-col {
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
  }

  .meta-col {
    flex: 1;
    min-width: 0;

    .att-name {
      display: block;
      color: #fff;
      font-size: 0.86rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-decoration: none;

      &:hover {
        color: #38BDF8;
        text-decoration: underline;
      }
    }

    .att-info {
      display: flex;
      gap: 6px;
      font-size: 0.72rem;
      color: ${portalTheme.colors.textMuted};
      margin-top: 2px;
    }
  }

  .actions-col {
    display: flex;
    align-items: center;
    gap: 6px;

    .action-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: ${portalTheme.colors.textMuted};
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.76rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }

      &.delete-btn:hover {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.3);
        color: #EF4444;
      }
    }
  }
`;

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getAttachmentIcon(type = '', name = '') {
  const lowerName = (name || '').toLowerCase();
  const lowerType = (type || '').toLowerCase();
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return <FaFilePdf color="#EF4444" />;
  }
  if (lowerType.includes('image') || lowerName.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) {
    return <FaFileImage color="#38BDF8" />;
  }
  return <FaPaperclip color="#A855F7" />;
}

// ──────────────────────────────────────────
// KANBAN BOARD GRID
// ──────────────────────────────────────────

const KanbanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  align-items: flex-start;
  min-height: 600px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  background: ${props => props.$bg || 'rgba(17, 19, 26, 0.65)'};
  border: 1px solid ${props => props.$border || portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  display: flex;
  flex-direction: column;
  min-height: 520px;
  backdrop-filter: blur(8px);
  overflow: hidden;
  transition: border-color 0.2s;

  &.drag-over {
    border-color: #38BDF8;
    background: rgba(56, 189, 248, 0.05);
  }
`;

const ColumnHeader = styled.div`
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .left {
    display: flex;
    align-items: center;
    gap: 8px;

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${props => props.$color};
    }

    h3 {
      font-size: 0.92rem;
      font-weight: 700;
      margin: 0;
      color: #fff;
    }

    .badge {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 7px;
      border-radius: ${portalTheme.radii.pill};
      font-size: 0.72rem;
      font-weight: 700;
      color: ${props => props.$color};
    }
  }

  .quick-add {
    background: none;
    border: none;
    color: ${portalTheme.colors.textMuted};
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;

    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
    }
  }
`;

const ColumnCardList = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 280px);

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

// ──────────────────────────────────────────
// TASK CARD
// ──────────────────────────────────────────

const TaskCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${props => props.$isRunning ? 'rgba(16, 185, 129, 0.6)' : portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.md};
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: grab;
  position: relative;
  transition: all 0.2s ease;
  box-shadow: ${props => props.$isRunning ? '0 0 16px rgba(16, 185, 129, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.2)'};

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => props.$isRunning ? '#10B981' : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  &:active {
    cursor: grabbing;
  }
`;

const CardTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  .key {
    font-family: monospace;
    font-size: 0.76rem;
    font-weight: 700;
    color: #38BDF8;
    background: rgba(56, 189, 248, 0.12);
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .meta-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const PriorityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${props => props.$color || '#fff'};
`;

const CardTitle = styled.h4`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.35;
  cursor: pointer;

  &:hover {
    color: #38BDF8;
  }
`;

const CardDescription = styled.p`
  margin: 0;
  font-size: 0.78rem;
  color: ${portalTheme.colors.textMuted};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ProjectTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  color: ${portalTheme.colors.textSecondary};
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$color || '#7B1F2E'};
  }
`;

const DueDateBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: ${props => props.$overdue ? 'rgba(239, 68, 68, 0.15)' : (props.$today ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)')};
  color: ${props => props.$overdue ? '#EF4444' : (props.$today ? '#F59E0B' : portalTheme.colors.textMuted)};
  border: 1px solid ${props => props.$overdue ? 'rgba(239, 68, 68, 0.3)' : (props.$today ? 'rgba(245, 158, 11, 0.3)' : 'transparent')};
`;

const ProgressTrack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    color: ${portalTheme.colors.textMuted};
    font-family: monospace;
  }

  .bar-bg {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: ${props => props.$percent >= 100 ? '#10B981' : (props.$percent >= 80 ? '#F59E0B' : '#38BDF8')};
    width: ${props => Math.min(100, props.$percent)}%;
    transition: width 0.3s ease;
  }
`;

const CardBottomBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const AssigneePill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: ${portalTheme.colors.textSecondary};

  .avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(123, 31, 46, 0.6);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 700;
  }
`;

const CardActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StageMoveBtn = styled.button`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: ${portalTheme.colors.textMuted};
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.7rem;
  transition: all 0.15s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
  }
`;

const LiveTrackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: ${portalTheme.radii.sm};
  font-size: 0.74rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => props.$isRunning
    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
    : 'linear-gradient(135deg, #10B981, #059669)'};
  color: #fff;
  animation: ${props => props.$isRunning ? pulseGlow : 'none'} 2s infinite;

  &:hover {
    filter: brightness(1.1);
  }
`;

// ──────────────────────────────────────────
// TIMELINE / ROADMAP VIEW
// ──────────────────────────────────────────

const TimelineContainer = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 20px;
  overflow-x: auto;
  backdrop-filter: blur(12px);
`;

const TimelineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: #fff;
  }
`;

const TimelineTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th {
    text-align: left;
    padding: 10px 14px;
    color: ${portalTheme.colors.textMuted};
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const TimelineGanttBar = styled.div`
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 8px;

  .bar-span {
    position: absolute;
    top: 0;
    bottom: 0;
    left: ${props => props.$left || 0}%;
    width: ${props => props.$width || 30}%;
    background: ${props => props.$bg || '#38BDF8'};
    opacity: 0.85;
    border-radius: 4px;
  }

  .bar-text {
    position: relative;
    z-index: 2;
    font-size: 0.74rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }
`;

// ──────────────────────────────────────────
// MODALS & DRAWERS
// ──────────────────────────────────────────

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #11131a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${portalTheme.radii.lg};
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 14px;

  h2 {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0;
    color: #fff;
  }

  .close-btn {
    background: none;
    border: none;
    color: ${portalTheme.colors.textMuted};
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px;

    &:hover {
      color: #fff;
    }
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${portalTheme.colors.textSecondary};
  }

  input, textarea, select {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: ${portalTheme.radii.sm};
    padding: 10px 14px;
    color: #fff;
    font-size: 0.9rem;
    outline: none;

    &:focus {
      border-color: rgba(123, 31, 46, 0.8);
      background: rgba(255, 255, 255, 0.07);
    }
  }

  textarea {
    min-height: 90px;
    resize: vertical;
  }

  select option {
    background: #11131a;
    color: #fff;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

// ──────────────────────────────────────────
// COMPONENT IMPLEMENTATION
// ──────────────────────────────────────────

export default function JiraBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'timeline', 'list'

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Active Timer state
  const [activeTimer, setActiveTimer] = useState(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const liveTickerRef = useRef(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Manual time log form inside Task Detail Modal
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNote, setManualNote] = useState('');

  // Form state for Create Task
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState('todo');
  const [newPriority, setNewPriority] = useState('medium');
  const [newProjectId, setNewProjectId] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDueDate, setNewDueDate] = useState('');
  const [newEstimatedHours, setNewEstimatedHours] = useState('2');

  // Load Tasks and Projects
  const loadData = async () => {
    try {
      const token = await getAuthToken(user);
      if (!token) return;

      const [tasksData, loadedProjects, trackerData] = await Promise.all([
        fetchStaffTasksData(token, {
          priority: priorityFilter,
          assigneeId: assigneeFilter,
          projectId: projectFilter,
          search: searchQuery
        }).catch(() => ({ tasks: [], assignees: [] })),
        fetchProjects(token).catch(() => []),
        fetchTrackerData(token).catch(() => ({ activeTimer: null }))
      ]);

      setTasks(tasksData.tasks || []);
      setAssignees(tasksData.assignees || []);
      setProjects(loadedProjects);

      if (trackerData.activeTimer) {
        setActiveTimer(trackerData.activeTimer);
        setLiveElapsed(trackerData.activeTimer.elapsed_seconds || 0);
      } else {
        setActiveTimer(null);
        setLiveElapsed(0);
      }
    } catch (err) {
      console.error('Failed to load Jira board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, priorityFilter, assigneeFilter, projectFilter, searchQuery]);

  // Live second ticking for running task
  useEffect(() => {
    if (activeTimer) {
      liveTickerRef.current = setInterval(() => {
        setLiveElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (liveTickerRef.current) clearInterval(liveTickerRef.current);
    }
    return () => {
      if (liveTickerRef.current) clearInterval(liveTickerRef.current);
    };
  }, [activeTimer]);

  // Handle Quick Timer Start / Stop on Task Card
  const handleToggleTimer = async (task, e) => {
    e?.stopPropagation();
    try {
      const token = await getAuthToken(user);
      const isThisRunning = Boolean(activeTimer && activeTimer.task_id === task.id);

      if (isThisRunning) {
        await stopTaskTimer(token, activeTimer.id);
        toast.success(`Stopped timer on ${task.task_key}`);
        setActiveTimer(null);
      } else {
        const res = await startTaskTimer(token, {
          projectId: task.project_id,
          taskId: task.id,
          description: task.title,
          billable: false
        });
        toast.success(`Started tracking ${task.task_key}`);
        setActiveTimer(res.entry);
        setLiveElapsed(0);
      }
      loadData();
      if (selectedTask?.id === task.id) {
        openTaskDetails(task.id);
      }
    } catch (err) {
      toast.error(err.message || 'Timer action failed');
    }
  };

  // Move task to next or previous stage
  const handleMoveStage = async (task, direction, e) => {
    e?.stopPropagation();
    const stageIds = STAGES.map(s => s.id);
    const currentIndex = stageIds.indexOf(task.status);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0 || newIndex >= stageIds.length) return;
    const nextStatus = stageIds[newIndex];

    try {
      const token = await getAuthToken(user);
      await updateStaffTask(token, task.id, { status: nextStatus });
      toast.success(`Moved to ${STAGES[newIndex].label}`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to move task');
    }
  };

  // Open Task Detail
  const openTaskDetails = async (taskId) => {
    try {
      setLoadingDetails(true);
      const token = await getAuthToken(user);
      const details = await fetchTaskDetails(token, taskId);
      setSelectedTask(details.task);
      setTaskDetails(details);
    } catch (err) {
      toast.error(err.message || 'Failed to open task');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const token = await getAuthToken(user);
      await createStaffTask(token, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: newStatus,
        priority: newPriority,
        project_id: newProjectId || null,
        assignee_id: newAssigneeId || user?.id,
        start_date: newStartDate || null,
        due_date: newDueDate || null,
        estimated_hours: parseFloat(newEstimatedHours) || 0
      });

      toast.success('Task created successfully');
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewAssigneeId('');
      setNewEstimatedHours('2');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  // Update Task Detail in Modal
  const handleUpdateTaskField = async (taskId, updates) => {
    try {
      const token = await getAuthToken(user);
      const updated = await updateStaffTask(token, taskId, updates);
      setSelectedTask(updated);
      toast.success('Task updated');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const token = await getAuthToken(user);
      await deleteStaffTask(token, taskId);
      toast.success('Task deleted');
      setSelectedTask(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  // Manual Time Log inside Task Detail Modal
  const handleLogManualTime = async () => {
    if (!manualMinutes || isNaN(manualMinutes) || Number(manualMinutes) <= 0) {
      toast.error('Enter valid minutes');
      return;
    }

    try {
      const token = await getAuthToken(user);
      const seconds = Math.floor(Number(manualMinutes) * 60);
      await logManualTime(token, {
        projectId: selectedTask.project_id,
        taskId: selectedTask.id,
        description: manualNote.trim() || selectedTask.title,
        durationSeconds: seconds
      });

      toast.success(`Logged ${manualMinutes}m to ${selectedTask.task_key}`);
      setManualMinutes('');
      setManualNote('');
      openTaskDetails(selectedTask.id);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to log time');
    }
  };

  // Drag and Drop support
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e, columnStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    try {
      const token = await getAuthToken(user);
      await updateStaffTask(token, taskId, { status: columnStatus });
      toast.success(`Moved to ${STAGES.find(s => s.id === columnStatus)?.label || columnStatus}`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Drop action failed');
    }
  };

  // Subtasks & Attachments & Overdue
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const [onlyOverdueFilter, setOnlyOverdueFilter] = useState(false);

  // Subtask handlers
  const handleAddSubtask = async (e) => {
    e?.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed || !selectedTask) return;

    try {
      const token = await getAuthToken(user);
      const updated = await addTaskSubtaskApi(token, selectedTask.id, trimmed);
      setSelectedTask(updated);
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, subtasks: updated.subtasks } : t));
      setNewSubtaskTitle('');
      toast.success('Sub-task added');
    } catch (err) {
      toast.error('Failed to add subtask: ' + err.message);
    }
  };

  const handleToggleSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const token = await getAuthToken(user);
      const updated = await toggleTaskSubtaskApi(token, selectedTask.id, subtaskId);
      setSelectedTask(updated);
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, subtasks: updated.subtasks } : t));
    } catch (err) {
      toast.error('Failed to update subtask: ' + err.message);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const token = await getAuthToken(user);
      const updated = await deleteTaskSubtaskApi(token, selectedTask.id, subtaskId);
      setSelectedTask(updated);
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, subtasks: updated.subtasks } : t));
      toast.success('Sub-task removed');
    } catch (err) {
      toast.error('Failed to remove subtask: ' + err.message);
    }
  };

  // Attachment handlers
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedTask) return;

    setUploadingFile(true);
    try {
      const token = await getAuthToken(user);
      for (const file of files) {
        let fileUrl = '';
        const fileExt = file.name.split('.').pop();
        const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `task_attachments/${cleanName}`;

        try {
          const { error: upErr } = await supabase.storage
            .from('task_files')
            .upload(filePath, file);

          if (!upErr) {
            const { data: pUrl } = supabase.storage.from('task_files').getPublicUrl(filePath);
            fileUrl = pUrl?.publicUrl || '';
          }
        } catch (_) {}

        if (!fileUrl) {
          fileUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        const attachmentMeta = {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: fileUrl,
          path: filePath
        };

        const updated = await addTaskAttachmentApi(token, selectedTask.id, attachmentMeta);
        setSelectedTask(updated);
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, attachments: updated.attachments } : t));
      }
      toast.success('File(s) attached successfully');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!selectedTask) return;
    try {
      const token = await getAuthToken(user);
      const updated = await deleteTaskAttachmentApi(token, selectedTask.id, attachmentId);
      setSelectedTask(updated);
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, attachments: updated.attachments } : t));
      toast.success('Attachment removed');
    } catch (err) {
      toast.error('Failed to remove attachment: ' + err.message);
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const listToExport = onlyOverdueFilter ? tasks.filter(t => t.is_overdue) : tasks;
    if (!listToExport || listToExport.length === 0) {
      toast.error('No tasks available to export.');
      return;
    }
    downloadJiraCsv(listToExport, `deepskills-jira-tasks-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${listToExport.length} task(s) to CSV!`);
  };

  // Overdue notification check
  const handleCheckOverdueAlerts = async () => {
    try {
      const token = await getAuthToken(user);
      const res = await checkOverdueTasksApi(token);
      if (res.count > 0) {
        toast.success(`Dispatched overdue alerts for ${res.count} task(s)!`);
      } else {
        toast.success('All tasks are within deadlines.');
      }
    } catch (err) {
      toast.error('Failed to check overdue alerts: ' + err.message);
    }
  };

  const overdueCount = useMemo(() => {
    return tasks.filter(t => t.is_overdue).length;
  }, [tasks]);

  // Group tasks by status for Kanban
  const groupedTasks = useMemo(() => {
    const map = { todo: [], in_progress: [], in_review: [], done: [] };
    const list = onlyOverdueFilter ? tasks.filter(t => t.is_overdue) : tasks;
    list.forEach(t => {
      if (map[t.status]) {
        map[t.status].push(t);
      } else {
        map.todo.push(t);
      }
    });
    return map;
  }, [tasks, onlyOverdueFilter]);

  return (
    <BoardContainer>
      {/* ── TOP CONTROL BAR ── */}
      <TopControlBar>
        <LeftControls>
          <SearchBox>
            <FaSearch />
            <input
              type="text"
              placeholder="Search tasks, keys, descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchBox>

          <FilterSelect value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            {PRIORITIES.map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
            ))}
          </FilterSelect>

          <FilterSelect value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="all">All Staff</option>
            <option value="my">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
            {assignees.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </FilterSelect>

          {projects.length > 0 && (
            <FilterSelect value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </FilterSelect>
          )}

          <FilterSelect value={onlyOverdueFilter ? 'overdue' : 'all_status'} onChange={(e) => setOnlyOverdueFilter(e.target.value === 'overdue')}>
            <option value="all_status">All Deadlines</option>
            <option value="overdue">⚠️ Overdue Only ({overdueCount})</option>
          </FilterSelect>
        </LeftControls>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ViewToggleGroup>
            <ViewToggleButton
              $active={viewMode === 'kanban'}
              onClick={() => setViewMode('kanban')}
              title="Kanban Board View"
            >
              <FaColumns /> Board
            </ViewToggleButton>
            <ViewToggleButton
              $active={viewMode === 'timeline'}
              onClick={() => setViewMode('timeline')}
              title="Timeline & Roadmap View"
            >
              <FaStream /> Timeline
            </ViewToggleButton>
            <ViewToggleButton
              $active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <FaList /> List
            </ViewToggleButton>
          </ViewToggleGroup>

          <ExportCsvButton onClick={handleExportCsv} title="Download CSV report for management and Jira review">
            <FaFileExport /> Export CSV
          </ExportCsvButton>

          <CreateTaskButton onClick={() => setIsCreateOpen(true)}>
            <FaPlus /> Create Task
          </CreateTaskButton>
        </div>
      </TopControlBar>

      {/* ── OVERDUE ALERT BANNER ── */}
      {overdueCount > 0 && !onlyOverdueFilter && (
        <OverdueAlertBanner>
          <div className="left">
            <FaExclamationTriangle />
            <span>
              <strong>{overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue!</strong> Target delivery dates have passed without completion.
            </span>
          </div>
          <div className="right">
            <button className="filter-overdue-btn" onClick={() => setOnlyOverdueFilter(true)}>
              Show Overdue ({overdueCount})
            </button>
            <button className="notify-btn" onClick={handleCheckOverdueAlerts} title="Send In-App Bell and Email Notifications">
              🔔 Dispatch Overdue Alerts
            </button>
          </div>
        </OverdueAlertBanner>
      )}

      {onlyOverdueFilter && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 16px', color: '#F87171', fontSize: '0.86rem' }}>
          <span>Showing <strong>Overdue Tasks Only</strong> ({overdueCount})</span>
          <button
            onClick={() => setOnlyOverdueFilter(false)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* ── VIEW 1: KANBAN BOARD ── */}
      {viewMode === 'kanban' && (
        <KanbanGrid>
          {STAGES.map((stage) => {
            const columnTasks = groupedTasks[stage.id] || [];
            return (
              <Column
                key={stage.id}
                $bg={stage.bg}
                $border={stage.border}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <ColumnHeader $color={stage.color}>
                  <div className="left">
                    <span className="dot" />
                    <h3>{stage.label}</h3>
                    <span className="badge">{columnTasks.length}</span>
                  </div>
                  <button
                    className="quick-add"
                    title={`Add task to ${stage.label}`}
                    onClick={() => {
                      setNewStatus(stage.id);
                      setIsCreateOpen(true);
                    }}
                  >
                    <FaPlus />
                  </button>
                </ColumnHeader>

                <ColumnCardList>
                  {columnTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: portalTheme.colors.textMuted, fontSize: '0.8rem' }}>
                      No tasks in {stage.label}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isRunning = Boolean(activeTimer && activeTimer.task_id === task.id);
                      const priorityObj = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[2];
                      const totalSeconds = isRunning
                        ? (task.total_logged_seconds || 0) + liveElapsed
                        : (task.total_logged_seconds || 0);

                      const estSeconds = (Number(task.estimated_hours) || 0) * 3600;
                      const progressPercent = estSeconds > 0 ? Math.round((totalSeconds / estSeconds) * 100) : 0;

                      return (
                        <TaskCard
                          key={task.id}
                          $isRunning={isRunning}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => openTaskDetails(task.id)}
                        >
                          <CardTopRow>
                            <span className="key" onClick={() => openTaskDetails(task.id)}>
                              {task.task_key}
                            </span>
                            <div className="meta-right">
                              <PriorityBadge $color={priorityObj.color} title={`Priority: ${priorityObj.label}`}>
                                {priorityObj.icon} {priorityObj.label}
                              </PriorityBadge>
                            </div>
                          </CardTopRow>

                          <CardTitle onClick={() => openTaskDetails(task.id)}>
                            {task.title}
                          </CardTitle>

                          {task.description && (
                            <CardDescription>{task.description}</CardDescription>
                          )}

                          {task.staff_time_projects && (
                            <ProjectTag $color={task.staff_time_projects.color}>
                              <span className="dot" />
                              {task.staff_time_projects.name}
                            </ProjectTag>
                          )}

                          {task.due_date && (
                            <DueDateBadge $overdue={task.is_overdue} $today={task.is_due_today}>
                              <FaCalendarAlt />
                              {task.is_overdue ? `Overdue: ${task.due_date}` : (task.is_due_today ? 'Due Today' : `Due: ${task.due_date}`)}
                            </DueDateBadge>
                          )}

                          {/* Subtasks and Attachments mini-badges */}
                          {((Array.isArray(task.subtasks) && task.subtasks.length > 0) || (Array.isArray(task.attachments) && task.attachments.length > 0)) && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                              {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (() => {
                                const doneCount = task.subtasks.filter(s => s.done).length;
                                const totalCount = task.subtasks.length;
                                return (
                                  <SubtaskBadge $allDone={doneCount === totalCount} title={`Checklist: ${doneCount}/${totalCount} completed`}>
                                    <FaCheckSquare /> {doneCount}/{totalCount}
                                  </SubtaskBadge>
                                );
                              })()}

                              {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                                <AttachmentBadge title={`${task.attachments.length} attachment(s)`}>
                                  <FaPaperclip /> {task.attachments.length}
                                </AttachmentBadge>
                              )}
                            </div>
                          )}

                          {/* Time progress bar */}
                          {estSeconds > 0 && (
                            <ProgressTrack $percent={progressPercent}>
                              <div className="progress-info">
                                <span>{formatSeconds(totalSeconds)}</span>
                                <span>{task.estimated_hours}h est ({progressPercent}%)</span>
                              </div>
                              <div className="bar-bg">
                                <div className="bar-fill" />
                              </div>
                            </ProgressTrack>
                          )}

                          <CardBottomBar>
                            <AssigneePill>
                              <div className="avatar">
                                {(task.assignee_name || 'U').slice(0, 1).toUpperCase()}
                              </div>
                              <span>{task.assignee_name || 'Unassigned'}</span>
                            </AssigneePill>

                            <CardActionButtons>
                              {/* 1-Click Live Timer Button */}
                              <LiveTrackBtn
                                $isRunning={isRunning}
                                onClick={(e) => handleToggleTimer(task, e)}
                                title={isRunning ? 'Stop Timer' : 'Start Timer on Task'}
                              >
                                {isRunning ? (
                                  <>
                                    <FaStop /> {formatSeconds(liveElapsed)}
                                  </>
                                ) : (
                                  <>
                                    <FaPlay /> Track
                                  </>
                                )}
                              </LiveTrackBtn>

                              {/* Stage shifter arrows */}
                              {stage.id !== 'todo' && (
                                <StageMoveBtn
                                  title="Move Left"
                                  onClick={(e) => handleMoveStage(task, 'prev', e)}
                                >
                                  <FaArrowLeft />
                                </StageMoveBtn>
                              )}
                              {stage.id !== 'done' && (
                                <StageMoveBtn
                                  title="Move Right"
                                  onClick={(e) => handleMoveStage(task, 'next', e)}
                                >
                                  <FaArrowRight />
                                </StageMoveBtn>
                              )}
                            </CardActionButtons>
                          </CardBottomBar>
                        </TaskCard>
                      );
                    })
                  )}
                </ColumnCardList>
              </Column>
            );
          })}
        </KanbanGrid>
      )}

      {/* ── VIEW 2: TIMELINE / ROADMAP ── */}
      {viewMode === 'timeline' && (
        <TimelineContainer>
          <TimelineHeader>
            <div>
              <h3>Task Timeline & Delivery Roadmap</h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: portalTheme.colors.textMuted }}>
                Visual schedules, start to due date delivery spans, and logged effort.
              </p>
            </div>
          </TimelineHeader>

          <TimelineTable>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Key</th>
                <th style={{ minWidth: '220px' }}>Task Title</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '90px' }}>Priority</th>
                <th style={{ width: '120px' }}>Assignee</th>
                <th style={{ width: '110px' }}>Start Date</th>
                <th style={{ width: '110px' }}>Due Date</th>
                <th style={{ minWidth: '240px' }}>Timeline & Progress</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(onlyOverdueFilter ? tasks.filter(t => t.is_overdue) : tasks).map(task => {
                const isRunning = Boolean(activeTimer && activeTimer.task_id === task.id);
                const priorityObj = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[2];
                const stageObj = STAGES.find(s => s.id === task.status) || STAGES[0];
                const totalSeconds = isRunning
                  ? (task.total_logged_seconds || 0) + liveElapsed
                  : (task.total_logged_seconds || 0);

                const estHours = Number(task.estimated_hours) || 0;
                const loggedHours = totalSeconds / 3600;
                const percent = estHours > 0 ? Math.min(100, Math.round((loggedHours / estHours) * 100)) : 100;

                return (
                  <tr key={task.id} onClick={() => openTaskDetails(task.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8' }}>
                        {task.task_key}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px' }}>
                        {task.staff_time_projects && (
                          <span style={{ fontSize: '0.72rem', color: portalTheme.colors.textMuted }}>
                            {task.staff_time_projects.name}
                          </span>
                        )}
                        {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <FaCheckSquare /> {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
                          </span>
                        )}
                        {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#C084FC', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <FaPaperclip /> {task.attachments.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: stageObj.bg,
                        color: stageObj.color,
                        border: `1px solid ${stageObj.border}`
                      }}>
                        {stageObj.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: priorityObj.color, fontSize: '0.78rem', fontWeight: 600 }}>
                        {priorityObj.icon} {priorityObj.label}
                      </span>
                    </td>
                    <td>{task.assignee_name || 'Unassigned'}</td>
                    <td style={{ color: portalTheme.colors.textMuted }}>{task.start_date || '—'}</td>
                    <td>
                      {task.due_date ? (
                        <DueDateBadge $overdue={task.is_overdue} $today={task.is_due_today}>
                          {task.due_date}
                        </DueDateBadge>
                      ) : (
                        <span style={{ color: portalTheme.colors.textMuted }}>No due date</span>
                      )}
                    </td>
                    <td>
                      <TimelineGanttBar $left={0} $width={percent} $bg={stageObj.color}>
                        <div className="bar-span" />
                        <span className="bar-text">
                          {formatSeconds(totalSeconds)} / {estHours}h ({percent}%)
                        </span>
                      </TimelineGanttBar>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <LiveTrackBtn
                        $isRunning={isRunning}
                        onClick={(e) => handleToggleTimer(task, e)}
                      >
                        {isRunning ? <FaStop /> : <FaPlay />}
                      </LiveTrackBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TimelineTable>
        </TimelineContainer>
      )}

      {/* ── VIEW 3: COMPACT LIST ── */}
      {viewMode === 'list' && (
        <TimelineContainer>
          <TimelineTable>
            <thead>
              <tr>
                <th>Key</th>
                <th>Title</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th>Logged Time</th>
                <th style={{ textAlign: 'right' }}>Timer</th>
              </tr>
            </thead>
            <tbody>
              {(onlyOverdueFilter ? tasks.filter(t => t.is_overdue) : tasks).map(task => {
                const isRunning = Boolean(activeTimer && activeTimer.task_id === task.id);
                const priorityObj = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[2];
                const stageObj = STAGES.find(s => s.id === task.status) || STAGES[0];
                const totalSeconds = isRunning
                  ? (task.total_logged_seconds || 0) + liveElapsed
                  : (task.total_logged_seconds || 0);

                return (
                  <tr key={task.id} onClick={() => openTaskDetails(task.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8' }}>
                      {task.task_key}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px' }}>
                        {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#38BDF8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <FaCheckSquare /> {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
                          </span>
                        )}
                        {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#C084FC', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <FaPaperclip /> {task.attachments.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: stageObj.bg,
                        color: stageObj.color
                      }}>
                        {stageObj.label}
                      </span>
                    </td>
                    <td style={{ color: priorityObj.color, fontWeight: 600, fontSize: '0.78rem' }}>
                      {priorityObj.icon} {priorityObj.label}
                    </td>
                    <td style={{ color: portalTheme.colors.textMuted }}>
                      {task.staff_time_projects?.name || '—'}
                    </td>
                    <td>{task.assignee_name || 'Unassigned'}</td>
                    <td>{task.due_date || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {formatSeconds(totalSeconds)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <LiveTrackBtn
                        $isRunning={isRunning}
                        onClick={(e) => handleToggleTimer(task, e)}
                      >
                        {isRunning ? <FaStop /> : <FaPlay />}
                      </LiveTrackBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TimelineTable>
        </TimelineContainer>
      )}

      {/* ── CREATE TASK MODAL ── */}
      <AnimatePresence>
        {isCreateOpen && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreateOpen(false)}
          >
            <ModalContent
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <h2>Create Jira Task</h2>
                <button className="close-btn" onClick={() => setIsCreateOpen(false)}>
                  <FaTimes />
                </button>
              </ModalHeader>

              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FormGroup>
                  <label>Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Follow up on Fall Semester Admissions inquiries"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <label>Description & Scope</label>
                  <textarea
                    placeholder="Detailed task description, checklist items, acceptance criteria..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </FormGroup>

                <FormRow>
                  <FormGroup>
                    <label>Initial Stage</label>
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      {STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup>
                    <label>Priority</label>
                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                      {PRIORITIES.map(p => (
                        <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                      ))}
                    </select>
                  </FormGroup>
                </FormRow>

                <FormRow>
                  <FormGroup>
                    <label>Project / Department Category</label>
                    <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
                      <option value="">General Work</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.department})</option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup>
                    <label>Assignee</label>
                    <select value={newAssigneeId} onChange={(e) => setNewAssigneeId(e.target.value)}>
                      <option value="">Assign to Me ({user?.name || user?.full_name || 'Myself'})</option>
                      {assignees.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.roleName})</option>
                      ))}
                    </select>
                  </FormGroup>
                </FormRow>

                <FormGroup>
                  <label>Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 4"
                    value={newEstimatedHours}
                    onChange={(e) => setNewEstimatedHours(e.target.value)}
                  />
                </FormGroup>

                <FormRow>
                  <FormGroup>
                    <label>Start Date</label>
                    <DatePicker
                      value={newStartDate}
                      max={newDueDate || undefined}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      aria-label="Start Date"
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Due Date</label>
                    <DatePicker
                      value={newDueDate}
                      min={newStartDate || undefined}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      aria-label="Due Date"
                    />
                  </FormGroup>
                </FormRow>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#fff',
                      padding: '10px 18px',
                      borderRadius: portalTheme.radii.sm,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                  <CreateTaskButton type="submit">
                    Create Task
                  </CreateTaskButton>
                </div>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── TASK DETAILS & TIME LOGS MODAL ── */}
      <AnimatePresence>
        {selectedTask && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTask(null)}
          >
            <ModalContent
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '820px' }}
            >
              <ModalHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#38BDF8',
                    background: 'rgba(56, 189, 248, 0.12)',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    {selectedTask.task_key}
                  </span>
                  <h2>{selectedTask.title}</h2>
                </div>
                <button className="close-btn" onClick={() => setSelectedTask(null)}>
                  <FaTimes />
                </button>
              </ModalHeader>

              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
                {/* Left Column: Details & Time Tracker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <FormGroup>
                    <label>Task Description</label>
                    <textarea
                      defaultValue={selectedTask.description}
                      onBlur={(e) => handleUpdateTaskField(selectedTask.id, { description: e.target.value })}
                      placeholder="Add details, subtasks, notes..."
                    />
                  </FormGroup>

                  {/* Sub-tasks & Checklist Section */}
                  {(() => {
                    const subtasksList = Array.isArray(selectedTask.subtasks) ? selectedTask.subtasks : [];
                    const completedSubtasksCount = subtasksList.filter(s => s.done).length;
                    const subtasksPercent = subtasksList.length > 0 ? Math.round((completedSubtasksCount / subtasksList.length) * 100) : 0;
                    return (
                      <SubtaskSectionWrapper>
                        <div className="section-head">
                          <div className="title">
                            <FaCheckSquare color="#38BDF8" />
                            <span>Sub-tasks & Checklist</span>
                          </div>
                          {subtasksList.length > 0 && (
                            <span className="count-chip">
                              {completedSubtasksCount} of {subtasksList.length} completed ({subtasksPercent}%)
                            </span>
                          )}
                        </div>

                        {subtasksList.length > 0 && (
                          <SubtaskProgressBar $percent={subtasksPercent}>
                            <div className="bar" />
                          </SubtaskProgressBar>
                        )}

                        <div className="subtasks-list">
                          {subtasksList.map((item) => (
                            <SubtaskItemRow key={item.id} $done={item.done}>
                              <input
                                type="checkbox"
                                checked={Boolean(item.done)}
                                onChange={() => handleToggleSubtask(item.id)}
                              />
                              <span className="item-title" onClick={() => handleToggleSubtask(item.id)}>
                                {item.title}
                              </span>
                              <button
                                type="button"
                                className="delete-subtask-btn"
                                onClick={() => handleDeleteSubtask(item.id)}
                                title="Remove item"
                              >
                                <FaTimes />
                              </button>
                            </SubtaskItemRow>
                          ))}
                          {subtasksList.length === 0 && (
                            <div style={{ color: portalTheme.colors.textMuted, fontSize: '0.8rem', fontStyle: 'italic' }}>
                              No sub-tasks added yet. Add items below to track step-by-step progress!
                            </div>
                          )}
                        </div>

                        <form onSubmit={handleAddSubtask} className="add-subtask-form">
                          <input
                            type="text"
                            placeholder="+ Add a subtask / checklist item..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          />
                          <button type="submit" disabled={!newSubtaskTitle.trim()}>
                            <FaPlus /> Add
                          </button>
                        </form>
                      </SubtaskSectionWrapper>
                    );
                  })()}

                  {/* Attachments Section */}
                  {(() => {
                    const attachmentsList = Array.isArray(selectedTask.attachments) ? selectedTask.attachments : [];
                    return (
                      <AttachmentsSectionWrapper>
                        <div className="section-head">
                          <div className="title">
                            <FaPaperclip color="#C084FC" />
                            <span>Attachments ({attachmentsList.length})</span>
                          </div>
                          <label className="upload-btn-label">
                            <input
                              type="file"
                              multiple
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              style={{ display: 'none' }}
                              accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.zip,.txt"
                            />
                            {uploadingFile ? (
                              <>
                                <FaSpinner className="spin" /> Uploading...
                              </>
                            ) : (
                              <>
                                <FaUpload /> Attach File
                              </>
                            )}
                          </label>
                        </div>

                        {attachmentsList.length === 0 && !uploadingFile && (
                          <EmptyAttachmentDrop onClick={() => fileInputRef.current?.click()}>
                            <FaUpload /> Click or drag files to attach PDFs, screenshots, or documents
                          </EmptyAttachmentDrop>
                        )}

                        {attachmentsList.length > 0 && (
                          <div className="attachments-list">
                            {attachmentsList.map((att) => (
                              <AttachmentCard key={att.id}>
                                <div className="icon-col">
                                  {getAttachmentIcon(att.type || '', att.name)}
                                </div>
                                <div className="meta-col">
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="att-name"
                                    title="Click to preview or download"
                                  >
                                    {att.name}
                                  </a>
                                  <div className="att-info">
                                    <span>{formatFileSize(att.size)}</span>
                                    {att.uploaded_at && (
                                      <span>• {new Date(att.uploaded_at).toLocaleDateString()}</span>
                                    )}
                                    {att.uploaded_by && <span>• by {att.uploaded_by}</span>}
                                  </div>
                                </div>
                                <div className="actions-col">
                                  <a
                                    href={att.url}
                                    download={att.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="action-btn"
                                    title="Download file"
                                  >
                                    <FaDownload />
                                  </a>
                                  <button
                                    type="button"
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteAttachment(att.id)}
                                    title="Delete attachment"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </AttachmentCard>
                            ))}
                          </div>
                        )}
                      </AttachmentsSectionWrapper>
                    );
                  })()}

                  {/* Task Live Timer Widget */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: portalTheme.radii.md,
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: portalTheme.colors.textMuted, fontWeight: 700 }}>
                        Live Task Timer
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, color: activeTimer?.task_id === selectedTask.id ? '#10B981' : '#fff' }}>
                        {activeTimer?.task_id === selectedTask.id ? formatSeconds(liveElapsed) : '00:00:00'}
                      </div>
                    </div>

                    <LiveTrackBtn
                      $isRunning={activeTimer?.task_id === selectedTask.id}
                      onClick={(e) => handleToggleTimer(selectedTask, e)}
                      style={{ padding: '8px 18px', fontSize: '0.86rem' }}
                    >
                      {activeTimer?.task_id === selectedTask.id ? (
                        <>
                          <FaStop /> Stop Timer
                        </>
                      ) : (
                        <>
                          <FaPlay /> Start Timer on Task
                        </>
                      )}
                    </LiveTrackBtn>
                  </div>

                  {/* Manual Time Log Form */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: portalTheme.radii.md,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: portalTheme.colors.textSecondary }}>
                      + Log Manual Time on this Task
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        placeholder="Minutes"
                        style={{
                          width: '100px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          color: '#fff',
                          outline: 'none'
                        }}
                        value={manualMinutes}
                        onChange={(e) => setManualMinutes(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Work notes / description..."
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          color: '#fff',
                          outline: 'none'
                        }}
                        value={manualNote}
                        onChange={(e) => setManualNote(e.target.value)}
                      />
                      <button
                        onClick={handleLogManualTime}
                        style={{
                          background: '#7B1F2E',
                          border: 'none',
                          color: '#fff',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        Log
                      </button>
                    </div>
                  </div>

                  {/* Time Entries History for this Task */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: portalTheme.colors.textMuted, marginBottom: '8px' }}>
                      Time Tracking History ({taskDetails?.entries?.length || 0} entries)
                    </div>
                    <div style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      {taskDetails?.entries?.map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div>
                            <span style={{ color: '#fff', fontWeight: 600 }}>{entry.description || 'Logged session'}</span>
                            <div style={{ color: portalTheme.colors.textMuted, fontSize: '0.72rem' }}>
                              {new Date(entry.start_time).toLocaleDateString()} at {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8' }}>
                            {formatSeconds(entry.duration_seconds)}
                          </span>
                        </div>
                      ))}
                      {(!taskDetails?.entries || taskDetails.entries.length === 0) && (
                        <div style={{ color: portalTheme.colors.textMuted, fontSize: '0.8rem' }}>
                          No time logged yet. Start the timer or log manual time above!
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Metadata & Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: portalTheme.radii.md }}>
                  <FormGroup>
                    <label>Stage</label>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => handleUpdateTaskField(selectedTask.id, { status: e.target.value })}
                    >
                      {STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup>
                    <label>Priority</label>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => handleUpdateTaskField(selectedTask.id, { priority: e.target.value })}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup>
                    <label>Assignee</label>
                    <select
                      value={selectedTask.assignee_id || ''}
                      onChange={(e) => {
                        const targetId = e.target.value || null;
                        const match = assignees.find(a => a.id === targetId);
                        handleUpdateTaskField(selectedTask.id, {
                          assignee_id: targetId,
                          assignee_name: match ? match.name : 'Unassigned',
                          assignee_email: match ? match.email : ''
                        });
                      }}
                    >
                      <option value="">Unassigned</option>
                      {assignees.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.roleName})</option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup>
                    <label>Project</label>
                    <select
                      value={selectedTask.project_id || ''}
                      onChange={(e) => handleUpdateTaskField(selectedTask.id, { project_id: e.target.value || null })}
                    >
                      <option value="">None / General</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup>
                    <label>Start Date</label>
                    <DatePicker
                      defaultValue={selectedTask.start_date || ''}
                      onChange={(e) => handleUpdateTaskField(selectedTask.id, { start_date: e.target.value || null })}
                      aria-label="Start Date"
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Due Date</label>
                    <DatePicker
                      defaultValue={selectedTask.due_date || ''}
                      onChange={(e) => handleUpdateTaskField(selectedTask.id, { due_date: e.target.value || null })}
                      aria-label="Due Date"
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      defaultValue={selectedTask.estimated_hours || 0}
                      onBlur={(e) => handleUpdateTaskField(selectedTask.id, { estimated_hours: parseFloat(e.target.value) || 0 })}
                    />
                  </FormGroup>

                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaTrash /> Delete Task
                    </button>
                  </div>
                </div>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </BoardContainer>
  );
}
