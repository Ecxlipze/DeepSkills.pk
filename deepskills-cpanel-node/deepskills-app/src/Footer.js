import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { Link as RouterLink } from "../lib/nextRouterDomCompat";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import footerBg from "./assets/footer-bg.png";
import footerLogo from "./assets/footer-logo.svg";

const FooterSection = styled.footer`
  background: url(${footerBg});
  background-size: cover;
  background-position: center;
  padding: 60px 40px 20px;
  color: #fff;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    padding: 40px 25px 10px;
  }
`;

const Grid = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.8fr 1fr 1.2fr 1.2fr 1.8fr;
  gap: 15px;

  @media (max-width: 1280px) {
    grid-template-columns: 1fr 1fr;
    gap: 40px;

    & > *:last-child {
      grid-column: span 2;
      align-items: center;
      text-align: center;
    }
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    & > *:last-child {
      grid-column: span 1;
    }
    & > * {
      align-items: center;
      text-align: center;
    }
  }
`;

const MapOuterWrapper = styled.div`
  width: 100%;
  height: 180px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);

  /* Running Stripe Effect */
  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 300%;
    background: conic-gradient(
      transparent, 
      rgba(255, 255, 255, 0.4), 
      transparent 60%
    );
    animation: rotateMapGlow 4s linear infinite;
    z-index: 0;
  }

  @keyframes rotateMapGlow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const MapContainer = styled.div`
  position: absolute;
  inset: 2px;
  border-radius: 10px;
  overflow: hidden;
  z-index: 1;

  iframe {
    width: 150%; /* Scale up to crop UI labels */
    height: 150%;
    position: absolute;
    top: -25%;
    left: -25%;
    border: 0;
    /* Professional Red-Tinted Dark Mode */
    filter: invert(90%) hue-rotate(180deg) brightness(0.9) contrast(1.2) sepia(0.2) saturate(2);
    transition: filter 0.8s ease, opacity 0.5s ease;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const LogoImage = styled.img`
  width: 210px;
  height: auto;
  margin-bottom: -15px;
  margin-top: -20px;
`;

const Description = styled.p`
  font-family: 'Inter', sans-serif;
  color: #ccc;
  line-height: 1.6;
  font-size: 0.95rem;
`;

const Title = styled.h3`
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0px;
  color: #d94a5e;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const FooterLink = styled(motion.create(RouterLink))`
  color: #ccc;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  transition: color 0.3s ease;
  width: fit-content;

  &:hover {
    color: #fff;
  }
`;

const Socials = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 5px;
`;

const SocialIcon = styled(motion.a)`
  width: 35px;
  height: 35px;
  background-color: rgba(123, 31, 46, 0.1);
  border: 1px solid #7B1F2E;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  text-decoration: none;
  font-size: 1rem;
`;

const ContactInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 15px;
  color: #ccc;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;

  @media (max-width: 600px) {
    text-align: center;
    max-width: 240px;
    margin: 0 auto;
    width: fit-content;
  }

  svg {
    color: #d94a5e;
    font-size: 1.1rem;
    margin-top: 0px;
    flex-shrink: 0;
  }
`;

const InfoLink = styled.a`
  color: inherit;
  text-decoration: none;
  font-family: inherit;
  transition: color 0.3s ease;
  
  &:hover {
    color: #fff;
  }
`;

const Bottom = styled.div`
  max-width: 1400px;
  margin: 20px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  color: #8a8a8a;

  @media (max-width: 768px) {
    text-align: center;
  }
