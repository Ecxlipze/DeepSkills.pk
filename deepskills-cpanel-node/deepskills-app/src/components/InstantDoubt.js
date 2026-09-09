import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import instantBanner from '../assets/instant-banner.svg';

const Section = styled.section`
  width: 100%;
  padding: 40px 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  position: relative;
`;

const Heading = styled(motion.h2)`
  font-size: 2.7rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 50px;
  text-align: center;
  line-height: 1.2;
  padding: 0 20px;

  span {
    color: ${props => props.accentColor || '#97C049'};
  }

  @media (max-width: 768px) {
    font-size: 1.7rem;
    margin-bottom: 30px;
  }
`;

const ImageWrapper = styled(motion.div)`
  width: 100%;
  display: flex;
  justify-content: center;
  cursor: pointer;
  perspective: 1000px;
  
  img {
    width: 100%;
    height: auto;
    display: block;
    transform-style: preserve-3d;
    transition: filter 0.3s ease;
  }

  &:hover img {
    filter: brightness(1.1) drop-shadow(0 20px 40px rgba(${props => props.accentRGB || '151, 192, 73'}, 0.2));
  }
`;

const InstantDoubt = ({ accentColor, accentRGB, bannerImage }) => {
  return (
    <Section>
      <Heading
        accentColor={accentColor}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        Instant <span>Doubt Solving</span>
      </Heading>

      <ImageWrapper
        accentRGB={accentRGB}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ 
          scale: 1.02,
          rotateX: 2,
          rotateY: -2,
        }}
        animate={{
          y: [0, -10, 0],
        }}
        transition={{ 
          duration: 1, 
          ease: "easeOut",
          y: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      >
        <img src={bannerImage || instantBanner} alt="Instant Doubt Solving" />
      </ImageWrapper>
    </Section>
  );
};

export default InstantDoubt;
