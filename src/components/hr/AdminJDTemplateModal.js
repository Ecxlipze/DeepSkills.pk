import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaBriefcase,
  FaCheck,
  FaTimes,
  FaListUl,
  FaGraduationCap,
  FaGift,
  FaClock,
  FaMapMarkerAlt
} from 'react-icons/fa';
import {
  AdminModal,
  AdminModalHeader,
  AdminModalBody,
  AdminModalFooter,
  FormField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminButton,
  FormGrid
} from '../portal/AdminFormComponents';
import { validateRequired } from '../../utils/formValidation';

const HintText = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 4px;
`;

const SectionTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a78bfa;
  margin: 18px 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 6px;

  &:first-of-type {
    margin-top: 0;
  }
`;

const parseLinesToArray = (text) => {
  if (Array.isArray(text)) return text;
  if (!text || typeof text !== 'string') return [];
  return text
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
};

const formatArrayToLines = (arr) => {
  if (!arr) return '';
  if (Array.isArray(arr)) return arr.join('\n');
  return String(arr);
};

const INITIAL_FORM = {
  specialization: '',
  employment_type: 'Full-time',
  title_template: '{{specialization}} Instructor',
  location_mode: 'Onsite',
  working_hours: 'Batch timing(s) shared by administration',
  department: 'Education',
  reporting_to: 'Academic Director',
  responsibilities: '',
  requirements: '',
  what_we_offer: ''
};

