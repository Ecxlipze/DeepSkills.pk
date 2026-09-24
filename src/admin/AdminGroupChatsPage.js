import React from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import {
  FaChartBar,
  FaCalendarCheck,
  FaTasks,
  FaAward,
  FaBullhorn,
  FaComments,
  FaBookOpen,
  FaUsers,
  FaLayerGroup,
  FaVolumeMute,
  FaCommentDots,
  FaSyncAlt
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import GroupChat from '../components/GroupChat';
import { useGroupChat } from '../context/GroupChatContext';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1440px;
  margin: 0 auto;
  padding-bottom: 24px;
`;

const SubNavRibbon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 4px;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
`;

const NavChip = styled.button`
  background: ${props => props.$active ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => props.$active ? '#c084fc' : '#94a3b8'};
  border: 1px solid ${props => props.$active ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
  padding: 7px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(168, 85, 247, 0.2);
    color: #fff;
    border-color: rgba(168, 85, 247, 0.5);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 22px 26px;

  .title-area {
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
      letter-spacing: -0.02em;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.5;
    }
  }

  .action-cluster {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
`;

const HeaderBtn = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.primary {
    background: linear-gradient(135deg, #7B1F2E 0%, #9B283B 100%);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 14px rgba(123, 31, 46, 0.35);
    &:hover { background: #b32d43; transform: translateY(-1px); }
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
    border-color: rgba(255, 255, 255, 0.1);
    &:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 4px;
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;

  .label {
    font-size: 0.76rem;
    text-transform: uppercase;
    font-weight: 800;
    color: #94a3b8;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .val {
    font-size: 1.85rem;
    font-weight: 800;
    color: #fff;
  }
  .sub {
    font-size: 0.78rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
  }
`;

const ChatWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const AdminGroupChatsPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeBatch,
    availableBatches,
    members,
    mutes,
    messages,
    fetchMessages
  } = useGroupChat();

  const handleRefresh = () => {
    if (fetchMessages) fetchMessages();
  };

  return (
    <AdminLayout>
      <Container>
        {/* Navigation Ribbon */}
        <SubNavRibbon>
          {user?.role === 'admin' && (
            <NavChip onClick={() => router.push('/admin/academic')}>
              <FaChartBar /> Academic Hub
            </NavChip>
          )}
          {(user?.role === 'admin' || canAccess(user?.permissions || {}, 'attendance', 'view')) && (
            <NavChip onClick={() => router.push('/admin/academic/attendance')}>
              <FaCalendarCheck /> Attendance
            </NavChip>
          )}
          {(user?.role === 'admin' || canAccess(user?.permissions || {}, 'tasks', 'view')) && (
            <NavChip onClick={() => router.push('/admin/academic/tasks')}>
              <FaTasks /> Tasks & Homework
            </NavChip>
          )}
          {(user?.role === 'admin' || canAccess(user?.permissions || {}, 'results', 'view')) && (
            <NavChip onClick={() => router.push('/admin/academic/results')}>
              <FaAward /> Exams & Results
            </NavChip>
          )}
          {(user?.role === 'admin' || canAccess(user?.permissions || {}, 'announcements', 'view')) && (
            <NavChip onClick={() => router.push('/admin/academic/announcements')}>
              <FaBullhorn /> Announcements
            </NavChip>
          )}
          {(user?.role === 'admin' || canAccess(user?.permissions || {}, 'complaints', 'view')) && (
            <NavChip onClick={() => router.push('/admin/academic/complaints')}>
              <FaComments /> Grievances
            </NavChip>
          )}
          <NavChip $active onClick={() => router.push('/admin/academic/chats')}>
            <FaComments /> Group Chats
          </NavChip>
          {(user?.role === 'admin' || canAccess(user?.permissions || {}, 'reports', 'view')) && (
            <NavChip onClick={() => router.push('/admin/academic/reports')}>
              <FaBookOpen /> Academic Reports
            </NavChip>
          )}
        </SubNavRibbon>

        {/* Top Header */}
        <Header>
          <div className="title-area">
            <h1>
              <FaComments style={{ color: '#c084fc' }} /> Batch Group Chats & Community Desk
            </h1>
            <p>Real-time batch discussion channels, instructor broadcasts, moderation controls, and student engagement monitoring.</p>
          </div>

          <div className="action-cluster">
            <HeaderBtn className="secondary" onClick={handleRefresh}>
              <FaSyncAlt /> Refresh Messages
            </HeaderBtn>
          </div>
        </Header>

        {/* Telemetry KPI Cards */}
        <StatsGrid>
          <StatCard>
            <div className="label">
              <FaLayerGroup style={{ color: '#38bdf8' }} /> Monitored Batches
            </div>
            <div className="val">{availableBatches?.length || 0}</div>
            <div className="sub">Active channels available</div>
          </StatCard>

          <StatCard>
            <div className="label">
              <FaUsers style={{ color: '#10b981' }} /> Active Channel Roster
            </div>
            <div className="val">{members?.length || 0}</div>
            <div className="sub">Enrolled in {activeBatch || 'selected batch'}</div>
          </StatCard>

          <StatCard>
            <div className="label">
              <FaCommentDots style={{ color: '#c084fc' }} /> Session Messages
            </div>
            <div className="val">{messages?.length || 0}</div>
            <div className="sub">Live messages loaded</div>
          </StatCard>

          <StatCard>
            <div className="label">
              <FaVolumeMute style={{ color: '#f87171' }} /> Moderation Mutes
            </div>
            <div className="val">{mutes?.length || 0}</div>
            <div className="sub">Silenced accounts in channel</div>
          </StatCard>
        </StatsGrid>

        {/* Live Chat System */}
        <ChatWrapper>
          <GroupChat />
        </ChatWrapper>
      </Container>
    </AdminLayout>
  );
};

export default AdminGroupChatsPage;


