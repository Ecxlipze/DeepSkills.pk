import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, FaPaperPlane, FaTimes, FaInbox, FaUndo
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useComplaints } from '../context/ComplaintsContext';

const Container = styled.div`
  display: flex;
  height: calc(100vh - 100px);
  background: #000;
  color: #fff;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 992px) {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 100px);
  }
`;

// --- LEFT COLUMN ---
const Sidebar = styled.div`
  width: 320px;
  background: #0a0a0a;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;

  @media (max-width: 992px) {
    width: 100%;
    max-height: 400px;
  }
`;

const SidebarHeader = styled.div`
  padding: 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const NewTicketBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #9b283b;
    transform: translateY(-2px);
  }
`;

const TicketList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

const TicketCard = styled.div`
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.15)' : 'transparent'};
  border-left: 4px solid ${props => props.$active ? '#7B1F2E' : 'transparent'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const TicketTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const Subject = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
`;

const TimeLabel = styled.span`
  font-size: 0.75rem;
  color: #666;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`;

const Pill = styled.span`
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.bg || '#333'};
  color: #fff;
`;

const MessagePreview = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UnreadDot = styled.div`
  width: 8px;
  height: 8px;
  background: #007bff;
  border-radius: 50%;
  position: absolute;
  top: 15px;
  right: 15px;
`;

// --- RIGHT COLUMN ---
const ChatPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #050505;
`;

const ChatHeader = styled.div`
  padding: 20px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0a0a0a;
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const HeaderSubject = styled.h2`
  margin: 0;
  font-size: 1.1rem;
`;

const AssignedTo = styled.span`
  font-size: 0.85rem;
  color: #888;
`;

const ChatBody = styled.div`
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

const MessageBubble = styled.div`
  max-width: 70%;
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const BubbleContent = styled.div`
  padding: 12px 16px;
  border-radius: 15px;
  font-size: 0.95rem;
  line-height: 1.5;
  background: ${props => props.isOwn ? '#7B1F2E' : '#1a1a1a'};
  border-bottom-right-radius: ${props => props.isOwn ? '2px' : '15px'};
  border-bottom-left-radius: ${props => props.isOwn ? '15px' : '2px'};
`;

const BubbleMeta = styled.div`
  font-size: 0.75rem;
  color: #666;
  text-align: ${props => props.isOwn ? 'right' : 'left'};
`;

const InputArea = styled.div`
  padding: 20px 30px;
  background: #0a0a0a;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const InputRow = styled.div`
  display: flex;
  gap: 15px;
  background: #1a1a1a;
  padding: 8px 8px 8px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ChatInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  color: #fff;
  outline: none;
  font-size: 0.95rem;
`;

const SendBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    background: #9b283b;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
  background: #0f0f0f;
  width: 100%;
  max-width: 500px;
  border-radius: 20px;
  border: 1px solid rgba(123, 31, 46, 0.3);
  padding: 30px;
  position: relative;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ModalLabel = styled.label`
  font-size: 0.9rem;
  color: #888;
