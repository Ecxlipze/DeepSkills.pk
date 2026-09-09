import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, x: 0, y: 20 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: 0, y: -20 },
};

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={false}
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
