import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue } from 'framer-motion';
import graphicsOutBg from '../assets/graphics-out.png';

import brandIdentityImg from '../assets/brand-identity.svg';
import socialMediaImg from '../assets/social-media.svg';
import photoEditingImg from '../assets/photo-editing.svg';
import uiDesignImg from '../assets/ui-design.svg';
import portfolioImg from '../assets/portfolio.svg';
import graphicRolesImg from '../assets/graphic-roles.svg';
import freelancingImg from '../assets/freelancing.svg';

const SectionContainer = styled.section`
  width: 100%;
  padding: 40px 0;
  background: url(${graphicsOutBg});
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(147, 51, 234, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(147, 51, 234, 0.05) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    z-index: 2;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 800;
  color: #9333EA;
  margin-bottom: 40px;
  text-align: center;
  text-shadow: 0 0 20px rgba(147, 51, 234, 0.3);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const OutcomesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
`;

const OutcomeCard = styled(motion.div)`
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  height: 280px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
    opacity: 0;
    transition: 0.3s;
  }

  &:hover::after {
    opacity: 1;
  }
`;

const CardTop = styled.div`
  background-color: #555;
  background-image: ${props => props.$bgImage ? `url(${props.$bgImage})` : 'none'};
  background-size: cover;
  background-position: center;
  height: 140px;
  width: 100%;
  transition: 0.3s;

  ${OutcomeCard}:hover & {
    filter: brightness(1.1);
  }
`;

const CardBottom = styled.div`
  background: #e5e5e5;
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  p {
    color: #000;
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.4;
    margin: 0;
  }
`;

const Underline = styled.div`
  width: 100%;
  height: 2px;
  background: #555;
  opacity: 0.3;
  margin-top: 5px;
`;

const GraphicOutcomes = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    mouseX.set(x);
    mouseY.set(y);
    currentTarget.style.setProperty('--mouse-x', `${(x / currentTarget.offsetWidth) * 100}%`);
    currentTarget.style.setProperty('--mouse-y', `${(y / currentTarget.offsetHeight) * 100}%`);
  };

  const outcomes = [
    { text: "Design professional logos and brand identities independently", image: brandIdentityImg },
    { text: "Create high-quality social media and marketing creatives", image: socialMediaImg },
    { text: "Perform advanced photo editing and manipulation", image: photoEditingImg },
    { text: "Design complete website and mobile app interfaces", image: uiDesignImg },
    { text: "Build a strong, portfolio-ready project collection", image: portfolioImg },
    { text: "Qualify for roles such as Graphic, Visual, UI or Social Media Designer", image: graphicRolesImg },
    { text: "Start freelancing and handle real client projects confidently", image: freelancingImg }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  return (
    <SectionContainer onMouseMove={handleMouseMove}>
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Learning outcomes
        </SectionTitle>

        <OutcomesGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {outcomes.map((outcome, index) => (
            <OutcomeCard
              key={index}
              variants={cardVariants}
              whileHover={{
                y: -10,
                rotateX: 5,
                rotateY: index % 2 === 0 ? 5 : -5,
                boxShadow: "0 20px 40px rgba(147, 51, 234, 0.2)"
              }}
            >
              <CardTop $bgImage={outcome.image} />
              <CardBottom>
                <p>{outcome.text}</p>
                <Underline />
              </CardBottom>
            </OutcomeCard>
          ))}
        </OutcomesGrid>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default GraphicOutcomes;
