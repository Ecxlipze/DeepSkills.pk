import React, { useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

export const getYouTubeId = (url) => {
  if (typeof url !== 'string') return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
};

export const getYouTubeThumbnail = (url, quality = 'hqdefault') => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : null;
};

export const isDirectVideo = (url = '') => {
  return Boolean(url && typeof url === 'string' && url.match(/\.(mp4|webm|ogg)(\?.*)?$/i));
};

export const getVimeoId = (url = '') => {
  if (typeof url !== 'string') return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  return match ? match[1] : null;
};

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ContentBox = styled(motion.div)`
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  width: 100%;
  max-width: 880px;
  overflow: hidden;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(123, 31, 46, 0.3);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  z-index: 20;
  transition: all 0.2s ease;

  &:hover {
    background: #e63946;
    border-color: #e63946;
    transform: scale(1.1);
  }
`;

const PlayerContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${({ $aspectRatio }) => $aspectRatio || '16 / 9'};
  background: #000;

  iframe, video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
`;

const InfoBox = styled.div`
  padding: 20px 24px;
  background: #181818;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  h3 {
    margin: 0 0 6px;
    font-size: 1.2rem;
    font-weight: 700;
    color: #fff;
    font-family: 'Inter', sans-serif;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
  }
`;

export default function TheaterVideoModal({
  video,
  isOpen = true,
  onClose,
  aspectRatio = '16 / 9'
}) {
  const active = Boolean(video && isOpen);
  const rawUrl = typeof video === 'string' ? video : video?.media_url || video?.video_url || video?.url || '';
  const title = typeof video === 'object' ? (video?.title || video?.student_name || '') : '';
  const subtitle = typeof video === 'object' ? (video?.course_name || video?.description || '') : '';

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onClose]);

  const ytId = getYouTubeId(rawUrl);
  const vimeoId = getVimeoId(rawUrl);

  return (
    <AnimatePresence>
      {active && rawUrl && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <ContentBox
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton type="button" onClick={onClose} aria-label="Close video player">
              <FaTimes />
            </CloseButton>

            <PlayerContainer $aspectRatio={aspectRatio}>
              {ytId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                  title={title || 'DeepSkills Video Player'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : vimeoId ? (
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                  title={title || 'DeepSkills Video Player'}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={rawUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              )}
            </PlayerContainer>

            {(title || subtitle) && (
              <InfoBox>
                {title && <h3>{title}</h3>}
                {subtitle && <p>{subtitle}</p>}
              </InfoBox>
            )}
          </ContentBox>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

export { TheaterVideoModal };
