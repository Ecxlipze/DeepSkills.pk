import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  FaBriefcase,
  FaVideo,
  FaHashtag,
  FaPalette,
  FaCertificate,
  FaGlobeAmericas,
  FaLaptopCode,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaEnvelope,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTimes,
  FaDownload,
  FaSearchPlus,
  FaPaperPlane,
} from 'react-icons/fa';
import { supabase } from './supabaseClient';

const PageWrapper = styled.div`
  background-color: #050507;
  color: #ffffff;
  min-height: 100vh;
  padding-top: 140px;
  padding-bottom: 80px;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 15%;
    width: 650px;
    height: 650px;
    background: radial-gradient(circle, rgba(123, 31, 46, 0.18) 0%, transparent 70%);
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    top: 40%;
    right: 10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(217, 74, 94, 0.1) 0%, transparent 70%);
    filter: blur(90px);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 768px) {
    padding-top: 100px;
  }
`;

const Container = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const BadgeRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const PillBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(123, 31, 46, 0.25);
  color: #ff8597;
  border: 1px solid rgba(217, 74, 94, 0.4);
  padding: 6px 16px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
`;

const DeadlineBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.35);
  padding: 6px 16px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const MainHeading = styled(motion.h1)`
  font-size: clamp(2.4rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffffff 30%, #ffccd3 70%, #d94a5e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const SubHeading = styled(motion.p)`
  font-size: clamp(1.05rem, 2vw, 1.25rem);
  color: #c7c7c7;
  max-width: 780px;
  margin: 0 auto 30px;
  line-height: 1.6;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  max-width: 960px;
  margin: 0 auto 50px;
`;

const MetaCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  transition: all 0.3s ease;

  svg {
    font-size: 1.5rem;
    color: #d94a5e;
    flex-shrink: 0;
  }

  .meta-title {
    font-size: 0.75rem;
    color: #888888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    margin-bottom: 3px;
  }

  .meta-value {
    font-size: 0.95rem;
    color: #ffffff;
    font-weight: 700;
  }

  &:hover {
    border-color: rgba(217, 74, 94, 0.35);
    background: rgba(123, 31, 46, 0.08);
    transform: translateY(-2px);
  }
`;

/* Flyer Card & Showcase */
const FlyerShowcase = styled.div`
  background: linear-gradient(145deg, rgba(25, 12, 16, 0.8) 0%, rgba(10, 10, 12, 0.9) 100%);
  border: 1px solid rgba(123, 31, 46, 0.4);
  border-radius: 20px;
  padding: 30px;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 36px;
  align-items: center;
  margin-bottom: 70px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 24px;
  }
`;

const FlyerThumbnailWrapper = styled.div`
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  aspect-ratio: 4 / 5;
  background: #111;

  img {
    object-fit: cover;
    transition: transform 0.4s ease;
    width: 100%;
    height: 100%;
  }

  &:hover img {
    transform: scale(1.04);
  }

  .zoom-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-size: 0.9rem;
    font-weight: 600;

    svg {
      font-size: 1.8rem;
      color: #ff8597;
    }
  }

  &:hover .zoom-overlay {
    opacity: 1;
  }
`;

const FlyerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  h2 {
    font-size: 1.8rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  p {
    color: #b3b3b3;
    line-height: 1.6;
    margin: 0;
    font-size: 1rem;
  }

  .button-group {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 10px;

    @media (max-width: 960px) {
      justify-content: center;
    }
  }
`;

const PrimaryBtn = styled.button`
  background: linear-gradient(135deg, #7B1F2E 0%, #a8273b 100%);
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(123, 31, 46, 0.4);

  &:hover {
    background: linear-gradient(135deg, #962537 0%, #c42d44 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(123, 31, 46, 0.6);
  }
`;

const SecondaryBtn = styled.a`
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 12px 22px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
  }
`;

/* Roles Section */
const SectionHeading = styled.div`
  text-align: center;
  margin-bottom: 40px;

  h2 {
    font-size: clamp(1.8rem, 3.5vw, 2.5rem);
    font-weight: 800;
    margin-bottom: 12px;
    color: #fff;
  }

  p {
    color: #999;
    font-size: 1.05rem;
    max-width: 600px;
    margin: 0 auto;
  }
`;

const RolesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 70px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const RoleCard = styled(motion.div)`
  background: rgba(18, 18, 22, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #7B1F2E, #ff4d67);
    opacity: 0.8;
  }

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(217, 74, 94, 0.4);
    box-shadow: 0 16px 35px rgba(0, 0, 0, 0.4);
  }
`;

const RoleIconCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(123, 31, 46, 0.2);
  border: 1px solid rgba(217, 74, 94, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff7589;
  font-size: 1.6rem;
  margin-bottom: 20px;
`;

const RoleTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
`;

const RoleTypeTag = styled.span`
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #ffccd3;
  margin-bottom: 16px;
`;

const RoleList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  flex-grow: 1;

  li {
    font-size: 0.9rem;
    color: #cccccc;
    margin-bottom: 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    line-height: 1.5;

    svg {
      color: #2ed573;
      font-size: 0.95rem;
      margin-top: 3px;
      flex-shrink: 0;
    }
  }
`;

const SkillTagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
`;

const SkillTag = styled.span`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
`;

const ApplyForRoleBtn = styled.button`
  background: rgba(123, 31, 46, 0.3);
  border: 1px solid rgba(217, 74, 94, 0.4);
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  transition: all 0.25s ease;

  &:hover {
    background: #7B1F2E;
    color: #fff;
    border-color: #7B1F2E;
  }
`;

/* Perks Section */
const PerksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 70px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const PerkCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px 20px;
  text-align: center;
  transition: all 0.3s ease;

  svg {
    font-size: 2.2rem;
    color: #ff526c;
    margin-bottom: 16px;
  }

  h4 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }

  p {
    font-size: 0.85rem;
    color: #999;
    line-height: 1.5;
    margin: 0;
  }

  &:hover {
    border-color: rgba(217, 74, 94, 0.35);
    background: rgba(123, 31, 46, 0.08);
    transform: translateY(-4px);
  }
`;

/* Dual Application Form Section */
const ApplicationSection = styled.div`
  background: linear-gradient(135deg, rgba(20, 10, 14, 0.9) 0%, rgba(10, 10, 14, 0.95) 100%);
  border: 1px solid rgba(123, 31, 46, 0.4);
  border-radius: 24px;
  padding: 44px;
  margin-bottom: 70px;
  scroll-margin-top: 120px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);

  @media (max-width: 768px) {
    padding: 24px 18px;
    scroll-margin-top: 90px;
  }
`;

const FormLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 40px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 30px;
  }
`;

const FormInfo = styled.div`
  h3 {
    font-size: 2rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 14px;
    line-height: 1.25;
  }

  p {
    color: #b0b0b0;
    line-height: 1.6;
    margin-bottom: 24px;
    font-size: 0.95rem;
  }

  .direct-box {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 20px;
    margin-top: 20px;

    .direct-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #ffccd3;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .direct-email {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      display: block;
      margin-bottom: 12px;
      text-decoration: none;
      word-break: break-all;

      &:hover {
        color: #ff7589;
      }
    }
  }
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e0e0e0;
  }

  input, select, textarea {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    padding: 12px 14px;
    color: #fff;
    font-family: inherit;
    font-size: 0.95rem;
    transition: all 0.25s ease;

    &:focus {
      outline: none;
      border-color: #d94a5e;
      background: rgba(0, 0, 0, 0.75);
      box-shadow: 0 0 10px rgba(217, 74, 94, 0.3);
    }
  }

  textarea {
    resize: vertical;
    min-height: 90px;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, #7B1F2E 0%, #c42d44 100%);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(123, 31, 46, 0.5);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(123, 31, 46, 0.7);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const StatusNotice = styled.div`
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 0.92rem;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 10px;

  &.success {
    background: rgba(46, 213, 115, 0.15);
    border: 1px solid rgba(46, 213, 115, 0.4);
    color: #2ed573;
  }

  &.error {
    background: rgba(255, 71, 87, 0.15);
    border: 1px solid rgba(255, 71, 87, 0.4);
    color: #ff4757;
  }
`;

/* Location Card */
const LocationSection = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 30px;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 30px;
  align-items: center;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const LocationDetails = styled.div`
  h3 {
    font-size: 1.6rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 12px;
  }

  p {
    color: #b0b0b0;
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .address-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: rgba(255, 255, 255, 0.04);
    padding: 14px 18px;
    border-radius: 12px;
    color: #ffffff;
    font-weight: 600;
    margin-bottom: 18px;

    svg {
      color: #d94a5e;
      font-size: 1.3rem;
      margin-top: 3px;
      flex-shrink: 0;
    }
  }
`;

const MapFrame = styled.div`
  width: 100%;
  height: 250px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

/* Modal Preview */
const ModalBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(10px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  position: relative;
  max-width: 580px;
  width: 100%;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
`;

const ModalImageWrapper = styled.div`
  position: relative;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;

  img {
    width: 100%;
    height: auto;
    display: block;
  }
`;

const ModalCloseBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    background: #7B1F2E;
    border-color: #7B1F2E;
    transform: scale(1.08);
  }
`;

const DEFAULT_PROGRAM_CONFIG = {
  is_active: true,
  title: '3-Month Onsite Internship in Lahore',
  subtitle:
    'Launch your creative career with DeepSkills. Work on live campaigns, learn cutting-edge workflows under senior mentors, and build a portfolio that commands industry respect.',
  duration: '3 Months (Full-Cycle)',
  location: 'Kickstart, Gulberg III, Lahore',
  eligibility: 'Freshers Welcome (We Train You)',
  format: 'Unpaid (Training-Oriented)',
  deadline: '25 September',
  hr_email: 'hr@deepskills.pk',
  flyer_url: '/images/internship-flyer.jpg',
  roles: [
    {
      title: 'Video Editor',
      type: 'Onsite Internship',
      description: 'Transform raw footage into dynamic, high-engagement visual stories for social channels.',
      responsibilities: [
        'Creating Reels, TikToks & YouTube long/short-form content',
        'Adding subtitles, sound design, sound effects & dynamic transitions',
        'Maintaining consistent pacing, brand aesthetic & narrative flow',
        'Optimizing video exports for multi-platform delivery',
      ],
      skills: ['Premiere Pro', 'CapCut', 'After Effects', 'Sound Design', 'Storytelling'],
    },
    {
      title: 'Social Media Handler',
      type: 'Onsite Internship',
      description: 'Execute social publishing, craft compelling copy, and drive active creator engagement.',
      responsibilities: [
        'Scheduling and publishing posts across Instagram, TikTok, LinkedIn & FB',
        'Writing punchy captions, creative hooks & hashtag strategies',
        'Engaging with our community through comments and direct messages',
        'Researching trending sounds, viral formats & audience analytics',
      ],
      skills: ['Content Strategy', 'Copywriting', 'Meta Business Suite', 'Trend Tracking'],
    },
    {
      title: 'Graphic Designer',
      type: 'Onsite Internship',
      description: 'Design scroll-stopping visuals, thumbnails, and branding assets for DeepSkills campaigns.',
      responsibilities: [
        'Designing high-converting social posts, carousels & stories',
        'Creating high-CTR YouTube thumbnails and YouTube channel banners',
        'Designing event posters, promotional flyers & marketing materials',
        'Strictly adhering to DeepSkills typography & visual guidelines',
      ],
      skills: ['Photoshop', 'Illustrator', 'Figma', 'Canva', 'Visual Hierarchy'],
    },
  ],
};

export default function InternshipPage() {
  const [program, setProgram] = useState(DEFAULT_PROGRAM_CONFIG);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Video Editor');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Video Editor',
    portfolioUrl: '',
    message: '',
  });

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
            if (val.roles && val.roles.length > 0) {
              setSelectedRole(val.roles[0].title);
              setFormData((f) => ({ ...f, role: val.roles[0].title }));
            }
          }
        }
      } catch {
        /* fallback to defaults */
      }
    };

    fetchProgram();
    return () => {
      mounted = false;
    };
  }, []);

  const getRoleIcon = (title) => {
    const key = (title || '').toLowerCase();
    if (key.includes('video')) return <FaVideo />;
    if (key.includes('social')) return <FaHashtag />;
    return <FaPalette />;
  };

  const perks = [
    {
      icon: <FaCertificate />,
      title: '2 Internship Certificates',
      desc: 'Official program completion certificate and experience commendation letter.',
    },
    {
      icon: <FaGlobeAmericas />,
      title: 'International Certification',
      desc: 'Credential endorsement recognized by global agencies and employers.',
    },
    {
      icon: <FaLaptopCode />,
      title: 'Hands-On Mentorship',
      desc: 'Daily guidance and direct feedback from senior media and creative leads.',
    },
    {
      icon: <FaBriefcase />,
      title: 'Portfolio-Ready Work',
      desc: 'Real production projects and published creative assets for your resume.',
    },
  ];

  const handleRoleSelect = (roleTitle) => {
    setSelectedRole(roleTitle);
    setFormData((prev) => ({ ...prev, role: roleTitle }));
    const formElement = document.getElementById('apply-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormStatus(null);

    try {
      const res = await fetch('/api/internship-apply/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok && result.status === 'success') {
        setFormStatus({
          type: 'success',
          message: result.message || 'Application submitted successfully! Our HR team will reach out soon.',
        });
        setFormData({
          name: '',
          email: '',
          phone: '',
          role: selectedRole,
          portfolioUrl: '',
          message: '',
        });
      } else {
        setFormStatus({
          type: 'error',
          message: result.message || 'Could not submit application. Please try again or email hr@deepskills.pk',
        });
      }
    } catch {
      setFormStatus({
        type: 'error',
        message: 'Network error. Please email your CV and portfolio directly to hr@deepskills.pk',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <Container>
        {/* Hero Section */}
        <HeroSection>
          <BadgeRow>
            <PillBadge>
              <FaBriefcase /> {program.is_active ? 'Applications Now Open' : 'Program Closed'}
            </PillBadge>
            {program.deadline && (
              <DeadlineBadge>
                <FaCalendarAlt /> Deadline: {program.deadline}
              </DeadlineBadge>
            )}
          </BadgeRow>

          <MainHeading
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {program.title}
          </MainHeading>

          <SubHeading
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {program.subtitle}
          </SubHeading>

          <MetaGrid>
            <MetaCard>
              <FaClock />
              <div>
                <div className="meta-title">Duration</div>
                <div className="meta-value">{program.duration}</div>
              </div>
            </MetaCard>
            <MetaCard>
              <FaMapMarkerAlt />
              <div>
                <div className="meta-title">Location</div>
                <div className="meta-value">{program.location}</div>
              </div>
            </MetaCard>
            <MetaCard>
              <FaBriefcase />
              <div>
                <div className="meta-title">Eligibility</div>
                <div className="meta-value">{program.eligibility}</div>
              </div>
            </MetaCard>
            <MetaCard>
              <FaCertificate />
              <div>
                <div className="meta-title">Format</div>
                <div className="meta-value">{program.format}</div>
              </div>
            </MetaCard>
          </MetaGrid>
        </HeroSection>

        {/* Official Flyer Banner & Preview */}
        <FlyerShowcase>
          <FlyerThumbnailWrapper onClick={() => setModalOpen(true)}>
            <Image
              src={program.flyer_url || '/images/internship-flyer.jpg'}
              alt="DeepSkills Official Internship Hiring Flyer"
              width={400}
              height={500}
              priority
              unoptimized
            />
            <div className="zoom-overlay">
              <FaSearchPlus />
              <span>Click to Zoom Flyer</span>
            </div>
          </FlyerThumbnailWrapper>

          <FlyerInfo>
            <PillBadge style={{ width: 'fit-content' }}>
              Official Announcement
            </PillBadge>
            <h2>{program.title}</h2>
            <p>
              {program.subtitle}
            </p>
            <div className="button-group">
              <PrimaryBtn
                type="button"
                onClick={() => {
                  const el = document.getElementById('apply-form');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Apply Online Now <FaPaperPlane />
              </PrimaryBtn>
              <SecondaryBtn href={program.flyer_url || '/images/internship-flyer.jpg'} download="DeepSkills-Program-Flyer.jpg">
                <FaDownload /> Download Flyer
              </SecondaryBtn>
              <SecondaryBtn
                as="button"
                type="button"
                onClick={() => setModalOpen(true)}
              >
                <FaExternalLinkAlt /> View Full Poster
              </SecondaryBtn>
            </div>
          </FlyerInfo>
        </FlyerShowcase>

        {/* Available Roles Section */}
        <SectionHeading>
          <h2>Open Internship Positions</h2>
          <p>Choose the creative path that matches your passion. Beginners and self-taught creators are encouraged to apply.</p>
        </SectionHeading>

        <RolesGrid>
          {(program.roles || []).map((role, idx) => (
            <RoleCard
              key={role.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
            >
              <RoleIconCircle>{getRoleIcon(role.title)}</RoleIconCircle>
              <RoleTitle>{role.title}</RoleTitle>
              <RoleTypeTag>{role.type || 'Onsite Internship'}</RoleTypeTag>
              <p style={{ color: '#aaa', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '16px' }}>
                {role.description}
              </p>

              {role.responsibilities && role.responsibilities.length > 0 && (
                <RoleList>
                  {role.responsibilities.map((resp, rIdx) => (
                    <li key={rIdx}>
                      <FaCheckCircle />
                      <span>{resp}</span>
                    </li>
                  ))}
                </RoleList>
              )}

              {role.skills && role.skills.length > 0 && (
                <>
                  <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
                    Preferred Tools & Focus:
                  </div>
                  <SkillTagsContainer>
                    {role.skills.map((skill) => (
                      <SkillTag key={skill}>{skill}</SkillTag>
                    ))}
                  </SkillTagsContainer>
                </>
              )}

              <ApplyForRoleBtn
                type="button"
                onClick={() => handleRoleSelect(role.title)}
              >
                Select & Apply for {role.title} →
              </ApplyForRoleBtn>
            </RoleCard>
          ))}
        </RolesGrid>

        {/* Program Perks & What You Get */}
        <SectionHeading>
          <h2>Why Intern with DeepSkills?</h2>
          <p>We provide more than experience — we provide credentials, direct mentorship, and a launchpad for your career.</p>
        </SectionHeading>

        <PerksGrid>
          {perks.map((perk) => (
            <PerkCard key={perk.title}>
              {perk.icon}
              <h4>{perk.title}</h4>
              <p>{perk.desc}</p>
            </PerkCard>
          ))}
        </PerksGrid>

        {/* Dual Application Form & Email Section */}
        <ApplicationSection id="apply-form">
          <FormLayout>
            <FormInfo>
              <PillBadge style={{ marginBottom: 14 }}>
                <FaPaperPlane /> Join the Squad
              </PillBadge>
              <h3>Apply for DeepSkills Internship</h3>
              <p>
                Fill out the application form on the right, or email your resume and portfolio links directly to our recruitment team.
              </p>
              <p>
                <strong>Important:</strong> Please ensure your portfolio link (Google Drive, Behance, YouTube, or social profile) has public viewing access enabled.
              </p>

              <div className="direct-box">
                <div className="direct-title">
                  <FaEnvelope /> Direct HR Recruitment Email
                </div>
                <a className="direct-email" href={`mailto:${program.hr_email || 'hr@deepskills.pk'}?subject=Application%20for%20DeepSkills%20Internship`}>
                  {program.hr_email || 'hr@deepskills.pk'}
                </a>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>
                  Subject line recommended: <em>Application for Internship - [Your Role] - [Your Name]</em>
                </p>
              </div>
            </FormInfo>

            <div>
              <StyledForm onSubmit={handleFormSubmit}>
                {formStatus && (
                  <StatusNotice className={formStatus.type}>
                    {formStatus.type === 'success' ? <FaCheckCircle /> : <FaTimes />}
                    <span>{formStatus.message}</span>
                  </StatusNotice>
                )}

                <FormRow>
                  <FormGroup>
                    <label htmlFor="applicant-name">Full Name *</label>
                    <input
                      id="applicant-name"
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. Muhammad Ali"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <label htmlFor="applicant-phone">WhatsApp / Phone *</label>
                    <input
                      id="applicant-phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="0300 1234567"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </FormGroup>
                </FormRow>

                <FormRow>
                  <FormGroup>
                    <label htmlFor="applicant-email">Email Address *</label>
                    <input
                      id="applicant-email"
                      name="email"
                      type="email"
                      required
                      placeholder="ali@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <label htmlFor="applicant-role">Applying For *</label>
                    <select
                      id="applicant-role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      {(program.roles || []).map((r) => (
                        <option key={r.title} value={r.title}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </FormGroup>
                </FormRow>

                <FormGroup>
                  <label htmlFor="applicant-portfolio">Portfolio / Drive / Profile Link *</label>
                  <input
                    id="applicant-portfolio"
                    name="portfolioUrl"
                    type="text"
                    required
                    placeholder="https://drive.google.com/... or Behance/YouTube/Instagram link"
                    value={formData.portfolioUrl}
                    onChange={handleInputChange}
                  />
                </FormGroup>

                <FormGroup>
                  <label htmlFor="applicant-message">Brief Introduction / Tell Us About Yourself</label>
                  <textarea
                    id="applicant-message"
                    name="message"
                    placeholder="Share your background, creative goals, or software you are comfortable using..."
                    value={formData.message}
                    onChange={handleInputChange}
                  />
                </FormGroup>

                <SubmitButton type="submit" disabled={formSubmitting}>
                  {formSubmitting ? (
                    'Submitting Application...'
                  ) : (
                    <>
                      Submit Application <FaPaperPlane />
                    </>
                  )}
                </SubmitButton>
              </StyledForm>
            </div>
          </FormLayout>
        </ApplicationSection>

        {/* Location Section */}
        <LocationSection>
          <LocationDetails>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff8597', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: 10 }}>
              <FaMapMarkerAlt /> Onsite Workspace
            </div>
            <h3>DeepSkills at Kickstart, Gulberg III</h3>
            <p>
              Our onsite interns work in an energetic, modern coworking environment equipped with high-speed internet, dedicated workstations, and creative breakout rooms.
            </p>
            <div className="address-box">
              <FaMapMarkerAlt />
              <div>
                <div>Kickstart Coworking Space</div>
                <div style={{ fontSize: '0.9rem', color: '#ccc', fontWeight: 400 }}>
                  {program.location || '58-A2, Tipu Road, Gulberg III, Lahore, Punjab, Pakistan'}
                </div>
              </div>
            </div>
            <SecondaryBtn
              href="https://maps.google.com/?q=58+A2,+Tipu+Road+Gulberg+III,+Lahore+Pakistan"
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: 'fit-content' }}
            >
              Open in Google Maps <FaExternalLinkAlt />
            </SecondaryBtn>
          </LocationDetails>

          <MapFrame>
            <iframe
              title="DeepSkills Kickstart Gulberg III Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3401.7824128503895!2d74.3486143764835!3d31.50260497422079!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391904576307a679%3A0x88dbb66eaec8fb57!2s58-A2%2C%20Tipu%20Rd%2C%20Gulberg%20III%2C%20Lahore!5e0!3m2!1sen!2spk!4v1700000000000!5m2!1sen!2spk"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </MapFrame>
        </LocationSection>
      </Container>

      {/* Lightbox Flyer Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ModalBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalCloseBtn
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close poster preview"
              >
                <FaTimes />
              </ModalCloseBtn>
              <ModalImageWrapper>
                <Image
                  src={program.flyer_url || '/images/internship-flyer.jpg'}
                  alt="DeepSkills Official Internship Flyer Poster"
                  width={600}
                  height={850}
                  priority
                  unoptimized
                />
              </ModalImageWrapper>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0c' }}>
                <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Official DeepSkills Hiring Flyer</span>
                <SecondaryBtn
                  href={program.flyer_url || '/images/internship-flyer.jpg'}
                  download="DeepSkills-Internship-Flyer.jpg"
                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  <FaDownload /> Download
                </SecondaryBtn>
              </div>
            </ModalContent>
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
