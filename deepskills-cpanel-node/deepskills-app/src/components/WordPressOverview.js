import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaHourglassHalf, FaRegClock, FaUsers, FaChessKnight } from 'react-icons/fa';

const SectionContainer = styled.div`
  width: 100%;
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 800;
  color: #275D8F;
  margin-bottom: 40px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Banner = styled(motion.div)`
  width: 100%;
  background: #fff;
  padding: 40px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.2), 0 10px 30px rgba(0,0,0,0.2);
`;

const BannerContent = styled.div`
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0 20px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 40px;
  }

  @media (max-width: 600px) {
    display: flex;
    flex-direction: column;
    gap: 30px;
    padding: 0 40px;
  }
`;

const InfoItem = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  color: #333;
  padding: 10px;
  
  /* Vertical dividers for Desktop */
  border-right: 1px solid #525252ff;

  &:nth-child(4n) {
    border-right: none;
  }

  @media (max-width: 1024px) {
    border-right: 1px solid #ddd;
    &:nth-child(2n) {
      border-right: none;
    }
    /* Add subtle bottom border for top row items */
    &:nth-child(-n+2) {
      border-bottom: 1px solid #eee;
    }
    padding: 20px 10px;
  }

  @media (max-width: 600px) {
    border-right: none;
    border-bottom: 1px solid #eee;
    padding: 25px 0;
    width: 100%;

    &:last-child {
      border-bottom: none;
    }
  }
`;

const ItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  width: 280px; /* Rigorous fixed width for absolute uniformity */
  text-align: left;

  @media (max-width: 1100px) {
    width: 240px;
  }

  @media (max-width: 600px) {
    width: 260px;
    margin: 0 auto; /* Center the fixed block on mobile */
  }

  @media (max-width: 380px) {
    width: 100%;
    max-width: 260px;
    padding-left: 20px;
  }
`;

const IconWrapper = styled(motion.div)`
  font-size: 2.2rem;
  color: #275D8F;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
`;

const TextWrapper = styled.div`
  display: flex;
  flex-direction: column;
  
  h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: #275D8F;
  }
  
  p {
    margin: 4px 0 0;
    font-size: 0.9rem;
    color: #275D8F;
    font-weight: 600;
  }
`;

const WordPressOverview = () => {
  const items = [
    {
      icon: <FaHourglassHalf />,
      title: "Duration",
      desc: "2.5 Months (10 Weeks)"
    },
    {
      icon: <FaRegClock />,
      title: "Daily Time",
      desc: "1.5 - 2 Hours"
    },
    {
      icon: <FaUsers />,
      title: "Classes",
      desc: "5 Days / Week"
    },
    {
      icon: <FaChessKnight />,
      title: "Approach",
      desc: "No-Code + Light Technical Skills"
    }
  ];

  return (
    <SectionContainer>
      <SectionTitle
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        Course Overview
      </SectionTitle>
      
      <Banner
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <BannerContent>
          {items.map((item, index) => (
            <InfoItem 
              key={index}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ItemContent>
                <IconWrapper>{item.icon}</IconWrapper>
                <TextWrapper>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </TextWrapper>
              </ItemContent>
            </InfoItem>
          ))}
        </BannerContent>
      </Banner>
    </SectionContainer>
  );
};

export default WordPressOverview;
