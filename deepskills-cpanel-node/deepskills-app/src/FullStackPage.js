import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from '../lib/nextRouterDomCompat';
import { useAuth } from './context/AuthContext';
import { FaUser, FaStar, FaUsers, FaProjectDiagram, FaWallet, FaClock, FaBriefcase, FaChalkboardTeacher, FaDatabase } from 'react-icons/fa';
import mernCard from './assets/mern-card.svg';
import mernProject from './assets/mern-project.svg';
import mernTree from './assets/mern-tree.svg';
import VideoReviews from './components/VideoReviews';
import WhyChooseUs from './components/WhyChooseUs';
import InstantDoubt from './components/InstantDoubt';
import CourseOutline from './components/CourseOutline';
import CourseRoadmap from './components/CourseRoadmap';
import CertifySection from './components/CertifySection';
import mernMap from './assets/mern-map.svg';
import CourseEnrollCard from './components/CourseEnrollCard';
import { getEnrollmentPath } from './utils/enrollmentNavigation';


const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #000;
  background: radial-gradient(circle at 20% 50%, rgba(151, 192, 73, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(123, 31, 46, 0.15) 0%, transparent 50%);
  color: #fff;
  padding-top: 100px;
  overflow-x: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-width: 968px) {
    padding-top: 80px;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 2;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 0 20px 60px;
  }
`;

const TextColumn = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Heading = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
  margin: 0;

  span {
    color: #97C049; /* Lime Green Highlight */
    display: block;
  }

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const SubHeading = styled.p`
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  max-width: 600px;
`;

const Description = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
  max-width: 600px;
  margin: 0;
`;

const StartButton = styled(motion.button)`
  background-color: #97C049;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  padding: 16px 40px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  width: fit-content;
  margin-top: 20px;
  box-shadow: 0 4px 15px rgba(151, 192, 73, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: 0.5s;
  }

  &:hover {
    background-color: #86aa40;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(151, 192, 73, 0.4);
    
    &::before {
      left: 100%;
    }
  }
`;

// CourseEnrollCard handles the card column and its internal styling

const FloatingShape = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '300px'};
  height: ${props => props.size || '300px'};
  border-radius: 50%;
  background: ${props => props.color || 'rgba(255,255,255,0.03)'};
  z-index: 1;
  pointer-events: none;
  filter: blur(30px);
  will-change: transform;
`;

// New Sections Styled Components
const SectionContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  color: #97C049;
  margin-bottom: 40px;
  font-weight: 700;
   @media (max-width: 1024px) {
    font-size: 2rem;
  }
`;

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const FeatureBox = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 15px;
  text-align: left;
  padding: 15px;
  border-radius: 12px;
  transition: background 0.3s ease;

  &:hover {
    background: rgba(151, 192, 73, 0.1);
  }
