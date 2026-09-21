import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/adminAccessApi';
import { requestJson } from '../utils/requestJson';
import {
  CAREER_DEPARTMENTS,
  JOB_TYPES,
  WORKPLACE_TYPES,
  EXPERIENCE_LEVELS,
  APPLICATION_STATUSES,
  slugify,
  formatJobDate
} from '../../lib/careers';
import {
  FaBriefcase,
  FaUsers,
  FaPlus,
  FaSearch,
  FaFilter,
  FaEdit,
  FaTrash,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaFilePdf,
  FaWhatsapp,
  FaEnvelope,
  FaPhoneAlt,
  FaEye,
  FaChevronDown,
  FaSave,
  FaTimes,
  FaMapMarkerAlt,
  FaBuilding,
  FaUserCheck,
  FaUserTimes
} from 'react-icons/fa';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #fff;
  padding-bottom: 40px;
  width: 100%;
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .title-block {
    h1 {
      font-size: 1.8rem;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;

      svg {
        color: #7B1F2E;
      }
    }

    p {
      color: #9ca3af;
      margin: 0;
      font-size: 0.95rem;
    }
  }

  .actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
`;

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, #7B1F2E 0%, #9B2C3B 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(123, 31, 46, 0.3);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(123, 31, 46, 0.45);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e5e7eb;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
`;

const Tab = styled.button`
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.2)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : '#9ca3af'};
  border: 1px solid ${props => props.$active ? 'rgba(123, 31, 46, 0.4)' : 'transparent'};
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  .badge {
    background: ${props => props.$active ? '#7B1F2E' : 'rgba(255, 255, 255, 0.1)'};
    color: #fff;
    font-size: 0.75rem;
    padding: 2px 7px;
    border-radius: 12px;
  }

  &:hover {
    color: #fff;
    background: ${props => props.$active ? 'rgba(123, 31, 46, 0.25)' : 'rgba(255, 255, 255, 0.04)'};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: rgba(26, 29, 38, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .stat-label {
    font-size: 0.85rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .stat-value {
    font-size: 1.8rem;
    font-weight: 800;
    color: #fff;
  }

  .stat-desc {
    font-size: 0.8rem;
    color: #6b7280;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  background: rgba(26, 29, 38, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;

    svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
    }

    input {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 8px 12px 8px 36px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;

      &:focus {
        border-color: #7B1F2E;
      }
    }
  }

  select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 8px 14px;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #7B1F2E;
    }
  }
`;

