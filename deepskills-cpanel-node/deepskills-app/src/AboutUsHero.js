import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { FaBook, FaPlayCircle } from "react-icons/fa";

// Import asset
import aboutBg from "./assets/aboutus-bg.png";

const Section = styled.section`
  background-color: #000;
  background-image: url(${aboutBg});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 50px 20px;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    background-position: 70% center; // Focus on the illustrated part
    padding: 40px 15px;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 100%);
    pointer-events: none;
  }
`;

const ContentWrapper = styled(motion.div)`
  position: relative;
  z-index: 5;
  text-align: center;
  max-width: 1200px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MainHeading = styled(motion.h1)`
  font-family: 'Inter', sans-serif;
  font-size: 6.5rem;
  font-weight: 900;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 25px;
  flex-wrap: nowrap; // Force one line on desktop
  line-height: 1.1;
  margin-bottom: 40px;
  letter-spacing: -2px;
  width: 100%;

  span.dot {
    color: #ffffffff; // Maroon dot for pop
    font-size: 5rem;
    line-height: 1;
    display: flex;
    align-items: center;
  }

  span.develop {
    -webkit-text-stroke: 1.5px #7B1F2E;
    color: transparent;
    transition: all 0.3s ease;
    &:hover {
      color: rgba(123, 31, 46, 0.2);
    }
  }

  @media (max-width: 1200px) {
    font-size: 5.5rem;
    gap: 20px;
  }

  @media (max-width: 1024px) {
    font-size: 4.5rem;
    gap: 15px;
    span.dot { font-size: 2.5rem; }
  }

  @media (max-width: 768px) {
    font-size: 3.2rem;
    flex-direction: column; // Stack on mobile
    gap: 5px;
    span.dot { display: none; }
    letter-spacing: -1px;
    margin-bottom: 30px;
  }

  @media (max-width: 480px) {
    font-size: 2.5rem;
  }
`;

const Description = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  max-width: 850px;
  margin: 0 auto;
  font-size: 1.2rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 400;
  text-align: center; // Ensure centering

  span {
    color: #fff;
    font-weight: 700;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 0 10px;
    max-width: 95%; // Slight reduction for better centering feel
    margin: 0 auto;
  }
`;

const Particle = styled(motion.div)`
  position: absolute;
  color: #2ecc71;
  font-size: 1.5rem;
  font-weight: bold;
  pointer-events: none;
  z-index: 1;
  opacity: 0.4;
`;

const TechIcon = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 2;
  font-size: 2.5rem;
  color: ${props => props.$color || "#fff"};
  filter: drop-shadow(0 0 10px ${props => props.$color || "#fff"}44);
`;

const BulbGlow = styled(motion.div)`
  position: absolute;
  top: 15%;
  right: 38%;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 230, 0, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;

  @media (max-width: 768px) {
    width: 120px;
    height: 120px;
    right: 25%;
    top: 10%;
  }
`;

const MoneyParticles = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        initialX: Math.random() * window.innerWidth,
        initialY: Math.random() * window.innerHeight,
        y: Math.random() * -100 - 100,
        x: (Math.random() - 0.5) * 100,
        rotate: Math.random() * 360,
        duration: Math.random() * 5 + 5,
        delay: Math.random() * 5
      }))
    );
  }, []);

  return (
    <>
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          initial={{ 
            x: particle.initialX,
            y: particle.initialY,
            opacity: 0 
          }}
          animate={{ 
            y: [null, particle.y],
            x: [null, particle.x],
            opacity: [0, 0.3, 0],
            rotate: [0, particle.rotate]
          }}
          transition={{ 
            duration: particle.duration,
            repeat: Infinity, 
            ease: "linear",
            delay: particle.delay
          }}
        >
          $
        </Particle>
      ))}
    </>
  );
};

const AboutUsHero = () => {
  const [isTouch, setIsTouch] = React.useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Initialize with enough damping to avoid "jump" on first move
  const springX = useSpring(mouseX, { damping: 40, stiffness: 100 });
  const springY = useSpring(mouseY, { damping: 40, stiffness: 100 });

  // Use a range that assumes 0 is center for transform
  // We'll set mouseX/Y to center on mount
  const moveX = useTransform(springX, (val) => isTouch ? 0 : val * 0.03);
  const moveY = useTransform(springY, (val) => isTouch ? 0 : val * 0.03);

  const iconMoveX = useTransform(springX, (val) => isTouch ? 0 : val * 0.06);
  const iconMoveY = useTransform(springY, (val) => isTouch ? 0 : val * 0.06);

  useEffect(() => {
    // Check for touch device
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const handleMouseMove = (e) => {
      // Calculate offset from center
      const x = e.clientX - window.innerWidth / 2;
      const y = e.clientY - window.innerHeight / 2;
      mouseX.set(x);
      mouseY.set(y);
    };

    if (!('ontouchstart' in window)) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const words = [
    { text: "DESIGN", type: "solid" },
    { text: "DEVELOP", type: "outline" },
    { text: "EARN", type: "solid" }
  ];

  return (
    <Section id="about-hero">
      <MoneyParticles />
      
      <BulbGlow 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Decorative Parallax Icons (Floating over original BG) */}
      <TechIcon 
        style={{ x: iconMoveX, y: iconMoveY, top: "20%", left: "15%" }}
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        $color="#7B1F2E"
      >
        <FaBook style={{ opacity: 0.3 }} />
      </TechIcon>

      <TechIcon 
        style={{ x: iconMoveX, y: iconMoveY, bottom: "25%", right: "15%" }}
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        $color="#fff"
      >
        <FaPlayCircle style={{ opacity: 0.2 }} />
      </TechIcon>

      <ContentWrapper style={{ x: moveX, y: moveY }}>
        <MainHeading>
          {words.map((word, index) => (
            <React.Fragment key={word.text}>
              <motion.span
                className={word.type === "outline" ? "develop" : ""}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: index * 0.15, 
                  duration: 0.8,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ scale: 1.08, color: "#fff" }}
              >
                {word.text}
              </motion.span>
              {index < words.length - 1 && (
                <span className="dot">·</span>
              )}
            </React.Fragment>
          ))}
        </MainHeading>

        <Description
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 1 }}
        >
          <span>Deepskills</span> is a learning space for students and young adults who want to
          learn practical skills, feel confident, and build a strong future.
          We know how confusing it can be to choose a career or skill path. That's why
          <span> Deepskills</span> focuses on clear, hands-on learning, so you don't just study, you
          actually learn how to create, build, and grow.
        </Description>
      </ContentWrapper>
    </Section>
  );
};

export default AboutUsHero;
