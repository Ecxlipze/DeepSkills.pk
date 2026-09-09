import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from '../../lib/nextRouterDomCompat';
import { useAuth } from '../context/AuthContext';
import { FaCheckCircle } from 'react-icons/fa';
import { getEnrollmentPath } from '../utils/enrollmentNavigation';

const CardColumn = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
  width: 100%;
`;

const EnrollCard = styled(motion.div)`
  background: white;
  border-radius: 20px;
  overflow: hidden;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  transform-style: preserve-3d;
  color: #000;
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/9; // Reserves space precisely
  background: #f0f0f0;
  overflow: hidden;
`;

const SkeletonPulse = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  z-index: 1;
`;

const CardImage = styled(motion.img)`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  position: relative;
  z-index: 2;
`;

const CardContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const CreatorText = styled.p`
  font-size: 0.8rem;
  color: #666;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #333;
  font-size: 1rem;

  svg {
    color: ${props => props.$accentColor || '#7B1F2E'};
    font-size: 1.2rem;
  }

  &::before {
    content: '';
    display: ${props => props.$useIcon ? 'none' : 'block'};
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${props => props.$accentColor || '#7B1F2E'};
    flex-shrink: 0;
  }
`;

const EnrollButton = styled(motion.button)`
  width: 100%;
  padding: 16px;
  background-color: ${props => props.$accentColor || '#7B1F2E'};
  color: #fff;
  font-weight: 800;
  border-radius: 12px;
  border: none;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
  }
`;


const CourseEnrollCard = ({ 
  image, 
  courseId, 
  title, 
  accentColor, 
  features = [], 
  iconType,
  useIcons = false 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleEnroll = () => {
    navigate(getEnrollmentPath(user, courseId));
  };

  return (
    <CardColumn
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <EnrollCard style={{ rotateX, rotateY }}>
        <ImageWrapper>
          {!imageLoaded && <SkeletonPulse />}
          <CardImage 
            src={image} 
            alt={title} 
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
        </ImageWrapper>
        <CardContent>
          <CreatorText>Course Outcomes</CreatorText>
          
          <FeatureList>
            {features.map((feature, index) => (
              <FeatureItem key={index} $accentColor={accentColor} $useIcon={useIcons}>
                {useIcons && <FaCheckCircle />}
                {feature}
              </FeatureItem>
            ))}
          </FeatureList>

          <EnrollButton 
            $accentColor={accentColor}
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={handleEnroll}
          >
            Enroll Now
          </EnrollButton>
          
        </CardContent>
      </EnrollCard>
    </CardColumn>
  );
};

export default CourseEnrollCard;