`;

const IconWrapper = styled(motion.div)`
  width: 50px;
  height: 50px;
  background: ${props => props.bg || '#fff'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #97C049;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
`;

const FeatureText = styled.div`
  display: flex;
  flex-direction: column;

  h4 {
    color: #fff;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  span {
    color: #aaa;
    font-size: 0.85rem;
    margin-top: 4px;
  }
`;

const LearningGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  width: 100%;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const LearningCard = styled(motion.div)`
  background: ${props => props.gradient};
  border-radius: 12px;
  padding: 40px 30px;
  text-align: left;
  position: relative;
  overflow: hidden;
  min-height: 350px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
`;

const LearningTitle = styled.h3`
  font-size: 1.5rem;
  color: ${props => props.color || '#fff'};
  margin-top: 0;
  margin-bottom: 30px;
  font-weight: 800;
  position: relative;
  padding-bottom: 10px;
  border-bottom: 2px solid ${props => props.color || '#fff'};
  z-index: 1;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const LearningList = styled.ul`
  list-style: none;
  padding: 0;

  li {
    margin-bottom: 15px;
    color: ${props => props.color || 'rgba(255,255,255,0.9)'};
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5;
    position: relative;
    padding-left: 20px;

    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: ${props => props.color || '#fff'};
      font-weight: bold;
    }
  }
`;

const CurriculumBanner = styled(motion.div)`
  width: 100%;
  background: #fff;
  padding: 40px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 30px;
  box-shadow: 0 0 30px rgba(0,0,0,0.5);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const InfoItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 20px;
  color: #333;
  
  /* Vertical divider except for last item */
  &:not(:last-child) {
    border-right: 1px solid #ddd;
    padding-right: 60px;
    
    @media (max-width: 768px) {
      border-right: none;
      padding-right: 0;
      width: 100%;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
    }
  }
`;

const BannerIcon = styled(motion.div)`
  font-size: 3rem;
  color: ${props => props.color || '#97C049'};
`;

const BannerText = styled.div`
  display: flex;
  flex-direction: column;
  
  h4 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    color: ${props => props.color || '#333'};
  }
  
  p {
    margin: 5px 0 0;
    font-size: 0.95rem;
    color: #666;
  }
`;

const FeaturesGrid = styled(motion.div)`
  background: #2a2a2a;
  border: 2px solid #97C049;
  border-radius: 30px;
  padding: 60px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  width: 100%;
  position: relative;
  overflow: hidden;

  /* Glossy effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to bottom, rgba(255,255,255,0.05), transparent);
    pointer-events: none;
  }

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 40px 20px;
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const WaveGradientSection = styled(motion.div)`
  width: 100%;
  position: relative;
  background: #000;
  overflow: hidden;
  padding: 40px 0;
  
  /* Wave effect using pseudo-element */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200%;
    height: 200%;
    // background: radial-gradient(circle at center, rgba(151, 192, 73, 0.12) 0%, transparent 70%);
    z-index: 1;
    pointer-events: none;
  }

  /* Animated wave pattern overlay */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    // background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1600 800'%3E%3Cg %3E%3Cpath fill='%2397c049' d='M486 705.3c-109.3-21.8-223.4-32.2-335.3-19.4C99.5 692.1 49 703 0 719.8V800h1600V0h-1600v719.8c49-16.8 99.5-27.7 150.7-33.9 111.9-12.8 226-2.4 335.3 19.4 110.6 22.1 217.5 58.6 314.7 106.3 97.2 47.7 184.6 107.7 261.2 178.6 76.6 70.9 141.2 153.3 192.1 243.3 50.9 90 90.1 184.6 116.7 282.4h111.9V800h1600V0h-1600v719.8z'/%3E%3C/g%3E%3C/svg%3E");
    background-size: cover;
    opacity: 0.05;
    z-index: 1;
    pointer-events: none;
  }
`;

const ProjectImage = styled(motion.img)`
  width: 100%;
  max-width: 1000px;
  height: auto;
  display: block;
  margin: 0 auto;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 30px rgba(151, 192, 73, 0.2));
  cursor: pointer;
  will-change: transform;
`;

const TreeImage = styled(motion.img)`
  width: 100%;
  max-width: 800px;
  height: auto;
  display: block;
  margin: 40px auto 0;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 40px rgba(151, 192, 73, 0.15));
  cursor: pointer;
`;

const OutcomesTagline = styled(motion.p)`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.85);
  margin-top: -30px;
  margin-bottom: 40px;
  max-width: 800px;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const OutcomesDescription = styled(motion.p)`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 40px;
  max-width: 800px;
  line-height: 1.6;
  text-align: center;
`;

const FullStackPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = React.useState('');

  React.useEffect(() => {
    const fetchPdf = async () => {
      const { supabasePublic } = await import('./supabasePublicClient');
      const { data } = await supabasePublic
        .from('courses')
        .select('pdf_url')
        .ilike('category', '%react%')
        .single();
      
      if (data?.pdf_url) {
        setPdfUrl(data.pdf_url);
      }
    };
    fetchPdf();
  }, []);

  const handleEnroll = () => {
    navigate(getEnrollmentPath(user, 'full-stack-react'));
  };

  return (
    <PageContainer>
      <FloatingShape
        size="500px"
        color="rgba(151, 192, 73, 0.08)"
        style={{ top: '-10%', left: '-10%' }}
        animate={{
          x: [0, 30, 0],
          y: [0, 40, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <FloatingShape
        size="400px"
        color="rgba(123, 31, 46, 0.08)"
        style={{ bottom: '10%', right: '-5%' }}
        animate={{
          x: [0, -30, 0],
          y: [0, -40, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      <ContentWrapper style={{ marginBottom: '100px' }}>
        {/* Left Column: Text Info */}
        <TextColumn
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Heading>
            Full Stack
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Web Development with React (MERN Stack)
            </motion.span>
          </Heading>

          <SubHeading>
            Learn how to Build Modern Web Applications Frontend and Backend
          </SubHeading>

          <Description>
            The MERN stack is one of the most in-demand technology stacks in today's tech industry.
            This program is designed to help students move beyond basics and gain end-to-end web
            development skills, from creating interactive user interfaces to building secure backend
            APIs and deploying full applications online.
          </Description>

          <Description>
            Whether your goal is employment, freelancing, or launching your own product, this course
            focuses on real-world development workflows and outcomes.
          </Description>
          <StartButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            onClick={handleEnroll}
          >
            Start Learning
          </StartButton>
        </TextColumn>
        {/* Right Column: Enroll Card */}
        <CourseEnrollCard
          image={mernCard}
          courseId="full-stack-react"
          title="Full Stack (React)"
          accentColor="#97C049"
          features={[
            'Master React & Node.js',
            'Build 5+ Real-World Projects',
            'Advanced Portfolio Development',
            'Career Growth Support'
          ]}
          iconType="react"
        />

      </ContentWrapper>


      {/* Course Features Section */}
      <SectionContainer>
        <SectionTitle>Our Course Features</SectionTitle>
        <FeaturesGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {[
            { icon: <FaUser />, title: "Anyone", sub: "Can Learn (IT / Non IT)" },
            { icon: <FaStar />, title: "4.8+", sub: "Course Rating" },
            { icon: <FaUsers />, title: "100+", sub: "Learners" },
            { icon: <FaProjectDiagram />, title: "5+", sub: "Real World Projects" },
            { icon: <FaWallet />, title: "Payment Plan", sub: "One time / Installments" },
            { icon: <FaClock />, title: "2 Months", sub: "Content Duration" },
            { icon: <FaBriefcase />, title: "Job-Ready", sub: "Industry Aligned" },
            { icon: <FaChalkboardTeacher />, title: "Onsite / Online", sub: "Lecture Mode" }
          ].map((feature, index) => (
            <FeatureBox
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              <IconWrapper
                bg="#fff"
                whileHover={{ rotate: 360, backgroundColor: "#97C049", color: "#fff" }}
                transition={{ duration: 0.5 }}
              >
                {feature.icon}
              </IconWrapper>
              <FeatureText>
                <h4>{feature.title}</h4>
                <span>{feature.sub}</span>
              </FeatureText>
            </FeatureBox>
          ))}
        </FeaturesGrid>
      </SectionContainer>

      {/* What You'll Learn Section */}
      <SectionContainer>
        <SectionTitle>What You'll Learn</SectionTitle>
        <LearningGrid
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Frontend Card */}
          <LearningCard
            variants={itemVariants}
            gradient="linear-gradient(135deg, #FAC000 0%, #CF5F04 100%)"
            whileHover={{ y: -15, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <LearningTitle color="#333">Frontend Development</LearningTitle>
            <LearningList color="#333">
              <li>HTML5, CSS3 & modern JavaScript</li>
              <li>Responsive layouts using Flexbox, Grid, Bootstrap/Tailwind</li>
              <li>React fundamentals, hooks, routing & performance optimization</li>
            </LearningList>
          </LearningCard>

          {/* Backend Card */}
          <LearningCard
            variants={itemVariants}
            gradient="linear-gradient(135deg, #275C8D 0%, #0C7BE2 100%)"
            whileHover={{ y: -15, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <LearningTitle>Backend Development</LearningTitle>
            <LearningList>
              <li>Node.js & Express.js</li>
              <li>RESTful APIs</li>
              <li>Authentication with JWT</li>
              <li>Secure backend architecture</li>
            </LearningList>
          </LearningCard>

          {/* Database Card */}
          <LearningCard
            variants={itemVariants}
            gradient="linear-gradient(135deg, #FA9C8F 0%, #673E38 100%)"
            whileHover={{ y: -15, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <LearningTitle>Database & Tools</LearningTitle>
            <LearningList>
              <li>MongoDB & MongoDB Atlas</li>
              <li>Git & GitHub</li>
              <li>Deployment on Netlify, Vercel & Render</li>
            </LearningList>
          </LearningCard>
        </LearningGrid>
      </SectionContainer>

      {/* Course Curriculum & Banner */}
      <SectionContainer style={{ marginBottom: 0 }}>
        <SectionTitle>Course Curriculum</SectionTitle>
      </SectionContainer>

      <CurriculumBanner
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <InfoItem whileHover={{ scale: 1.05 }}>
          <BannerIcon color="#5C9E4B"><FaClock /></BannerIcon>
          <BannerText color="#5C9E4B">
            <h4>Duration</h4>
            <p>24 Weeks</p>
          </BannerText>
        </InfoItem>

        <InfoItem whileHover={{ scale: 1.05 }}>
          <BannerIcon color="#3B6E94"><FaChalkboardTeacher /></BannerIcon>
          <BannerText color="#3B6E94">
            <h4>Mode</h4>
            <p>Practical, project-based learning</p>
          </BannerText>
        </InfoItem>

        <InfoItem whileHover={{ scale: 1.05 }}>
          <BannerIcon color="#A23C3C"><FaDatabase /></BannerIcon>
          <BannerText color="#A23C3C">
            <h4>Tools</h4>
            <p>VS Code, Git, GitHub, Cloud Deployment</p>
          </BannerText>
        </InfoItem>
      </CurriculumBanner>
      <div style={{ padding: '60px 0 100px' }}>
        <StartButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEnroll}
          style={{ fontSize: '1.2rem', padding: '18px 50px' }}
        >
          Enroll Now
        </StartButton>
      </div>


      {/* Projects Section */}
      <WaveGradientSection
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5 }}
      >
        <SectionContainer>
          <SectionTitle>Projects You'll Build</SectionTitle>
          <ProjectImage
            src={mernProject}
            alt="Projects Map"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{
              scale: 1.05,
              rotateY: 5,
              rotateX: -5,
              transition: { duration: 0.4 }
            }}
            animate={{
              y: [0, -10, 0],
              transition: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </SectionContainer>
      </WaveGradientSection>

      {/* Career Outcomes Section */}
      <SectionContainer>
        <SectionTitle>Career Outcomes</SectionTitle>
        <OutcomesTagline
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          By the end of this program, you'll be able to:
        </OutcomesTagline>
        <TreeImage
          src={mernTree}
          alt="Career Tree"
          initial={{ opacity: 0, transform: "scale(0.9) rotate(-3deg)" }}
          whileInView={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
          viewport={{ once: true }}
          whileHover={{
            scale: 1.03,
            filter: "drop-shadow(0 0 50px rgba(151, 192, 73, 0.3))",
            transition: { duration: 0.3 }
          }}
          animate={{
            y: [0, 8, 0],
            transition: {
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        />
        <OutcomesDescription
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          This course is structured to help students develop job-ready skills and a strong portfolio, not just theoretical knowledge.
        </OutcomesDescription>
      </SectionContainer>

      <VideoReviews />

      <WhyChooseUs />

      <InstantDoubt />

      <CertifySection accentColor="#97C049" accentRGB="151, 192, 73" />

      <CourseOutline 
        accentColor="#97C049" 
        accentRGB="151, 192, 73" 
        pdfUrl={pdfUrl} 
      />
      <div style={{ position: 'relative', zIndex: 10 }}>
        <CourseRoadmap imageSrc={mernMap} accentColor="#97C049" />

      </div>
    </PageContainer>
  );
};

export default FullStackPage;
