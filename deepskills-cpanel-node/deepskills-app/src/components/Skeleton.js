import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
`;

const SkeletonPulse = styled.div`
  display: inline-block;
  height: ${props => props.height || '1rem'};
  width: ${props => props.width || '100%'};
  border-radius: ${props => props.radius || '4px'};
  background: #1a1a1a;
  background-image: linear-gradient(
    to right, 
    #1a1a1a 0%, 
    #2a2a2a 20%, 
    #1a1a1a 40%, 
    #1a1a1a 100%
  );
  background-repeat: no-repeat;
  background-size: 800px 100%;
  animation: ${shimmer} 1.5s linear infinite;
`;

export const Skeleton = ({ width, height, radius, style }) => (
  <SkeletonPulse width={width} height={height} radius={radius} style={style} />
);

export const SkeletonTable = ({ rows = 5, cols = 5 }) => (
  <div style={{ width: '100%', padding: '20px' }}>
    {Array(rows).fill(0).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        {Array(cols).fill(0).map((_, j) => (
          <Skeleton key={j} height="20px" width={`${100/cols}%`} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div style={{ background: '#111318', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
    <Skeleton width="40px" height="40px" radius="10px" style={{ marginBottom: '15px' }} />
    <Skeleton width="120px" height="24px" style={{ marginBottom: '10px' }} />
    <Skeleton width="60px" height="16px" />
  </div>
);
