import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaCheckCircle, FaEnvelope, FaGift, FaMapMarkerAlt, FaPhone, FaQuestionCircle, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { supabasePublic } from './supabasePublicClient';
import { EMAIL_EVENTS, sendAdmissionEmail } from './utils/emailNotifications';
import { notifyAdmins } from './utils/notifications';

const SOURCES = ['Social Media', 'Friend', 'Google', 'Referral', 'Other'];

const formatCNIC = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length > 12) return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

const InquiryPage = () => {
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const refCode = useMemo(() => new URLSearchParams(location.search).get('ref') || '', [location.search]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    cnic: '',
    city: '',
    courseInterest: '',
    hearAboutUs: '',
    message: '',
    referralCode: refCode,
    'bot-field': ''
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, referralCode: refCode }));
  }, [refCode]);

  useEffect(() => {
    let mounted = true;
    supabasePublic
      .from('courses')
      .select('title,status')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!mounted) return;
        const activeCourses = (data || []).filter((course) => (course.status || 'active') === 'active');
        setCourses(activeCourses);
      });
    return () => { mounted = false; };
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: key === 'cnic' ? formatCNIC(value) : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        cnic: form.cnic.trim(),
        city: form.city.trim(),
        course_interest: form.courseInterest,
        hear_about_us: form.hearAboutUs,
        message: form.message.trim(),
        referral_code: form.referralCode.trim(),
        'bot-field': form['bot-field']
      };

      const response = await fetch('/api/inquiry.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Inquiry could not be submitted.');
      }

      sendAdmissionEmail(EMAIL_EVENTS.INQUIRY_RECEIVED, {
        inquiry_id: result.data?.id,
        email: payload.email,
        name: payload.name,
        cnic: payload.cnic,
        course: payload.course_interest
      }).catch((error) => console.warn('Inquiry confirmation email failed:', error));

      notifyAdmins({
        type: 'inquiry',
        title: `New inquiry from ${payload.name}`,
        message: `${payload.name} is interested in ${payload.course_interest}.`,
        link: '/admin/counsellor',
        sendEmail: false
      }).catch((error) => console.warn('Inquiry admin notification failed:', error));

      setSubmitted(true);
      toast.success('Inquiry submitted.');
    } catch (error) {
      toast.error(error.message || 'Inquiry could not be submitted.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Page>
        <SuccessCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <FaCheckCircle />
          <h1>Thank you!</h1>
          <p>Our counsellor will contact you within 24 hours.</p>
          <a href="/courses">Explore Courses</a>
        </SuccessCard>
      </Page>
    );
  }

  return (
    <Page>
      <Hero initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span>DeepSkills Inquiry</span>
        <h1>Interested in joining DeepSkill?</h1>
        <p>Fill in your details and our counsellor will get in touch within 24 hours.</p>
      </Hero>

      <FormCard as={motion.form} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}>
        <input type="hidden" name="bot-field" value={form['bot-field']} onChange={(e) => updateField('bot-field', e.target.value)} />
        <Field>
          <label><FaUser /> Full Name</label>
          <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Your full name" />
        </Field>
        <Field>
          <label><FaPhone /> Phone Number</label>
          <input required type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
        </Field>
        <Field>
          <label><FaEnvelope /> Email Address</label>
          <input required type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field>
          <label><FaUser /> CNIC</label>
          <input required value={form.cnic} onChange={(e) => updateField('cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
        </Field>
        <Field>
          <label><FaMapMarkerAlt /> City</label>
          <input required value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Lahore" />
        </Field>
        <Field>
          <label><FaQuestionCircle /> Course Interest</label>
          <select required value={form.courseInterest} onChange={(e) => updateField('courseInterest', e.target.value)}>
            <option value="">Select course</option>
            {courses.map((course) => <option key={course.title} value={course.title}>{course.title}</option>)}
          </select>
        </Field>
        <Field>
          <label>How did you hear about us?</label>
          <select required value={form.hearAboutUs} onChange={(e) => updateField('hearAboutUs', e.target.value)}>
            <option value="">Select source</option>
            {SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
          </select>
        </Field>
        <Field>
          <label><FaGift /> Referral Code</label>
          <input value={form.referralCode} onChange={(e) => updateField('referralCode', e.target.value)} placeholder="Optional" />
        </Field>
        <Field className="full">
          <label>Message / Question</label>
          <textarea value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder="Ask anything about timings, fees, or course content." />
        </Field>
        <Submit type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Inquiry'} <FaArrowRight />
        </Submit>
      </FormCard>
    </Page>
  );
};

const Page = styled.div`
  background-color: #000;
  min-height: 100vh;
  padding: 100px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow-x: hidden;
  color: #fff;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 10% 20%, rgba(123, 31, 46, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(123, 31, 46, 0.1) 0%, transparent 40%);
    pointer-events: none;
  }
`;

const Hero = styled(motion.div)`
  max-width: 900px;
  margin: 0 auto 55px;
  position: relative;
  z-index: 2;
  text-align: center;

  span {
    color: rgba(255, 255, 255, 0.58);
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  h1 {
    font-family: 'Inter', sans-serif;
    font-size: 3.5rem;
    font-weight: 800;
    color: #fff;
    margin: 14px 0 18px;
    text-align: center;
    letter-spacing: -1px;
  }

  p {
    color: rgba(255, 255, 255, 0.68);
    font-size: 1.08rem;
    margin: 0 auto;
    max-width: 660px;
    line-height: 1.7;
  }

  @media (max-width: 768px) {
    margin-bottom: 40px;

    h1 {
      font-size: 2.5rem;
    }
  }
`;

const FormCard = styled.form`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 25px;
  width: 100%;
  max-width: 1000px;
  position: relative;
  z-index: 2;

  > input[type="hidden"] {
    display: none;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled(motion.div).attrs({
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration: 0.5 },
  whileHover: { y: -8, boxShadow: '0 20px 40px rgba(123, 31, 46, 0.4)' }
})`
  background: #7B1F2E;
  border-radius: 20px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: relative;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }

  &.full {
    grid-column: span 2;
    @media (max-width: 768px) {
      grid-column: span 1;
    }
  }

  label {
    font-family: 'Inter', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  input, select, textarea {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 12px 0;
    font-family: 'Inter', sans-serif;
    font-size: 1.1rem;
    outline: none;
    transition: border-color 0.3s ease, padding 0.3s ease;
  }

  input::placeholder,
  textarea::placeholder {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
    font-size: 0.95rem;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-bottom-color: rgba(255, 255, 255, 0.8);
    padding-bottom: 15px;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-text-fill-color: #fff;
    -webkit-box-shadow: 0 0 0px 1000px #7B1F2E inset;
    transition: background-color 5000s ease-in-out 0s;
  }

  textarea { min-height: 120px; resize: vertical; }
  option { color: #111; background: #fff; }
`;

const Submit = styled.button`
  grid-column: 1 / -1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px auto 0;
  min-width: 240px;
  min-height: 58px;
  padding: 18px 38px;
  background: #7B1F2E;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(123, 31, 46, 0.35);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: #8B2635;
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(123, 31, 46, 0.5);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const SuccessCard = styled(motion.div)`
  max-width: 620px;
  margin: 100px auto 0;
  position: relative;
  z-index: 2;
  text-align: center;
  background: #7B1F2E;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 44px 28px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  svg { font-size: 3.4rem; color: #2ecc71; margin-bottom: 16px; }
  h1 { margin: 0 0 10px; font-size: 2.4rem; }
  p { color: rgba(255,255,255,0.78); margin-bottom: 24px; }
  a {
    color: #fff;
    text-decoration: none;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.22);
    padding: 12px 18px;
    border-radius: 999px;
    display: inline-block;
  }
`;

export default InquiryPage;
