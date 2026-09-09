import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaGraduationCap, FaWrench, FaChalkboardTeacher, FaBriefcase } from "react-icons/fa";

const SectionWrapper = styled.section`
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
`;

const MainCard = styled(motion.div)`
  display: flex;
  width: 100%;
  max-width: 1200px;
  background-color: #353535;
  border-radius: 40px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  border: 2px solid white;

  @media (max-width: 992px) {
    flex-direction: column;
    border-radius: 25px;
  }
`;

const LeftSide = styled.div`
  flex: 1;
  background-color: #EFECEC;
  padding: 40px;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const RightSide = styled.div`
  flex: 1.2;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const SectionHeading = styled.h2`
  font-family: 'Inter', sans-serif;
  font-size: 2.7rem;
  color: #000;
  font-weight: 800;
  margin-bottom: 45px;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 10px;
  }
`;

const OfferItem = styled(motion.div)`
  background-color: #2A2A2A;
  border-radius: 12px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  width: 100%;
`;

const IconBox = styled.div`
  background-color: #7A1E2D;
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #df9797;
  font-size: 1.5rem;
  flex-shrink: 0;
`;

const OfferText = styled.span`
  color: #e0e0e0;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
`;

const RightHeader = styled.div`
  margin-bottom: 40px;
`;

const AboutTitle = styled.h3`
  font-family: 'Inter', sans-serif;
  font-size: 2.7rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 5px;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const AboutSubTitle = styled.h4`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  color: #e0e0e0;
  font-weight: 500;
  margin: 0;
`;

const DescriptionBox = styled(motion.div)`
  background-color: #000;
  padding: 40px 20px;
  border-radius: 15px;
  position: relative;
  border: 2px solid rgba(186, 11, 11, 0.7);
  box-shadow: 0 0 30px rgba(186, 11, 11, 0.75);

  @media (max-width: 768px) {
    padding:  20px;
  }
`;

const MainPara = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  line-height: 1.7;
  color: #e0e0e0;
  margin-bottom: 30px;

  strong {
    color: #b5283fff;
    font-weight: 800;
  }
`;

const IntroPara = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 15px;
`;

const FooterPara = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-style: italic;
  color: #ccc;
  margin: 0;
`;

const DEFAULT_ABOUT_CONTENT = {
  intro: "The future belongs to those who can create, build, and adapt.",
  main: "Deepskills is a modern learning institute focused on hands-on digital education. We help students and young adults gain the technical and creative skills needed to succeed in today’s fast-changing job market, whether as professionals, freelancers, or entrepreneurs. We believe that skills, not just degrees, shape strong careers.",
  footer: "Learn Skills, earn at an early age, and grasp your future",
  title: "About Deepskills",
  subtitle: "Where Skills Become Careers"
};

const DEFAULT_OFFERS = [
  { title: "Career-Focused Learning", icon: "FaGraduationCap" },
  { title: "Practical, Hands-On Training", icon: "FaWrench" },
  { title: "Beginner to Professional Tracks", icon: "FaChalkboardTeacher" },
  { title: "Skills That Lead to Real Opportunities", icon: "FaBriefcase" }
];

const AboutSection = ({ initialContent = null, initialOffers = null }) => {
  // Content arrives via getStaticProps (pages/index.js) so it is present in the
  // prerendered HTML; CMS edits reach the page through ISR/on-demand revalidation.
  const content = initialContent || DEFAULT_ABOUT_CONTENT;
  const offers = initialOffers && initialOffers.length > 0 ? initialOffers : DEFAULT_OFFERS;

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'FaGraduationCap': return <FaGraduationCap />;
      case 'FaWrench': return <FaWrench />;
      case 'FaChalkboardTeacher': return <FaChalkboardTeacher />;
      case 'FaBriefcase': return <FaBriefcase />;
      default: return <FaGraduationCap />;
    }
  };

  return (
    <SectionWrapper id="about">
      <MainCard
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <LeftSide>
          <SectionHeading>What We Offer</SectionHeading>
          {offers.map((offer, index) => (
            <OfferItem 
              key={index}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02, x: 10 }}
            >
              <IconBox>{getIcon(offer.icon)}</IconBox>
              <OfferText>{offer.title}</OfferText>
            </OfferItem>
          ))}
        </LeftSide>

        <RightSide>
          <RightHeader>
            <AboutTitle>{content.title}</AboutTitle>
            <AboutSubTitle>{content.subtitle}</AboutSubTitle>
          </RightHeader>
          
          <DescriptionBox
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <IntroPara>{content.intro}</IntroPara>
            <MainPara 
              dangerouslySetInnerHTML={{ __html: content.main.replace(/Deepskills/g, '<strong>Deepskills</strong>') }}
            />
            <FooterPara>{content.footer}</FooterPara>
          </DescriptionBox>
        </RightSide>
      </MainCard>
    </SectionWrapper>
  );
};

export default AboutSection;
