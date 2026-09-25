import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  FaBullhorn, FaBlog, FaUsers, FaShareAlt, FaPlus, FaSearch,
  FaCheckCircle, FaClock, FaEye, FaCalendarAlt, FaExternalLinkAlt,
  FaSignInAlt, FaSignOutAlt, FaCoffee, FaPlay, FaStop, FaChartLine,
  FaFilter, FaVideo, FaTags, FaFire, FaTimes, FaSave, FaExclamationCircle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { portalTheme } from '../../components/portal/PortalTheme';
import { supabase } from '../../supabaseClient';
import { formatSeconds, formatHourDecimal } from '../../utils/timeTrackingApi';

// ─── Styled Components ───

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 1280px;
  margin: 0 auto;
  color: #fff;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.22) 0%, rgba(24, 27, 38, 0.95) 100%);
  border: 1px solid rgba(236, 72, 153, 0.35);
  border-radius: ${portalTheme.radii.lg};
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  .text-side {
    display: flex;
    flex-direction: column;
    gap: 6px;

    h1 {
      font-size: 1.6rem;
      font-weight: 800;
      margin: 0;
      color: #fff;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
      color: ${portalTheme.colors.textSecondary};
    }
  }

  .role-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(236, 72, 153, 0.15);
    border: 1px solid rgba(236, 72, 153, 0.4);
    color: #f472b6;
    padding: 6px 14px;
    border-radius: ${portalTheme.radii.pill};
    font-size: 0.82rem;
    font-weight: 700;
  }
