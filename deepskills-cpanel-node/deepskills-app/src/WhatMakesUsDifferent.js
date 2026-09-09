import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";

const Section = styled.section`
  background: radial-gradient(circle at bottom left, #120405 0%, #000 70%);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: -10%;
    left: -5%;
    width: 35%;
    height: 35%;
    background: radial-gradient(circle, rgba(123, 31, 46, 0.1) 0%, transparent 70%);
    filter: blur(60px);
    pointer-events: none;
  }
`;

const ContentWrapper = styled.div`
  text-align: center;
  max-width: 1000px;
  margin-bottom: 50px;
  position: relative;
  z-index: 2;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    font-size: 1.7rem;
  }
`;

const Tagline = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.4rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const BarsContainer = styled.div`
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
  z-index: 2;
`;

const Bar = styled(motion.div)`
  background: ${props => props.$type === 'maroon' 
    ? 'linear-gradient(90deg, #7B1F2E 0%, #a22a3d 100%)' 
    : 'linear-gradient(90deg, #1a1a1a 0%, #333 100%)'};
  padding: 30px 45px;
  display: flex;
  align-items: center;
  gap: 30px;
  width: 100%;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transform: translateX(-100%);
    transition: transform 0.8s ease;
  }

  &:hover::after {
    transform: translateX(100%);
  }

  @media (max-width: 768px) {
    padding: 22px;
    gap: 15px;
  }
`;

const Icon = styled.div`
  color: ${props => props.$type === 'maroon' ? 'rgba(255, 255, 255, 0.9)' : '#7B1F2E'};
  font-size: 2.1rem;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 10px ${props => props.$type === 'maroon' ? 'rgba(255,255,255,0.3)' : 'rgba(123, 31, 46, 0.3)'});
`;

const BarText = styled.h3`
  font-family: 'Inter', sans-serif;
  font-size: 2.22rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const CTAWrapper = styled(motion.div)`
  background: #881C33;
  padding: 15px;
  max-width: 800px;
  width: 75%;
  text-align: center;
  position: relative;
  z-index: 2;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(0 0, 95% 0, 100% 25%, 100% 100%, 5% 100%, 0 75%);

  /* Running Stripe Effect */
  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    background: conic-gradient(
      transparent, 
      rgba(255, 255, 255, 0.6), 
      transparent 30%
    );
    animation: rotate 4s linear infinite;
    z-index: 0;
  }

  /* Inner content container to mask the gradient and show only border */
  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    background: linear-gradient(135deg, #7B1F2E 0%, #b32d43 100%);
    z-index: 1;
    clip-path: polygon(0 0, 95% 0, 100% 25%, 100% 100%, 5% 100%, 0 75%);
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  p {
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    opacity: 0.9;
    line-height: 1.6;
    position: relative;
    z-index: 2;
  }

  @media (max-width: 768px) {
    padding: 10px;
    p { font-size: 0.6rem; }
  }
`;

const WhatMakesUsDifferent = () => {
  const bars = [
    { text: "No complicated language", type: "maroon" },
    { text: "No unnecessary pressure", type: "gray" },
    { text: "No complicated language", type: "maroon" }
  ];

  return (
    <Section id="different">
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          What Makes Us Different
        </SectionTitle>
        <Tagline
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          We Care About Your Growth
        </Tagline>
      </ContentWrapper>

      <BarsContainer>
        {bars.map((bar, index) => (
          <Bar
            key={index}
            $type={bar.type}
            initial={{ opacity: 0, x: index % 2 === 0 ? -60 : 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.6, type: "spring", damping: 15 }}
            whileHover={{ scale: 1.025, transition: { type: "spring", stiffness: 400 } }}
          >
            <Icon $type={bar.type}><FaCheckCircle /></Icon>
            <BarText>{bar.text}</BarText>
          </Bar>
        ))}
      </BarsContainer>

      <CTAWrapper
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.8, type: "spring" }}
        whileHover={{ scale: 1.02 }}
      >
        <p>We focus on understanding, practice, and progress, so you feel confident at every step.</p>
      </CTAWrapper>
    </Section>
  );
};

export default WhatMakesUsDifferent;
