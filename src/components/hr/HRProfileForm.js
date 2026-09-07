import React, { useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FaUser,
  FaUserCheck,
  FaLock,
  FaShieldAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaMapMarkedAlt,
  FaBriefcase,
  FaGraduationCap,
  FaBuilding,
  FaLinkedin,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaHeartbeat,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowRight,
  FaSpinner
} from 'react-icons/fa';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const FormWrap = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const OverviewBanner = styled.div`
  background: linear-gradient(135deg, rgba(123, 31, 46, 0.25) 0%, rgba(17, 19, 24, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const BannerContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  .badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .step-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }

  h2 {
    margin: 0;
    font-size: 1.45rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    font-size: 0.88rem;
    color: #94a3b8;
    line-height: 1.5;
    max-width: 600px;
  }
`;

const ProgressCard = styled.div`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px 20px;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: #cbd5e1;
    font-weight: 600;
  }

  .pct {
    color: #10b981;
    font-weight: 700;
  }

  .bar-bg {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #10b981);
    border-radius: 999px;
    transition: width 0.3s ease;
  }
`;

const SectionCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.12);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
    background: ${p => p.$bg || 'rgba(139, 92, 246, 0.15)'};
    color: ${p => p.$color || '#a78bfa'};
    border: 1px solid ${p => p.$border || 'rgba(139, 92, 246, 0.25)'};
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;

    h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
    }

    span {
      font-size: 0.8rem;
      color: #94a3b8;
    }
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  grid-column: ${p => (p.$fullWidth ? '1 / -1' : 'span 1')};
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;

  .req {
    color: #f43f5e;
    font-weight: 700;
  }

  .tag {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 600;
    color: #64748b;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  .field-icon {
    position: absolute;
    left: 14px;
    color: #64748b;
    font-size: 0.95rem;
    pointer-events: none;
    transition: color 0.2s;
  }

  &:focus-within .field-icon {
    color: #8b5cf6;
  }
`;

const Input = styled.input`
  width: 100%;
  background: #090a0d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: ${p => (p.$hasIcon ? '12px 14px 12px 42px' : '12px 14px')};
  color: #ffffff;
  font-size: 0.92rem;
  transition: all 0.2s ease;

  &::placeholder {
    color: #475569;
  }

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    background: #0f1117;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
  }

  &:read-only, &:disabled {
    background: rgba(255, 255, 255, 0.03);
    color: #94a3b8;
    border-color: rgba(255, 255, 255, 0.06);
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  background: #090a0d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: ${p => (p.$hasIcon ? '12px 14px 12px 42px' : '12px 14px')};
  color: #ffffff;
  font-size: 0.92rem;
  transition: all 0.2s ease;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    background: #0f1117;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
  }

  option {
    background: #111318;
    color: #fff;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  background: #090a0d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 14px;
  color: #ffffff;
  font-size: 0.92rem;
  min-height: 88px;
  resize: vertical;
  transition: all 0.2s ease;
  font-family: inherit;

  &::placeholder {
    color: #475569;
  }

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    background: #0f1117;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
  }
`;

const CurrencySuffix = styled.div`
  position: absolute;
  right: 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  pointer-events: none;
`;

const AddressSyncBox = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: -6px;
  color: #cbd5e1;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(139, 92, 246, 0.3);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #8b5cf6;
    cursor: pointer;
  }
`;

const ModeCardsGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ModeCard = styled.div`
  background: ${p => (p.$active ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)')};
  border: 1px solid ${p => (p.$active ? '#8b5cf6' : 'rgba(255, 255, 255, 0.08)')};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${p => (p.$active ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)')};
    background: ${p => (p.$active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)')};
  }

  .mode-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: ${p => (p.$active ? '#c4b5fd' : '#f1f5f9')};
  }

  .mode-desc {
    font-size: 0.74rem;
    color: #94a3b8;
  }
`;

