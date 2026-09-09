import React, { useEffect } from "react";
import styled from "styled-components";
import Head from "next/head";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { FaReact, FaNodeJs, FaPhp, FaPython } from "react-icons/fa";
import { SiMongodb, SiAdobephotoshop } from "react-icons/si";
import RegisterButton from "./components/RegisterButton";

// Import assets
import heroBg from "./assets/hero-bg.png";
import btnIcon from "./assets/btn-icon.svg";

const Section = styled.section`
  background-color: #000;
  background-image: 
    linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
    url(${heroBg});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 90px 20px 20px;
  text-align: center;
  color: #fff;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 100px 20px 60px;
    min-height: 80vh;
  }
`;

const CodeParticle = styled(motion.div)`
  position: absolute;
  color: #00ff9d;
  font-size: 1.2rem;
  font-weight: 700;
  pointer-events: none;
  z-index: 1;
  opacity: 0.35;
`;

const TechIcon = styled(motion.div)`
  position: absolute;
  pointer-events: none;
  z-index: 1;
  font-size: 2.4rem;
  color: ${props => props.$color || "#ffffff"};
  filter: drop-shadow(0 0 14px ${props => props.$color || "#ffffff"}44);
  opacity: 0.55;

  @media (max-width: 768px) {
    font-size: 1.9rem;
    opacity: 0.45;
    display: none; // Hide floating icons on mobile for speed and to prevent overflow
  }
`;

const ContentWrapper = styled(motion.div)`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1000px;
  width: 100%;
`;

const Heading = styled(motion.h1)`
  font-family: 'Asimovian', sans-serif;
  font-size: 5rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 24px;
  color: #fff;
  letter-spacing: -1px;

  @media (max-width: 1024px) {
    font-size: 4rem;
  }
  @media (max-width: 768px) {
    font-size: 3rem;
  }
  @media (max-width: 480px) {
    font-size: 2.2rem;
    br { display: none; }
  }
`;

const Tagline = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #FF0000;
  text-transform: none;
  letter-spacing: 0.5px;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const Divider = styled(motion.div)`
  width: 100%;
  max-width: 800px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.9), transparent);
  margin-bottom: 5px;
`;

const Description = styled(motion.p)`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  line-height: 1.6;
  color: #E0E0E0;
  margin-bottom: 45px;
  max-width: 750px;
  font-weight: 400;

  span {
    color: #fff;
    font-weight: 800;
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    max-width: 90%;
  }
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 600px;
  
  @media (max-width: 480px) {
    gap: 12px;
  }
`;



const CodeParticles = () => {
  const [particles, setParticles] = React.useState([]);

  React.useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    setParticles(
      Array.from({ length: isMobile ? 8 : 18 }, (_, i) => ({
        id: i,
        char: Math.random() > 0.5 ? "0" : "1",
        x: `${Math.random() * 95}%`,
        y: `${Math.random() * 100}%`,
        duration: Math.random() * 6 + 6,
        delay: Math.random() * 5
      }))
    );
  }, []);

  return (
    <>
      {particles.map((particle) => (
        <CodeParticle
          key={particle.id}
          initial={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
          }}
          animate={{
            y: [null, "-20%"],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "linear",
            delay: particle.delay,
          }}
        >
          {particle.char}
        </CodeParticle>
      ))}
    </>
  );
};

const DEFAULT_HERO_CONTENT = {
  heading: "Build Skills That Secure Your Future",
  tagline: "Industry-relevant digital skills designed to turn learners into professionals.",
  description: "At Deepskills, we equip young adults with practical, job-ready skills in design and web development, the skills that power today's digital economy. Design, develop and succeed!"
};

const HeroSection = ({ initialContent = null }) => {
  // Content arrives via getStaticProps (pages/index.js) so it is present in the
  // prerendered HTML; CMS edits reach the page through ISR/on-demand revalidation.
  const content = initialContent || DEFAULT_HERO_CONTENT;
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth <= 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  // Keep the first server and client render identical; real viewport values are
  // applied after hydration so Framer Motion does not create SSR mismatches.
  const initialX = 1000;
  const initialY = 600;

  const mouseX = useMotionValue(initialX);
  const mouseY = useMotionValue(initialY);

  const springConfig = { damping: 25, stiffness: 120 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Parallax values for main content
  const moveX = useTransform(springX, [0, 2000], [-15, 15]);
  const moveY = useTransform(springY, [0, 1200], [-15, 15]);

  // Slightly stronger parallax for background tech icons
  const iconMoveX = useTransform(springX, [0, 2000], [-25, 25]);
  const iconMoveY = useTransform(springY, [0, 1200], [-25, 25]);

  useEffect(() => {
    // Disable parallax on touch devices to avoid the initial shift and keep it centered
    if (window.matchMedia("(pointer: coarse)").matches) {
      mouseX.set(initialX);
      mouseY.set(initialY);
      return;
    }

    mouseX.set(window.innerWidth / 2);
    mouseY.set(window.innerHeight / 2);

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, initialX, initialY]);

  const renderHeading = (text) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };




  return (
    <>
      <Head>
        <link rel="preload" as="image" href={heroBg} fetchPriority="high" />
      </Head>
      <Section id="hero">
        <CodeParticles />

      {/* Tech-stacked floating icons */}
      <TechIcon
        style={{ x: iconMoveX, y: iconMoveY, top: "20%", left: "12%" }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        $color="#61DAFB"
      >
        <FaReact />
      </TechIcon>

      <TechIcon
        style={{ x: iconMoveX, y: iconMoveY, bottom: "18%", left: "15%" }}
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        $color="#3C873A"
      >
        <FaNodeJs />
      </TechIcon>

      <TechIcon
        style={{ x: iconMoveX, y: iconMoveY, top: "25%", right: "12%" }}
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        $color="#3776AB"
      >
        <FaPython />
      </TechIcon>

      <TechIcon
        style={{ x: iconMoveX, y: iconMoveY, bottom: "20%", right: "15%" }}
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
        $color="#777BB4"
      >
        <FaPhp />
      </TechIcon>

      <TechIcon
        style={{ x: iconMoveX, y: iconMoveY, top: "18%", right: "35%" }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        $color="#4DB33D"
      >
        <SiMongodb />
      </TechIcon>

      <TechIcon
        style={{ x: iconMoveX, y: iconMoveY, bottom: "14%", left: "40%" }}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        $color="#31A8FF"
      >
        <SiAdobephotoshop />
      </TechIcon>

      <ContentWrapper style={!isMobile ? { x: moveX, y: moveY } : {}}>
        <Heading>
          {renderHeading(content.heading)}
        </Heading>
        
        <Tagline>
          {content.tagline}
        </Tagline>

        <Divider 
          style={{ margin: "0 auto 30px" }}
        />
        
        <Description>
          {content.description}
        </Description>
        
        <ButtonGroup>
          <RegisterButton
            variant="primary"
            to="/courses"
            style={{ minWidth: isMobile ? "100%" : "220px" }}
          >
            <img src={btnIcon} alt="" style={{ width: "20px", height: "20px" }} />
            Explore Courses
          </RegisterButton>

          <RegisterButton
            to="/inquiry"
            variant="secondary"
            style={{ minWidth: isMobile ? "100%" : "220px" }}
          >
            <img src={btnIcon} alt="" style={{ width: "20px", height: "20px" }} />
            Inquire Now
          </RegisterButton>
        </ButtonGroup>
      </ContentWrapper>
      </Section>
    </>
  );
};

export default HeroSection;
