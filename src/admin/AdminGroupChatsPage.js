import React from 'react';
import styled from 'styled-components';
import AdminLayout from '../components/AdminLayout';
import GroupChat from '../components/GroupChat';
import { portalTheme } from '../components/portal/PortalTheme';
import { PortalHeader } from '../components/portal/PortalHeader';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  height: calc(100vh - 120px);
`;

const ChatWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const AdminGroupChatsPage = () => {
  return (
    <AdminLayout>
      <Container>
        <PortalHeader
          breadcrumb={['Admin', 'Academics', 'Group Chats']}
          title="Batch Group Chats & Moderation"
          highlightWord="Moderation"
          subtitle="Monitor discussions, communicate with students and instructors, and moderate batch channels."
        />
        <ChatWrapper>
          <GroupChat />
        </ChatWrapper>
      </Container>
    </AdminLayout>
  );
};

export default AdminGroupChatsPage;
