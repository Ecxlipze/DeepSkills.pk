import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Import assets
import whatBg from "./assets/whatds-bg.png";
import card1 from "./assets/whatcard1.svg";
import card2 from "./assets/whatcard2.svg";
import card3 from "./assets/whatcard3.svg";
import card4 from "./assets/whatcard4.svg";

const Section = styled.section`
  background-color: #000;
  background-image: url(${whatBg});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 50px 20px;
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
    background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%);
    pointer-events: none;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 1000px;
  margin-bottom: 80px;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
  letter-spacing: -2px;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Tagline = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.4rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0;
`;

const CardsGrid = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
  width: 100%;
  max-width: 1100px;
  margin-bottom: 80px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 30px;
    max-width: 500px;
  }
`;

const CardWrapper = styled(motion.div)`
  position: relative;
  cursor: pointer;
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    border: 1px solid rgba(123, 31, 46, 0);
    transition: all 0.3s ease;
    pointer-events: none;
  }

  &:hover {
    &::after {
      border-color: rgba(123, 31, 46, 0.5);
      box-shadow: inset 0 0 20px rgba(123, 31, 46, 0.2);
    }
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const GlowEffect = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(123, 31, 46, 0.3) 0%, transparent 70%);
  filter: blur(30px);
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;

  ${CardWrapper}:hover & {
    opacity: 1;
  }
`;

const BottomCTA = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: 20px 50px;
  border-radius: 100px;
  text-align: center;
  max-width: 90%;
   clip-path: polygon(0 0, 95% 0, 100% 25%, 100% 100%, 5% 100%, 0 75%);

  /* Running Stripe Effect */
  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    background: conic-gradient(
      transparent, 
      rgba(255, 255, 255, 0.6), 
      transparent 30%
    );
    animation: rotate 4s linear infinite;
    z-index: 0;
  }

  /* Inner content container to mask the gradient and show only border */
  &::after {
    content: '';
    position: absolute;
    inset: 2px;
    background: linear-gradient(135deg, #7B1F2E 0%, #b32d43 100%);
    z-index: 1;
    clip-path: polygon(0 0, 95% 0, 100% 25%, 100% 100%, 5% 100%, 0 75%);
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  p {
    font-family: 'Inter', sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    position: relative;
    z-index: 2;
  }

  @media (max-width: 768px) {
    padding: 10px;
    p { font-size: 0.8rem; }
    border-radius: 20px; // Slightly less rounded for mobile space
  }
`;

const WhatYouLearn = () => {
  const cards = [card1, card2, card3, card4];

  return (
    <Section id="what-you-learn">
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          What You'll Learn at Deepskills
        </SectionTitle>
        <Tagline
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Learning That Makes Sense
        </Tagline>
      </ContentWrapper>

      <CardsGrid>
        {cards.map((card, index) => (
          <CardWrapper
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            whileHover={{ y: -10, scale: 1.02 }}
          >
            <GlowEffect />
            <CardImage src={card} alt={`Course module ${index + 1}`} />
          </CardWrapper>
        ))}
      </CardsGrid>

      <BottomCTA
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <p>Each course focuses on real projects, real skills, and real confidence.</p>
      </BottomCTA>
    </Section>
  );
};

export default WhatYouLearn;
