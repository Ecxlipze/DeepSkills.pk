import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import certificateImg from '../assets/certificate.svg';

const Section = styled.section`
  width: 100%;
  padding: 50px 0;
  background: #000;
  display: flex;
  justify-content: center;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (max-width: 768px) {
    padding: 0 20px;
  }
`;

const Heading = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.accentColor || '#97C049'};
  margin-bottom: 20px;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Description = styled(motion.p)`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  max-width: 600px;
  margin-bottom: 60px;
  line-height: 1.6;
  padding: 0 20px;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 40px;
  }
`;

const CertificateWrapper = styled(motion.div)`
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  perspective: 1000px;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(${props => props.accentRGB || '151, 192, 73'}, 0.2) 0%, transparent 70%);
    z-index: 0;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    filter: blur(40px);
    animation: pulse 4s infinite ease-in-out;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; scale: 1; }
    50% { opacity: 1; scale: 1.2; }
  }
  
  img {
    width: 100%;
    max-width: 800px;
    height: auto;
    border-radius: 12px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.6);
    z-index: 1;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transform-style: preserve-3d;
    transition: box-shadow 0.3s ease;
  }

  &:hover img {
    box-shadow: 0 40px 80px rgba(${props => props.accentRGB || '151, 192, 73'}, 0.15);
  }

  /* Shine overlay */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    margin: auto;
    width: 100%;
    max-width: 800px;
    height: 100%;
    background: linear-gradient(
      105deg,
      transparent 40%,
      rgba(255, 255, 255, 0.05) 45%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 55%,
      transparent 60%
    );
    z-index: 2;
    pointer-events: none;
    background-size: 200% 200%;
    background-position: 200% 0;
    transition: background-position 0s;
  }

  &:hover::after {
    background-position: -200% 0;
    transition: background-position 1s ease;
  }
`;

const CertifySection = ({ accentColor, accentRGB }) => {
  return (
    <Section>
      <Container>
        <Heading
          accentColor={accentColor}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Certify your Learning
        </Heading>

        <Description
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Complete the course with assignments, and request your course completion certificate
        </Description>

        <CertificateWrapper
          accentRGB={accentRGB}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ 
            scale: 1.05,
            rotateY: 5,
            rotateX: 2,
          }}
          animate={{
            y: [0, -10, 0],
          }}
          transition={{ 
            duration: 1, 
            ease: "easeOut",
            y: {
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          <img src={certificateImg} alt="Course Completion Certificate" />
        </CertificateWrapper>
      </Container>
    </Section>
  );
};

export default CertifySection;
