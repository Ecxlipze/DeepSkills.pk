import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import {
  FaBullhorn,
  FaBriefcase,
  FaSave,
  FaPlus,
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaChevronRight,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { portalTheme } from '../components/portal/PortalTheme';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { getAuthHeaders } from '../utils/adminAccessApi';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 0 40px;
  color: #fff;
  font-family: 'Inter', sans-serif;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;

  .title-group {
    h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 6px 0;
    }
    p {
      color: #888;
      font-size: 0.92rem;
      margin: 0;
    }
  }

  .nav-btn {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.06);
    color: #ccc;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.88rem;
    font-weight: 600;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
  }
`;

const TabNav = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  background: ${(props) => (props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.05)')};
  color: ${(props) => (props.$active ? '#fff' : '#aaa')};
  border: 1px solid ${(props) => (props.$active ? '#9b283b' : 'transparent')};

  &:hover {
    color: #fff;
    background: ${(props) => (props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.1)')};
  }
`;

const Card = styled.div`
  background: #141418;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 28px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const ToggleSwitch = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;

  .switch {
    position: relative;
    width: 48px;
    height: 26px;
    background: ${(props) => (props.$checked ? '#2ed573' : '#444')};
    border-radius: 20px;
    transition: background 0.25s ease;

    .slider {
      position: absolute;
      top: 3px;
      left: ${(props) => (props.$checked ? '25px' : '4px')};
      width: 20px;
      height: 20px;
      background: #fff;
      border-radius: 50%;
      transition: left 0.25s ease;
    }
  }

  .label-text {
    font-weight: 600;
    font-size: 0.9rem;
    color: ${(props) => (props.$checked ? '#2ed573' : '#888')};
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;

  label {
    font-size: 0.88rem;
    font-weight: 600;
    color: #ccc;
  }

  input,
  textarea,
  select {
    background: #1f1f26;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 12px 14px;
    color: #fff;
    font-family: inherit;
    font-size: 0.92rem;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: #7B1F2E;
      background: #25252e;
    }
  }

  textarea {
    resize: vertical;
    min-height: 90px;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
`;

const PreviewBox = styled.div`
  background: #09090b;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 24px;

  .preview-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #ffccd3;
    margin-bottom: 10px;
  }

  .banner-mock {
    background: linear-gradient(90deg, #59141f 0%, #7B1F2E 30%, #992337 70%, #59141f 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 0.85rem;
    color: #fff;
    flex-wrap: wrap;

    .mock-btn {
      background: #fff;
      color: #7B1F2E;
      padding: 3px 12px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 0.78rem;
    }
  }
`;

const SaveButton = styled.button`
  background: linear-gradient(135deg, #7B1F2E 0%, #a8273b 100%);
  color: #fff;
  border: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #962537 0%, #c42d44 100%);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/* Roles Editor Components */
const RolesTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const RoleRow = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;

  .role-info {
    h4 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #fff;
    }
    p {
      font-size: 0.85rem;
      color: #aaa;
      margin: 0 0 8px 0;
      max-width: 650px;
    }
    .skills-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      span {
        background: rgba(255, 255, 255, 0.06);
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        color: #ddd;
      }
    }
  }

  .role-actions {
    display: flex;
    gap: 8px;

    button {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ccc;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.82rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }

      &.delete:hover {
        background: rgba(255, 71, 87, 0.2);
        color: #ff4757;
        border-color: #ff4757;
      }
    }
  }
`;

const AddRoleBox = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 16px 0;
    color: #ffccd3;
  }
