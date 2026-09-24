import React, { useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaBrain, FaRegHandPointer, FaWalking, FaLeaf, FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { Link } from "../lib/nextRouterDomCompat";

import RegisterButton from "./components/RegisterButton";
import GlowCard from "./components/GlowCard";
import SmartCoverImage from "../components/next/SmartCoverImage";

// Import assets
import traineeBg from "./assets/trainee-bg.png";
import traineeImg from "./assets/trainee.svg";
import whatdsBg from "./assets/whatds-bg.png";
import founderImg from "./assets/founder.svg";


const PageContainer = styled(motion.div)`
 min-height: 100vh;
  padding-top: 80px; // Space for header
  overflow-x: hidden;
`;

const InstructorSection = styled.section`
  background-image: url(${traineeBg});
  background-size: cover;
  background-position: center;
  padding: 40px 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(123, 31, 46, 0.2) 0%, transparent 75%);
    pointer-events: none;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  position: relative;
  z-index: 2;
`;

const SectionHeader = styled(motion.div)`
  margin-bottom: 40px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;

  h1 {
    font-size: 3.2rem;
    color: #fff;
    margin-bottom: 20px;
    letter-spacing: 2px;

    @media (max-width: 768px) {
      font-size: 1.9rem;
    }
  }

  p {
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
    font-weight: 300;
  
     @media (max-width: 768px) {
      font-size: 0.7rem;
    }
  }
`;

const InstructorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-bottom: 40px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
`;

const InstructorCard = styled(motion.div)`
  background: rgba(123, 31, 46, 0.4);
  border: 4px solid #7B1F2E;
  border-radius: 20px;
  padding: 10px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

  &:hover {
    border-color: #fff;
    box-shadow: 0 25px 50px rgba(123, 31, 46, 0.6);
    
    img {
      transform: scale(1.1);
    }
  }

  /* Count control as per requirements */
  @media (max-width: 1024px) {
    &:nth-child(n+5) {
      display: none;
    }
  }

  @media (max-width: 768px) {
    &:nth-child(n+4) {
      display: none;
    }
  }

  @media (max-width: 768px) {
    border-width: 2px;
    border-radius: 12px;
    padding: 5px;
  }
`;

const ImageBox = styled.div`
  width: 100%;
  background: #c7c7c7;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1/1;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    transform-origin: center top;
    filter: grayscale(100%);
    transition: transform 0.6s ease;
  }
`;

const CtaBox = styled(motion.div)`
  background: rgba(123, 31, 46, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  padding: 20px 30px;
  max-width: 900px;
  width: 100%;
  margin: 40px auto 0;
  display: flex;
  justify-content: center;
  align-items: center;
  
  p {
    font-family: 'Inter', sans-serif;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5;

    @media (max-width: 768px) {
      font-size: 0.8rem;
    }
  }
`;

const WhySection = styled.section`
  background-color: #E6E6E6;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const WhyTitle = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #000;
  margin-bottom: 60px;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const DetailSection = styled.section`
  background-image: url(${whatdsBg});
  background-size: cover;
  background-position: center;
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
`;

const DetailWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 40px;
  flex-direction: ${props => props.$reverse ? 'row-reverse' : 'row'};
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    gap: 20px;
  }
`;

const DetailImageArea = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  .img-container {
    position: relative;
    width: 100%;
    max-width: 450px;
    border-radius: 25px;
    overflow: hidden;
    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
    aspect-ratio: 4/5;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: grayscale(100%);
    }
  }

  .instructor-info {
    margin-top: 20px;
    text-align: center;
    
    h3 {
      font-family: 'Asimovian', sans-serif;
      font-size: 2rem;
      color: #fff;
      margin-bottom: 5px;
      letter-spacing: 1px;
    }
    
    p {
      font-family: 'Inter', sans-serif;
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.2rem;
      font-weight: 500;
    }
  }
`;

