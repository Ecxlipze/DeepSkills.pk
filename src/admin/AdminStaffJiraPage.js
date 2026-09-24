import React from 'react';
import styled from 'styled-components';
import { AdminLayout } from '../components/AdminLayout';
import JiraBoard from '../components/tasks/JiraBoard';
import { portalTheme } from '../components/portal/PortalTheme';

const PageContainer = styled.div`
  padding: 24px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const HeaderArea = styled.div`
  margin-bottom: 20px;

  h1 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 4px 0;
    color: #fff;
  }

  p {
    margin: 0;
    color: ${portalTheme.colors.textSecondary};
    font-size: 0.9rem;
  }
`;

export default function AdminStaffJiraPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <HeaderArea>
          <h1>Staff Jira Tasks & Delivery Board</h1>
          <p>
            Cross-department Kanban workflows, delivery timelines, priorities, and live effort tracking.
          </p>
        </HeaderArea>
        <JiraBoard />
      </PageContainer>
    </AdminLayout>
  );
}
