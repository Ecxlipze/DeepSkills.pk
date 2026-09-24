import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCnic,
  formatPhone,
  validateRequired,
  validateEmail,
  validateCnic,
  validatePhone,
  validateNumber,
  validateUrl,
  validateDateRange,
  validateForm
} from '../src/utils/formValidation.js';

test('formatCnic formats 13-digit Pakistani CNIC correctly', () => {
  assert.equal(formatCnic(''), '');
  assert.equal(formatCnic('35202'), '35202');
  assert.equal(formatCnic('352021234567'), '35202-1234567');
  assert.equal(formatCnic('3520212345679'), '35202-1234567-9');
  assert.equal(formatCnic('35202-1234567-9'), '35202-1234567-9');
  // Extra digits are truncated to 13
  assert.equal(formatCnic('3520212345679999'), '35202-1234567-9');
});

test('formatPhone formats numbers properly', () => {
  assert.equal(formatPhone(''), '');
  assert.equal(formatPhone('03001234567'), '03001234567');
  assert.equal(formatPhone('+92 300 1234567'), '+923001234567');
  assert.equal(formatPhone('0300-1234-567'), '03001234567');
});

test('validateRequired detects missing, blank, or empty values', () => {
  assert.equal(validateRequired(''), 'This field is required.');
  assert.equal(validateRequired('   '), 'This field is required.');
  assert.equal(validateRequired(null, 'Full name'), 'Full name is required.');
  assert.equal(validateRequired([], 'Courses'), 'Please select at least one courses.');
  assert.equal(validateRequired('John Doe', 'Full name'), null);
  assert.equal(validateRequired(['batch-1'], 'Batches'), null);
});

test('validateEmail checks standard email syntax', () => {
  assert.equal(validateEmail('', 'Email', false), null);
  assert.equal(validateEmail('', 'Email', true), 'Email is required.');
  assert.equal(validateEmail('not-an-email', 'Email'), 'Please enter a valid email.');
  assert.equal(validateEmail('admin@deepskills.pk', 'Email'), null);
});

test('validateCnic checks 13-digit count and presence', () => {
  assert.equal(validateCnic('', 'CNIC', true), 'CNIC is required.');
  assert.equal(validateCnic('35202123456', 'CNIC'), 'CNIC must be exactly 13 digits (e.g. 35202-1234567-9).');
  assert.equal(validateCnic('35202-1234567-9', 'CNIC'), null);
  assert.equal(validateCnic('3520212345679', 'CNIC'), null);
});

test('validatePhone checks valid length (10-13 digits)', () => {
  assert.equal(validatePhone('', 'Phone', true), 'Phone is required.');
  assert.equal(validatePhone('123', 'Phone'), 'Please enter a valid phone (10-13 digits).');
  assert.equal(validatePhone('03001234567', 'Phone'), null);
  assert.equal(validatePhone('+923001234567', 'Phone'), null);
  assert.equal(validatePhone('030012345678999', 'Phone'), 'Please enter a valid phone (10-13 digits).');
});

test('validateNumber checks min, max, integer, and positive rules', () => {
  assert.equal(validateNumber('', { fieldName: 'Fee', required: true }), 'Fee is required.');
  assert.equal(validateNumber('abc', { fieldName: 'Fee' }), 'Fee must be a valid number.');
  assert.equal(validateNumber('-50', { fieldName: 'Fee', positive: true }), 'Fee must be greater than zero.');
  assert.equal(validateNumber('10.5', { fieldName: 'Installments', integer: true }), 'Installments must be a whole number.');
  assert.equal(validateNumber('150', { fieldName: 'Discount', max: 100 }), 'Discount cannot exceed 100.');
  assert.equal(validateNumber('0', { fieldName: 'Score', min: 1 }), 'Score cannot be less than 1.');
  assert.equal(validateNumber('5000', { fieldName: 'Fee', min: 0 }), null);
});

test('validateUrl checks valid URLs and YouTube embeds', () => {
  assert.equal(validateUrl('', { fieldName: 'Website', required: true }), 'Website is required.');
  assert.equal(validateUrl('invalid-url', { fieldName: 'Website' }), 'Please enter a valid website.');
  assert.equal(validateUrl('https://example.com', { fieldName: 'Website' }), null);
  assert.equal(validateUrl('https://google.com', { fieldName: 'Video', youtubeOnly: true }), 'Please enter a valid YouTube video URL.');
  assert.equal(validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { fieldName: 'Video', youtubeOnly: true }), null);
  assert.equal(validateUrl('https://youtu.be/dQw4w9WgXcQ', { fieldName: 'Video', youtubeOnly: true }), null);
});

test('validateDateRange checks end date is not before start date', () => {
  assert.equal(validateDateRange('', '', { required: true }), 'Both start date and end date are required.');
  assert.equal(validateDateRange('2026-05-10', '2026-05-01', { endLabel: 'End Date', startLabel: 'Start Date' }), 'End Date cannot be earlier than start date.');
  assert.equal(validateDateRange('2026-05-01', '2026-05-10'), null);
  assert.equal(validateDateRange('2026-05-01', '2026-05-01'), null);
});

test('validateForm executes schema rules and aggregates errors', () => {
  const schema = {
    name: (val) => validateRequired(val, 'Name'),
    email: (val) => validateEmail(val, 'Email', true),
    cnic: (val) => validateCnic(val, 'CNIC', true),
    fee: (val) => validateNumber(val, { fieldName: 'Fee', positive: true })
  };

  const invalidValues = {
    name: '',
    email: 'bad-email',
    cnic: '123',
    fee: '-10'
  };

  const { isValid, errors } = validateForm(invalidValues, schema);
  assert.equal(isValid, false);
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.cnic);
  assert.ok(errors.fee);

  const validValues = {
    name: 'Muhammad Ali',
    email: 'ali@deepskills.pk',
    cnic: '35202-1234567-9',
    fee: '25000'
  };

  const result = validateForm(validValues, schema);
  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});
