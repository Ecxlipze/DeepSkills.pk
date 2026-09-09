import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaBrain, FaTools, FaRoute, FaCheckCircle } from "react-icons/fa";

// Import asset
import howBg from "./assets/howds-bg.png";

const Section = styled.section`
  background-image: url(${howBg});
  background-size: 100% 100%;
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
    background: radial-gradient(circle at center, rgba(123, 31, 46, 0.2) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 900px;
  margin-bottom: 60px;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
  letter-spacing: -2px;

  @media (max-width: 768px) {
    font-size: 2.3rem;
  }
`;

const Tagline = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 20px;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const HighlightBox = styled(motion.div)`
  background: rgba(120, 120, 120, 0.4);
  padding: 12px 30px;
  border-radius: 10px;
  display: inline-block;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;

  p {
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    color: #fff;
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
`;

const CardsContainer = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 25px;
  width: 100%;
  max-width: 1200px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
`;

const Card = styled(motion.div)`
  background: #a7a7a7ff;
  border-radius: 25px;  
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  height: 100%;
  border: 2px solid black;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 20px rgba(123, 31, 46, 0.3);
  }
`;

const IconWrapper = styled.div`
  background: white;
  padding: 40px 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #d94a5e;
  font-size: 2.7rem;
  transition: all 0.3s ease;

  ${Card}:hover & {
    background: #D0CBCB;
    transform: scale(1.1);
  }
`;

const CardContent = styled.div`
  background:#724747;
  padding: 45px 10px;
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  border-top: 2px solid black;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }

  p {
    font-family: 'Inter', sans-serif;
    font-size: 1.2rem;
    font-weight: 800;
    color: #fff;
    margin: 0;
    line-height: 1.3;
  }
`;

const FooterText = styled(motion.p)`
  position: relative;
  z-index: 2;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #fff;
  margin-top: 40px;
  font-weight: 400;
  max-width: 800px;
  text-align: center;
  opacity: 0.9;
  line-height: 1.6;
`;

const HowWeTeach = () => {
  const cards = [
    { icon: <FaBrain />, text: "Easy to understand" },
    { icon: <FaTools />, text: "Practical and hands-on" },
    { icon: <FaRoute />, text: "Step-by-step" },
    { icon: <FaCheckCircle />, text: "Stress-free for beginners" }
  ];

  return (
    <Section id="how-we-teach">
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          How We Teach
        </SectionTitle>
        <Tagline
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Learning That Makes Sense
        </Tagline>
        
        <HighlightBox
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
        >
          <p>At Deepskills, we believe learning should be</p>
        </HighlightBox>
      </ContentWrapper>

      <CardsContainer>
        {cards.map((card, index) => (
          <Card
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <IconWrapper>{card.icon}</IconWrapper>
            <CardContent>
              <p>{card.text}</p>
            </CardContent>
          </Card>
        ))}
      </CardsContainer>

      <FooterText
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1, duration: 1 }}
      >
        You don't need to be "good at tech" to start — we help you grow from zero to confident.
      </FooterText>
    </Section>
  );
};

export default HowWeTeach;
