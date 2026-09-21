import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PublicLayout from '../../components/next/PublicLayout';
import Seo from '../../components/next/Seo';
import RegisterButton from '../../src/components/RegisterButton';
import { breadcrumbSchema } from '../../lib/structuredData';
import { maybeRevalidate } from '../../lib/rendering';
import {
  fetchPublishedJobs,
  fetchJobBySlug,
  generateJobPostingJsonLd,
  formatJobDate
} from '../../lib/careers';
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaBuilding,
  FaClock,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaCheckCircle,
  FaUpload,
  FaPaperPlane,
  FaWhatsapp,
  FaLinkedin,
  FaCopy,
  FaArrowLeft
} from 'react-icons/fa';

export default function JobDetailPage({ job }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cnic: '',
    cover_letter: '',
    portfolio_url: '',
    linkedin_url: '',
    resume_filename: '',
    resume_base64: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!job) {
    return (
      <PublicLayout>
        <PageContainer>
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <h2 style={{ fontFamily: 'Asimovian, sans-serif', letterSpacing: '1px' }}>Job Opening Not Found</h2>
            <p style={{ color: '#aaa', marginBottom: '24px' }}>This position may have been filled or closed.</p>
            <Link href="/careers" style={{ color: '#ff8597', textDecoration: 'none', fontWeight: 600 }}>
              &larr; Back to all open careers
            </Link>
          </div>
        </PageContainer>
      </PublicLayout>
    );
  }

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('File size must be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        resume_filename: file.name,
        resume_base64: reader.result
      }));
      toast.success(`Attached: ${file.name}`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  // Submit Application
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error('Please provide your name, email, and phone number.');
      return;
    }

    if (!formData.resume_base64) {
      toast.error('Please attach your CV/Resume (PDF or DOCX).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          ...formData
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSubmitted(true);
        toast.success('Application submitted successfully!');
      } else {
        toast.error(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Job link copied to clipboard!');
    }
  };

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Careers', path: '/careers' },
    { name: job.title, path: `/careers/${job.slug}` }
  ]);

  const jobPostingSchema = generateJobPostingJsonLd(job);
  const combinedJsonLd = jobPostingSchema ? [breadcrumb, jobPostingSchema] : breadcrumb;

  return (
    <PublicLayout>
      <Seo
        title={`${job.title} | DeepSkills Careers`}
        description={job.description ? `${job.description.slice(0, 155)}...` : `Join DeepSkills as ${job.title}.`}
        path={`/careers/${job.slug}`}
        jsonLd={combinedJsonLd}
      />

      <PageContainer>
        <Container>
          {/* Back link */}
          <BackLink href="/careers">
            <FaArrowLeft /> Back to all jobs
          </BackLink>

          {/* Job Header */}
          <JobHeader>
            <div className="dept-pill">{job.department}</div>
            <h1>{job.title}</h1>
            <div className="meta-tags">
              <span><FaBuilding /> {job.workplace_type}</span>
              <span><FaMapMarkerAlt /> {job.location}</span>
              <span><FaClock /> {job.job_type}</span>
              {job.experience_level && <span><FaBriefcase /> {job.experience_level}</span>}
              {job.salary_range && <span><FaMoneyBillWave /> {job.salary_range}</span>}
              {job.deadline && <span><FaCalendarAlt /> Apply by: {formatJobDate(job.deadline)}</span>}
            </div>
          </JobHeader>

          {/* Main Layout: 2 Columns */}
          <ContentGrid>
            {/* Left Column: Job Details */}
            <DetailsColumn>
              {/* Overview */}
              <SectionBlock>
                <h2>About the Role</h2>
                <div className="text-content">
                  {job.description}
                </div>
              </SectionBlock>

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <SectionBlock>
                  <h2>Key Responsibilities</h2>
                  <BulletList>
                    {job.responsibilities.map((item, idx) => (
                      <li key={idx}>
                        <FaCheckCircle className="check-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </BulletList>
                </SectionBlock>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <SectionBlock>
                  <h2>Requirements & Qualifications</h2>
                  <BulletList>
                    {job.requirements.map((item, idx) => (
                      <li key={idx}>
                        <FaCheckCircle className="check-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </BulletList>
                </SectionBlock>
              )}

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <SectionBlock>
                  <h2>Perks & Benefits</h2>
                  <BulletList>
                    {job.benefits.map((item, idx) => (
                      <li key={idx}>
                        <FaCheckCircle className="check-icon" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </BulletList>
                </SectionBlock>
              )}

              {/* About DeepSkills */}
              <SectionBlock>
                <h2>About DeepSkills</h2>
                <div className="text-content">
                  DeepSkills is Pakistan’s premier tech education and career acceleration platform.
                  We equip learners with practical, industry-standard skills in software development, AI, design, and digital careers.
                  We believe in nurturing exceptional instructors and professionals who are passionate about empowering the next generation.
                </div>
              </SectionBlock>
            </DetailsColumn>

            {/* Right Column: Application Form & Overview */}
            <SidebarColumn>
              {/* Application Card */}
              <ApplicationCard id="apply-now">
                <h3>Apply for this Position</h3>
                <p className="sub">Complete the form below and attach your CV/Resume.</p>

                {submitted ? (
                  <SuccessBox>
                    <FaCheckCircle />
                    <h4>Application Received!</h4>
                    <p>
                      Thank you for your interest! A confirmation email has been dispatched to <strong>{formData.email}</strong>. Our hiring team will review your qualifications and reach out soon.
                    </p>
                  </SuccessBox>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Muhammad Ali"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. ali@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 03001234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>CNIC (Optional)</label>
                      <input
                        type="text"
                        placeholder="35201-XXXXXXX-X"
                        value={formData.cnic}
                        onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>LinkedIn Profile (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Portfolio / GitHub (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://github.com/..."
                        value={formData.portfolio_url}
                        onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Resume / CV (PDF or DOCX, max 8MB) *</label>
                      <div className="upload-wrapper">
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.docx,.doc"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload" className="upload-box">
                          <FaUpload />
                          {formData.resume_filename ? (
                            <span>Attached: <strong>{formData.resume_filename}</strong></span>
                          ) : (
                            <span>Upload Resume (PDF/DOCX)</span>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Cover Note / Why DeepSkills? (Optional)</label>
                      <textarea
                        placeholder="Share a short note on your motivation or relevant achievements..."
                        value={formData.cover_letter}
                        onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                      />
                    </div>

                    <RegisterButton
                      size="medium"
                      type="submit"
                      fullWidth
                      disabled={submitting}
                      style={{ marginTop: 14 }}
                    >
                      {submitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'} <FaPaperPlane style={{ marginLeft: 6 }} />
                    </RegisterButton>
                  </form>
                )}
              </ApplicationCard>

              {/* Share Card */}
              <ShareCard>
                <h4>Share this Opportunity</h4>
                <div className="share-buttons">
                  <button type="button" onClick={handleCopyLink}>
                    <FaCopy /> Copy Link
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Check out this job opening at DeepSkills: ${job.title} - https://deepskills.pk/careers/${job.slug}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaWhatsapp /> WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://deepskills.pk/careers/${job.slug}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaLinkedin /> LinkedIn
                  </a>
                </div>
              </ShareCard>
            </SidebarColumn>
          </ContentGrid>
        </Container>
      </PageContainer>
    </PublicLayout>
  );
}

export async function getStaticPaths() {
  const jobs = await fetchPublishedJobs();
  const paths = (jobs || []).map((j) => ({
    params: { slug: j.slug }
  }));

  return {
    paths,
    fallback: 'blocking'
  };
}

export async function getStaticProps({ params }) {
  const { slug } = params || {};
  const job = await fetchJobBySlug(slug);

  if (!job || job.status !== 'published') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      job
    },
    ...maybeRevalidate(60)
  };
}

// Styled Components
const PageContainer = styled.div`
  background-color: #000;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding-top: 130px;
  padding-bottom: 80px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 25%, rgba(123, 31, 46, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 65%, rgba(123, 31, 46, 0.08) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 2;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #aaa;
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  margin-bottom: 24px;
  transition: color 0.2s;

  &:hover {
    color: #fff;
  }
`;

const JobHeader = styled.div`
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 36px 30px;
  margin-bottom: 36px;

  .dept-pill {
    display: inline-block;
    background: rgba(123, 31, 46, 0.35);
    border: 1px solid rgba(217, 74, 94, 0.5);
    color: #ff8597;
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 14px;
    border-radius: 20px;
    margin-bottom: 14px;
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    font-family: 'Asimovian', sans-serif;
    font-weight: normal;
    letter-spacing: 1.5px;
    margin: 0 0 18px 0;
    line-height: 1.2;
    color: #fff;
  }

  .meta-tags {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    color: #aaa;
    font-size: 0.92rem;
    font-family: 'Inter', sans-serif;

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 20px;
    }
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 36px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const DetailsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const SectionBlock = styled.div`
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 30px;

  h2 {
    font-size: 1.45rem;
    font-family: 'Asimovian', sans-serif;
    font-weight: normal;
    letter-spacing: 1px;
    margin: 0 0 16px 0;
    color: #fff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
  }

  .text-content {
    color: #ccc;
    font-family: 'Inter', sans-serif;
    font-size: 0.98rem;
    line-height: 1.7;
    white-space: pre-wrap;
  }
`;

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: #ccc;
    line-height: 1.55;

    .check-icon {
      color: #2ed573;
      font-size: 1rem;
      margin-top: 4px;
      flex-shrink: 0;
    }
  }
`;

const SidebarColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ApplicationCard = styled.div`
  background: rgba(25, 25, 25, 0.85);
  border: 1px solid rgba(217, 74, 94, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  padding: 30px 26px;
  box-shadow: 0 15px 35px rgba(122, 30, 45, 0.2);

  h3 {
    font-size: 1.5rem;
    font-family: 'Asimovian', sans-serif;
    font-weight: normal;
    letter-spacing: 1px;
    margin: 0 0 6px 0;
    color: #fff;
  }

  .sub {
    font-family: 'Inter', sans-serif;
    font-size: 0.88rem;
    color: #aaa;
    margin-bottom: 22px;
    display: block;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;

    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #d1d5db;
      font-family: 'Inter', sans-serif;
    }

    input, textarea {
      background: rgba(10, 10, 14, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 12px 16px;
      color: #fff;
      font-size: 0.92rem;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #CD7C7C;
        box-shadow: 0 0 10px rgba(122, 30, 45, 0.25);
      }
    }

    textarea {
      min-height: 80px;
      resize: vertical;
      font-family: inherit;
    }
  }

  .upload-wrapper {
    input[type="file"] {
      display: none;
    }

    .upload-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(10, 10, 14, 0.6);
      border: 2px dashed rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 18px;
      cursor: pointer;
      color: #aaa;
      font-size: 0.88rem;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s ease;

      &:hover {
        border-color: #CD7C7C;
        color: #fff;
      }

      svg {
        font-size: 1.2rem;
        color: #ff8597;
      }
    }
  }
`;



const SuccessBox = styled.div`
  text-align: center;
  padding: 30px 10px;

  svg {
    font-size: 3rem;
    color: #2ed573;
    margin-bottom: 12px;
  }

  h4 {
    font-size: 1.35rem;
    font-family: 'Asimovian', sans-serif;
    font-weight: normal;
    letter-spacing: 1px;
    margin: 0 0 10px 0;
  }

  p {
    color: #aaa;
    font-family: 'Inter', sans-serif;
    font-size: 0.92rem;
    line-height: 1.6;
    margin: 0;
  }
`;

const ShareCard = styled.div`
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 22px 26px;

  h4 {
    margin: 0 0 14px 0;
    font-size: 0.92rem;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'Inter', sans-serif;
  }

  .share-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;

    button, a {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
    }
  }
`;
