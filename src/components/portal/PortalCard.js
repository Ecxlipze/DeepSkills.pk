import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { portalTheme } from './PortalTheme';

const StyledCard = styled(motion.div)`
  position: relative;
  background: ${props => props.$bg || portalTheme.colors.bgCard};
  border-radius: ${props => props.$radius || portalTheme.radii.lg};
  border: 1px solid ${props => props.$borderColor || portalTheme.colors.borderSubtle};
  padding: ${props => props.$padding || '24px'};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: ${portalTheme.shadows.card};
  overflow: hidden;
  transition: ${portalTheme.transitions.default};

  ${props => props.$hoverable && `
    cursor: pointer;
    &:hover {
      background: ${portalTheme.colors.bgCardHover};
      border-color: ${portalTheme.colors.borderGlow};
      box-shadow: ${portalTheme.shadows.glow}, ${portalTheme.shadows.card};
      transform: translateY(-2px);
    }
  `}

  ${props => props.$glow && `
    border-color: ${portalTheme.colors.borderGlow};
    box-shadow: ${portalTheme.shadows.glow};
  `}
`;

export const PortalCard = ({
  children,
  padding,
  radius,
  bg,
  borderColor,
  hoverable = false,
  glow = false,
  className,
  ...props
}) => {
  return (
    <StyledCard
      $padding={padding}
      $radius={radius}
      $bg={bg}
      $borderColor={borderColor}
      $hoverable={hoverable}
      $glow={glow}
      className={className}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default PortalCard;
