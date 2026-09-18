import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { FaPlay } from 'react-icons/fa';
import TheaterVideoModal, { getYouTubeThumbnail, getYouTubeId, isDirectVideo } from './TheaterVideoModal';
import { supabase } from '../supabaseClient';

const defaultStudentReviews = [
  {
    id: 'rev-1',
    student_name: 'Ali Khan',
    course_name: 'Graphic Design Mastery',
    video_url: 'https://www.youtube.com/watch?v=Qad0KROvoWM',
    thumbnail_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rev-2',
    student_name: 'Ayesha Rahman',
    course_name: 'Laravel PHP Development',
    video_url: 'https://www.youtube.com/watch?v=2TEZUc8Eyo0',
    thumbnail_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rev-3',
    student_name: 'Usman Tariq',
    course_name: 'Full Stack React JS',
    video_url: 'https://www.youtube.com/watch?v=7oXg2mMbWNI',
    thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rev-4',
    student_name: 'Fatima Noor',
    course_name: 'WordPress Mastery',
    video_url: 'https://www.youtube.com/watch?v=kwZFbuIqVz0',
    thumbnail_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rev-5',
    student_name: 'Hamza Sheikh',
    course_name: 'Full Stack Development',
    video_url: 'https://www.youtube.com/watch?v=hkHHwA-vEyQ',
    thumbnail_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rev-6',
    student_name: 'Zainab Bibi',
    course_name: 'UI/UX & Graphic Design',
    video_url: 'https://www.youtube.com/watch?v=C0U-6omir2k',
    thumbnail_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rev-7',
    student_name: 'Bilal Ahmed',
    course_name: 'Backend Web Engineering',
    video_url: 'https://www.youtube.com/watch?v=SqTdHCTWqks',
    thumbnail_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rev-8',
    student_name: 'Sarah Malik',
    course_name: 'WordPress & Freelancing',
    video_url: 'https://www.youtube.com/watch?v=kwZFbuIqVz0',
    thumbnail_url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=600&q=80'
  }
];

const VideoSection = styled.section`
  width: 100%;
  padding: 60px 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  position: relative;

  @media (max-width: 768px) {
    padding: 40px 0;
  }
`;

const Heading = styled(motion.h2)`
  font-size: 3rem;
  font-weight: 800;
  color: #fff;
  text-align: center;
  margin-bottom: 50px;
  line-height: 1.2;
  font-family: 'Asimovian', sans-serif;

  span {
    color: ${props => props.accentColor || '#97C049'};
    display: block;
    font-size: 3.5rem;
    text-shadow: 0 0 25px rgba(${props => props.accentRGB || '151, 192, 73'}, 0.4);
  }

  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 30px;
    span { font-size: 2.2rem; }
  }
`;

const scroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const SliderBackground = styled.div`
  width: 100%;
  background: ${props => props.accentColor || '#97C049'};
  padding: 60px 0;
  position: relative;
  overflow: hidden;
  display: flex;
  box-shadow: inset 0 10px 30px rgba(0,0,0,0.3), inset 0 -10px 30px rgba(0,0,0,0.3);

  @media (max-width: 768px) {
    padding: 40px 0;
  }
`;

const MarqueeContainer = styled.div`
  display: flex;
  gap: 28px;
  width: max-content;
  animation: ${scroll} 35s linear infinite;

  &:hover {
    animation-play-state: paused;
  }

  @media (max-width: 768px) {
    gap: 16px;
    animation: ${scroll} 25s linear infinite;
  }
`;

const VideoCard = styled(motion.div)`
  width: 300px;
  height: 460px;
  background: #181818;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);

  @media (max-width: 768px) {
    width: 210px;
    height: 330px;
    border-radius: 18px;
  }

  /* Card image background */
  .card-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  &:hover .card-image {
    transform: scale(1.06);
  }

  /* Dark gradient overlay for typography */
  .card-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.15) 0%,
      rgba(0, 0, 0, 0.2) 40%,
      rgba(0, 0, 0, 0.85) 75%,
      rgba(0, 0, 0, 0.95) 100%
    );
    z-index: 1;
  }

  /* Subtle shine effect */
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.08), transparent);
    transform: rotate(45deg);
    transition: 0.6s;
    pointer-events: none;
    z-index: 2;
  }

  &:hover::after {
    left: 100%;
    top: 100%;
  }
`;

const PlayIconWrapper = styled(motion.div)`
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.75);
  border: 2px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.5rem;
  z-index: 3;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  transition: all 0.3s ease;
  padding-left: 4px;

  ${VideoCard}:hover & {
    background: ${props => props.accentColor || '#7B1F2E'};
    border-color: #fff;
    transform: scale(1.12);
    box-shadow: 0 0 25px rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    font-size: 1.1rem;
    padding-left: 3px;
  }
`;