`;

const ShiftBar = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${portalTheme.radii.lg};
  padding: 16px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  .shift-info {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;

    .time-item {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .lbl {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: ${portalTheme.colors.textMuted};
      }
      .val {
        font-size: 0.95rem;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }
  }

  .shift-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const PunchBtn = styled.button`
  background: ${props => props.$active ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'};
  border: 1px solid ${props => props.$active ? '#EF4444' : 'transparent'};
  color: #fff;
  border-radius: ${portalTheme.radii.md};
  padding: 8px 16px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;

const BreakBtn = styled.button`
  background: ${props => props.$active ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${props => props.$active ? '#F59E0B' : 'rgba(255, 255, 255, 0.12)'};
  color: ${props => props.$active ? '#FBBF24' : '#fff'};
  border-radius: ${portalTheme.radii.md};
  padding: 8px 14px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(245, 158, 11, 0.15);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${portalTheme.radii.lg};
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.$accent || '#ec4899'};
  }

  .icon {
    width: 46px;
    height: 46px;
    border-radius: ${portalTheme.radii.md};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    background: ${props => `${props.$accent}22` || 'rgba(236, 72, 153, 0.15)'};
    color: ${props => props.$accent || '#ec4899'};
    flex-shrink: 0;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .val {
      font-size: 1.55rem;
      font-weight: 800;
      color: #fff;
    }

    .lbl {
      font-size: 0.76rem;
      color: ${portalTheme.colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sub {
      font-size: 0.72rem;
      color: ${portalTheme.colors.textSecondary};
      margin-top: 2px;
    }
  }
`;

const TabsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
`;

const TabButton = styled.button`
  background: ${props => props.$active ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active ? 'rgba(236, 72, 153, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$active ? '#f472b6' : '#94a3b8'};
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: rgba(236, 72, 153, 0.2);
    border-color: rgba(236, 72, 153, 0.4);
  }
`;

const Panel = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${portalTheme.radii.lg};
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  .title-group {
    h2 {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 9px;
    }
    p {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 3px 0 0;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const ActionButton = styled.button`
  background: ${props => props.$primary ? 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' : 'rgba(255, 255, 255, 0.06)'};
  border: 1px solid ${props => props.$primary ? 'transparent' : 'rgba(255, 255, 255, 0.12)'};
  color: #fff;
  border-radius: ${portalTheme.radii.md};
  padding: 7px 14px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th {
    text-align: left;
    padding: 10px 14px;
    color: #94a3b8;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #e2e8f0;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$color || '#fff'};
  border: 1px solid ${props => props.$border || 'transparent'};
`;

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
`;

const ChannelCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${portalTheme.radii.md};
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .channel-title {
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
  }
  .channel-count {
    font-size: 1.4rem;
    font-weight: 800;
    color: #fff;
  }
  .channel-pct {
    font-size: 0.72rem;
    color: #f472b6;
    font-weight: 700;
  }
`;

// ─── Announcement Modal ───
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111318;
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 16px;
  width: 100%;
  max-width: 580px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
`;

const ModalHeader = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 1.15rem;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button.close-btn {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 1.1rem;
    &:hover { color: #fff; }
  }
`;

const ModalBody = styled.div`
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    input, select, textarea {
      background: #090a0d;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 10px 12px;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      &:focus { border-color: #ec4899; }
    }
  }

  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

// ─── Main Component ───

export default function MarketingDashboardView({
  user,
  shift,
  todaySeconds,
  myTasks,
  activeTimer,
  handleShiftPunch,
  handleToggleTimer,
  onRefresh
}) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements', 'blog', 'leads', 'referrals'

  // Live Data States
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [referralsCount, setReferralsCount] = useState(0);

  // Quick Announcement Modal State
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState('all');
  const [annPriority, setAnnPriority] = useState('normal');
  const [annPinned, setAnnPinned] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);

  // Fetch Marketing Telemetry
  const fetchMarketingData = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, blogRes, inqRes, testRes, refRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('blog_posts').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('inquiries').select('*').order('submitted_at', { ascending: false }).limit(30),
        supabase.from('testimonials').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('referrals').select('id', { count: 'exact', head: true })
      ]);

      setAnnouncements(annRes.data || []);
      setBlogPosts(blogRes.data || []);
      setInquiries(inqRes.data || []);
      setTestimonials(testRes.data || []);
      setReferralsCount(refRes.count || 0);
    } catch (err) {
      console.error('Marketing telemetry fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketingData();
  }, [fetchMarketingData]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const publishedBlogs = blogPosts.filter(p => p.status === 'published');
    const draftBlogs = blogPosts.filter(p => p.status === 'draft');
    const totalBlogViews = blogPosts.reduce((acc, p) => acc + (p.view_count || 0), 0);

    const activeAnnouncements = announcements.filter(a => a.is_active !== false);
    const pinnedAnnouncements = announcements.filter(a => a.is_pinned);

    const totalLeads = inquiries.length;
    const enrolledLeads = inquiries.filter(i => i.status === 'Enrolled' || i.admission_id).length;
    const conversionRate = totalLeads > 0 ? Math.round((enrolledLeads / totalLeads) * 100) : 0;

    // Channel distribution
    const channelMap = {};
    inquiries.forEach(i => {
      const ch = i.hear_about_us || 'Organic / Other';
      channelMap[ch] = (channelMap[ch] || 0) + 1;
    });

    return {
      publishedBlogsCount: publishedBlogs.length,
      draftBlogsCount: draftBlogs.length,
      totalBlogViews,
      activeAnnouncementsCount: activeAnnouncements.length,
      pinnedAnnouncementsCount: pinnedAnnouncements.length,
      totalLeads,
      enrolledLeads,
      conversionRate,
      channelMap
    };
  }, [blogPosts, announcements, inquiries]);

  // Quick Dispatch Announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim()) return toast.error('Please enter an announcement title');
    if (!annBody.trim()) return toast.error('Please enter the announcement body');

    setSavingAnn(true);
    try {
      const payload = {
        title: annTitle.trim(),
        body: annBody.trim(),
        audience_type: annAudience,
        priority: annPriority,
        is_pinned: annPinned,
        is_active: true,
        posted_by_id: user?.id || null,
        posted_by_name: user?.name || user?.full_name || 'Marketing Specialist',
        posted_by_role: 'Marketing',
        created_at: new Date().toISOString(),
        posted_at: new Date().toISOString()
      };

      const { error } = await supabase.from('announcements').insert(payload);
      if (error) throw error;

      toast.success('Announcement broadcast published successfully!');
      setShowAnnounceModal(false);
      setAnnTitle('');
      setAnnBody('');
      setAnnAudience('all');
      setAnnPriority('normal');
      setAnnPinned(false);
      fetchMarketingData();
    } catch (err) {
      toast.error('Failed to post announcement: ' + (err.message || 'Error'));
    } finally {
      setSavingAnn(false);
    }
  };

  const isClockedIn = !!shift?.clock_in && !shift?.clock_out;
  const isOnBreak = !!shift?.lunch_start && !shift?.lunch_end;

  return (
    <Container>
      {/* ── WELCOME BANNER ── */}
      <WelcomeBanner>
        <div className="text-side">
          <h1>Welcome, {user?.name || user?.full_name || 'Marketing Specialist'} 📣</h1>
          <p>Orchestrate brand campaigns, educational blog content, site announcements, and student referral programs.</p>
        </div>
        <div className="role-pill">
          <FaBullhorn /> Marketing & Media Directorate
        </div>
      </WelcomeBanner>

      {/* ── SHIFT & DAILY ATTENDANCE BAR ── */}
      <ShiftBar>
        <div className="shift-info">
          <div className="time-item">
            <span className="lbl">Today's Time Tracked</span>
            <span className="val">
              <FaClock style={{ color: '#10B981' }} /> {formatSeconds(todaySeconds)} ({formatHourDecimal(todaySeconds)} hrs)
            </span>
          </div>
          <div className="time-item">
            <span className="lbl">Punch Status</span>
            <span className="val">
              {isClockedIn ? (
                <span style={{ color: '#10B981' }}>🟢 Active Shift (In: {new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
              ) : (
                <span style={{ color: '#94a3b8' }}>⚪ Not Clocked In</span>
              )}
            </span>
          </div>
          {isOnBreak && (
            <div className="time-item">
              <span className="lbl">Break Status</span>
              <span className="val" style={{ color: '#F59E0B' }}>☕ On Lunch Break</span>
            </div>
          )}
        </div>

        <div className="shift-actions">
          <PunchBtn
            type="button"
            $active={isClockedIn}
            onClick={() => handleShiftPunch(isClockedIn ? 'clock_out' : 'clock_in')}
          >
            {isClockedIn ? <><FaSignOutAlt /> Clock Out</> : <><FaSignInAlt /> Clock In</>}
          </PunchBtn>
          {isClockedIn && (
            <BreakBtn
              type="button"
              $active={isOnBreak}
              onClick={() => handleShiftPunch(isOnBreak ? 'lunch_end' : 'lunch_start')}
            >
              <FaCoffee /> {isOnBreak ? 'End Break' : 'Lunch Break'}
            </BreakBtn>
          )}
        </div>
      </ShiftBar>

      {/* ── REAL-TIME MARKETING KPIS ── */}
      <StatsGrid>
        <StatCard $accent="#EC4899">
          <div className="icon"><FaBullhorn /></div>
          <div className="meta">
            <span className="val">{metrics.activeAnnouncementsCount}</span>
            <span className="lbl">Active Broadcasts</span>
            <span className="sub">{metrics.pinnedAnnouncementsCount} Pinned Announcements</span>
          </div>
        </StatCard>

        <StatCard $accent="#8B5CF6">
          <div className="icon"><FaBlog /></div>
          <div className="meta">
            <span className="val">{metrics.publishedBlogsCount}</span>
            <span className="lbl">Published Articles</span>
            <span className="sub">{metrics.draftBlogsCount} Drafts | {metrics.totalBlogViews.toLocaleString()} Total Reads</span>
          </div>
        </StatCard>

        <StatCard $accent="#3B82F6">
          <div className="icon"><FaUsers /></div>
          <div className="meta">
            <span className="val">{metrics.totalLeads}</span>
            <span className="lbl">Prospective Inquiries</span>
            <span className="sub">{metrics.enrolledLeads} Converted to Enrollment</span>
          </div>
        </StatCard>

        <StatCard $accent="#10B981">
          <div className="icon"><FaChartLine /></div>
          <div className="meta">
            <span className="val">{metrics.conversionRate}%</span>
            <span className="lbl">Lead Conversion Rate</span>
            <span className="sub">Target: &gt; 25% across channels</span>
          </div>
        </StatCard>

        <StatCard $accent="#F59E0B">
          <div className="icon"><FaShareAlt /></div>
          <div className="meta">
            <span className="val">{referralsCount}</span>
            <span className="lbl">Referrals Logged</span>
            <span className="sub">{testimonials.length} Video Testimonials Live</span>
          </div>
        </StatCard>
      </StatsGrid>

      {/* ── OPERATIONAL TABS BAR ── */}
      <TabsBar>
        <TabButton
          type="button"
          $active={activeTab === 'announcements'}
          onClick={() => setActiveTab('announcements')}
        >
          <FaBullhorn /> Broadcasts & Announcements ({announcements.length})
        </TabButton>
        <TabButton
          type="button"
          $active={activeTab === 'blog'}
          onClick={() => setActiveTab('blog')}
        >
          <FaBlog /> Blog Articles & SEO ({blogPosts.length})
        </TabButton>
        <TabButton
          type="button"
          $active={activeTab === 'leads'}
          onClick={() => setActiveTab('leads')}
        >
          <FaUsers /> Lead Sources & Funnel ({inquiries.length})
        </TabButton>
        <TabButton
          type="button"
          $active={activeTab === 'referrals'}
          onClick={() => setActiveTab('referrals')}
        >
          <FaShareAlt /> Referrals & Testimonials ({testimonials.length})
        </TabButton>
      </TabsBar>

      {/* ── TAB 1: ANNOUNCEMENTS & BROADCASTS ── */}
      {activeTab === 'announcements' && (
        <Panel>
          <PanelHeader>
            <div className="title-group">
              <h2><FaBullhorn style={{ color: '#ec4899' }} /> Live Broadcast Announcements</h2>
              <p>Manage emergency notices, admission deadline banners, and institute updates across all portals.</p>
            </div>
            <div className="actions">
              <ActionButton $primary type="button" onClick={() => setShowAnnounceModal(true)}>
                <FaPlus /> New Broadcast
              </ActionButton>
              <ActionButton type="button" onClick={() => router.push('/staff/announcements')}>
                <FaExternalLinkAlt /> Full Announcements Hub
              </ActionButton>
            </div>
          </PanelHeader>

          {announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
              No announcements found. Click "New Broadcast" to dispatch one!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <thead>
                  <tr>
                    <th>Title & Preview</th>
                    <th>Audience</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Published At</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{a.title}</div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8', maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.body}
                        </div>
                      </td>
                      <td>
                        <Badge $bg="rgba(59, 130, 246, 0.15)" $color="#60A5FA" $border="rgba(59, 130, 246, 0.3)">
                          {a.audience_type ? a.audience_type.toUpperCase() : 'ALL'}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          $bg={a.priority === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : (a.priority === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)')}
                          $color={a.priority === 'urgent' ? '#EF4444' : (a.priority === 'high' ? '#FBBF24' : '#94a3b8')}
                          $border={a.priority === 'urgent' ? 'rgba(239, 68, 68, 0.4)' : 'transparent'}
                        >
                          {a.priority || 'Normal'}
                        </Badge>
                      </td>
                      <td>
                        {a.is_active !== false ? (
                          <Badge $bg="rgba(16, 185, 129, 0.15)" $color="#34D399">Active</Badge>
                        ) : (
                          <Badge $bg="rgba(100, 116, 139, 0.2)" $color="#94a3b8">Archived</Badge>
                        )}
                        {a.is_pinned && (
                          <Badge $bg="rgba(236, 72, 153, 0.2)" $color="#f472b6" style={{ marginLeft: '6px' }}>📌 Pinned</Badge>
                        )}
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        {a.posted_at ? new Date(a.posted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Draft'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Panel>
      )}

      {/* ── TAB 2: EDITORIAL & BLOG CMS ── */}
      {activeTab === 'blog' && (
        <Panel>
          <PanelHeader>
            <div className="title-group">
              <h2><FaBlog style={{ color: '#8b5cf6' }} /> DeepSkills Knowledge Hub & Articles</h2>
              <p>Write SEO-optimized career guides, technology trends, and student success stories.</p>
            </div>
            <div className="actions">
              <ActionButton $primary type="button" onClick={() => router.push('/staff/blog')}>
                <FaPlus /> Open Blog Editor
              </ActionButton>
            </div>
          </PanelHeader>

          {blogPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
              No blog posts published yet. Launch the blog editor to draft the first article!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <thead>
                  <tr>
                    <th>Article Title & Slug</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Read Time</th>
                    <th>Views</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogPosts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{post.title}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>/{post.slug}</div>
                      </td>
                      <td>
                        <Badge $bg="rgba(139, 92, 246, 0.15)" $color="#c4b5fd" $border="rgba(139, 92, 246, 0.3)">
                          <FaTags /> {post.category || 'General'}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          $bg={post.status === 'published' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}
                          $color={post.status === 'published' ? '#34D399' : '#FBBF24'}
                        >
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td>{post.reading_time || '3'} min read</td>
                      <td style={{ color: '#38bdf8', fontWeight: 700 }}>
                        <FaEye /> {post.view_count || 0}
                      </td>
                      <td>
                        <ActionButton
                          type="button"
                          onClick={() => router.push('/staff/blog')}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Edit Article
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Panel>
      )}

      {/* ── TAB 3: LEAD SOURCES & FUNNEL ── */}
      {activeTab === 'leads' && (
        <Panel>
          <PanelHeader>
            <div className="title-group">
              <h2><FaUsers style={{ color: '#3b82f6' }} /> Acquisition Funnel & Campaign Performance</h2>
              <p>Track inquiry origins, conversion efficiency, and channel distribution.</p>
            </div>
            <div className="actions">
              <ActionButton type="button" onClick={() => router.push('/staff/inquiries')}>
                <FaExternalLinkAlt /> Open Inquiries Desk
              </ActionButton>
            </div>
          </PanelHeader>

          {/* Channel Cards */}
          <ChannelGrid>
            {Object.entries(metrics.channelMap).map(([channel, count]) => {
              const pct = metrics.totalLeads > 0 ? Math.round((count / metrics.totalLeads) * 100) : 0;
              return (
                <ChannelCard key={channel}>
                  <span className="channel-title">{channel}</span>
                  <span className="channel-count">{count} leads</span>
                  <span className="channel-pct">{pct}% of total</span>
                </ChannelCard>
              );
            })}
          </ChannelGrid>

          {/* Recent Inquiries List */}
          <div style={{ marginTop: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
              Recent Prospective Inquiries
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <thead>
                  <tr>
                    <th>Lead Name</th>
                    <th>Course of Interest</th>
                    <th>Marketing Channel</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.slice(0, 8).map((inq) => (
                    <tr key={inq.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{inq.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{inq.phone || inq.email}</div>
                      </td>
                      <td>{inq.course_interest || 'General Inquiry'}</td>
                      <td>
                        <Badge $bg="rgba(55, 138, 221, 0.15)" $color="#60A5FA">
                          {inq.hear_about_us || 'Organic'}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          $bg={inq.status === 'Enrolled' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)'}
                          $color={inq.status === 'Enrolled' ? '#34D399' : '#e2e8f0'}
                        >
                          {inq.status || 'New'}
                        </Badge>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        {inq.submitted_at ? new Date(inq.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </Panel>
      )}

      {/* ── TAB 4: REFERRALS & TESTIMONIALS ── */}
      {activeTab === 'referrals' && (
        <Panel>
          <PanelHeader>
            <div className="title-group">
              <h2><FaShareAlt style={{ color: '#f59e0b' }} /> Student Referral Program & Video Testimonials</h2>
              <p>Promote word-of-mouth student ambassador links and public video testimonials.</p>
            </div>
            <div className="actions">
              <ActionButton $primary type="button" onClick={() => router.push('/staff/referrals')}>
                <FaExternalLinkAlt /> Referral Ledger & Rewards
              </ActionButton>
              <ActionButton type="button" onClick={() => router.push('/staff/testimonials')}>
                <FaVideo /> Video Testimonials
              </ActionButton>
            </div>
          </PanelHeader>

          {/* Testimonials Showcase */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {testimonials.map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FaVideo />
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{t.student_name}</strong>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{t.course_name}</div>
                  </div>
                </div>
                {t.video_url && (
                  <a
                    href={t.video_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.78rem', color: '#60A5FA', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <FaExternalLinkAlt /> Watch Student Story
                  </a>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── QUICK DISPATCH ANNOUNCEMENT MODAL ── */}
      <AnimatePresence>
        {showAnnounceModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAnnounceModal(false)}
          >
            <ModalContent
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <h3><FaBullhorn style={{ color: '#ec4899' }} /> Quick Dispatch Announcement</h3>
                <button type="button" className="close-btn" onClick={() => setShowAnnounceModal(false)}>
                  <FaTimes />
                </button>
              </ModalHeader>

              <form onSubmit={handleCreateAnnouncement}>
                <ModalBody>
                  <div className="field-group">
                    <label>Broadcast Title *</label>
                    <input
                      type="text"
                      placeholder="e.g., Admissions Closing for Batch 19 / Eid Holiday Schedule"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label>Message Content *</label>
                    <textarea
                      rows={4}
                      placeholder="Write the full announcement message here..."
                      value={annBody}
                      onChange={(e) => setAnnBody(e.target.value)}
                      required
                    />
                  </div>

                  <div className="row-2">
                    <div className="field-group">
                      <label>Target Audience</label>
                      <select value={annAudience} onChange={(e) => setAnnAudience(e.target.value)}>
                        <option value="all">Everyone (All Portals)</option>
                        <option value="students">Students Only</option>
                        <option value="teachers">Teachers Only</option>
                        <option value="staff">Staff Only</option>
                        <option value="public">Public Website</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label>Priority Level</label>
                      <select value={annPriority} onChange={(e) => setAnnPriority(e.target.value)}>
                        <option value="normal">Normal</option>
                        <option value="high">High (Yellow Banner)</option>
                        <option value="urgent">Urgent (Red Alert)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="annPinned"
                      checked={annPinned}
                      onChange={(e) => setAnnPinned(e.target.checked)}
                    />
                    <label htmlFor="annPinned" style={{ fontSize: '0.84rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      Pin this announcement to top of newsfeed
                    </label>
                  </div>
                </ModalBody>

                <ModalFooter>
                  <ActionButton type="button" onClick={() => setShowAnnounceModal(false)}>
                    Cancel
                  </ActionButton>
                  <ActionButton $primary type="submit" disabled={savingAnn}>
                    <FaSave /> {savingAnn ? 'Dispatching...' : 'Dispatch Announcement'}
                  </ActionButton>
                </ModalFooter>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
}
