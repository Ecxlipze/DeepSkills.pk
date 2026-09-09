const toBulletArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((item) => item.replace(/^[-\u2022]\s*/, '').trim())
    .filter(Boolean);
};

export const normalizeBulletText = (value) => toBulletArray(value).join('\n');

export const mergeTemplateWithProfile = (profile, template, options = {}) => {
  const specialization = profile.specialization || template.specialization || 'Instructor';
  const yearsExperience = profile.years_experience || 0;
  const expectedSalary = profile.expected_salary || 0;
  const employmentType = options.employmentType || template.employment_type || 'Full-time';
  const workingHours = options.workingHours || template.working_hours || 'To be shared by administration';
  const positionTitle = (template.title_template || '{{specialization}} Instructor')
    .replace(/\{\{\s*specialization\s*\}\}/gi, specialization)
    .trim();

  const requirements = toBulletArray(template.requirements);
  if (yearsExperience) {
    requirements.push(`Minimum ${yearsExperience} year${yearsExperience > 1 ? 's' : ''} of relevant experience in ${specialization}.`);
  }
  if (specialization) {
    requirements.push(`Demonstrated subject expertise in ${specialization}.`);
  }

  return {
    templateId: template.id || null,
    positionTitle,
    department: template.department || 'Education',
    reportingTo: template.reporting_to || 'Academic Director',
    employmentType,
    location: profile.teaching_mode || template.location_mode || 'Onsite',
    responsibilities: toBulletArray(template.responsibilities),
    requirements,
    whatWeOffer: toBulletArray(template.what_we_offer),
    workingHours,
    issueDate: options.issueDate || new Date().toISOString().slice(0, 10),
    compensationText: expectedSalary
      ? `Rs. ${Number(expectedSalary).toLocaleString()} per month`
      : 'Compensation to be confirmed by administration'
  };
};

export const buildJdDraft = (profile, template, options = {}) =>
  mergeTemplateWithProfile(profile, template, options);