`;

const Footer = () => {
  return (
    <FooterSection>
      <Grid>
        <Column>
          <RouterLink to="/">
            <LogoImage src={footerLogo} alt="Deep Skills Logo" />
          </RouterLink>
          <Description>
            Empowering the next generation of digital professionals with industry-relevant skills and hands-on training. Join our community and build your future today.
          </Description>
          <Socials>
            <SocialIcon aria-label="DeepSkills on Facebook" href="https://www.facebook.com/people/Deep-Skills/61585681437310/" target="_blank" rel="noopener noreferrer" whileHover={{ y: -5, backgroundColor: "#7B1F2E" }}><FaFacebookF aria-hidden="true" /></SocialIcon>
            <SocialIcon aria-label="DeepSkills on Instagram" href="https://www.instagram.com/deepskills.pk" target="_blank" rel="noopener noreferrer" whileHover={{ y: -5, backgroundColor: "#7B1F2E" }}><FaInstagram aria-hidden="true" /></SocialIcon>
            <SocialIcon aria-label="DeepSkills on LinkedIn" href="https://www.linkedin.com/company/deep-skills-pk" target="_blank" rel="noopener noreferrer" whileHover={{ y: -5, backgroundColor: "#7B1F2E" }}><FaLinkedinIn aria-hidden="true" /></SocialIcon>
            <SocialIcon aria-label="DeepSkills on TikTok" href="https://www.tiktok.com/@deep.skills" target="_blank" rel="noopener noreferrer" whileHover={{ y: -5, backgroundColor: "#7B1F2E" }}><FaTiktok aria-hidden="true" /></SocialIcon>
          </Socials>
        </Column>

        <Column>
          <Title>Quick Links</Title>
          <FooterLink to="/" whileHover={{ x: 5 }}>Home</FooterLink>
          <FooterLink to="/about" whileHover={{ x: 5 }}>About Us</FooterLink>
          <FooterLink to="/courses" whileHover={{ x: 5 }}>All Courses</FooterLink>
          <FooterLink to="/blogs" whileHover={{ x: 5 }}>Blogs</FooterLink>
          <FooterLink to="/#testimonials" whileHover={{ x: 5 }}>Testimonials</FooterLink>
          <FooterLink to="/contact" whileHover={{ x: 5 }}>Contact Us</FooterLink>
        </Column>

        <Column>
          <Title>Programs</Title>
          <FooterLink to="/courses/graphic-design" whileHover={{ x: 5 }}>Graphic Design</FooterLink>
          <FooterLink to="/courses/laravel-mastery" whileHover={{ x: 5 }}>Full Stack (Laravel)</FooterLink>
          <FooterLink to="/courses/full-stack-react" whileHover={{ x: 5 }}>Full Stack (MERN)</FooterLink>
          <FooterLink to="/courses/wordpress-mastery" whileHover={{ x: 5 }}>WordPress Mastery</FooterLink>
        </Column>

        <Column>
          <Title>Contact Us</Title>
          <ContactInfo>
            <FaEnvelope /> <InfoLink href="mailto:info@deepskills.pk">info@deepskills.pk</InfoLink>
          </ContactInfo>
          <ContactInfo>
            <FaMapMarkerAlt /> <InfoLink href="https://maps.google.com/?q=58+A2,+Tipu+Road+Gulberg+III,+Lahore+Pakistan" target="_blank" rel="noopener noreferrer">58 A2, Tipu Road Gulberg III, Lahore Pakistan</InfoLink>
          </ContactInfo>
        </Column>

        <Column>
          <Title>Location</Title>
          <MapOuterWrapper>
            <MapContainer>
              <iframe
                title="Deep Skills Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3401.530331002447!2d74.33924377545025!3d31.503144574213032!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3919046033d6232d%3A0x6295535560946761!2s58%20A2%2C%20Tipu%20Road%20Gulberg%20III%2C%20Lahore%2C%20Pakistan!5e0!3m2!1sen!2s!4v1709614400000!5m2!1sen!2s"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </MapContainer>
          </MapOuterWrapper>
        </Column>
      </Grid>

      <Bottom>
        <div>© 2026 DEEPSKILLS. All rights reserved.</div>
      </Bottom>
    </FooterSection>
  );
};

export default Footer;
