import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue } from 'framer-motion';
import { FaUser, FaClock, FaProjectDiagram, FaDesktop, FaBriefcase, FaCodeBranch, FaLaptopCode, FaStar } from 'react-icons/fa';

const SectionContainer = styled.section`
  width: 100%;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: #000;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px);
    background-size: 45px 45px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    z-index: 1;
  }
`;

const Spotlight = styled(motion.div)`
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(137, 243, 255, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.6rem;
  font-weight: 800;
  color: #89F3FF;
  margin-bottom: 40px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.7rem;
  }
`;

const FeaturesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  width: 100%;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
`;

const FeatureBox = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
  padding: 30px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(137, 243, 255, 0.05);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    background: rgba(137, 243, 255, 0.05);
    border-color: rgba(137, 243, 255, 0.4);
    transform: translateY(-10px) rotateX(5deg) rotateY(-5deg);
    box-shadow: 0 20px 40px rgba(0, 229, 255, 0.15);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(137, 243, 255, 0.1), transparent);
    transition: 0.5s;
  }

  &:hover::after {
    left: 100%;
  }
`;

const IconWrapper = styled(motion.div)`
  width: 60px;
  height: 60px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #89F3FF;
  font-size: 1.8rem;
  position: relative;
  border: 1px solid rgba(137, 243, 255, 0.2);
  transition: all 0.3s ease;

  &::after {
    content: '${props => props.index}';
    position: absolute;
    top: -5px;
    right: -5px;
    background: #89F3FF;
    color: #000;
    font-size: 0.55rem;
    font-weight: 900;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 2px solid #000;
  }
`;

const FeatureText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  h4 {
    color: #fff;
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  p {
    color: #aaa;
    font-size: 0.75rem;
    margin: 0;
    line-height: 1.4;
  }
`;

const FloatingCode = styled(motion.div)`
  position: absolute;
  color: rgba(0, 229, 255, 0.07);
  font-family: 'Courier New', Courier, monospace;
  font-weight: 900;
  font-size: ${props => props.size || '2rem'};
  user-select: none;
  pointer-events: none;
  z-index: 1;
`;

const LaravelFeatures = () => {
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
    { icon: <FaClock />, title: "23 Weeks", sub: "Intensive Training (5 Days/Week)" },
    { icon: <FaProjectDiagram />, title: "Project-Based", sub: "Learning Approach" },
    { icon: <FaDesktop />, title: "Admin Panel", sub: "& Real Business Projects" },
    { icon: <FaBriefcase />, title: "Portfolio Development", sub: "Professional Showcase Support" },
    { icon: <FaStar />, title: "Job Freelancing", sub: "Job & Client Hunting & Proposal Writing." },
    { icon: <FaCodeBranch />, title: "Git & Live", sub: "Git & Live Deployment Training" },
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
      
      <FloatingCode size="4rem" style={{ top: '10%', left: '5%' }} animate={{ y: [0, 40, 0], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 6, repeat: Infinity }}>&lt;?php</FloatingCode>
      <FloatingCode size="3rem" style={{ bottom: '20%', right: '10%' }} animate={{ y: [0, -30, 0], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 8, repeat: Infinity }}>?&gt;</FloatingCode>
      <FloatingCode size="5rem" style={{ top: '40%', right: '5%' }} animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }} transition={{ duration: 20, repeat: Infinity }}>&#123; &#125;</FloatingCode>
      <FloatingCode size="3.5rem" style={{ bottom: '10%', left: '10%' }} animate={{ x: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity }}>[ ]</FloatingCode>

      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, letterSpacing: "-5px", filter: "blur(10px)" }}
          whileInView={{ opacity: 1, letterSpacing: "0px", filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
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
            >
              <IconWrapper
                index={String(index + 1).padStart(2, '0')}
                whileHover={{ 
                  scale: 1.2, 
                  backgroundColor: "rgba(137, 243, 255, 0.25)",
                  rotate: 5,
                  boxShadow: "0 0 40px rgba(137, 243, 255, 0.4)"
                }}
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

export default LaravelFeatures;
