import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_HR_FILE_SIZE_BYTES,
  ALLOWED_HR_EXTENSIONS_RAW,
  ALLOWED_HR_FILE_EXTENSIONS,
  ALLOWED_HR_FILE_ACCEPTS,
  HR_DOCUMENTS,
  validateHrFile,
  validateHrLink,
  normalizeHrUrl,
  hasRequiredDocuments,
  mapDocumentsByType
} from '../src/utils/hrDocuments.js';

test('HR File Upload: MAX_HR_FILE_SIZE_BYTES is exactly 10 MB', () => {
  assert.equal(MAX_HR_FILE_SIZE_BYTES, 10 * 1024 * 1024);
});

test('HR File Upload: Allowed file extensions strictly limit to images, PDF, DOCX, and ZIP', () => {
  const expectedRaw = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'docx', 'doc', 'zip'];
  assert.deepEqual(ALLOWED_HR_EXTENSIONS_RAW.sort(), expectedRaw.sort());

  const expectedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.doc', '.zip'];
  assert.deepEqual(ALLOWED_HR_FILE_EXTENSIONS.sort(), expectedExts.sort());
});

test('HR File Upload: validateHrFile accepts valid image, PDF, DOCX, and ZIP under 10MB', () => {
  const allowed = [
    { name: 'degree.pdf', size: 1024 * 1024 },
    { name: 'transcript.jpg', size: 500 * 1024 },
    { name: 'photo.jpeg', size: 2 * 1024 * 1024 },
    { name: 'certificate.png', size: 3 * 1024 * 1024 },
    { name: 'portfolio.webp', size: 1024 * 1024 },
    { name: 'cv.docx', size: 4 * 1024 * 1024 },
    { name: 'old_cv.doc', size: 2 * 1024 * 1024 },
    { name: 'samples.zip', size: 9 * 1024 * 1024 },
    { name: 'exact_limit.pdf', size: 10 * 1024 * 1024 }
  ];

  for (const f of allowed) {
    const res = validateHrFile(f);
    assert.equal(res.valid, true, `Expected ${f.name} to be valid`);
  }
});

test('HR File Upload: validateHrFile rejects files exceeding 10 MB limit', () => {
  const oversized = [
    { name: 'heavy_degree.pdf', size: 10 * 1024 * 1024 + 1 },
    { name: 'massive_portfolio.zip', size: 15 * 1024 * 1024 }
  ];

  for (const f of oversized) {
    const res = validateHrFile(f);
    assert.equal(res.valid, false);
    assert.match(res.error, /exceeds the 10 MB limit/);
  }
});

test('HR File Upload: validateHrFile rejects disallowed extensions', () => {
  const disallowed = [
    { name: 'script.exe', size: 1024 },
    { name: 'malicious.sh', size: 1024 },
    { name: 'danger.bat', size: 1024 },
    { name: 'vector.svg', size: 1024 },
    { name: 'index.html', size: 1024 },
    { name: 'notes.txt', size: 1024 },
    { name: 'archive.tar.gz', size: 1024 },
    { name: 'data.json', size: 1024 }
  ];

  for (const f of disallowed) {
    const res = validateHrFile(f);
    assert.equal(res.valid, false);
    assert.match(res.error, /unsupported format/);
  }
});

test('HR File Upload: photo-only validation rejects non-image formats', () => {
  const invalidPhotos = [
    { name: 'photo.pdf', size: 1024 },
    { name: 'photo.docx', size: 1024 },
    { name: 'photo.zip', size: 1024 }
  ];

  for (const f of invalidPhotos) {
    const res = validateHrFile(f, { isPhotoOnly: true });
    assert.equal(res.valid, false);
    assert.match(res.error, /not an accepted photo format/);
  }

  const validPhoto = { name: 'headshot.jpg', size: 500 * 1024 };
  assert.equal(validateHrFile(validPhoto, { isPhotoOnly: true }).valid, true);
});

test('HR File Upload: validateHrLink and normalizeHrUrl handle multiple formats', () => {
  assert.equal(normalizeHrUrl('github.com/my-profile'), 'https://github.com/my-profile');
  assert.equal(normalizeHrUrl('http://my-portfolio.com'), 'http://my-portfolio.com');

  const validLinks = [
    'https://github.com/deepskills',
    'http://behance.net/designer',
    'linkedin.com/in/instructor',
    'drive.google.com/folder/123'
  ];

  for (const link of validLinks) {
    const res = validateHrLink(link);
    assert.equal(res.valid, true, `Expected ${link} to be valid`);
    assert.ok(res.normalizedUrl.startsWith('http'));
  }

  const invalidLinks = ['', '   ', 'not-a-valid-url'];
  for (const link of invalidLinks) {
    const res = validateHrLink(link);
    assert.equal(res.valid, false);
  }
});

test('HR File Upload: HR_DOCUMENTS allows multiple certificates and multiple links', () => {
  const certsConfig = HR_DOCUMENTS.find((d) => d.docType === 'certifications');
  assert.ok(certsConfig);
  assert.equal(certsConfig.multiple, true);

  const expConfig = HR_DOCUMENTS.find((d) => d.docType === 'experience_certificates');
  assert.ok(expConfig);
  assert.equal(expConfig.multiple, true);

  const degreeConfig = HR_DOCUMENTS.find((d) => d.docType === 'highest_degree');
  assert.ok(degreeConfig);
  assert.equal(degreeConfig.multiple, true);

  const transcriptsConfig = HR_DOCUMENTS.find((d) => d.docType === 'transcripts');
  assert.ok(transcriptsConfig);
  assert.equal(transcriptsConfig.multiple, true);

  const linkConfig = HR_DOCUMENTS.find((d) => d.docType === 'portfolio_link');
  assert.ok(linkConfig);
  assert.equal(linkConfig.multiple, true);
  assert.equal(linkConfig.accepts, 'link');

  const portfolioFileConfig = HR_DOCUMENTS.find((d) => d.docType === 'portfolio_file');
  assert.ok(portfolioFileConfig);
  assert.equal(portfolioFileConfig.multiple, true);
});

test('HR File Upload: multi-file and multi-link document mapping and validation', () => {
  const submittedDocs = [
    { id: '1', doc_type: 'cnic_front', file_name: 'cnic_f.pdf' },
    { id: '2', doc_type: 'cnic_back', file_name: 'cnic_b.pdf' },
    { id: '3', doc_type: 'passport_photo', file_name: 'photo.jpg' },
    { id: '4', doc_type: 'highest_degree', file_name: 'bscs.pdf' },
    { id: '5', doc_type: 'highest_degree', file_name: 'mscs.docx' },
    { id: '6', doc_type: 'certifications', file_name: 'aws_cert.pdf' },
    { id: '7', doc_type: 'certifications', file_name: 'react_cert.png' },
    { id: '8', doc_type: 'portfolio_link', link_url: 'https://github.com/mywork' },
    { id: '9', doc_type: 'portfolio_link', link_url: 'https://behance.net/portfolio' }
  ];

  const map = mapDocumentsByType(submittedDocs);
  assert.equal(map['highest_degree'].length, 2);
  assert.equal(map['certifications'].length, 2);
  assert.equal(map['portfolio_link'].length, 2);

  assert.equal(hasRequiredDocuments(submittedDocs), true);
});
