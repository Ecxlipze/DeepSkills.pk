import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import wpProject from '../assets/wp-project.svg';

const Section = styled.section`
  width: 100%;
  padding: 50px 0;
  background-color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
`;

const Content = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 2;
`;

const Title = styled(motion.h2)`
  font-size: 2.4rem;
  font-weight: 800;
  color: #275D8F;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Tagline = styled(motion.p)`
  font-size: 1.5rem;
  color: #fff;
  margin-top: 15px;
  margin-bottom: 60px;
  font-weight: 500;
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 40px;
  }
`;

const ImageWrapper = styled(motion.div)`
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  
  img {
    width: 100%;
    height: auto;
    display: block;
    /* Removed max-width for full-width effect */
    filter: drop-shadow(0 20px 50px rgba(140, 199, 255, 0.15));
  }
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '300px'};
  height: ${props => props.size || '300px'};
  border-radius: 50%;
  background: ${props => props.color || 'rgba(140, 199, 255, 0.03)'};
  z-index: 1;
  pointer-events: none;
  filter: blur(60px);
`;

const WordPressOutcomes = () => {
  return (
    <Section>
      <FloatingShape 
        size="500px" 
        color="rgba(140, 199, 255, 0.05)" 
        style={{ top: '20%', left: '-10%' }} 
        animate={{ 
          x: [0, 50, 0], 
          y: [0, -30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      
      <Content>
        <Title
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Course Completion Outcomes
        </Title>
        <Tagline
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Professional WordPress websites
        </Tagline>
      </Content>

      <ImageWrapper
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <img src={wpProject} alt="Professional WordPress Projects" />
      </ImageWrapper>
    </Section>
  );
};

export default WordPressOutcomes;
