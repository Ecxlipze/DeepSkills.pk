import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaBullhorn, FaBullseye, FaEnvelopeOpen } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import AnnouncementCard from '../components/AnnouncementCard';
import { useAuth } from '../context/AuthContext';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { getAssignedTeacherBatches, getTeacherByCnic } from '../utils/teacherUtils';

const Container = styled.div`color: #fff;`;

const PostCard = styled.div`
  background: #111318; border-radius: 16px; padding: 25px;
  border: 1px solid rgba(255,255,255,0.05); margin-bottom: 30px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 20px; display: flex; align-items: center; gap: 10px; }
`;

const Input = styled.input`
  width: 100%; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);
  padding: 12px; border-radius: 8px; color: #fff; font-size: 0.9rem; margin-bottom: 12px;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const TextArea = styled.textarea`
  width: 100%; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);
  padding: 12px; border-radius: 8px; color: #fff; font-size: 0.9rem;
  min-height: 100px; resize: vertical; font-family: inherit; margin-bottom: 12px;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const FormFooter = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
`;

const AudienceLabel = styled.span`
  font-size: 0.8rem; color: #888; background: rgba(255,255,255,0.03);
  padding: 8px 14px; border-radius: 8px;
`;

const Select = styled.select`
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 12px; border-radius: 8px; color: #fff; font-size: 0.85rem; margin-bottom: 12px;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const PostBtn = styled.button`
  background: #7B1F2E; color: #fff; border: none; padding: 10px 24px;
  border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
  &:hover { background: #9c273a; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const FeedHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
  h2 { font-size: 1.3rem; font-weight: 800; }
`;

const TabBar = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap;
`;

const Tab = styled.button`
  padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; border: 1px solid ${p => p.$active ? '#378ADD' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(55,138,221,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#378ADD' : '#888'};
  &:hover { border-color: #378ADD; }
`;

const FeedList = styled.div`display: flex; flex-direction: column; gap: 15px;`;

const EmptyState = styled.div`
  text-align: center; padding: 60px 20px; color: #555;
  .emoji { font-size: 3rem; margin-bottom: 15px; }
  h3 { color: #888; }
`;

const TeacherAnnouncements = () => {
  const { user } = useAuth();
  const { announcements, readIds, markAsRead, createAnnouncement, unreadCount } = useAnnouncements();
  const [teacherBatches, setTeacherBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState('all');

  // Fetch teacher's batches
  const fetchBatches = useCallback(async () => {
    if (!user) return;
    try {
      const teacher = await getTeacherByCnic(user.cnic);
      const assigned = await getAssignedTeacherBatches(teacher.id);
      const active = assigned.filter(b => b.status === 'Active');
      setTeacherBatches(active);
      if (active.length > 0) setSelectedBatch(active[0].batch_name);
    } catch (err) {
      console.error('Error fetching teacher batches:', err);
    }
  }, [user]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handlePost = async () => {
    if (!title.trim() || !body.trim()) return toast.error('Title and body are required');
    if (!selectedBatch) return toast.error('No batch selected');
    setPosting(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        posted_by_name: user.name || 'Teacher',
        posted_by_role: 'teacher',
        audience_type: 'targeted',
        audience_roles: ['student'],
        audience_batches: [selectedBatch],
        audience_courses: null,
        is_pinned: false,
        is_active: true,
        posted_at: new Date().toISOString()
      });
      toast.success('Announcement posted to ' + selectedBatch);
      setTitle(''); setBody('');
    } catch {
      toast.error('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  // Filter feed
  const feed = announcements.filter(a => {
    if (tab === 'pinned') return a.is_pinned;
    if (tab === 'admin') return a.posted_by_role === 'admin';
    if (tab === 'mine') return a.posted_by_role === 'teacher' && a.posted_by_name === (user?.name || '');
    if (tab === 'unread') return !readIds.includes(a.id);
    return true;
  });

  return (
    <DashboardLayout>
      <Container>
        <PostCard>
          <h3><FaBullhorn /> Post to Your Batch</h3>
          {teacherBatches.length > 1 && (
            <Select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
              {teacherBatches.map(b => <option key={b.batch_name} value={b.batch_name}>{b.batch_name}</option>)}
            </Select>
          )}
          <Input placeholder="Announcement title..." value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          <TextArea placeholder="Write your announcement..." value={body} onChange={e => setBody(e.target.value)} />
          <FormFooter>
            <AudienceLabel><FaBullseye style={{ marginRight: '6px', color: '#38bdf8' }} /> {selectedBatch || 'No batch assigned'}</AudienceLabel>
            <PostBtn onClick={handlePost} disabled={posting || !title.trim() || !body.trim()}>
              <FaBullhorn /> {posting ? 'Posting...' : 'Post Announcement'}
            </PostBtn>
          </FormFooter>
        </PostCard>

        <FeedHeader>
          <h2>Announcements Feed</h2>
          <TabBar>
            {[['all','All'],['pinned','Pinned'],['admin','Admin'],['mine','My Posts'],['unread',`Unread (${unreadCount})`]].map(([key,label]) => (
              <Tab key={key} $active={tab === key} onClick={() => setTab(key)}>{label}</Tab>
            ))}
          </TabBar>
        </FeedHeader>

        {feed.length === 0 ? (
          <EmptyState><div className="emoji"><FaEnvelopeOpen style={{ fontSize: '2.5rem', color: '#6b7280' }} /></div><h3>No announcements</h3><p>Check back later</p></EmptyState>
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

export default TeacherAnnouncements;
