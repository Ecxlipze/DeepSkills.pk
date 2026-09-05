import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminHRTable from '../components/hr/AdminHRTable';
import AdminHRDrawer from '../components/hr/AdminHRDrawer';
import AdminJDComposer from '../components/hr/AdminJDComposer';
import AdminFinalizeHiringModal from '../components/hr/AdminFinalizeHiringModal';
import {
  createJDDraft,
  fetchAdminHRApplications,
  fetchJDTemplates,
  finalizeHiring,
  rejectApplication
} from '../utils/hrApi';
import { createAcceptanceLetterPdf, createHiringFilePdf } from '../utils/hrPdf';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

const Container = styled.div`
  display: grid;
  gap: 22px;
  color: #fff;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 18px;
`;

const Filters = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Input = styled.input`
  background: #111318;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
  min-width: 240px;
`;

const Select = styled.select`
  background: #111318;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
`;

const findTemplateForApplication = (templates, application, employmentType) => {
  const specialization = application.profile.specialization || application.teacher?.specialization || 'Generic';
  return (
    templates.find((template) => template.specialization === specialization && template.employment_type === employmentType) ||
    templates.find((template) => template.specialization === specialization) ||
    templates.find((template) => /generic/i.test(template.specialization)) ||
    templates[0] ||
    null
  );
};

const AdminHRManagement = () => {
  const { user } = useAuth();
  const canMutate = Boolean(user?.role === 'admin' || canAccess(user?.permissions || {}, 'hr', 'full'));
  const [applications, setApplications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [composerApplication, setComposerApplication] = useState(null);
  const [composerTemplateId, setComposerTemplateId] = useState('');
  const [composerDraft, setComposerDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [apps, jdTemplates] = await Promise.all([
        fetchAdminHRApplications(),
        fetchJDTemplates()
      ]);
      setApplications(apps);
      setTemplates(jdTemplates);
    } catch (error) {
      toast.error(error.message || 'Failed to load HR applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredApplications = useMemo(() => applications.filter((application) => {
    const haystack = `${application.teacher?.name || ''} ${application.profile.full_name || ''} ${application.profile.cnic || ''} ${application.profile.specialization || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || application.profile.hr_status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [applications, search, statusFilter]);

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter((application) => application.profile.hr_status === 'pending').length,
    jdSent: applications.filter((application) => application.profile.hr_status === 'jd_sent').length,
    hired: applications.filter((application) => application.profile.hr_status === 'hired').length,
    rejected: applications.filter((application) => application.profile.hr_status === 'rejected').length
  }), [applications]);

  const openComposer = (application) => {
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    const employmentType = application.jd?.employment_type || 'Full-time';
    const template = findTemplateForApplication(templates, application, employmentType);
    const draft = template
      ? createJDDraft(application.profile, template, { employmentType, workingHours: template.working_hours })
      : null;

    setComposerApplication(application);
    setComposerTemplateId(template?.id || '');
    setComposerDraft(draft);
    setComposerOpen(true);
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template || !composerApplication) return;
    const draft = createJDDraft(composerApplication.profile, template, {
      employmentType: template.employment_type,
      workingHours: template.working_hours
    });
    setComposerTemplateId(templateId);
    setComposerDraft(draft);
  };

  const handleSendJd = async (draft) => {
    if (!composerApplication) return;
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    setSubmitting(true);
    try {
      await sendJD(composerApplication.profile.id, {
        ...draft,
        templateId: composerTemplateId
      });
      toast.success('JD sent to teacher.');
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to send JD.');
    } finally {
      setSubmitting(false);
    }
  };

  const openFinalize = (application) => {
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    setSelectedApplication(application);
    setFinalizeOpen(true);
  };

  const handleFinalize = async (adminNote) => {
    if (!selectedApplication) return;
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    setSubmitting(true);
    try {
      const date = new Date().toLocaleDateString();
      const acceptanceBlob = await createAcceptanceLetterPdf({
        teacher: selectedApplication.profile,
        jd: selectedApplication.jd,
        signature: selectedApplication.signature,
        adminNote,
        date
      });
      const hiringBlob = await createHiringFilePdf({
        teacher: selectedApplication.profile,
        documents: selectedApplication.documents,
        jd: selectedApplication.jd,
        signature: selectedApplication.signature,
        adminNote,
        date
      });

      await finalizeHiring({
        application: selectedApplication,
        adminNote,
        acceptanceBlob,
        hiringBlob
      });

      toast.success(`${selectedApplication.teacher?.name || selectedApplication.profile.full_name} has been officially hired.`);
      setFinalizeOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to finalize hiring.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (application) => {
    if (!canMutate) {
      toast.error('You have view-only access to HR management.');
      return;
    }
    const reason = window.prompt('Enter rejection reason');
    if (!reason?.trim()) return;
    setSubmitting(true);
    try {
      await rejectApplication(application.profile.id, reason.trim());
      toast.success('Application rejected.');
      await load();
    } catch (error) {
      toast.error(error.message || 'Failed to reject application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div>
            <h1>HR Management</h1>
            <p>Manage teacher hiring process and onboarding.</p>
          </div>
          <Filters>
            <Input placeholder="Search teacher, CNIC, specialization..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="jd_sent">JD Sent</option>
              <option value="jd_approved">JD Approved</option>
              <option value="signed">Signed</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </Select>
          </Filters>
        </Header>

        <StatsGrid>
          <StatCard><strong>Total Applications</strong><p>{stats.total}</p></StatCard>
          <StatCard><strong>Pending Review</strong><p>{stats.pending}</p></StatCard>
          <StatCard><strong>JD Sent</strong><p>{stats.jdSent}</p></StatCard>
          <StatCard><strong>Hired</strong><p>{stats.hired}</p></StatCard>
          <StatCard><strong>Rejected</strong><p>{stats.rejected}</p></StatCard>
        </StatsGrid>

        {loading ? (
          <div>Loading HR applications...</div>
        ) : (
          <AdminHRTable
            applications={filteredApplications}
            canMutate={canMutate}
            onView={(application) => {
              setSelectedApplication(application);
              setDrawerOpen(true);
            }}
            onCreateJd={openComposer}
            onFinalize={openFinalize}
            onReject={handleReject}
          />
        )}
      </Container>

      <AdminHRDrawer
        open={drawerOpen}
        application={selectedApplication}
        onClose={() => setDrawerOpen(false)}
      />

      <AdminJDComposer
        open={composerOpen}
        templates={templates}
        initialDraft={composerDraft}
        initialTemplateId={composerTemplateId}
        onClose={() => setComposerOpen(false)}
        onTemplateChange={handleTemplateChange}
        onSend={handleSendJd}
        loading={submitting}
      />

      <AdminFinalizeHiringModal
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        onSubmit={handleFinalize}
        loading={submitting}
      />
    </AdminLayout>
  );
};

export default AdminHRManagement;
