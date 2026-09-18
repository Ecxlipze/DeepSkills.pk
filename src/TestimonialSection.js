import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaPlay } from "react-icons/fa";
import TheaterVideoModal, { getYouTubeId, getYouTubeThumbnail } from "./components/TheaterVideoModal";
import leftBtnIcon from "./assets/left-btn.svg";
import rightBtnIcon from "./assets/right-btn.svg";
import graphicThumb from "./assets/graphic-card1.png";
import laravelThumb from "./assets/php-card.svg";
import reactThumb from "./assets/mern-card.png";
import wordpressThumb from "./assets/wp-card.png";
import generalThumb from "./assets/slider-bg.png";

const dummyTestimonials = [
  {
    id: 'dummy-1',
    student_name: 'Ali Khan',
    course_name: 'Graphic Design Mastery',
    video_url: 'https://www.youtube.com/watch?v=Qad0KROvoWM',
    thumbnail_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'dummy-2',
    student_name: 'Ayesha Rahman',
    course_name: 'Laravel PHP Development',
    video_url: 'https://www.youtube.com/watch?v=2TEZUc8Eyo0',
    thumbnail_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'dummy-3',
    student_name: 'Usman Tariq',
    course_name: 'Full Stack React JS',
    video_url: 'https://www.youtube.com/watch?v=7oXg2mMbWNI',
    thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'dummy-4',
    student_name: 'Fatima Noor',
    course_name: 'WordPress Mastery',
    video_url: 'https://www.youtube.com/watch?v=kwZFbuIqVz0',
    thumbnail_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80'
  }
];

const thumbnailByCourse = [
  { match: ['graphic', 'design', 'figma'], src: graphicThumb },
  { match: ['laravel', 'php'], src: laravelThumb },
  { match: ['react', 'mern', 'full stack'], src: reactThumb },
  { match: ['wordpress', 'word press'], src: wordpressThumb },
  { match: ['general', 'homepage', 'all'], src: generalThumb }
];

const getFallbackThumbnail = (courseName = '') => {
  const normalizedCourse = String(courseName).toLowerCase();
  const fallback = thumbnailByCourse.find(({ match }) =>
    match.some((keyword) => normalizedCourse.includes(keyword))
  );

  return fallback?.src || generalThumb || null;
};

const Section = styled.section`
  padding: 40px 20px;
  background-color: #000;
  text-align: center;
`;

const Title = styled(motion.h2)`
  font-family: 'Inter', sans-serif;
  font-size: 2.4rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 40px;
  padding: 0 20px;
`;

const GlowContainer = styled(motion.div)`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  filter: drop-shadow(0 0 40px rgba(255, 0, 64, 0.4));
`;

const MainBox = styled.div`
  background-color: #7B1F2E;
  position: relative;
  z-index: 1;
  padding: 30px 40px;
  /* Cut top-right and bottom-left only */
  clip-path: polygon(
    0 0, 
    calc(100% - 60px) 0, 
    100% 60px, 
    100% 100%, 
    60px 100%, 
    0 calc(100% - 60px)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 1024px) {
    padding: 50px 40px;
  }
  @media (max-width: 768px) {
    padding: 40px 40px;
    border-radius: 30px;
  }
`;

const SliderWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  padding: 0 40px;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const CarouselViewport = styled.div`
  overflow: hidden;
  min-height: 500px;
`;

const CarouselTrack = styled.div`
  display: flex;
  align-items: stretch;
  transform: translateX(${({ $offset }) => $offset}%);
  transition: transform 500ms ease;
  will-change: transform;
`;

const SlideItem = styled.div`
  flex: 0 0 50%;
  min-width: 0;
  padding: 0 15px;

  @media (max-width: 768px) {
    flex-basis: 100%;
    padding: 0;
  }
`;

const StaticFallbackGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const VideoCard = styled(motion.button)`
  background-color: #d9d9d9;
  border: 0;
  border-radius: 20px;
  height: 500px;
  width: 100%;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  /* Force minimum width on mobile to avoid squishing */
  @media (max-width: 768px) {
    height: 480px;
    width: 100% !important;
    max-width: 380px;
    margin: 0 auto;
  }
`;

const ArrowBtn = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
  border: 0;
  background: transparent;
  padding: 0;

  &:hover {
    opacity: 1;
  }

  &.prev {
    left: -90px;
  }
  &.next {
    right: -90px;
  }

  &::before {
    display: none;
  }

  @media (max-width: 768px) {
    /* Hide arrows on mobile for a cleaner swipe experience */
    display: none !important;
  }
`;

const PrevArrow = ({ onClick }) => {
  return (
    <ArrowBtn type="button" className="prev" aria-label="Previous testimonial" onClick={onClick} whileHover={{ x: -10 }}>
      <img src={leftBtnIcon} alt="" aria-hidden="true" style={{ width: 45, height: 45 }} />
    </ArrowBtn>
  );
};

const NextArrow = ({ onClick }) => {
  return (
    <ArrowBtn type="button" className="next" aria-label="Next testimonial" onClick={onClick} whileHover={{ x: 10 }}>
      <img src={rightBtnIcon} alt="" aria-hidden="true" style={{ width: 45, height: 45 }} />
    </ArrowBtn>
  );
};

const Dots = styled.div`
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 28px;
`;

const Dot = styled.button`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 0;
  padding: 0;
  cursor: pointer;
  background: ${({ $active }) => ($active ? '#000' : 'rgba(0, 0, 0, 0.3)')};
  transition: background 200ms ease, transform 200ms ease;

  &:hover,
  &:focus-visible {
    transform: scale(1.25);
    outline: none;
  }
`;

const PlayIconWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: rgba(123, 31, 46, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.5rem;
  z-index: 3;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  transition: all 0.3s ease;
  padding-left: 5px; /* Offset for optical alignment of play icon */

  ${VideoCard}:hover & {
    transform: translate(-50%, -50%) scale(1.1);
    background: #e62e4d;
  }
`;