const AdminJDTemplateModal = ({
  open,
  template = null,
  onClose,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(template?.id);

  useEffect(() => {
    if (template) {
      setFormData({
        specialization: template.specialization || '',
        employment_type: template.employment_type || 'Full-time',
        title_template: template.title_template || '{{specialization}} Instructor',
        location_mode: template.location_mode || 'Onsite',
        working_hours: template.working_hours || 'Batch timing(s) shared by administration',
        department: template.department || 'Education',
        reporting_to: template.reporting_to || 'Academic Director',
        responsibilities: formatArrayToLines(template.responsibilities),
        requirements: formatArrayToLines(template.requirements),
        what_we_offer: formatArrayToLines(template.what_we_offer)
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setErrors({});
  }, [template, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-update title_template if it's default and specialization changes
      if (field === 'specialization' && (!prev.title_template || prev.title_template === '{{specialization}} Instructor')) {
        next.title_template = '{{specialization}} Instructor';
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleBlur = (field) => {
    if (field === 'specialization') {
      const err = validateRequired(formData.specialization, 'Specialization');
      if (err) setErrors((prev) => ({ ...prev, specialization: err }));
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();

    const specErr = validateRequired(formData.specialization, 'Specialization / Role Track');
    if (specErr) {
      setErrors({ specialization: specErr });
      return;
    }

    const payload = {
      ...formData,
      responsibilities: parseLinesToArray(formData.responsibilities),
      requirements: parseLinesToArray(formData.requirements),
      what_we_offer: parseLinesToArray(formData.what_we_offer)
    };

    onSave?.(payload);
  };

  return (
    <AdminModal open={open} onClose={onClose} maxWidth="720px">
      <AdminModalHeader
        title={isEditing ? 'Edit Standard JD Template' : 'Create Standard JD Template'}
        subtitle={isEditing ? `Modifying template blueprint for ${formData.specialization || 'role'}` : 'Add a reusable role blueprint for generating candidate job descriptions'}
        onClose={onClose}
      />

      <AdminModalBody>
        <form id="jd-template-form" onSubmit={handleSubmit}>
          <SectionTitle>
            <FaBriefcase /> Role Information
          </SectionTitle>

          <FormGrid columns={2}>
            <FormField
              label="Specialization / Role Track"
              required
              error={errors.specialization}
              hint="e.g. Flutter Development, UI/UX Design, Data Science"
            >
              <AdminInput
                placeholder="e.g. Python & AI Engineering"
                value={formData.specialization}
                onChange={(e) => handleChange('specialization', e.target.value)}
                onBlur={() => handleBlur('specialization')}
                hasError={Boolean(errors.specialization)}
              />
            </FormField>

            <FormField
              label="Position Title Template"
              required
              hint="Use {{specialization}} as dynamic role variable"
            >
              <AdminInput
                placeholder="e.g. {{specialization}} Instructor"
                value={formData.title_template}
                onChange={(e) => handleChange('title_template', e.target.value)}
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={3}>
            <FormField label="Employment Type" required>
              <AdminSelect
                value={formData.employment_type}
                onChange={(e) => handleChange('employment_type', e.target.value)}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Visiting">Visiting</option>
                <option value="Hybrid">Hybrid</option>
              </AdminSelect>
            </FormField>

            <FormField label="Location Mode">
              <AdminSelect
                value={formData.location_mode}
                onChange={(e) => handleChange('location_mode', e.target.value)}
              >
                <option value="Onsite">Onsite</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </AdminSelect>
            </FormField>

            <FormField label="Working Hours">
              <AdminInput
                placeholder="e.g. 40 hrs/week or Batch timings"
                value={formData.working_hours}
                onChange={(e) => handleChange('working_hours', e.target.value)}
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={2}>
            <FormField label="Department">
              <AdminInput
                placeholder="Education"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
              />
            </FormField>

            <FormField label="Reporting To">
              <AdminInput
                placeholder="Academic Director"
                value={formData.reporting_to}
                onChange={(e) => handleChange('reporting_to', e.target.value)}
              />
            </FormField>
          </FormGrid>

          <SectionTitle>
            <FaListUl /> Key Responsibilities
          </SectionTitle>
          <FormField
            label="Duties & Responsibilities (1 per line)"
            hint="Each line will appear as an individual bullet point in the generated Job Description"
          >
            <AdminTextarea
              rows={4}
              placeholder="Deliver hands-on instruction and project-based sessions&#10;Review student assignments and capstones&#10;Track class attendance and student progress&#10;Mentor students through technical debugging"
              value={formData.responsibilities}
              onChange={(e) => handleChange('responsibilities', e.target.value)}
            />
          </FormField>

          <SectionTitle>
            <FaGraduationCap /> Requirements & Qualifications
          </SectionTitle>
          <FormField
            label="Candidate Prerequisites (1 per line)"
            hint="Academic degrees, industry experience, and technical proficiencies"
          >
            <AdminTextarea
              rows={4}
              placeholder="Bachelor's degree in CS or equivalent field experience&#10;At least 2+ years of professional industry experience&#10;Strong communication and classroom management skills&#10;Prior teaching or mentoring experience is preferred"
              value={formData.requirements}
              onChange={(e) => handleChange('requirements', e.target.value)}
            />
          </FormField>

          <SectionTitle>
            <FaGift /> What We Offer / Institution Perks
          </SectionTitle>
          <FormField
            label="Benefits & Compensation Terms (1 per line)"
            hint="Compensation package details, learning environment perks, and institutional support"
          >
            <AdminTextarea
              rows={3}
              placeholder="Competitive market salary package&#10;Professional academic mentorship & growth opportunities&#10;Collaborative and tech-driven institute culture&#10;Access to DeepSkills course resources and labs"
              value={formData.what_we_offer}
              onChange={(e) => handleChange('what_we_offer', e.target.value)}
            />
          </FormField>
        </form>
      </AdminModalBody>

      <AdminModalFooter>
        <AdminButton variant="ghost" type="button" onClick={onClose} disabled={loading}>
          Cancel
        </AdminButton>
        <AdminButton
          variant="primary"
          type="submit"
          form="jd-template-form"
          disabled={loading}
          icon={loading ? null : <FaCheck />}
        >
          {loading ? 'Saving Template...' : isEditing ? 'Update Template' : 'Save Template'}
        </AdminButton>
      </AdminModalFooter>
    </AdminModal>
  );
};

export default AdminJDTemplateModal;
