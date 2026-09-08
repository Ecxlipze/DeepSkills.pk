import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { 
  FaSync, FaDownload, FaSearch, FaExclamationCircle, 
  FaSlidersH, FaFilePdf, FaSave, FaTrophy, FaUserGraduate, 
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaEdit, 
  FaCalendarAlt, FaTasks, FaChartLine, FaAward, FaWhatsapp, 
  FaTimes, FaUndo, FaCheck, FaInfoCircle, FaChevronDown,
  FaTable, FaChartPie, FaFilter
} from 'react-icons/fa';

import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

import { SkeletonTable } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { downloadCsv } from '../utils/csvExport';
import { createTranscriptPdf, createTabulationSheetPdf } from '../utils/resultsPdf.js';
import { 
  calcResult, 
  resolveGrade, 
  getDefaultAssessmentWeights, 
  getDefaultGradingScale 
} from '../utils/resultUtils.js';

// ──────────────────────────────────────────
// Styled Components
// ──────────────────────────────────────────

const Container = styled.div`
  padding: 10px 0 40px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 22px 26px;

  .title-area {
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
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
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.primary {
    background: linear-gradient(135deg, #7B1F2E 0%, #9c283b 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(123, 31, 46, 0.35);
    &:hover { filter: brightness(1.15); transform: translateY(-1px); }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
    border-color: rgba(255, 255, 255, 0.1);
    &:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  }

  &.emerald {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.3);
    &:hover { background: rgba(16, 185, 129, 0.25); color: #fff; transform: translateY(-1px); }
  }

  &.gold {
    background: rgba(212, 175, 55, 0.15);
    color: #fbbf24;
    border-color: rgba(212, 175, 55, 0.3);
    &:hover { background: rgba(212, 175, 55, 0.25); color: #fff; transform: translateY(-1px); }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #111318;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      background: ${props => props.$accentBg || 'rgba(123, 31, 46, 0.15)'};
      color: ${props => props.$accentColor || '#7B1F2E'};
    }

    .pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }
  }

  h4 {
    color: #94a3b8;
    font-size: 0.8rem;
    margin: 0 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    font-size: 1.9rem;
    font-weight: 800;
    color: #fff;
    line-height: 1.2;
  }

  .sub {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 6px;
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border-radius: 14px;
  padding: 16px 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;

  .filter-top {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
    box-sizing: border-box;

    svg.search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      font-size: 0.88rem;
      pointer-events: none;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      background: #0d0f12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 38px 10px 38px;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      transition: all 0.2s;

      &::placeholder {
        color: #64748b;
      }

      &:focus {
        border-color: #7B1F2E;
        box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.25);
      }
    }

    .clear-search-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s;

      &:hover {
        color: #fff;
      }
    }
  }

  .batch-select-wrap {
    position: relative;
    flex-shrink: 0;
    width: 290px;
    max-width: 100%;
    box-sizing: border-box;

    @media (max-width: 992px) {
      width: 240px;
    }

    @media (max-width: 768px) {
      width: 100%;
    }

    select {
      width: 100%;
      box-sizing: border-box;
      background: #0d0f12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 34px 10px 14px;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      cursor: pointer;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      transition: all 0.2s;

      &:focus {
        border-color: #7B1F2E;
        box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.25);
      }

      option {
        background: #111318;
        color: #fff;
      }
    }

    .select-arrow {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      pointer-events: none;
      font-size: 0.75rem;
    }
  }

  .reset-filters-btn {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: all 0.2s;
    box-sizing: border-box;
    flex-shrink: 0;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fff;
      border-color: rgba(239, 68, 68, 0.4);
    }

    @media (max-width: 768px) {
      width: 100%;
      justify-content: center;
    }
  }

  .filter-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    width: 100%;
    box-sizing: border-box;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    box-sizing: border-box;

    @media (max-width: 768px) {
      width: 100%;
      justify-content: space-between;
    }

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
    }

    .group-label {
      font-size: 0.72rem;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
  }

  .toggle-pills {
    display: inline-flex;
    background: #0d0f12;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
    box-sizing: border-box;

    @media (max-width: 480px) {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    button {
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      border: 1px solid transparent;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      white-space: nowrap;
      box-sizing: border-box;

      &:hover {
        color: #fff;
      }

      &.active-exam {
        background: #7B1F2E;
        color: #fff;
        border-color: rgba(123, 31, 46, 0.5);
        box-shadow: 0 2px 8px rgba(123, 31, 46, 0.35);
      }

      &.active-view {
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border-color: rgba(168, 85, 247, 0.4);
        box-shadow: 0 2px 8px rgba(168, 85, 247, 0.25);
      }
    }
  }
`;

const UnsavedBanner = styled.div`
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 12px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  color: #fbbf24;

  .msg {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .actions {
    display: flex;
    gap: 10px;
  }
`;

const TableCard = styled.div`
  background: #111318;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 14px 18px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  th {
    font-size: 0.76rem;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 0.5px;
    background: #0e1014;
  }

  td {
    font-size: 0.88rem;
    color: #cbd5e1;
    vertical-align: middle;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }

  tr:last-child td {
    border: none;
  }
`;

const ScoreInput = styled.input`
  width: 65px;
  background: #0d0f12;
  border: 1px solid ${props => props.$modified ? '#fbbf24' : 'rgba(255, 255, 255, 0.12)'};
  border-radius: 6px;
  padding: 6px 8px;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  text-align: center;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: #7B1F2E;
    box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.25);
  }
`;

