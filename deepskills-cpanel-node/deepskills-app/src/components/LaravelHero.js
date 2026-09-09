import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from '../../lib/nextRouterDomCompat';
import { useAuth } from '../context/AuthContext';
import wpressBg from '../assets/wpress-bg.png';
import phpCard from '../assets/php-card.svg';
import CourseEnrollCard from './CourseEnrollCard';
import { getEnrollmentPath } from '../utils/enrollmentNavigation';

const HeroSection = styled.section`
  width: 100%;
  min-height: 90vh;
  padding: 100px 0 50px;
  background: url(${wpressBg});
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 229, 255, 0.08) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 40%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 40%);
    z-index: 1;
    pointer-events: none;
  }
`;

const FloatingCode = styled(motion.div)`
  position: absolute;
  color: rgba(0, 229, 255, 0.08);
  font-family: 'Courier New', Courier, monospace;
  font-weight: 900;
  font-size: ${props => props.size || '3rem'};
  user-select: none;
  pointer-events: none;
  z-index: 2;
`;

const Container = styled.div`
  max-width: 1400px;
  width: 100%;
  padding: 0 40px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 2;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    text-align: left;
    gap: 80px;
  }

  @media (max-width: 768px) {
    padding: 0 20px;
  }
`;

const ContentColumn = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
  margin: 0;

  span {
    color: #00E5FF;
    display: block;
    text-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Tagline = styled.p`
  font-size: 1.2rem;
  color: #fff;
  margin: 0;
  font-weight: 600;
  opacity: 0.9;
  line-height: 1.4;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Description = styled.p`
  font-size: 1.2rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  max-width: 800px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);

  @media (max-width: 1100px) {
    margin: 0;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const StartButton = styled(motion.button)`
  background: linear-gradient(90deg, #00E5FF 0%, #00B2FF 100%);
  color: #000;
  font-size: 1.2rem;
  font-weight: 700;
  padding: 18px 45px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  width: fit-content;
  box-shadow: 0 10px 30px rgba(0, 229, 255, 0.3);
  transition: all 0.3s ease;

  @media (max-width: 1100px) {
    margin: 0;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(116, 235, 213, 0.5);
  }
`;

// CourseEnrollCard handles the card column and its internal styling

const LaravelHero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleEnroll = () => {
    navigate(getEnrollmentPath(user, 'laravel-mastery'));
  };

  return (
    <HeroSection>
      <FloatingCode size="4rem" style={{ top: '15%', left: '10%' }} animate={{ y: [0, 50, 0] }} transition={{ duration: 6, repeat: Infinity }}>&lt;?php</FloatingCode>
      <FloatingCode size="6rem" style={{ bottom: '15%', left: '5%' }} animate={{ x: [0, 40, 0] }} transition={{ duration: 8, repeat: Infinity }}>Eloquent</FloatingCode>
      <FloatingCode size="5rem" style={{ top: '20%', right: '10%' }} animate={{ rotate: [0, 360] }} transition={{ duration: 25, repeat: Infinity }}>&#123; &#125;</FloatingCode>

      <Container>
        <ContentColumn
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Title>
            Full Stack Web Development <span>with PHP & Laravel</span>
          </Title>
          <Tagline>
            Build Real-World Skills. Get Job-Ready. Launch Your Career in Web Development.
          </Tagline>
          <Description>
            This career-focused Full Stack Web Development program is designed to prepare you for real employment opportunities using PHP, MySQL, and Laravel. You will learn how to build dynamic, secure, and scalable web applications used by companies worldwide.
            <br />
            From frontend design to backend logic and database management, this program trains you with practical projects that simulate real industry work environments. Whether you aim for a job, internship, or freelancing career, this course prepares you with hands-on experience and portfolio-ready projects.
          </Description>
          <StartButton
            whileHover={{ scale: 1.05, boxShadow: "0 15px 45px rgba(0, 229, 255, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEnroll}
          >
            Start Learning
          </StartButton>
        </ContentColumn>

        <CourseEnrollCard
          image={phpCard}
          courseId="laravel-mastery"
          title="Full Stack (Laravel)"
          accentColor="#05BAFD"
          features={[
            'Advanced Backend Development',
            'Database Design Mastery',
            'Scalable Web Architecture',
            'Job-Ready Interview Prep'
          ]}
          iconType="laravel"
        />
      </Container>
    </HeroSection>
  );
};

export default LaravelHero;
