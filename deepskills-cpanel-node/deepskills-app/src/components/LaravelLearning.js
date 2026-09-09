import React from 'react';
import styled from 'styled-components';
import { motion, useMotionValue } from 'framer-motion';
import { FaDesktop, FaCog, FaLink, FaLaravel } from 'react-icons/fa';

const SectionContainer = styled.section`
  width: 100%;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: #000;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(0, 229, 255, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 229, 255, 0.04) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    -webkit-mask-image: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 45%);
    z-index: 1;
  }
`;

const Spotlight = styled(motion.div)`
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(137, 243, 255, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.6rem;
  font-weight: 800;
  color: #89F3FF;
  margin-bottom: 80px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const LearningGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  width: 100%;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const LearningCard = styled(motion.div)`
  background: #111;
  border-radius: 12px;
  padding: 35px 25px;
  text-align: left;
  display: flex;
  flex-direction: column;
  min-height: 320px;
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  perspective: 1000px;

  &::before {
    content: '';
    position: absolute;
    top: -100%;
    left: -100%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.08) 45%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.08) 55%,
      transparent 100%
    );
    transition: 0s;
    transform: rotate(45deg);
    pointer-events: none;
    z-index: 5;
  }

  &:hover {
    background-color: ${props => props.hoverColor || '#89F3FF'};
    transform: translateY(-12px) rotateX(10deg) rotateY(-5deg);
    box-shadow: 0 30px 60px rgba(0, 229, 255, 0.2);
    border-color: transparent;
    
    &::before {
      transition: all 0.6s ease;
      top: 100%;
      left: 100%;
    }

    h3, p, li, svg, li::after {
      color: #ffffffff !important;
    }
    
    li::after {
      background-color: #ffffffff !important;
    }
  }
`;

const FloatingCode = styled(motion.div)`
  position: absolute;
  color: rgba(0, 229, 255, 0.06);
  font-family: 'Courier New', Courier, monospace;
  font-weight: 900;
  font-size: ${props => props.size || '3rem'};
  user-select: none;
  pointer-events: none;
  z-index: 1;
`;

const IconHeader = styled.div`
  font-size: 2.5rem;
  color: #fff;
  margin-bottom: 10px;
  transition: color 0.4s ease;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  color: ${props => props.titleColor || '#00E5FF'};
  font-weight: 800;
  margin-bottom: 10px;
  line-height: 1.2;
  transition: color 0.4s ease;
`;

const SkillList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  li {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    font-weight: 500;
    line-height: 1.2;
    padding-left: 20px;
    position: relative;
    transition: color 0.4s ease;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 6px;
      height: 6px;
      background-color: #fff;
      border-radius: 50%;
      transition: background-color 0.4s ease;
    }
  }
`;

const LaravelLearning = () => {
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

  const cards = [
    {
      icon: <FaDesktop />,
      title: "Frontend Development",
      titleColor: "#00E5FF",
      hoverColor: "#00E5FF",
      skills: [
        "HTML5 (semantic structure & professional layouts)",
        "CSS3, Flex box & Responsive Design",
        "Bootstrap 5 for modern UI",
        "JavaScript fundamentals & DOM manipulation",
        "Form validation & interactive features"
      ]
    },
    {
      icon: <FaCog />,
      title: "Backend Development (Core PHP)",
      titleColor: "#00E5FF",
      hoverColor: "#00E5FF",
      skills: [
        "PHP programming fundamentals",
        "Handling forms (GET & POST)",
        "Sessions & Cookies management",
        "File handling & validation",
        "Authentication system (Login/Register)"
      ]
    },
    {
      icon: <FaLink />,
      title: "Database & Integration",
      titleColor: "#00E5FF",
      hoverColor: "#00E5FF",
      skills: [
        "MySQL database concepts",
        "Tables, relationships & SQL queries",
        "Database connectivity with PHP",
        "CRUD operations",
        "User management systems"
      ]
    },
    {
      icon: <FaLaravel />,
      title: "Laravel Framework",
      titleColor: "#00E5FF",
      hoverColor: "#00E5FF",
      skills: [
        "MVC architecture",
        "Routes & Controllers",
        "Blade templates",
        "Migrations & Eloquent ORM",
        "Authentication & Middleware",
        "File uploads, pagination & filters"
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 80, damping: 15 }
    }
  };

  return (
    <SectionContainer onMouseMove={handleMouseMove}>
      <Spotlight style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }} />
      
      <FloatingCode size="6rem" style={{ top: '15%', left: '2%' }} animate={{ y: [0, 50, 0], opacity: [0.03, 0.08, 0.03] }} transition={{ duration: 7, repeat: Infinity }}>$laravel</FloatingCode>
      <FloatingCode size="4rem" style={{ bottom: '15%', left: '8%' }} animate={{ rotate: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity }}>Eloquent</FloatingCode>
      <FloatingCode size="5rem" style={{ top: '10%', right: '5%' }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 10, repeat: Infinity }}>Blade</FloatingCode>
      <FloatingCode size="3.5rem" style={{ bottom: '10%', right: '10%' }} animate={{ x: [0, -30, 0] }} transition={{ duration: 8, repeat: Infinity }}>Route::</FloatingCode>

      <ContentWrapper>
        <SectionTitle
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          What You'll Learn
        </SectionTitle>
        <LearningGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {cards.map((card, index) => (
            <LearningCard 
              key={index}
              hoverColor={card.hoverColor}
              variants={cardVariants}
            >
              <IconHeader>{card.icon}</IconHeader>
              <CardTitle titleColor={card.titleColor}>{card.title}</CardTitle>
              <SkillList>
                {card.skills.map((skill, i) => (
                  <li key={i}>{skill}</li>
                ))}
              </SkillList>
            </LearningCard>
          ))}
        </LearningGrid>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default LaravelLearning;
