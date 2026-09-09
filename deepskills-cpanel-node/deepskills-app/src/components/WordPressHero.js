import React, { useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from '../../lib/nextRouterDomCompat';
import { useAuth } from '../context/AuthContext';
import wpressBg from '../assets/wpress-bg.png';
import wpCard from '../assets/wp-card.svg';
import CourseEnrollCard from './CourseEnrollCard';
import { getEnrollmentPath } from '../utils/enrollmentNavigation';

const HeroSection = styled.section`
  width: 100%;
  min-height: 80vh;
  background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${wpressBg});
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 40px 40px;
  position: relative;
  overflow: hidden;

  /* Spotlight effect overlay */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at var(--mouse-x, 0)px var(--mouse-y, 0)px,
      rgba(60, 145, 255, 0.12) 0%,
      transparent 50%
    );
    pointer-events: none;
    z-index: 1;
  }

  @media (max-width: 968px) {
    padding: 90px 20px 20px;
    &::before { display: none; }
  }
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '300px'};
  height: ${props => props.size || '300px'};
  border-radius: 50%;
  background: ${props => props.color || 'rgba(60, 145, 255, 0.05)'};
  z-index: 1;
  pointer-events: none;
  filter: blur(40px);
  will-change: transform;
`;

const ContentWrapper = styled.div`
  max-width: 1400px;
  width: 100%;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 60px;
  align-items: center;
  z-index: 2;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const TextColumn = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 25px;
`;

const Heading = styled.h1`
  font-size: 2.7rem;
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
  margin: 0;

  .highlight {
    color: #8CC7FF; 
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Tagline = styled.p`
  font-size: 1.4rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
`;

const Description = styled.div`
  font-size: 1.1rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
  max-width: 700px;
  margin: 0;

  strong {
    color: #fff;
    font-weight: 700;
  }

  span.underlined {
    position: relative;
    display: inline-block;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 0;
      width: 100%;
      height: 2px;
      background: #275D8F;
      opacity: 0.8;
    }
  }
`;

const StartButton = styled(motion.button)`
  background: #275D8F;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 18px 50px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  width: fit-content;
  transition: all 0.3s ease;
`;

// CourseEnrollCard handles the card column and its internal styling

const WordPressHero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const handleEnroll = () => {
    navigate(getEnrollmentPath(user, 'wordpress-mastery'));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const handleMouseMove = (e) => {
    if (heroRef.current) {
      const rect = heroRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      heroRef.current.style.setProperty('--mouse-x', x);
      heroRef.current.style.setProperty('--mouse-y', y);
    }
  };

  return (
    <HeroSection
      ref={heroRef}
      onMouseMove={handleMouseMove}
    >
      <FloatingShape
        size="450px"
        color="rgba(60, 145, 255, 0.08)"
        style={{ top: '-10%', left: '-5%' }}
        animate={{
          x: [0, 40, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <FloatingShape
        size="350px"
        color="rgba(60, 145, 255, 0.06)"
        style={{ bottom: '10%', right: '5%' }}
        animate={{
          x: [0, -30, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      <ContentWrapper>
        <TextColumn
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Heading>
              <span className="highlight">WordPress</span> Website Development
              <div>with <span className="highlight">Elementor</span></div>
            </Heading>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Tagline>Build Professional Websites Without Heavy Coding</Tagline>
          </motion.div>

          <motion.div
            variants={itemVariants}
            style={{ height: '1px', background: 'rgba(60, 145, 255, 0.2)', width: '100%', maxWidth: '500px' }}
          />

          <motion.div variants={itemVariants}>
            <Description>
              Not everyone wants to start with complex programming, and that's perfectly fine. <strong>WordPress powers over 40% of the web,</strong> and Elementor has made professional website creation faster, smarter, and more accessible than ever. This course is designed for students who want to design, build, and launch real websites using a no-code approach, with just enough technical understanding to work confidently with clients and businesses.
            </Description>
          </motion.div>

          <motion.div variants={itemVariants}>
            <StartButton
              whileHover={{ scale: 1.05, boxShadow: "0 15px 35px rgba(60, 145, 255, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEnroll}
            >
              Start Learning
            </StartButton>
          </motion.div>
        </TextColumn>

        <CourseEnrollCard
          image={wpCard}
          courseId="wordpress-mastery"
          title="WordPress Mastery"
          accentColor="#2A5F8F"
          features={[
            'Elementor & No-Code Mastery',
            'E-commerce Store Development',
            'Search Engine Optimization',
            'Client Acquisition Strategy'
          ]}
          iconType="wordpress"
        />
      </ContentWrapper>
    </HeroSection>
  );
};

export default WordPressHero;
