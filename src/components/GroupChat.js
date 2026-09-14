import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUsers, FaSearch, FaPaperclip, FaImage, FaSmile, FaPaperPlane,
  FaVolumeMute, FaVolumeUp, FaDownload, FaFileAlt, FaTimes, FaUserGraduate
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useGroupChat } from '../context/GroupChatContext';

// ----- Styled Components (DeepSkills Unified Design System) ----- //

const ChatContainer = styled.div`
  display: grid;
  grid-template-columns: 310px 1fr;
  height: calc(100vh - 210px);
  min-height: 580px;
  background: #0d0f14;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.03);

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    height: calc(100vh - 140px);
    position: relative;
  }
`;

// Left Sidebar
const Sidebar = styled.div`
  background: rgba(14, 16, 22, 0.95);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  
  @media (max-width: 992px) {
    display: ${props => props.show ? 'flex' : 'none'};
    position: absolute;
    left: 0;
    top: 0;
    z-index: 100;
    width: 300px;
    height: 100%;
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0.8);
  }
`;

const SidebarHeader = styled.div`
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.015);
  
  .header-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;

    h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-count {
      font-size: 0.72rem;
      font-weight: 700;
      color: #c084fc;
      background: rgba(168, 85, 247, 0.12);
      border: 1px solid rgba(168, 85, 247, 0.25);
      padding: 2px 8px;
      border-radius: 999px;
    }
  }

  span.batch-tag {
    display: inline-block;
    font-size: 0.78rem;
    font-weight: 600;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 3px 10px;
    border-radius: 6px;
    margin-top: 4px;
  }
`;

const BatchSelect = styled.select`
  width: 100%;
  background: #151821;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(123, 31, 46, 0.4);
  }

  &:focus {
    border-color: #7B1F2E;
    box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.25);
  }

  option {
    background: #111318;
    color: #fff;
  }
`;

const MemberList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 10px; }
`;

const MemberSectionLabel = styled.div`
  padding: 14px 8px 6px;
  font-size: 0.7rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MemberItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 10px;
  transition: all 0.2s ease;
  position: relative;
  margin-bottom: 2px;
  border: 1px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.06);
  }
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${props => props.isTeacher 
    ? 'linear-gradient(135deg, #7B1F2E 0%, #b32d43 100%)' 
    : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'};
  border: 1px solid ${props => props.isTeacher ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 800;
  color: #fff;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const OnlineDot = styled.div`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${props => props.online ? '#10B981' : '#475569'};
  border: 2px solid #0d0f14;
  position: absolute;
  bottom: -2px;
  right: -2px;
`;

const MemberInfo = styled.div`
  flex: 1;
  min-width: 0;
  .name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #f1f5f9;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .badge {
    font-size: 0.62rem;
    font-weight: 700;
    background: rgba(123, 31, 46, 0.3);
    color: #f87171;
    border: 1px solid rgba(123, 31, 46, 0.5);
    padding: 1px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

const MuteOverlay = styled.div`
  position: absolute;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  ${MemberItem}:hover & { opacity: 1; }
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: ${props => props.$active ? '#ef4444' : '#94a3b8'};
  cursor: pointer;
  padding: 6px 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }
`;

// Right Chat Area
const ChatArea = styled.div`
  display: flex;
  flex-direction: column;
  background: #0a0b0e;
  position: relative;
  height: 100%;
  min-height: 0;
`;

const ChatHeader = styled.div`
  padding: 14px 22px;
  background: rgba(17, 19, 26, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  gap: 12px;
`;

const ChatHeaderInfo = styled.div`
  h4 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  p {
    margin: 2px 0 0;
    font-size: 0.78rem;
    color: #34d399;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
  }
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background-color: #07080b;
  background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0);
  background-size: 28px 28px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
`;

const DateSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
  }
  
  span {
    background: #07080b;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    padding: 3px 14px;
    font-size: 0.72rem;
    font-weight: 700;
    color: #94a3b8;
    z-index: 1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const MessageBubble = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isMe ? 'flex-end' : 'flex-start'};
  max-width: 76%;
  align-self: ${props => props.isMe ? 'flex-end' : 'flex-start'};

  @media (max-width: 768px) {
    max-width: 88%;
  }
`;

const MessageMeta = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.74rem;
  color: #64748b;
  align-items: center;
  padding: 0 4px;
  
  .sender {
    font-weight: 700;
    color: ${props => props.isTeacher ? '#f87171' : '#cbd5e1'};
  }

  .time {
    color: #475569;
    font-size: 0.7rem;
  }
`;

const BubbleContent = styled.div`
  padding: 12px 18px;
  border-radius: ${props => props.isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  background: ${props => {
    if (props.type === 'warning') return 'rgba(245, 158, 11, 0.12)';
    if (props.isMe) return 'linear-gradient(135deg, #7B1F2E 0%, #9B283B 100%)';
    if (props.isTeacher) return 'rgba(123, 31, 46, 0.14)';
    return '#131620';
  }};
  color: ${props => props.type === 'warning' ? '#fbbf24' : '#f8fafc'};
  border: ${props => {
    if (props.type === 'warning') return '1px solid rgba(245, 158, 11, 0.3)';
    if (props.isMe) return '1px solid rgba(255, 255, 255, 0.15)';
    if (props.isTeacher) return '1px solid rgba(123, 31, 46, 0.35)';
    return '1px solid rgba(255, 255, 255, 0.07)';
  }};
  font-size: 0.92rem;
  line-height: 1.55;
  position: relative;
  box-shadow: ${props => props.isMe 
    ? '0 4px 16px rgba(123, 31, 46, 0.35)' 
    : '0 2px 8px rgba(0, 0, 0, 0.35)'};
  word-break: break-word;
`;

const SystemMessage = styled.div`
  align-self: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 6px 18px;
  border-radius: 999px;
  text-align: center;
  margin: 4px 0;
  letter-spacing: 0.02em;
`;

const ReactionPills = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
`;

const ReactionPill = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 0.74rem;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: scale(1.05);
  }
`;

const FileCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.25);
  padding: 10px 14px;
  border-radius: 10px;
  margin-top: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FileIcon = styled.div`
  width: 38px;
  height: 38px;
  background: rgba(123, 31, 46, 0.2);
  color: #f87171;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 1.15rem;
  border: 1px solid rgba(123, 31, 46, 0.35);
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
  .name {
    font-size: 0.84rem;
    color: #fff;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .size {
    font-size: 0.72rem;
    color: #64748b;
  }
`;

