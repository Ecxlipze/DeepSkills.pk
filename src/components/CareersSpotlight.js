import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from '../../lib/nextRouterDomCompat';
import RegisterButton from './RegisterButton';
import {
  FaChalkboardTeacher,
  FaLaptopCode,
  FaRocket,
  FaArrowRight,
  FaCheckCircle,
  FaHeart,
  FaGraduationCap
} from 'react-icons/fa';

const SectionWrapper = styled.section`
  position: relative;
  background: linear-gradient(180deg, #09090c 0%, #15090d 50%, #09090c 100%);
  padding: 90px 24px;
  overflow: hidden;
  font-family: 'Inter', sans-serif;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 400px;
    background: radial-gradient(ellipse, rgba(123, 31, 46, 0.22) 0%, transparent 70%);
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }
`;

const Container = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const HeaderBox = styled.div`
  text-align: center;
  max-width: 780px;
  margin: 0 auto 45px;
`;

const TopBadgeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const HiringBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(123, 31, 46, 0.35);
  border: 1px solid rgba(217, 74, 94, 0.5);
  color: #ff8597;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 5px 14px;
  border-radius: 20px;
`;

const Title = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  font-family: 'Asimovian', sans-serif;
  font-weight: normal;
  letter-spacing: 1px;
  line-height: 1.2;
  color: #ffffff;
  margin-bottom: 16px;

  span {
    background: linear-gradient(135deg, #ffffff 30%, #ff8597 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Subtitle = styled.p`
  font-size: 1.05rem;
  color: #b0b0b0;
  line-height: 1.6;
  margin: 0;
`;

const RolesList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 45px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const RoleMiniCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px 24px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: #CD7C7C;
    background: rgba(123, 31, 46, 0.08);
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(122, 30, 45, 0.25);
  }

  .role-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #7A1E2D;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 1.3rem;
    margin-bottom: 18px;
    transition: transform 0.4s ease;
  }

  &:hover .role-icon {
    transform: scale(1.08);
  }

  h3 {
    font-family: 'Asimovian', sans-serif;
    font-size: 1.3rem;
    font-weight: normal;
    letter-spacing: 1px;
    color: #fff;
    margin: 0 0 10px;
  }

  p {
    font-size: 0.92rem;
    color: #a5a5a5;
    line-height: 1.55;
    margin: 0 0 18px;
    flex-grow: 1;
  }

  .role-feature {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    color: #d0d0d0;

    svg {
      color: #2ed573;
      font-size: 0.9rem;
      flex-shrink: 0;
    }
  }
`;

const PerksBar = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;

  @media (max-width: 860px) {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
`;

const PerksHighlights = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;

  @media (max-width: 860px) {
    justify-content: center;
  }

  .perk-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.92rem;
    color: #e0e0e0;

    svg {
      color: #ff8597;
    }
  }
`;



export default function CareersSpotlight() {
  return (
    <SectionWrapper id="careers-spotlight">
      <Container>
        <HeaderBox>
          <TopBadgeRow>
            <HiringBadge>We Are Hiring &bull; Join DeepSkills</HiringBadge>
          </TopBadgeRow>
          <Title>
            Build the Future of <span>Tech Education</span>
          </Title>
          <Subtitle>
            We are empowering thousands of learners with job-ready tech skills. Join our passionate
            team of instructors, engineers, designers, and community builders.
          </Subtitle>
        </HeaderBox>

        <RolesList>
          <RoleMiniCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="role-icon">
              <FaChalkboardTeacher />
            </div>
            <h3>Trainers & Instructors</h3>
            <p>
              Lead hands-on bootcamps in Full-Stack development, React, Laravel, or Graphic Design.
              Shape student portfolios and inspire the next wave of engineers.
            </p>
            <div className="role-feature">
              <FaCheckCircle /> Full-Time & Part-Time openings
            </div>
          </RoleMiniCard>

          <RoleMiniCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="role-icon">
              <FaLaptopCode />
            </div>
            <h3>Tech & Product Team</h3>
            <p>
              Develop DeepSkills&apos; internal portals, student dashboards, automated assessment tools,
              and educational software with modern tech stacks.
            </p>
            <div className="role-feature">
              <FaCheckCircle /> Modern Next.js & Supabase stack
            </div>
          </RoleMiniCard>

          <RoleMiniCard
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="role-icon">
              <FaRocket />
            </div>
            <h3>Growth & Operations</h3>
            <p>
              Drive student admissions, corporate training partnerships, social media campaigns,
              and student career counselling across our campuses.
            </p>
            <div className="role-feature">
              <FaCheckCircle /> High-impact leadership roles
            </div>
          </RoleMiniCard>
        </RolesList>

        <PerksBar>
          <PerksHighlights>
            <div className="perk-item">
              <FaHeart /> Competitive compensation & bonuses
            </div>
            <div className="perk-item">
              <FaGraduationCap /> Free access to all DeepSkills courses
            </div>
            <div className="perk-item">
              <FaRocket /> Fast-paced, collaborative growth
            </div>
          </PerksHighlights>

          <RegisterButton to="/careers">
            EXPLORE OPEN CAREERS <FaArrowRight style={{ marginLeft: 6 }} />
          </RegisterButton>
        </PerksBar>
      </Container>
    </SectionWrapper>
  );
}