`;

const DEFAULT_BANNER_CONFIG = {
  is_active: true,
  message: "We're Hiring Interns! 3-Month Onsite Roles in Gulberg, Lahore (Video Editor, Social Media, Graphic Designer)",
  deadline: "Deadline: 25 Sep",
  button_text: "Apply Now",
  button_link: "/internship",
};

const DEFAULT_PROGRAM_CONFIG = {
  is_active: true,
  title: '3-Month Onsite Creative Internship in Lahore',
  subtitle:
    'Launch your creative career with DeepSkills. Work on live campaigns, learn cutting-edge workflows under senior mentors, and build a portfolio that commands industry respect.',
  duration: '3 Months (Full-Cycle)',
  location: 'Kickstart, Gulberg III, Lahore',
  eligibility: 'Freshers Welcome (We Train You)',
  format: 'Unpaid (Training-Oriented)',
  deadline: '25 September',
  hr_email: 'hr@deepskills.pk',
  flyer_url: '/images/internship-flyer.jpg',
  roles: [
    {
      title: 'Video Editor',
      type: 'Onsite Internship',
      description: 'Transform raw footage into dynamic, high-engagement visual stories for social channels.',
      responsibilities: [
        'Creating Reels, TikToks & YouTube long/short-form content',
        'Adding subtitles, sound design, sound effects & dynamic transitions',
        'Maintaining consistent pacing, brand aesthetic & narrative flow',
        'Optimizing video exports for multi-platform delivery',
      ],
      skills: ['Premiere Pro', 'CapCut', 'After Effects', 'Sound Design', 'Storytelling'],
    },
    {
      title: 'Social Media Handler',
      type: 'Onsite Internship',
      description: 'Execute social publishing, craft compelling copy, and drive active creator engagement.',
      responsibilities: [
        'Scheduling and publishing posts across Instagram, TikTok, LinkedIn & FB',
        'Writing punchy captions, creative hooks & hashtag strategies',
        'Engaging with our community through comments and direct messages',
        'Researching trending sounds, viral formats & audience analytics',
      ],
      skills: ['Content Strategy', 'Copywriting', 'Meta Business Suite', 'Trend Tracking'],
    },
    {
      title: 'Graphic Designer',
      type: 'Onsite Internship',
      description: 'Design scroll-stopping visuals, thumbnails, and branding assets for DeepSkills campaigns.',
      responsibilities: [
        'Designing high-converting social posts, carousels & stories',
        'Creating high-CTR YouTube thumbnails and YouTube channel banners',
        'Designing event posters, promotional flyers & marketing materials',
        'Strictly adhering to DeepSkills typography & visual guidelines',
      ],
      skills: ['Photoshop', 'Illustrator', 'Figma', 'Canva', 'Visual Hierarchy'],
    },
  ],
};

export default function ProgramManager() {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = Boolean(user?.role === 'admin' || canAccess(user?.permissions || {}, 'settings', 'full'));

  const [activeTab, setActiveTab] = useState('banner');
  const [loading, setLoading] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);

  const [bannerConfig, setBannerConfig] = useState(DEFAULT_BANNER_CONFIG);
  const [programConfig, setProgramConfig] = useState(DEFAULT_PROGRAM_CONFIG);

  // New role form state
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({
    title: '',
    type: 'Onsite Internship',
    description: '',
    responsibilitiesText: '',
    skillsText: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/site-settings/');
      const data = await res.json();

      if (res.ok && data?.data) {
        const banner = data.data.find((s) => s.key === 'announcement_bar');
        if (banner?.value) {
          const val = typeof banner.value === 'string' ? JSON.parse(banner.value) : banner.value;
          setBannerConfig((prev) => ({ ...prev, ...val }));
        }

        const program = data.data.find((s) => s.key === 'internship_program');
        if (program?.value) {
          const val = typeof program.value === 'string' ? JSON.parse(program.value) : program.value;
          setProgramConfig((prev) => ({ ...prev, ...val }));
        }
      }
    } catch {
      toast.error('Failed to load current settings.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettingsKey = async (key, value) => {
    if (!canMutate) {
      toast.error('You do not have permission to modify settings.');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/site-settings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ key, value }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toast.success(`${key === 'announcement_bar' ? 'Announcement Bar' : 'Program settings'} saved!`);
      } else {
        toast.error(json.message || 'Failed to save settings.');
      }
    } catch {
      toast.error('Network error saving settings.');
    }
  };

  const handleSaveBanner = async () => {
    setSavingBanner(true);
    await saveSettingsKey('announcement_bar', bannerConfig);
    setSavingBanner(false);
  };

  const handleSaveProgram = async () => {
    setSavingProgram(true);
    await saveSettingsKey('internship_program', programConfig);
    setSavingProgram(false);
  };

  const handleAddRoleSubmit = () => {
    if (!newRole.title.trim()) {
      toast.error('Please enter a role title.');
      return;
    }

    const responsibilities = newRole.responsibilitiesText
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const skills = newRole.skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const createdRole = {
      title: newRole.title.trim(),
      type: newRole.type.trim() || 'Onsite Internship',
      description: newRole.description.trim(),
      responsibilities: responsibilities.length ? responsibilities : ['Collaborate on creative campaigns'],
      skills: skills.length ? skills : ['Creativity'],
    };

    setProgramConfig((prev) => ({
      ...prev,
      roles: [...prev.roles, createdRole],
    }));

    setNewRole({
      title: '',
      type: 'Onsite Internship',
      description: '',
      responsibilitiesText: '',
      skillsText: '',
    });
    setShowAddRole(false);
    toast.success(`Added role "${createdRole.title}". Remember to click Save Program Settings.`);
  };

  const handleDeleteRole = (index) => {
    setProgramConfig((prev) => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index),
    }));
    toast.success('Role removed. Remember to click Save Program Settings.');
  };

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div className="title-group">
            <h1>Programs & Announcement Bar</h1>
            <p>Manage the global top announcement bar and the dedicated program/internship landing page.</p>
          </div>
          <button className="nav-btn" onClick={() => router.push('/admin/dashboard')}>
            Dashboard
          </button>
        </Header>

        <TabNav>
          <TabButton
            $active={activeTab === 'banner'}
            onClick={() => setActiveTab('banner')}
            type="button"
          >
            <FaBullhorn /> Top Announcement Bar
          </TabButton>
          <TabButton
            $active={activeTab === 'program'}
            onClick={() => setActiveTab('program')}
            type="button"
          >
            <FaBriefcase /> Internship & Future Programs
          </TabButton>
        </TabNav>

        {/* TAB 1: Announcement Bar CMS */}
        {activeTab === 'banner' && (
          <Card>
            <CardHeader>
              <h2>
                <FaBullhorn style={{ color: '#ff7589' }} /> Top Announcement Bar Settings
              </h2>
              <ToggleSwitch $checked={bannerConfig.is_active}>
                <input
                  type="checkbox"
                  style={{ display: 'none' }}
                  checked={bannerConfig.is_active}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, is_active: e.target.checked })}
                />
                <div className="switch">
                  <div className="slider" />
                </div>
                <span className="label-text">
                  {bannerConfig.is_active ? 'Banner Active (Visible)' : 'Banner Inactive (Hidden)'}
                </span>
              </ToggleSwitch>
            </CardHeader>

            <PreviewBox>
              <div className="preview-label">Live Preview (Desktop View)</div>
              {bannerConfig.is_active ? (
                <div className="banner-mock">
                  <span>
                    {bannerConfig.message || 'Announcement message goes here'} •{' '}
                    <span style={{ color: '#ffccd3', fontWeight: 600 }}>{bannerConfig.deadline}</span>
                  </span>
                  {bannerConfig.button_text && (
                    <span className="mock-btn">
                      {bannerConfig.button_text} <FaChevronRight style={{ fontSize: '0.65rem' }} />
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ color: '#777', fontStyle: 'italic', fontSize: '0.88rem' }}>
                  Banner is currently turned off and will not render on the public site.
                </div>
              )}
            </PreviewBox>

            <FormGroup>
              <label>Announcement Message</label>
              <textarea
                value={bannerConfig.message}
                onChange={(e) => setBannerConfig({ ...bannerConfig, message: e.target.value })}
                placeholder="We're Hiring Interns! 3-Month Onsite Roles in Gulberg, Lahore..."
              />
            </FormGroup>

            <FormRow>
              <FormGroup>
                <label>Deadline / Date Text</label>
                <input
                  type="text"
                  value={bannerConfig.deadline}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, deadline: e.target.value })}
                  placeholder="Deadline: 25 Sep"
                />
              </FormGroup>

              <FormGroup>
                <label>Button Text</label>
                <input
                  type="text"
                  value={bannerConfig.button_text}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, button_text: e.target.value })}
                  placeholder="Apply Now"
                />
              </FormGroup>

              <FormGroup>
                <label>Button URL / Destination</label>
                <input
                  type="text"
                  value={bannerConfig.button_link}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, button_link: e.target.value })}
                  placeholder="/internship"
                />
              </FormGroup>
            </FormRow>

            <div style={{ marginTop: '20px' }}>
              <SaveButton type="button" onClick={handleSaveBanner} disabled={savingBanner || !canMutate}>
                <FaSave /> {savingBanner ? 'Saving...' : 'Save Announcement Bar'}
              </SaveButton>
            </div>
          </Card>
        )}

        {/* TAB 2: Program & Internship Landing Page CMS */}
        {activeTab === 'program' && (
          <Card>
            <CardHeader>
              <h2>
                <FaBriefcase style={{ color: '#ff7589' }} /> Program & Internship Settings
              </h2>
              <ToggleSwitch $checked={programConfig.is_active}>
                <input
                  type="checkbox"
                  style={{ display: 'none' }}
                  checked={programConfig.is_active}
                  onChange={(e) => setProgramConfig({ ...programConfig, is_active: e.target.checked })}
                />
                <div className="switch">
                  <div className="slider" />
                </div>
                <span className="label-text">
                  {programConfig.is_active ? 'Accepting Applications' : 'Applications Closed'}
                </span>
              </ToggleSwitch>
            </CardHeader>

            <FormRow>
              <FormGroup>
                <label>Program Heading Title</label>
                <input
                  type="text"
                  value={programConfig.title}
                  onChange={(e) => setProgramConfig({ ...programConfig, title: e.target.value })}
                  placeholder="3-Month Onsite Internship in Lahore"
                />
              </FormGroup>

              <FormGroup>
                <label>Application Deadline</label>
                <input
                  type="text"
                  value={programConfig.deadline}
                  onChange={(e) => setProgramConfig({ ...programConfig, deadline: e.target.value })}
                  placeholder="25 September"
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <label>Program Subtitle / Intro</label>
              <textarea
                value={programConfig.subtitle}
                onChange={(e) => setProgramConfig({ ...programConfig, subtitle: e.target.value })}
                placeholder="Launch your creative career with DeepSkills..."
              />
            </FormGroup>

            <FormRow>
              <FormGroup>
                <label>Duration</label>
                <input
                  type="text"
                  value={programConfig.duration}
                  onChange={(e) => setProgramConfig({ ...programConfig, duration: e.target.value })}
                  placeholder="3 Months (Full-Cycle)"
                />
              </FormGroup>

              <FormGroup>
                <label>Location</label>
                <input
                  type="text"
                  value={programConfig.location}
                  onChange={(e) => setProgramConfig({ ...programConfig, location: e.target.value })}
                  placeholder="Kickstart, Gulberg III, Lahore"
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <label>Eligibility</label>
                <input
                  type="text"
                  value={programConfig.eligibility}
                  onChange={(e) => setProgramConfig({ ...programConfig, eligibility: e.target.value })}
                  placeholder="Freshers Welcome (We Train You)"
                />
              </FormGroup>

              <FormGroup>
                <label>Format</label>
                <input
                  type="text"
                  value={programConfig.format}
                  onChange={(e) => setProgramConfig({ ...programConfig, format: e.target.value })}
                  placeholder="Unpaid (Training-Oriented)"
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <label>Direct HR Recruitment Email</label>
                <input
                  type="email"
                  value={programConfig.hr_email}
                  onChange={(e) => setProgramConfig({ ...programConfig, hr_email: e.target.value })}
                  placeholder="hr@deepskills.pk"
                />
              </FormGroup>

              <FormGroup>
                <label>Flyer Poster Path / Image URL</label>
                <input
                  type="text"
                  value={programConfig.flyer_url}
                  onChange={(e) => setProgramConfig({ ...programConfig, flyer_url: e.target.value })}
                  placeholder="/images/internship-flyer.jpg"
                />
              </FormGroup>
            </FormRow>

            {/* Roles Section */}
            <div style={{ marginTop: '30px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Open Positions / Roles ({programConfig.roles.length})
                </h3>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(123, 31, 46, 0.3)',
                    border: '1px solid rgba(217, 74, 94, 0.6)',
                    color: '#ff8597',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setShowAddRole(!showAddRole)}
                >
                  <FaPlus /> {showAddRole ? 'Cancel' : 'Add New Role'}
                </button>
              </div>

              {showAddRole && (
                <AddRoleBox>
                  <h3>Add New Role Position</h3>
                  <FormRow>
                    <FormGroup>
                      <label>Role Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Motion Graphics Artist, UI/UX Designer"
                        value={newRole.title}
                        onChange={(e) => setNewRole({ ...newRole, title: e.target.value })}
                      />
                    </FormGroup>
                    <FormGroup>
                      <label>Role Type</label>
                      <input
                        type="text"
                        placeholder="Onsite Internship"
                        value={newRole.type}
                        onChange={(e) => setNewRole({ ...newRole, type: e.target.value })}
                      />
                    </FormGroup>
                  </FormRow>

                  <FormGroup>
                    <label>Role Description</label>
                    <input
                      type="text"
                      placeholder="Brief 1-line description of what this role does..."
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Responsibilities (1 per line)</label>
                    <textarea
                      placeholder="Editing reels and vertical videos&#10;Adding sound design and transitions&#10;Maintaining brand style"
                      value={newRole.responsibilitiesText}
                      onChange={(e) => setNewRole({ ...newRole, responsibilitiesText: e.target.value })}
                    />
                  </FormGroup>

                  <FormGroup>
                    <label>Required Tools / Skills (comma separated)</label>
                    <input
                      type="text"
                      placeholder="Premiere Pro, After Effects, CapCut"
                      value={newRole.skillsText}
                      onChange={(e) => setNewRole({ ...newRole, skillsText: e.target.value })}
                    />
                  </FormGroup>

                  <button
                    type="button"
                    style={{
                      background: '#2ed573',
                      color: '#000',
                      fontWeight: 700,
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onClick={handleAddRoleSubmit}
                  >
                    Confirm & Add Role
                  </button>
                </AddRoleBox>
              )}

              <RolesTable>
                {programConfig.roles.map((role, idx) => (
                  <RoleRow key={role.title + idx}>
                    <div className="role-info">
                      <h4>{role.title}</h4>
                      <p>{role.description || role.desc}</p>
                      <div className="skills-pills">
                        {(role.skills || []).map((s) => (
                          <span key={s}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="role-actions">
                      <button
                        type="button"
                        className="delete"
                        onClick={() => handleDeleteRole(idx)}
                        title="Delete Role"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </RoleRow>
                ))}
              </RolesTable>
            </div>

            <div style={{ marginTop: '24px' }}>
              <SaveButton type="button" onClick={handleSaveProgram} disabled={savingProgram || !canMutate}>
                <FaSave /> {savingProgram ? 'Saving...' : 'Save Program Settings'}
              </SaveButton>
            </div>
          </Card>
        )}
      </Container>
    </AdminLayout>
  );
}
