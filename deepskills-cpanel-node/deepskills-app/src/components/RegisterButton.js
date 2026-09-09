import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from '../../lib/nextRouterDomCompat';
import { trackEvent } from '../../lib/analytics';

const StyledButton = styled(motion.button)`
  background-color: ${props => props.$variant === 'secondary' ? 'rgba(30, 30, 30, 0.8)' : '#7B1F2E'};
  color: #fff;
  border: none;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  padding: 15px 40px;
  cursor: pointer;
  clip-path: polygon(0 0, 90% 0, 100% 30%, 100% 100%, 10% 100%, 0 70%);
  position: relative;
  outline: none;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  overflow: hidden;
  backdrop-filter: ${props => props.$variant === 'secondary' ? 'blur(10px)' : 'none'};

  // Running glow border effect
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: conic-gradient(
      transparent,
      rgba(255, 255, 255, 0.9),
      rgba(255, 255, 255, 0.9),
      transparent 80%
    );
    animation: rotateGlow 2s linear infinite;
    opacity: 0;
    transition: opacity 0.5s ease;
    z-index: 0;
  }

  &:hover::before {
    opacity: 1;
  }

  @keyframes rotateGlow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  // Inner background to preserve color over the glow
  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    background-color: ${props => props.$variant === 'secondary' ? 'rgba(20, 20, 20, 0.9)' : '#7B1F2E'};
    z-index: 1;
    clip-path: polygon(0 0, 90% 0, 100% 30%, 100% 100%, 10% 100%, 0 70%);
    transition: background-color 0.3s ease;
  }

  &:hover::after {
    background-color: ${props => props.$variant === 'secondary' ? 'rgba(40, 40, 40, 0.9)' : '#922537'};
  }

  span {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 100%;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 12px 30px;
  }
`;

const RegisterButton = ({ children = "INQUIRE NOW", to = "/inquiry", onClick, type = "button", variant = "primary", ...props }) => {
  const navigate = useNavigate();

  const handleAction = (e) => {
    if (onClick) {
      onClick(e);
    }
    if (to) {
      trackEvent('select_content', {
        content_type: 'cta',
        item_id: to,
        link_text: typeof children === 'string' ? children : 'Inquiry CTA'
      });
      navigate(to);
    }
  };

  const buttonProps = {
    whileHover: { scale: 1.05, y: -5 },
    whileTap: { scale: 0.95 },
    animate: { 
      boxShadow: variant === 'secondary' ? [
        "0 0 10px rgba(255, 255, 255, 0.1)", 
        "0 0 15px rgba(255, 255, 255, 0.2)", 
        "0 0 10px rgba(255, 255, 255, 0.1)"
      ] : [
        "0 0 15px rgba(123, 31, 46, 0.4)", 
        "0 0 25px rgba(123, 31, 46, 0.6)", 
        "0 0 15px rgba(123, 31, 46, 0.4)"
      ]
    },
    transition: { 
      duration: 2, 
      repeat: Infinity, 
      ease: "easeInOut" 
    },
    ...props
  };

  return (
    <StyledButton
      $variant={variant}
      type={type}
      onClick={handleAction}
      {...buttonProps}
    >
      <span>{children}</span>
    </StyledButton>
  );
};

export default RegisterButton;
