import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { formatTimeAgo, getNotifColor, getNotifIcon } from '../utils/notifUtils';

const slideIn = keyframes`
  from { transform: translateX(110%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const ToastStack = styled.div`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1400;
  display: grid;
  gap: 12px;
  width: min(380px, calc(100vw - 32px));

  @media (max-width: 600px) {
    right: 16px;
    left: 16px;
    bottom: 16px;
    width: auto;
  }
`;

const ToastCard = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 24px;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 16px;
  background: #111318;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 18px 50px rgba(0,0,0,0.4);
  color: #fff;
  text-align: left;
  cursor: pointer;
  animation: ${slideIn} 220ms ease-out;
`;

const ToastIcon = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}22`};
`;

const ToastText = styled.div`
  min-width: 0;

  strong {
    display: block;
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

const CloseToast = styled.span`
  color: #888;
  font-size: 1rem;
  line-height: 1;
  padding-top: 2px;
`;

const ToastNotifications = () => {
  const navigate = useNavigate();
  const { toastQueue, dismissToast } = useNotifications();

  useEffect(() => {
    if (toastQueue.length === 0) return undefined;
    const latest = toastQueue[toastQueue.length - 1];
    const timer = window.setTimeout(() => dismissToast(latest.toastId), 5000);
    return () => window.clearTimeout(timer);
  }, [dismissToast, toastQueue]);

  if (toastQueue.length === 0) return null;

  return (
    <ToastStack>
      {toastQueue.slice(-3).map((toast) => (
        <ToastCard
          key={toast.toastId}
          role="button"
          tabIndex={0}
          onClick={() => {
            dismissToast(toast.toastId);
            if (toast.link) navigate(toast.link);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              dismissToast(toast.toastId);
              if (toast.link) navigate(toast.link);
            }
          }}
        >
          <ToastIcon $color={getNotifColor(toast.type)}>{getNotifIcon(toast.type)}</ToastIcon>
          <ToastText>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
            <small>{formatTimeAgo(toast.created_at)}</small>
          </ToastText>
          <CloseToast
            role="button"
            aria-label="Dismiss notification"
            onClick={(event) => {
              event.stopPropagation();
              dismissToast(toast.toastId);
            }}
          >
            ×
          </CloseToast>
        </ToastCard>
      ))}
    </ToastStack>
  );
};

export default ToastNotifications;
