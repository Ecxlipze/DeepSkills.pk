import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from '../../lib/nextRouterDomCompat';
import {
  FaVideo,
  FaHashtag,
  FaPalette,
  FaCalendarAlt,
  FaArrowRight,
  FaCheckCircle,
  FaCertificate,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import { supabase } from '../supabaseClient';

const SectionWrapper = styled.section`
  position: relative;
  background: linear-gradient(180deg, #09090c 0%, #15090d 50%, #09090c 100%);
  padding: 90px 24px;
  overflow: hidden;
  scroll-margin-top: 100px;
  font-family: 'Inter', sans-serif;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 400px;
    background: radial-gradient(ellipse, rgba(123, 31, 46, 0.25) 0%, transparent 70%);
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

const DeadlineTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.35);
  color: #ffc107;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 5px 14px;
  border-radius: 20px;
`;

const Title = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
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
  border-radius: 16px;
  padding: 28px 24px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: rgba(217, 74, 94, 0.4);
    background: rgba(123, 31, 46, 0.08);
    transform: translateY(-4px);
  }

  .role-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(123, 31, 46, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff7589;
    font-size: 1.4rem;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 10px;
  }

  p {
    font-size: 0.9rem;
    color: #a5a5a5;
    line-height: 1.55;
    margin: 0 0 18px;
    flex-grow: 1;
  }

  .role-feature {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: #d0d0d0;

    svg {
      color: #2ed573;
      font-size: 0.9rem;
    }
  }
`;

const PerksBar = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 22px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;

  @media (max-width: 860px) {
    flex-direction: column;
    text-align: center;
    gap: 18px;
  }
`;

const PerksHighlights = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
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
    font-weight: 600;

    svg {
      color: #ff526c;
      font-size: 1.1rem;
    }
  }
`;

const CtaButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #7B1F2E 0%, #c42d44 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 12px 28px;
  border-radius: 30px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(123, 31, 46, 0.5);
  white-space: nowrap;

  svg {
    transition: transform 0.2s ease;
  }

  &:hover {
    background: linear-gradient(135deg, #962537 0%, #db344c 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(123, 31, 46, 0.7);

    svg {
      transform: translateX(4px);
    }
  }
`;

const DEFAULT_PROGRAM = {
  is_active: true,
  title: '3-Month Onsite Creative Internship',
  subtitle: 'Level up your skills with real projects at Kickstart, Gulberg III Lahore. Freshers welcome — we train you with two recognized certificates.',
  deadline: '25 September',
  location: 'Kickstart, Gulberg III, Lahore',
  roles: [
    {
      title: 'Video Editor',
      iconType: 'video',
      desc: 'Craft high-impact Reels, TikToks, and YouTube content with modern pacing, subtitles, and transitions.',
      feature: 'Premiere Pro & CapCut',
    },
    {
      title: 'Social Media',
      iconType: 'hashtag',
      desc: 'Schedule multi-channel campaigns, write compelling captions, track viral trends, and build audience community.',
      feature: 'Multi-Platform Strategy',
    },
    {
      title: 'Graphic Designer',
      iconType: 'palette',
      desc: 'Design viral carousels, marketing flyers, brand guidelines, and high-CTR YouTube thumbnails.',
      feature: 'Photoshop, Illustrator & Figma',
    },
  ],
};

export default function InternshipSpotlight() {
  const [program, setProgram] = useState(DEFAULT_PROGRAM);

  useEffect(() => {
    let mounted = true;

    const fetchProgram = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'internship_program')
          .maybeSingle();

        if (!error && data && data.value) {
          const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (mounted && val) {
            setProgram((prev) => ({
              ...prev,
              ...val,
              roles: val.roles && val.roles.length > 0 ? val.roles : prev.roles,
            }));
          }
        }
      } catch {
        /* fallback to default */
      }
    };

    fetchProgram();

    return () => {
      mounted = false;
    };
  }, []);

  if (program.is_active === false) {
    return null;
  }

  const getRoleIcon = (type, title) => {
    const key = (type || title || '').toLowerCase();
    if (key.includes('video')) return <FaVideo />;
    if (key.includes('social')) return <FaHashtag />;
    return <FaPalette />;
  };

  return (
    <SectionWrapper id="internship-spotlight">
      <Container>
        <HeaderBox>
          <TopBadgeRow>
            <HiringBadge>Open Internship Positions</HiringBadge>
            {program.deadline && (
              <DeadlineTag>
                <FaCalendarAlt /> Deadline: {program.deadline}
              </DeadlineTag>
            )}
          </TopBadgeRow>

          <Title>
            <span>{program.title}</span>
          </Title>
          <Subtitle>{program.subtitle}</Subtitle>
        </HeaderBox>

        <RolesList>
          {program.roles.map((role) => (
            <RoleMiniCard key={role.title} whileHover={{ y: -4 }}>
              <div className="role-icon">
                {getRoleIcon(role.iconType, role.title)}
              </div>
              <h3>{role.title}</h3>
              <p>{role.desc || role.description}</p>
              {(role.feature || (role.skills && role.skills[0])) && (
                <div className="role-feature">
                  <FaCheckCircle /> {role.feature || role.skills.join(', ')}
                </div>
              )}
            </RoleMiniCard>
          ))}
        </RolesList>

        <PerksBar>
          <PerksHighlights>
            <div className="perk-item">
              <FaCertificate /> 2 Certificates Awarded
            </div>
            <div className="perk-item">
              <FaCertificate /> International Certification
            </div>
            <div className="perk-item">
              <FaMapMarkerAlt /> {program.location || 'Kickstart, Gulberg III Lahore'}
            </div>
          </PerksHighlights>

          <CtaButton to="/internship">
            Explore Roles & Apply Now <FaArrowRight />
          </CtaButton>
        </PerksBar>
      </Container>
    </SectionWrapper>
  );
}
