import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from '../lib/nextRouterDomCompat';
import { useAuth } from './context/AuthContext';
import { 
  FaClock, 
  FaLaptopCode, 
  FaUserTie, 
  FaCertificate, 
  FaCheckCircle, 
  FaArrowRight, 
  FaChevronDown, 
  FaBookOpen,
  FaPhoneAlt
} from 'react-icons/fa';
import VideoReviews from './components/VideoReviews';
import WhyChooseUs from './components/WhyChooseUs';
import InstantDoubt from './components/InstantDoubt';
import CertifySection from './components/CertifySection';
import CourseEnrollCard from './components/CourseEnrollCard';
import { getEnrollmentPath } from './utils/enrollmentNavigation';

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #000;
  background: radial-gradient(circle at 20% 20%, rgba(123, 31, 46, 0.18) 0%, transparent 50%),
              radial-gradient(circle at 80% 60%, rgba(123, 31, 46, 0.12) 0%, transparent 50%);
  color: #fff;
  padding-top: 120px;
  overflow-x: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-width: 968px) {
    padding-top: 90px;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1300px;
  width: 100%;
  margin: 0 auto;
  padding: 0 30px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 50px;
  align-items: center;
  position: relative;
  z-index: 2;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 0 20px 40px;
  }
`;

const TextColumn = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(123, 31, 46, 0.25);
  border: 1px solid rgba(123, 31, 46, 0.5);
  color: #ffccd3;
  padding: 6px 14px;
  border-radius: 50px;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  width: fit-content;
  font-family: 'Inter', sans-serif;
`;

const CourseHeading = styled.h1`
  font-size: clamp(2.2rem, 4.5vw, 3.5rem);
  font-family: 'Asimovian', sans-serif;
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
  letter-spacing: 0.5px;

  span {
    color: ${props => props.$highlightColor || '#ff8597'};
    display: inline;
    text-shadow: 0 0 25px rgba(123, 31, 46, 0.4);
  }
`;

const CourseSummary = styled.p`
  font-size: 1.1rem;
  font-family: 'Inter', sans-serif;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.65;
  max-width: 620px;
`;

const HighlightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 10px;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const HighlightCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
  backdrop-filter: blur(8px);
  transition: all 0.25s ease;

  &:hover {
    border-color: rgba(123, 31, 46, 0.5);
    background: rgba(123, 31, 46, 0.1);
  }

  svg {
    font-size: 1.4rem;
    color: ${props => props.$highlightColor || '#ff8597'};
    flex-shrink: 0;
  }

  div {
    display: flex;
    flex-direction: column;

    strong {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      font-family: 'Inter', sans-serif;
    }

    small {
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.6);
      font-family: 'Inter', sans-serif;
    }
  }
`;

const CtaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 15px;

  @media (max-width: 540px) {
    flex-direction: column;
    width: 100%;
  }
`;

const PrimaryCta = styled(motion.button)`
  padding: 15px 32px;
  background: linear-gradient(135deg, #7B1F2E 0%, #9b283b 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 10px 25px rgba(123, 31, 46, 0.4);
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.12);
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(123, 31, 46, 0.55);
  }

  @media (max-width: 540px) {
    width: 100%;
  }
`;

const SecondaryCta = styled(motion.button)`
  padding: 15px 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(123, 31, 46, 0.2);
    border-color: rgba(123, 31, 46, 0.5);
  }

  @media (max-width: 540px) {
    width: 100%;
  }
`;

// Curriculum Section
const CurriculumSection = styled.section`
  width: min(1200px, calc(100% - 40px));
  margin: 90px auto 40px;
  position: relative;
  z-index: 2;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 50px;

  span {
    color: ${props => props.$highlightColor || '#ff8597'};
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-family: 'Inter', sans-serif;
  }

  h2 {
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    font-family: 'Asimovian', sans-serif;
    color: #fff;
    margin: 10px 0 12px;
    letter-spacing: 0.5px;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Inter', sans-serif;
    max-width: 600px;
    margin: 0 auto;
    font-size: 1rem;
    line-height: 1.6;
  }
`;

const ModulesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
`;

const ModuleCard = styled(motion.div)`
  background: rgba(25, 25, 25, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 24px 22px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(123, 31, 46, 0.6);
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(123, 31, 46, 0.25);
  }
`;

const ModuleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  .mod-num {
    font-size: 0.78rem;
    font-weight: 800;
    color: ${props => props.$highlightColor || '#ff8597'};
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: 'Inter', sans-serif;
  }

  svg {
    color: rgba(255, 255, 255, 0.3);
    font-size: 1rem;
  }
`;

const ModuleTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  font-family: 'Inter', sans-serif;
  line-height: 1.4;
`;

// Bottom Banner
const BottomCtaSection = styled.section`
  width: min(1100px, calc(100% - 40px));
  margin: 60px auto 100px;
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.45) 0%, rgba(30, 10, 15, 0.85) 100%);
  border: 1px solid rgba(123, 31, 46, 0.6);
  border-radius: 20px;
  padding: 50px 40px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);

  h2 {
    font-size: clamp(1.8rem, 3.5vw, 2.5rem);
    font-family: 'Asimovian', sans-serif;
    color: #fff;
    margin-bottom: 15px;
  }

  p {
    font-size: 1.05rem;
    color: rgba(255, 255, 255, 0.8);
    font-family: 'Inter', sans-serif;
    max-width: 600px;
    margin: 0 auto 30px;
    line-height: 1.6;
  }

  .btn-group {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }
