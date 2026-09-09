import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import GlowCard from './GlowCard';
import SmartCoverImage from '../../components/next/SmartCoverImage';

const CardContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  perspective: 1000px;
`;

const ImageWrapper = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 12px;
  position: relative;
  background-color: #7B1F2E;
  border: 10px solid #7B1F2E;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
    border-radius: 10px;
  }

  ${CardContainer}:hover & img {
    transform: scale(1.05);
  }
`;

const TitleBox = styled(motion.div)`
  background: #7B1F2E;
  padding: 15px 20px;
  border-radius: 8px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  
  h3 {
    color: #fff;
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    position: relative;
    z-index: 2;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: 0.5s;
    z-index: 1;
  }

  ${CardContainer}:hover &::before {
    left: 100%;
    transition: 0.5s;
  }
`;

const MediaCard = ({ image, title, ...props }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <CardContainer 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
      }}
      whileHover={{ y: -10 }}
      {...props}
    >
      <GlowCard borderRadius="12px">
        <ImageWrapper>
          <SmartCoverImage src={image} alt={title} sizes="(max-width: 768px) 100vw, 400px" />
        </ImageWrapper>
      </GlowCard>
      <TitleBox>
        <h3>{title}</h3>
      </TitleBox>
    </CardContainer>
  );
};

export default MediaCard;
