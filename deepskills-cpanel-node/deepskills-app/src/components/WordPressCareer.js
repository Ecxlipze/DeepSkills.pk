import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import wpBg from '../assets/wp-bg.png';
import wpTree from '../assets/wp-tree.svg';

const Section = styled.section`
  width: 100%;
  padding: 40px 0;
  background: url(${wpBg}) center/cover no-repeat;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  background-color: #000;
`;

const Spotlight = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(140, 199, 255, 0.15) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: ${props => props.color || 'rgba(255, 255, 255, 0.03)'};
  filter: blur(40px);
  z-index: 0;
  pointer-events: none;
`;

const Content = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  position: relative;
  z-index: 2;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Title = styled(motion.h2)`
  font-size: 2rem;
  font-weight: 800;
  color: #275D8F;
  margin-bottom: 15px;
  // text-shadow: 0 0 20px rgba(140, 199, 255, 0.3);
   @media (max-width: 1024px) {
    font-size: 1.8rem;
    margin-bottom: 10px;
  }
`;

const Tagline = styled(motion.p)`
  font-size: 1.1rem;
  color: #ffffff;
  margin-bottom: 40px;
  max-width: 800px;
  font-weight: 500;
  opacity: 0.9;
   @media (max-width: 1024px) {
    font-size: 0.9rem;
  }
`;

const TreeContainer = styled(motion.div)`
  width: 100%;
  max-width: 900px;
  position: relative;
  margin: 20px 0;
  display: flex;
  justify-content: center;
  cursor: pointer;
`;

const TreeImg = styled(motion.img)`
  width: 100%;
  height: auto;
  display: block;
`;

const FooterText = styled(motion.p)`
  font-size: 1rem;
  color: #ffffff;
  max-width: 800px;
  line-height: 1.6;
  margin-top: 20px;
  font-weight: 500;
  opacity: 0.8;
   @media (max-width: 1024px) {
    font-size: 0.7rem;
    margin-top: 10px;
  }
`;

const WordPressCareer = () => {
  const handleMouseMove = (e) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    currentTarget.style.setProperty('--mouse-x', `${x}px`);
    currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <Section onMouseMove={handleMouseMove}>
      <Spotlight />
      <FloatingShape 
        size="450px" 
        color="rgba(140, 199, 255, 0.03)" 
        style={{ top: '-10%', left: '-5%' }} 
        animate={{ 
          x: [0, 40, 0], 
          y: [0, 60, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <FloatingShape 
        size="350px" 
        color="rgba(255, 255, 255, 0.02)" 
        style={{ bottom: '10%', right: '-5%' }} 
        animate={{ 
          x: [0, -30, 0], 
          y: [0, -50, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <Content>
        <Title
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Career & Freelancing Focus
        </Title>
        <Tagline
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          In the final phase, we help you prepare for real opportunities.
        </Tagline>

        <TreeContainer
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <TreeImg 
            src={wpTree} 
            alt="Career Path"
          />
        </TreeContainer>

        <FooterText
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          This course is ideal for students aiming for freelancing, agency work, internships, or entry-level web roles.
        </FooterText>
      </Content>
    </Section>
  );
};

export default WordPressCareer;
