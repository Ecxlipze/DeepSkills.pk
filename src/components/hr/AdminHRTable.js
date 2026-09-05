import React from 'react';
import styled from 'styled-components';
import { getSubmittedDocumentStats } from '../../utils/hrDocuments';

const TableWrap = styled.div`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  overflow: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: #fff;
  }

  th {
    color: #8e97a8;
    font-size: 0.85rem;
    text-transform: uppercase;
  }
`;

const Badge = styled.span`
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(79, 142, 247, 0.14);
  color: #4F8EF7;
  font-size: 0.8rem;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  background: ${({ $danger, $primary, $success }) => {
    if ($danger) return 'transparent';
    if ($success) return '#2ecc71';
    if ($primary) return '#4F8EF7';
    return 'transparent';
  }};
  color: ${({ $danger }) => ($danger ? '#ff7676' : '#fff')};
  border: 1px solid ${({ $danger, $success, $primary }) => {
    if ($danger) return 'rgba(255, 118, 118, 0.4)';
    if ($success) return '#2ecc71';
    if ($primary) return '#4F8EF7';
    return 'rgba(255,255,255,0.12)';
  }};
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
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
          <th>Teacher</th>
          <th>Specialization</th>
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
          const stats = getSubmittedDocumentStats(documents);
          return (
            <tr key={profile.id}>
              <td>{teacher?.name || profile.full_name}</td>
              <td>{profile.specialization || teacher?.specialization || '-'}</td>
              <td><Badge>{stepLabel(profile.current_step)}</Badge></td>
              <td><Badge>{stats.submitted}/{stats.total} docs</Badge></td>
              <td><Badge>{jdStatusLabel(jd)}</Badge></td>
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
      </tbody>
    </Table>
  </TableWrap>
);

export default AdminHRTable;