const DetailTextArea = styled(motion.div)`
  flex: 1.2;
  color: #fff;
  text-align: left;

  h2 {
    font-family: 'Asimovian', sans-serif;
    font-size: 3rem;
    margin-bottom: 25px;
    line-height: 1.1;

    @media (max-width: 768px) {
      font-size: 1.2rem;
      margin-bottom: 10px;
    }
  }

  .main-desc {
    font-family: 'Inter', sans-serif;
    font-size: 1.15rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.85);
    margin-bottom: 35px;
    font-weight: 300;

    @media (max-width: 768px) {
      font-size: 0.8rem;
      line-height: 1.4;
      margin-bottom: 15px;
    }
  }

  h4 {
    font-family: 'Asimovian', sans-serif;
    font-size: 2.2rem;
    margin-bottom: 20px;
    letter-spacing: 1px;

    @media (max-width: 768px) {
      font-size: 1rem;
      margin-bottom: 8px;
    }
  }

  .exp-desc {
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.6);
    max-width: 500px;

    @media (max-width: 768px) {
      font-size: 0.7rem;
      line-height: 1.3;
    }
  }
`;

const JoinFacultySection = styled.section`
  padding: 80px 20px;
  background: linear-gradient(180deg, #000 0%, #15090d 50%, #000 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 350px;
    background: radial-gradient(ellipse, rgba(123, 31, 46, 0.22) 0%, transparent 70%);
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }
`;

const FacultyCard = styled(motion.div)`
  max-width: 1100px;
  width: 100%;
  background: #000;
  border: 1px solid rgba(217, 74, 94, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 48px 40px;
  position: relative;
  z-index: 1;
  box-shadow: 0 15px 40px rgba(122, 30, 45, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;

  @media (max-width: 768px) {
    padding: 36px 20px;
  }

  .faculty-badge {
    background: rgba(123, 31, 46, 0.35);
    border: 1px solid rgba(217, 74, 94, 0.5);
    color: #ff8597;
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 6px 16px;
    border-radius: 20px;
  }

  h2 {
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    font-family: 'Asimovian', sans-serif;
    color: #fff;
    font-weight: normal;
    letter-spacing: 1.5px;
    margin: 0;
    line-height: 1.2;

    span {
      background: linear-gradient(135deg, #ffffff 30%, #ff8597 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  p.desc {
    font-family: 'Inter', sans-serif;
    font-size: 1.05rem;
    color: #ccc;
    max-width: 720px;
    line-height: 1.6;
    margin: 0;
  }

  .perks-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
    margin: 10px 0;

    .perk {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 0.88rem;
      color: #e0e0e0;
      font-family: 'Inter', sans-serif;

      svg {
        color: #2ed573;
      }
    }
  }
`;





const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 25px;
  max-width: 1200px;
  width: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    max-width: 300px;
  }
`;

const FeatureCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  border: 1px solid transparent;
  transition: all 0.3s ease;

  &:hover {
    border-color: #7B1F2E;
    box-shadow: 0 15px 35px rgba(123, 31, 46, 0.2);
  }
`;

const FeatureTop = styled.div`
  background: #D9D9D9;
  padding: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #7B1F2E;
  font-size: 2.5rem;
`;

const FeatureBottom = styled.div`
  background: #7B1F2E;
  padding: 25px;
  color: #fff;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 1.1rem;
    line-height: 1.3;
  }
`;

