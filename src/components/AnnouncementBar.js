import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '../../lib/nextRouterDomCompat';
import { FaTimes, FaChevronRight } from 'react-icons/fa';
import { supabase } from '../supabaseClient';

const BarWrapper = styled(motion.aside)`
  position: relative;
  z-index: 1001;
  width: 100%;
  background: linear-gradient(90deg, #59141f 0%, #7B1F2E 30%, #992337 70%, #59141f 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 20px rgba(123, 31, 46, 0.4);
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
`;

const BarInner = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px 48px 10px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  font-size: 0.88rem;
  font-weight: 500;
  text-align: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 9px 36px 9px 14px;
    gap: 8px;
    line-height: 1.4;
  }
`;

const MessageText = styled.span`
  color: #f3f3f3;

  strong {
    color: #ffffff;
    font-weight: 700;
  }

  .deadline {
    color: #ffccd3;
    font-weight: 600;
  }
`;

const ActionButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  color: #7B1F2E;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.25s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  svg {
    font-size: 0.7rem;
    transition: transform 0.2s ease;
  }

  &:hover {
    background: #fff0f2;
    transform: translateX(2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

    svg {
      transform: translateX(3px);
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
`;

const DEFAULT_BANNER = {
  is_active: true,
  message: "We're Hiring Interns! 3-Month Onsite Roles in Gulberg, Lahore (Video Editor, Social Media, Graphic Designer)",
  deadline: "Deadline: 25 Sep",
  button_text: "Apply Now",
  button_link: "/internship",
};

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState(DEFAULT_BANNER);

  useEffect(() => {
    let mounted = true;

    // Check session dismissal first
    try {
      const isDismissed = sessionStorage.getItem('ds_announcement_banner_dismissed');
      if (isDismissed) return;
    } catch {
      /* ignore */
    }

    // Fetch dynamic banner settings from Supabase
    const fetchBannerConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'announcement_bar')
          .maybeSingle();

        if (!error && data && data.value) {
          if (mounted) {
            const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
            setConfig((prev) => ({ ...prev, ...val }));
            if (val.is_active !== false) {
              setVisible(true);
            }
          }
        } else {
          // Default banner active
          if (mounted) setVisible(true);
        }
      } catch {
        if (mounted) setVisible(true);
      }
    };

    fetchBannerConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem('ds_announcement_banner_dismissed', 'true');
    } catch {
      /* ignore */
    }
  };

  if (!config.is_active) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <BarWrapper
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <BarInner>
            <MessageText>
              {config.message}{' '}
              {config.deadline && (
                <>
                  • <span className="deadline">{config.deadline}</span>
                </>
              )}
            </MessageText>
            {config.button_text && config.button_link && (
              <ActionButton to={config.button_link}>
                {config.button_text} <FaChevronRight />
              </ActionButton>
            )}
          </BarInner>
          <CloseButton
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
          >
            <FaTimes />
          </CloseButton>
        </BarWrapper>
      )}
    </AnimatePresence>
  );
}
