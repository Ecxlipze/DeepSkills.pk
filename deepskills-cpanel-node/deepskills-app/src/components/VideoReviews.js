import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { FaPlay } from 'react-icons/fa';

const VideoSection = styled.section`
  width: 100%;
  padding: 40px 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 40px 0;
  }
`;

const Heading = styled(motion.h2)`
  font-size: 3rem;
  font-weight: 800;
  color: #fff;
  text-align: center;
  margin-bottom: 60px;
  line-height: 1.2;

  span {
    color: ${props => props.accentColor || '#97C049'};
    display: block;
    font-size: 3.5rem;
    text-shadow: 0 0 20px rgba(${props => props.accentRGB || '151, 192, 73'}, 0.3);
  }

  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 40px;
    span { font-size: 2rem; }
  }
`;

const scroll = keyframes`
  0% { transform: translateX(0); }
  /* Match card width (300px desktop, 200px mobile) + gap (30px desktop, 20px mobile) */
  100% { transform: translateX(calc(-300px * 8 - 30px * 8)); }
`;

const mobileScroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-200px * 8 - 20px * 8)); }
`;

const SliderBackground = styled.div`
  width: 100%;
  background: ${props => props.accentColor || '#97C049'};
  padding: 80px 0;
  position: relative;
  overflow: hidden;
  display: flex;

  @media (max-width: 768px) {
    padding: 50px 0;
  }
`;

const MarqueeContainer = styled.div`
  display: flex;
  gap: 30px;
  width: max-content;
  animation: ${scroll} 30s linear infinite;

  &:hover {
    animation-play-state: paused;
  }

  @media (max-width: 768px) {
    gap: 20px;
    animation: ${mobileScroll} 20s linear infinite;
  }
`;

const VideoCard = styled(motion.div)`
  width: 300px;
  height: 480px;
  background: #fff;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 25px 50px rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;

  @media (max-width: 768px) {
    width: 200px;
    height: 320px;
    border-radius: 20px;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.15));
    z-index: 1;
  }

  /* Shine effect */
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: rotate(45deg);
    transition: 0.5s;
    pointer-events: none;
  }

  &:hover::after {
    left: 100%;
    top: 100%;
  }
`;

const PlayIconWrapper = styled(motion.div)`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 2rem;
  z-index: 2;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);

  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
  }
`;

const VideoReviews = ({ accentColor, accentRGB }) => {
  const reviews = [1, 2, 3, 4, 5, 6, 7, 8];
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <VideoSection>
      <Heading
        accentColor={accentColor}
        accentRGB={accentRGB}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Video Reviews from
        <span>Our Students !</span>
      </Heading>
      
      <SliderBackground accentColor={accentColor}>
        <MarqueeContainer>
          {duplicatedReviews.map((_, index) => (
            <VideoCard 
              key={index}
              whileHover={{ 
                scale: 1.05,
                y: -10,
                transition: { duration: 0.3 }
              }}
            >
              <PlayIconWrapper
                whileHover={{ 
                  scale: 1.2, 
                  backgroundColor: accentColor || "#97C049",
                  rotate: 360,
                  transition: { duration: 0.5 }
                }}
              >
                <FaPlay style={{ marginLeft: '6px' }} />
              </PlayIconWrapper>
            </VideoCard>
          ))}
        </MarqueeContainer>
      </SliderBackground>
    </VideoSection>
  );
};

export default VideoReviews;
