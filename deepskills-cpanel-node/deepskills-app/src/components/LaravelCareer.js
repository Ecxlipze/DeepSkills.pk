import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';
import laraCareer from '../assets/lara-career.svg';

const Section = styled.section`
  width: 100%;
  padding: 40px 0;
//   background: #000;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 229, 255, 0.08) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 40%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 40%);
    transition: mask-image 0.2s ease, -webkit-mask-image 0.2s ease;
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, #000 95%);
    z-index: 2;
  }
`;

const GridBase = styled.div`
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  z-index: 0;
`;

const Spotlight = styled(motion.div)`
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0, 229, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 2;
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '300px'};
  height: ${props => props.size || '300px'};
  border-radius: 50%;
  background: ${props => props.color || 'rgba(0, 229, 255, 0.03)'};
  z-index: 1;
  pointer-events: none;
  filter: blur(60px);
`;

const SideGlow = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.5));
  z-index: 2;
  pointer-events: none;
`;

const Content = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 3;

  @media (max-width: 768px) {
    padding: 0 15px;
  }
`;

const Title = styled(motion.h2)`
  font-size: 2.7rem;
  font-weight: 800;
  color: #00E5FF;
  margin-bottom: 50px;
  text-align: center;

  @media (max-width: 1200px) {
    font-size: 2rem;
  }

  @media (max-width: 768px) {
    font-size: 1.7rem;
    margin-bottom: 20px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 80px;
  align-items: center;
  width: 100%;

  @media (max-width: 1200px) {
    gap: 40px;
  }

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: flex-start;
  }
`;

const ImageWrapper = styled(motion.div)`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  
  img {
    max-width: 100%;
    height: auto;
    filter: drop-shadow(0 0 30px rgba(0, 229, 255, 0.2));
  }
`;

const List = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 30px;
  width: 100%;

  @media (max-width: 1200px) {
    gap: 20px;
  }

  @media (max-width: 768px) {
    gap: 15px;
  }
`;

const ListItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  width: 100%;
  padding: 15px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(0, 229, 255, 0.05);
  transition: all 0.3s ease;
  perspective: 1000px;
  backface-visibility: hidden;

  svg {
    color: #00E5FF;
    font-size: 1.6rem;
    flex-shrink: 0;
    margin-top: 2px;
    filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.4));
  }

  &:hover {
    background: rgba(0, 229, 255, 0.05);
    border-color: rgba(0, 229, 255, 0.3);
    transform: translateX(10px) rotateY(-5deg);
    box-shadow: -5px 5px 20px rgba(0, 229, 255, 0.1);
  }

  @media (max-width: 1200px) {
    font-size: 1rem;
    gap: 15px;
    svg { font-size: 1.4rem; }
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
    gap: 10px;
    svg { font-size: 1.1rem; }
  }

  @media (max-width: 480px) {
    font-size: 0.7rem;
    gap: 8px;
    svg { font-size: 1rem; }
  }
`;

const LaravelCareer = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    mouseX.set(x);
    mouseY.set(y);
    currentTarget.style.setProperty('--mouse-x', `${(x / currentTarget.offsetWidth) * 100}%`);
    currentTarget.style.setProperty('--mouse-y', `${(y / currentTarget.offsetHeight) * 100}%`);
  };

  const steps = [
    "Trainee Web Developer",
    "Junior PHP / Laravel Developer",
    "Mid-Level Developer",
    "Senior Developer",
    "Tech Lead / Software Architect"
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <Section onMouseMove={handleMouseMove}>
      <GridBase />
      <Spotlight style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }} />
      <SideGlow />
      
      <FloatingShape 
        size="400px" 
        color="rgba(0, 229, 255, 0.06)" 
        style={{ top: '10%', left: '-5%' }} 
        animate={{ x: [0, 30, 0], y: [0, 50, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <FloatingShape 
        size="300px" 
        color="rgba(137, 243, 255, 0.04)" 
        style={{ bottom: '10%', right: '-5%' }} 
        animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Career Growth Path
        </Title>
        <Grid>
          <ImageWrapper
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img src={laraCareer} alt="Career Progress" />
          </ImageWrapper>
          <List
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {steps.map((text, index) => (
              <ListItem
                key={index}
                variants={itemVariants}
                whileHover={{ x: 10, color: '#00E5FF' }}
              >
                <FaCheckCircle />
                {text}
              </ListItem>
            ))}
          </List>
        </Grid>
      </Content>
    </Section>
  );
};

export default LaravelCareer;
