import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  FaThumbtack, FaBullhorn, FaCrosshairs,
  FaPaperclip, FaDownload, FaChevronDown, FaChevronUp,
  FaUserShield, FaChalkboardTeacher as FaTeacherIcon,
  FaBroadcastTower, FaBullseye
} from 'react-icons/fa';

const Card = styled(motion.div)`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  border-left: 4px solid ${props => {
    if (props.$unread) return '#378ADD';
    if (props.$pinned && props.$fromAdmin) return '#e74c3c';
    if (props.$fromTeacher) return '#2ecc71';
    return 'rgba(255, 255, 255, 0.05)';
  }};
  transition: border-color 0.4s ease;

  &:hover {
    border-color: ${props => props.$unread ? '#378ADD' : 'rgba(255, 255, 255, 0.15)'};
    background: #131620;
  }
`;

const CardHeader = styled.div`
  padding: 20px 25px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const PinIcon = styled.div`
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 4px;
`;

const TitleArea = styled.div`
  flex: 1;
  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 8px;
    line-height: 1.4;
  }
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const Badge = styled.span`
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.broadcast { background: rgba(55, 138, 221, 0.1); color: #378ADD; }
  &.targeted { background: rgba(155, 89, 182, 0.1); color: #9b59b6; }
  &.admin { background: rgba(255, 255, 255, 0.05); color: #ccc; }
  &.teacher { background: rgba(46, 204, 113, 0.1); color: #2ecc71; }
  &.new-dot {
    background: #e74c3c;
    color: #fff;
    padding: 2px 8px;
    font-size: 0.65rem;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

const CardBody = styled.div`
  padding: 15px 25px;
`;

const BodyText = styled.div`
  color: #aaa;
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;

  ${props => props.$collapsed && `
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

const ExpandBtn = styled.button`
  background: none;
  border: none;
  color: #378ADD;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 5px 0;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover { text-decoration: underline; }
`;

const AttachmentsRow = styled.div`
  padding: 0 25px 15px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const FileChip = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 14px;
  color: #ccc;
  font-size: 0.8rem;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: rgba(55, 138, 221, 0.1);
    border-color: rgba(55, 138, 221, 0.3);
    color: #378ADD;
  }

  .icon { color: #666; }
  .size { color: #555; font-size: 0.7rem; }
`;

const ImageThumb = styled.img`
  width: 80px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: transform 0.2s;

  &:hover { transform: scale(1.05); }
`;

const CardFooter = styled.div`
  padding: 12px 25px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.03);

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const PosterInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fff;

    &.admin { background: rgba(255, 255, 255, 0.1); }
    &.teacher { background: rgba(46, 204, 113, 0.15); color: #2ecc71; }
  }

  .name { font-size: 0.8rem; color: #888; font-weight: 500; }
  .time { font-size: 0.75rem; color: #555; }
`;

const AudienceTag = styled.span`
  font-size: 0.75rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
`;

// Helper: time ago
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper: is new (< 24h)
function isNew(dateStr) {
  return (Date.now() - new Date(dateStr).getTime()) < 24 * 60 * 60 * 1000;
}

const AnnouncementCard = ({ announcement, isRead, onMarkRead }) => {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef(null);
  const hasMarkedRef = useRef(false);

  const a = announcement;
  const attachments = a.announcement_attachments || [];
  const isFromAdmin = a.posted_by_role === 'admin';
  const isFromTeacher = a.posted_by_role === 'teacher';
  const isUnread = !isRead && a.is_active;
  const showNewBadge = isUnread && isNew(a.posted_at);
  const bodyLong = (a.body || '').split('\n').length > 4 || (a.body || '').length > 300;
  const imageAttachments = attachments.filter(att => att.file_type === 'image');
  const fileAttachments = attachments.filter(att => att.file_type !== 'image');

  // Intersection Observer for read tracking
  useEffect(() => {
    if (isRead || hasMarkedRef.current || !onMarkRead) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasMarkedRef.current) {
          hasMarkedRef.current = true;
          // Small delay so user actually sees the card
          setTimeout(() => onMarkRead(a.id), 1500);
        }
      },
      { threshold: 0.6 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isRead, a.id, onMarkRead]);

  // Audience label with SVG icons
  const getAudienceLabel = () => {
    if (a.audience_type === 'broadcast') return <><FaBroadcastTower style={{ marginRight: '4px' }} /> Everyone</>;
    if (a.audience_batches?.length) return <><FaBullseye style={{ marginRight: '4px' }} /> {a.audience_batches.join(', ')}</>;
    if (a.audience_courses?.length) return <><FaBullseye style={{ marginRight: '4px' }} /> {a.audience_courses.join(', ')}</>;
    return <><FaBroadcastTower style={{ marginRight: '4px' }} /> Campus</>;
  };

  return (
    <Card
      ref={cardRef}
      $unread={isUnread}
      $pinned={a.is_pinned}
      $fromAdmin={isFromAdmin}
      $fromTeacher={isFromTeacher}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <CardHeader>
        {a.is_pinned && <PinIcon><FaThumbtack /></PinIcon>}
        <TitleArea>
          <h3>{a.title}</h3>
          <BadgeRow>
            <Badge className={a.audience_type === 'broadcast' ? 'broadcast' : 'targeted'}>
              {a.audience_type === 'broadcast' ? <><FaBullhorn size={9} /> Broadcast</> : <><FaCrosshairs size={9} /> Targeted</>}
            </Badge>
            <Badge className={isFromAdmin ? 'admin' : 'teacher'}>
              {isFromAdmin ? <><FaUserShield size={9} /> Admin</> : <><FaTeacherIcon size={9} /> {a.posted_by_name}</>}
            </Badge>
            {showNewBadge && <Badge className="new-dot">NEW</Badge>}
          </BadgeRow>
        </TitleArea>
      </CardHeader>

      <CardBody>
        <BodyText $collapsed={bodyLong && !expanded}>
          {a.body}
        </BodyText>
        {bodyLong && (
          <ExpandBtn onClick={() => setExpanded(!expanded)}>
            {expanded ? <><FaChevronUp size={10} /> Show less</> : <><FaChevronDown size={10} /> Read more</>}
          </ExpandBtn>
        )}
      </CardBody>

      {attachments.length > 0 && (
        <AttachmentsRow>
          {imageAttachments.filter((att) => att.file_url).map((att, i) => (
            <a key={i} href={att.file_url} target="_blank" rel="noopener noreferrer">
              <ImageThumb src={att.file_url} alt={att.file_name} />
            </a>
          ))}
          {fileAttachments.filter((att) => att.file_url).map((att, i) => (
            <FileChip key={i} href={att.file_url} target="_blank" rel="noopener noreferrer">
              <span className="icon"><FaPaperclip /></span>
              {att.file_name}
              <span className="size">· {att.file_size}</span>
              <FaDownload size={10} />
            </FileChip>
          ))}
        </AttachmentsRow>
      )}

      <CardFooter>
        <PosterInfo>
          <div className={`avatar ${isFromAdmin ? 'admin' : 'teacher'}`}>
            {isFromAdmin ? <FaUserShield size={12} /> : (a.posted_by_name?.[0] || 'T')}
          </div>
          <div>
            <span className="name">{a.posted_by_name || 'Admin'}</span>
            <span className="time"> · {timeAgo(a.posted_at)}</span>
          </div>
        </PosterInfo>
        <AudienceTag>{getAudienceLabel()}</AudienceTag>
      </CardFooter>
    </Card>
  );
};

export default AnnouncementCard;
