import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const CardWrapper = styled(motion.div)`
  position: relative;
  border-radius: ${props => props.$borderRadius || '20px'};
  overflow: hidden;
  background-color: ${props => props.$bg || 'rgba(0, 0, 0, 0.3)'};
  cursor: pointer;
  z-index: 1;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  // Gradient border glow (all sides)
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1.5px; // Border thickness
    background: linear-gradient(
      135deg, 
      rgba(123, 31, 46, 0.1), 
      rgba(123, 31, 46, 0.4), 
      rgba(123, 31, 46, 0.1)
    );
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.3;
    transition: opacity 0.5s ease, background 0.5s ease;
    z-index: 0;
    pointer-events: none;
  }

  &:hover::before {
    opacity: ${props => props.$noHoverBorder ? '0.3' : '1'};
    background: ${props => props.$noHoverBorder ? 'inherit' : 'linear-gradient(135deg, rgba(123, 31, 46, 0.4), rgba(255, 255, 255, 0.4), rgba(123, 31, 46, 0.4))'};
  }

  // Soft outer glow on hover
  &:hover {
    box-shadow: 0 0 30px rgba(123, 31, 46, 0.1);
  }

  // Inner background to preserve color over the glow
  &::after {
    content: '';
    position: absolute;
    inset: 1px;
    background-color: ${props => props.$bg || 'rgba(0, 0, 0, 1)'};
    z-index: -1; // Keep behind content
    border-radius: inherit;
    transition: background-color 0.3s ease;
  }

  &:hover::after {
    background-color: ${props => props.$hoverBg || 'rgba(123, 31, 46, 0.1)'};
  }

  .glow-content {
    position: relative;
    z-index: 2;
    height: 100%;
    width: 100%;
  }
`;

const GlowCard = ({ children, borderRadius, bg, hoverBg, noHoverBorder, ...props }) => {
  return (
    <CardWrapper 
      $borderRadius={borderRadius} 
      $bg={bg} 
      $hoverBg={hoverBg}
      $noHoverBorder={noHoverBorder}
      {...props}
    >
      <div className="glow-content">
        {children}
      </div>
    </CardWrapper>
  );
};

export default GlowCard;
