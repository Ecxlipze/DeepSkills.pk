import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import GlowCard from './GlowCard';

const CardContainer = styled(motion.div)`
  margin: 10px 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const ContentBox = styled.div`
  background: #7B1F2E;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 220px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
  
  @media (max-width: 900px) {
    flex-direction: column;
    height: auto;
    min-height: 360px;
  }
`;

const ImageSection = styled.div`
  flex: 0 0 42%;
  width: 42%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-right: 2px solid rgba(255, 255, 255, 0.15);
  background: #111;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
  }

  ${CardContainer}:hover & img {
    transform: scale(1.08);
  }

  @media (max-width: 900px) {
    width: 100%;
    height: 190px;
    flex: none;
    border-right: none;
    border-bottom: 2px solid rgba(255, 255, 255, 0.15);
  }
`;

const TextSection = styled.div`
  flex: 1;
  height: 100%;
  padding: 24px 22px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: left;
  box-sizing: border-box;

  @media (max-width: 900px) {
    padding: 20px 16px;
    text-align: center;
    align-items: center;
    height: auto;
  }
`;

const Title = styled.h3`
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0 0 10px;
  color: #fff;
  font-family: 'Asimovian', 'Inter', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 900px) {
    font-size: 1.15rem;
  }
`;

const Description = styled.p`
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-family: 'Inter', sans-serif;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 900px) {
    font-size: 0.85rem;
  }
`;

const AwardsCard = ({ image, title, description }) => {
  return (
    <CardContainer whileHover={{ y: -4 }}>
      <GlowCard borderRadius="14px">
        <ContentBox>
          <ImageSection>
            <img src={image} alt={title || 'DeepSkills Award'} loading="lazy" />
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
