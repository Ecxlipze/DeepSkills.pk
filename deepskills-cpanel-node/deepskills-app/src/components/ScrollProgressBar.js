import React from 'react';
import styled from 'styled-components';
import { motion, useScroll, useSpring } from 'framer-motion';

const Bar = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #7B1F2E;
  transform-origin: 0%;
  z-index: 9999;
  box-shadow: 0 0 10px rgba(123, 31, 46, 0.5);
`;

const ScrollProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return <Bar aria-hidden="true" style={{ scaleX }} />;
};

export default ScrollProgressBar;
