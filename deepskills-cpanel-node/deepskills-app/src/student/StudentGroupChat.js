import React from 'react';
import GroupChat from '../components/GroupChat';
import DashboardLayout from '../components/DashboardLayout';

const StudentGroupChat = () => {
  return (
    <DashboardLayout>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <GroupChat />
      </div>
    </DashboardLayout>
  );
};

export default StudentGroupChat;
