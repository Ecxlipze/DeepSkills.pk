import React, { useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

import RegisterButton from "./components/RegisterButton";

// Import assets
import founderBg from "./assets/founder-bg.png";
import founderImg from "./assets/founder.svg";

const PageContainer = styled(motion.div)`
  min-height: 100vh;
  padding: 100px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow-x: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(123, 31, 46, 0.15) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
`;

const HeaderGroup = styled(motion.div)`
  text-align: center;
  margin-bottom: 40px;
`;

const SectionTitle = styled.h1`
  font-family: 'Asimovian', sans-serif;
  font-size: 3rem;
  color: #fff;
  margin-bottom: 10px;
  position: relative;
  display: inline-block;

  &::after {
    content: '';
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 3px;
    background: linear-gradient(90deg, transparent, #fff, transparent);
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Tagline = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 15px;
  font-weight: 300;
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const MessageBox = styled(motion.div)`
  background-color: #7B1F2E;
  background-image: url(${founderBg});
  background-size: cover;
  background-position: center;
  width: 100%;
  border-radius: 40px;
  padding: 60px;
  display: flex;
  gap: 60px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(123, 31, 46, 0.2);
    opacity: 0.3;
    pointer-events: none;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    padding: 30px;
    gap: 40px;
    align-items: center;
    text-align: center;
  }
`;

const FounderSide = styled.div`
  flex: 0 0 320px;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
`;

const ImageContainer = styled(motion.div)`
  width: 100%;
  min-height: 450px;
  margin-bottom: 25px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  position: relative;

  img {
    width: 100%;
    height: auto;
    display: block;
    // filter: brightness(1.1) contrast(1.1);
    mix-blend-mode: normal;
    z-index: 2;
  }

  @media (max-width: 1024px) {
    min-height: 350px;
    margin-bottom: 15px;
  }
`;

const FounderInfo = styled.div`
  text-align: center;
  
  h3 {
    font-family: 'Asimovian', sans-serif;
    font-size: 1.5rem;
    color: #fff;
    margin-bottom: 5px;
    letter-spacing: 1px;
  }
  
  p {
    font-family: 'Inter', sans-serif;
    color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
    font-weight: 500;
  }
`;

const MessageContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 5;
  color: #fff;
`;

const VisionHeadline = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 15px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 1.3rem;
    text-align: start;
  }
`;

const Quote = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.4rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 15px;
  // padding-left: 15px;
  // border-left: 4px solid #fff;
    @media (max-width: 768px) {
    text-align: start;
    font-size: 0.9rem;
    margin-bottom: 10px;
    padding-left: 10px;
    border-left: 2px solid #fff;
  }
`;

const Description = styled(motion.div)`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);

  p {
    margin-bottom: 15px;
    @media (max-width: 768px) {
    text-align: start;
    font-size: 0.9rem;
    margin-bottom: 10px;
      &:nth-child(n+3) {
        display: none;
      }
    }
  }

  strong {
    color: #fff;
    font-weight: 700;
  }
`;

const SignatureQuote = styled(motion.div)`
  margin-top: 15px;
  padding: 15px;
  border-left: 4px solid white;
  font-style: italic;
  font-size: 1rem;
  color: #fff;
  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 10px;
    padding-left: 10px; 
    text-align: start;
    border-left: 2px solid #fff;
  }

  span {
    font-weight: 700;
    color: #fff;
  }
`;

const RegisterCTA = styled(motion.div)`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;

  @media (max-width: 768px) {
    margin-top: 20px;
  }
`;



const FounderMessage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <ContentWrapper>
        <HeaderGroup
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <SectionTitle>FOUNDER MESSAGE</SectionTitle>
          <Tagline>From Deep skills</Tagline>
        </HeaderGroup>

        <MessageBox
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
        >
          <FounderSide>
            <ImageContainer
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1, type: "spring", bounce: 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              <img src={founderImg} alt="Muhammad Qazzafi" />
            </ImageContainer>
            <FounderInfo>
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                MUHAMMAD QAZZAFI
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Founder of Deepskills
              </motion.p>
            </FounderInfo>
          </FounderSide>

          <MessageContent>
            <VisionHeadline
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Deepskills was founded with a clear vision
            </VisionHeadline>
            <Quote
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              "To equip learners with skills that remain relevant in a rapidly evolving digital world."
            </Quote>
            <Description
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <p>
                Today, technology is not just supporting businesses, it is shaping decisions, automating 
                creativity, and upending entire industries. Fields such as Data Science and Generative AI 
                are at the center of this transformation. They influence how products are built, how 
                organizations grow, and how problems are solved at scale. At <strong>Deepskills</strong>, tech-disciplines 
                are not treated as trends but as foundational skills for the future workforce.
              </p>
              <p>
                Our approach to education is deeply practical. Every program is designed to move beyond 
                theory and focus on real-world applications, hands-on projects, and industry-aligned 
                outcomes. Students learn how to think analytically, work with modern tools, and apply 
                technology in meaningful challenges. By the end of their learning journey, they are 
                equipped not only with technical knowledge but also with the confidence to apply it 
                professionally.
              </p>
              <p>
                Deepskills is committed to continuously improving, updating curricula, introducing 
                emerging technologies, and aligning learning paths with market demand. Whether a 
                student is preparing for employment, freelancing, or further specialization, our goal is to 
                provide clarity, capability, and long-term growth.
              </p>
            </Description>
            <SignatureQuote
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              "Education should open doors. At Deepskills, we work every day to ensure it does."
            </SignatureQuote>
          </MessageContent>
        </MessageBox>

        <RegisterCTA
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <div style={{ position: 'relative' }}>
            <RegisterButton>
              INQUIRE NOW
            </RegisterButton>
          </div>
        </RegisterCTA>
      </ContentWrapper>
    </PageContainer>
  );
};

export default FounderMessage;
