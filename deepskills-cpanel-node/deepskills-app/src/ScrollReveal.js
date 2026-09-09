import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.215, 0.61, 0.355, 1], // easeOutCubic
      staggerChildren: 0.2
    }
  },
  left: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 }
  },
  right: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 }
  },
  zoom: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  }
};

const ScrollReveal = ({ children, direction = 'up', delay = 0, width = '100%' }) => {
  let activeVariant = variants;
  if (direction === 'left') activeVariant = variants.left;
  if (direction === 'right') activeVariant = variants.right;
  if (direction === 'zoom') activeVariant = variants.zoom;

  return (
    <motion.div
      variants={activeVariant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
      style={{ width }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
