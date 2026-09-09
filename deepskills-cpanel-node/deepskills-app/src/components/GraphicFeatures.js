import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue } from 'framer-motion';
import { FaUser, FaClock, FaProjectDiagram, FaBriefcase, FaChartLine, FaPalette, FaLaptopCode, FaHandsHelping } from 'react-icons/fa';
import graphicsBg from '../assets/graphics-bg.png';

const SectionContainer = styled.section`
  width: 100%;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: url(${graphicsBg});
  background-size: cover;
  background-position: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(147, 51, 234, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(147, 51, 234, 0.05) 1px, transparent 1px);
    background-size: 45px 45px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    z-index: 2;
  }
`;

const Spotlight = styled(motion.div)`
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(147, 51, 234, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 2;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.8rem;
  font-weight: 800;
  color: #9333EA;
  margin-bottom: 70px;
  text-align: center;
  text-shadow: 0 0 20px rgba(147, 51, 234, 0.3);

  @media (max-width: 768px) {
    font-size: 1.9rem;
    margin-bottom: 50px;
  }
`;

const FeaturesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  width: 100%;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
`;

const FeatureBox = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 15px;
  padding: 35px 20px;
  border-radius: 15px;
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(147, 51, 234, 0.1);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    background: rgba(147, 51, 234, 0.08);
    border-color: rgba(147, 51, 234, 0.5);
    transform: translateY(-10px) rotateX(5deg) rotateY(-5deg);
    box-shadow: 0 20px 40px rgba(147, 51, 234, 0.2);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.1), transparent);
    transition: 0.5s;
  }

  &:hover::after {
    left: 100%;
  }
`;

const IconWrapper = styled(motion.div)`
  width: 55px;
  height: 55px;
  background-color: rgba(147, 51, 234, 0.15);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #c084fc;
  font-size: 1.6rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(147, 51, 234, 0.3);
`;

const FeatureText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  h4 {
    color: #fff;
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
  }

  p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    margin: 0;
    line-height: 1.4;
    font-weight: 500;
  }
`;

const FloatingParticle = styled(motion.div)`
  position: absolute;
  color: rgba(147, 51, 234, 0.1);
  font-size: ${props => props.size || '2rem'};
  pointer-events: none;
  z-index: 1;
`;

const GraphicFeatures = () => {
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

  const features = [
    { icon: <FaUser />, title: "Anyone", sub: "Students (IT / Non-IT)" },
    { icon: <FaClock />, title: "10 Weeks", sub: "Intensive Training" },
    { icon: <FaProjectDiagram />, title: "Project-Based", sub: "Learning Approach" },
    { icon: <FaHandsHelping />, title: "Real Client-Based", sub: "Design Projects" },
    { icon: <FaBriefcase />, title: "Portfolio", sub: "Professional Showcase Support" },
    { icon: <FaChartLine />, title: "Freelancing", sub: "Proposal Writing Guidance" },
    { icon: <FaPalette />, title: "UI/UX Basics", sub: "UI/UX Introduction Included" },
    { icon: <FaLaptopCode />, title: "Onsite / Online", sub: "Onsite & Online Learning Modes" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 12 }
    }
  };

  return (
    <SectionContainer onMouseMove={handleMouseMove}>
      <Spotlight style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }} />
      
      <FloatingParticle size="3rem" style={{ top: '10%', right: '5%' }} animate={{ y: [0, 30, 0] }} transition={{ duration: 6, repeat: Infinity }}>✎</FloatingParticle>
      <FloatingParticle size="4rem" style={{ bottom: '15%', left: '8%' }} animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity }}>⬡</FloatingParticle>
      <FloatingParticle size="2rem" style={{ top: '40%', left: '2%' }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity }}>✦</FloatingParticle>

      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, letterSpacing: "-5px", filter: "blur(10px)" }}
          whileInView={{ opacity: 1, letterSpacing: "0px", filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          Our Course Features
        </SectionTitle>
        <FeaturesGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <FeatureBox 
              key={index}
              variants={itemVariants}
              isHighlighted={feature.isHighlighted}
            >
              <IconWrapper
                whileHover={{ scale: 1.2, backgroundColor: "rgba(147, 51, 234, 0.3)", rotate: 5 }}
              >
                {feature.icon}
              </IconWrapper>
              <FeatureText>
                <h4>{feature.title}</h4>
                <p>{feature.sub}</p>
              </FeatureText>
            </FeatureBox>
          ))}
        </FeaturesGrid>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default GraphicFeatures;
