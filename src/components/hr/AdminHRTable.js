import React from 'react';
import styled from 'styled-components';
import { getSubmittedDocumentStats } from '../../utils/hrDocuments';

const TableWrap = styled.div`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 960px;

  th, td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #fff;
    vertical-align: middle;
  }

  th {
    color: #8e97a8;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.2;
  background: ${(p) => {
    if (p.$variant === 'success') return 'rgba(16, 185, 129, 0.14)';
    if (p.$variant === 'warning') return 'rgba(245, 158, 11, 0.14)';
    if (p.$variant === 'info') return 'rgba(56, 189, 248, 0.14)';
    if (p.$variant === 'danger') return 'rgba(239, 68, 68, 0.14)';
    return 'rgba(148, 163, 184, 0.12)';
  }};
  color: ${(p) => {
    if (p.$variant === 'success') return '#34d399';
    if (p.$variant === 'warning') return '#fbbf24';
    if (p.$variant === 'info') return '#38bdf8';
    if (p.$variant === 'danger') return '#f87171';
    return '#94a3b8';
  }};
  border: 1px solid ${(p) => {
    if (p.$variant === 'success') return 'rgba(16, 185, 129, 0.3)';
    if (p.$variant === 'warning') return 'rgba(245, 158, 11, 0.3)';
    if (p.$variant === 'info') return 'rgba(56, 189, 248, 0.3)';
    if (p.$variant === 'danger') return 'rgba(239, 68, 68, 0.3)';
    return 'rgba(148, 163, 184, 0.2)';
  }};
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`;

const Button = styled.button`
  background: ${({ $danger, $primary, $success }) => {
    if ($danger) return 'rgba(239, 68, 68, 0.1)';
    if ($success) return '#10b981';
    if ($primary) return '#4F8EF7';
    return 'rgba(255, 255, 255, 0.05)';
  }};
  color: ${({ $danger, $success, $primary }) => {
    if ($danger) return '#f87171';
    if ($success || $primary) return '#fff';
    return '#e2e8f0';
  }};
  border: 1px solid ${({ $danger, $success, $primary }) => {
    if ($danger) return 'rgba(239, 68, 68, 0.3)';
    if ($success) return '#10b981';
    if ($primary) return '#4F8EF7';
    return 'rgba(255, 255, 255, 0.12)';
  }};
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: ${({ $danger, $primary, $success }) => {
      if ($danger) return 'rgba(239, 68, 68, 0.2)';
      if ($success) return '#059669';
      if ($primary) return '#3b82f6';
      return 'rgba(255, 255, 255, 0.1)';
    }};
  }
`;

const TypeBadge = styled.span`
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${(p) => p.$type === 'staff' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(168, 85, 247, 0.14)'};
  color: ${(p) => p.$type === 'staff' ? '#38bdf8' : '#c084fc'};
  border: 1px solid ${(p) => p.$type === 'staff' ? 'rgba(56, 189, 248, 0.28)' : 'rgba(168, 85, 247, 0.28)'};
`;

const jdStatusLabel = (jd) => {
  if (!jd) return 'Not Generated';
  if (jd.teacher_status === 'approved') return 'Approved';
  if (jd.teacher_status === 'changes_requested') return 'Change Requested';
  return jd.is_sent_to_teacher ? 'Generated' : 'Draft';
};

const stepLabel = (step) => ({
  1: 'Personal Info',
  2: 'Documents',
  3: 'JD Review',
  4: 'Signature',
  5: 'Complete'
}[step] || 'Unknown');

const getStepVariant = (step) => {
  if (step === 5) return 'success';
  if (step >= 2) return 'info';
  return 'neutral';
};

const getJdVariant = (jd) => {
  if (!jd) return 'neutral';
  if (jd.teacher_status === 'approved') return 'success';
  if (jd.teacher_status === 'changes_requested') return 'warning';
  return 'info';
};

const getDocsVariant = (stats) => {
  if (stats.submitted === stats.total && stats.total > 0) return 'success';
  if (stats.submitted > 0) return 'info';
  return 'neutral';
};

const AdminHRTable = ({
  applications,
  canMutate = true,
  onView,
  onCreateJd,
  onFinalize,
  onReject
}) => (
  <TableWrap>
    <Table>
      <thead>
        <tr>
          <th>Candidate</th>
          <th>Type</th>
          <th>Role / Specialization</th>
          <th>Step</th>
          <th>Documents</th>
          <th>JD Status</th>
          <th>Hired On</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {applications.map((application) => {
          const { teacher, profile, documents, jd, signature } = application;
          const isStaff = application.isStaff || Boolean(profile.user_id || profile.employee_type === 'staff');
          const stats = getSubmittedDocumentStats(documents);
          return (
            <tr key={profile.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{teacher?.name || profile.full_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{teacher?.cnic || profile.cnic}</div>
              </td>
              <td>
                <TypeBadge $type={isStaff ? 'staff' : 'faculty'}>
                  {isStaff ? 'Staff' : 'Faculty'}
                </TypeBadge>
              </td>
              <td>{profile.specialization || teacher?.specialization || '-'}</td>
              <td><Badge $variant={getStepVariant(profile.current_step)}>{stepLabel(profile.current_step)}</Badge></td>
              <td><Badge $variant={getDocsVariant(stats)}>{stats.submitted}/{stats.total} docs</Badge></td>
              <td><Badge $variant={getJdVariant(jd)}>{jdStatusLabel(jd)}</Badge></td>
              <td>{profile.hired_at ? new Date(profile.hired_at).toLocaleDateString() : '-'}</td>
              <td>
                <ActionRow>
                  <Button type="button" onClick={() => onView(application)}>View Profile</Button>
                  {canMutate && profile.current_step >= 3 && profile.hr_status !== 'hired' && profile.hr_status !== 'rejected' && (
                    <Button type="button" $primary onClick={() => onCreateJd(application)}>Create JD Draft</Button>
                  )}
                  {canMutate && signature && profile.hr_status !== 'hired' && (
                    <Button type="button" $success onClick={() => onFinalize(application)}>Finalize Hiring</Button>
                  )}
                  {canMutate && profile.hr_status !== 'hired' && profile.hr_status !== 'rejected' && (
                    <Button type="button" $danger onClick={() => onReject(application)}>Reject</Button>
                  )}
                </ActionRow>
              </td>
            </tr>
          );
        })}
        {applications.length === 0 && (
          <tr>
            <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No candidates matching your filter or search criteria.
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </TableWrap>
);

export default AdminHRTable;