`;

export default function DynamicCoursePage({ course }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!course) return null;

  // Strict adherence to site theme (DeepSkills Maroon #7B1F2E and glow #ff8597)
  const isBlueOrUnset = !course.accent_color || 
    course.accent_color.toLowerCase().includes('blue') || 
    course.accent_color === '#3b82f6' || 
    course.accent_color === '#1d4ed8';

  const themePrimary = isBlueOrUnset ? '#7B1F2E' : course.accent_color;
  const themeHighlight = isBlueOrUnset ? '#ff8597' : course.accent_color;

  const outcomes = course.outcomes && course.outcomes.length > 0 
    ? course.outcomes 
    : [
        'Hands-on practical industry projects',
        'Direct mentorship from industry practitioners',
        'Job-ready portfolio and career prep',
        'Official DeepSkills verified certificate'
      ];

  const modules = course.modules && course.modules.length > 0 
    ? course.modules 
    : [
        'Foundations, Core Principles & Architecture',
        'Hands-on Practical Implementation',
        'Advanced Industry Patterns & Optimization',
        'Final Capstone Project & Portfolio Review'
      ];

  const handleEnroll = () => {
    navigate(getEnrollmentPath(user, course.slug));
  };

  const handleInquire = () => {
    navigate(`/inquiry?course=${encodeURIComponent(course.slug)}`);
  };

  return (
    <PageContainer>
      <ContentWrapper>
        <TextColumn
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >
          <CategoryBadge>{course.category || 'Professional Skills'}</CategoryBadge>
          <CourseHeading $highlightColor={themeHighlight}>
            Master <span>{course.title}</span>
          </CourseHeading>
          <CourseSummary>
            {course.summary || course.description || `Build practical, job-ready competence in ${course.title} with expert mentorship, portfolio-grade projects, and live industry workflows.`}
          </CourseSummary>

          <HighlightsGrid>
            <HighlightCard $highlightColor={themeHighlight}>
              <FaClock />
              <div>
                <strong>{course.duration || '3 Months'}</strong>
                <small>Comprehensive Track</small>
              </div>
            </HighlightCard>
            <HighlightCard $highlightColor={themeHighlight}>
              <FaLaptopCode />
              <div>
                <strong>Practical & Live</strong>
                <small>Hands-on Classroom & Lab</small>
              </div>
            </HighlightCard>
            <HighlightCard $highlightColor={themeHighlight}>
              <FaUserTie />
              <div>
                <strong>Expert Mentors</strong>
                <small>1-on-1 Code & Design Reviews</small>
              </div>
            </HighlightCard>
            <HighlightCard $highlightColor={themeHighlight}>
              <FaCertificate />
              <div>
                <strong>Verified Certificate</strong>
                <small>DeepSkills Credential</small>
              </div>
            </HighlightCard>
          </HighlightsGrid>

          <CtaRow>
            <PrimaryCta
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleEnroll}
            >
              Enroll Now <FaArrowRight />
            </PrimaryCta>
            <SecondaryCta
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInquire}
            >
              <FaPhoneAlt style={{ fontSize: '0.85rem' }} /> Inquire About Details
            </SecondaryCta>
          </CtaRow>
        </TextColumn>

        <CourseEnrollCard
          image={course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'}
          courseId={course.slug}
          title={course.title}
          accentColor={themePrimary}
          features={outcomes}
          useIcons={true}
        />
      </ContentWrapper>

      {/* Curriculum / Modules */}
      <CurriculumSection>
        <SectionHeader $highlightColor={themeHighlight}>
          <span>Structured Learning</span>
          <h2>Course Curriculum & Roadmap</h2>
          <p>Carefully sequenced to take you from foundational understanding to full production-grade delivery.</p>
        </SectionHeader>

        <ModulesGrid>
          {modules.map((mod, index) => {
            const title = typeof mod === 'string' ? mod : mod.title;
            const desc = typeof mod === 'object' && mod.description ? mod.description : null;

            return (
              <ModuleCard
                key={index}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <ModuleHeader $highlightColor={themeHighlight}>
                  <span className="mod-num">Module 0{index + 1}</span>
                  <FaBookOpen />
                </ModuleHeader>
                <ModuleTitle>{title}</ModuleTitle>
                {desc && <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{desc}</p>}
              </ModuleCard>
            );
          })}
        </ModulesGrid>
      </CurriculumSection>

      {/* Trust & Conversion Features - strictly matching DeepSkills theme */}
      <WhyChooseUs accentColor={themePrimary} accentRGB="123, 31, 46" />
      <InstantDoubt accentColor={themePrimary} accentRGB="123, 31, 46" />
      <CertifySection accentColor={themePrimary} accentRGB="123, 31, 46" />
      <VideoReviews accentColor={themePrimary} accentRGB="123, 31, 46" courseName={course.title} />

      {/* Bottom Enrollment Banner */}
      <BottomCtaSection>
        <h2>Ready to Level Up Your Career?</h2>
        <p>Seats are limited to maintain high instructor-to-student mentorship ratios. Join our upcoming batch today.</p>
        <div className="btn-group">
          <PrimaryCta
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleEnroll}
          >
            Enroll in {course.title} <FaArrowRight />
          </PrimaryCta>
          <SecondaryCta
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleInquire}
          >
            Talk to an Academic Counselor
          </SecondaryCta>
        </div>
      </BottomCtaSection>
    </PageContainer>
  );
}
