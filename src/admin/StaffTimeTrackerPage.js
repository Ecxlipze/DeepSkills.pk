import React from 'react';
import styled from 'styled-components';
import { AdminLayout } from '../components/AdminLayout';
import TimeTrackerHub from '../components/time/TimeTrackerHub';
import { useAuth } from '../context/AuthContext';

const PageContainer = styled.div`
  padding: 24px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

export default function StaffTimeTrackerPage() {
  const { user } = useAuth();

  return (
    <AdminLayout>
      <PageContainer>
        <TimeTrackerHub portalArea="Staff" user={user} />
      </PageContainer>
    </AdminLayout>
  );
}
