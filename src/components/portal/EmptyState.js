import React from 'react';
import styled from 'styled-components';
import { portalTheme } from './PortalTheme';
import PortalCard from './PortalCard';

const Wrapper = styled(PortalCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  gap: 16px;
`;

const IconBox = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${portalTheme.colors.primaryLight};
  color: ${portalTheme.colors.primary};
  border: 1px solid rgba(123, 31, 46, 0.3);
  box-shadow: 0 0 24px rgba(123, 31, 46, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  margin-bottom: 8px;
`;

const Title = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${portalTheme.colors.textPrimary};
  margin: 0;
`;

const Description = styled.p`
  font-size: 0.95rem;
  color: ${portalTheme.colors.textMuted};
  max-width: 420px;
  margin: 0;
  line-height: 1.5;
`;

const ActionButton = styled.button`
  margin-top: 8px;
  background: ${portalTheme.colors.primaryGradient};
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 10px 22px;
  border-radius: ${portalTheme.radii.md};
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  box-shadow: 0 4px 15px rgba(123, 31, 46, 0.4);

  &:hover {
    box-shadow: 0 6px 20px rgba(123, 31, 46, 0.6);
    transform: translateY(-2px);
  }
`;

export const EmptyState = ({
  icon,
  title = 'No records found',
  description = 'There are currently no items to display in this view.',
  actionText,
  onAction,
  className
}) => {
  return (
    <Wrapper className={className}>
      {icon && <IconBox>{icon}</IconBox>}
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {actionText && onAction && (
        <ActionButton onClick={onAction}>{actionText}</ActionButton>
      )}
    </Wrapper>
  );
};

export default EmptyState;
