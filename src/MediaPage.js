import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import Slider from 'react-slick';
import MediaCard from './components/MediaCard';
import AwardsCard from './components/AwardsCard';
import RegisterButton from './components/RegisterButton';
import TheaterVideoModal from './components/TheaterVideoModal';

// Import assets
import featureBg from './assets/feature-bg.png';
import featureCard from './assets/feature-card.svg';
import dsTree from './assets/ds-tree.svg';
import awardsBg from './assets/awards-bg.png';
import awardsAsset from './assets/awards.svg';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  padding-top: 80px;
  background-color: #000;
  color: #fff;
  overflow-x: hidden;
  position: relative;
`;



const Spotlight = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  background: radial-gradient(
    600px circle at var(--x) var(--y),
    rgba(123, 31, 46, 0.1) 0%,
    transparent 80%
  );
`;

const Banner = styled.section`
  background: linear-gradient(135deg, #7B1F2E 0%, #3d0f17 100%);
  padding: 50px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
  position: relative;
  overflow: hidden;

  h1 {
    font-size: 4rem;
    font-weight: 900;
    margin: 0;
    font-family: 'Inter', sans-serif;
    position: relative;
    z-index: 2;
    background: linear-gradient(to bottom, #fff, #ffccd5);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  p {
    font-size: 1.25rem;
    max-width: 800px;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
    position: relative;
    z-index: 2;
  }

  @media (max-width: 768px) {
    padding: 50px 20px;
    h1 { font-size: 2.2rem; }
    p { font-size: 0.8rem; }
  }
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '400px'};
  height: ${props => props.size || '400px'};
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
  z-index: 1;
`;

const FeaturedSection = styled.section`
  position: relative;
  padding: 50px 20px;
  text-align: center;
  overflow: hidden;
`;

const ParallaxBg = styled(motion.div)`
  position: absolute;
  inset: -10%;
  background-image: url(${featureBg});
  background-size: 100% 100%;
  background-position: center;
  z-index: 1;
  opacity: 1;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%);
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionHeader = styled(motion.div)`
  margin-bottom: 50px;

  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 15px;
    color: #fff;
    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }

  .description {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.6);
    max-width: 750px;
    margin: 0 auto;
    line-height: 1.6;
  }
`;

const CardGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 50px;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-width: 600px;
    margin: 0 auto;
  }
`;

const WhyChooseSection = styled.section`
  padding: 50px 20px;
  background: radial-gradient(circle at top right, rgba(123, 31, 46, 0.5) 0%, transparent 60%),
              radial-gradient(circle at bottom left, rgba(123, 31, 46, 0.5) 0%, transparent 50%);
  text-align: center;
  position: relative;
  overflow: hidden;

  h2 {
    font-size: 2rem;
    font-weight: 900;
    margin-bottom: 10px;
    letter-spacing: -1px;
    background: linear-gradient(to right, #fff, #ffccd5);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    font-size: 1.25rem;
    color: rgba(255, 255, 255, 0.7);
    max-width: 800px;
    margin: 0 auto 60px;
    line-height: 1.6;
  }

  .tree-container {
    max-width: 1000px;
    margin: 0 auto;
    position: relative;
    
    img {
      width: 100%;
      height: auto;
      filter: drop-shadow(0 0 30px rgba(123, 31, 46, 0.5));
    }
  }
`;

const AwardsSection = styled.section`
  padding: 40px 20px;
  position: relative;
  background-image: url(${awardsBg});
  background-size: cover;
  background-position: center;
  text-align: center;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  ${ContentWrapper} {
    z-index: 2;
  }

  .slick-slider {
    margin-top: 40px;
    width: 100%;
    overflow: hidden;
  }
  
  .slick-slide {
    padding: 0 15px;
    box-sizing: border-box;
  }
`;



const VideoSection = styled.section`
  padding: 40px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;

  .register-btn-container {
    margin-top: 60px;
    display: flex;
    justify-content: center;
  }
`;

const StayUpdatedSection = styled.section`
  padding: 40px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const VideoModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const VideoModalContent = styled(motion.div)`
  background: #151515;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  width: 100%;
  max-width: 860px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(123, 31, 46, 0.3);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    background: #e63946;
    border-color: #e63946;
    transform: scale(1.1);
  }
`;

const VideoPlayerContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;

  iframe, video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
`;

const VideoModalDetails = styled.div`
  padding: 20px 24px;
  background: #181818;

  h3 {
    margin: 0 0 6px;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    font-family: 'Inter', sans-serif;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
  }
`;

const getYouTubeId = (url) => {
  if (typeof url !== 'string') return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
};

