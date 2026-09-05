import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

import { 
  FaPaperPlane, FaExclamationCircle, 
  FaCheckCircle, FaInbox, FaUserShield
} from 'react-icons/fa';

import AdminLayout from '../components/AdminLayout';
import { useComplaints } from '../context/ComplaintsContext';
import { Skeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import toast from 'react-hot-toast';

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

const Sidebar = styled.div`
  width: 350px;
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
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 5px 0;
  &::-webkit-scrollbar { display: none; }
`;

const FilterBtn = styled.button`
  padding: 6px 12px;
  background: ${props => props.$active ? '#7B1F2E' : '#1a1a1a'};
  color: #fff;
  border: 1px solid ${props => props.$active ? '#7B1F2E' : '#333'};
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover { border-color: #7B1F2E; }
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
  margin-bottom: 5px;
`;

const StudentName = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
`;

const TimeLabel = styled.span`
  font-size: 0.7rem;
  color: #666;
`;

const SubjectLine = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

const Pill = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => props.bg || '#333'};
  color: #fff;
`;

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

  &:hover { background: #9b283b; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ControlBtn = styled.button`
  padding: 8px 15px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  transition: all 0.3s;

  &.resolve {
    background: #28a745;
    color: #fff;
    &:hover { background: #218838; }
  }

  &.urgent {
    background: ${props => props.$active ? '#7B1F2E' : '#1a1a1a'};
    color: ${props => props.$active ? '#fff' : '#888'};
    border-color: ${props => props.$active ? '#7B1F2E' : '#333'};
    &:hover { border-color: #7B1F2E; }
  }
`;

const AdminComplaints = () => {
  return <ComplaintsContent />;
};

const ComplaintsContent = () => {
  const { complaints, loading, sendMessage, closeComplaint, toggleUrgent } = useComplaints();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'complaints', 'full');
  
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [newMessage, setNewMessage] = useState('');
  
  const chatBodyRef = useRef(null);

  const filteredComplaints = complaints.filter(c => {
    if (filter === 'All') return true;
    if (filter === 'Urgent') return c.priority === 'Urgent';
    return c.status === filter;
  });

  const activeTicket = complaints.find(c => c.id === activeId);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [activeTicket?.messages, activeId]);

  const handleSendMessage = async () => {
    if (!canMutate) {
      toast.error("You have view-only access. Sending replies is not permitted.");
      return;
    }
    if (!newMessage.trim() || !activeId) return;
    try {
      await sendMessage(activeId, newMessage);
      setNewMessage('');
    } catch (err) {
      toast.error("Failed to send message.");
    }
  };

  const handleResolve = async () => {
    if (!canMutate) {
      toast.error("You have view-only access. Resolving complaints is not permitted.");
      return;
    }
    if (!activeId) return;
    if (window.confirm("Mark this administrative complaint as resolved?")) {
      try {
        await sendMessage(activeId, "Administrative response: Your issue has been marked as resolved. Please reopen if the problem continues.");
        await closeComplaint(activeId);
        toast.success("Ticket resolved");
      } catch (err) {
        toast.error("Failed to resolve ticket.");
      }
    }
  };

  const handleToggleUrgent = async () => {
    if (!canMutate) {
      toast.error("You have view-only access. Updating priority is not permitted.");
      return;
    }
    if (activeTicket) {
      await toggleUrgent(activeTicket.id, activeTicket.priority);
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

  return (
    <Container>
        <Sidebar>
          <SidebarHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <FaUserShield style={{ color: '#7B1F2E' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Admin Inbox</h3>
            </div>
            <FilterBar>
              {['All', 'Open', 'Pending Reply', 'Closed', 'Urgent'].map(f => (
                <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                  {f}
                </FilterBtn>
              ))}
            </FilterBar>
          </SidebarHeader>
          
          <TicketList>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <Skeleton height="15px" width="100px" />
                    <Skeleton height="15px" width="40px" />
                  </div>
                  <Skeleton height="20px" width="200px" />
                  <div style={{ marginTop: '10px' }}>
                    <Skeleton height="15px" width="80px" />
                  </div>
                </div>
              ))
            ) : filteredComplaints.map(ticket => (
              <TicketCard 
                key={ticket.id} 
                $active={activeId === ticket.id}
                onClick={() => setActiveId(ticket.id)}
              >
                <TicketTop>
                  <StudentName>{ticket.student_name}</StudentName>
                  <TimeLabel>{formatTime(ticket.updated_at)}</TimeLabel>
                </TicketTop>
                <SubjectLine title={ticket.subject}>{ticket.subject}</SubjectLine>
                <BadgeRow>
                  <Pill bg="#007bff">{ticket.category}</Pill>
                  <Pill bg={getStatusColor(ticket.status)}>{ticket.status}</Pill>
                  {ticket.priority === 'Urgent' && <Pill bg="#7B1F2E">Urgent</Pill>}
                </BadgeRow>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{ticket.course} • {ticket.batch}</div>
              </TicketCard>
            ))}
            {filteredComplaints.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#444' }}>
                <FaInbox size={30} />
                <p>No admin tickets found</p>
              </div>
            )}
          </TicketList>
        </Sidebar>

        <ChatPanel>
          {activeTicket ? (
            <>
              <ChatHeader>
                <HeaderInfo>
                  <HeaderSubject>{activeTicket.subject}</HeaderSubject>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>
                    Student: {activeTicket.student_name} ({activeTicket.student_cnic})
                  </div>
                </HeaderInfo>
                {canMutate && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <ControlBtn 
                      className="urgent" 
                      $active={activeTicket.priority === 'Urgent'}
                      onClick={() => toggleUrgent(activeTicket.id, activeTicket.priority)}
                    >
                      <FaExclamationCircle /> {activeTicket.priority === 'Urgent' ? 'Priority: Urgent' : 'Set Urgent'}
                    </ControlBtn>
                    {activeTicket.status !== 'Closed' && (
                      <ControlBtn className="resolve" onClick={handleResolve}>
                        <FaCheckCircle /> Resolve
                      </ControlBtn>
                    )}
                  </div>
                )}
              </ChatHeader>
              
              <ChatBody ref={chatBodyRef}>
                {activeTicket.messages?.map((msg, idx) => (
                  <MessageBubble key={idx} isOwn={msg.sender_role === 'admin'}>
                    <BubbleContent isOwn={msg.sender_role === 'admin'}>
                      {msg.text}
                    </BubbleContent>
                    <BubbleMeta isOwn={msg.sender_role === 'admin'}>
                      {msg.sender_name} ({msg.sender_role}) • {formatTime(msg.created_at)}
                    </BubbleMeta>
                  </MessageBubble>
                ))}
              </ChatBody>

              <InputArea>
                {activeTicket.status !== 'Closed' ? (
                  canMutate ? (
                    <InputRow>
                      <ChatInput 
                        placeholder="Type administrative reply..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <SendBtn onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <FaPaperPlane /> Admin Reply
                      </SendBtn>
                    </InputRow>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                      View-only access: replies and resolution are disabled.
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                    This administrative ticket is closed.
                  </div>
                )}
              </InputArea>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
              <FaUserShield size={100} />
              <h3>Select a ticket to manage</h3>
            </div>
          )}
        </ChatPanel>
      </Container>
  );
};
const AdminComplaintsPage = () => <AdminLayout><AdminComplaints /></AdminLayout>;
export { AdminComplaints };
export default AdminComplaintsPage;
