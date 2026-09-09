import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import HRStepper from '../components/hr/HRStepper';
import HRProfileForm from '../components/hr/HRProfileForm';
import HRDocumentsStep from '../components/hr/HRDocumentsStep';
import HRJDReviewStep from '../components/hr/HRJDReviewStep';
import HRSignatureStep from '../components/hr/HRSignatureStep';
import HRFilesStep from '../components/hr/HRFilesStep';
import { useAuth } from '../context/AuthContext';
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

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
`;

const PageHeader = styled.div`
  display: grid;
  gap: 8px;
  color: #fff;
`;

const StatusCard = styled.div`
  background: #111318;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255,255,255,0.06);
  color: #fff;
`;

const stepComponents = {
  1: 'profile',
  2: 'documents',
  3: 'jd',
  4: 'signature',
  5: 'files'
};

const TeacherHRPage = () => {
  const { user } = useAuth();
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
      toast.error(error.message || 'Failed to load HR profile.');
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
      toast.success('Profile saved successfully.');
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
      await uploadHRDocument({
        ...payload,
        profile: bundle.profile,
        teacherId: bundle.teacher.id,
        docType: config.docType,
        category: config.category,
        isRequired: config.required,
        cnic: user.cnic
      });
      toast.success(`${config.label} uploaded.`);
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
      toast.success('Documents submitted successfully.');
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
      toast.success('Job description approved.');
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
      toast.success('Change request submitted.');
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
      toast.success('Signature saved successfully.');
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
      toast.success('Hiring files emailed successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to share files.');
    } finally {
      setSharing(false);
    }
  };

  const renderContent = () => {
    if (!bundle) {
      return <StatusCard>Loading HR workflow...</StatusCard>;
    }

    if (bundle.profile.hr_status === 'rejected') {
      return (
        <StatusCard>
          <h2>Application Rejected</h2>
          <p>{bundle.profile.rejection_reason || 'Please contact administration for more details.'}</p>
        </StatusCard>
      );
    }

    switch (stepComponents[bundle.profile.current_step] || 'profile') {
      case 'profile':
        return (
          <HRProfileForm
            profile={bundle.profile}
            teacher={bundle.teacher}
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
            teacherName={bundle.profile.full_name || bundle.teacher.name}
            loading={saving}
            onSubmit={handleSubmitSignature}
          />
        );
      case 'files':
        return (
          <HRFilesStep
            files={bundle.files}
            loading={sharing}
            onShare={handleShareFiles}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <Container>
        <PageHeader>
          <h1>My HR Profile</h1>
          <p>Complete your onboarding and hiring workflow in order.</p>
        </PageHeader>
        <HRStepper currentStep={bundle?.profile?.current_step || 1} />
        {loading ? <StatusCard>Loading HR data...</StatusCard> : renderContent()}
      </Container>
    </DashboardLayout>
  );
};

export default TeacherHRPage;
