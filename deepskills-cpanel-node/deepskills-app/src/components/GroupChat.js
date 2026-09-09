import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUsers, FaSearch, FaPaperclip, FaImage, FaSmile, FaPaperPlane,
  FaVolumeMute, FaVolumeUp, FaDownload, FaFileAlt, FaTimes, FaUserGraduate
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useGroupChat } from '../context/GroupChatContext';

// ----- Styled Components ----- //

const ChatContainer = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  height: calc(100vh - 200px);
  background: #0a0a0a;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    height: calc(100vh - 140px);
  }
`;

// Left Sidebar
const Sidebar = styled.div`
  background: #111;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  
  @media (max-width: 992px) {
    display: ${props => props.show ? 'flex' : 'none'};
    position: absolute;
    z-index: 100;
    width: 280px;
    height: 100%;
  }
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  h3 { margin: 0; font-size: 1.1rem; color: #fff; margin-bottom: 10px; }
  span { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); }
`;

const BatchSelect = styled.select`
  width: 100%;
  background: #1a1a1a;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
  margin-top: 5px;
  
  &:focus { border-color: #1f427b; }
`;

const MemberList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
`;

const MemberSectionLabel = styled.div`
  padding: 15px 10px 5px;
  font-size: 0.75rem;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const MemberItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  transition: background 0.2s;
  position: relative;
  
  &:hover { background: rgba(255, 255, 255, 0.03); }
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.isTeacher ? 'linear-gradient(135deg, #1f427b, #2d55b3)' : '#333'};
  border: ${props => props.isTeacher ? '2px solid #4da6ff' : 'none'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  color: #fff;
  position: relative;
`;

const OnlineDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.online ? '#00e676' : '#555'};
  border: 2px solid #111;
  position: absolute;
  bottom: 0;
  right: 0;
