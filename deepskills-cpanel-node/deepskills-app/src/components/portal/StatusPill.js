import React from 'react';
import styled from 'styled-components';
import { portalTheme } from './PortalTheme';

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: ${portalTheme.radii.pill};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.02em;
  background: ${props => props.$bg};
  color: ${props => props.$color};
  border: 1px solid ${props => props.$border};
  white-space: nowrap;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 6px currentColor;
  }
`;

export const StatusPill = ({ status = '', size = 'md', className }) => {
  const norm = String(status).toLowerCase().trim();

  const getStyle = () => {
    // Success
    if (['active', 'approved', 'enrolled', 'present', 'paid', 'completed', 'graduated', 'verified', 'passed', 'live'].includes(norm)) {
      return {
        bg: portalTheme.colors.successLight,
        color: portalTheme.colors.successText,
        border: 'rgba(16, 185, 129, 0.25)'
      };
    }
    // Warning
    if (['pending', 'due', 'review', 'in-progress', 'in progress', 'late', 'warning', 'evaluating'].includes(norm)) {
      return {
        bg: portalTheme.colors.warningLight,
        color: portalTheme.colors.warningText,
        border: 'rgba(245, 158, 11, 0.25)'
      };
    }
    // Danger
    if (['absent', 'overdue', 'rejected', 'failed', 'cancelled', 'inactive', 'unpaid', 'open'].includes(norm)) {
      return {
        bg: portalTheme.colors.dangerLight,
        color: portalTheme.colors.dangerText,
        border: 'rgba(239, 68, 68, 0.25)'
      };
    }
    // Info
    if (['submitted', 'scheduled', 'info', 'midterm', 'finalterm'].includes(norm)) {
      return {
        bg: portalTheme.colors.infoLight,
        color: portalTheme.colors.infoText,
        border: 'rgba(59, 130, 246, 0.25)'
      };
    }
    // Primary / Brand
    if (['admin', 'teacher', 'student', 'custom'].includes(norm)) {
      return {
        bg: portalTheme.colors.primaryLight,
        color: '#ff8a99',
        border: 'rgba(123, 31, 46, 0.35)'
      };
    }
    // Default fallback
    return {
      bg: 'rgba(255, 255, 255, 0.06)',
      color: portalTheme.colors.textSecondary,
      border: 'rgba(255, 255, 255, 0.1)'
    };
  };

  const style = getStyle();

  return (
    <Pill $bg={style.bg} $color={style.color} $border={style.border} className={className}>
      <span className="dot" />
      {status || 'Unknown'}
    </Pill>
  );
};

export default StatusPill;
