import React, { useState } from 'react';
import styled from 'styled-components';
import DashboardLayout from '../components/DashboardLayout';
import AnnouncementCard from '../components/AnnouncementCard';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { FaBullhorn, FaEnvelopeOpen } from 'react-icons/fa';

const Container = styled.div`color: #fff;`;

const PageHeader = styled.div`
  margin-bottom: 25px;
  h1 { font-size: 1.8rem; font-weight: 800; margin: 0 0 5px; }
  p { color: #888; font-size: 0.9rem; }
`;

const TabBar = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 25px;
`;

const Tab = styled.button`
  padding: 8px 18px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; border: 1px solid ${p => p.$active ? '#378ADD' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(55,138,221,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#378ADD' : '#888'};
  display: flex; align-items: center; gap: 6px;
  &:hover { border-color: #378ADD; }
`;

const CountBadge = styled.span`
  background: #e74c3c; color: #fff; font-size: 0.65rem; font-weight: 700;
  padding: 1px 6px; border-radius: 10px; min-width: 16px; text-align: center;
`;

const FeedList = styled.div`display: flex; flex-direction: column; gap: 15px;`;

const EmptyState = styled.div`
  text-align: center; padding: 80px 20px; color: #555;
  background: #111318; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);
  .emoji { font-size: 4rem; margin-bottom: 15px; }
  h3 { color: #888; font-size: 1.2rem; margin-bottom: 5px; }
  p { font-size: 0.9rem; }
`;

const StudentAnnouncements = () => {
  const { announcements, readIds, markAsRead, unreadCount } = useAnnouncements();
  const [tab, setTab] = useState('all');

  const feed = announcements.filter(a => {
    if (!a.is_active) return false;
    if (tab === 'pinned') return a.is_pinned;
    if (tab === 'admin') return a.posted_by_role === 'admin';
    if (tab === 'teacher') return a.posted_by_role === 'teacher';
    if (tab === 'unread') return !readIds.includes(a.id);
    return true;
  });

  return (
    <DashboardLayout>
      <Container>
        <PageHeader>
          <h1><FaBullhorn style={{ marginRight: '10px', color: '#f59e0b' }} /> Announcements</h1>
          <p>Stay updated with the latest announcements from admin and your teachers</p>
        </PageHeader>

        <TabBar>
          {[
            ['all', 'All', null],
            ['pinned', 'Pinned', null],
            ['admin', 'Admin', null],
            ['teacher', 'From Teacher', null],
            ['unread', 'Unread', unreadCount > 0 ? unreadCount : null]
          ].map(([key, label, count]) => (
            <Tab key={key} $active={tab === key} onClick={() => setTab(key)}>
              {label}
              {count !== null && <CountBadge>{count}</CountBadge>}
            </Tab>
          ))}
        </TabBar>

        {feed.length === 0 ? (
          <EmptyState>
            <div className="emoji"><FaEnvelopeOpen style={{ fontSize: '3rem', color: '#6b7280' }} /></div>
            <h3>No announcements yet</h3>
            <p>Check back later for updates from your admin and teachers</p>
          </EmptyState>
        ) : (
          <FeedList>
            {feed.map(a => (
              <AnnouncementCard key={a.id} announcement={a}
                isRead={readIds.includes(a.id)} onMarkRead={markAsRead} />
            ))}
          </FeedList>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default StudentAnnouncements;
