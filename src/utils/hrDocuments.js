export const MAX_HR_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const ALLOWED_HR_EXTENSIONS_RAW = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'docx', 'doc', 'zip'];
export const ALLOWED_HR_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.doc', '.zip'];
export const ALLOWED_HR_FILE_ACCEPTS = '.jpg,.jpeg,.png,.webp,.pdf,.docx,.doc,.zip,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/zip,application/x-zip-compressed';
export const ALLOWED_HR_IMAGE_ACCEPTS = '.jpg,.jpeg,.png,.webp,image/*';

export const validateHrFile = (file, { isPhotoOnly = false } = {}) => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  if (file.size > MAX_HR_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" exceeds the 10 MB limit (${sizeMb} MB). Please upload files under 10 MB.`
    };
  }
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (isPhotoOnly) {
    const photoExts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!photoExts.includes(ext)) {
      return {
        valid: false,
        error: `"${file.name}" is not an accepted photo format. Allowed: JPG, PNG, WebP.`
      };
    }
    return { valid: true };
  }
  if (!ALLOWED_HR_EXTENSIONS_RAW.includes(ext)) {
    return {
      valid: false,
      error: `"${file.name}" has an unsupported format (.${ext}). Allowed: Images (JPG, PNG, WebP), PDF, DOCX, and ZIP only.`
    };
  }
  return { valid: true };
};

export const normalizeHrUrl = (url = '') => {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const validateHrLink = (url = '') => {
  const normalized = normalizeHrUrl(url);
  if (!normalized) {
    return { valid: false, error: 'Link URL cannot be empty.' };
  }
  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Link must start with http:// or https://' };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { valid: false, error: 'Please enter a valid website link.' };
    }
    return { valid: true, normalizedUrl: normalized };
  } catch (_) {
    return { valid: false, error: 'Invalid URL format.' };
  }
};

export const HR_DOCUMENTS = [
  {
    category: 'educational',
    docType: 'cnic_front',
    label: 'CNIC Copy (Front)',
    required: true,
    multiple: false,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'cnic_back',
    label: 'CNIC Copy (Back)',
    required: true,
    multiple: false,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'highest_degree',
    label: 'Highest Degree Certificate',
    required: true,
    multiple: true,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'transcripts',
    label: 'Transcripts / Mark Sheets',
    required: false,
    multiple: true,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'certifications',
    label: 'Additional Certifications',
    required: false,
    multiple: true,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'employment_letters',
    label: 'Previous Employment Letters',
    required: false,
    multiple: true,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'experience_certificates',
    label: 'Experience Certificates',
    required: false,
    multiple: true,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'portfolio_file',
    label: 'Portfolio / Work Samples',
    required: false,
    multiple: true,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'portfolio_link',
    label: 'Portfolio / Profile Links',
    required: false,
    multiple: true,
    accepts: 'link',
    preview: 'link'
  },
  {
    category: 'other',
    docType: 'passport_photo',
    label: 'Passport-size Photograph',
    required: true,
    multiple: false,
    accepts: ALLOWED_HR_IMAGE_ACCEPTS,
    preview: 'image'
  },
  {
    category: 'other',
    docType: 'other_document',
    label: 'Other Relevant Documents',
    required: false,
    multiple: true,
    accepts: ALLOWED_HR_FILE_ACCEPTS,
    preview: 'file'
  }
];

export const HR_DOCUMENT_GROUPS = ['educational', 'work', 'other'];

export const getDocumentConfig = (docType) =>
  HR_DOCUMENTS.find((entry) => entry.docType === docType);

export const groupDocumentsByCategory = () =>
  HR_DOCUMENT_GROUPS.map((category) => ({
    category,
    items: HR_DOCUMENTS.filter((item) => item.category === category)
  }));

export const mapDocumentsByType = (documents = []) =>
  documents.reduce((accumulator, document) => {
    const key = document.doc_type || document.docType;
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(document);
    return accumulator;
  }, {});

export const hasRequiredDocuments = (documents = []) => {
  const documentMap = mapDocumentsByType(documents);
  return HR_DOCUMENTS.every((document) => {
    if (!document.required) {
      return true;
    }
    return (documentMap[document.docType] || []).length > 0;
  });
};

export const getSubmittedDocumentStats = (documents = []) => {
  const documentMap = mapDocumentsByType(documents);
  const submitted = HR_DOCUMENTS.filter((item) => (documentMap[item.docType] || []).length > 0).length;
  return {
    submitted,
    total: HR_DOCUMENTS.length,
    requiredTotal: HR_DOCUMENTS.filter((item) => item.required).length,
    requiredSubmitted: HR_DOCUMENTS.filter((item) => item.required && (documentMap[item.docType] || []).length > 0).length
  };
};
