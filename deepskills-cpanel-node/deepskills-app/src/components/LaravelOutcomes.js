import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue } from 'framer-motion';

import webAppsImg from '../assets/lara-web-apps.svg';
import uiImg from '../assets/lara-ui.svg';
import backendImg from '../assets/lara-backend.svg';
import authImg from '../assets/lara-auth.svg';
import databaseImg from '../assets/lara-database.svg';
import deploymentImg from '../assets/lara-deployment.svg';
import rolesImg from '../assets/lara-roles.svg';
import freelanceImg from '../assets/lara-freelance.svg';

const Section = styled.section`
  width: 100%;
  padding: 40px 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(0, 229, 255, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 229, 255, 0.06) 1px, transparent 1px);
    background-size: 55px 55px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    z-index: 1;
  }
`;

const Spotlight = styled(motion.div)`
  position: absolute;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(137, 243, 255, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 2;
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '300px'};
  height: ${props => props.size || '300px'};
  border-radius: 50%;
  background: ${props => props.color || 'rgba(137, 243, 255, 0.04)'};
  z-index: 1;
  pointer-events: none;
  filter: blur(70px);
`;

const Content = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
`;

const Title = styled(motion.h2)`
  font-size: 2.6rem;
  font-weight: 800;
  color: #89F3FF;
  margin-bottom: 50px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const OutcomesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 25px;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
`;

const OutcomeCard = styled(motion.div)`
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 300px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  height: 100%;
  position: relative;
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  perspective: 1000px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: #1a1a1a;

  &::before {
    content: '';
    position: absolute;
    top: -100%;
    left: -100%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 45%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.05) 55%,
      transparent 100%
    );
    transition: 0s;
    transform: rotate(45deg);
    pointer-events: none;
    z-index: 5;
  }

  &:hover {
    transform: translateY(-15px) rotateX(8deg) rotateY(-5deg);
    box-shadow: 0 25px 50px rgba(0, 229, 255, 0.25);
    border-color: rgba(0, 229, 255, 0.3);

    &::before {
      transition: all 0.6s ease;
      top: 100%;
      left: 100%;
    }
  }

  @media (max-width: 1200px) {
    min-height: 280px;
  }

  @media (max-width: 768px) {
    min-height: 240px;
  }
`;

const FloatingIcon = styled(motion.div)`
  position: absolute;
  color: rgba(0, 229, 255, 0.08);
  font-size: ${props => props.size || '4rem'};
  z-index: 1;
  pointer-events: none;
`;

const CardTop = styled.div`
  background-color: #605757;
  background-image: ${props => props.$bgImage ? `url(${props.$bgImage})` : 'none'};
  background-size: cover;
  background-position: center;
  height: 180px;
  width: 100%;

  @media (max-width: 1200px) {
    height: 140px;
  }

  @media (max-width: 768px) {
    height: 110px;
  }
`;

const CardBottom = styled.div`
  background: #E5E0E0;
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  text-align: left;
  position: relative;

  @media (max-width: 768px) {
    padding: 15px;
  }
`;

const CardText = styled.p`
  color: #1a1a1a;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 0;
  margin-bottom: 15px;

  @media (max-width: 1200px) {
    font-size: 0.85rem;
  }

  @media (max-width: 768px) {
    font-size: 0.75rem;
    line-height: 1.3;
  }
`;

const CardLine = styled.div`
  width: 90%;
  height: 1.5px;
  background: #333;
  margin-top: auto;
`;

const LaravelOutcomes = () => {
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

  const outcomes = [
    { text: "Develop fully functional dynamic web applications independently", image: webAppsImg },
    { text: "Build responsive, professional-grade user interfaces", image: uiImg },
    { text: "Design secure backend systems using PHP & Laravel", image: backendImg },
    { text: "Implement authentication and role-based access systems", image: authImg },
    { text: "Perform CRUD operations and manage real-world databases", image: databaseImg },
    { text: "Deploy live projects using hosting platforms and GitHub and create portfolio to apply for jobs", image: deploymentImg },
    { text: "Qualify for roles such as Trainee Developer, Junior PHP Developer, Laravel Developer, or Backend Developer", image: rolesImg },
    { text: "Start freelancing and handle client-based web development projects", image: freelanceImg }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <Section onMouseMove={handleMouseMove}>
      <Spotlight style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }} />
      
      <FloatingShape 
        size="500px" 
        color="rgba(0, 229, 255, 0.04)" 
        style={{ top: '10%', left: '-5%' }} 
        animate={{ x: [0, 40, 0], y: [0, 60, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <FloatingIcon size="8rem" style={{ top: '10%', left: '5%' }} animate={{ y: [0, 40, 0], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 10, repeat: Infinity }}>✔</FloatingIcon>
      <FloatingIcon size="6rem" style={{ bottom: '20%', right: '10%' }} animate={{ rotate: [0, 360] }} transition={{ duration: 25, repeat: Infinity }}>★</FloatingIcon>

      <Content>
        <Title
          initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          Learning Outcomes
        </Title>
        <OutcomesGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {outcomes.map((outcome, index) => (
            <OutcomeCard 
              key={index}
              variants={itemVariants}
            >
              <CardTop $bgImage={outcome.image} />
              <CardBottom>
                <CardText>{outcome.text}</CardText>
                <CardLine />
              </CardBottom>
            </OutcomeCard>
          ))}
        </OutcomesGrid>
      </Content>
    </Section>
  );
};

export default LaravelOutcomes;
