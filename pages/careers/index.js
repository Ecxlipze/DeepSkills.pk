import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PublicLayout from '../../components/next/PublicLayout';
import Seo from '../../components/next/Seo';
import RegisterButton from '../../src/components/RegisterButton';
import { breadcrumbSchema } from '../../lib/structuredData';
import { maybeRevalidate } from '../../lib/rendering';
import {
  CAREER_DEPARTMENTS,
  JOB_TYPES,
  fetchPublishedJobs
} from '../../lib/careers';
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaBuilding,
  FaClock,
  FaArrowRight,
  FaSearch,
  FaCheckCircle,
  FaTimes,
  FaUpload,
  FaPaperPlane,
  FaRocket,
  FaUsers,
  FaGraduationCap,
  FaHeart
} from 'react-icons/fa';

export default function CareersPage({ jobs = [] }) {
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Apply Modal state
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesDept = selectedDept === 'All' || job.department === selectedDept;
      const matchesType = selectedType === 'All' || job.job_type === selectedType || (selectedType === 'Remote' && job.workplace_type === 'Remote');
      const matchesSearch = !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesDept && matchesType && matchesSearch;
    });
  }, [jobs, selectedDept, selectedType, searchQuery]);

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
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!applyModalJob) return;

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error('Please fill in your name, email, and phone number.');
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
          job_id: applyModalJob.id,
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

  const handleCloseModal = () => {
    setApplyModalJob(null);
    setSubmitted(false);
    setFormData({
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
  };

  return (
    <PublicLayout>
      <Seo
        title="Careers & Opportunities"
        description="Explore open career opportunities at DeepSkills. Join our passionate team of educators, engineers, and creatives shaping the future of tech education."
        path="/careers"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Careers', path: '/careers' }
        ])}
      />

      <PageContainer>
        {/* Hero Section */}
        <Header>
          <TopBadgeRow>
            <HiringBadge>We Are Hiring &bull; Join DeepSkills</HiringBadge>
          </TopBadgeRow>
          <Title>
            Build the Future of <span>Tech Education</span>
          </Title>
          <Subtitle>
            Join a high-impact team of educators, developers, designers, and community builders.
            Together, we are equipping thousands of learners with job-ready skills.
          </Subtitle>
        </Header>

        {/* Culture / Values Pillars */}
        <CultureSection>
          <SectionHeader>
            <h2>Why Work at <span>DeepSkills</span>?</h2>
            <p>We foster a collaborative culture built on ownership, continuous learning, and tangible impact.</p>
          </SectionHeader>
          <CultureGrid>
            <CultureCard
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="icon-wrap"><FaRocket /></div>
              <h3>Impact That Matters</h3>
              <p>Directly empower aspiring tech professionals, career switchers, and students across Pakistan.</p>
            </CultureCard>
            <CultureCard
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="icon-wrap"><FaGraduationCap /></div>
              <h3>Continuous Learning</h3>
              <p>Free access to all DeepSkills courses, internal masterclasses, and tech conferences.</p>
            </CultureCard>
            <CultureCard
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="icon-wrap"><FaUsers /></div>
              <h3>Collaborative Culture</h3>
              <p>Work alongside experienced industry mentors and supportive team members who value your growth.</p>
            </CultureCard>
            <CultureCard
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="icon-wrap"><FaHeart /></div>
              <h3>Competitive Rewards</h3>
              <p>Market-competitive compensation, performance bonuses, health insurance support, and flexibility.</p>
            </CultureCard>
          </CultureGrid>
        </CultureSection>

        {/* Jobs Section */}
        <JobsSection id="open-positions">
          <SectionHeader>
            <h2>Current <span>Open Positions</span></h2>
            <p>Explore openings across our teaching, technical, creative, and operations teams.</p>
          </SectionHeader>

          {/* Search & Filter Bar */}
          <FilterBar>
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by job title, department, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="dept-pills">
              {CAREER_DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  className={selectedDept === dept ? 'active' : ''}
                  onClick={() => setSelectedDept(dept)}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="select-wrap">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="All">All Types</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Remote">Remote Only</option>
              </select>
            </div>
          </FilterBar>

          {/* Jobs Listing */}
          {filteredJobs.length === 0 ? (
            <EmptyState>
              <FaBriefcase />
              <h3>No Openings Matching Your Filter</h3>
              <p>
                We are always looking for exceptional talent. If you don&apos;t see a matching role right now, feel free to send your resume directly to <a href="mailto:hr@deepskills.pk">hr@deepskills.pk</a>.
              </p>
            </EmptyState>
          ) : (
            <JobsGrid>
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  $featured={job.is_featured}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="card-top">
                    <span className="dept-badge">{job.department}</span>
                    {job.is_featured && <span className="featured-badge">Featured</span>}
                  </div>

                  <h3 className="job-title">{job.title}</h3>

                  <div className="meta-row">
                    <span><FaBuilding /> {job.workplace_type}</span>
                    <span><FaMapMarkerAlt /> {job.location}</span>
                    <span><FaClock /> {job.job_type}</span>
                  </div>

                  <p className="job-desc">
                    {job.description.length > 150
                      ? `${job.description.slice(0, 150)}...`
                      : job.description}
                  </p>

                  {job.requirements && job.requirements.length > 0 && (
                    <div className="req-tags">
                      {job.requirements.slice(0, 3).map((req, idx) => (
                        <span key={idx} className="tag">{req}</span>
                      ))}
                      {job.requirements.length > 3 && (
                        <span className="tag-more">+{job.requirements.length - 3} more</span>
                      )}
                    </div>
                  )}

                  <div className="card-footer">
                    {job.salary_range ? (
                      <span className="salary">{job.salary_range}</span>
                    ) : <span />}
                    <div className="actions">
                      <Link href={`/careers/${job.slug}`} className="details-link">
                        View Details
                      </Link>
                      <RegisterButton
                        size="small"
                        onClick={() => setApplyModalJob(job)}
                      >
                        APPLY NOW <FaArrowRight style={{ marginLeft: 4 }} />
                      </RegisterButton>
                    </div>
                  </div>
                </JobCard>
              ))}
            </JobsGrid>
          )}
        </JobsSection>

        {/* Quick Apply Modal */}
        <AnimatePresence>
          {applyModalJob && (
            <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModalCard initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
                <ModalHeader>
                  <div>
                    <h3>Apply for {applyModalJob.title}</h3>
                    <span className="sub">{applyModalJob.department} &bull; {applyModalJob.workplace_type} &bull; {applyModalJob.location}</span>
                  </div>
                  <button type="button" className="close-btn" onClick={handleCloseModal}>
                    <FaTimes />
                  </button>
                </ModalHeader>

                {submitted ? (
                  <SuccessState>
                    <FaCheckCircle />
                    <h3>Application Submitted!</h3>
                    <p>
                      Thank you for applying. We have sent a confirmation email to <strong>{formData.email}</strong>. Our hiring team will review your application and be in touch soon.
                    </p>
                    <RegisterButton size="medium" onClick={handleCloseModal}>
                      DONE
                    </RegisterButton>
                  </SuccessState>
                ) : (
                  <form onSubmit={handleSubmitApplication}>
                    <ModalBody>
                      <div className="form-row">
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
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Phone / WhatsApp Number *</label>
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
                      </div>

                      <div className="form-row">
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
                          <label>Portfolio / GitHub URL (Optional)</label>
                          <input
                            type="url"
                            placeholder="https://github.com/... or portfolio"
                            value={formData.portfolio_url}
                            onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Resume Upload */}
                      <div className="form-group">
                        <label>Resume / CV (PDF or DOCX, max 8MB) *</label>
                        <div className="file-upload-box">
                          <input
                            type="file"
                            id="resume-file"
                            accept=".pdf,.docx,.doc"
                            onChange={handleFileChange}
                          />
                          <label htmlFor="resume-file" className="upload-label">
                            <FaUpload />
                            {formData.resume_filename ? (
                              <span>Attached: <strong>{formData.resume_filename}</strong></span>
                            ) : (
                              <span>Click to upload your CV/Resume (PDF/DOCX)</span>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Cover Letter */}
                      <div className="form-group">
                        <label>Cover Note / Why DeepSkills? (Optional)</label>
                        <textarea
                          placeholder="Tell us about yourself, your relevant experience, and why you would love to join DeepSkills..."
                          value={formData.cover_letter}
                          onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                        />
                      </div>
                    </ModalBody>

                    <ModalFooter>
                      <RegisterButton
                        size="medium"
                        variant="secondary"
                        onClick={handleCloseModal}
                      >
                        CANCEL
                      </RegisterButton>
                      <RegisterButton
                        size="medium"
                        type="submit"
                        disabled={submitting}
                      >
                        {submitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'} <FaPaperPlane style={{ marginLeft: 6 }} />
                      </RegisterButton>
                    </ModalFooter>
                  </form>
                )}
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </PageContainer>
    </PublicLayout>
  );
}

export async function getStaticProps() {
  const jobs = await fetchPublishedJobs();

  return {
    props: {
      jobs
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

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
  position: relative;
  z-index: 2;
  padding: 0 20px;
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
`;

const TopBadgeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
`;

const HiringBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(123, 31, 46, 0.35);
  border: 1px solid rgba(217, 74, 94, 0.5);
  color: #ff8597;
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 5px 14px;
  border-radius: 20px;
`;

const Title = styled.h1`
  font-size: clamp(2.4rem, 4.5vw, 3.6rem);
  font-family: 'Asimovian', sans-serif;
  color: #fff;
  font-weight: normal;
  letter-spacing: 2px;
  margin-bottom: 16px;
  line-height: 1.15;

  span {
    background: linear-gradient(135deg, #ffffff 30%, #ff8597 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Subtitle = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1.05rem;
  color: #ccc;
  line-height: 1.6;
  margin: 0;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;

  h2 {
    font-size: clamp(1.8rem, 3vw, 2.5rem);
    font-family: 'Asimovian', sans-serif;
    color: #fff;
    font-weight: normal;
    letter-spacing: 1.5px;
    margin-bottom: 10px;

    span {
      color: #ff8597;
    }
  }

  p {
    font-family: 'Inter', sans-serif;
    font-size: 0.98rem;
    color: #aaa;
    margin: 0;
  }
`;

const CultureSection = styled.section`
  max-width: 1240px;
  margin: 0 auto 70px;
  padding: 0 20px;
  position: relative;
  z-index: 2;
`;

const CultureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
`;

const CultureCard = styled(motion.div)`
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 30px 24px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(40, 40, 40, 0.9);
    border-color: #CD7C7C;
    box-shadow: 0 15px 30px rgba(122, 30, 45, 0.25);
  }

  .icon-wrap {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #7A1E2D;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    color: #fff;
    margin-bottom: 18px;
    transition: transform 0.4s ease;
  }

  &:hover .icon-wrap {
    transform: scale(1.1);
  }

  h3 {
    font-family: 'Asimovian', sans-serif;
    font-size: 1.3rem;
    font-weight: normal;
    letter-spacing: 1px;
    color: #fff;
    margin: 0 0 10px 0;
  }

  p {
    font-family: 'Inter', sans-serif;
    font-size: 0.92rem;
    color: #aaa;
    line-height: 1.6;
    margin: 0;
  }
`;

const JobsSection = styled.section`
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 2;
`;

const FilterBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 36px;
  background: rgba(25, 25, 25, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 18px 22px;

  .search-box {
    position: relative;
    width: 100%;

    svg {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #888;
    }

    input {
      width: 100%;
      background: rgba(10, 10, 12, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 12px 16px 12px 44px;
      color: #fff;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #CD7C7C;
        box-shadow: 0 0 12px rgba(122, 30, 45, 0.25);
      }
    }
  }

  .dept-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    button {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #bbb;
      padding: 8px 18px;
      border-radius: 24px;
      font-size: 0.88rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      &.active {
        background: linear-gradient(135deg, #7A1E2D 0%, #9B2C3B 100%);
        color: #fff;
        border-color: #7A1E2D;
        box-shadow: 0 4px 14px rgba(122, 30, 45, 0.3);
      }
    }
  }

  .select-wrap {
    select {
      background: rgba(10, 10, 12, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 16px;
      color: #fff;
      font-size: 0.9rem;
      font-family: 'Inter', sans-serif;
      outline: none;
      cursor: pointer;

      &:focus {
        border-color: #CD7C7C;
      }
    }
  }
`;

const JobsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 26px;
`;

const JobCard = styled(motion.div)`
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid ${props => props.$featured ? 'rgba(217, 74, 94, 0.6)' : 'rgba(255, 255, 255, 0.08)'};
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  transition: all 0.3s ease;
  position: relative;

  ${props => props.$featured && `
    box-shadow: 0 4px 20px rgba(122, 30, 45, 0.25);
  `}

  &:hover {
    border-color: #CD7C7C;
    background: rgba(35, 35, 38, 0.9);
    box-shadow: 0 15px 30px rgba(122, 30, 45, 0.25);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .dept-badge {
      font-size: 0.78rem;
      font-weight: 700;
      color: #ff8597;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Inter', sans-serif;
    }

    .featured-badge {
      background: rgba(123, 31, 46, 0.35);
      border: 1px solid rgba(217, 74, 94, 0.5);
      color: #ff8597;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .job-title {
    font-size: 1.45rem;
    font-family: 'Asimovian', sans-serif;
    font-weight: normal;
    letter-spacing: 1px;
    margin: 0;
    color: #fff;
    line-height: 1.25;
  }

  .meta-row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 0.85rem;
    color: #aaa;

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  .job-desc {
    font-family: 'Inter', sans-serif;
    font-size: 0.92rem;
    color: #aaa;
    line-height: 1.6;
    margin: 0;
  }

  .req-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;

    .tag {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #ccc;
      font-size: 0.78rem;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .tag-more {
      font-size: 0.78rem;
      color: #888;
      align-self: center;
    }
  }

  .card-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .salary {
      font-size: 0.88rem;
      font-weight: 700;
      color: #2ed573;
    }

    .actions {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-left: auto;

      .details-link {
        color: #bbb;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 20px;
        transition: all 0.2s;

        &:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
        }
      }

      .apply-btn {
        background: linear-gradient(135deg, #7A1E2D 0%, #9B2C3B 100%);
        color: #fff;
        border: none;
        padding: 9px 20px;
        border-radius: 30px;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(122, 30, 45, 0.3);
        transition: all 0.2s;

        &:hover {
          box-shadow: 0 6px 18px rgba(122, 30, 45, 0.5);
          transform: translateY(-1px);
        }
      }
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 70px 20px;
  background: rgba(25, 25, 25, 0.5);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  max-width: 600px;
  margin: 0 auto;

  svg {
    font-size: 3rem;
    color: #7A1E2D;
    margin-bottom: 16px;
  }

  h3 {
    font-family: 'Asimovian', sans-serif;
    font-size: 1.4rem;
    font-weight: normal;
    letter-spacing: 1px;
    margin: 0 0 10px 0;
  }

  p {
    color: #aaa;
    font-size: 0.95rem;
    line-height: 1.6;

    a {
      color: #ff8597;
      text-decoration: none;
    }
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ModalCard = styled(motion.div)`
  background: #111318;
  border: 1px solid rgba(217, 74, 94, 0.3);
  border-radius: 18px;
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 22px 26px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0 0 4px 0;
    font-family: 'Asimovian', sans-serif;
    font-size: 1.45rem;
    font-weight: normal;
    letter-spacing: 1px;
    color: #fff;
  }

  .sub {
    font-size: 0.85rem;
    color: #aaa;
  }

  .close-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 4px;
    &:hover { color: #fff; }
  }
`;

const ModalBody = styled.div`
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #d1d5db;
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
      min-height: 90px;
      resize: vertical;
      font-family: inherit;
    }
  }

  .file-upload-box {
    input[type="file"] {
      display: none;
    }

    .upload-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(10, 10, 14, 0.6);
      border: 2px dashed rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 20px;
      cursor: pointer;
      color: #aaa;
      font-size: 0.92rem;
      transition: all 0.2s ease;

      &:hover {
        border-color: #CD7C7C;
        color: #fff;
      }

      svg {
        font-size: 1.3rem;
        color: #ff8597;
      }
    }
  }
`;

const ModalFooter = styled.div`
  padding: 18px 26px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  .cancel-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 600;
  }

  .submit-btn {
    background: linear-gradient(135deg, #7A1E2D 0%, #9B2C3B 100%);
    color: #fff;
    border: none;
    padding: 10px 26px;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(122, 30, 45, 0.35);

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(122, 30, 45, 0.5);
    }
  }
`;

const SuccessState = styled.div`
  text-align: center;
  padding: 50px 24px;

  svg {
    font-size: 3.5rem;
    color: #2ed573;
    margin-bottom: 18px;
  }

  h3 {
    font-family: 'Asimovian', sans-serif;
    font-size: 1.6rem;
    font-weight: normal;
    letter-spacing: 1px;
    margin: 0 0 10px 0;
  }

  p {
    color: #aaa;
    max-width: 440px;
    margin: 0 auto 24px;
    line-height: 1.6;
  }

  button {
    background: linear-gradient(135deg, #7A1E2D 0%, #9B2C3B 100%);
    color: #fff;
    border: none;
    padding: 10px 28px;
    border-radius: 25px;
    font-weight: 700;
    cursor: pointer;
  }
`;
