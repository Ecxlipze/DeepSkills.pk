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
  font-size: ${props => props.$size === 'small' ? '0.88rem' : props.$size === 'medium' ? '1rem' : '1.2rem'};
  padding: ${props => props.$size === 'small' ? '9px 20px' : props.$size === 'medium' ? '12px 28px' : '15px 40px'};
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  clip-path: polygon(0 0, 90% 0, 100% 30%, 100% 100%, 10% 100%, 0 70%);
  position: relative;
  outline: none;
  text-decoration: none;
  display: ${props => props.$fullWidth ? 'flex' : 'inline-flex'};
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  backdrop-filter: ${props => props.$variant === 'secondary' ? 'blur(10px)' : 'none'};
  opacity: ${props => props.disabled ? 0.6 : 1};

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

  &:hover:not(:disabled)::before {
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

  &:hover:not(:disabled)::after {
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
    font-size: ${props => props.$size === 'small' ? '0.82rem' : props.$size === 'medium' ? '0.92rem' : '1rem'};
    padding: ${props => props.$size === 'small' ? '8px 16px' : props.$size === 'medium' ? '10px 22px' : '12px 30px'};
  }
`;

const RegisterButton = ({
  children = "INQUIRE NOW",
  to,
  onClick,
  type = "button",
  variant = "primary",
  size = "large",
  fullWidth = false,
  disabled = false,
  ...props
}) => {
  const navigate = useNavigate();

  // If `to` is not explicitly provided:
  // Only default to '/inquiry' if neither `onClick` nor `type === 'submit'` is provided!
  const targetTo = to !== undefined ? to : (onClick || type === 'submit' ? null : '/inquiry');

  const handleAction = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
    if (targetTo) {
      trackEvent('select_content', {
        content_type: 'cta',
        item_id: targetTo,
        link_text: typeof children === 'string' ? children : 'CTA Button'
      });
      navigate(targetTo);
    }
  };

  const buttonProps = {
    whileHover: disabled ? {} : { scale: size === 'small' ? 1.03 : 1.05, y: size === 'small' ? -2 : -4 },
    whileTap: disabled ? {} : { scale: 0.96 },
    animate: disabled ? {} : { 
      boxShadow: variant === 'secondary' ? [
        "0 0 10px rgba(255, 255, 255, 0.1)", 
        "0 0 15px rgba(255, 255, 255, 0.2)", 
        "0 0 10px rgba(255, 255, 255, 0.1)"
      ] : [
        "0 0 12px rgba(123, 31, 46, 0.4)", 
        "0 0 22px rgba(123, 31, 46, 0.6)", 
        "0 0 12px rgba(123, 31, 46, 0.4)"
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
      $size={size}
      $fullWidth={fullWidth}
      type={type}
      disabled={disabled}
      onClick={handleAction}
      {...buttonProps}
    >
      <span>{children}</span>
    </StyledButton>
  );
};

export default RegisterButton;
