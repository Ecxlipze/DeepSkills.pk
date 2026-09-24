import React, { useState } from 'react';
import styled from 'styled-components';
import { FaUserTie, FaEnvelope, FaPhone, FaIdCard, FaCalendarCheck, FaPaperPlane } from 'react-icons/fa';
import toast from 'react-hot-toast';
import StaffLayout from '../components/StaffLayout';
import { portalTheme } from '../components/portal/PortalTheme';
import { useAuth } from '../context/AuthContext';
import DatePicker from '../components/DatePicker';

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const PageHeader = styled.div`
  h1 {
    font-size: 1.6rem;
    font-weight: 800;
    margin: 0 0 4px 0;
    color: #fff;
  }
  p {
    margin: 0;
    font-size: 0.88rem;
    color: ${portalTheme.colors.textSecondary};
  }
`;

const ProfileCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const DetailItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${portalTheme.radii.md};
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;

  .icon {
    font-size: 1.2rem;
    color: #378ADD;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .label {
      font-size: 0.74rem;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .value {
      font-size: 0.92rem;
      font-weight: 600;
      color: #fff;
    }
  }
`;

const LeaveFormCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.lg};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
  }
`;

const FormGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 0.78rem;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    input, select, textarea {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: ${portalTheme.radii.sm};
      padding: 10px 12px;
      color: #fff;
      font-size: 0.88rem;
      outline: none;

      &:focus {
        border-color: rgba(123, 31, 46, 0.8);
      }
    }
  }
`;

const SubmitBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #7B1F2E, #9B283B);
  color: #fff;
  border: none;
  padding: 12px 20px;
  border-radius: ${portalTheme.radii.md};
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  align-self: flex-start;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
`;

export default function StaffProfilePage() {
  const { user } = useAuth();
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmitLeave = (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please complete all leave fields');
      return;
    }
    toast.success('Leave request submitted to HR for approval');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  return (
    <StaffLayout>
      <Container>
        <PageHeader>
          <h1>My Profile & Personnel File</h1>
          <p>View your institutional records, designation details, and submit leave absence requests.</p>
        </PageHeader>

        <ProfileCard>
          <DetailGrid>
            <DetailItem>
              <div className="icon"><FaUserTie /></div>
              <div className="meta">
                <span className="label">Full Name</span>
                <span className="value">{user?.name || user?.full_name || 'Staff Member'}</span>
              </div>
            </DetailItem>

            <DetailItem>
              <div className="icon"><FaIdCard /></div>
              <div className="meta">
                <span className="label">CNIC Number</span>
                <span className="value">{user?.cnic || 'N/A'}</span>
              </div>
            </DetailItem>

            <DetailItem>
              <div className="icon"><FaEnvelope /></div>
              <div className="meta">
                <span className="label">Official Email</span>
                <span className="value">{user?.email || 'N/A'}</span>
              </div>
            </DetailItem>

            <DetailItem>
              <div className="icon"><FaUserTie /></div>
              <div className="meta">
                <span className="label">Assigned Role</span>
                <span className="value">
                  {user?.customRoleName || user?.roleName || user?.custom_roles?.name || (user?.role === 'custom' ? (user?.designation || 'Staff Member') : (user?.role || 'Staff Member'))}
                </span>
              </div>
            </DetailItem>
          </DetailGrid>
        </ProfileCard>

        <LeaveFormCard>
          <h2><FaCalendarCheck /> Request Absence / Leave</h2>
          <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormGroup>
              <div className="field">
                <label>Leave Type</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  <option value="Casual">Casual Leave</option>
                  <option value="Medical">Medical / Sick Leave</option>
                  <option value="Annual">Annual Paid Leave</option>
                  <option value="Emergency">Emergency Leave</option>
                </select>
              </div>

              <div className="field">
                <label>From Date</label>
                <DatePicker
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="From Date"
                />
              </div>

              <div className="field">
                <label>To Date</label>
                <DatePicker
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="To Date"
                />
              </div>
            </FormGroup>

            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: portalTheme.colors.textMuted, textTransform: 'uppercase' }}>Reason / Details</label>
              <textarea
                rows="3"
                placeholder="State the reason for your leave request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <SubmitBtn type="submit">
              <FaPaperPlane /> Submit Leave Request
            </SubmitBtn>
          </form>
        </LeaveFormCard>
      </Container>
    </StaffLayout>
  );
}