const GradeBadge = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${props => {
    switch (props.$grade) {
      case 'A+': return 'rgba(16, 185, 129, 0.18)';
      case 'A':  return 'rgba(34, 197, 94, 0.15)';
      case 'B':  return 'rgba(14, 165, 233, 0.15)';
      case 'C':  return 'rgba(245, 158, 11, 0.15)';
      case 'D':  return 'rgba(249, 115, 22, 0.15)';
      case 'F':  return 'rgba(239, 68, 68, 0.15)';
      default:   return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  color: ${props => {
    switch (props.$grade) {
      case 'A+': return '#34d399';
      case 'A':  return '#4ade80';
      case 'B':  return '#38bdf8';
      case 'C':  return '#fbbf24';
      case 'D':  return '#fb923c';
      case 'F':  return '#f87171';
      default:   return '#94a3b8';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$grade) {
      case 'A+': return 'rgba(16, 185, 129, 0.35)';
      case 'A':  return 'rgba(34, 197, 94, 0.3)';
      case 'B':  return 'rgba(14, 165, 233, 0.3)';
      case 'C':  return 'rgba(245, 158, 11, 0.3)';
      case 'D':  return 'rgba(249, 115, 22, 0.3)';
      case 'F':  return 'rgba(239, 68, 68, 0.3)';
      default:   return 'rgba(255, 255, 255, 0.1)';
    }
  }};
`;

const StatusPill = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.74rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: ${props => props.$passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
  color: ${props => props.$passed ? '#34d399' : '#f87171'};
  border: 1px solid ${props => props.$passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
`;

const RankBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 800;
  font-size: 0.85rem;
  color: ${props => {
    if (props.$rank === 1) return '#f59e0b';
    if (props.$rank === 2) return '#94a3b8';
    if (props.$rank === 3) return '#b45309';
    return '#64748b';
  }};
`;

const StudentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #7B1F2E;
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
  }

  .details {
    .name {
      font-weight: 700;
      color: #fff;
      font-size: 0.9rem;
    }
    .cnic {
      font-size: 0.74rem;
      color: #64748b;
    }
  }
`;

const ActionIconBtn = styled.button`
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  &.pdf {
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.3);
    background: rgba(245, 158, 11, 0.08);
    &:hover { background: rgba(245, 158, 11, 0.2); }
  }
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  width: 100%;
  max-width: ${props => props.$wide ? '780px' : '560px'};
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);

  .modal-header {
    padding: 22px 26px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    button {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 1.1rem;
      cursor: pointer;
      &:hover { color: #fff; }
    }
  }

  .modal-body {
    padding: 24px 26px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .modal-footer {
    padding: 18px 26px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: #0e1014;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.82rem;
    font-weight: 700;
    color: #94a3b8;
  }

  input, select, textarea {
    background: #0d0f12;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px 12px;
    color: #fff;
    font-size: 0.88rem;
    outline: none;

    &:focus {
      border-color: #7B1F2E;
    }
  }
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const AnalyticsCard = styled.div`
  background: #111318;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 22px;

  h3 {
    margin: 0 0 16px;
    font-size: 1.05rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const GradeBar = styled.div`
  margin-bottom: 14px;

  .bar-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
    font-weight: 700;
    margin-bottom: 6px;
    color: #cbd5e1;
  }

  .bar-track {
    height: 10px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: ${props => props.$color || '#7B1F2E'};
    border-radius: 6px;
    transition: width 0.5s ease;
  }
`;

// ──────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────

const AdminResults = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'results', 'full');

  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [examType, setExamType] = useState('midterm');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('marksheet'); // 'marksheet' | 'analytics'

  const [roster, setRoster] = useState([]);
  const [editedRows, setEditedRows] = useState({});
  const [stats, setStats] = useState({
    totalCandidates: 0,
    gradedCount: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
    classAverage: 0,
    highestScore: 0,
    gradeDistribution: { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }
  });

  const [weights, setWeights] = useState(getDefaultAssessmentWeights());
  const [gradingScale, setGradingScale] = useState(getDefaultGradingScale());

  const [recomputing, setRecomputing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [weightsForm, setWeightsForm] = useState(null);
  const [overrideStudent, setOverrideStudent] = useState(null);

  // Safe Token Resolver
  const getAuthToken = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const t = localStorage.getItem('token');
    if (t && typeof t === 'string' && t.trim() && t !== 'undefined' && t !== 'null') {
      return t.trim();
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch (_) {}
    const pt = localStorage.getItem('deepskill_session_token') || user?.sessionToken;
    if (pt && typeof pt === 'string' && pt.trim() && pt !== 'undefined' && pt !== 'null') {
      return pt.trim();
    }
    return null;
  }, [user?.sessionToken]);

  // Direct Supabase Fallback Query
  const loadFromSupabase = useCallback(async () => {
    const [bRes, admRes, rRes, sRes] = await Promise.all([
      supabase.from('batches').select('id, batch_name, course, time_shift, status').order('batch_name', { ascending: true }),
      supabase.from('admissions').select('id, name, cnic, phone, email, course, batch, photo_url, status').in('status', ['Active', 'Graduated']).order('name', { ascending: true }),
      supabase.from('results').select('*').eq('exam_type', examType).order('total_marks', { ascending: false }),
      supabase.from('app_settings').select('value').eq('key', 'academic_assessment_weights').maybeSingle()
    ]);

    const allBatches = bRes.data || [];
    const allAdmissions = admRes.data || [];
    const allResults = rRes.data || [];
    const savedSettings = sRes.data?.value;

    setBatches(allBatches);

    if (savedSettings?.midterm || savedSettings?.finalterm) {
      setWeights({
        midterm: { ...getDefaultAssessmentWeights().midterm, ...(savedSettings.midterm || {}) },
        finalterm: { ...getDefaultAssessmentWeights().finalterm, ...(savedSettings.finalterm || {}) },
        passingMarks: savedSettings.passingMarks !== undefined ? Number(savedSettings.passingMarks) : 50
      });
    }
    if (savedSettings?.gradingScale) {
      setGradingScale(savedSettings.gradingScale);
    }

    const resultMap = new Map();
    allResults.forEach(r => resultMap.set(r.student_id, r));

    let filteredAdmissions = allAdmissions;
    if (selectedBatch && selectedBatch !== 'all') {
      filteredAdmissions = filteredAdmissions.filter(a => a.batch === selectedBatch);
    }

    let combinedRoster = filteredAdmissions.map(student => {
      const resRecord = resultMap.get(student.id);
      const hasResult = !!resRecord;
      return {
        student_id: student.id,
        name: student.name,
        cnic: student.cnic,
        phone: student.phone,
        email: student.email,
        course: student.course,
        batch: student.batch,
        photo_url: student.photo_url,
        has_result: hasResult,
        result_id: resRecord?.id || null,
        attendance_marks: resRecord?.attendance_marks !== undefined ? Number(resRecord.attendance_marks) : 0,
        assignment_marks: resRecord?.assignment_marks !== undefined ? Number(resRecord.assignment_marks) : 0,
        quiz_marks: resRecord?.quiz_marks !== undefined ? Number(resRecord.quiz_marks) : 0,
        task_completion_marks: resRecord?.task_completion_marks !== undefined ? Number(resRecord.task_completion_marks) : 0,
        project_marks: resRecord?.project_marks !== undefined ? Number(resRecord.project_marks) : 0,
        exam_marks: resRecord?.exam_marks !== undefined ? Number(resRecord.exam_marks) : 0,
        total_marks: resRecord?.total_marks !== undefined ? Number(resRecord.total_marks) : 0,
        grade: resRecord?.grade || (hasResult ? 'F' : '—'),
        remarks: resRecord?.remarks || '',
        passed: resRecord?.passed !== undefined ? resRecord.passed : false,
        batch_rank: resRecord?.batch_rank || null,
        computed_at: resRecord?.computed_at || null
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      combinedRoster = combinedRoster.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.cnic && s.cnic.includes(q)) ||
        (s.batch && s.batch.toLowerCase().includes(q))
      );
    }

    setRoster(combinedRoster);

    const gradedStudents = combinedRoster.filter(s => s.has_result);
    const totalCandidates = combinedRoster.length;
    const passedCount = gradedStudents.filter(s => s.passed).length;
    const failedCount = gradedStudents.filter(s => !s.passed).length;
    const passRate = totalCandidates > 0 ? Math.round((passedCount / totalCandidates) * 100) : 0;
    const totalMarksSum = gradedStudents.reduce((acc, s) => acc + s.total_marks, 0);
    const classAverage = gradedStudents.length > 0 ? Math.round((totalMarksSum / gradedStudents.length) * 10) / 10 : 0;
    const highestScore = gradedStudents.length > 0 ? Math.max(...gradedStudents.map(s => s.total_marks)) : 0;

    const gradeDistribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    gradedStudents.forEach(s => {
      if (s.grade && gradeDistribution[s.grade] !== undefined) {
        gradeDistribution[s.grade] += 1;
      } else if (s.grade && s.grade !== '—') {
        gradeDistribution['F'] += 1;
      }
    });

    setStats({
      totalCandidates,
      gradedCount: gradedStudents.length,
      passed: passedCount,
      failed: failedCount,
      passRate,
      classAverage,
      highestScore,
      gradeDistribution
    });
    setEditedRows({});
  }, [examType, selectedBatch, search]);

  // 1. Fetch Examination Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      let loaded = false;

      if (token) {
        try {
          const queryParams = new URLSearchParams({
            batch: selectedBatch,
            exam_type: examType,
            search: search.trim()
          });

          let res = await fetch(`/api/admin/academic/results?${queryParams}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.status === 404) {
            res = await fetch(`/api/admin/academic/results.php?${queryParams}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          }

          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success') {
              const d = json.data || {};
              setBatches(d.batches || []);
              setRoster(d.roster || []);
              setStats(d.stats || {});
              if (d.weights) setWeights(d.weights);
              if (d.gradingScale) setGradingScale(d.gradingScale);
              setEditedRows({});
              loaded = true;
            }
          }
        } catch (apiErr) {
          console.warn('API error, falling back to direct query:', apiErr);
        }
      }

      if (!loaded) {
        await loadFromSupabase();
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load examination suite.');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, selectedBatch, examType, search, loadFromSupabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeWeights = useMemo(() => {
    return examType === 'finalterm' ? weights.finalterm : weights.midterm;
  }, [weights, examType]);

  // Handle inline score changes
  const handleScoreChange = (studentId, field, value) => {
    const original = roster.find(s => s.student_id === studentId);
    if (!original) return;

    const currentEdit = editedRows[studentId] || {
      attendance_marks: original.attendance_marks,
      assignment_marks: original.assignment_marks,
      quiz_marks: original.quiz_marks,
      task_completion_marks: original.task_completion_marks,
      project_marks: original.project_marks,
      exam_marks: original.exam_marks
    };

    const numVal = Math.max(0, Number(value) || 0);
    const updatedFields = { ...currentEdit, [field]: numVal };

    // Auto-calculate new total and grade
    const att = Number(updatedFields.attendance_marks || 0);
    const ass = Number(updatedFields.assignment_marks || 0);
    const quiz = Number(updatedFields.quiz_marks || 0);
    const task = Number(updatedFields.task_completion_marks || 0);
    const proj = Number(updatedFields.project_marks || 0);
    const exam = Number(updatedFields.exam_marks || 0);

    const newTotal = Math.round((att + ass + quiz + task + proj + exam) * 10) / 10;
    const gradeInfo = resolveGrade(newTotal, gradingScale);
    const passingMarks = weights.passingMarks !== undefined ? Number(weights.passingMarks) : 50;
    const passed = newTotal >= passingMarks;

    setEditedRows(prev => ({
      ...prev,
      [studentId]: {
        ...updatedFields,
        student_id: studentId,
        total_marks: newTotal,
        grade: gradeInfo.grade,
        remarks: gradeInfo.remarks,
        passed
      }
    }));
  };

  // Revert all pending edits
  const handleDiscardEdits = () => {
    setEditedRows({});
    toast.success('Pending edits discarded.');
  };

  // Save Marksheet Changes
  const handleSaveMarksheet = async () => {
    if (!canMutate) {
      return toast.error('You do not have permission to modify results.');
    }
    const editEntries = Object.values(editedRows);
    if (editEntries.length === 0) {
      return toast.error('No changes to save.');
    }
    if (selectedBatch === 'all') {
      return toast.error('Please select a specific batch before saving marksheet changes.');
    }

    setSaving(true);
    try {
      const token = await getAuthToken();
      let savedViaApi = false;

      if (token) {
        try {
          const payload = {
            action: 'save_marksheet',
            batch: selectedBatch,
            examType,
            entries: editEntries
          };

          let res = await fetch('/api/admin/academic/results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (res.status === 404) {
            res = await fetch('/api/admin/academic/results.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });
          }

          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success') {
              savedViaApi = true;
            }
          }
        } catch (_) {}
      }

      if (!savedViaApi) {
        // Direct Supabase fallback
        for (const entry of editEntries) {
          const payload = {
            student_id: entry.student_id,
            batch_id: selectedBatch,
            exam_type: examType,
            attendance_marks: entry.attendance_marks,
            assignment_marks: entry.assignment_marks,
            quiz_marks: entry.quiz_marks,
            task_completion_marks: entry.task_completion_marks,
            project_marks: entry.project_marks,
            exam_marks: entry.exam_marks,
            total_marks: entry.total_marks,
            grade: entry.grade,
            remarks: entry.remarks,
            passed: entry.passed,
            computed_at: new Date().toISOString()
          };
          await supabase.from('results').upsert(payload, { onConflict: 'student_id, exam_type' });
        }
        const { updateBatchRanks } = await import('../utils/resultUtils.js');
        await updateBatchRanks(selectedBatch, examType);
      }

      toast.success('Marksheet successfully updated.');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // Force Batch Sync / Recomputation
  const handleRecomputeBatch = async () => {
    if (!canMutate) {
      return toast.error('You do not have permission to recompute results.');
    }
    if (selectedBatch === 'all') {
      return toast.error('Please select a specific batch to recompute.');
    }

    setRecomputing(true);
    try {
      const token = await getAuthToken();
      let recomputedViaApi = false;

      if (token) {
        try {
          const payload = {
            action: 'recompute_batch',
            batch: selectedBatch,
            examType,
            notifyStudents: true
          };

          let res = await fetch('/api/admin/academic/results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (res.status === 404) {
            res = await fetch('/api/admin/academic/results.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });
          }

          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success') {
              recomputedViaApi = true;
            }
          }
        } catch (_) {}
      }

      if (!recomputedViaApi) {
        // Direct Supabase fallback
        const { data: students } = await supabase.from('admissions').select('id').eq('batch', selectedBatch).eq('status', 'Active');
        if (students) {
          const { computeAndCacheResult, updateBatchRanks } = await import('../utils/resultUtils.js');
          for (const s of students) {
            await computeAndCacheResult(s.id, examType, { updateRanks: false, customWeights: activeWeights, customGradingScale: gradingScale });
          }
          await updateBatchRanks(selectedBatch, examType);
        }
      }

      toast.success(`Recomputed batch ${selectedBatch} successfully.`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Recomputation failed.');
    } finally {
      setRecomputing(false);
    }
  };

  // Open Weights Configuration Modal
  const handleOpenWeightsModal = () => {
    setWeightsForm({
      midterm: { ...weights.midterm },
      finalterm: { ...weights.finalterm },
      passingMarks: weights.passingMarks !== undefined ? weights.passingMarks : 50,
      activeExam: examType
    });
    setShowWeightsModal(true);
  };

  // Save Weights Form
  const handleSaveWeights = async () => {
    if (!canMutate) return toast.error('Unauthorized');
    const curW = weightsForm[weightsForm.activeExam];
    const sum = (Number(curW.attendance) || 0) + 
                (Number(curW.assignment) || 0) + 
                (Number(curW.quiz) || 0) + 
                (Number(curW.taskCompletion) || 0) + 
                (Number(curW.project) || 0) + 
                (Number(curW.exam) || 0);

    if (sum !== 100) {
      return toast.error(`Component weights must sum to exactly 100%. Current sum: ${sum}%`);
    }

    setSaving(true);
    try {
      const token = await getAuthToken();
      let savedViaApi = false;

      const payload = {
        action: 'save_weights',
        weights: {
          midterm: weightsForm.midterm,
          finalterm: weightsForm.finalterm,
          passingMarks: Number(weightsForm.passingMarks) || 50
        },
        gradingScale
      };

      if (token) {
        try {
          let res = await fetch('/api/admin/academic/results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (res.status === 404) {
            res = await fetch('/api/admin/academic/results.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });
          }

          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success') {
              savedViaApi = true;
            }
          }
        } catch (_) {}
      }

      if (!savedViaApi) {
        await supabase.from('app_settings').upsert({
          key: 'academic_assessment_weights',
          value: {
            midterm: payload.weights.midterm,
            finalterm: payload.weights.finalterm,
            passingMarks: payload.weights.passingMarks,
            gradingScale
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      }

      toast.success('Assessment structure successfully updated.');
      setShowWeightsModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save weights.');
    } finally {
      setSaving(false);
    }
  };


  // Download Single Student Transcript PDF
  const handleDownloadTranscript = (student) => {
    try {
      const edited = editedRows[student.student_id];
      const resData = edited ? { ...student, ...edited } : student;
      const doc = createTranscriptPdf({
        student,
        result: resData,
        batchStats: {
          count: stats.totalCandidates || roster.length,
          avg: stats.classAverage,
          highest: stats.highestScore
        },
        weights: activeWeights,
        gradingScale
      });

      const filename = `Transcript-${student.name.replace(/\s+/g, '_')}-${student.batch}-${examType}.pdf`;
      doc.save(filename);
      toast.success(`Generated official transcript for ${student.name}`);
    } catch (err) {
      console.error('PDF Error:', err);
      toast.error('Failed to generate transcript PDF.');
    }
  };

  // Download Batch Tabulation Sheet PDF
  const handleDownloadTabulationPdf = () => {
    if (roster.length === 0) {
      return toast.error('No students available to generate tabulation sheet.');
    }
    try {
      const currentBatchObj = batches.find(b => b.batch_name === selectedBatch) || {
        batch_name: selectedBatch === 'all' ? 'All Cohorts' : selectedBatch,
        course: roster[0]?.course || 'DeepSkills Academic Directorate'
      };

      const finalRows = roster.map(s => {
        const edit = editedRows[s.student_id];
        return edit ? { ...s, ...edit } : s;
      });

      const doc = createTabulationSheetPdf({
        batch: currentBatchObj,
        examType,
        results: finalRows,
        stats,
        weights: activeWeights
      });

      const filename = `Tabulation-Sheet-${selectedBatch}-${examType}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('Tabulation Sheet PDF exported successfully.');
    } catch (err) {
      console.error('Tabulation PDF Error:', err);
      toast.error('Failed to generate tabulation sheet PDF.');
    }
  };

  // Export CSV Tabulation
  const handleExportCSV = () => {
    if (roster.length === 0) {
      return toast.error('No results to export.');
    }
    const headers = [
      'Rank', 'Student Name', 'CNIC', 'Batch', 'Course', 'Exam Type',
      'Attendance Marks', 'Assignment Marks', 'Quiz Marks', 'Task Completion Marks',
      'Project Marks', 'Exam Marks', 'Total Marks', 'Grade', 'Result Standing', 'Remarks'
    ];

    const rows = roster.map(s => {
      const edit = editedRows[s.student_id];
      const cur = edit ? { ...s, ...edit } : s;
      return [
        cur.batch_rank ?? '',
        cur.name ?? '',
        cur.cnic ?? '',
        cur.batch ?? selectedBatch,
        cur.course ?? '',
        examType,
        cur.attendance_marks ?? 0,
        cur.assignment_marks ?? 0,
        cur.quiz_marks ?? 0,
        cur.task_completion_marks ?? 0,
        cur.project_marks ?? 0,
        cur.exam_marks ?? 0,
        cur.total_marks ?? 0,
        cur.grade ?? '',
        cur.passed ? 'PASS' : 'FAIL',
        cur.remarks ?? ''
      ];
    });

    const filename = `tabulation-${selectedBatch}-${examType}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(filename, headers, rows);
    toast.success('Tabulation CSV exported successfully.');
  };

  const hasUnsavedEdits = Object.keys(editedRows).length > 0;

  return (
    <AdminLayout>
      <Container>
        {/* Navigation Ribbon */}
        <SubNavRibbon>
          <NavChip onClick={() => router.push('/admin/academic')}>
            <FaChartLine /> Academic Hub
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/attendance')}>
            <FaCalendarAlt /> Attendance
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/tasks')}>
            <FaTasks /> Tasks & Homework
          </NavChip>
          <NavChip $active onClick={() => router.push('/admin/academic/results')}>
            <FaAward /> Exams & Results
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/announcements')}>
            Announcements
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/complaints')}>
            Grievances
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/chats')}>
            Group Chats
          </NavChip>
          <NavChip onClick={() => router.push('/admin/academic/reports')}>
            Academic Reports
          </NavChip>
        </SubNavRibbon>

        {/* Header Bar */}
        <Header>
          <div className="title-area">
            <h1><FaAward style={{ color: '#7B1F2E' }} /> Examination & Grading Suite</h1>
            <p>Batch marksheet management, assessment weighting, and certified academic transcripts</p>
          </div>
          <div className="action-cluster">
            {canMutate && (
              <HeaderBtn className="secondary" onClick={handleOpenWeightsModal}>
                <FaSlidersH /> Assessment Weights
              </HeaderBtn>
            )}
            {canMutate && (
              <HeaderBtn className="gold" onClick={handleRecomputeBatch} disabled={recomputing}>
                <FaSync className={recomputing ? 'fa-spin' : ''} /> {recomputing ? 'Recomputing...' : 'Recompute Batch'}
              </HeaderBtn>
            )}
            <HeaderBtn className="secondary" onClick={handleDownloadTabulationPdf}>
              <FaFilePdf /> Tabulation PDF
            </HeaderBtn>
            <HeaderBtn className="secondary" onClick={handleExportCSV}>
              <FaDownload /> Export CSV
            </HeaderBtn>
            {hasUnsavedEdits && canMutate && (
              <HeaderBtn className="primary" onClick={handleSaveMarksheet} disabled={saving}>
                <FaSave /> {saving ? 'Saving...' : `Save Marksheet (${Object.keys(editedRows).length})`}
              </HeaderBtn>
            )}
          </div>
        </Header>

        {/* Telemetry KPI Cards */}
        <StatsGrid>
          <StatCard $accentBg="rgba(55, 138, 221, 0.15)" $accentColor="#378ADD">
            <div className="card-top">
              <div className="icon-box"><FaUserGraduate /></div>
              <span className="pill">{stats.gradedCount} Graded</span>
            </div>
            <h4>Total Candidates</h4>
            <div className="value">{stats.totalCandidates}</div>
            <div className="sub">Enrolled students in cohort</div>
          </StatCard>

          <StatCard $accentBg="rgba(16, 185, 129, 0.15)" $accentColor="#10b981">
            <div className="card-top">
              <div className="icon-box"><FaCheckCircle /></div>
              <span className="pill" style={{ color: '#34d399' }}>{stats.passed} Passed</span>
            </div>
            <h4>Passing Rate</h4>
            <div className="value" style={{ color: stats.passRate >= 70 ? '#34d399' : '#f87171' }}>
              {stats.passRate}%
            </div>
            <div className="sub">{stats.failed} candidates failed/at-risk</div>
          </StatCard>

          <StatCard $accentBg="rgba(168, 85, 247, 0.15)" $accentColor="#a855f7">
            <div className="card-top">
              <div className="icon-box"><FaChartLine /></div>
              <span className="pill">Scale / 100</span>
            </div>
            <h4>Class Average</h4>
            <div className="value">{stats.classAverage}</div>
            <div className="sub">Cohort mean score</div>
          </StatCard>

          <StatCard $accentBg="rgba(245, 158, 11, 0.15)" $accentColor="#f59e0b">
            <div className="card-top">
              <div className="icon-box"><FaTrophy /></div>
              <span className="pill" style={{ color: '#fbbf24' }}>Rank #1</span>
            </div>
            <h4>Highest Score</h4>
            <div className="value" style={{ color: '#fbbf24' }}>{stats.highestScore}</div>
            <div className="sub">Top candidate evaluation</div>
          </StatCard>
        </StatsGrid>

        {/* Unsaved Changes Notification Banner */}
        {hasUnsavedEdits && (
          <UnsavedBanner>
            <div className="msg">
              <FaExclamationTriangle />
              <span>You have pending marksheet edits for {Object.keys(editedRows).length} candidate(s).</span>
            </div>
            <div className="actions">
              <ActionIconBtn onClick={handleDiscardEdits}>
                <FaUndo /> Discard
              </ActionIconBtn>
              <HeaderBtn className="primary" onClick={handleSaveMarksheet} disabled={saving}>
                <FaCheck /> {saving ? 'Saving...' : 'Save All Changes'}
              </HeaderBtn>
            </div>
          </UnsavedBanner>
        )}

        {/* Filter and Mode Toolbar */}
        <FilterCard>
          <div className="filter-top">
            <div className="search-wrap">
              <FaSearch className="search-icon" />
              <input 
                type="text"
                placeholder="Search candidate name, CNIC, or cohort..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  type="button" 
                  className="clear-search-btn" 
                  onClick={() => setSearch('')}
                  title="Clear search"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            <div className="batch-select-wrap">
              <select 
                value={selectedBatch} 
                onChange={e => setSelectedBatch(e.target.value)}
                aria-label="Filter by Batch"
              >
                <option value="all">All Cohorts / Batches</option>
                {batches.map(b => (
                  <option key={b.id || b.batch_name} value={b.batch_name}>
                    {b.batch_name} ({b.course || 'Course'})
                  </option>
                ))}
              </select>
              <FaChevronDown className="select-arrow" />
            </div>

            {(search || selectedBatch !== 'all') && (
              <button 
                type="button" 
                className="reset-filters-btn"
                onClick={() => {
                  setSearch('');
                  setSelectedBatch('all');
                }}
                title="Reset search and batch filters"
              >
                <FaUndo size={11} /> Reset Filters
              </button>
            )}
          </div>

          <div className="filter-bottom">
            <div className="control-group">
              <span className="group-label">
                <FaFilter size={10} /> Exam Period:
              </span>
              <div className="toggle-pills">
                <button 
                  type="button" 
                  className={examType === 'midterm' ? 'active-exam' : ''}
                  onClick={() => setExamType('midterm')}
                >
                  Midterm Exam
                </button>
                <button 
                  type="button" 
                  className={examType === 'finalterm' ? 'active-exam' : ''}
                  onClick={() => setExamType('finalterm')}
                >
                  Finalterm Exam
                </button>
              </div>
            </div>

            <div className="control-group">
              <span className="group-label">View Mode:</span>
              <div className="toggle-pills">
                <button 
                  type="button"
                  className={activeTab === 'marksheet' ? 'active-view' : ''}
                  onClick={() => setActiveTab('marksheet')}
                >
                  <FaTable size={12} /> Marksheet Table
                </button>
                <button 
                  type="button"
                  className={activeTab === 'analytics' ? 'active-view' : ''}
                  onClick={() => setActiveTab('analytics')}
                >
                  <FaChartPie size={12} /> Cohort Analytics
                </button>
              </div>
            </div>
          </div>
        </FilterCard>

        {/* Tab 1: Live Marksheet Table */}
        {activeTab === 'marksheet' && (
          loading ? (
            <SkeletonTable rows={8} cols={9} />
          ) : roster.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b', background: '#111318', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <FaExclamationCircle size={42} style={{ marginBottom: '16px', color: '#7B1F2E' }} />
              <h3 style={{ color: '#fff', margin: '0 0 8px' }}>No candidates found</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Try choosing another batch or clearing search filters.</p>
            </div>
          ) : (
            <TableCard>
              <Table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Att ({activeWeights.attendance}%)</th>
                    <th>Ass ({activeWeights.assignment}%)</th>
                    <th>Quiz ({activeWeights.quiz}%)</th>
                    <th>Tasks ({activeWeights.taskCompletion}%)</th>
                    <th>Proj/Exam ({activeWeights.project + (activeWeights.exam || 0)}%)</th>
                    <th>Total / 100</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s, idx) => {
                    const edit = editedRows[s.student_id];
                    const cur = edit ? { ...s, ...edit } : s;
                    const isRankTop = cur.batch_rank && cur.batch_rank <= 3;
                    const isRowEdited = !!edit;

                    return (
                      <tr key={s.student_id}>
                        <td>
                          <RankBadge $rank={cur.batch_rank}>
                            {isRankTop && <FaTrophy size={11} />}
                            {cur.batch_rank ? `#${cur.batch_rank}` : `#${idx + 1}`}
                          </RankBadge>
                        </td>
                        <td>
                          <StudentInfo>
                            <div className="avatar">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="details">
                              <div className="name">{s.name}</div>
                              <div className="cnic">{s.cnic || 'CNIC Pending'} | {s.batch}</div>
                            </div>
                          </StudentInfo>
                        </td>
                        <td>
                          <ScoreInput 
                            type="number"
                            min="0"
                            max={activeWeights.attendance}
                            step="0.5"
                            $modified={edit?.attendance_marks !== undefined}
                            value={cur.attendance_marks}
                            onChange={e => handleScoreChange(s.student_id, 'attendance_marks', e.target.value)}
                            disabled={!canMutate}
                          />
                        </td>
                        <td>
                          <ScoreInput 
                            type="number"
                            min="0"
                            max={activeWeights.assignment}
                            step="0.5"
                            $modified={edit?.assignment_marks !== undefined}
                            value={cur.assignment_marks}
                            onChange={e => handleScoreChange(s.student_id, 'assignment_marks', e.target.value)}
                            disabled={!canMutate}
                          />
                        </td>
                        <td>
                          <ScoreInput 
                            type="number"
                            min="0"
                            max={activeWeights.quiz}
                            step="0.5"
                            $modified={edit?.quiz_marks !== undefined}
                            value={cur.quiz_marks}
                            onChange={e => handleScoreChange(s.student_id, 'quiz_marks', e.target.value)}
                            disabled={!canMutate}
                          />
                        </td>
                        <td>
                          <ScoreInput 
                            type="number"
                            min="0"
                            max={activeWeights.taskCompletion}
                            step="0.5"
                            $modified={edit?.task_completion_marks !== undefined}
                            value={cur.task_completion_marks}
                            onChange={e => handleScoreChange(s.student_id, 'task_completion_marks', e.target.value)}
                            disabled={!canMutate}
                          />
                        </td>
                        <td>
                          <ScoreInput 
                            type="number"
                            min="0"
                            max={activeWeights.project + (activeWeights.exam || 0)}
                            step="0.5"
                            $modified={edit?.project_marks !== undefined || edit?.exam_marks !== undefined}
                            value={Number(cur.project_marks || 0) + Number(cur.exam_marks || 0)}
                            onChange={e => handleScoreChange(s.student_id, 'project_marks', e.target.value)}
                            disabled={!canMutate}
                          />
                        </td>
                        <td style={{ fontWeight: '800', color: cur.passed ? '#fff' : '#f87171' }}>
                          {cur.total_marks.toFixed(1)}
                        </td>
                        <td>
                          <GradeBadge $grade={cur.grade}>
                            {cur.grade}
                          </GradeBadge>
                        </td>
                        <td>
                          <StatusPill $passed={cur.passed}>
                            {cur.passed ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                            {cur.passed ? 'PASS' : 'FAIL'}
                          </StatusPill>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <ActionIconBtn 
                              className="pdf" 
                              onClick={() => handleDownloadTranscript(s)}
                              title="Download Official Branded Transcript PDF"
                            >
                              <FaFilePdf /> Transcript
                            </ActionIconBtn>
                            <ActionIconBtn 
                              onClick={() => setOverrideStudent(cur)}
                              title="Inspect full score breakdown"
                            >
                              <FaEdit />
                            </ActionIconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableCard>
          )
        )}

        {/* Tab 2: Cohort Analytics */}
        {activeTab === 'analytics' && (
          <AnalyticsGrid>
            {/* Grade Distribution Breakdown */}
            <AnalyticsCard>
              <h3><FaAward style={{ color: '#fbbf24' }} /> Grade Distribution Matrix</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                Distribution of grades across {stats.gradedCount} assessed candidates in {selectedBatch}
              </p>

              {['A+', 'A', 'B', 'C', 'D', 'F'].map(g => {
                const count = stats.gradeDistribution?.[g] || 0;
                const pct = stats.gradedCount > 0 ? Math.round((count / stats.gradedCount) * 100) : 0;
                let barColor = '#34d399';
                if (g === 'A') barColor = '#4ade80';
                if (g === 'B') barColor = '#38bdf8';
                if (g === 'C') barColor = '#fbbf24';
                if (g === 'D') barColor = '#fb923c';
                if (g === 'F') barColor = '#f87171';

                return (
                  <GradeBar key={g} $color={barColor}>
                    <div className="bar-meta">
                      <span>Grade {g}</span>
                      <span>{count} Students ({pct}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </GradeBar>
                );
              })}
            </AnalyticsCard>

            {/* Remediation & At-Risk Roster */}
            <AnalyticsCard>
              <h3><FaExclamationTriangle style={{ color: '#f87171' }} /> Remediation & Defaulter Roster</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
                Students scoring below the {weights.passingMarks || 50}% passing mark requiring academic intervention
              </p>

              {roster.filter(s => s.has_result && !s.passed).length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <FaCheckCircle size={32} style={{ color: '#34d399', marginBottom: '10px' }} />
                  <p style={{ margin: 0, color: '#34d399', fontWeight: '700' }}>No failing candidates in this cohort!</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>All graded students have met or exceeded the 50% threshold.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {roster.filter(s => s.has_result && !s.passed).map(s => {
                    const phone = s.phone ? s.phone.replace(/[^0-9]/g, '') : '';
                    const cleanPhone = phone.startsWith('0') ? '92' + phone.substring(1) : phone;
                    const waText = encodeURIComponent(
                      `Assalam-o-Alaikum ${s.name},\nThis is an official academic update regarding your ${examType === 'finalterm' ? 'Final Term' : 'Mid Term'} examination result at DeepSkills.\nYour scored marks: ${s.total_marks}/100 (Grade ${s.grade}).\nPlease contact the Academic Coordinator for remedial sessions.`
                    );

                    return (
                      <div 
                        key={s.student_id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: 'rgba(239, 68, 68, 0.06)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '10px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.cnic} | Score: {s.total_marks}/100</div>
                        </div>

                        {cleanPhone ? (
                          <ActionIconBtn 
                            as="a"
                            href={`https://wa.me/${cleanPhone}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)' }}
                          >
                            <FaWhatsapp /> WhatsApp Notice
                          </ActionIconBtn>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No Phone</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </AnalyticsCard>
          </AnalyticsGrid>
        )}

        {/* Modal 1: Assessment Structure & Weights Modal */}
        {showWeightsModal && weightsForm && (
          <ModalOverlay onClick={() => setShowWeightsModal(false)}>
            <ModalCard onClick={e => e.stopPropagation()} $wide>
              <div className="modal-header">
                <h3><FaSlidersH style={{ color: '#7B1F2E' }} /> Assessment Structure Configuration</h3>
                <button type="button" onClick={() => setShowWeightsModal(false)}><FaTimes /></button>
              </div>

              <div className="modal-body">
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <NavChip 
                    $active={weightsForm.activeExam === 'midterm'}
                    onClick={() => setWeightsForm({ ...weightsForm, activeExam: 'midterm' })}
                  >
                    Midterm Weights
                  </NavChip>
                  <NavChip 
                    $active={weightsForm.activeExam === 'finalterm'}
                    onClick={() => setWeightsForm({ ...weightsForm, activeExam: 'finalterm' })}
                  >
                    Finalterm Weights
                  </NavChip>
                </div>

                <div style={{ background: '#0e1014', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Total Weight Sum</span>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: '800', 
                      color: (() => {
                        const cur = weightsForm[weightsForm.activeExam];
                        const sum = (Number(cur.attendance) || 0) + 
                                    (Number(cur.assignment) || 0) + 
                                    (Number(cur.quiz) || 0) + 
                                    (Number(cur.taskCompletion) || 0) + 
                                    (Number(cur.project) || 0) + 
                                    (Number(cur.exam) || 0);
                        return sum === 100 ? '#34d399' : '#f87171';
                      })()
                    }}>
                      {(() => {
                        const cur = weightsForm[weightsForm.activeExam];
                        return (Number(cur.attendance) || 0) + 
                               (Number(cur.assignment) || 0) + 
                               (Number(cur.quiz) || 0) + 
                               (Number(cur.taskCompletion) || 0) + 
                               (Number(cur.project) || 0) + 
                               (Number(cur.exam) || 0);
                      })()}% / 100%
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                    The sum of component weightages must total exactly 100% for mathematical consistency.
                  </p>
                </div>

                <FormRow>
                  <FormGroup>
                    <label>Attendance Weight (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={weightsForm[weightsForm.activeExam].attendance}
                      onChange={e => {
                        const cur = weightsForm[weightsForm.activeExam];
                        setWeightsForm({
                          ...weightsForm,
                          [weightsForm.activeExam]: { ...cur, attendance: Number(e.target.value) }
                        });
                      }}
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Assignments Weight (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={weightsForm[weightsForm.activeExam].assignment}
                      onChange={e => {
                        const cur = weightsForm[weightsForm.activeExam];
                        setWeightsForm({
                          ...weightsForm,
                          [weightsForm.activeExam]: { ...cur, assignment: Number(e.target.value) }
                        });
                      }}
                    />
                  </FormGroup>
                </FormRow>

                <FormRow>
                  <FormGroup>
                    <label>Quizzes Weight (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={weightsForm[weightsForm.activeExam].quiz}
                      onChange={e => {
                        const cur = weightsForm[weightsForm.activeExam];
                        setWeightsForm({
                          ...weightsForm,
                          [weightsForm.activeExam]: { ...cur, quiz: Number(e.target.value) }
                        });
                      }}
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Practical Tasks / Homework (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={weightsForm[weightsForm.activeExam].taskCompletion}
                      onChange={e => {
                        const cur = weightsForm[weightsForm.activeExam];
                        setWeightsForm({
                          ...weightsForm,
                          [weightsForm.activeExam]: { ...cur, taskCompletion: Number(e.target.value) }
                        });
                      }}
                    />
                  </FormGroup>
                </FormRow>

                <FormRow>
                  <FormGroup>
                    <label>Capstone Project Weight (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={weightsForm[weightsForm.activeExam].project}
                      onChange={e => {
                        const cur = weightsForm[weightsForm.activeExam];
                        setWeightsForm({
                          ...weightsForm,
                          [weightsForm.activeExam]: { ...cur, project: Number(e.target.value) }
                        });
                      }}
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Theory Examination Paper (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={weightsForm[weightsForm.activeExam].exam || 0}
                      onChange={e => {
                        const cur = weightsForm[weightsForm.activeExam];
                        setWeightsForm({
                          ...weightsForm,
                          [weightsForm.activeExam]: { ...cur, exam: Number(e.target.value) }
                        });
                      }}
                    />
                  </FormGroup>
                </FormRow>

                <FormGroup>
                  <label>Passing Score Threshold (Marks / 100)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={weightsForm.passingMarks}
                    onChange={e => setWeightsForm({ ...weightsForm, passingMarks: Number(e.target.value) })}
                  />
                </FormGroup>
              </div>

              <div className="modal-footer">
                <HeaderBtn className="secondary" onClick={() => setShowWeightsModal(false)}>
                  Cancel
                </HeaderBtn>
                <HeaderBtn className="primary" onClick={handleSaveWeights} disabled={saving}>
                  <FaCheck /> {saving ? 'Saving...' : 'Apply Assessment Weights'}
                </HeaderBtn>
              </div>
            </ModalCard>
          </ModalOverlay>
        )}

        {/* Modal 2: Student Score Override / Detail Modal */}
        {overrideStudent && (
          <ModalOverlay onClick={() => setOverrideStudent(null)}>
            <ModalCard onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaEdit style={{ color: '#7B1F2E' }} /> Candidate Evaluation Detail</h3>
                <button type="button" onClick={() => setOverrideStudent(null)}><FaTimes /></button>
              </div>

              <div className="modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#0e1014', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#7B1F2E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                    {overrideStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fff' }}>{overrideStudent.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                      {overrideStudent.cnic} | Cohort: {overrideStudent.batch}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#0e1014', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Score</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: overrideStudent.passed ? '#34d399' : '#f87171' }}>
                      {overrideStudent.total_marks.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ background: '#0e1014', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Assigned Grade</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fbbf24' }}>
                      {overrideStudent.grade}
                    </div>
                  </div>
                  <div style={{ background: '#0e1014', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Class Rank</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8' }}>
                      #{overrideStudent.batch_rank || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span>Attendance Contribution</span>
                    <strong>{overrideStudent.attendance_marks} / {activeWeights.attendance}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span>Assignments Aggregate</span>
                    <strong>{overrideStudent.assignment_marks} / {activeWeights.assignment}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span>Quizzes Aggregate</span>
                    <strong>{overrideStudent.quiz_marks} / {activeWeights.quiz}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span>Practical Tasks Completion</span>
                    <strong>{overrideStudent.task_completion_marks} / {activeWeights.taskCompletion}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span>Capstone Project & Exam</span>
                    <strong>{(Number(overrideStudent.project_marks || 0) + Number(overrideStudent.exam_marks || 0)).toFixed(1)} / {activeWeights.project + (activeWeights.exam || 0)}</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <ActionIconBtn 
                  className="pdf" 
                  onClick={() => handleDownloadTranscript(overrideStudent)}
                >
                  <FaFilePdf /> Download Official Transcript
                </ActionIconBtn>
                <HeaderBtn className="primary" onClick={() => setOverrideStudent(null)}>
                  Close
                </HeaderBtn>
              </div>
            </ModalCard>
          </ModalOverlay>
        )}
      </Container>
    </AdminLayout>
  );
};

export default AdminResults;
