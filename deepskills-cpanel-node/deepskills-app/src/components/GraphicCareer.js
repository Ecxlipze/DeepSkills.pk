import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import graphicsBg from '../assets/graphics-bg.png';
import graphicPath from '../assets/graphic-path.svg';

const Section = styled.section`
  width: 100%;
  padding: 40px 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  background: url(${graphicsBg});
  background-size: cover;
  background-position: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    z-index: 1;
  }
`;

const Content = styled.div`
  max-width: 1300px;
  width: 100%;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 2fr; /* More space to the right side cards */
  gap: 40px;
  align-items: center;
  position: relative;
  z-index: 3;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 0 20px;
  }
`;

const HeaderContainer = styled.div`
  width: 100%;
  text-align: center;
  margin-bottom: 10px;
  position: relative;
  z-index: 3;
`;

const Title = styled(motion.h2)`
  font-size: 2.7rem;
  font-weight: 800;
  color:#9333EA;
  margin: 0;
  margin-bottom: 40px;
  line-height: 1.2;

  span {
    color: #9333EA;
  }

  @media (max-width: 968px) {
    font-size: 2rem;
  }
`;

const LeftSide = styled(motion.div)`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    max-width: 100%;
    height: auto;
    filter: drop-shadow(0 0 30px rgba(147, 51, 234, 0.3));
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0px); }
  }

  @media (max-width: 968px) {
    display: none;
  }
`;

const RightSide = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const CareerGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  width: 100%;
`;

// Card Styling adapted from WhyDeepskills.js but themed for Graphics
const CareerCard = styled(motion.div)`
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  min-height: 140px;
  cursor: default;

  /* Flex sizing for 3 items per row, identical widths */
  flex: 0 0 calc(33.333% - 13.33px);
  max-width: calc(33.333% - 13.33px);

  &:hover {
    background: #5b21b6; /* Deep purple shift on hover */
    border-color: rgba(147, 51, 234, 0.8);
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 25px 50px rgba(147, 51, 234, 0.3);
  }

  @media (max-width: 1024px) {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }

  @media (max-width: 480px) {
    flex: 0 0 100%;
    max-width: 100%;
  }
`;

const PurplePill = styled(motion.div)`
  width: 15px;
  height: 80px;
  background: #9333EA;
  border-radius: 20px;
  flex-shrink: 0;
  box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
  transition: all 0.3s ease;
  
  ${CareerCard}:hover & {
    height: 100px;
    box-shadow: 0 0 30px rgba(147, 51, 234, 0.6);
  }
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Number = styled.span`
  font-family: 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
  opacity: 0.9;
`;

const RoleTitle = styled.h4`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
  margin: 0;
`;

const GraphicCareer = () => {
  const roles = [
    { id: "01", title: "Junior Graphic Designer" },
    { id: "02", title: "Graphic Designer" },
    { id: "03", title: "Senior Designer" },
    { id: "04", title: "UI/UX Designer" },
    { id: "05", title: "Creative Lead / Art Director" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <Section>
      <HeaderContainer>
        <Title
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Career Growth Path
        </Title>
      </HeaderContainer>

      <Content>
        {/* Left Side: Image */}
        <LeftSide
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <img src={graphicPath} alt="Career Path" />
        </LeftSide>

        {/* Right Side: Content */}
        <RightSide>
          <CareerGrid
            as={motion.div}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {roles.map((role, index) => (
              <CareerCard key={index} variants={itemVariants}>
                <PurplePill />
                <CardContent>
                  <Number>{role.id}</Number>
                  <RoleTitle>{role.title}</RoleTitle>
                </CardContent>
              </CareerCard>
            ))}
          </CareerGrid>
        </RightSide>
      </Content>
    </Section>
  );
};

export default GraphicCareer;
