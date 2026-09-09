import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

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
  margin-bottom: 60px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const LearningGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  width: 100%;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const LearningCard = styled(motion.div)`
  background: ${props => props.gradient};
  border-radius: 12px;
  padding: 30px 20px;
  text-align: left;
  position: relative;
  overflow: hidden;
  min-height: 380px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
`;

const LearningTitle = styled.h3`
  font-size: 1.4rem;
  color: #fff;
  margin-top: 0;
  margin-bottom: 25px;
   padding-bottom: 15px;
  border-bottom: 2px solid #fff;
  font-weight: 800;
  line-height: 1.3;
`;

const LearningList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    margin-bottom: 15px;
    color: rgba(255,255,255,0.9);
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5;
    position: relative;
    padding-left: 18px;

    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #fff;
      font-weight: bold;
    }
  }
`;

const WordPressLearning = () => {
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
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const cards = [
    {
      title: "WordPress Foundations",
      gradient: "linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)",
      items: [
        "Domains, hosting & local servers",
        "WordPress installation (local & live)",
        "Dashboard, themes, plugins & security basics"
      ]
    },
    {
      title: "Elementor Page Building",
      gradient: "linear-gradient(135deg, #FFB703 0%, #FB8500 100%)",
      items: [
        "Page layout using sections, columns & widgets",
        "Responsive design controls",
        "Advanced styling, global design & motion effects"
      ]
    },
    {
      title: "Real Website Features",
      gradient: "linear-gradient(135deg, #FF4D6D 0%, #A4133C 100%)",
      items: [
        "Online store setup",
        "Products, cart & checkout",
        "Payment gateways"
      ]
    },
    {
      title: "E-Commerce with WooCommerce",
      gradient: "linear-gradient(135deg, #2D6A4F 0%, #081C15 100%)",
      items: [
        "Domains, hosting & local servers",
        "WordPress installation (local & live)",
        "Dashboard, themes, plugins & security basics"
      ]
    }
  ];

  return (
    <SectionContainer>
      <SectionTitle
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        What You'll Learn
      </SectionTitle>
      <LearningGrid
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {cards.map((card, index) => (
          <LearningCard 
            key={index} 
            variants={itemVariants}
            gradient={card.gradient}
            whileHover={{ y: -10, scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
          >
            <LearningTitle>{card.title}</LearningTitle>
            <LearningList>
              {card.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </LearningList>
          </LearningCard>
        ))}
      </LearningGrid>
    </SectionContainer>
  );
};

export default WordPressLearning;
