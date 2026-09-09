import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import GlowCard from './GlowCard';

const CardContainer = styled(motion.div)`
  margin: 10px;
  height: 100%;
`;

const ContentBox = styled.div`
  background: #7B1F2E;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 180px;
  
  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const ImageSection = styled.div`
  flex: 0 0 40%;
  position: relative;
  overflow: hidden;
  border-right: 2px solid rgba(255, 255, 255, 0.2);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  ${CardContainer}:hover & img {
    transform: scale(1.1);
  }

  @media (max-width: 900px) {
    height: 200px;
    flex: none;
    border-right: none;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }
`;

const TextSection = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: left;

  @media (max-width: 900px) {
    padding: 20px 15px;
    text-align: center;
    align-items: center;
  }
`;

const Title = styled.h3`
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 10px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  text-transform: uppercase;

  @media (max-width: 900px) {
    font-size: 1.3rem;
  }
`;

const Description = styled.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
`;

const AwardsCard = ({ image, title, description }) => {
  return (
    <CardContainer whileHover={{ y: -5 }}>
      <GlowCard borderRadius="12px">
        <ContentBox>
          <ImageSection>
            <img src={image} alt={title} />
          </ImageSection>
          <TextSection>
            <Title>{title}</Title>
            <Description>{description}</Description>
          </TextSection>
        </ContentBox>
      </GlowCard>
    </CardContainer>
  );
};

export default AwardsCard;