`;

const MemberInfo = styled.div`
  flex: 1;
  .name { font-size: 0.9rem; color: #eee; display: flex; align-items: center; gap: 6px; }
  .badge { font-size: 0.6rem; background: #4da6ff; color: #fff; padding: 2px 6px; border-radius: 4px; }
`;

const MuteOverlay = styled.div`
  position: absolute;
  right: 10px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
  ${MemberItem}:hover & { opacity: 1; }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.$active ? '#ff4e4e' : 'rgba(255,255,255,0.4)'};
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { color: ${props => props.$active ? '#ff6b6b' : '#fff'}; }
`;

// Right Chat Area
const ChatArea = styled.div`
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  position: relative;
  height: 100%;
  min-height: 0;
`;

const ChatHeader = styled.div`
  padding: 15px 25px;
  background: #111;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatHeaderInfo = styled.div`
  h4 { margin: 0; font-size: 1rem; color: #fff; }
  p { margin: 0; font-size: 0.8rem; color: #00e676; }
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 0);
  background-size: 30px 30px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
`;

const DateSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.05);
  }
  
  span {
    background: #0a0a0a;
    padding: 0 15px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    z-index: 1;
  }
`;

const MessageBubble = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isMe ? 'flex-end' : 'flex-start'};
  max-width: 80%;
  align-self: ${props => props.isMe ? 'flex-end' : 'flex-start'};
`;

const MessageMeta = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  align-items: center;
  
  .sender { font-weight: bold; color: ${props => props.isTeacher ? '#4da6ff' : 'rgba(255,255,255,0.7)'}; }
`;

const BubbleContent = styled.div`
  padding: 12px 18px;
  border-radius: ${props => props.isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px'};
  background: ${props => {
    if (props.type === 'warning') return 'rgba(255, 171, 0, 0.15)';
    if (props.isMe) return '#1f427b';
    if (props.isTeacher) return 'rgba(31, 66, 123, 0.2)';
    return '#1a1a1a';
  }};
  color: ${props => props.type === 'warning' ? '#ffab00' : '#eee'};
  border: ${props => {
    if (props.type === 'warning') return '1px solid rgba(255, 171, 0, 0.3)';
    if (props.isTeacher && !props.isMe) return '1px solid rgba(77, 166, 255, 0.3)';
    return '1px solid rgba(255, 255, 255, 0.05)';
  }};
  font-size: 0.95rem;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
`;

const SystemMessage = styled.div`
  align-self: center;
  font-size: 0.8rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.03);
  padding: 5px 15px;
  border-radius: 20px;
  text-align: center;
`;

const ReactionPills = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 5px;
  flex-wrap: wrap;
`;

const ReactionPill = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 0.75rem;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover { background: rgba(255, 255, 255, 0.1); }
`;

const FileCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 15px;
  border-radius: 10px;
  margin-top: 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FileIcon = styled.div`
  width: 40px;
  height: 40px;
  background: rgba(77, 166, 255, 0.1);
  color: #4da6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 1.2rem;
`;

const FileInfo = styled.div`
  flex: 1;
  .name { font-size: 0.85rem; color: #eee; font-weight: 500; }
  .size { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); }
`;

const ImageThumbnail = styled.img`
  max-width: 250px;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s;
  &:hover { transform: scale(1.02); }
`;

// Input Area
const InputContainer = styled.div`
  padding: 20px 25px;
  background: #111;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const MutedBar = styled.div`
  background: rgba(255, 78, 78, 0.1);
  color: #ff4e4e;
  padding: 15px;
  border-radius: 10px;
  text-align: center;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid rgba(255, 78, 78, 0.2);
`;

const Toolbar = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.4);
`;

const ToolItem = styled.label`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  &:hover { color: #fff; }
  input { display: none; }
`;

const MessageInputRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const TextInput = styled.input`
  flex: 1;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px 20px;
  color: #fff;
  outline: none;
  font-size: 0.95rem;
  
  &:focus { border-color: #1f427b; box-shadow: 0 0 10px rgba(31, 66, 123, 0.3); }
`;

const SendButton = styled.button`
  width: 48px;
  height: 48px;
  background: #1f427b;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: transform 0.2s, background 0.2s;
  
  &:hover { background: #2d55b3; transform: scale(1.05); }
  &:active { transform: scale(0.95); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// Emoji Picker
const EmojiGrid = styled.div`
  position: absolute;
  bottom: 130px;
  right: 25px;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 5px;
  z-index: 200;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
`;

const EmojiItem = styled.button`
  background: none;
  border: none;
  font-size: 1.3rem;
  padding: 5px;
  cursor: pointer;
  border-radius: 4px;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const SearchOverlay = styled.div`
  background: #1a1a1a;
  padding: 8px 15px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  input {
    background: none;
    border: none;
    color: #fff;
    outline: none;
    font-size: 0.85rem;
    width: 150px;
  }
`;

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background: #0a0a0a;
  padding: 40px;
  text-align: center;
`;

const LobbyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 1000px;
  margin-top: 30px;
`;

const BatchCard = styled(motion.div)`
  background: #111;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  
  &:hover {
    background: #161616;
    border-color: #1f427b;
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(31, 66, 123, 0.2);
  }
  
  .icon {
    width: 60px;
    height: 60px;
    background: rgba(31, 66, 123, 0.1);
    color: #4da6ff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  h4 { margin: 0; color: #fff; font-size: 1.2rem; }
  p { margin: 0; color: rgba(255,255,255,0.5); font-size: 0.9rem; }
`;

// ----- Component ----- //

const GroupChat = () => {
  const { user } = useAuth();
  const {
    messages, members, mutes, loading, isMuted,
    sendMessage, sendReaction, uploadChatFile, muteStudent, unmuteStudent,
    activeBatch, setActiveBatch, availableBatches, hasAdminChatAccess
  } = useGroupChat();

  const canModerate = user?.role === 'teacher' || hasAdminChatAccess;

  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLobby, setShowLobby] = useState(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'custom');

  const chatEndRef = useRef(null);
  const emojiRef = useRef(null);

  const commonEmojis = [
    '👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉',
    '🤔', '✅', '❌', '✨', '🚀', '👀', '🙏', '💯',
    '😊', '😎', '🙌', '💡', '💪', '👋', '🎓', '📚'
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (canModerate && availableBatches.length === 1 && !showLobby) {
      setActiveBatch(availableBatches[0].batch);
    }
  }, [availableBatches, setActiveBatch, showLobby, user?.role]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || isMuted) return;
    try {
      await sendMessage({ type: 'text', text: newMessage });
      setNewMessage('');
    } catch (err) {
      alert("Failed to send message.");
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("File size exceeds 20MB limit.");
      return;
    }

    try {
      const fileUrl = await uploadChatFile(file);
      await sendMessage({
        type: type === 'image' ? 'image' : 'file',
        text: type === 'image' ? '' : file.name,
        file_name: file.name,
        file_size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
        file_url: fileUrl
      });
    } catch (err) {
      alert("Failed to upload file.");
    } finally {
      e.target.value = '';
    }
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m =>
      m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = null;

    filteredMessages.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString();
      if (date !== lastDate) {
        groups.push({ type: 'date', date: date });
        lastDate = date;
      }
      groups.push({ ...msg, type: msg.type || 'text' });
    });
    return groups;
  }, [filteredMessages]);

  const formatDate = (dateStr) => {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} style={{ background: '#ffab00', color: '#000', borderRadius: '2px' }}>{part}</mark>
        : part
    );
  };

  const normalizeCnic = (value) => (value || '').toString().trim();
  const isCurrentUser = (member) => normalizeCnic(member?.cnic) === normalizeCnic(user?.cnic);

  if (showLobby && canModerate) {
    return (
      <ChatContainer style={{ gridTemplateColumns: '1fr' }}>
        <LobbyContainer>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Welcome{user?.role === 'teacher' ? `, Sir ${user.name}` : `, ${user?.name || 'Admin'}`}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>
              {loading ? 'Loading your batches...' : 'Select a batch to enter the group chat'}
            </p>
          </motion.div>
          {!loading && availableBatches.length === 0 ? (
            <div style={{ marginTop: '30px', color: 'rgba(255,255,255,0.45)' }}>
              No assigned batches found for your teacher profile.
            </div>
          ) : (
            <LobbyGrid>
              {availableBatches.map((item, idx) => (
                <BatchCard
                  key={item.batch}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => {
                    setActiveBatch(item.batch);
                    setShowLobby(false);
                  }}
                >
                  <div className="icon"><FaUserGraduate /></div>
                  <h4>{item.course}</h4>
                  <p>{item.batch}</p>
                </BatchCard>
              ))}
            </LobbyGrid>
          )}
        </LobbyContainer>
      </ChatContainer>
    );
  }

  return (
    <ChatContainer>
      {/* Sidebar - Members */}
      <Sidebar show={showSidebar}>
        <SidebarHeader>
          <h3>{canModerate ? 'My Batches' : (activeBatch || "Batch Group")}</h3>
          {canModerate && availableBatches.length > 1 && (
            <BatchSelect
              value={activeBatch}
              onChange={(e) => setActiveBatch(e.target.value)}
            >
              {availableBatches.map(b => <option key={b.batch} value={b.batch}>{b.course} ({b.batch})</option>)}
            </BatchSelect>
          )}
          {!(canModerate && availableBatches.length > 1) && <span>{activeBatch}</span>}
          <div style={{ marginTop: '10px' }}>
            <span>{members.length} Members</span>
          </div>
        </SidebarHeader>
        <MemberList>
          <MemberSectionLabel>Instructors</MemberSectionLabel>
          {members.filter(m => m.role === 'teacher').map(member => (
            <MemberItem key={member.cnic}>
              <Avatar isTeacher={true}>
                {member.name.substring(0, 2).toUpperCase()}
                <OnlineDot online={isCurrentUser(member)} title={isCurrentUser(member) ? 'Online' : 'Offline'} />
              </Avatar>
              <MemberInfo>
                <div className="name">{member.name} <span className="badge">Teacher</span></div>
              </MemberInfo>
            </MemberItem>
          ))}

          <MemberSectionLabel>Students ({members.filter(m => m.role === 'student').length})</MemberSectionLabel>
          {members.filter(m => m.role === 'student').map(member => {
            const muted = mutes.some(m => m.user_cnic === member.cnic);
            return (
              <MemberItem key={member.cnic}>
                <Avatar isTeacher={false}>
                  {member.name.substring(0, 2).toUpperCase()}
                  <OnlineDot online={isCurrentUser(member)} title={isCurrentUser(member) ? 'Online' : 'Offline'} />
                </Avatar>
                <MemberInfo>
                  <div className="name">
                    {member.name}
                    {muted && <FaVolumeMute size={12} color="#ff4e4e" />}
                  </div>
                </MemberInfo>

                {canModerate && (
                  <MuteOverlay>
                    <IconButton
                      $active={muted}
                      onClick={() => muted ? unmuteStudent(member.cnic, member.name) : muteStudent(member.cnic, member.name)}
                      title={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <FaVolumeUp /> : <FaVolumeMute />}
                    </IconButton>
                  </MuteOverlay>
                )}
              </MemberItem>
            );
          })}
        </MemberList>
      </Sidebar>

      {/* Main Chat Area */}
      <ChatArea>
        <ChatHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <IconButton
              className="mobile-only"
              onClick={() => setShowSidebar(!showSidebar)}
              style={{ display: window.innerWidth < 992 ? 'block' : 'none' }}
            >
              <FaUsers size={20} />
            </IconButton>
            <ChatHeaderInfo>
              <h4>{availableBatches.find(b => b.batch === activeBatch)?.course || activeBatch || "Group Chat"}</h4>
              <p>{activeBatch} • {members.length} members</p>
            </ChatHeaderInfo>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {canModerate && (
              <IconButton onClick={() => setShowLobby(true)} title="Switch Batch">
                <FaUsers size={18} />
                <span style={{ fontSize: '0.7rem', marginLeft: '5px' }}>Switch Batch</span>
              </IconButton>
            )}
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
                  <SearchOverlay>
                    <FaSearch size={14} color="rgba(255,255,255,0.4)" />
                    <input
                      autoFocus
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <FaTimes size={14} cursor="pointer" onClick={() => { setShowSearch(false); setSearchQuery(''); }} />
                  </SearchOverlay>
                </motion.div>
              )}
            </AnimatePresence>
            {!showSearch && <IconButton onClick={() => setShowSearch(true)}><FaSearch size={18} /></IconButton>}
          </div>
        </ChatHeader>

        <MessageList>
          {groupedMessages.map((item, idx) => {
            if (item.type === 'date') {
              return <DateSeparator key={`date-${idx}`}><span>{formatDate(item.date)}</span></DateSeparator>;
            }

            if (item.type === 'system') {
              return <SystemMessage key={item.id}>{item.text}</SystemMessage>;
            }

            const isMe = item.sender_cnic === user?.cnic;
            const isTeacher = item.sender_role === 'teacher';

            // Special handling for warning bubble - only visible to target student
            if (item.type === 'warning' && item.target_cnic !== user?.cnic && !canModerate) {
              return null;
            }

            return (
              <MessageBubble key={item.id} isMe={isMe}>
                <MessageMeta isMe={isMe} isTeacher={isTeacher}>
                  {!isMe && <span className="sender">{item.sender_name}</span>}
                  <span className="time">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </MessageMeta>
                <BubbleContent
                  isMe={isMe}
                  isTeacher={isTeacher}
                  type={item.type}
                >
                  {item.type === 'image' && item.file_url ? (
                    <ImageThumbnail src={item.file_url} onClick={() => window.open(item.file_url)} />
                  ) : item.type === 'file' ? (
                    <FileCard>
                      <FileIcon><FaFileAlt /></FileIcon>
                      <FileInfo>
                        <div className="name">{item.file_name}</div>
                        <div className="size">{item.file_size}</div>
                      </FileInfo>
                      <IconButton><FaDownload size={14} onClick={() => window.open(item.file_url)} /></IconButton>
                    </FileCard>
                  ) : (
                    highlightText(item.text, searchQuery)
                  )}

                  {item.reactions?.length > 0 && (
                    <ReactionPills>
                      {item.reactions.map((r, i) => (
                        <ReactionPill key={i} onClick={() => sendReaction(item.id, r.emoji)}>
                          {r.emoji} {r.count}
                        </ReactionPill>
                      ))}
                    </ReactionPills>
                  )}
                </BubbleContent>
              </MessageBubble>
            );
          })}
          <div ref={chatEndRef} />
        </MessageList>

        <InputContainer>
          {isMuted ? (
            <MutedBar>
              <FaVolumeMute />
              You have been muted by the teacher. Contact your teacher to resolve this.
            </MutedBar>
          ) : (
            <>
              <Toolbar>
                <ToolItem>
                  <FaPaperclip />
                  <span>Attach</span>
                  <input type="file" onChange={(e) => handleFileUpload(e, 'file')} />
                </ToolItem>
                <ToolItem>
                  <FaImage />
                  <span>Image</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                </ToolItem>
                <ToolItem onClick={() => setShowEmoji(!showEmoji)}>
                  <FaSmile />
                  <span>Emoji</span>
                </ToolItem>
              </Toolbar>
              <MessageInputRow>
                <TextInput
                  placeholder={`Message ${activeBatch || 'Group'}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <SendButton
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                >
                  <FaPaperPlane />
                </SendButton>
              </MessageInputRow>
            </>
          )}

          {showEmoji && (
            <EmojiGrid ref={emojiRef}>
              {commonEmojis.map(emoji => (
                <EmojiItem key={emoji} onClick={() => { setNewMessage(prev => prev + emoji); setShowEmoji(false); }}>
                  {emoji}
                </EmojiItem>
              ))}
            </EmojiGrid>
          )}
        </InputContainer>
      </ChatArea>
    </ChatContainer>
  );
};

export default GroupChat;
