import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const SectionContainer = styled.section`
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
    background: radial-gradient(circle at 10% 20%, rgba(147, 51, 234, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 90% 80%, rgba(147, 51, 234, 0.05) 0%, transparent 50%);
    z-index: 1;
  }
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
  font-size: 2.5rem;
  font-weight: 800;
  color: #9333EA;
  margin-bottom: 40px;
  text-align: center;
  text-shadow: 0 0 20px rgba(147, 51, 234, 0.3);

  @media (max-width: 768px) {
    font-size: 1.7rem;
  }
`;

const ProjectsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 60px 40px;
  width: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const ProjectItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding-left: 20px;
`;

const NumberLabel = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  opacity: 1;
  line-height: 1;
  min-width: 50px;
`;

const ProjectDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 20px;
  border-left: 3px solid transparent;
  // Using background-clip and border-image for a gradient border effect
  border-image: linear-gradient(to bottom, #9333EA, rgba(147, 51, 234, 0.1)) 1;
  
  p {
    color: rgba(255, 255, 255, 0.85);
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.3;
    max-width: 200px;
  }
`;

const GraphicProjects = () => {
  const projects = [
    { id: "01", text: "Professional logo & brand identity project" },
    { id: "02", text: "Complete social media campaign design" },
    { id: "03", text: "Product packaging & mockup presentation" },
    { id: "04", text: "5-page website UI design" },
    { id: "05", text: "Mobile app interface design" },
    { id: "06", text: "Portfolio-ready final design project" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <SectionContainer>
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Projects You Will Build
        </SectionTitle>

        <ProjectsGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {projects.map((project, index) => (
            <ProjectItem key={index} variants={itemVariants}>
              <NumberLabel>{project.id}</NumberLabel>
              <ProjectDetails>
                <p>{project.text}</p>
              </ProjectDetails>
            </ProjectItem>
          ))}
        </ProjectsGrid>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default GraphicProjects;
