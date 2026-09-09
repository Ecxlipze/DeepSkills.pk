import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import wpCard1 from '../assets/wp-card1.svg';
import wpCard2 from '../assets/wp-card2.svg';
import wpCard3 from '../assets/wp-card3.svg';
import wpCard4 from '../assets/wp-card4.svg';

const OuterContainer = styled.section`
  width: 100%;
  padding-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #000;
  position: relative;
  overflow: hidden;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 50px;
  padding: 0 20px;
  z-index: 2;
`;

const BlueBand = styled.div`
  width: 100%;
  background-color: #275D8F;
  padding: 40px 0;
  display: flex;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

const Spotlight = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.1) 0%, transparent 40%);
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
  max-width: 1400px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
`;

const Title = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 800;
  color: #275D8F; 
  margin: 0;
   @media (max-width: 1024px) {
    font-size: 2rem;
    }
`;

const Tagline = styled(motion.p)`
  font-size: 1.2rem;
  color: #fff;
  margin-top: 15px;
  font-weight: 500;
  @media (max-width: 1024px) {
    font-size: 1rem;
    margin-top: 10px;
    }
`;  

const ProjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
`;

const ShineEffect = styled(motion.div)`
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transform: skewX(-25deg);
  z-index: 2;
`;

const ProjectCard = styled(motion.div)`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  perspective: 1000px;
  cursor: pointer;

  &:hover ${ShineEffect} {
    left: 200%;
    transition: all 0.6s ease;
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  position: relative;
  z-index: 1;
`;

const FooterText = styled(motion.p)`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
  text-align: center;
  margin-top: 50px;
  font-weight: 500;
`;

const ProjectCardItem = ({ project, index }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleCardMouseMove = (e) => {
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

  const handleCardMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <ProjectCard
      onMouseMove={handleCardMouseMove}
      onMouseLeave={handleCardMouseLeave}
      style={{ rotateX, rotateY }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <ShineEffect />
      <CardImage src={project.img} alt={project.title} />
    </ProjectCard>
  );
};

const WordPressProjects = () => {
  const projects = [
    { img: wpCard1, title: 'Single-page and multi-page websites' },
    { img: wpCard2, title: 'Business and portfolio websites' },
    { img: wpCard3, title: 'A complete client-ready website' },
    { img: wpCard4, title: 'A multi-commerce store' }
  ];

  const handleMouseMove = (e) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    currentTarget.style.setProperty('--mouse-x', `${x}px`);
    currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <OuterContainer>
      <FloatingShape 
        size="400px" 
        color="rgba(140, 199, 255, 0.05)" 
        style={{ top: '10%', right: '-10%' }} 
        animate={{ 
          x: [0, -40, 0], 
          y: [0, 60, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <Header>
        <Title
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Learn by Doing
        </Title>
        <Tagline
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Career & Freelancing Focus
        </Tagline>
      </Header>

      <BlueBand onMouseMove={handleMouseMove}>
        <Spotlight />
        <FloatingShape 
          size="300px" 
          color="rgba(255, 255, 255, 0.05)" 
          style={{ bottom: '-10%', left: '-5%' }} 
          animate={{ 
            x: [0, 50, 0], 
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <Content>
          <ProjectsGrid>
            {projects.map((project, index) => (
              <ProjectCardItem key={index} project={project} index={index} />
            ))}
          </ProjectsGrid>

          <FooterText
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            Your final project becomes part of your professional portfolio.
          </FooterText>
        </Content>
      </BlueBand>
    </OuterContainer>
  );
};

export default WordPressProjects;
