import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import laravelBg from '../assets/laravel-bg.png';
import laravelTree from '../assets/laravel-tree.svg';

const Section = styled.section`
  width: 100%;
  padding: 40px 0;
  background: url(${laravelBg});
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 50%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 50%);
    z-index: 1;
    pointer-events: none;
  }
`;

const FloatingCode = styled(motion.div)`
  position: absolute;
  color: rgba(0, 229, 255, 0.06);
  font-family: 'Courier New', Courier, monospace;
  font-weight: 900;
  font-size: ${props => props.size || '3rem'};
  user-select: none;
  pointer-events: none;
  z-index: 2;
`;

const Spotlight = styled(motion.div)`
  position: absolute;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(137, 243, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 2;
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '300px'};
  height: ${props => props.size || '300px'};
  border-radius: 50%;
  background: ${props => props.color || 'rgba(137, 243, 255, 0.05)'};
  z-index: 1;
  pointer-events: none;
  filter: blur(80px);
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
`;

const Title = styled(motion.h2)`
  font-size: 2.7rem;
  font-weight: 800;
  color: #89F3FF;
  margin-bottom: 50px;
  text-align: center;
  text-transform: capitalize;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const TreeWrapper = styled(motion.div)`
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: center;
  perspective: 2000px;
  
  img {
    width: 100%;
    height: auto;
    filter: drop-shadow(0 20px 50px rgba(0, 229, 255, 0.4));
  }
`;

const LaravelProjects = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Parallax / 3D Tilt for the tree
  const tiltX = useSpring(useTransform(mouseY, [0, 800], [5, -5]), { stiffness: 100, damping: 30 });
  const tiltY = useSpring(useTransform(mouseX, [0, 1200], [-5, 5]), { stiffness: 100, damping: 30 });

  const handleMouseMove = ({ currentTarget, clientX, clientY }) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    mouseX.set(x);
    mouseY.set(y);
    currentTarget.style.setProperty('--mouse-x', `${(x / currentTarget.offsetWidth) * 100}%`);
    currentTarget.style.setProperty('--mouse-y', `${(y / currentTarget.offsetHeight) * 100}%`);
  };

  return (
    <Section onMouseMove={handleMouseMove}>
      <Spotlight style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }} />
      
      <FloatingCode size="5rem" style={{ top: '15%', left: '5%' }} animate={{ y: [0, 40, 0] }} transition={{ duration: 7, repeat: Infinity }}>MySQL</FloatingCode>
      <FloatingCode size="4rem" style={{ bottom: '15%', right: '5%' }} animate={{ rotate: [0, 360] }} transition={{ duration: 30, repeat: Infinity }}>CRUD</FloatingCode>
      <FloatingCode size="6rem" style={{ top: '40%', left: '2%' }} animate={{ opacity: [0.03, 0.1, 0.03] }} transition={{ duration: 5, repeat: Infinity }}>API</FloatingCode>

      <FloatingShape 
        size="500px" 
        color="rgba(0, 229, 255, 0.08)" 
        style={{ top: '-10%', left: '-5%' }} 
        animate={{ x: [0, 40, 0], y: [0, 60, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <FloatingShape 
        size="400px" 
        color="rgba(140, 199, 255, 0.05)" 
        style={{ bottom: '-5%', right: '-5%' }} 
        animate={{ x: [0, -40, 0], y: [0, -60, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <Content>
        <Title
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Projects You Will Build
        </Title>
        <TreeWrapper
          style={{ rotateX: tiltX, rotateY: tiltY }}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <img src={laravelTree} alt="Laravel Career Roadmap" />
        </TreeWrapper>
      </Content>
    </Section>
  );
};

export default LaravelProjects;