const TraineePage = ({ initialInstructors = null }) => {
  // Instructors arrive via getStaticProps (pages/trainers.js) so they are present
  // in the prerendered HTML; CMS edits reach the page through revalidation.
  const instructors =
    Array.isArray(initialInstructors) && initialInstructors.length > 0
      ? initialInstructors
      : [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    { icon: <FaBrain />, text: "Easy to understand" },
    { icon: <FaRegHandPointer />, text: "Practical and hands-on" },
    { icon: <FaWalking />, text: "Step-by-step" },
    { icon: <FaLeaf />, text: "Stress-free for beginners" }
  ];

  return (
    <>
      <PageContainer
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <InstructorSection>
          <ContentWrapper>
            <SectionHeader
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h1>MEET OUR INSTRUCTOR</h1>
              <p>
                At DeepSkills, our instructors are industry professionals with real-world experience.
                They are not just teachers — they are mentors who guide students with practical
                knowledge, modern tools, and hands-on training.
              </p>
            </SectionHeader>

            {instructors.length > 0 ? (
              <InstructorGrid>
                {instructors.map((inst, idx) => (
                  <GlowCard
                    key={inst.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    borderRadius="20px"
                    bg="rgba(123, 31, 46, 0.4)"
                    hoverBg="rgba(123, 31, 46, 0.6)"
                    style={{ border: '4px solid #7B1F2E' }}
                  >
                    <InstructorCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                      <ImageBox>
                        <SmartCoverImage
                          src={inst.image_url || traineeImg}
                          alt={inst.name}
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </ImageBox>
                    </InstructorCard>
                  </GlowCard>
                ))}
              </InstructorGrid>
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.75)', textAlign: 'center', padding: '40px 20px', fontSize: '1.1rem' }}>
                <p>Instructor profiles are currently being updated. Please check back soon!</p>
              </div>
            )}

            <CtaBox
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <p>
                At DeepSkills, our instructors are industry professionals with real-world experience.
                They are not just teachers, industry professionals with real-world experience.
              </p>
            </CtaBox>
          </ContentWrapper>
        </InstructorSection>

        <WhySection>
          <WhyTitle
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Why Choose DeepSkill Instructors
          </WhyTitle>

          <FeatureGrid>
            {features.map((feature, idx) => (
              <GlowCard
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                borderRadius="20px"
                bg="transparent"
                hoverBg="rgba(123, 31, 46, 0.1)"
                style={{ height: '100%', border: '1px solid transparent' }}
              >
                <FeatureCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', height: '100%' }}>
                  <FeatureTop>{feature.icon}</FeatureTop>
                  <FeatureBottom>
                    <span>{feature.text}</span>
                  </FeatureBottom>
                </FeatureCard>
              </GlowCard>
            ))}
          </FeatureGrid>
        </WhySection>

        {instructors.map((inst, idx) => (
          <DetailSection key={inst.id}>
            <DetailWrapper $reverse={idx % 2 !== 0}>
              <DetailImageArea
                initial={{ x: idx % 2 === 0 ? -50 : 50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="img-container">
                  <SmartCoverImage
                    src={inst.image_url || founderImg}
                    alt={inst.name}
                    sizes="(max-width: 768px) 100vw, 450px"
                  />
                </div>
                <div className="instructor-info">
                  <h3>{inst.name.toUpperCase()}</h3>
                  <p>({inst.role.toUpperCase()})</p>
                </div>
              </DetailImageArea>
              <DetailTextArea
                initial={{ x: idx % 2 === 0 ? 50 : -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2>{inst.role.toUpperCase()}</h2>
                <p className="main-desc">
                  {inst.bio || "At DeepSkills, our instructors are industry professionals with real-world experience. They are not just teachers — they are mentors who guide students with practical knowledge, modern tools, and hands-on training."}
                </p>
                <h4>EXPERIENCE</h4>
                <p className="exp-desc">
                  {inst.bio || "At DeepSkills, our instructors are industry professionals with real-world experience. They are not just teachers — they are mentors who guide students with practical knowledge, modern tools, and hands-on training."}
                </p>
              </DetailTextArea>
            </DetailWrapper>
          </DetailSection>
        ))}

        <JoinFacultySection>
          <FacultyCard
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="faculty-badge">Join Our Faculty &bull; We Are Hiring</span>
            <h2>Are You an Industry Expert? <span>Teach at DeepSkills</span></h2>
            <p className="desc">
              Share your real-world experience, mentor passionate tech learners, and shape future developers and designers.
              We offer market-competitive compensation with flexible evening, weekend, or full-time tracks.
            </p>
            <div className="perks-row">
              <span className="perk"><FaCheckCircle /> Flexible Evening & Weekend Tracks</span>
              <span className="perk"><FaCheckCircle /> Competitive Hourly / Monthly Packages</span>
              <span className="perk"><FaCheckCircle /> Modern Gulberg Campus & iMac Labs</span>
            </div>
            <RegisterButton to="/careers">
              APPLY AS A TRAINER <FaArrowRight style={{ marginLeft: 8 }} />
            </RegisterButton>
          </FacultyCard>
        </JoinFacultySection>

      </PageContainer>
    </>
  );
};

export default TraineePage;
