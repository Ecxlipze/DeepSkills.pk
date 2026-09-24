import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FaTimes,
  FaUserCheck,
  FaPhoneAlt,
  FaEnvelope,
  FaIdCard,
  FaWhatsapp,
  FaCopy,
  FaCheckCircle,
  FaClock,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaExternalLinkAlt,
  FaDownload,
  FaPaperPlane,
  FaTimesCircle,
  FaBriefcase,
  FaFileSignature,
  FaFolderOpen,
  FaUserTie,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaLinkedin,
  FaCheck,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaBuilding,
  FaBolt
} from 'react-icons/fa';
import { portalTheme } from '../portal/PortalTheme';
import { formatCnic, formatPhone } from '../../utils/formValidation';

// --- Styled Components ---
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1050;
`;

const Drawer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(760px, 100vw);
  max-width: 100%;
  box-sizing: border-box;
  background: ${portalTheme.colors.bgElevated};
  z-index: 1060;
  display: flex;
  flex-direction: column;
  color: #fff;
  border-left: 1px solid ${portalTheme.colors.borderMedium};
  box-shadow: -10px 0 35px rgba(0, 0, 0, 0.55);
  overflow: hidden;
`;

const DrawerHeader = styled.div`
  padding: 22px 26px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

const ProfileSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
`;

const Avatar = styled.div`
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: linear-gradient(135deg, #7B1F2E 0%, #8B5CF6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 4px 14px rgba(123, 31, 46, 0.35);
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

const ProfileMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: #fff;
    font-family: ${portalTheme.fonts.heading};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta-sub {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.82rem;
    color: ${portalTheme.colors.textMuted};
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;

  ${({ $status }) => {
    switch ($status) {
      case 'hired':
        return `
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        `;
      case 'signed':
        return `
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.3);
        `;
      case 'jd_sent':
        return `
          background: rgba(139, 92, 246, 0.15);
          color: #c4b5fd;
          border: 1px solid rgba(139, 92, 246, 0.3);
        `;
      case 'rejected':
        return `
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        `;
      default:
        return `
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        `;
    }
  }}
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${portalTheme.colors.textMuted};
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  flex-shrink: 0;

  &:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
`;

const QuickActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionChip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: ${portalTheme.colors.textSecondary};
  text-decoration: none;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.18);
  }

  &.whatsapp {
    background: rgba(37, 211, 102, 0.12);
    color: #4ade80;
    border-color: rgba(37, 211, 102, 0.3);
    &:hover {
      background: rgba(37, 211, 102, 0.22);
    }
  }

  &.copy {
    background: rgba(139, 92, 246, 0.1);
    color: #c4b5fd;
    border-color: rgba(139, 92, 246, 0.25);
    &:hover {
      background: rgba(139, 92, 246, 0.2);
    }
  }
`;

const StepperWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 4px;
`;

const StepItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $active, $done }) => ($done ? '#34d399' : $active ? '#facc15' : '#64748b')};

  .step-badge {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
    background: ${({ $active, $done }) => (
      $done
        ? 'rgba(16, 185, 129, 0.2)'
        : $active
          ? 'rgba(234, 179, 8, 0.2)'
          : 'rgba(255, 255, 255, 0.06)'
    )};
    border: 1px solid ${({ $active, $done }) => (
      $done
        ? '#10b981'
        : $active
          ? '#facc15'
          : 'rgba(255, 255, 255, 0.12)'
    )};
    color: ${({ $active, $done }) => ($done ? '#34d399' : $active ? '#facc15' : '#94a3b8')};
  }

  @media (max-width: 600px) {
    span { display: none; }
  }
