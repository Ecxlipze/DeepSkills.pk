import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import AboutUsHero from './AboutUsHero';
import WhyDeepskills from './WhyDeepskills';
import WhatYouLearn from './WhatYouLearn';
import HowWeTeach from './HowWeTeach';
import WhoIsItFor from './WhoIsItFor';
import WhatMakesUsDifferent from './WhatMakesUsDifferent';
import OurVision from './OurVision';
import OurMission from './OurMission';
import ScrollReveal from './ScrollReveal';

const PageContainer = styled.div`
  background-color: #000;
  min-height: 100vh;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(123, 31, 46, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(123, 31, 46, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Particle = styled(motion.div)`
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
`;

const AboutPage = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setParticles(
      [...Array(15)].map((_, i) => ({
        id: i,
        initialX: Math.random() * window.innerWidth,
        initialY: Math.random() * window.innerHeight,
        initialOpacity: Math.random() * 0.5,
        y1: Math.random() * -100,
        y2: Math.random() * 100,
        duration: 5 + Math.random() * 10,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`
      }))
    );
  }, []);

  return (
    <PageContainer>
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          initial={{ 
            x: particle.initialX,
            y: particle.initialY,
            opacity: particle.initialOpacity
          }}
          animate={{ 
            y: [null, particle.y1, particle.y2],
            opacity: [0.1, 0.4, 0.1]
          }}
          transition={{ 
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          style={{
            left: particle.left,
            top: particle.top,
          }}
        />
      ))}
      <AboutUsHero />
      <WhyDeepskills />
      <WhatYouLearn />
      <HowWeTeach />
      <WhoIsItFor />
      <WhatMakesUsDifferent />
      <ScrollReveal>
        <OurVision />
      </ScrollReveal>
      <ScrollReveal>
        <OurMission />
      </ScrollReveal>
    </PageContainer>
  );
};

export default AboutPage;
