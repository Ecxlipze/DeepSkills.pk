import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Import asset
import visionBg from "./assets/vision-bg.png";

const Section = styled.section`
  background-image: url(${visionBg});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 40px 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 1;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 900px;
  width: 100%;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  color: #fff;
  margin-bottom: 5px;
  letter-spacing: -0.5px;
`;

const Tagline = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  font-weight: 400;
  color: #fff;
  margin-bottom: 40px;
  opacity: 0.95;
  letter-spacing: 0.5px;
`;

const VisionBox = styled(motion.div)`
  background: linear-gradient(145deg, rgba(123, 31, 46, 0.5) 0%, rgba(20, 20, 20, 0.7) 100%);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 45px 50px;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  text-align: left; 
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    opacity: 0.5;
  }

  @media (max-width: 768px) {
    padding: 30px;
  }
`;

const VisionText = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: clamp(1.05rem, 1.6vw, 1.25rem);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 20px;
  font-weight: 400;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Glow = styled(motion.div)`
  position: absolute;
  top: -20%;
  left: -20%;
  width: 50%;
  height: 50%;
  background: radial-gradient(circle, rgba(123, 31, 46, 0.1) 0%, transparent 70%);
  z-index: -1;
  pointer-events: none;
`;

const OurVision = () => {
  return (
    <Section id="vision">
      <Glow 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Our Vision
        </SectionTitle>
        <Tagline
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Confident Learners. Strong Futures.
        </Tagline>

        <VisionBox
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <VisionText>
            Our vision is to help young people build skills that open doors, whether that's for jobs, freelancing, or further education.
          </VisionText>
          <VisionText>
            We want Deepskills to be a place where learners feel supported, motivated, and ready for what's next.
          </VisionText>
        </VisionBox>
      </ContentWrapper>
    </Section>
  );
};

export default OurVision;
