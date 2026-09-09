import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { FaEnvelope, FaMapMarkerAlt, FaBullseye, FaLightbulb, FaBars, FaUsers } from "react-icons/fa";
import RegisterButton from "./components/RegisterButton";
import GlowCard from "./components/GlowCard";
import { trackEvent } from "../lib/analytics";

// Import assets
import contactBg from "./assets/contact-bg.png";
import journeyBg from "./assets/journey.png";
import formBg from "./assets/form-bg.png";
import formRight from "./assets/form-right.svg";

const PageContainer = styled(motion.div)`
  min-height: 100vh;
  padding-top: 80px;
  background-color: #000;
  overflow-x: hidden;
  background-image: url(${contactBg});
  background-size: cover;
  background-position: center;
  background-attachment: fixed; // This will make the background "single" across scroll
`;

const HeroSection = styled.section`
  padding: 40px 20px;
  position: relative;
  display: flex;
  justify-content: center;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 40px;
  position: relative;
  z-index: 2;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const LeftSection = styled(motion.div)`
  background: rgba(123, 31, 46, 0.65); // Restoring user preferred opacity
  padding: 60px;
  border-radius: 20px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.4);

  @media (max-width: 768px) {
    padding: 30px;
  }

  h1 {
    font-family: 'Inter', sans-serif;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    margin-bottom: clamp(15px, 3vw, 35px);
    line-height: 1.1;
  }

  .subheading-row {
    .label {
      font-size: clamp(1.4rem, 4vw, 2.2rem);
      letter-spacing: 2px;
      display: inline-flex;
      font-weight: 600;
      align-items: center;
      gap: 15px;

      @media (max-width: 768px) {
        margin-bottom: 0;
      }
    }

    .icon-q {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      color: rgba(233, 34, 34, 0.3);
      font-weight: 400;
      transition: all 0.3s ease;
    }

    &:hover .icon-q {
      color: rgba(233, 34, 34, 0.6);
      transform: scale(1.1) rotate(10deg);
    }

    .icon-pin {
      color: #97142aff;
      filter: drop-shadow(0 0 10px rgba(123, 31, 46, 0.6));
      transition: all 0.3s ease;
    }

    &:hover .icon-pin {
      transform: translateY(-5px);
      filter: drop-shadow(0 0 15px rgba(123, 31, 46, 0.9));
    }
  }

  .para {
    font-family: 'Inter', sans-serif;
    font-size: clamp(1rem, 2vw, 1.3rem);
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: clamp(20px, 3vw, 35px);
    font-weight: 400;
  }

  .desc {
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.9rem, 1.8vw, 1.2rem);
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 10px;
    
    strong {
      color: #fff;
      font-weight: 800;
    }
  }
`;

const RightSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const ContactBox = styled(motion.div)`
  background: transparent;
  padding: clamp(15px, 2vw, 20px) 40px;
  position: relative;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .icon {
    font-size: clamp(2.5rem, 4vw, 3.5rem);
    margin-bottom: 10px;
    color: #fff;
  }

  p {
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.85rem, 1.5vw, 1rem);
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 8px;
    font-weight: 400;
  }

  .email {
    font-family: 'Inter', sans-serif;
    font-size: clamp(1.2rem, 2.5vw, 1.8rem);
    font-weight: 700;
    margin-bottom: 25px;
    color: #fff;
  }

  h3 {
    // font-family: 'Asimovian', sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    letter-spacing: 2px;
    margin-bottom: 5px;
    line-height: 1;
  }

  h4 {
    // font-family: 'Asimovian', sans-serif;
    font-size: clamp(1.5rem, 3.5vw, 2.2rem);
    letter-spacing: 1px;
    margin-bottom: 5px;
    line-height: 1;
  }

  .working {
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: lowercase;
  }
