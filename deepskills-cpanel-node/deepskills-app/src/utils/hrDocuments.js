export const HR_DOCUMENTS = [
  {
    category: 'educational',
    docType: 'cnic_front',
    label: 'CNIC Copy (Front)',
    required: true,
    multiple: false,
    accepts: '.pdf,.jpg,.jpeg,.png',
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'cnic_back',
    label: 'CNIC Copy (Back)',
    required: true,
    multiple: false,
    accepts: '.pdf,.jpg,.jpeg,.png',
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'highest_degree',
    label: 'Highest Degree Certificate',
    required: true,
    multiple: false,
    accepts: '.pdf,.jpg,.jpeg,.png',
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'transcripts',
    label: 'Transcripts / Mark Sheets',
    required: false,
    multiple: false,
    accepts: '.pdf,.jpg,.jpeg,.png',
    preview: 'file'
  },
  {
    category: 'educational',
    docType: 'certifications',
    label: 'Additional Certifications',
    required: false,
    multiple: true,
    accepts: '.pdf,.jpg,.jpeg,.png',
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'employment_letters',
    label: 'Previous Employment Letters',
    required: false,
    multiple: true,
    accepts: '.pdf',
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'experience_certificates',
    label: 'Experience Certificates',
    required: false,
    multiple: true,
    accepts: '.pdf,.jpg,.jpeg,.png',
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'portfolio_file',
    label: 'Portfolio / Work Samples',
    required: false,
    multiple: false,
    accepts: '.pdf,.zip',
    preview: 'file'
  },
  {
    category: 'work',
    docType: 'portfolio_link',
    label: 'Portfolio Link',
    required: false,
    multiple: false,
    accepts: 'link',
    preview: 'link'
  },
  {
    category: 'other',
    docType: 'passport_photo',
    label: 'Passport-size Photograph',
    required: true,
    multiple: false,
    accepts: '.jpg,.jpeg,.png',
    preview: 'image'
  },
  {
    category: 'other',
    docType: 'other_document',
    label: 'Other Relevant Document',
    required: false,
    multiple: true,
    accepts: '.pdf,.jpg,.jpeg,.png',
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
