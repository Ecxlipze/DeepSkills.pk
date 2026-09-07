import React from 'react';
import styled from 'styled-components';

import { FaClock, FaCheckCircle, FaSyncAlt, FaShieldAlt, FaFilePdf, FaEnvelope } from 'react-icons/fa';

const Wrap = styled.div`
  display: grid;
  gap: 18px;
`;

const Card = styled.div`
  background: #111318;
  border-radius: 16px;
  padding: 28px;
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }
`;

const StepList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 20px 0;
`;

const StepItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${p => p.$active ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.25)'};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 10px;

  .step-icon {
    font-size: 1.1rem;
    color: ${p => p.$active ? '#f59e0b' : '#10b981'};
    flex-shrink: 0;
  }

  .step-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    strong {
      font-size: 0.82rem;
      color: #f1f5f9;
    }
    
    span {
      font-size: 0.74rem;
      color: ${p => p.$active ? '#fcd34d' : '#86efac'};
    }
  }
`;

const NoticeBox = styled.div`
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 12px;
  padding: 16px;
  font-size: 0.85rem;
  color: #c4b5fd;
  line-height: 1.5;
  margin-bottom: 20px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const Button = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px;
  border-radius: 10px;
  color: #fff;
  background: ${({ $secondary }) => ($secondary ? 'transparent' : '#8B5CF6')};
  border: 1px solid ${({ $secondary }) => ($secondary ? 'rgba(255,255,255,0.14)' : '#8B5CF6')};
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const ShareButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  border-radius: 10px;
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.14);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const formatBytes = (value) => {
  if (!value) return 'PDF';
  const size = Number(value);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const labels = {
  acceptance_letter: 'Official Acceptance Letter',
  hiring_file: 'Complete Hiring Dossier'
};

const HRFilesStep = ({ files, loading, onShare }) => {
  if (!files || !files.length) {
    return (
      <Card>
        <StatusHeader>
          <div className="icon-wrap">
            <FaClock />
          </div>
          <div>
            <h2>Onboarding Submitted — Awaiting HR Approval</h2>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>DeepSkills Faculty Onboarding Verification Pipeline</div>
          </div>
        </StatusHeader>

        <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5', margin: '14px 0 0' }}>
          Congratulations on completing your faculty submission! Your educational credentials, identity documents, and digitally signed agreement are now undergoing formal review by the Human Resources Department.
        </p>

        <StepList>
          <StepItem>
            <FaCheckCircle className="step-icon" />
            <div className="step-text">
              <strong>1. Profile Details</strong>
              <span>Submitted</span>
            </div>
          </StepItem>
          <StepItem>
            <FaCheckCircle className="step-icon" />
            <div className="step-text">
              <strong>2. Document Uploads</strong>
              <span>Verified Upload</span>
            </div>
          </StepItem>
          <StepItem>
            <FaCheckCircle className="step-icon" />
            <div className="step-text">
              <strong>3. Job Description</strong>
              <span>Agreed & Accepted</span>
            </div>
          </StepItem>
          <StepItem>
            <FaCheckCircle className="step-icon" />
            <div className="step-text">
              <strong>4. Contract Signature</strong>
              <span>Digitally Signed</span>
            </div>
          </StepItem>
          <StepItem $active>
            <FaClock className="step-icon" />
            <div className="step-text">
              <strong>5. HR Final Approval</strong>
              <span>Under Review</span>
            </div>
          </StepItem>
        </StepList>

        <NoticeBox>
          <strong>What unlocks upon HR Approval?</strong>
          <div style={{ marginTop: '4px' }}>
            As soon as HR finalizes your application, your instructor account status flips to <strong>Active</strong>. Your full teaching dashboard (assigned batches, student roster, attendance tracker, tasks, and class group chats) will automatically unlock, and your official Acceptance Letter PDF will be available here for download.
          </div>
        </NoticeBox>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            as="button"
            type="button"
            onClick={() => window.location.reload()}
            style={{ cursor: 'pointer' }}
          >
            <FaSyncAlt /> Check Approval Status
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Wrap>
      {files.map((file) => (
        <Card key={file.id}>
          <h3>{labels[file.file_type] || file.file_type}</h3>
          <p>{file.file_name || 'Generated PDF'} • {formatBytes(file.file_size)}</p>
          <Actions>
            <Button href={file.file_url} target="_blank" rel="noreferrer">Download PDF</Button>
            <ShareButton type="button" onClick={onShare} disabled={loading}>
              {loading ? 'Sharing...' : 'Share via Email'}
            </ShareButton>
          </Actions>
        </Card>
      ))}
    </Wrap>
  );
};

export default HRFilesStep;
