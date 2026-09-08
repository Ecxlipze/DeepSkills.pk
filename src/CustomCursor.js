import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const CursorWrapper = styled(motion.div)`
  position: fixed;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  border: 2px solid #fff;
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: difference;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: border-color 0.3s ease;

  body.ds-native-cursor & {
    display: none;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const CursorDot = styled(motion.div)`
  position: fixed;
  left: 0;
  top: 0;
  width: 8px;
  height: 8px;
  background-color: #7B1F2E;
  border-radius: 50%;
  pointer-events: none;
  z-index: 10000;

  body.ds-native-cursor & {
    display: none;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pathname, setPathname] = useState('');
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const getAccentColor = () => {
    const path = pathname;
    if (path.includes('graphic')) return '#9335E8'; // Graphic Design Purple
    if (path.includes('laravel')) return '#03E4FD'; // Laravel Cyan
    if (path.includes('react')) return '#98C04C';   // React Green
    if (path.includes('wordpress')) return '#21759B';// WordPress Blue
    return '#7B1F2E'; // Default Deepskills Red
  };

  const hexToRgba = (hex, alpha) => {
    let rawHex = hex.replace('#', '');
    if (rawHex.length === 3) {
      rawHex = rawHex.split('').map(char => char + char).join('');
    }
    const r = parseInt(rawHex.substring(0, 2), 16);
    const g = parseInt(rawHex.substring(2, 4), 16);
    const b = parseInt(rawHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const accentColor = getAccentColor();
  const hoverColor = hexToRgba(accentColor, 0.4);

  const springConfig = { damping: 20, stiffness: 400 };
  const dotSpringConfig = { damping: 30, stiffness: 1000 };

  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const dotX = useSpring(mouseX, dotSpringConfig);
  const dotY = useSpring(mouseY, dotSpringConfig);

  useEffect(() => {
    const updatePathname = () => {
      setPathname(window.location.pathname || '');
    };

    updatePathname();
    window.addEventListener('popstate', updatePathname);
    window.addEventListener('hashchange', updatePathname);

    const media = window.matchMedia('(min-width: 769px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const updateEnabled = () => setEnabled(media.matches);
    updateEnabled();
    media.addEventListener('change', updateEnabled);

    let lastTarget = null;

    const moveMouse = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleHover = (e) => {
      const target = e.target;
      if (target === lastTarget) return;
      lastTarget = target;

      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        window.getComputedStyle(target).cursor === 'pointer';

      setIsHovering(isClickable);
    };

    window.addEventListener('mousemove', moveMouse, { passive: true });
    window.addEventListener('mouseover', handleHover, { passive: true });

    return () => {
      window.removeEventListener('popstate', updatePathname);
      window.removeEventListener('hashchange', updatePathname);
      window.removeEventListener('mousemove', moveMouse);
      window.removeEventListener('mouseover', handleHover);
      media.removeEventListener('change', updateEnabled);
    };
  }, [mouseX, mouseY]);

  // Hide the native pointer only after the replacement has mounted.
  // Removing this component restores the pointer without leaving inline styles.
  useEffect(() => {
    if (!enabled) return undefined;
    document.body.classList.add('ds-custom-cursor-active');
    return () => document.body.classList.remove('ds-custom-cursor-active');
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <CursorWrapper
        className="ds-custom-cursor"
        aria-hidden="true"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          borderWidth: isHovering ? '1px' : '2px',
          opacity: 1
        }}
      />
      <CursorDot
        className="ds-custom-cursor"
        aria-hidden="true"
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovering ? 4 : 1,
          backgroundColor: isHovering ? hoverColor : accentColor,
        }}
      />
    </>
  );
};

export default CustomCursor;
