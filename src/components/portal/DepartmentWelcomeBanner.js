import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { FaBolt, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { portalTheme } from './PortalTheme';

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.96); }
`;

const BannerContainer = styled(motion.div)`
  background: linear-gradient(135deg, rgba(18, 22, 32, 0.92) 0%, rgba(11, 14, 22, 0.96) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid ${props => props.$color || portalTheme.colors.primary};
  border-radius: ${portalTheme.radii.lg};
  padding: 22px 26px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 320px;
    height: 100%;
    background: radial-gradient(circle at 100% 0%, ${props => `${props.$color || portalTheme.colors.primary}18`} 0%, transparent 70%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 18px;
    margin-bottom: 20px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
`;

const UserBriefing = styled.div`
  flex: 1;
  min-width: 260px;

  h2 {
    font-size: clamp(1.25rem, 2vw, 1.6rem);
    font-weight: 800;
    color: #ffffff;
    margin: 8px 0 6px;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  p {
    font-size: 0.88rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.5;
    max-width: 640px;
  }
`;

const WorkstationPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  background: ${props => `${props.$color || '#378ADD'}20`};
  border: 1px solid ${props => `${props.$color || '#378ADD'}40`};
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.72rem;
  font-weight: 700;
  color: ${props => props.$color || '#378ADD'};
  text-transform: uppercase;
  letter-spacing: 0.06em;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => props.$color || '#378ADD'};
    box-shadow: 0 0 8px ${props => props.$color || '#378ADD'};
    animation: ${pulse} 2s infinite ease-in-out;
  }
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    width: 100%;
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 15px;
  border-radius: ${portalTheme.radii.md};
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  border: 1px solid ${props => props.$primary 
    ? 'transparent' 
    : 'rgba(255, 255, 255, 0.12)'};
  background: ${props => props.$primary 
    ? `linear-gradient(135deg, ${props.$color || '#378ADD'} 0%, ${props.$color || '#378ADD'}cc 100%)` 
    : 'rgba(255, 255, 255, 0.04)'};
  color: #ffffff;
  box-shadow: ${props => props.$primary ? `0 4px 14px ${props.$color || '#378ADD'}40` : 'none'};

  &:hover {
    background: ${props => props.$primary 
      ? `linear-gradient(135deg, ${props.$color || '#378ADD'} 0%, ${props.$color || '#378ADD'} 100%)` 
      : 'rgba(255, 255, 255, 0.08)'};
    transform: translateY(-1px);
    border-color: ${props => props.$primary ? 'transparent' : 'rgba(255, 255, 255, 0.22)'};
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    flex: 1;
    justify-content: center;
  }
`;

const MetricsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-top: 20px;
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`;

const MetricCard = styled.div`
  background: ${props => props.$alert 
    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(20, 24, 33, 0.9) 100%)' 
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$alert 
    ? 'rgba(245, 158, 11, 0.35)' 
    : 'rgba(255, 255, 255, 0.06)'};
  border-radius: ${portalTheme.radii.md};
  padding: 14px 16px;
  transition: ${portalTheme.transitions.default};
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${props => props.$alert ? 'rgba(245, 158, 11, 0.6)' : `${props.$color || '#378ADD'}60`};
    background: ${props => props.$alert 
      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(20, 24, 33, 0.95) 100%)' 
      : 'rgba(255, 255, 255, 0.05)'};
    transform: translateY(-2px);
  }

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;

    .label {
      font-size: 0.74rem;
      font-weight: 600;
      color: ${props => props.$alert ? '#fbbf24' : '#94a3b8'};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: ${portalTheme.radii.pill};
      background: ${props => props.$alert ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)'};
      color: ${props => props.$alert ? '#fef3c7' : '#cbd5e1'};
      border: 1px solid ${props => props.$alert ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
    }
  }

  .main-val {
    display: flex;
    align-items: baseline;
    gap: 8px;

    .num {
      font-size: 1.6rem;
      font-weight: 800;
      color: ${props => props.$alert ? '#fbbf24' : '#ffffff'};
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .sub {
      font-size: 0.74rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const DepartmentWelcomeBanner = ({
  user,
  departmentLabel = 'Workstation',
  subtitle = 'Overview metrics, operational status, and high-priority action items.',
  color = '#378ADD',
  metrics = [],
  quickActions = []
}) => {
  const timeGreeting = useMemo(() => getTimeGreeting(), []);
  const userName = user?.name || user?.full_name || 'Team Member';

  return (
    <BannerContainer $color={color}>
      <TopRow>
        <UserBriefing>
          <WorkstationPill $color={color}>
            <span className="dot" />
            <span>{departmentLabel}</span>
          </WorkstationPill>
          <h2>
            {timeGreeting}, {userName}! <span style={{ fontSize: '1.2rem' }}>👋</span>
          </h2>
          <p>{subtitle}</p>
        </UserBriefing>

        {quickActions.length > 0 && (
          <ActionsRow>
            {quickActions.map((action, idx) => (
              <ActionButton
                key={`qa-${idx}`}
                type="button"
                $primary={action.primary}
                $color={color}
                onClick={action.onClick}
              >
                {action.icon}
                <span>{action.label}</span>
              </ActionButton>
            ))}
          </ActionsRow>
        )}
      </TopRow>

      {metrics.length > 0 && (
        <MetricsStrip>
          {metrics.map((item, idx) => (
            <MetricCard
              key={`metric-${idx}`}
              $alert={Boolean(item.alert)}
              $color={color}
              onClick={item.onClick}
              style={{ cursor: item.onClick ? 'pointer' : 'default' }}
              title={item.tooltip || undefined}
            >
              <div className="meta">
                <span className="label">{item.label}</span>
                {item.badge && <span className="badge">{item.badge}</span>}
              </div>
              <div className="main-val">
                <span className="num">{item.value}</span>
                {item.sub && <span className="sub">{item.sub}</span>}
              </div>
            </MetricCard>
          ))}
        </MetricsStrip>
      )}
    </BannerContainer>
  );
};

export default DepartmentWelcomeBanner;
