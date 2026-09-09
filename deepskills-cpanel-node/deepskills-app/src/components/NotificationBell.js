import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import { useNotifications } from '../hooks/useNotifications';
import { formatTimeAgo, getNotifColor, getNotifIcon } from '../utils/notifUtils';

const BellWrap = styled.div`
  position: relative;
`;

const BellButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;

  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -5px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  width: min(380px, 92vw);
  max-height: 520px;
  background: #111318;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.45);
  z-index: 1200;
  overflow: hidden;
`;

const DropHeader = styled.div`
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);

  h3 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
  }

  button {
    color: #4F8EF7;
    cursor: pointer;
    font-size: 0.8rem;
  }
`;

const List = styled.div`
  max-height: 390px;
  overflow-y: auto;
`;

const NotificationItem = styled.button`
  width: 100%;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  text-align: left;
  padding: 13px 16px;
  background: ${({ $unread }) => ($unread ? 'rgba(79, 142, 247, 0.12)' : 'transparent')};
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  position: relative;

  &:hover {
    background: rgba(255,255,255,0.06);
  }
`;

const Icon = styled.span`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}22`};
`;

const ItemBody = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: #fff;
    font-size: 0.9rem;
    margin-bottom: 4px;
  }

  p {
    color: #c7c7c7;
    font-size: 0.8rem;
    line-height: 1.35;
    margin: 0 0 6px;
  }

  small {
    color: #777;
    font-size: 0.72rem;
  }
`;

const EmptyState = styled.div`
  padding: 42px 20px;
  text-align: center;
  color: #777;
`;

const Footer = styled.button`
  width: 100%;
  padding: 13px;
  color: #4F8EF7;
  cursor: pointer;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-weight: 700;
`;

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handleClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <BellWrap ref={dropdownRef}>
      <BellButton type="button" aria-label="Notifications" onClick={() => setOpen((current) => !current)}>
        <FaBell />
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
      </BellButton>

      {open && (
        <Dropdown>
          <DropHeader>
            <h3>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</h3>
            {unreadCount > 0 && <button type="button" onClick={markAllAsRead}>Mark all read</button>}
          </DropHeader>

          <List>
            {notifications.length === 0 ? (
              <EmptyState>🔔 No notifications yet</EmptyState>
            ) : notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                type="button"
                $unread={!notification.is_read}
                onClick={() => handleNotificationClick(notification)}
              >
                <Icon $color={getNotifColor(notification.type)}>{getNotifIcon(notification.type)}</Icon>
                <ItemBody>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <small>{formatTimeAgo(notification.created_at)}</small>
                </ItemBody>
              </NotificationItem>
            ))}
          </List>

          <Footer type="button" onClick={() => setOpen(false)}>
            View all notifications
          </Footer>
        </Dropdown>
      )}
    </BellWrap>
  );
};

export default NotificationBell;