`;

const StepDivider = styled.div`
  flex: 1;
  height: 2px;
  background: ${({ $done }) => ($done ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)')};
  margin: 0 8px;
`;

const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 26px;
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  background: rgba(0, 0, 0, 0.15);
  overflow-x: auto;
  flex-shrink: 0;

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TabButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 9px;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  border: 1px solid ${({ $active }) => ($active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.07)')};
  background: ${({ $active }) => ($active ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 255, 255, 0.02)')};
  color: ${({ $active }) => ($active ? '#c4b5fd' : portalTheme.colors.textMuted)};

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(139, 92, 246, 0.22)' : 'rgba(255, 255, 255, 0.05)')};
    color: #fff;
  }

  .badge {
    background: ${({ $active }) => ($active ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)')};
    color: #fff;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 0.68rem;
    font-weight: 700;
  }
`;

const DrawerBody = styled.div`
  flex: 1;
  padding: 24px 26px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
  }
`;

const DrawerFooter = styled.div`
  padding: 16px 26px;
  background: rgba(0, 0, 0, 0.45);
  border-top: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 10px;

  h3 {
    margin: 0;
    font-size: 0.94rem;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
      color: #a78bfa;
    }
  }

  span.pill {
    font-size: 0.72rem;
    color: ${portalTheme.colors.textMuted};
  }
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const DataItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.03);

  label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  span.val {
    font-size: 0.88rem;
    color: #e2e8f0;
    font-weight: 600;
    word-break: break-word;

    &.mono {
      font-family: monospace;
      color: #38bdf8;
    }
  }
`;

const DocCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  gap: 14px;
  transition: ${portalTheme.transitions.default};

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    background: rgba(255, 255, 255, 0.03);
  }

  .doc-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .doc-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .doc-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong {
      font-size: 0.86rem;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    span {
      font-size: 0.74rem;
      color: #94a3b8;
    }
  }

  .doc-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
`;

const MiniButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};

  &:hover {
    background: #8b5cf6;
    border-color: #8b5cf6;
  }

  &.download {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
    color: #34d399;
    &:hover {
      background: #10b981;
      color: #fff;
    }
  }
`;

const FooterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  border: 1px solid transparent;

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: #8B5CF6;
          color: #fff;
          &:hover:not(:disabled) {
            background: #7C3AED;
            box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
          }
        `;
      case 'success':
        return `
          background: #10B981;
          color: #fff;
          &:hover:not(:disabled) {
            background: #059669;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
          }
        `;
      case 'danger':
        return `
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
          &:hover:not(:disabled) {
            background: #EF4444;
            color: #fff;
          }
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Helper for stage resolution
const getCandidateStage = (app) => {
  const hrStatus = app?.profile?.hr_status;
  const step = app?.profile?.step || app?.profile?.current_step || 1;
  if (hrStatus === 'hired' || step >= 5) return 5;
  if (hrStatus === 'signed' || app?.signature || step === 4) return 4;
  if (hrStatus === 'jd_sent' || app?.jd || step === 3) return 3;
  if (app?.documents && app.documents.length > 0) return 2;
  return 1;
};

