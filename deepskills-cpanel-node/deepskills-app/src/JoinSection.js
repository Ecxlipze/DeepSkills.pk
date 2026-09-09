import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useNavigate } from "../lib/nextRouterDomCompat";
import { FaCheckCircle } from "react-icons/fa";

const Section = styled.section`
  padding: 30px;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: #000;
`;

const Container = styled.div`
  max-width: 1200px;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const UpperContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  
  @media (max-width: 992px) {
    flex-direction: column;
    text-align: center;
    gap: 40px;
  }
`;

const LeftSide = styled(motion.div)`
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  z-index: 1;
`;

const JoinText = styled(motion.h2)`
  font-size: 5rem;
  font-family: 'Asimovian', sans-serif;
  line-height: 0.9;
  margin: 0;
  
  span {
    display: block;
    font-size: 3rem;
  }
  
  strong {
    display: block;
    font-size: 7rem;
    color: #fff;
  }
  
  @media (max-width: 768px) {
    font-size: 4rem;
    strong { font-size: 5.5rem; }
  }
`;

const Tagline = styled(motion.p)`
  font-size: 1.1rem;
  font-family: 'Inter', sans-serif;
  color: #ccc;
  margin-top: 15px;
  letter-spacing: 1px;
`;

const LargeQuestionMark = styled(motion.div)`
  position: absolute;
  right: 80px;
  top: -50px;
  font-size: 18rem;
  font-family: 'Asimovian', sans-serif;
  color: transparent;
  -webkit-text-stroke: 2px rgba(255, 255, 255, 0.4); 
  z-index: 0;
  pointer-events: none;
  
  @media (max-width: 992px) {
    right: 20px;
    transform: none;
    top: -10px;
    font-size: 10rem;
    opacity: 0.2 !important;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const Divider = styled(motion.div)`
  width: 2px;
  height: 250px;
  background: linear-gradient(to bottom, transparent, #7B1F2E, transparent);
  margin: 0 60px;
  
  @media (max-width: 992px) {
    display: none;
  }
`;

const RightSide = styled(motion.div)`
  flex: 1.2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: left;
  }
`;

const CheckIcon = styled(motion.create(FaCheckCircle))`
  color: #d94a5e;
  font-size: 1.8rem;
  flex-shrink: 0;
`;

const FeatureItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const FeatureText = styled.span`
  font-size: 1.1rem;
  font-family: 'Inter', sans-serif;
  color: #eee;
  line-height: 1.4;
`;

const FooterText = styled(motion.div)`
  text-align: center;
  font-family: 'Inter', sans-serif;
  font-size: 1.8rem;
  color: #fff;
  margin-top: 60px;
  
  span {
    color: #d94a5e;
    font-weight: bold;
    display: inline-block;
    position: relative;
    cursor: pointer;
    text-decoration: none;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 0;
      width: 100%;
      height: 2px;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`;

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 }
};

const JoinSection = () => {
  const navigate = useNavigate();
  const items = [
    { text: "Students exploring digital careers" },
    { text: "Aspiring freelancers and developers" },
    { text: "Beginners entering tech and design fields" },
    { text: "Young adults seeking skill-based education" },
  ];

  return (
    <Section>
      <Container>
        <UpperContent>
          <LeftSide
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <JoinText whileHover={{ scale: 1.02 }}>
              <span>Who Can</span>
              <strong>JOIN</strong>
            </JoinText>
            <Tagline>Made for Ambitious Learners</Tagline>
            
            <LargeQuestionMark
              animate={{ 
                y: [0, -15, 0],
                rotate: [0, 2, 0]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              whileInView={{ 
                stroke: "rgba(123, 31, 46, 0.8)",
                opacity: 0.8
              }}
            >?</LargeQuestionMark>
          </LeftSide>
          
          <Divider 
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          />
          
          <RightSide
            variants={listVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {items.map((item, index) => (
              <FeatureItem 
                key={index} 
                variants={itemVariants}
                whileHover={{ x: 10 }}
              >
                <CheckIcon whileHover={{ scale: 1.2 }} />
                <FeatureText>{item.text}</FeatureText>
              </FeatureItem>
            ))}
          </RightSide>
        </UpperContent>
        
        <FooterText
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          If you're serious about your future,<br />
          <motion.span 
            onClick={() => navigate('/inquiry')}
            whileHover={{ scale: 1.01, textShadow: "0 0 10px rgba(123, 31, 46, 0.1)" }}
          >
            Deepskills
          </motion.span> is for you.
        </FooterText>
      </Container>
    </Section>
  );
};

export default JoinSection;
