import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Import asset
import whydsBg from "./assets/whyds-bg.png";

const Section = styled.section`
  background-color: #000;
  background-image: url(${whydsBg});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 20px;
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
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 1000px;
  margin-bottom: 60px;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 20px;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Description = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  line-height: 1.7;
  color: #ffffffff;
  max-width: 700px;
  margin: 0 auto;

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const CardsContainer = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 30px;
  width: 100%;
  max-width: 1200px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const Card = styled(motion.div)`
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px 30px;
  flex: 1;
  min-width: 300px;
  max-width: 350px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

  &:hover {
    border-color: rgba(123, 31, 46, 0.4);
  }

  @media (max-width: 768px) {
    width: 100%;
    max-width: 450px;
  }
`;

const MaroonPill = styled(motion.div)`
  width: 25px;
  height: 120px;
  background: #7B1F2E;
  border-radius: 20px;
  flex-shrink: 0;
  box-shadow: 0 0 20px rgba(123, 31, 46, 0.3);
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CardNumber = styled.span`
  font-family: 'Inter', sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
`;

const CardText = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
`;

const WhyDeepskills = () => {
  const cards = [
    {
      id: "01",
      text: "Which skills should I learn?"
    },
    {
      id: "02",
      text: "Where do I even start?"
    },
    {
      id: "03",
      text: "How do I turn learning into a career?"
    }
  ];

  return (
    <Section>
      <ContentWrapper>
        
        <SectionTitle
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Why Deepskills Was Created
        </SectionTitle>
        <Description
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Because Your Future Deserves Better Than Guesswork
        </Description>
        <Description
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          The world is changing rapidly, and traditional education often fails to adequately prepare students for real-world opportunities.
        </Description>
      </ContentWrapper>

      <CardsContainer>
        {cards.map((card, index) => (
          <Card
            key={card.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            whileHover={{ y: -10 }}
          >
            <MaroonPill 
              whileHover={{ 
                scaleY: 1.1, 
                boxShadow: "0 0 30px rgba(123, 31, 46, 0.6)" 
              }}
            />
            <CardContent>
              <CardNumber>{card.id}</CardNumber>
              <CardText>{card.text}</CardText>
            </CardContent>
          </Card>
        ))}
      </CardsContainer>
    </Section>
  );
};

export default WhyDeepskills;
