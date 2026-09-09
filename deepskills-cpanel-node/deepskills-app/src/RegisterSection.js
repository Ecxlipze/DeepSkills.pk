import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import rightImg from "./assets/rightimgarea.png";
import RegisterButton from "./components/RegisterButton";

const Section = styled.section`
  padding: 0;
  background-color: #000;
  color: #fff;
  overflow: hidden;
`;

const MainContainer = styled(motion.div)`
  background-color: #7B1F2E;
  width: 100%;
  display: flex;
  min-height: 400px;
  position: relative;
  transition: background-color 0.5s ease;
  
  &:hover {
    background-color: #8b2334;
  }
  
  @media (max-width: 992px) {
    flex-direction: column;
  }
`;

const LeftContent = styled(motion.div)`
  flex: 1.5;
  padding: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 30px;
  
  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

const TopDescription = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #eee;
  max-width: 800px;
`;

const MainTitle = styled.h2`
  font-size: 2rem;
  font-family: 'Inter', sans-serif; 
  font-weight: 800;
  margin: 0;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const SubText = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #ddd;
  
  strong {
    color: #fff;
  }
`;

const RightImageArea = styled(motion.div)`
  flex: 1;
  background: url(${rightImg});
  background-size: cover;
  background-position: center;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
  }
  
  @media (max-width: 992px) {
    height: 300px;
  }
`;

const OverlayIcons = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=');
  background-size: 200px;
  opacity: 0.2;
  pointer-events: none;
`;

const ButtonContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 30px 20px;
`;


const RegisterSection = () => {
  return (
    <Section>
      <MainContainer>
        <LeftContent
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <MainTitle>Your Career Starts with the Right Skills</MainTitle>
          <TopDescription>
            The digital world continues to expand, and skilled professionals are consistently in high demand.
            By learning design and development skills at Deepskills, you invest in long-term career stability,
            flexibility, and global opportunities.
          </TopDescription>
          
          <MainTitle>Take the First Step Toward a Skilled Future</MainTitle>
          
          <SubText>
            Your future doesn't happen by chance; it's built through learning.<br />
            Start your journey with <strong>Deepskills</strong> and gain the skills that shape careers.
          </SubText>
        </LeftContent>
        
        <RightImageArea
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          whileHover={{ scale: 1.05 }}
        >
          <OverlayIcons />
        </RightImageArea>
      </MainContainer>
      
      <ButtonContainer>
        <RegisterButton to="/inquiry">
          INQUIRE NOW
        </RegisterButton>
      </ButtonContainer>
    </Section>
  );
};

export default RegisterSection;