const CardInfo = styled.div`
  position: absolute;
  bottom: 22px;
  left: 20px;
  right: 20px;
  z-index: 3;
  text-align: left;
  pointer-events: none;

  h4 {
    margin: 0 0 6px;
    color: #fff;
    font-size: 1.15rem;
    font-weight: 700;
    font-family: 'Asimovian', sans-serif;
    letter-spacing: 0.02em;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  }

  span.badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    font-size: 0.75rem;
    padding: 3px 10px;
    border-radius: 20px;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.03em;
  }

  @media (max-width: 768px) {
    bottom: 16px;
    left: 14px;
    right: 14px;

    h4 {
      font-size: 0.95rem;
      margin-bottom: 4px;
    }

    span.badge {
      font-size: 0.68rem;
      padding: 2px 8px;
    }
  }
`;

const VideoReviews = ({ 
  accentColor = '#97C049', 
  accentRGB = '151, 192, 73',
  courseName,
  reviews: customReviews
}) => {
  const [reviewsList, setReviewsList] = useState(customReviews || []);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    if (customReviews && customReviews.length > 0) {
      setReviewsList(customReviews);
      return;
    }

    let isMounted = true;
    const loadTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0 && isMounted) {
          // Merge database testimonials with default fallback reviews to ensure full marquee
          const dbIds = new Set(data.map(d => d.id || d.student_name));
          const combined = [
            ...data,
            ...defaultStudentReviews.filter(d => !dbIds.has(d.id || d.student_name))
          ];
          setReviewsList(combined);
        } else if (isMounted) {
          setReviewsList(defaultStudentReviews);
        }
      } catch (_) {
        if (isMounted) setReviewsList(defaultStudentReviews);
      }
    };

    loadTestimonials();
    return () => { isMounted = false; };
  }, [customReviews]);

  // Sort reviews to prioritize matching the current course if specified
  const baseReviews = React.useMemo(() => {
    const list = reviewsList.length > 0 ? [...reviewsList] : [...defaultStudentReviews];
    if (courseName) {
      const keyword = courseName.toLowerCase().split(' ')[0];
      list.sort((a, b) => {
        const aMatch = (a.course_name || '').toLowerCase().includes(keyword) ? 1 : 0;
        const bMatch = (b.course_name || '').toLowerCase().includes(keyword) ? 1 : 0;
        return bMatch - aMatch;
      });
    }
    return list;
  }, [reviewsList, courseName]);

  // Ensure we have at least 8 cards for a smooth, wide marquee
  let displayList = [...baseReviews];
  while (displayList.length < 8) {
    displayList = [...displayList, ...baseReviews];
  }
  const duplicatedReviews = [...displayList, ...displayList];

  return (
    <VideoSection>
      <Heading
        accentColor={accentColor}
        accentRGB={accentRGB}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Video Reviews from
        <span>Our Students !</span>
      </Heading>
      
      <SliderBackground accentColor={accentColor}>
        <MarqueeContainer>
          {duplicatedReviews.map((item, index) => {
            const ytThumb = getYouTubeThumbnail(item.video_url);
            const thumb = item.thumbnail_url || ytThumb || defaultStudentReviews[index % defaultStudentReviews.length].thumbnail_url;

            return (
              <VideoCard 
                key={`${item.id || item.student_name}-${index}`}
                whileHover={{ 
                  scale: 1.04,
                  y: -8,
                  transition: { duration: 0.25 }
                }}
                onClick={() => setActiveVideo(item)}
                role="button"
                tabIndex={0}
                aria-label={`Play student video review from ${item.student_name || 'Student'}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveVideo(item); }}
              >
                <img 
                  className="card-image" 
                  src={thumb} 
                  alt={item.student_name || 'Student Review'} 
                  loading="lazy" 
                />
                <div className="card-gradient" />
                
                <PlayIconWrapper accentColor={accentColor}>
                  <FaPlay />
                </PlayIconWrapper>

                <CardInfo>
                  <h4>{item.student_name || 'DeepSkills Student'}</h4>
                  <span className="badge">{item.course_name || courseName || 'Bootcamp Graduate'}</span>
                </CardInfo>
              </VideoCard>
            );
          })}
        </MarqueeContainer>
      </SliderBackground>

      <TheaterVideoModal
        video={activeVideo}
        isOpen={Boolean(activeVideo)}
        onClose={() => setActiveVideo(null)}
      />
    </VideoSection>
  );
};

export default VideoReviews;
