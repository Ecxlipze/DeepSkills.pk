import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaUser, FaStar, FaUsers, FaProjectDiagram, FaWallet, FaClock, FaBriefcase, FaChalkboardTeacher } from 'react-icons/fa';

const SectionContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 800;
  color: #275D8F;
  margin-bottom: 40px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const FeaturesGrid = styled(motion.div)`
  background: #1a1a1a;
  border: 2px solid #275D8F;
  border-radius: 30px;
  padding: 60px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  width: 100%;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to bottom, rgba(255,255,255,0.03), transparent);
    pointer-events: none;
  }

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 40px 20px;
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureBox = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 15px;
  text-align: left;
`;

const IconWrapper = styled(motion.div)`
  width: 50px;
  height: 50px;
  background-color: #fff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #275D8F;
  font-size: 1.2rem;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
`;

const FeatureText = styled.div`
  display: flex;
  flex-direction: column;

  h4 {
    color: #fff;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  span {
    color: #aaa;
    font-size: 0.85rem;
    margin-top: 4px;
  }
`;

const WordPressFeatures = () => {
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

  const features = [
    { icon: <FaUser />, title: "Anyone", sub: "Can Learn (IT / Non IT)" },
    { icon: <FaStar />, title: "4.8+", sub: "Course Rating" },
    { icon: <FaUsers />, title: "100+", sub: "Learners" },
    { icon: <FaProjectDiagram />, title: "5+", sub: "Real World Projects" },
    { icon: <FaWallet />, title: "Payment Plan", sub: "One time / Installments" },
    { icon: <FaClock />, title: "2 Months", sub: "Content Duration" },
    { icon: <FaBriefcase />, title: "Job-Ready", sub: "Industry Aligned" },
    { icon: <FaChalkboardTeacher />, title: "Onsite / Online", sub: "Lecture Mode" }
  ];

  return (
    <SectionContainer>
      <SectionTitle
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        Our Course Features
      </SectionTitle>
      <FeaturesGrid
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {features.map((feature, index) => (
          <FeatureBox 
            key={index} 
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
          >
            <IconWrapper 
              whileHover={{ rotate: 360, backgroundColor: "#3C91FF", color: "#fff" }}
              transition={{ duration: 0.5 }}
            >
              {feature.icon}
            </IconWrapper>
            <FeatureText>
              <h4>{feature.title}</h4>
              <span>{feature.sub}</span>
            </FeatureText>
          </FeatureBox>
        ))}
      </FeaturesGrid>
    </SectionContainer>
  );
};

export default WordPressFeatures;
