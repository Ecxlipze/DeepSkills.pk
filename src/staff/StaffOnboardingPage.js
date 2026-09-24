import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { FaSignOutAlt, FaShieldAlt, FaIdBadge, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import HRStepper from '../components/hr/HRStepper';
import HRProfileForm from '../components/hr/HRProfileForm';
import HRDocumentsStep from '../components/hr/HRDocumentsStep';
import HRJDReviewStep from '../components/hr/HRJDReviewStep';
import HRSignatureStep from '../components/hr/HRSignatureStep';
import HRFilesStep from '../components/hr/HRFilesStep';
import { useAuth } from '../context/AuthContext';
import { portalTheme } from '../components/portal/PortalTheme';
import logoImg from '../logo.svg';
import {
  approveJD,
  fetchTeacherHRApplication,
  removeHRDocument,
  requestJDChanges,
  saveHRProfile,
  saveSignature,
  shareHiringFiles,
  submitHRDocuments,
  uploadHRDocument
} from '../utils/hrApi';

const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: ${portalTheme.colors.bgBase};
  background-image: 
    radial-gradient(circle at 15% 15%, rgba(123, 31, 46, 0.08) 0%, transparent 35%),
    radial-gradient(circle at 85% 85%, rgba(123, 31, 46, 0.05) 0%, transparent 40%);
  color: ${portalTheme.colors.textPrimary};
  display: flex;
  flex-direction: column;
  font-family: ${portalTheme.fonts.body};
`;

const TopNav = styled.header`
  height: 70px;
  background: ${portalTheme.colors.bgTopbar};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 50;

  @media (max-width: 640px) {
    padding: 0 16px;
  }
`;

const BrandBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  img {
    height: 34px;
    width: auto;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.12);
  }

  .tag {
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const UserBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .meta {
    text-align: right;
    display: flex;
    flex-direction: column;

    .name {
      font-size: 0.88rem;
      font-weight: 600;
      color: #fff;
    }

    .role {
      font-size: 0.72rem;
      color: #94a3b8;
      text-transform: uppercase;
    }
  }

  .logout-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
  }
`;

const ContentContainer = styled.main`
  flex: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  h1 {
    margin: 0;
    font-size: 1.85rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: #94a3b8;
    font-size: 0.95rem;
  }
`;

const StatusCard = styled.div`
  background: #111318;
  border-radius: 16px;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1.3rem;
  }

  p {
    margin: 0;
    color: #94a3b8;
    line-height: 1.5;
  }
`;

const stepComponents = {
  1: 'profile',
  2: 'documents',
  3: 'jd',
  4: 'signature',
  5: 'files'
};

const StaffOnboardingPage = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.cnic) return;
    setLoading(true);
    try {
      const nextBundle = await fetchTeacherHRApplication(user.cnic);
      setBundle(nextBundle);
    } catch (error) {
      toast.error(error.message || 'Failed to load staff onboarding profile.');
    } finally {
      setLoading(false);
    }
  }, [user?.cnic]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveProfile = async (formData) => {
    setSaving(true);
    try {
      await saveHRProfile(formData, user.cnic);
      toast.success('Staff profile saved successfully.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (config, payload) => {
    setSaving(true);
    try {
      const res = await uploadHRDocument({
        ...payload,
        profile: bundle.profile,
        candidateId: user.id,
        isStaff: true,
        docType: config.docType,
        category: config.category,
        isRequired: config.required,
        cnic: user.cnic
      });
      const count = Array.isArray(res) ? res.length : 1;
      const countLabel = count > 1 ? `${count} items` : (payload.linkUrl || payload.linkUrls ? 'link' : 'file');
      toast.success(`${config.label}: ${countLabel} uploaded successfully.`);
      await load();
    } catch (error) {
      toast.error(error.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDocument = async (id) => {
    setSaving(true);
    try {
      await removeHRDocument(id, user.cnic);
      toast.success('Document removed.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to remove document.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitDocuments = async () => {
    setSaving(true);
    try {
      const delivery = await submitHRDocuments(bundle.profile.id, user.cnic);
      if (delivery?.warning) toast.error(delivery.warning);
      toast.success('Documents submitted to HR for review.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to submit documents.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveJd = async () => {
    setSaving(true);
    try {
      await approveJD(bundle.jd.id, bundle.profile.id, user.cnic);
      toast.success('Job description & employment terms accepted.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to approve JD.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async (message) => {
    setSaving(true);
    try {
      await requestJDChanges(bundle.jd.id, message, user.cnic);
      toast.success('Change request sent to HR.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to submit change request.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSignature = async (signaturePayload) => {
    setSaving(true);
    try {
      await saveSignature(bundle.profile.id, signaturePayload, user.cnic);
      toast.success('Digital signature recorded successfully.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to save signature.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareFiles = async () => {
    setSharing(true);
    try {
      await shareHiringFiles(bundle.profile.id);
      toast.success('Hiring files emailed to your registered address.');
    } catch (error) {
      toast.error(error.message || 'Failed to share files.');
    } finally {
      setSharing(false);
    }
  };

  const renderContent = () => {
    if (!bundle) {
      return <StatusCard>Loading onboarding records...</StatusCard>;
    }

    if (bundle.profile.hr_status === 'rejected') {
      return (
        <StatusCard>
          <h2>Application Under Review</h2>
          <p>{bundle.profile.rejection_reason || 'Please contact DeepSkills HR department for further instructions.'}</p>
        </StatusCard>
      );
    }

    switch (stepComponents[bundle.profile.current_step] || 'profile') {
      case 'profile':
        return (
          <HRProfileForm
            profile={bundle.profile}
            teacher={bundle.teacher || bundle.candidate}
            candidate={bundle.candidate}
            employeeType="staff"
            onSubmit={handleSaveProfile}
            loading={saving}
          />
        );
      case 'documents':
        return (
          <HRDocumentsStep
            documents={bundle.documents}
            loading={saving}
            onUpload={handleUploadDocument}
            onRemove={handleRemoveDocument}
            onSubmit={handleSubmitDocuments}
          />
        );
      case 'jd':
        return (
          <HRJDReviewStep
            jd={bundle.jd}
            loading={saving}
            onApprove={handleApproveJd}
            onRequestChanges={handleRequestChanges}
          />
        );
      case 'signature':
        return (
          <HRSignatureStep
            teacherName={bundle.profile.full_name || user?.name || user?.full_name}
            loading={saving}
            onSubmit={handleSubmitSignature}
          />
        );
      case 'files':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <HRFilesStep
              files={bundle.files}
              loading={sharing}
              onShare={handleShareFiles}
            />
            {user?.status === 'active' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => router.push('/admin/dashboard')}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <FaCheckCircle /> Access Admin Dashboard <FaArrowRight />
                </button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <PageWrapper>
      <TopNav>
        <BrandBlock>
          <img src={logoImg.src || logoImg} alt="DeepSkills" />
          <div className="divider" />
          <span className="tag">
            <FaIdBadge /> Staff Onboarding
          </span>
        </BrandBlock>

        <UserBlock>
          <div className="meta">
            <span className="name">{user?.name || user?.full_name || 'Staff Member'}</span>
            <span className="role">{user?.role === 'admin' ? 'Administrator' : 'Staff Candidate'}</span>
          </div>
          <button type="button" className="logout-btn" onClick={logout}>
            <FaSignOutAlt /> Sign Out
          </button>
        </UserBlock>
      </TopNav>

      <ContentContainer>
        <PageHeader>
          <h1>Staff Digital Onboarding</h1>
          <p>Complete your personal dossier, upload credentials, review your Job Description, and sign your employment contract.</p>
        </PageHeader>

        <HRStepper currentStep={bundle?.profile?.current_step || 1} />
        {loading ? <StatusCard>Loading onboarding steps...</StatusCard> : renderContent()}
      </ContentContainer>
    </PageWrapper>
  );
};

export default StaffOnboardingPage;
