import React from 'react';
import styled from 'styled-components';
import { portalTheme } from './PortalTheme';

const HeaderWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  color: ${portalTheme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;

  span.active {
    color: ${portalTheme.colors.primary};
  }
`;

const Title = styled.h1`
  font-size: clamp(1.6rem, 2.2vw, 2.2rem);
  font-weight: 800;
  color: ${portalTheme.colors.textPrimary};
  letter-spacing: -0.02em;
  margin: 0;

  span.highlight {
    background: ${portalTheme.colors.primaryGradient};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  color: ${portalTheme.colors.textSecondary};
  margin: 0;
  max-width: 600px;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

export const PortalHeader = ({
  breadcrumb,
  title,
  highlightWord,
  subtitle,
  children,
  className
}) => {
  const renderTitle = () => {
    if (!highlightWord || !title.includes(highlightWord)) {
      return title;
    }
    const parts = title.split(highlightWord);
    return (
      <>
        {parts[0]}
        <span className="highlight">{highlightWord}</span>
        {parts.slice(1).join(highlightWord)}
      </>
    );
  };

  return (
    <HeaderWrapper className={className}>
      <Left>
        {breadcrumb && (
          <Breadcrumb>
            {Array.isArray(breadcrumb) ? (
              breadcrumb.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span>/</span>}
                  <span className={index === breadcrumb.length - 1 ? 'active' : ''}>
                    {item}
                  </span>
                </React.Fragment>
              ))
            ) : (
              <span>{breadcrumb}</span>
            )}
          </Breadcrumb>
        )}
        <Title>{renderTitle()}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </Left>
      {children && <Actions>{children}</Actions>}
    </HeaderWrapper>
  );
};

export default PortalHeader;
