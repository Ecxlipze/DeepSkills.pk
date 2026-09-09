import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { portalTheme } from './PortalTheme';
import PortalCard from './PortalCard';

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

const IconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${portalTheme.radii.md};
  background: ${props => props.$accentBg || portalTheme.colors.primaryLight};
  color: ${props => props.$accentColor || portalTheme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  border: 1px solid ${props => props.$accentBorder || 'rgba(123, 31, 46, 0.25)'};
  box-shadow: 0 0 15px ${props => props.$accentGlow || 'rgba(123, 31, 46, 0.2)'};
  flex-shrink: 0;
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: ${portalTheme.radii.pill};
  background: ${props => props.$bg || 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$color || portalTheme.colors.textMuted};
  border: 1px solid ${props => props.$border || 'rgba(255, 255, 255, 0.08)'};
`;

const Value = styled.div`
  font-size: clamp(1.8rem, 2.5vw, 2.4rem);
  font-weight: 800;
  color: ${portalTheme.colors.textPrimary};
  line-height: 1.1;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
`;

const Label = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${portalTheme.colors.textSecondary};
  text-transform: capitalize;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  margin-top: 14px;
  overflow: hidden;
`;

const ProgressBar = styled(motion.div)`
  height: 100%;
  border-radius: 999px;
  background: ${props => props.$color || portalTheme.colors.primary};
`;

export const MetricCard = ({
  icon,
  label,
  value,
  badgeText,
  badgeType = 'default', // 'success', 'warning', 'danger', 'info', 'primary', 'default'
  progress, // 0 to 100
  accentColor = portalTheme.colors.primary,
  accentBg,
  accentBorder,
  accentGlow,
  hoverable = true,
  onClick,
  ...props
}) => {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'success':
        return {
          bg: portalTheme.colors.successLight,
          color: portalTheme.colors.successText,
          border: 'rgba(16, 185, 129, 0.25)'
        };
      case 'warning':
        return {
          bg: portalTheme.colors.warningLight,
          color: portalTheme.colors.warningText,
          border: 'rgba(245, 158, 11, 0.25)'
        };
      case 'danger':
        return {
          bg: portalTheme.colors.dangerLight,
          color: portalTheme.colors.dangerText,
          border: 'rgba(239, 68, 68, 0.25)'
        };
      case 'info':
        return {
          bg: portalTheme.colors.infoLight,
          color: portalTheme.colors.infoText,
          border: 'rgba(59, 130, 246, 0.25)'
        };
      case 'primary':
        return {
          bg: portalTheme.colors.primaryLight,
          color: '#ff8a99',
          border: 'rgba(123, 31, 46, 0.35)'
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          color: portalTheme.colors.textMuted,
          border: 'rgba(255, 255, 255, 0.08)'
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <PortalCard hoverable={hoverable} onClick={onClick} {...props}>
      <TopRow>
        <IconWrap
          $accentColor={accentColor}
          $accentBg={accentBg || `${accentColor}18`}
          $accentBorder={accentBorder || `${accentColor}35`}
          $accentGlow={accentGlow || `${accentColor}25`}
        >
          {icon}
        </IconWrap>
        {badgeText && (
          <Badge $bg={badgeStyle.bg} $color={badgeStyle.color} $border={badgeStyle.border}>
            {badgeText}
          </Badge>
        )}
      </TopRow>
      <Value>{value}</Value>
      <Label>{label}</Label>
      {typeof progress === 'number' && (
        <ProgressTrack>
          <ProgressBar
            $color={accentColor}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </ProgressTrack>
      )}
    </PortalCard>
  );
};

export default MetricCard;