const ImageThumbnail = styled.img`
  max-width: 280px;
  max-height: 280px;
  object-fit: cover;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    transform: scale(1.02);
  }
`;

// Input Area
const InputContainer = styled.div`
  padding: 16px 22px;
  background: rgba(14, 16, 22, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const MutedBar = styled.div`
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  padding: 12px 18px;
  border-radius: 10px;
  text-align: center;
  font-size: 0.88rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid rgba(239, 68, 68, 0.25);
`;

const Toolbar = styled.div`
  display: flex;
  gap: 14px;
  margin-bottom: 10px;
  color: #64748b;
`;

const ToolItem = styled.label`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.12);
  }

  input { display: none; }
`;

const MessageInputRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const TextInput = styled.input`
  flex: 1;
  background: #151821;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  padding: 13px 18px;
  color: #fff;
  outline: none;
  font-size: 0.92rem;
  transition: all 0.2s ease;
  
  &::placeholder {
    color: #475569;
  }

  &:focus {
    border-color: #7B1F2E;
    box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.25);
    background: #181c27;
  }
`;

const SendButton = styled.button`
  width: 46px;
  height: 46px;
  background: linear-gradient(135deg, #7B1F2E 0%, #9B283B 100%);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  box-shadow: 0 4px 14px rgba(123, 31, 46, 0.35);
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #9B283B 0%, #b32d43 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(123, 31, 46, 0.5);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

// Emoji Picker
const EmojiGrid = styled.div`
  position: absolute;
  bottom: 110px;
  right: 22px;
  background: #151821;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  z-index: 200;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
`;

const EmojiItem = styled.button`
  background: none;
  border: none;
  font-size: 1.35rem;
  padding: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s ease;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`;

const SearchOverlay = styled.div`
  background: #151821;
  padding: 6px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  input {
    background: none;
    border: none;
    color: #fff;
    outline: none;
    font-size: 0.84rem;
    width: 160px;

    &::placeholder {
      color: #64748b;
    }
  }
`;

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background: #090b10;
  padding: 40px;
  text-align: center;
`;

const LobbyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
  width: 100%;
  max-width: 980px;
  margin-top: 28px;
`;

const BatchCard = styled(motion.div)`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 26px 20px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: #171a22;
    border-color: rgba(123, 31, 46, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(123, 31, 46, 0.25);
  }
  
  .icon {
    width: 56px;
    height: 56px;
    background: rgba(123, 31, 46, 0.15);
    color: #f87171;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    border: 1px solid rgba(123, 31, 46, 0.3);
  }
  
  h4 {
    margin: 0;
    color: #fff;
    font-size: 1.05rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #94a3b8;
    font-size: 0.85rem;
    font-weight: 500;
  }
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
          <div className="header-title-row">
            <h3><FaUsers style={{ color: '#c084fc' }} /> {canModerate ? 'Active Channel' : (activeBatch || "Batch Group")}</h3>
            <span className="badge-count">{members.length}</span>
          </div>
          {canModerate && availableBatches.length > 1 ? (
            <BatchSelect
              value={activeBatch || ''}
              onChange={(e) => setActiveBatch(e.target.value)}
            >
              {availableBatches.map(b => <option key={b.batch} value={b.batch}>{b.course} ({b.batch})</option>)}
            </BatchSelect>
          ) : (
            <span className="batch-tag">{activeBatch || 'No Batch Selected'}</span>
          )}
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
