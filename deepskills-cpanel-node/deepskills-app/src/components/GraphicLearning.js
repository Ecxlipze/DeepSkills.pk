import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue } from 'framer-motion';
import { FaPalette, FaBriefcase } from 'react-icons/fa';

const SectionContainer = styled.section`
  width: 100%;
  padding: 40px 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(147, 51, 234, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(147, 51, 234, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 50%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 50%);
    z-index: 1;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;

  @media (max-width: 768px) {
    padding: 0 20px;
  }
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.6rem;
  font-weight: 800;
  color:#9333EA;
  margin-bottom: 50px;
  text-align: center;
  text-shadow: 0 0 20px rgba(147, 51, 234, 0.3);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const LearningGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
  width: 100%;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 30px;
  }
`;

const CardWrapper = styled(motion.div)`
  position: relative;
  perspective: 1000px;
`;

const GlowBubble = styled(motion.div)`
  position: absolute;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
`;

const LearningCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 40px;
  position: relative;
  z-index: 2;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  min-height: 400px;
  display: flex;
  flex-direction: column;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(147, 51, 234, 0.3);
    box-shadow: 0 25px 50px -12px rgba(147, 51, 234, 0.25);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(147, 51, 234, 0.05),
      transparent
    );
    transition: 0.5s;
    pointer-events: none;
  }

  &:hover::before {
    left: 100%;
  }

  @media (max-width: 768px) {
    min-height: auto;
    padding: 30px;
  }
`;

const Shine = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    transparent 0%,
    rgba(255, 255, 255, 0.05) 45%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 55%,
    transparent 100%
  );
  transform: translateX(-100%);
  pointer-events: none;
  z-index: 3;
`;

const SpotlightEffect = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%),
    rgba(147, 51, 234, 0.15) 0%,
    transparent 60%
  );
  opacity: 0;
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.5s ease;

  ${LearningCard}:hover & {
    opacity: 1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
`;

const TitleGroup = styled.div`
  h3 {
    color: #fff;
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    line-height: 1.2;
  }
`;

const SoftwareBadge = styled(motion.div)`
  padding: 12px;
  border-radius: 12px;
  color: #fff;
  font-weight: 900;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: rgba(147, 51, 234, 0.1);
  border: 1px solid rgba(147, 51, 234, 0.2);
  position: relative;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), transparent);
    opacity: 0.5;
  }
`;

const CurriculumnList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
`;

const ListItem = styled(motion.li)`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    color: #fff;
    transform: translateX(5px);
  }

  &::before {
    content: '•';
    color: #9333EA;
    font-size: 1.5rem;
    text-shadow: 0 0 10px rgba(147, 51, 234, 0.5);
  }
`;

const GraphicLearning = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleGlobalMouseMove = ({ currentTarget, clientX, clientY }) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    mouseX.set(x);
    mouseY.set(y);
    currentTarget.style.setProperty('--mouse-x', `${(x / currentTarget.offsetWidth) * 100}%`);
    currentTarget.style.setProperty('--mouse-y', `${(y / currentTarget.offsetHeight) * 100}%`);
  };

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    card.style.setProperty('--spotlight-x', `${x}%`);
    card.style.setProperty('--spotlight-y', `${y}%`);
  };

  const curriculum = [
    {
      title: "Adobe Illustrator",
      badge: "Ai",
      items: [
        "Vector graphics fundamentals",
        "Logo design & brand identity creation",
        "Typography & text manipulation",
        "Character & vector illustration",
        "Stationery & print design"
      ]
    },
    {
      title: "Adobe Photoshop",
      badge: "Ps",
      items: [
        "Photo editing & manipulation",
        "Color correction & adjustment layers",
        "Social media post design",
        "Product mockups & presentations",
        "Branding & marketing creatives"
      ]
    },
    {
      title: "UI/UX Design Basics",
      icon: <FaPalette />,
      items: [
        "User-centered design principles",
        "Wireframing & prototyping",
        "Web & mobile app interface design",
        "Design systems & typography"
      ]
    },
    {
      title: "Freelancing & Portfolio Development",
      icon: <FaBriefcase />,
      items: [
        "Freelance platform setup (Fiverr, Upwork, etc.)",
        "Writing winning proposals",
        "Client communication & project handling",
        "Building a professional design portfolio"
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 20 } }
  };

  const listVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 70, damping: 15 } }
  };

  return (
    <SectionContainer onMouseMove={handleGlobalMouseMove}>
      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          What You’ll Learn
        </SectionTitle>

        <LearningGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {curriculum.map((item, index) => (
            <CardWrapper key={index} variants={cardVariants}>
              <GlowBubble 
                style={{ top: '-40px', left: '-40px' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, delay: index * 0.5 }}
              />
              <LearningCard
                onMouseMove={handleCardMouseMove}
                whileHover={{ 
                  transform: `translateY(-10px) rotateX(${index % 2 === 0 ? '-2deg' : '2deg'}) rotateY(${index < 2 ? '2deg' : '-2deg'})`,
                }}
              >
                <Shine 
                  initial={{ translateX: "-100%" }}
                  whileHover={{ translateX: "100%" }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <SpotlightEffect />
                <CardHeader>
                  <TitleGroup>
                    <h3>{item.title}</h3>
                  </TitleGroup>
                  <SoftwareBadge
                    whileHover={{ scale: 1.15, rotate: [0, 5, -5, 0] }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {item.badge || item.icon}
                  </SoftwareBadge>
                </CardHeader>
                <CurriculumnList>
                  {item.items.map((li, i) => (
                    <ListItem 
                      key={i}
                      variants={listVariants}
                    >
                      {li}
                    </ListItem>
                  ))}
                </CurriculumnList>
              </LearningCard>
            </CardWrapper>
          ))}
        </LearningGrid>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default GraphicLearning;