const AdminHRDrawer = ({
  open,
  application,
  onClose,
  onOpenComposer,
  onOpenFinalize,
  onReject,
  onDownloadAcceptance,
  canMutate = true
}) => {
  const [activeTab, setActiveTab] = useState('Personal Info');

  if (!open || !application) return null;

  const { teacher, profile = {}, documents = [], jd, signature, files = [] } = application;
  const stage = getCandidateStage(application);
  const fullName = teacher?.name || profile.full_name || 'Faculty Candidate';
  const cnic = profile.cnic || teacher?.cnic || '';
  const phone = profile.personal_phone || teacher?.phone || '';
  const email = profile.personal_email || teacher?.email || '';
  const specialization = profile.specialization || teacher?.specialization || 'Academic Faculty';
  const hrStatus = profile.hr_status || (stage === 5 ? 'hired' : 'pending');

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'FC';

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const cleanPhone = phone.replace(/\D/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent(`Assalam-o-Alaikum ${fullName}, DeepSkills HR here regarding your faculty application.`)}`
    : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <Drawer
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            {/* STICKY HEADER */}
            <DrawerHeader>
              <HeaderTop>
                <ProfileSummary>
                  <Avatar>{initials}</Avatar>
                  <ProfileMeta>
                    <h2>{fullName}</h2>
                    <div className="meta-sub">
                      <span>{specialization}</span>
                      <span>•</span>
                      <StatusPill $status={hrStatus}>
                        {hrStatus === 'hired' && <FaCheckCircle size={11} />}
                        {hrStatus === 'signed' && <FaFileSignature size={11} />}
                        {hrStatus === 'jd_sent' && <FaPaperPlane size={11} />}
                        {hrStatus === 'rejected' && <FaTimesCircle size={11} />}
                        {hrStatus === 'pending' && <FaClock size={11} />}
                        {hrStatus.replace('_', ' ')}
                      </StatusPill>
                    </div>
                  </ProfileMeta>
                </ProfileSummary>
                <CloseButton onClick={onClose} aria-label="Close drawer">
                  <FaTimes />
                </CloseButton>
              </HeaderTop>

              {/* QUICK ACTIONS BAR */}
              <QuickActionBar>
                {cnic && (
                  <ActionChip
                    as="button"
                    type="button"
                    className="copy"
                    onClick={() => copyToClipboard(cnic, 'CNIC')}
                    title="Copy National CNIC"
                  >
                    <FaIdCard /> {formatCnic(cnic)} <FaCopy size={10} style={{ opacity: 0.6 }} />
                  </ActionChip>
                )}
                {phone && (
                  <ActionChip href={`tel:${phone}`} title="Call Phone">
                    <FaPhoneAlt /> {formatPhone(phone)}
                  </ActionChip>
                )}
                {waUrl && (
                  <ActionChip href={waUrl} target="_blank" rel="noreferrer" className="whatsapp" title="Chat on WhatsApp">
                    <FaWhatsapp size={14} /> WhatsApp
                  </ActionChip>
                )}
                {email && (
                  <ActionChip href={`mailto:${email}`} title="Send Email">
                    <FaEnvelope /> {email}
                  </ActionChip>
                )}
              </QuickActionBar>

              {/* PIPELINE STEPPER TRACKER */}
              <StepperWrap>
                <StepItem $done={stage > 1} $active={stage === 1}>
                  <div className="step-badge">{stage > 1 ? <FaCheck size={10} /> : '1'}</div>
                  <span>Profile</span>
                </StepItem>
                <StepDivider $done={stage > 1} />

                <StepItem $done={stage > 2} $active={stage === 2}>
                  <div className="step-badge">{stage > 2 ? <FaCheck size={10} /> : '2'}</div>
                  <span>Documents</span>
                </StepItem>
                <StepDivider $done={stage > 2} />

                <StepItem $done={stage > 3} $active={stage === 3}>
                  <div className="step-badge">{stage > 3 ? <FaCheck size={10} /> : '3'}</div>
                  <span>JD Review</span>
                </StepItem>
                <StepDivider $done={stage > 3} />

                <StepItem $done={stage > 4} $active={stage === 4}>
                  <div className="step-badge">{stage > 4 ? <FaCheck size={10} /> : '4'}</div>
                  <span>Signature</span>
                </StepItem>
                <StepDivider $done={stage >= 5} />

                <StepItem $done={stage === 5} $active={stage === 5}>
                  <div className="step-badge">{stage === 5 ? <FaCheck size={10} /> : '5'}</div>
                  <span>Hired</span>
                </StepItem>
              </StepperWrap>
            </DrawerHeader>

            {/* TAB SELECTOR */}
            <TabsContainer>
              {[
                { id: 'Personal Info', label: 'Candidate Profile', icon: FaUserCheck },
                { id: 'Documents', label: 'Dossier Files', icon: FaFileAlt, count: documents.length },
                { id: 'JD', label: 'Job Description', icon: FaBriefcase, status: jd?.teacher_status },
                { id: 'Signature', label: 'Contract Signature', icon: FaFileSignature, status: signature ? 'Signed' : null },
                { id: 'Hiring Files', label: 'Hiring Dossiers', icon: FaFolderOpen, count: files.length }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <TabButton
                    key={t.id}
                    $active={activeTab === t.id}
                    onClick={() => setActiveTab(t.id)}
                  >
                    <Icon />
                    <span>{t.label}</span>
                    {t.count !== undefined && <span className="badge">{t.count}</span>}
                    {t.status && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          background: t.status === 'approved' || t.status === 'Signed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: t.status === 'approved' || t.status === 'Signed' ? '#34d399' : '#facc15'
                        }}
                      >
                        {t.status}
                      </span>
                    )}
                  </TabButton>
                );
              })}
            </TabsContainer>

            {/* DRAWER BODY */}
            <DrawerBody>
              {/* TAB 1: PERSONAL & BACKGROUND INFO */}
              {activeTab === 'Personal Info' && (
                <>
                  <Card>
                    <CardHeader>
                      <h3><FaIdCard /> Identity & Verified Credentials</h3>
                      <span className="pill">Step 1 Verification</span>
                    </CardHeader>
                    <DataGrid>
                      <DataItem>
                        <label>National CNIC Number</label>
                        <span className="val mono">{formatCnic(cnic) || 'Not Provided'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Father's Name</label>
                        <span className="val">{profile.father_name || '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Primary Phone / WhatsApp</label>
                        <span className="val">{formatPhone(phone) || '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Registered Email</label>
                        <span className="val">{email || '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Gender / DOB</label>
                        <span className="val">
                          {[profile.gender, profile.date_of_birth].filter(Boolean).join(' • ') || '-'}
                        </span>
                      </DataItem>
                      <DataItem>
                        <label>Teaching Mode Availability</label>
                        <span className="val">{profile.teaching_mode || 'On-Campus / Hybrid'}</span>
                      </DataItem>
                    </DataGrid>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h3><FaGraduationCap /> Professional Experience & Compensation</h3>
                      <span className="pill">Faculty Qualification</span>
                    </CardHeader>
                    <DataGrid>
                      <DataItem>
                        <label>Specialization Domain</label>
                        <span className="val">{specialization}</span>
                      </DataItem>
                      <DataItem>
                        <label>Industry Experience</label>
                        <span className="val">{profile.years_experience ? `${profile.years_experience} Years` : '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Previous Organization / Employer</label>
                        <span className="val">{profile.last_employer || '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Expected / Stated Compensation</label>
                        <span className="val" style={{ color: '#34d399', fontWeight: '700' }}>
                          {profile.expected_salary
                            ? (profile.expected_salary <= 100
                                ? `${profile.expected_salary}% Revenue Share`
                                : `PKR ${Number(profile.expected_salary).toLocaleString()} / month`)
                            : 'Not Specified'}
                        </span>
                      </DataItem>
                      <DataItem style={{ gridColumn: 'span 2' }}>
                        <label>LinkedIn / Portfolio Profile</label>
                        <span className="val">
                          {profile.linkedin ? (
                            <a
                              href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                            >
                              <FaLinkedin /> {profile.linkedin} <FaExternalLinkAlt size={11} />
                            </a>
                          ) : (
                            '-'
                          )}
                        </span>
                      </DataItem>
                    </DataGrid>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h3><FaMapMarkerAlt /> Address & Emergency Contacts</h3>
                      <span className="pill">Contact Dossier</span>
                    </CardHeader>
                    <DataGrid>
                      <DataItem>
                        <label>Current Residential Address</label>
                        <span className="val">{profile.current_address || '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Permanent National Address</label>
                        <span className="val">{profile.permanent_address || '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Emergency Contact Person</label>
                        <span className="val">{profile.emergency_name ? `${profile.emergency_name} (${profile.emergency_relationship || 'Contact'})` : '-'}</span>
                      </DataItem>
                      <DataItem>
                        <label>Emergency Phone</label>
                        <span className="val">{profile.emergency_phone || '-'}</span>
                      </DataItem>
                    </DataGrid>
                  </Card>
                </>
              )}

              {/* TAB 2: DOCUMENTS */}
              {activeTab === 'Documents' && (
                <>
                  <Card>
                    <CardHeader>
                      <h3><FaFileAlt /> Uploaded Candidate Credentials</h3>
                      <span className="pill">{documents.length} verified documents</span>
                    </CardHeader>
                    {documents.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '0.88rem' }}>
                        <FaFileAlt size={36} style={{ color: '#475569', marginBottom: '12px' }} />
                        <p style={{ margin: '0 0 6px', color: '#e2e8f0', fontWeight: '600' }}>No credentials uploaded yet.</p>
                        <p style={{ margin: 0, fontSize: '0.8rem' }}>
                          The instructor can upload their CNIC copies, CV, and degree certificates via the candidate self-onboarding portal at <code>/teacher/hr</code>.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {documents.map((doc) => {
                          const isPdf = doc.file_name?.toLowerCase().endsWith('.pdf') || doc.mime_type?.includes('pdf');
                          const isImg = doc.file_name?.match(/\.(png|jpg|jpeg|webp)$/i) || doc.mime_type?.includes('image');
                          const fileUrl = doc.file_url || doc.link_url;

                          return (
                            <DocCard key={doc.id || doc.file_name}>
                              <div className="doc-left">
                                <div className="doc-icon">
                                  {isPdf ? <FaFilePdf style={{ color: '#f87171' }} /> : isImg ? <FaFileImage style={{ color: '#38bdf8' }} /> : <FaFileAlt />}
                                </div>
                                <div className="doc-info">
                                  <strong>{doc.doc_type || doc.category || 'Uploaded File'}</strong>
                                  <span>{doc.file_name || doc.link_url || 'Document Attachment'} {doc.file_size ? `• ${doc.file_size}` : ''}</span>
                                </div>
                              </div>
                              <div className="doc-actions">
                                {fileUrl && (
                                  <>
                                    <MiniButton href={fileUrl} target="_blank" rel="noreferrer">
                                      <FaExternalLinkAlt size={11} /> View
                                    </MiniButton>
                                    <MiniButton href={fileUrl} download={doc.file_name} className="download">
                                      <FaDownload size={11} />
                                    </MiniButton>
                                  </>
                                )}
                              </div>
                            </DocCard>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </>
              )}

              {/* TAB 3: JOB DESCRIPTION */}
              {activeTab === 'JD' && (
                <>
                  {jd ? (
                    <Card>
                      <CardHeader>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', color: '#fff' }}>
                            <FaBriefcase /> {jd.position_title || 'Faculty Instructor'}
                          </h3>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                            {jd.employment_type || 'Full-time'} • {jd.working_hours || '20 hrs/week'}
                          </div>
                        </div>
                        <StatusPill $status={jd.teacher_status === 'approved' ? 'hired' : jd.teacher_status === 'changes_requested' ? 'rejected' : 'jd_sent'}>
                          {jd.teacher_status || 'Draft'}
                        </StatusPill>
                      </CardHeader>

                      <div style={{
                        background: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ddd6fe', fontSize: '0.85rem' }}>
                          <FaMoneyBillWave style={{ color: '#a78bfa' }} />
                          <strong>Agreed Compensation:</strong>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: '#34d399' }}>
                          {jd.compensation_text || 'As per institute policy'}
                        </span>
                      </div>

                      {jd.teacher_notes && (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '10px',
                          padding: '12px 16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
                            <FaExclamationTriangle /> Candidate Change Request:
                          </div>
                          <p style={{ margin: 0, fontSize: '0.84rem', color: '#fecaca', lineHeight: '1.5' }}>
                            "{jd.teacher_notes}"
                          </p>
                        </div>
                      )}

                      {jd.responsibilities && (
                        <div>
                          <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Core Responsibilities
                          </h4>
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6', background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '8px', whiteSpace: 'pre-line' }}>
                            {jd.responsibilities}
                          </div>
                        </div>
                      )}

                      {jd.requirements && (
                        <div>
                          <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Requirements & Qualifications
                          </h4>
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6', background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '8px', whiteSpace: 'pre-line' }}>
                            {jd.requirements}
                          </div>
                        </div>
                      )}

                      {onOpenComposer && canMutate && (
                        <FooterBtn
                          $variant="primary"
                          type="button"
                          onClick={() => onOpenComposer(application)}
                          style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                        >
                          <FaPaperPlane size={12} /> {jd.is_sent_to_teacher ? 'Revise & Re-Send JD' : 'Edit & Send JD'}
                        </FooterBtn>
                      )}
                    </Card>
                  ) : (
                    <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
                      <FaBriefcase size={36} style={{ color: '#475569', margin: '0 auto 12px' }} />
                      <h3 style={{ margin: '0 0 6px', color: '#fff', fontSize: '1.1rem' }}>No Job Description Drafted</h3>
                      <p style={{ margin: '0 0 18px', color: '#94a3b8', fontSize: '0.85rem', maxWidth: '440px', alignSelf: 'center' }}>
                        Generate a formal Job Description with appointment terms, teaching hours, and compensation using DeepSkills predefined JD templates.
                      </p>
                      {onOpenComposer && canMutate && (
                        <FooterBtn
                          $variant="primary"
                          type="button"
                          onClick={() => onOpenComposer(application)}
                          style={{ alignSelf: 'center' }}
                        >
                          <FaPaperPlane size={13} /> Draft Job Description
                        </FooterBtn>
                      )}
                    </Card>
                  )}
                </>
              )}

              {/* TAB 4: SIGNATURE */}
              {activeTab === 'Signature' && (
                <>
                  {signature ? (
                    <Card>
                      <CardHeader>
                        <h3><FaFileSignature /> Verified Candidate E-Signature</h3>
                        <StatusPill $status="signed">Legally Binding</StatusPill>
                      </CardHeader>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '16px 0' }}>
                        {signature.signature_type === 'drawn' && signature.signature_data?.startsWith('data:image') ? (
                          <div style={{
                            background: '#ffffff',
                            padding: '16px 24px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                            maxWidth: '320px',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center'
                          }}>
                            <img
                              src={signature.signature_data}
                              alt="Teacher digital signature"
                              style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            padding: '18px 28px',
                            borderRadius: '10px',
                            border: '1px dashed rgba(255, 255, 255, 0.2)',
                            fontFamily: 'cursive',
                            fontSize: '1.6rem',
                            color: '#e2e8f0'
                          }}>
                            {signature.signature_data || signature.signed_name || fullName}
                          </div>
                        )}

                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          Signed by <strong style={{ color: '#fff' }}>{signature.signed_name || fullName}</strong>
                        </span>
                      </div>

                      <DataGrid>
                        <DataItem>
                          <label>Signed Timestamp</label>
                          <span className="val">{signature.signed_at ? new Date(signature.signed_at).toLocaleString() : 'Recently'}</span>
                        </DataItem>
                        <DataItem>
                          <label>IP Address Audit Record</label>
                          <span className="val mono">{signature.ip_address || 'Verified Session'}</span>
                        </DataItem>
                      </DataGrid>
                    </Card>
                  ) : (
                    <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
                      <FaFileSignature size={36} style={{ color: '#475569', margin: '0 auto 12px' }} />
                      <h3 style={{ margin: '0 0 6px', color: '#fff', fontSize: '1.1rem' }}>Contract Not Signed Yet</h3>
                      <p style={{ margin: '0', color: '#94a3b8', fontSize: '0.85rem' }}>
                        Once the candidate reviews and approves the Job Description, they digitally sign the acceptance document at Step 4.
                      </p>
                    </Card>
                  )}
                </>
              )}

              {/* TAB 5: OFFICIAL HIRING FILES */}
              {activeTab === 'Hiring Files' && (
                <>
                  <Card>
                    <CardHeader>
                      <h3><FaFolderOpen /> Official Archival Dossiers</h3>
                      <span className="pill">{files.length} issued files</span>
                    </CardHeader>
                    {files.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '0.88rem' }}>
                        <FaFolderOpen size={36} style={{ color: '#475569', marginBottom: '12px' }} />
                        <p style={{ margin: '0 0 6px', color: '#e2e8f0', fontWeight: '600' }}>No hiring dossier generated yet.</p>
                        <p style={{ margin: 0, fontSize: '0.8rem' }}>
                          Official Acceptance Letters and compiled hiring archives are automatically produced upon completing Step 5 (Finalize Hire).
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {files.map((file) => (
                          <DocCard key={file.id || file.file_name}>
                            <div className="doc-left">
                              <div className="doc-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                                <FaFilePdf />
                              </div>
                              <div className="doc-info">
                                <strong>{file.file_type === 'acceptance_letter' ? 'Official Acceptance Letter' : 'Verified Faculty Hiring Dossier'}</strong>
                                <span>{file.file_name || 'Generated Document'}</span>
                              </div>
                            </div>
                            <div className="doc-actions">
                              {file.file_url && (
                                <MiniButton href={file.file_url} target="_blank" rel="noreferrer" className="download">
                                  <FaDownload size={11} /> Download PDF
                                </MiniButton>
                              )}
                            </div>
                          </DocCard>
                        ))}
                      </div>
                    )}

                    {onDownloadAcceptance && stage >= 4 && (
                      <FooterBtn
                        $variant="success"
                        type="button"
                        onClick={() => onDownloadAcceptance(application)}
                        style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                      >
                        <FaDownload size={12} /> Generate & Download Acceptance Letter
                      </FooterBtn>
                    )}
                  </Card>
                </>
              )}
            </DrawerBody>

            {/* STICKY BOTTOM DRAWER FOOTER */}
            <DrawerFooter>
              <div>
                {hrStatus !== 'rejected' && hrStatus !== 'hired' && onReject && canMutate && (
                  <FooterBtn
                    $variant="danger"
                    type="button"
                    onClick={() => onReject(application)}
                  >
                    <FaTimesCircle size={13} /> Reject Candidate
                  </FooterBtn>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FooterBtn type="button" onClick={onClose}>
                  Close
                </FooterBtn>

                {/* Primary progressive action */}
                {stage < 3 && onOpenComposer && canMutate && (
                  <FooterBtn
                    $variant="primary"
                    type="button"
                    onClick={() => onOpenComposer(application)}
                  >
                    <FaPaperPlane size={13} /> Draft & Send JD
                  </FooterBtn>
                )}

                {stage === 3 && jd?.teacher_status === 'changes_requested' && onOpenComposer && canMutate && (
                  <FooterBtn
                    $variant="primary"
                    type="button"
                    onClick={() => onOpenComposer(application)}
                  >
                    <FaPaperPlane size={13} /> Revise & Re-Send JD
                  </FooterBtn>
                )}

                {stage === 4 && onOpenFinalize && canMutate && (
                  <FooterBtn
                    $variant="success"
                    type="button"
                    onClick={() => onOpenFinalize(application)}
                  >
                    <FaBolt size={13} /> Finalize Hire & Sync Finance
                  </FooterBtn>
                )}

                {stage === 5 && onDownloadAcceptance && (
                  <FooterBtn
                    $variant="success"
                    type="button"
                    onClick={() => onDownloadAcceptance(application)}
                  >
                    <FaDownload size={13} /> Download Letter
                  </FooterBtn>
                )}
              </div>
            </DrawerFooter>
          </Drawer>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdminHRDrawer;
