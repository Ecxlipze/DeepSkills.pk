import React from 'react';
import styled from 'styled-components';
import StaffLayout from '../components/StaffLayout';
import JiraBoard from '../components/tasks/JiraBoard';
import { portalTheme } from '../components/portal/PortalTheme';

const PageWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  .title-group {
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      margin: 0 0 4px 0;
      color: #fff;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
      color: ${portalTheme.colors.textSecondary};
    }
  }
`;

export default function StaffTasksPage() {
  return (
    <StaffLayout>
      <PageWrapper>
        <PageHeader>
          <div className="title-group">
            <h1>Staff Tasks & Jira Delivery Board</h1>
            <p>
              Agile Kanban columns, delivery roadmap timeline, priority tracking, and 1-click live time logging.
            </p>
          </div>
        </PageHeader>

        <JiraBoard />
      </PageWrapper>
    </StaffLayout>
  );
}
