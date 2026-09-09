import React, { useEffect } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaBrain, FaRegHandPointer, FaWalking, FaLeaf } from "react-icons/fa";

import RegisterButton from "./components/RegisterButton";
import GlowCard from "./components/GlowCard";
import SmartCoverImage from "../components/next/SmartCoverImage";

// Import assets
import traineeBg from "./assets/trainee-bg.png";
import traineeImg from "./assets/trainee.svg";
import whatdsBg from "./assets/whatds-bg.png";
import founderImg from "./assets/founder.svg";

const dummyInstructors = [
  { id: 'dummy-1', name: 'John Doe', role: 'Senior React Developer', bio: 'With 10+ years of experience in frontend engineering, John specializes in creating interactive and high-performance user interfaces using React and modern JavaScript.', image_url: null },
  { id: 'dummy-2', name: 'Jane Smith', role: 'Lead Backend Engineer', bio: 'Jane is an expert in robust server-side architecture. She has built scalable APIs for leading tech startups using Laravel and Node.js.', image_url: null },
  { id: 'dummy-3', name: 'Mike Johnson', role: 'Creative UI/UX Director', bio: 'Mike believes in design that solves problems. He brings 8 years of agency experience teaching Adobe Creative Suite and modern design principles.', image_url: null },
  { id: 'dummy-4', name: 'Sarah Lee', role: 'WordPress Specialist', bio: 'Sarah empowers students to build stunning, functional websites quickly. She has built hundreds of sites for diverse business clients worldwide.', image_url: null }
];

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
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1/1;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 30%, rgba(123, 31, 46, 0.1) 100%);
    pointer-events: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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

const FinalCTASection = styled.section`
  background: #000;
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
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
    initialInstructors && initialInstructors.length > 0
      ? [...initialInstructors, ...dummyInstructors]
      : dummyInstructors;

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

        {instructors.slice(0, 4).map((inst, idx) => (
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

        <FinalCTASection>
          <RegisterButton>
            INQUIRE NOW
          </RegisterButton>
        </FinalCTASection>
      </PageContainer>
    </>
  );
};

export default TraineePage;