const VideoFallback = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.18), transparent 26%),
    linear-gradient(135deg, #232323 0%, #7b1f2e 52%, #151515 100%);
`;

const ThumbnailImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.01);
`;

const FunctionalVideoCard = ({ studentName, videoUrl, thumbnail, course, onPlayClick }) => {
  const ytThumb = getYouTubeThumbnail(videoUrl);
  const resolvedThumbnail = thumbnail || ytThumb || getFallbackThumbnail(course);

  return (
    <VideoCard
      type="button"
      aria-label={`Play testimonial video${studentName ? ` from ${studentName}` : ''}`}
      whileHover={{ scale: 1.02 }}
      onClick={() => onPlayClick({ video_url: videoUrl, student_name: studentName, course_name: course })}
    >
      {resolvedThumbnail ? (
        <ThumbnailImage src={resolvedThumbnail} alt="" aria-hidden="true" loading="lazy" />
      ) : (
        <VideoFallback aria-hidden="true" />
      )}
      
      <PlayIconWrapper>
        <FaPlay />
      </PlayIconWrapper>

      {/* Gradient overlay to make text readable */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', zIndex: 1, pointerEvents: 'none' }} />
      
      {/* Information */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', color: '#fff', zIndex: 2, textAlign: 'left', pointerEvents: 'none' }}>
        {studentName && <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontFamily: 'Asimovian, sans-serif' }}>{studentName}</h3>}
        {course && <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc', fontFamily: 'Inter, sans-serif' }}>{course}</p>}
      </div>
    </VideoCard>
  );
};

const TestimonialSection = ({ initialTestimonials = null }) => {
  const [isClient, setIsClient] = useState(false);
  const [modalVideo, setModalVideo] = useState(null);
  // Testimonials arrive via getStaticProps (pages/index.js) so they are present
  // in the prerendered HTML; CMS edits reach the page through revalidation.
  const testimonials = React.useMemo(() => {
    if (initialTestimonials && initialTestimonials.length > 0) {
      const dbNames = new Set(initialTestimonials.map(t => (t.student_name || '').toLowerCase()));
      const extra = dummyTestimonials.filter(d => !dbNames.has((d.student_name || '').toLowerCase()));
      return [...initialTestimonials, ...extra];
    }
    return dummyTestimonials;
  }, [initialTestimonials]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(2);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return undefined;

    const updateSlidesPerView = () => {
      setSlidesPerView(window.matchMedia('(max-width: 768px)').matches ? 1 : 2);
    };

    updateSlidesPerView();
    window.addEventListener('resize', updateSlidesPerView);

    return () => window.removeEventListener('resize', updateSlidesPerView);
  }, [isClient]);

  const maxSlide = Math.max(testimonials.length - slidesPerView, 0);

  useEffect(() => {
    setActiveSlide((current) => Math.min(current, maxSlide));
  }, [maxSlide]);

  useEffect(() => {
    if (!isClient || testimonials.length <= slidesPerView) return undefined;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current >= maxSlide ? 0 : current + 1));
    }, 4000);

    return () => window.clearInterval(timer);
  }, [isClient, maxSlide, slidesPerView, testimonials.length]);

  useEffect(() => {
    if (!modalVideo || typeof document === 'undefined') return undefined;

    document.body.classList.add('ds-native-cursor');

    return () => {
      document.body.classList.remove('ds-native-cursor');
    };
  }, [modalVideo]);

  const goToPrevious = () => {
    setActiveSlide((current) => (current <= 0 ? maxSlide : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current >= maxSlide ? 0 : current + 1));
  };

  const slideOffset = activeSlide * (100 / slidesPerView) * -1;

  if (testimonials.length === 0) return null;

  return (
    <Section id="testimonials">
      <Title
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        Testimonials
      </Title>

      <GlowContainer
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <MainBox>
          <SliderWrapper>
            {isClient ? (
              <>
                {testimonials.length > slidesPerView && <PrevArrow onClick={goToPrevious} />}
                <CarouselViewport>
                  <CarouselTrack $offset={slideOffset}>
                    {testimonials.map((testimonial) => (
                      <SlideItem key={testimonial.id}>
                        <FunctionalVideoCard
                          studentName={testimonial.student_name}
                          videoUrl={testimonial.video_url}
                          thumbnail={testimonial.thumbnail_url}
                          course={testimonial.course_name}
                          onPlayClick={setModalVideo}
                        />
                      </SlideItem>
                    ))}
                  </CarouselTrack>
                </CarouselViewport>
                {testimonials.length > slidesPerView && <NextArrow onClick={goToNext} />}
                <Dots aria-label="Choose testimonial slide">
                  {Array.from({ length: maxSlide + 1 }).map((_, index) => (
                    <Dot
                      key={index}
                      type="button"
                      $active={index === activeSlide}
                      aria-label={`Show testimonial slide ${index + 1}`}
                      aria-current={index === activeSlide ? 'true' : undefined}
                      onClick={() => setActiveSlide(index)}
                    />
                  ))}
                </Dots>
              </>
            ) : (
              <StaticFallbackGrid>
                {testimonials.slice(0, 2).map((testimonial) => (
                <FunctionalVideoCard
                  key={testimonial.id}
                  studentName={testimonial.student_name}
                  videoUrl={testimonial.video_url}
                  thumbnail={testimonial.thumbnail_url}
                  course={testimonial.course_name}
                  onPlayClick={setModalVideo}
                />
              ))}
              </StaticFallbackGrid>
            )}
          </SliderWrapper>
        </MainBox>
      </GlowContainer>

      <TheaterVideoModal
        video={modalVideo}
        isOpen={Boolean(modalVideo)}
        onClose={() => setModalVideo(null)}
      />
    </Section>
  );
};

export default TestimonialSection;