const StickyActionBar = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

  @media (min-width: 640px) {
    flex-direction: row;
  }

  .status-text {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .valid {
    color: #10b981;
  }

  .missing {
    color: #f59e0b;
  }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  background: ${p => (p.disabled ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #7b1f2e 0%, #991b1b 100%)')};
  color: ${p => (p.disabled ? '#64748b' : '#ffffff')};
  font-size: 0.95rem;
  font-weight: 700;
  cursor: ${p => (p.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.25s ease;
  box-shadow: ${p => (p.disabled ? 'none' : '0 4px 20px rgba(123, 31, 46, 0.4)')};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(123, 31, 46, 0.6);
  }

  .spin {
    animation: ${spin} 1s linear infinite;
  }
`;

const initialState = (profile = {}, teacher = {}) => ({
  id: profile.id,
  teacher_id: profile.teacher_id || teacher.id,
  full_name: profile.full_name || teacher.name || '',
  father_name: profile.father_name || '',
  date_of_birth: profile.date_of_birth || '',
  gender: profile.gender || 'Prefer not to say',
  cnic: profile.cnic || teacher.cnic || '',
  personal_phone: profile.personal_phone || teacher.phone || '',
  personal_email: profile.personal_email || teacher.email || '',
  current_address: profile.current_address || '',
  permanent_address: profile.permanent_address || '',
  specialization: profile.specialization || teacher.specialization || '',
  years_experience: profile.years_experience ?? '',
  last_employer: profile.last_employer || '',
  linkedin: profile.linkedin || '',
  expected_salary: profile.expected_salary ?? '',
  available_to_join: profile.available_to_join || '',
  teaching_mode: profile.teaching_mode || 'Onsite',
  emergency_name: profile.emergency_name || '',
  emergency_relationship: profile.emergency_relationship || 'Parent',
  emergency_phone: profile.emergency_phone || '',
  current_step: Math.max(2, profile.current_step || 1),
  hr_status: profile.hr_status || 'pending'
});

const REQUIRED_FIELDS = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'personal_phone', label: 'Personal Phone' },
  { key: 'personal_email', label: 'Personal Email' },
  { key: 'current_address', label: 'Current Address' },
  { key: 'permanent_address', label: 'Permanent Address' },
  { key: 'years_experience', label: 'Years of Experience' },
  { key: 'expected_salary', label: 'Expected Salary' },
  { key: 'available_to_join', label: 'Available to Join' },
  { key: 'emergency_name', label: 'Emergency Contact Name' },
  { key: 'emergency_phone', label: 'Emergency Contact Phone' }
];

const HRProfileForm = ({ profile, teacher, onSubmit, loading }) => {
  const [sameAddress, setSameAddress] = useState(false);
  const [formData, setFormData] = useState(() => initialState(profile, teacher));

  const completedCount = useMemo(() => {
    return REQUIRED_FIELDS.reduce((acc, f) => {
      const val = formData[f.key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [formData]);

  const completionPct = Math.round((completedCount / REQUIRED_FIELDS.length) * 100);
  const requiredValid = completedCount === REQUIRED_FIELDS.length;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => {
      const next = { ...current, [name]: value };
      if (sameAddress && name === 'current_address') {
        next.permanent_address = value;
      }
      return next;
    });
  };

  const handleSameAddress = (event) => {
    const checked = event.target.checked;
    setSameAddress(checked);
    if (checked) {
      setFormData((current) => ({
        ...current,
        permanent_address: current.current_address
      }));
    }
  };

  const handleModeSelect = (mode) => {
    setFormData((current) => ({ ...current, teaching_mode: mode }));
  };

  const submit = async (event) => {
    event.preventDefault();
    await onSubmit(formData);
  };

  return (
    <FormWrap onSubmit={submit}>
      {/* 1. Header Overview & Live Progress */}
      <OverviewBanner>
        <BannerContent>
          <div className="badge-row">
            <span className="step-pill">
              <FaUserCheck /> Step 1 of 5
            </span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>• Faculty Verification Pipeline</span>
          </div>
          <h2>My HR Profile & Credentials</h2>
          <p>
            Please provide your verified personal identity, educational credentials, and emergency records. 
            Ensure information matches your national identity card and university certificates.
          </p>
        </BannerContent>

        <ProgressCard>
          <div className="progress-header">
            <span>Profile Completion</span>
            <span className="pct">{completionPct}%</span>
          </div>
          <div className="bar-bg">
            <div className="bar-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {completedCount} of {REQUIRED_FIELDS.length} required fields completed
          </div>
        </ProgressCard>
      </OverviewBanner>

      {/* 2. Personal & Legal Identity */}
      <SectionCard>
        <SectionHeader $bg="rgba(139, 92, 246, 0.15)" $color="#a78bfa" $border="rgba(139, 92, 246, 0.3)">
          <div className="icon-box">
            <FaUserCheck />
          </div>
          <div className="title-group">
            <h3>Personal & Legal Identity</h3>
            <span>Your official identity as registered in national databases</span>
          </div>
        </SectionHeader>

        <FormGrid>
          <Field>
            <Label>
              Full Name <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaUser className="field-icon" />
              <Input
                $hasIcon
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Muhammad Bilal"
                required
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>
              Father&apos;s / Guardian&apos;s Name <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaUser className="field-icon" />
              <Input
                $hasIcon
                name="father_name"
                value={formData.father_name}
                onChange={handleChange}
                placeholder="e.g. Tariq Mehmood"
                required
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>
              Date of Birth <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaCalendarAlt className="field-icon" />
              <Input
                $hasIcon
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>Gender</Label>
            <Select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </Select>
          </Field>

          <Field $fullWidth>
            <Label>
              Computerized National Identity Card (CNIC)
              <span className="tag" style={{ color: '#10b981' }}>
                <FaShieldAlt style={{ marginRight: '4px' }} /> Verified Whitelist Registry
              </span>
            </Label>
            <InputWrapper>
              <FaLock className="field-icon" style={{ color: '#10b981' }} />
              <Input
                $hasIcon
                name="cnic"
                value={formData.cnic}
                readOnly
                title="CNIC is permanently linked to your faculty authorization record"
              />
            </InputWrapper>
          </Field>
        </FormGrid>
      </SectionCard>

      {/* 3. Contact & Residential Details */}
      <SectionCard>
        <SectionHeader $bg="rgba(59, 130, 246, 0.15)" $color="#60a5fa" $border="rgba(59, 130, 246, 0.3)">
          <div className="icon-box">
            <FaMapMarkedAlt />
          </div>
          <div className="title-group">
            <h3>Contact & Residential Addresses</h3>
            <span>Direct phone lines and physical addresses for official communications</span>
          </div>
        </SectionHeader>

        <FormGrid>
          <Field>
            <Label>
              Personal Phone Number <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaPhoneAlt className="field-icon" />
              <Input
                $hasIcon
                type="tel"
                name="personal_phone"
                value={formData.personal_phone}
                onChange={handleChange}
                placeholder="0300-1234567"
                required
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>
              Personal Email Address <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaEnvelope className="field-icon" />
              <Input
                $hasIcon
                type="email"
                name="personal_email"
                value={formData.personal_email}
                onChange={handleChange}
                placeholder="teacher@example.com"
                required
              />
            </InputWrapper>
          </Field>

          <Field $fullWidth>
            <Label>
              Current Residential Address <span className="req">*</span>
            </Label>
            <Textarea
              name="current_address"
              value={formData.current_address}
              onChange={handleChange}
              placeholder="House #, Street, Sector / Area, City"
              required
            />
          </Field>

          <Field $fullWidth>
            <AddressSyncBox>
              <input
                type="checkbox"
                id="sameAddressCheck"
                checked={sameAddress}
                onChange={handleSameAddress}
              />
              <span>Permanent address is exactly identical to current residential address</span>
            </AddressSyncBox>
          </Field>

          <Field $fullWidth>
            <Label>
              Permanent Home Address <span className="req">*</span>
            </Label>
            <Textarea
              name="permanent_address"
              value={formData.permanent_address}
              onChange={handleChange}
              placeholder="Official domicile / permanent address on CNIC"
              required
              disabled={sameAddress}
            />
          </Field>
        </FormGrid>
      </SectionCard>

      {/* 4. Professional Background & Faculty Terms */}
      <SectionCard>
        <SectionHeader $bg="rgba(16, 185, 129, 0.15)" $color="#34d399" $border="rgba(16, 185, 129, 0.3)">
          <div className="icon-box">
            <FaGraduationCap />
          </div>
          <div className="title-group">
            <h3>Professional Experience & Faculty Terms</h3>
            <span>Academic background, primary domain, and institutional compensation terms</span>
          </div>
        </SectionHeader>

        <FormGrid>
          <Field>
            <Label>Primary Specialization / Teaching Track</Label>
            <InputWrapper>
              <FaBriefcase className="field-icon" />
              <Input
                $hasIcon
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="e.g. Full Stack Web Development, Graphic Design"
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>
              Total Years of Experience <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaBriefcase className="field-icon" />
              <Input
                $hasIcon
                type="number"
                min="0"
                max="50"
                name="years_experience"
                value={formData.years_experience}
                onChange={handleChange}
                placeholder="e.g. 4"
                required
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>Current / Most Recent Employer or Institution</Label>
            <InputWrapper>
              <FaBuilding className="field-icon" />
              <Input
                $hasIcon
                name="last_employer"
                value={formData.last_employer}
                onChange={handleChange}
                placeholder="e.g. FAST University, Tech Stack Ltd."
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>LinkedIn / Online Portfolio</Label>
            <InputWrapper>
              <FaLinkedin className="field-icon" />
              <Input
                $hasIcon
                type="url"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>
              Expected Monthly Compensation <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaMoneyBillWave className="field-icon" />
              <Input
                $hasIcon
                type="number"
                min="0"
                step="1000"
                name="expected_salary"
                value={formData.expected_salary}
                onChange={handleChange}
                placeholder="e.g. 85000"
                required
              />
              <CurrencySuffix>PKR / Month</CurrencySuffix>
            </InputWrapper>
          </Field>

          <Field>
            <Label>
              Available to Join Date <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaCalendarAlt className="field-icon" />
              <Input
                $hasIcon
                type="date"
                name="available_to_join"
                value={formData.available_to_join}
                onChange={handleChange}
                required
              />
            </InputWrapper>
          </Field>

          <Field $fullWidth>
            <Label>Teaching Mode Preference</Label>
            <ModeCardsGroup>
              <ModeCard
                $active={formData.teaching_mode === 'Onsite'}
                onClick={() => handleModeSelect('Onsite')}
              >
                <div className="mode-title">Onsite Classes</div>
                <div className="mode-desc">Physical presence at DeepSkills campus labs</div>
              </ModeCard>

              <ModeCard
                $active={formData.teaching_mode === 'Hybrid'}
                onClick={() => handleModeSelect('Hybrid')}
              >
                <div className="mode-title">Hybrid Format</div>
                <div className="mode-desc">Balanced combination of campus & remote delivery</div>
              </ModeCard>

              <ModeCard
                $active={formData.teaching_mode === 'Online'}
                onClick={() => handleModeSelect('Online')}
              >
                <div className="mode-title">Online Interactive</div>
                <div className="mode-desc">Live interactive virtual classroom streams</div>
              </ModeCard>
            </ModeCardsGroup>
          </Field>
        </FormGrid>
      </SectionCard>

      {/* 5. Emergency & Next-of-Kin Contact */}
      <SectionCard>
        <SectionHeader $bg="rgba(245, 158, 11, 0.15)" $color="#fbbf24" $border="rgba(245, 158, 11, 0.3)">
          <div className="icon-box">
            <FaHeartbeat />
          </div>
          <div className="title-group">
            <h3>Emergency & Next-of-Kin Contact</h3>
            <span>Designated emergency contact for campus health and safety protocols</span>
          </div>
        </SectionHeader>

        <FormGrid>
          <Field>
            <Label>
              Emergency Contact Full Name <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaUser className="field-icon" />
              <Input
                $hasIcon
                name="emergency_name"
                value={formData.emergency_name}
                onChange={handleChange}
                placeholder="e.g. Ayesha Tariq"
                required
              />
            </InputWrapper>
          </Field>

          <Field>
            <Label>Relationship</Label>
            <Select
              name="emergency_relationship"
              value={formData.emergency_relationship}
              onChange={handleChange}
            >
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Child">Child</option>
              <option value="Guardian">Guardian</option>
              <option value="Other">Other</option>
            </Select>
          </Field>

          <Field $fullWidth>
            <Label>
              Emergency Contact Mobile Phone <span className="req">*</span>
            </Label>
            <InputWrapper>
              <FaPhoneAlt className="field-icon" />
              <Input
                $hasIcon
                type="tel"
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleChange}
                placeholder="0300-7654321"
                required
              />
            </InputWrapper>
          </Field>
        </FormGrid>
      </SectionCard>

      {/* 6. Sticky Interactive Submission Bar */}
      <StickyActionBar>
        <div className="status-text">
          {requiredValid ? (
            <span className="valid">
              <FaCheckCircle style={{ marginRight: '6px' }} />
              All 12 required sections complete and verified
            </span>
          ) : (
            <span className="missing">
              <FaExclamationCircle style={{ marginRight: '6px' }} />
              {REQUIRED_FIELDS.length - completedCount} required field(s) remaining before submission
            </span>
          )}
        </div>

        <SubmitButton type="submit" disabled={!requiredValid || loading}>
          {loading ? (
            <>
              <FaSpinner className="spin" />
              Saving Profile...
            </>
          ) : (
            <>
              Save Profile & Proceed to Documents
              <FaArrowRight />
            </>
          )}
        </SubmitButton>
      </StickyActionBar>
    </FormWrap>
  );
};

export default HRProfileForm;