const MediaPage = ({ initialItems = [] }) => {
  const [activeVideo, setActiveVideo] = useState(null);
  const { scrollYProgress } = useScroll();
  // Items arrive via getStaticProps (pages/media.js) so the gallery is present
  // in the prerendered HTML; CMS edits reach the page through revalidation.
  const items = Array.isArray(initialItems) ? initialItems : [];
  
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, 200]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveVideo(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const circleX = useTransform(smoothMouseX, [0, 1920], [50, -50]);
  const circleY = useTransform(smoothMouseY, [0, 1080], [50, -50]);

  const bannerX = useTransform(smoothMouseX, [0, 1920], [-30, 30]);
  const bannerY = useTransform(smoothMouseY, [0, 1080], [-30, 30]);

  const spotlightX = useMotionValue("0px");
  const spotlightY = useMotionValue("0px");

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      spotlightX.set(`${e.clientX}px`);
      spotlightY.set(`${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, spotlightX, spotlightY]);

  const groupByType = (type) => items.filter(i => i.type === type);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const sliderSettings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 5000,
    slidesToShow: 2,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    pauseOnHover: false,
    pauseOnFocus: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          autoplaySpeed: 3000,
          speed: 800,
          cssEase: "ease-out",
          pauseOnHover: true
        }
      }
    ]
  };

  return (
    <>
      <PageContainer>
      <Spotlight style={{ '--x': spotlightX, '--y': spotlightY }} />

      <Banner>
        <FloatingShape 
          size="600px" 
          style={{ top: '-20%', left: '-10%', x: circleX, y: circleY }} 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <FloatingShape 
          size="500px" 
          style={{ bottom: '-10%', right: '-5%', x: bannerX, y: bannerY }} 
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        <motion.h1
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: "easeOut" }}
          whileHover={{ scale: 1.02 }}
        >
          DeepSkills Media
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        >
          Welcome to the DeepSkill Media Page! Here, you can explore our latest updates, 
          student projects, and tutorials in web development. Stay inspired and learn from 
          our community through images, videos, and news updates.
        </motion.p>
      </Banner>

      <FeaturedSection>
        <ParallaxBg style={{ y: yParallax }} />
        
        <ContentWrapper>
          <SectionHeader
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2>Featured Projects & Moments</h2>
            <p className="description">
              Explore hands-on student projects, creative portfolios, and modern web applications built at DeepSkills.
            </p>
          </SectionHeader>

          <CardGrid
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            animate="visible"
            viewport={{ once: true, margin: "0px" }}
          >
            {groupByType('project').length > 0 ? (
              groupByType('project').map((item) => (
                <MediaCard
                  key={item.id}
                  variants={itemVariants}
                  image={item.media_url || featureCard}
                  title={item.title}
                />
              ))
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', gridColumn: 'span 2', padding: '20px' }}>
                Featured student projects will appear here soon.
              </div>
            )}
          </CardGrid>
        </ContentWrapper>
      </FeaturedSection>

      <WhyChooseSection>
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          WHY CHOOSE DEEPSKILLS
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Practical curriculum, industry mentorship, and real portfolio-driven skill development.
        </motion.p>
        <div className="tree-container">
          <motion.img 
            src={dsTree} 
            alt="DeepSkills Path" 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "backOut" }}
          />
        </div>
      </WhyChooseSection>

      <StayUpdatedSection>
        <ParallaxBg style={{ y: yParallax }} />
        <ContentWrapper>
          <SectionHeader
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2>Stay Updated</h2>
            <p className="description">
              Catch the latest workshops, community sessions, and announcements from our learning institute.
            </p>
          </SectionHeader>

          <CardGrid
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {groupByType('stay_updated').length > 0 ? (
              groupByType('stay_updated').map((item) => (
                <MediaCard 
                  key={item.id}
                  variants={itemVariants}
                  image={item.media_url || featureCard} 
                  title={item.title} 
                />
              ))
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', gridColumn: 'span 2', padding: '20px' }}>
                Latest updates will appear here soon.
              </div>
            )}
          </CardGrid>
        </ContentWrapper>
      </StayUpdatedSection>

      <AwardsSection>
        <ContentWrapper>
          <SectionHeader
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2>AWARDS</h2>
            <p className="description">
              Celebrating outstanding excellence, dedication, and creative achievements of our learners and mentors.
            </p>
          </SectionHeader>

          {groupByType('award').length > 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <Slider {...sliderSettings}>
                {groupByType('award').map(item => (
                  <AwardsCard 
                    key={item.id}
                    image={item.media_url || awardsAsset}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </Slider>
            </motion.div>
          ) : (
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '20px' }}>
              Award highlights will appear here soon.
            </div>
          )}
        </ContentWrapper>
      </AwardsSection>

      <VideoSection>
        <ParallaxBg style={{ y: yParallax }} />
        <ContentWrapper>
          <SectionHeader
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2>Learn Through Videos</h2>
            <p className="description">
              Watch practical classroom sessions, coding walkthroughs, and skill tutorials.
            </p>
          </SectionHeader>

          <CardGrid
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {groupByType('learn').length > 0 ? (
              groupByType('learn').map(item => (
                <MediaCard 
                  key={item.id}
                  variants={itemVariants}
                  image={item.media_url || featureCard} 
                  title={item.title} 
                  isVideo={true}
                  onClick={() => {
                    if (item.media_url) {
                      setActiveVideo(item);
                    }
                  }}
                  style={{ cursor: item.media_url ? 'pointer' : 'default' }}
                />
              ))
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', gridColumn: 'span 2', padding: '20px' }}>
                Video tutorials and sessions will appear here soon.
              </div>
            )}
          </CardGrid>

          <motion.div 
            className="register-btn-container"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <RegisterButton />
          </motion.div>
        </ContentWrapper>
      </VideoSection>

      {activeVideo && (
        <VideoModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setActiveVideo(null)}
        >
          <VideoModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton onClick={() => setActiveVideo(null)} aria-label="Close video player">
              ✕
            </CloseButton>
            <VideoPlayerContainer>
              {getYouTubeId(activeVideo.media_url) ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(activeVideo.media_url)}?autoplay=1&rel=0`}
                  title={activeVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideo.media_url}
                  controls
                  autoPlay
                  playsInline
                />
              )}
            </VideoPlayerContainer>
            <VideoModalDetails>
              <h3>{activeVideo.title}</h3>
              {activeVideo.description && <p>{activeVideo.description}</p>}
            </VideoModalDetails>
          </VideoModalContent>
        </VideoModalOverlay>
      )}
      </PageContainer>
    </>
  );
};

export default MediaPage;
