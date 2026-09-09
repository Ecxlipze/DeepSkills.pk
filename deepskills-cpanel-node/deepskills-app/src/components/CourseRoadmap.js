import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Section = styled.section`
  width: 100%;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #000;
  position: relative;
`;

const Container = styled.div`
 width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  
`;

const Heading = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 30px;
  text-align: center;
  
  span {
    color: ${props => props.accentColor || '#fff'};
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 20px;
  }
`;

const ImageWrapper = styled(motion.div)`
  width: 100%;
  display: flex;
  justify-content: center;
  overflow: hidden;
  
  img {
    width: 100%;
    height: auto;
    display: block;
    // object-fit: cover;
  }
`;

const CourseRoadmap = ({ imageSrc, accentColor }) => {
  return (
    <Section>
      <Container>
        <Heading 
          accentColor={accentColor}
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Course <span>Roadmap</span>
        </Heading>
        
        <ImageWrapper
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <img src={imageSrc} alt="Course Roadmap" />
        </ImageWrapper>
      </Container>
    </Section>
  );
};

export default CourseRoadmap;