const TableWrapper = styled.div`
  background: rgba(26, 29, 38, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;

  th {
    text-align: left;
    padding: 14px 18px;
    background: rgba(0, 0, 0, 0.25);
    color: #9ca3af;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.78rem;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  td {
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #e5e7eb;
    vertical-align: middle;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;

  ${props => {
    switch (props.$status) {
      case 'published':
      case 'hired':
        return 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);';
      case 'draft':
      case 'reviewing':
        return 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);';
      case 'shortlisted':
      case 'interview':
        return 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);';
      case 'offered':
        return 'background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3);';
      case 'closed':
      case 'rejected':
        return 'background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);';
      default:
        return 'background: rgba(156, 163, 175, 0.15); color: #d1d5db; border: 1px solid rgba(156, 163, 175, 0.3);';
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  button, a {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #9ca3af;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;

    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.12);
    }
  }

  .delete-btn:hover {
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.15);
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ModalCard = styled(motion.div)`
  background: #181b22;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: #fff;
  }

  button {
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px;
    &:hover { color: #fff; }
  }
`;

const ModalBody = styled.div`
  padding: 24px;
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

    input, select, textarea {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 10px 14px;
      color: #fff;
      font-size: 0.92rem;
      outline: none;

      &:focus {
        border-color: #7B1F2E;
      }
    }

    textarea {
      min-height: 110px;
      resize: vertical;
      font-family: inherit;
    }
  }

  .list-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .item-row {
      display: flex;
      gap: 8px;

      input {
        flex: 1;
      }

      button {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #f87171;
        border-radius: 6px;
        padding: 0 12px;
        cursor: pointer;
      }
    }

    .add-btn {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #9ca3af;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.82rem;
      cursor: pointer;

      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

export default function CareerManager() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'applications'
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [jobSearch, setJobSearch] = useState('');
  const [jobDeptFilter, setJobDeptFilter] = useState('All');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');

  const [appSearch, setAppSearch] = useState('');
  const [appJobFilter, setAppJobFilter] = useState('all');
  const [appStatusFilter, setAppStatusFilter] = useState('all');

  // Modals
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [savingJob, setSavingJob] = useState(false);

  const [appDetailModalOpen, setAppDetailModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [savingAppNotes, setSavingAppNotes] = useState(false);

  // Load jobs and applications
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [jobsRes, appsRes] = await Promise.all([
        requestJson('/api/admin/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ action: 'list_jobs' })
        }),
        requestJson('/api/admin/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ action: 'list_applications' })
        })
      ]);

      if (jobsRes.status === 'success') setJobs(jobsRes.data || []);
      if (appsRes.status === 'success') setApplications(appsRes.data || []);
    } catch (err) {
      toast.error('Failed to load career data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesSearch = !jobSearch || j.title.toLowerCase().includes(jobSearch.toLowerCase()) || j.department.toLowerCase().includes(jobSearch.toLowerCase());
      const matchesDept = jobDeptFilter === 'All' || j.department === jobDeptFilter;
      const matchesStatus = jobStatusFilter === 'all' || j.status === jobStatusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [jobs, jobSearch, jobDeptFilter, jobStatusFilter]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((a) => {
      const matchesSearch = !appSearch ||
        a.full_name.toLowerCase().includes(appSearch.toLowerCase()) ||
        a.email.toLowerCase().includes(appSearch.toLowerCase()) ||
        (a.phone && a.phone.includes(appSearch)) ||
        (a.cnic && a.cnic.includes(appSearch));
      const matchesJob = appJobFilter === 'all' || a.job_id === appJobFilter;
      const matchesStatus = appStatusFilter === 'all' || a.status === appStatusFilter;
      return matchesSearch && matchesJob && matchesStatus;
    });
  }, [applications, appSearch, appJobFilter, appStatusFilter]);

  // Metrics
  const stats = useMemo(() => {
    const published = jobs.filter((j) => j.status === 'published').length;
    const drafts = jobs.filter((j) => j.status === 'draft').length;
    const closed = jobs.filter((j) => j.status === 'closed').length;
    const newApps = applications.filter((a) => a.status === 'new').length;
    return {
      published,
      drafts,
      closed,
      totalApps: applications.length,
      newApps
    };
  }, [jobs, applications]);

  // Open Create Job
  const handleOpenCreateJob = () => {
    setEditingJob({
      title: '',
      slug: '',
      department: 'Software & IT',
      job_type: 'Full-time',
      workplace_type: 'On-site',
      location: 'Lahore, Pakistan',
      experience_level: 'Mid Level',
      salary_range: '',
      description: '',
      responsibilities: [''],
      requirements: [''],
      benefits: ['Market-competitive salary', 'Annual performance bonus', 'Health insurance support'],
      status: 'draft',
      is_featured: false,
      deadline: ''
    });
    setJobModalOpen(true);
  };

  // Open Edit Job
  const handleOpenEditJob = (job) => {
    setEditingJob({
      ...job,
      responsibilities: Array.isArray(job.responsibilities) && job.responsibilities.length ? job.responsibilities : [''],
      requirements: Array.isArray(job.requirements) && job.requirements.length ? job.requirements : [''],
      benefits: Array.isArray(job.benefits) && job.benefits.length ? job.benefits : [''],
      deadline: job.deadline ? job.deadline.split('T')[0] : ''
    });
    setJobModalOpen(true);
  };

  // Save Job
  const handleSaveJob = async () => {
    if (!editingJob.title?.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    setSavingJob(true);
    try {
      const headers = await getAuthHeaders();
      const res = await requestJson('/api/admin/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          action: 'save_job',
          payload: editingJob
        })
      });

      if (res.status === 'success') {
        toast.success(editingJob.id ? 'Job posting updated' : 'Job posting created');
        setJobModalOpen(false);
        loadData();
      } else {
        toast.error(res.message || 'Failed to save job');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingJob(false);
    }
  };

  // Delete Job
  const handleDeleteJob = async (job) => {
    if (!confirm(`Are you sure you want to delete "${job.title}"? This will also remove all applications for this job.`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await requestJson('/api/admin/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          action: 'delete_job',
          payload: { id: job.id, slug: job.slug }
        })
      });

      if (res.status === 'success') {
        toast.success('Job posting deleted');
        loadData();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Update Application Status
  const handleUpdateAppStatus = async (appId, newStatus) => {
    try {
      const headers = await getAuthHeaders();
      const res = await requestJson('/api/admin/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          action: 'update_application',
          payload: { id: appId, status: newStatus }
        })
      });

      if (res.status === 'success') {
        toast.success(`Status updated to ${newStatus}`);
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp(res.data);
        }
        loadData();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Save Application Notes
  const handleSaveAppNotes = async () => {
    if (!selectedApp) return;
    setSavingAppNotes(true);
    try {
      const headers = await getAuthHeaders();
      const res = await requestJson('/api/admin/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          action: 'update_application',
          payload: { id: selectedApp.id, admin_notes: selectedApp.admin_notes }
        })
      });

      if (res.status === 'success') {
        toast.success('Notes saved');
        loadData();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingAppNotes(false);
    }
  };

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div className="title-block">
            <h1><FaBriefcase /> Careers & Job Board</h1>
            <p>Post open positions, manage job descriptions, and track candidate applications.</p>
          </div>
          <div className="actions">
            <SecondaryButton onClick={() => window.open('/careers', '_blank')}>
              <FaExternalLinkAlt /> View Job Board
            </SecondaryButton>
            <PrimaryButton onClick={handleOpenCreateJob}>
              <FaPlus /> Post New Job
            </PrimaryButton>
          </div>
        </Header>

        {/* Stats */}
        <StatsGrid>
          <StatCard>
            <span className="stat-label">Active Openings</span>
            <span className="stat-value" style={{ color: '#34d399' }}>{stats.published}</span>
            <span className="stat-desc">Live on website</span>
          </StatCard>
          <StatCard>
            <span className="stat-label">Draft / Closed</span>
            <span className="stat-value" style={{ color: '#fbbf24' }}>{stats.drafts + stats.closed}</span>
            <span className="stat-desc">{stats.drafts} drafts, {stats.closed} closed</span>
          </StatCard>
          <StatCard>
            <span className="stat-label">Total Applicants</span>
            <span className="stat-value">{stats.totalApps}</span>
            <span className="stat-desc">All-time submissions</span>
          </StatCard>
          <StatCard>
            <span className="stat-label">New Applications</span>
            <span className="stat-value" style={{ color: '#60a5fa' }}>{stats.newApps}</span>
            <span className="stat-desc">Awaiting initial review</span>
          </StatCard>
        </StatsGrid>

        {/* Tab Navigation */}
        <TabBar>
          <Tab $active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')}>
            <FaBriefcase /> Job Openings <span className="badge">{jobs.length}</span>
          </Tab>
          <Tab $active={activeTab === 'applications'} onClick={() => setActiveTab('applications')}>
            <FaUsers /> Applicants & ATS <span className="badge">{applications.length}</span>
          </Tab>
        </TabBar>

        {/* Tab: Jobs List */}
        {activeTab === 'jobs' && (
          <>
            <FilterBar>
              <div className="search-wrap">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search job titles or departments..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                />
              </div>
              <select value={jobDeptFilter} onChange={(e) => setJobDeptFilter(e.target.value)}>
                {CAREER_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </FilterBar>

            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Department</th>
                    <th>Type & Workplace</th>
                    <th>Applicants</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading job postings...</td></tr>
                  ) : filteredJobs.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>No job postings found. Click &quot;Post New Job&quot; to create one.</td></tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{job.title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>/{job.slug}</div>
                        </td>
                        <td>{job.department}</td>
                        <td>
                          <div>{job.job_type}</div>
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{job.workplace_type} &bull; {job.location}</div>
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setAppJobFilter(job.id);
                              setActiveTab('applications');
                            }}
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.82rem'
                            }}
                          >
                            {job.application_count} Applicants &rarr;
                          </button>
                        </td>
                        <td>
                          <StatusBadge $status={job.status}>{job.status}</StatusBadge>
                        </td>
                        <td>
                          <ActionButtons>
                            {job.status === 'published' && (
                              <a href={`/careers/${job.slug}`} target="_blank" rel="noreferrer" title="View on site">
                                <FaExternalLinkAlt />
                              </a>
                            )}
                            <button onClick={() => handleOpenEditJob(job)} title="Edit">
                              <FaEdit />
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteJob(job)} title="Delete">
                              <FaTrash />
                            </button>
                          </ActionButtons>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrapper>
          </>
        )}

        {/* Tab: Applications / ATS */}
        {activeTab === 'applications' && (
          <>
            <FilterBar>
              <div className="search-wrap">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search candidate name, email, CNIC, phone..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                />
              </div>
              <select value={appJobFilter} onChange={(e) => setAppJobFilter(e.target.value)}>
                <option value="all">All Jobs</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              <select value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                {APPLICATION_STATUSES.map((st) => (
                  <option key={st} value={st}>{st.toUpperCase()}</option>
                ))}
              </select>
            </FilterBar>

            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Job Position</th>
                    <th>Contact</th>
                    <th>Resume</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading candidate applications...</td></tr>
                  ) : filteredApps.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>No applications match the selected criteria.</td></tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{app.full_name}</div>
                          {app.cnic && <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>CNIC: {app.cnic}</div>}
                          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Applied: {formatJobDate(app.created_at)}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{app.job?.title || 'Unknown Position'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{app.job?.department}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{app.email}</div>
                          <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{app.phone}</div>
                        </td>
                        <td>
                          <a
                            href={app.resume_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              textDecoration: 'none'
                            }}
                          >
                            <FaFilePdf /> View CV
                          </a>
                        </td>
                        <td>
                          <select
                            value={app.status}
                            onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                            style={{
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#fff',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            {APPLICATION_STATUSES.map((st) => (
                              <option key={st} value={st}>{st.toUpperCase()}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <ActionButtons>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setAppDetailModalOpen(true);
                              }}
                              title="View Details"
                            >
                              <FaEye /> Review
                            </button>
                            {app.phone && (
                              <a
                                href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat on WhatsApp"
                                style={{ color: '#25D366' }}
                              >
                                <FaWhatsapp />
                              </a>
                            )}
                          </ActionButtons>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrapper>
          </>
        )}

        {/* Modal: Create/Edit Job */}
        <AnimatePresence>
          {jobModalOpen && (
            <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModalCard initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
                <ModalHeader>
                  <h2>{editingJob?.id ? 'Edit Job Posting' : 'Post New Job Opening'}</h2>
                  <button onClick={() => setJobModalOpen(false)}><FaTimes /></button>
                </ModalHeader>
                <ModalBody>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Job Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Full-Stack Instructor"
                        value={editingJob?.title || ''}
                        onChange={(e) => {
                          const title = e.target.value;
                          setEditingJob((prev) => ({
                            ...prev,
                            title,
                            slug: prev.id ? prev.slug : slugify(title)
                          }));
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>URL Slug *</label>
                      <input
                        type="text"
                        placeholder="senior-full-stack-instructor"
                        value={editingJob?.slug || ''}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Department *</label>
                      <select
                        value={editingJob?.department || 'Software & IT'}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, department: e.target.value }))}
                      >
                        {CAREER_DEPARTMENTS.filter((d) => d !== 'All').map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Employment Type</label>
                      <select
                        value={editingJob?.job_type || 'Full-time'}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, job_type: e.target.value }))}
                      >
                        {JOB_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Workplace Policy</label>
                      <select
                        value={editingJob?.workplace_type || 'On-site'}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, workplace_type: e.target.value }))}
                      >
                        {WORKPLACE_TYPES.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Lahore, Pakistan"
                        value={editingJob?.location || ''}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Experience Level</label>
                      <select
                        value={editingJob?.experience_level || 'Mid Level'}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, experience_level: e.target.value }))}
                      >
                        {EXPERIENCE_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Salary Range (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. PKR 100k - 150k or Negotiable"
                        value={editingJob?.salary_range || ''}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, salary_range: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Job Description / Overview</label>
                    <textarea
                      placeholder="Detailed overview of the role, team, and scope of work..."
                      value={editingJob?.description || ''}
                      onChange={(e) => setEditingJob((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* Key Responsibilities */}
                  <div className="form-group">
                    <label>Key Responsibilities</label>
                    <div className="list-editor">
                      {(editingJob?.responsibilities || []).map((resp, idx) => (
                        <div className="item-row" key={idx}>
                          <input
                            type="text"
                            placeholder="Add a responsibility..."
                            value={resp}
                            onChange={(e) => {
                              const updated = [...editingJob.responsibilities];
                              updated[idx] = e.target.value;
                              setEditingJob((prev) => ({ ...prev, responsibilities: updated }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingJob.responsibilities.filter((_, i) => i !== idx);
                              setEditingJob((prev) => ({ ...prev, responsibilities: updated }));
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-btn"
                        onClick={() => {
                          setEditingJob((prev) => ({
                            ...prev,
                            responsibilities: [...(prev.responsibilities || []), '']
                          }));
                        }}
                      >
                        + Add Responsibility
                      </button>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="form-group">
                    <label>Requirements & Qualifications</label>
                    <div className="list-editor">
                      {(editingJob?.requirements || []).map((reqItem, idx) => (
                        <div className="item-row" key={idx}>
                          <input
                            type="text"
                            placeholder="Add a requirement..."
                            value={reqItem}
                            onChange={(e) => {
                              const updated = [...editingJob.requirements];
                              updated[idx] = e.target.value;
                              setEditingJob((prev) => ({ ...prev, requirements: updated }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingJob.requirements.filter((_, i) => i !== idx);
                              setEditingJob((prev) => ({ ...prev, requirements: updated }));
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-btn"
                        onClick={() => {
                          setEditingJob((prev) => ({
                            ...prev,
                            requirements: [...(prev.requirements || []), '']
                          }));
                        }}
                      >
                        + Add Requirement
                      </button>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="form-group">
                    <label>Perks & Benefits</label>
                    <div className="list-editor">
                      {(editingJob?.benefits || []).map((bItem, idx) => (
                        <div className="item-row" key={idx}>
                          <input
                            type="text"
                            placeholder="Add a perk or benefit..."
                            value={bItem}
                            onChange={(e) => {
                              const updated = [...editingJob.benefits];
                              updated[idx] = e.target.value;
                              setEditingJob((prev) => ({ ...prev, benefits: updated }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingJob.benefits.filter((_, i) => i !== idx);
                              setEditingJob((prev) => ({ ...prev, benefits: updated }));
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-btn"
                        onClick={() => {
                          setEditingJob((prev) => ({
                            ...prev,
                            benefits: [...(prev.benefits || []), '']
                          }));
                        }}
                      >
                        + Add Benefit
                      </button>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Posting Status</label>
                      <select
                        value={editingJob?.status || 'draft'}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="draft">Draft (Hidden)</option>
                        <option value="published">Published (Live on Website)</option>
                        <option value="closed">Closed (Applications Ended)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Application Deadline (Optional)</label>
                      <input
                        type="date"
                        value={editingJob?.deadline || ''}
                        onChange={(e) => setEditingJob((prev) => ({ ...prev, deadline: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={Boolean(editingJob?.is_featured)}
                      onChange={(e) => setEditingJob((prev) => ({ ...prev, is_featured: e.target.checked }))}
                    />
                    <label htmlFor="is_featured" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                      Feature this job at the top of the careers page
                    </label>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <SecondaryButton onClick={() => setJobModalOpen(false)}>Cancel</SecondaryButton>
                  <PrimaryButton disabled={savingJob} onClick={handleSaveJob}>
                    <FaSave /> {savingJob ? 'Saving...' : 'Save Job Posting'}
                  </PrimaryButton>
                </ModalFooter>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Modal: Application Review Detail */}
        <AnimatePresence>
          {appDetailModalOpen && selectedApp && (
            <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModalCard initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
                <ModalHeader>
                  <div>
                    <h2>Application: {selectedApp.full_name}</h2>
                    <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                      Position: {selectedApp.job?.title} &bull; Applied on {new Date(selectedApp.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button onClick={() => setAppDetailModalOpen(false)}><FaTimes /></button>
                </ModalHeader>
                <ModalBody>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>Email</div>
                      <div style={{ fontWeight: 600 }}><a href={`mailto:${selectedApp.email}`} style={{ color: '#fff' }}>{selectedApp.email}</a></div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>Phone</div>
                      <div style={{ fontWeight: 600 }}>{selectedApp.phone}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>CNIC</div>
                      <div style={{ fontWeight: 600 }}>{selectedApp.cnic || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>Resume</div>
                      <div>
                        <a
                          href={selectedApp.resume_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <FaFilePdf /> Download Resume
                        </a>
                      </div>
                    </div>
                  </div>

                  {selectedApp.linkedin_url && (
                    <div style={{ fontSize: '0.9rem' }}>
                      <strong>LinkedIn:</strong> <a href={selectedApp.linkedin_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{selectedApp.linkedin_url}</a>
                    </div>
                  )}

                  {selectedApp.portfolio_url && (
                    <div style={{ fontSize: '0.9rem' }}>
                      <strong>Portfolio:</strong> <a href={selectedApp.portfolio_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{selectedApp.portfolio_url}</a>
                    </div>
                  )}

                  {selectedApp.cover_letter && (
                    <div className="form-group">
                      <label>Cover Letter / Candidate Note</label>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', fontSize: '0.92rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#e5e7eb' }}>
                        {selectedApp.cover_letter}
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Candidate Status</label>
                      <select
                        value={selectedApp.status}
                        onChange={(e) => handleUpdateAppStatus(selectedApp.id, e.target.value)}
                      >
                        {APPLICATION_STATUSES.map((st) => (
                          <option key={st} value={st}>{st.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Internal Admin Notes</label>
                    <textarea
                      placeholder="Add interview notes, evaluator feedback, rating..."
                      value={selectedApp.admin_notes || ''}
                      onChange={(e) => setSelectedApp((prev) => ({ ...prev, admin_notes: e.target.value }))}
                    />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <SecondaryButton onClick={() => setAppDetailModalOpen(false)}>Close</SecondaryButton>
                  <PrimaryButton disabled={savingAppNotes} onClick={handleSaveAppNotes}>
                    <FaSave /> {savingAppNotes ? 'Saving...' : 'Save Notes'}
                  </PrimaryButton>
                </ModalFooter>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </AdminLayout>
  );
}
