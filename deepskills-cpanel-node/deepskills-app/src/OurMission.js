import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Import assets
import missionBg from "./assets/mission-bg.png";
import card1 from "./assets/mission-card1.png";
import card2 from "./assets/mission-card2.png";
import RegisterButton from "./components/RegisterButton";

const Section = styled.section`
 background-image: url(${missionBg});
  background-size: 100% 100%;
  background-position: center;
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
    pointer-events: none;
    z-index: 1;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 1000px;
  margin-bottom: 70px;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.7rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
  text-transform: uppercase;
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Tagline = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.4rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const MissionCard = styled(motion.div)`
  flex: 1;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    // background: linear-gradient(to bottom, transparent, rgba(123, 31, 46, 0.05));
    // opacity: 0;
    transition: opacity 0.5s ease;
  }

  &:hover::after {
    opacity: 1;
  }
`;

const CardImg = styled.img`
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.8s cubic-bezier(0.2, 1, 0.3, 1);

  ${MissionCard}:hover & {
    transform: scale(1.05);
  }
`;



const CardsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: stretch;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const OurMission = () => {
  // navigate removed
  return (
    <Section id="mission">
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Our Mission
        </SectionTitle>
        <Tagline
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Making Learning Skills Simple and Powerful
        </Tagline>
      </ContentWrapper>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, type: "spring", damping: 20 }}
        style={{ width: '100%', maxWidth: '1000px', marginBottom: '80px' }}
      >
        <CardsContainer>
          <MissionCard>
            <CardImg src={card1} alt="Mission Steps 01 and 02" />
          </MissionCard>
          <MissionCard>
            <CardImg src={card2} alt="Mission Steps 03 and 04" />
          </MissionCard>
        </CardsContainer>
      </motion.div>

      <div style={{ position: 'relative' }}>
        <RegisterButton to="/inquiry">
          Inquire Now
        </RegisterButton>
      </div>
    </Section>
  );
};

export default OurMission;