`;

const ModalInput = styled.input`
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  color: #fff;
  outline: none;
  &:focus { border-color: #7B1F2E; }
`;

const ModalSelect = styled.select`
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  color: #fff;
  outline: none;
  &:focus { border-color: #7B1F2E; }
`;

const ModalTextarea = styled.textarea`
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  color: #fff;
  outline: none;
  min-height: 100px;
  resize: vertical;
  &:focus { border-color: #7B1F2E; }
`;

const CloseBtn = styled.button`
  background: #7B1F2E;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #444;
  text-align: center;
  padding: 40px;
`;

const StudentComplaints = () => {
  useAuth();
  const { complaints, loading, createComplaint, sendMessage, closeComplaint, reopenComplaint } = useComplaints();
  
  const [activeId, setActiveId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const handleNewComplaint = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      alert("Failed to create complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeId) return;
    try {
      await sendMessage(activeId, newMessage);
      setNewMessage('');
    } catch (err) {
      alert("Failed to send message.");
    }
  };

  const formatTime = (dateStr) => {
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
      case 'Open': return '#28a745';
      case 'Pending Reply': return '#ffc107';
      case 'Closed': return '#6c757d';
      default: return '#333';
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Academic': return '#007bff';
      case 'Fee': return '#fd7e14';
      case 'Attendance': return '#20c997';
      case 'Behaviour': return '#6f42c1';
      default: return '#333';
    }
  };

  return (
    <DashboardLayout>
      <Container>
        <Sidebar>
          <SidebarHeader>
            <NewTicketBtn onClick={() => setIsModalOpen(true)}>
              <FaPlus /> New Complaint
            </NewTicketBtn>
          </SidebarHeader>
          <TicketList>
            {complaints.map(ticket => (
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
                  <Pill bg={ticket.priority === 'Urgent' ? '#7B1F2E' : '#333'}>{ticket.priority}</Pill>
                  <Pill bg={getStatusColor(ticket.status)}>{ticket.status}</Pill>
                </BadgeRow>
                <MessagePreview>
                  {ticket.messages && ticket.messages.length > 0 
                    ? ticket.messages[ticket.messages.length - 1].text 
                    : 'No messages yet'}
                </MessagePreview>
                {ticket.messages && ticket.messages.length > 0 && 
                 ticket.messages[ticket.messages.length - 1].sender_role !== 'student' && 
                 ticket.status !== 'Closed' && <UnreadDot />}
              </TicketCard>
            ))}
            {complaints.length === 0 && !loading && (
              <EmptyState style={{ fontSize: '0.9rem' }}>
                <FaInbox size={30} />
                <p>No complaints yet</p>
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
                    Sent to: {activeTicket.send_to === 'Admin' ? 'Admin' : 'Batch Teacher'}
                  </AssignedTo>
                </HeaderInfo>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <Pill bg={getStatusColor(activeTicket.status)} style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
                    {activeTicket.status}
                  </Pill>
                  {activeTicket.status !== 'Closed' ? (
                    <CloseBtn onClick={() => closeComplaint(activeTicket.id)}>
                      Close Ticket
                    </CloseBtn>
                  ) : (
                    <button 
                      onClick={() => reopenComplaint(activeTicket.id)}
                      style={{ background: '#28a745', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <FaUndo size={12} /> Reopen
                    </button>
                  )}
                </div>
              </ChatHeader>
              
              <ChatBody ref={chatBodyRef}>
                {activeTicket.messages?.map((msg, idx) => (
                  <MessageBubble key={idx} isOwn={msg.sender_role === 'student'}>
                    <BubbleContent isOwn={msg.sender_role === 'student'}>
                      {msg.text}
                    </BubbleContent>
                    <BubbleMeta isOwn={msg.sender_role === 'student'}>
                      {msg.sender_name} • {formatTime(msg.created_at)}
                    </BubbleMeta>
                  </MessageBubble>
                ))}
              </ChatBody>

              <InputArea>
                {activeTicket.status !== 'Closed' ? (
                  <InputRow>
                    <ChatInput 
                      placeholder="Type your message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <SendBtn onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <FaPaperPlane /> Send
                    </SendBtn>
                  </InputRow>
                ) : (
                  <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                    This ticket is closed. Reopen to send messages.
                  </div>
                )}
              </InputArea>
            </>
          ) : (
            <EmptyState>
              <FaCertificate size={60} style={{ opacity: 0.1 }} />
              <h3>Select a ticket to view conversation</h3>
              <p>Or create a new one to get help from our team.</p>
            </EmptyState>
          )}
        </ChatPanel>
      </Container>

      <AnimatePresence>
        {isModalOpen && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0 }}>Raise a New Complaint</h3>
                <FaTimes 
                  style={{ cursor: 'pointer', opacity: 0.5 }} 
                  onClick={() => setIsModalOpen(false)} 
                />
              </div>
              
              <form onSubmit={handleNewComplaint}>
                <FormGroup>
                  <ModalLabel>Subject</ModalLabel>
                  <ModalInput 
                    required 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="Briefly describe the issue"
                  />
                </FormGroup>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <FormGroup>
                    <ModalLabel>Category</ModalLabel>
                    <ModalSelect 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Academic</option>
                      <option>Fee</option>
                      <option>Attendance</option>
                      <option>Behaviour</option>
                      <option>Other</option>
                    </ModalSelect>
                  </FormGroup>
                  <FormGroup>
                    <ModalLabel>Priority</ModalLabel>
                    <ModalSelect 
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option>Normal</option>
                      <option>Urgent</option>
                    </ModalSelect>
                  </FormGroup>
                </div>

                <FormGroup>
                  <ModalLabel>Send To</ModalLabel>
                  <ModalSelect 
                    value={formData.send_to}
                    onChange={(e) => setFormData({...formData, send_to: e.target.value})}
                  >
                    <option value="My Batch Teacher">My Batch Teacher</option>
                    <option value="Admin">Admin</option>
                  </ModalSelect>
                </FormGroup>

                <FormGroup>
                  <ModalLabel>Initial Message</ModalLabel>
                  <ModalTextarea 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Explain your problem in detail..."
                  />
                </FormGroup>

                <SubmitBtn type="submit" disabled={isSubmitting} style={{ width: '100%', gridColumn: 'auto' }}>
                  {isSubmitting ? 'Creating...' : 'Submit Complaint'}
                </SubmitBtn>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

const SubmitBtn = styled.button`
  padding: 14px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #9b283b;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FaCertificate = styled(FaInbox)``;

export default StudentComplaints;
