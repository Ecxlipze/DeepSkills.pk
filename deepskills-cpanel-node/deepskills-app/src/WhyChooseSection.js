import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";

const Section = styled.section`
  padding: 20px 10px;
  color: #fff;
  text-align: center;
  overflow: hidden;
`;

const Heading = styled(motion.h2)`
  font-size: 2.5rem;
  font-family: 'Inter', sans-serif;
  margin-bottom: 20px;
  color: #fff;
    @media (max-width: 768px) {
      font-size: 1.95rem;
`;

const SubHeading = styled(motion.h3)`
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
  margin-bottom: 50px;
  border: 1px solid #d6d6d6ff;
  display: inline-block;
  padding: 10px 20px;
  border-radius: 30px;
  color: #ffffffff;
  letter-spacing: 1px;
    @media (max-width: 768px) {
      font-size: 0.9rem;
      margin-bottom: 20px;
`;

const FeaturesList = styled(motion.ul)`
  list-style: none;
  padding: 0;
  text-align: left;
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0px;
`;

const Checkmark = styled(motion.create(FaCheckCircle))`
  color: #d94a5e;
  margin-right: 20px;
  font-size: 1.4rem;
  flex-shrink: 0;
  margin-top: 3px;
  transition: color 0.3s ease;
`;

const FeatureItem = styled(motion.li)`
  font-size: 1.1rem;
  padding: 25px;
  border-radius: 15px;
  display: flex;
  align-items: flex-start;
  font-family: 'Inter', sans-serif;
  border: 1px solid transparent;
  cursor: pointer;

  &:hover {
    ${Checkmark} {
      color: #b52b3e;
    }
  }
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const FeatureTitle = styled.strong`
  font-size: 1rem;
  margin-bottom: 5px;
  color: #fff;
`;

const FeatureDesc = styled.span`
  color: #ccc;
  line-height: 1.6;
    @media (max-width: 768px) {
      font-size: 0.9rem;
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -25 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const WhyChooseSection = () => {
  const features = [
    {
      title: "Practical Learning Approach",
      desc: "Hands-on projects and real-world examples help you learn by doing and gain actual experience."
    },
    {
      title: "Career-Oriented Skills",
      desc: "Our courses focus on skills that employers and clients actually demand in the global market."
    },
    {
      title: "Beginner-Friendly Structure",
      desc: "No prior technical background required; we start from the absolute basics and build up."
    },
    {
      title: "Confidence Through Competence",
      desc: "We help learners build real professional confidence by mastering core technical concepts."
    }
  ];

  return (
    <Section>
      <Heading
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Why Choose Deepskills?
      </Heading>
      <SubHeading
        initial={{ opacity: 0, y: -10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Designed for Your Future
      </SubHeading>
      
      <FeaturesList
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {features.map((feature, index) => (
          <FeatureItem
            key={index}
            variants={itemVariants}
            whileHover={{ 
              y: -5, 
              scale: 1.01, 
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderColor: "#7B1F2E"
            }}
          >
            <Checkmark whileHover={{ scale: 1.2 }} />
            <TextContainer>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDesc>{feature.desc}</FeatureDesc>
            </TextContainer>
          </FeatureItem>
        ))}
      </FeaturesList>
    </Section>
  );
};

export default WhyChooseSection;
