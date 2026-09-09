import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaCompass, FaGlobe, FaChartBar, FaBook } from "react-icons/fa";

const Section = styled.section`
  background: radial-gradient(circle at top right, #1a0609 0%, #000 60%);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -10%;
    right: -10%;
    width: 40%;
    height: 40%;
    background: radial-gradient(circle, rgba(123, 31, 46, 0.15) 0%, transparent 70%);
    filter: blur(80px);
    pointer-events: none;
  }
`;

const ContentWrapper = styled.div`
  text-align: center;
  max-width: 1000px;
  margin-bottom: 80px;
  position: relative;
  z-index: 2;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
  text-transform: uppercase;

  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

const Tagline = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.4rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.95);

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  width: 100%;
  max-width: 1200px;
  position: relative;
  z-index: 2;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 50px 30px;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 50px;
  }
`;

const IconGlow = styled(motion.div)`
  position: absolute;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(123, 31, 46, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
`;

const Item = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;

  &:hover ${IconGlow} {
    opacity: 1;
  }
`;

const IconCircle = styled(motion.div)`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(123, 31, 46, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  color: #d94a5e;
  font-size: 2.5rem;
  margin-bottom: 25px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);

  ${Item}:hover & {
    background: #7B1F2E;
    color: #fff;
    transform: translateY(-8px) rotate(5deg);
    border-color: #fff;
    box-shadow: 0 15px 35px rgba(123, 31, 46, 0.5);
  }
`;

const Label = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin: 0;
  max-width: 240px;
  transition: color 0.3s ease;

  ${Item}:hover & {
    color: #fff;
  }
`;

const WhoIsItFor = () => {
  const items = [
    { icon: <FaCompass />, text: "A student exploring career options" },
    { icon: <FaGlobe />, text: "A beginner who wants to learn from scratch" },
    { icon: <FaChartBar />, text: "A young adult looking for practical skills" },
    { icon: <FaBook />, text: "Someone who wants to work, freelance, or grow online" }
  ];

  return (
    <Section id="who-it-is-for">
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Who DEEPSKILLS IS FOR ?
        </SectionTitle>
        <Tagline
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          This Place Is for You If You Are:
        </Tagline>
      </ContentWrapper>

      <Grid>
        {items.map((item, index) => (
          <Item
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
          >
            <IconGlow animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} />
            <IconCircle>{item.icon}</IconCircle>
            <Label>{item.text}</Label>
          </Item>
        ))}
      </Grid>
    </Section>
  );
};

export default WhoIsItFor;