`;

const AddressBox = styled(motion.div)`
  background: transparent;
  padding: clamp(15px, 2vw, 20px) 40px;
  color: #fff;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .icon {
    font-size: clamp(2.5rem, 4vw, 3.5rem);
    margin-bottom: 10px;
    color: #fff;
  }

  h3 {
    font-family: 'Inter', sans-serif;
    font-size: clamp(1.1rem, 2vw, 1.3rem);
    font-weight: 700;
    margin-bottom: 15px;
  }

  .address {
    font-family: 'Inter', sans-serif;
    font-size: clamp(1.2rem, 3vw, 1.6rem);
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 25px;
    max-width: 300px;
  }

  .footer-text {
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.85rem, 1.5vw, 1rem);
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.7;
    font-weight: 300;
  }
`;

const WhySection = styled.section`
  padding: 40px 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
`;

const WhyHeader = styled(motion.div)`
  margin-bottom: 30px;
  position: relative;
  z-index: 2;

  h2 {
    font-family: 'Inter', sans-serif;
    font-size: 2.5rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 5px;

    @media (max-width: 768px) {
      font-size: 1.7rem;
    }
  }

  h2.brand {
    color: #d94a5e;
    position: relative;
    display: inline-block;
    transition: all 0.4s ease;

    &:hover {
      transform: scale(1.05);
      text-shadow: 0 0 20px rgba(123, 31, 46, 0.4);
    }

    &::after {
      content: '?';
      position: absolute;
      right: -40px;
      top: -15px;
      font-size: clamp(3rem, 6vw, 4rem);
      opacity: 0.6;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    &:hover::after {
      transform: translate(10px, -5px) rotate(15deg) scale(1.2);
      opacity: 1;
      color: #df2222ff;
    }
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  max-width: 1200px;
  width: 100%;
  position: relative;
  z-index: 2;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled(motion.div)`
  background: rgba(20, 20, 20, 0.7);
  border: 1px solid rgba(245, 238, 238, 0.1);
  padding: 50px 20px;
  padding-top: 20px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start; // Align to left as per mockup
  text-align: left;
  transition: all 0.4s ease;
  height: 100%;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 70px;
    height: 70px;
    background: radial-gradient(circle at bottom right, rgba(123, 31, 46, 0.3), transparent);
    pointer-events: none;
  }

  &:hover {
    border-color: rgba(123, 31, 46, 0.8);
    transform: translateY(-8px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(123, 31, 46, 0.15);
    background: rgba(30, 30, 30, 0.9);
  }

  .card-icon {
    font-size: 2.2rem;
    color: #fff;
    margin-bottom: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.9;
  }

  p {
    font-family: 'Inter', sans-serif;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
    font-size: clamp(0.95rem, 1.8vw, 1.1rem);
    font-weight: 600;
  }
`;

const JourneySection = styled.section`
  background-image: url(${journeyBg});
  background-size: 100% 100%;
  background-position: center;
  padding: 40px 20px;
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 40px 20px;
    justify-content: center;
  }
`;

const JourneyContent = styled(motion.div)`
  max-width: 600px;
  text-align: left;
  position: relative;
  z-index: 2;
  color: #fff;
  padding-left: 100px;

  @media (max-width: 1024px) {
    padding-left: 50px;
  }

  @media (max-width: 768px) {
    padding-left: 0;
    text-align: center;
  }

  h2 {
    font-family: 'Inter', sans-serif;
    font-size: clamp(2rem, 4vw, 2.8rem);
    font-weight: 800;
    margin-bottom: 15px;
    line-height: 1.2;
  }

  .tagline {
    font-family: 'Inter', sans-serif;
    font-size: clamp(1rem, 1.8vw, 1.2rem);
    font-weight: 400;
    margin-bottom: 10px;
    color: rgba(255, 255, 255, 0.85);
  }

  .description {
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.95rem, 1.6vw, 1.1rem);
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.75);
    margin-bottom: 35px;
  }
`;



const FormSection = styled.section`
  background-image: url(${formBg});
  background-size: cover;
  background-position: center;
  padding: 40px 20px;
  position: relative;
  display: flex;
  justify-content: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`;

const FormWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 60px;
  position: relative;
  z-index: 2;
  align-items: center;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const FormContainer = styled(motion.div)`
  background: transparent;
  padding: 0;
  border-radius: 0;
  border: none;

  h3 {
    font-family: 'Inter', sans-serif;
    font-size: clamp(1.8rem, 3vw, 2.2rem);
    font-weight: 700;
    color: #fff;
    margin-bottom: 5px;
  }

  .subtitle {
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.9rem, 1.4vw, 1.1rem);
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 30px;
  }
`;

const FormGroup = styled(motion.div)`
  margin-bottom: 25px;

  label {
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.95rem, 1.4vw, 1.1rem);
    font-weight: 400;
    color: #fff;
    display: block;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
  }

  input, textarea {
    width: 100%;
    padding: 14px 18px;
    background: #7a2136;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.95rem, 1.4vw, 1rem);
    transition: all 0.3s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
    }

    &.error {
      border: 1px solid #ff4444;
    }
  }

  textarea {
    resize: none;
    min-height: 140px;
  }

  .error-message {
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    color: #ff4444;
    margin-top: 6px;
  }
`;

const SubmitBtn = styled.button`
  background: ${props => props.$success ? '#22c55e' : '#7a2136'};
  color: #fff;
  border: none;
  padding: 12px 35px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Inter', sans-serif;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover {
    background: ${props => props.$success ? '#16a34a' : '#9a2842'};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: ${props => props.$success ? 1 : 0.7};
    cursor: ${props => props.$success ? 'default' : 'not-allowed'};
    transform: none;
  }
`;

const StatusMessage = styled(motion.div)`
  margin-top: 15px;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${props => props.$type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.$type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.$type === 'success' ? '#4ade80' : '#f87171'};
`;

// SubmitButton removed


const FormImageContainer = styled(motion.div)`
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    order: -1;
    max-width: 100%;
  }

  img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 20px;
  }
`;

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    'bot-field': '' // Honeypot field
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 3) {
          error = 'Name must be at least 3 characters';
        } else if (!/^[a-zA-Z\s.-]+$/.test(value)) {
          error = 'Please enter a valid name';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)+$/.test(value)) {
          error = 'Please enter valid email';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else if (!/^\+?\d+$/.test(value)) {
          error = 'Please enter a valid phone number';
        } else if (value.trim().length < 10) {
          error = 'Phone number must be at least 10 characters';
        }
        break;
      case 'message':
        if (!value.trim()) {
          error = 'Message is required';
        } else if (value.trim().length < 10) {
          error = 'Message must be at least 10 characters';
        }
        break;
      default:
        break;
    }

    return error;
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'bot-field') {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Live validation
    const error = validateField(name, value);

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        setSubmitSuccess(true);
        setSubmitError(null);
        trackEvent('generate_lead', {
          form_name: 'contact'
        });
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: '',
          'bot-field': ''
        });

        // Hide success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        throw new Error(result.message || 'Form submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(error.message || 'There was an error sending your message. Please try again.');
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <FaBullseye />,
      text: "Get clear guidance on career-oriented courses"
    },
    {
      icon: <FaLightbulb />,
      text: "Learn which skills match your goals and interests"
    },
    {
      icon: <FaBars />,
      text: "Understand course structure, duration, and outcomes"
    },
    {
      icon: <FaUsers />,
      text: "Get support from a student-focused learning team"
    }
  ];

  return (
    <PageContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <HeroSection>
        <ContentWrapper>
          <LeftSection
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h1>Let’s Build Your Future Together</h1>

            <div className="subheading-row">
              <div className="label">
                HAVE <span className="icon-q">?</span>
              </div>
            </div>

            <p className="para">
              about our courses,admissions,<br />
              or learning paths
            </p>

            <div className="subheading-row">
              <div className="label">
                WE’RE HERE <FaMapMarkerAlt className="icon-pin" />
              </div>
            </div>

            <p className="para">
              to help you take the next step<br />
              with confidence.
            </p>

            <p className="desc">
              Whether you’re exploring your first tech skill or planning to specialize in areas
              like <strong>Data Science, Generative AI</strong>, or <strong>Web Development</strong>,
              the Deepskills team is just a message away.
            </p>
          </LeftSection>

          <RightSection
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlowCard borderRadius="0" bg="transparent" hoverBg="rgba(255, 255, 255, 0.03)" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <ContactBox>
                <div className="icon"><FaEnvelope /></div>
                <p>For general inquiries, course details, or admissions support</p>
                <div className="email">info@deepskills.pk</div>
                <h3>WE AIM</h3>
                <p>to respond to all queries</p>
                <h4>AS QUICKLY AS</h4>
                <p className="working">during working hours.</p>
              </ContactBox>
            </GlowCard>

            <GlowCard borderRadius="0" bg="transparent" hoverBg="rgba(255, 255, 255, 0.03)">
              <AddressBox>
                <div className="icon"><FaMapMarkerAlt /></div>
                <h3>Deepskills Institute</h3>
                <div className="address">
                  58 A2, Tipu Road Gulberg III, Lahore Pakistan
                </div>
                <p className="footer-text">
                  Feel free to visit us for guidance, counseling, or to learn more about our
                  programs in person.
                </p>
              </AddressBox>
            </GlowCard>
          </RightSection>
        </ContentWrapper>
      </HeroSection>

      <WhySection>
        <WhyHeader
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2>Why Reach Out to</h2>
          <h2 className="brand">Deepskills</h2>
        </WhyHeader>

        <FeatureGrid>
          {features.map((feature, idx) => (
            <GlowCard
              key={idx}
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, type: "spring", stiffness: 100 }}
              borderRadius="20px"
              bg="rgba(20, 20, 20, 0.7)"
              hoverBg="rgba(123, 31, 46, 0.15)"
              style={{ border: '1px solid rgba(245, 238, 238, 0.1)', height: '100%' }}
            >
              <FeatureCard style={{ background: 'transparent', border: 'none', transform: 'none', boxShadow: 'none' }}>
                <motion.div
                  className="card-icon"
                  whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                >
                  {feature.icon}
                </motion.div>
                <p>{feature.text}</p>
              </FeatureCard>
            </GlowCard>
          ))}
        </FeatureGrid>
      </WhySection>

      <JourneySection>
        <JourneyContent
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2>Start Your Journey</h2>
          <p className="tagline">Your future skills start with a simple conversation.</p>
          <p className="description">
            Reach out today and take the first step toward a smarter, skill-driven career.
          </p>
          <RegisterButton to="/inquiry">
            Inquire Now
          </RegisterButton>
        </JourneyContent>
      </JourneySection>

      <FormSection>
        <FormWrapper>
          <FormContainer
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3>Send a Message:</h3>
            <p className="subtitle">We're here to help you</p>

            <form onSubmit={handleSubmit}>
              {/* Honeypot field - hidden from users */}
              <input
                type="text"
                name="bot-field"
                value={formData['bot-field']}
                onChange={handleChange}
                style={{ display: 'none' }}
                tabIndex="-1"
                autocomplete="off"
              />

              <FormGroup
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <label htmlFor="name">Name:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Name"
                  minLength={3}
                  maxLength={50}
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </FormGroup>

              <FormGroup
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </FormGroup>

              <FormGroup
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  minLength={10}
                  maxLength={15}
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <div className="error-message">{errors.phone}</div>}
              </FormGroup>

              <FormGroup
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Message"
                  minLength={10}
                  maxLength={500}
                  className={errors.message ? 'error' : ''}
                />
                {errors.message && <div className="error-message">{errors.message}</div>}
              </FormGroup>

              <SubmitBtn
                type="submit"
                disabled={isSubmitting}
                $success={submitSuccess}
              >
                {isSubmitting ? 'Sending...' : (submitSuccess ? 'Success!' : 'Submit')}
              </SubmitBtn>

              {submitSuccess && (
                <StatusMessage
                  $type="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FaBullseye /> Message sent successfully! We'll get back to you soon.
                </StatusMessage>
              )}

              {submitError && (
                <StatusMessage
                  $type="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {submitError}
                </StatusMessage>
              )}
            </form>
          </FormContainer>

          <FormImageContainer
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <img src={formRight} alt="Contact us" />
          </FormImageContainer>
        </FormWrapper>
      </FormSection>
    </PageContainer>
  );
};

export default ContactPage;
