import React from 'react';
import styled from 'styled-components';
import DashboardLayout from '../components/DashboardLayout';
import TimeTrackerHub from '../components/time/TimeTrackerHub';
import { useAuth } from '../context/AuthContext';

const PageContainer = styled.div`
  width: 100%;
  box-sizing: border-box;
`;

export default function TeacherTimeTrackerPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <PageContainer>
        <TimeTrackerHub portalArea="Faculty" user={user} />
      </PageContainer>
    </DashboardLayout>
  );
}
