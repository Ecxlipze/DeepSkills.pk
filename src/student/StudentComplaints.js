import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, FaPaperPlane, FaTimes, FaInbox, FaUndo,
  FaShieldAlt, FaUserGraduate, FaChalkboardTeacher,
  FaClock, FaCheckCircle, FaExclamationCircle, FaSearch,
  FaInfoCircle
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useComplaints } from '../context/ComplaintsContext';
import toast from 'react-hot-toast';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

// SLA Banner
const SlaBanner = styled.div`
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.2) 0%, rgba(20, 20, 25, 0.9) 100%);
  border: 1px solid rgba(123, 31, 46, 0.35);
  border-radius: 12px;
  padding: 16px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
  color: #fff;
`;

const SlaContent = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .icon-wrap {
    background: rgba(123, 31, 46, 0.4);
    color: #ff4d6d;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .text {
    h4 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      color: #fff;
    }
    p {
      margin: 0;
      font-size: 0.82rem;
      color: rgba(255, 255, 255, 0.7);
    }
  }
`;

const SlaBadge = styled.div`
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 6px 14px;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

// Ticket Desk Frame
const DeskFrame = styled.div`
  display: flex;
  height: calc(100vh - 240px);
  min-height: 580px;
  background: #000;
  color: #fff;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 992px) {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 180px);
  }
`;

// --- LEFT COLUMN ---
const Sidebar = styled.div`
  width: 360px;
  background: #0a0a0a;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;

  @media (max-width: 992px) {
    width: 100%;
    max-height: 380px;
  }
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NewTicketBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #9c273a;
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 7px 12px;
  gap: 8px;

  input {
    background: none;
    border: none;
    outline: none;
    color: #fff;
    font-size: 0.85rem;
    width: 100%;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }
`;

const FilterPills = styled.div`
  display: flex;
  gap: 6px;
`;

const FilterPillBtn = styled.button`
  background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.04)'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.6)'};
  border: 1px solid ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.08)'};
  border-radius: 50px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255,255,255,0.08)'};
  }
`;

const TicketList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

const TicketCard = styled.div`
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.18)' : 'rgba(255, 255, 255, 0.02)'};
  border-left: 3px solid ${props => props.$active ? '#ff4d6d' : 'transparent'};
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const TicketTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
`;

const Subject = styled.h4`
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const TimeLabel = styled.span`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

const Pill = styled.span`
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.bg || '#333'};
  color: ${props => props.color || '#fff'};
`;

const MessagePreview = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// --- RIGHT COLUMN ---
const ChatPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #050505;
`;

const ChatHeader = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0a0a0a;
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HeaderSubject = styled.h3`
  margin: 0;
  font-size: 1.15rem;
  color: #fff;
`;

const AssignedTo = styled.span`
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ChatBody = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

const MessageBubble = styled.div`
  max-width: 75%;
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const BubbleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  justify-content: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
`;

const BubbleContent = styled.div`
  padding: 12px 18px;
  border-radius: 14px;
  font-size: 0.92rem;
  line-height: 1.5;
  background: ${props => props.isOwn ? '#7B1F2E' : '#161b22'};
  border: 1px solid ${props => props.isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.08)'};
  border-bottom-right-radius: ${props => props.isOwn ? '2px' : '14px'};
  border-bottom-left-radius: ${props => props.isOwn ? '14px' : '2px'};
  color: #fff;
  white-space: pre-wrap;
  word-break: break-word;
`;

const BubbleMeta = styled.div`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: ${props => props.isOwn ? 'right' : 'left'};
`;

const InputArea = styled.div`
  padding: 16px 24px;
  background: #0a0a0a;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const InputRow = styled.div`
  display: flex;
  gap: 12px;
  background: #141414;
  padding: 6px 6px 6px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  &:focus-within {
    border-color: #7B1F2E;
  }
`;

const ChatInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  color: #fff;
  outline: none;
  font-size: 0.92rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
`;

const SendBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: #9c273a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionBtn = styled.button`
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 40px;

  h3 { color: #fff; margin: 0; }
  p { margin: 0; font-size: 0.88rem; max-width: 320px; }
`;

// --- MODAL ---
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #111;
  width: 100%;
  max-width: 520px;
  border-radius: 16px;
  border: 1px solid rgba(123, 31, 46, 0.4);
  padding: 26px;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
`;

const CategoryChip = styled.button`
  background: ${props => props.$selected ? 'rgba(123, 31, 46, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$selected ? '#ff4d6d' : 'rgba(255, 255, 255, 0.7)'};
  border: 1px solid ${props => props.$selected ? '#ff4d6d' : 'rgba(255, 255, 255, 0.1)'};
  padding: 6px 12px;
  border-radius: 50px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(123, 31, 46, 0.2);
    color: #fff;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  input, select, textarea {
    padding: 10px 14px;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #fff;
    outline: none;
    font-size: 0.9rem;
    transition: border-color 0.2s;

    &:focus {
      border-color: #7B1F2E;
    }
  }

  textarea {
    min-height: 90px;
    resize: vertical;
  }
`;

const SubmitBtn = styled.button`
  padding: 12px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background: #9c273a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CATEGORY_CHIPS = [
  { id: 'Academic', label: '🎓 Academic / Syllabus' },
  { id: 'Attendance', label: '📋 Attendance Correction' },
  { id: 'Fee', label: '💼 Fee / Installments' },
  { id: 'Timetable', label: '⏰ Batch / Timetable' },
  { id: 'Technical', label: '🐞 Portal / Tech Issue' },
  { id: 'Behaviour', label: '🤝 Student Conduct' }
];

const StudentComplaints = () => {
  useAuth();
  const { complaints, loading, createComplaint, sendMessage, closeComplaint, reopenComplaint } = useComplaints();
  
  const [activeId, setActiveId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState('All'); // 'All' | 'Active' | 'Closed'
  const [searchTerm, setSearchTerm] = useState('');
  
  const chatBodyRef = useRef(null);

  const [formData, setFormData] = useState({
    subject: '',
    category: 'Academic',
    priority: 'Normal',
    send_to: 'My Batch Teacher',
    message: ''
  });

  const activeTicket = complaints.find(c => c.id === activeId);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [activeTicket?.messages, activeId]);

  // Set default active ticket if none selected
  useEffect(() => {
    if (!activeId && complaints.length > 0) {
      setActiveId(complaints[0].id);
    }
  }, [complaints, activeId]);

  const handleSelectCategory = (cat) => {
    setFormData(prev => ({
      ...prev,
      category: cat,
      send_to: (cat === 'Fee' || cat === 'Technical') ? 'Admin' : 'My Batch Teacher'
    }));
  };

  const handleNewComplaint = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      toast.error('Please enter a brief subject.');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Please describe your grievance or request.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { message, ...complaintData } = formData;
      const created = await createComplaint(complaintData, message);
      setActiveId(created.id);
      setIsModalOpen(false);
      setFormData({
        subject: '',
        category: 'Academic',
        priority: 'Normal',
        send_to: 'My Batch Teacher',
        message: ''
      });
      toast.success("Grievance ticket created successfully! Expected SLA: 24-48 hours.");
    } catch (err) {
      toast.error(err?.message || "Failed to create complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeId) return;
    try {
      await sendMessage(activeId, newMessage);
      setNewMessage('');
      toast.success("Message sent!");
    } catch (err) {
      toast.error("Failed to send message. Please retry.");
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000 && now.getDate() === date.getDate()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return '#10B981';
      case 'Pending Reply': return '#ffc107';
      case 'Closed': return '#6c757d';
      default: return '#333';
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Academic': return '#378ADD';
      case 'Fee': return '#fd7e14';
      case 'Attendance': return '#20c997';
      case 'Technical': return '#e83e8c';
      case 'Behaviour': return '#6f42c1';
      default: return '#333';
    }
  };

  // Filtered tickets
  const filteredComplaints = complaints.filter(t => {
    if (filter === 'Active' && t.status === 'Closed') return false;
    if (filter === 'Closed' && t.status !== 'Closed') return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSub = t.subject?.toLowerCase().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      return matchSub || matchCat;
    }
    return true;
  });

  return (
    <DashboardLayout>
      <Container>
        
        {/* Support SLA & Resolution Commitment Banner */}
        <SlaBanner>
          <SlaContent>
            <div className="icon-wrap">
              <FaShieldAlt />
            </div>
            <div className="text">
              <h4>DeepSkills Student Support Desk & Grievance SLA</h4>
              <p>Official Academic & Administrative inquiry desk. Guaranteed staff review within 24 to 48 hours.</p>
            </div>
          </SlaContent>
          <SlaBadge>
            <FaClock size={11} /> SLA: 24–48 Hours &bull; Mon–Sat 10 AM – 6 PM
          </SlaBadge>
        </SlaBanner>

        <DeskFrame>
          <Sidebar>
            <SidebarHeader>
              <NewTicketBtn onClick={() => setIsModalOpen(true)}>
                <FaPlus size={12} /> Raise Support Ticket
              </NewTicketBtn>

              <SearchBox>
                <FaSearch size={12} color="rgba(255,255,255,0.3)" />
                <input 
                  type="text" 
                  placeholder="Search your tickets..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </SearchBox>

              <FilterPills>
                {['All', 'Active', 'Closed'].map(f => (
                  <FilterPillBtn 
                    key={f}
                    $active={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </FilterPillBtn>
                ))}
              </FilterPills>
            </SidebarHeader>

            <TicketList>
              {filteredComplaints.map(ticket => (
                <TicketCard 
                  key={ticket.id} 
                  $active={activeId === ticket.id}
                  onClick={() => setActiveId(ticket.id)}
                >
                  <TicketTop>
                    <Subject title={ticket.subject}>{ticket.subject}</Subject>
                    <TimeLabel>{formatTime(ticket.updated_at)}</TimeLabel>
                  </TicketTop>
                  
                  <BadgeRow>
                    <Pill bg={getCategoryColor(ticket.category)}>{ticket.category}</Pill>
                    {ticket.priority === 'Urgent' && (
                      <Pill bg="rgba(255, 77, 109, 0.2)" color="#ff4d6d">Urgent</Pill>
                    )}
                    <Pill bg={getStatusColor(ticket.status)}>{ticket.status}</Pill>
                  </BadgeRow>
                  
                  <MessagePreview>
                    {ticket.messages && ticket.messages.length > 0 
                      ? ticket.messages[ticket.messages.length - 1].text 
                      : 'No messages yet'}
                  </MessagePreview>
                </TicketCard>
              ))}

              {filteredComplaints.length === 0 && !loading && (
                <EmptyState style={{ fontSize: '0.88rem' }}>
                  <FaInbox size={28} />
                  <p>No support tickets match your filter.</p>
                </EmptyState>
              )}
            </TicketList>
          </Sidebar>

          <ChatPanel>
            {activeTicket ? (
              <>
                <ChatHeader>
                  <HeaderInfo>
                    <HeaderSubject>{activeTicket.subject}</HeaderSubject>
                    <AssignedTo>
                      <FaChalkboardTeacher size={12} /> Routed To:{' '}
                      <strong style={{ color: '#fff' }}>
                        {activeTicket.send_to === 'Admin' ? 'Administrative Directorate' : 'Batch Faculty / Academic Coordinator'}
                      </strong>
                    </AssignedTo>
                  </HeaderInfo>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Pill bg={getStatusColor(activeTicket.status)} style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
                      {activeTicket.status}
                    </Pill>

                    {activeTicket.status !== 'Closed' ? (
                      <ActionBtn onClick={() => {
                        closeComplaint(activeTicket.id);
                        toast.success("Ticket closed.");
                      }}>
                        Close Ticket
                      </ActionBtn>
                    ) : (
                      <ActionBtn 
                        onClick={() => {
                          reopenComplaint(activeTicket.id);
                          toast.success("Ticket reopened.");
                        }}
                        style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                      >
                        <FaUndo size={11} /> Reopen
                      </ActionBtn>
                    )}
                  </div>
                </ChatHeader>
                
                <ChatBody ref={chatBodyRef}>
                  {activeTicket.messages?.map((msg, idx) => {
                    const isStudent = msg.sender_role === 'student';
                    return (
                      <MessageBubble key={idx} isOwn={isStudent}>
                        <BubbleHeader isOwn={isStudent}>
                          {isStudent ? (
                            <><span>You</span> <FaUserGraduate size={10} /></>
                          ) : (
                            <><FaShieldAlt size={11} color="#ff4d6d" /> <span>{msg.sender_name || 'Academic Support'} (Staff)</span></>
                          )}
                        </BubbleHeader>
                        
                        <BubbleContent isOwn={isStudent}>
                          {msg.text}
                        </BubbleContent>
                        
                        <BubbleMeta isOwn={isStudent}>
                          {formatTime(msg.created_at)}
                        </BubbleMeta>
                      </MessageBubble>
                    );
                  })}
                </ChatBody>

                <InputArea>
                  {activeTicket.status !== 'Closed' ? (
                    <InputRow>
                      <ChatInput 
                        placeholder="Write a message to your instructor or coordinator..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <SendBtn onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <FaPaperPlane size={12} /> Send
                      </SendBtn>
                    </InputRow>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', padding: '6px 0' }}>
                      This grievance ticket has been marked as resolved and closed. Click <strong>Reopen</strong> above if you require further assistance.
                    </div>
                  )}
                </InputArea>
              </>
            ) : (
              <EmptyState>
                <FaInbox size={54} style={{ opacity: 0.2 }} />
                <h3>Select a Grievance Ticket</h3>
                <p>Pick an existing conversation from the left, or raise a new ticket to resolve academic, fee, or technical inquiries.</p>
              </EmptyState>
            )}
          </ChatPanel>
        </DeskFrame>

      </Container>

      {/* Raise New Complaint Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
          >
            <ModalContent
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Raise Support Ticket</h3>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    SLA Commitment: 24–48 hours guaranteed review
                  </div>
                </div>
                <FaTimes 
                  style={{ cursor: 'pointer', opacity: 0.6, color: '#fff' }} 
                  size={18}
                  onClick={() => setIsModalOpen(false)} 
                />
              </div>
              
              <form onSubmit={handleNewComplaint}>
                <FormGroup>
                  <label>Select Grievance Category</label>
                  <ChipContainer>
                    {CATEGORY_CHIPS.map(chip => (
                      <CategoryChip
                        key={chip.id}
                        type="button"
                        $selected={formData.category === chip.id}
                        onClick={() => handleSelectCategory(chip.id)}
                      >
                        {chip.label}
                      </CategoryChip>
                    ))}
                  </ChipContainer>
                </FormGroup>

                <FormGroup>
                  <label>Brief Subject Title *</label>
                  <input 
                    required 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g., Attendance missing for Lecture 6, or Fee receipt verification"
                  />
                </FormGroup>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormGroup>
                    <label>Priority Level</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent (Immediate attention)</option>
                    </select>
                  </FormGroup>

                  <FormGroup>
                    <label>Route Desk</label>
                    <select 
                      value={formData.send_to}
                      onChange={(e) => setFormData({...formData, send_to: e.target.value})}
                    >
                      <option value="My Batch Teacher">Batch Teacher / Coordinator</option>
                      <option value="Admin">Administration & Finance</option>
                    </select>
                  </FormGroup>
                </div>

                <FormGroup>
                  <label>Describe the Issue in Detail *</label>
                  <textarea 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Please provide dates, lecture numbers, or transaction details so we can resolve this swiftly..."
                  />
                </FormGroup>

                <SubmitBtn type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Filing Ticket...' : 'Submit Support Ticket'}
                </SubmitBtn>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default StudentComplaints;
