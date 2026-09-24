// DeepSkills Unified Form Validation Utility & Hook
import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Formats a raw string or number into a standard Pakistani CNIC format: XXXXX-XXXXXXX-X
 */
export const formatCnic = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
};

/**
 * Standardizes phone numbers to a clean digit string or formatted mobile format (max 13 chars)
 */
export const formatPhone = (value, maxDigits = 13) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '').slice(0, hasPlus ? maxDigits - 1 : maxDigits);
  return hasPlus ? `+${digits}` : digits;
};

/**
 * Validates a single value against required constraint
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined) return `${fieldName} is required.`;
  if (typeof value === 'string' && !value.trim()) return `${fieldName} is required.`;
  if (Array.isArray(value) && value.length === 0) return `Please select at least one ${fieldName.toLowerCase()}.`;
  return null;
};

/**
 * Validates an email address
 */
export const validateEmail = (value, fieldName = 'Email address', required = false) => {
  if (!value || !String(value).trim()) {
    return required ? `${fieldName} is required.` : null;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(value).trim())) {
    return `Please enter a valid ${fieldName.toLowerCase()}.`;
  }
  return null;
};

/**
 * Validates a Pakistani 13-digit CNIC (e.g. 35201-1234567-1 or 3520112345671)
 */
export const validateCnic = (value, fieldName = 'CNIC number', required = true) => {
  if (!value || !String(value).trim()) {
    return required ? `${fieldName} is required.` : null;
  }
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 13) {
    return `${fieldName} must be exactly 13 digits (e.g. 35202-1234567-9).`;
  }
  return null;
};

/**
 * Validates phone numbers (standard 10-13 digits)
 */
export const validatePhone = (value, fieldName = 'Phone number', required = true, { min = 10, max = 13 } = {}) => {
  if (!value || !String(value).trim()) {
    return required ? `${fieldName} is required.` : null;
  }
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < min || digits.length > max) {
    return `Please enter a valid ${fieldName.toLowerCase()} (${min}-${max} digits).`;
  }
  return null;
};

/**
 * Validates numeric inputs
 */
export const validateNumber = (value, {
  fieldName = 'Value',
  required = true,
  min,
  max,
  integer = false,
  positive = false
} = {}) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return required ? `${fieldName} is required.` : null;
  }
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number.`;
  }
  if (integer && !Number.isInteger(num)) {
    return `${fieldName} must be a whole number.`;
  }
  if (positive && num <= 0) {
    return `${fieldName} must be greater than zero.`;
  }
  if (min !== undefined && num < min) {
    return `${fieldName} cannot be less than ${min}.`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName} cannot exceed ${max}.`;
  }
  return null;
};

/**
 * Validates a URL and optional YouTube embed source
 */
export const validateUrl = (value, {
  fieldName = 'URL',
  required = true,
  youtubeOnly = false
} = {}) => {
  if (!value || !String(value).trim()) {
    return required ? `${fieldName} is required.` : null;
  }
  const str = String(value).trim();
  try {
    const urlString = str.startsWith('http://') || str.startsWith('https://') ? str : `https://${str}`;
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return `Please enter a valid ${fieldName.toLowerCase()}.`;
    }
    // Check hostname has at least one dot or is localhost
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return `Please enter a valid ${fieldName.toLowerCase()}.`;
    }
    if (youtubeOnly) {
      const isYt = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(str);
      if (!isYt) {
        return 'Please enter a valid YouTube video URL.';
      }
    }
    return null;
  } catch (_) {
    return `Please enter a valid ${fieldName.toLowerCase()}.`;
  }
};

/**
 * Validates that end date is not before start date
 */
export const validateDateRange = (startDate, endDate, {
  startLabel = 'Start date',
  endLabel = 'End date',
  required = true
} = {}) => {
  if (!startDate || !endDate) {
    return required ? `Both ${startLabel.toLowerCase()} and ${endLabel.toLowerCase()} are required.` : null;
  }
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end)) {
    return 'Please select valid dates.';
  }
  if (end < start) {
    return `${endLabel} cannot be earlier than ${startLabel.toLowerCase()}.`;
  }
  return null;
};

/**
 * Validates a single date string (format YYYY-MM-DD, valid calendar day, min/max limits)
 */
export const validateDate = (value, {
  fieldName = 'Date',
  required = false,
  min = null,
  max = null
} = {}) => {
  if (!value || !String(value).trim()) {
    return required ? `${fieldName} is required.` : null;
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return `Please enter a valid ${fieldName.toLowerCase()} in YYYY-MM-DD format.`;
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) {
    return `Please enter a valid ${fieldName.toLowerCase()}.`;
  }
  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
    return `Please enter a valid calendar date for ${fieldName.toLowerCase()}.`;
  }
  if (min && str < min) {
    return `${fieldName} cannot be earlier than ${min}.`;
  }
  if (max && str > max) {
    return `${fieldName} cannot be later than ${max}.`;
  }
  return null;
};

/**
 * Validates an entire form object against a schema definition
 * Schema structure:
 * {
 *   fieldName: (value, allValues) => errorString | null
 *   OR
 *   fieldName: [rule1, rule2, ...]
 * }
 */
export const validateForm = (values, schema = {}) => {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const val = values[field];
    if (typeof rules === 'function') {
      const err = rules(val, values);
      if (err) {
        errors[field] = err;
        isValid = false;
      }
    } else if (Array.isArray(rules)) {
      for (const rule of rules) {
        if (typeof rule === 'function') {
          const err = rule(val, values);
          if (err) {
            errors[field] = err;
            isValid = false;
            break; // Stop at first error for this field
          }
        }
      }
    }
  }

  return { isValid, errors };
};

/**
 * React Hook for unified admin form state & validation
 */
export const useAdminForm = ({
  initialValues = {},
  schema = {},
  onSubmit,
  toastOnError = true
}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error on edit if field was touched
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFieldValue(name, val);
  }, [setFieldValue]);

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (schema[field]) {
      const rules = schema[field];
      const val = values[field];
      let err = null;
      if (typeof rules === 'function') {
        err = rules(val, values);
      } else if (Array.isArray(rules)) {
        for (const rule of rules) {
          err = rule(val, values);
          if (err) break;
        }
      }
      setErrors((prev) => ({
        ...prev,
        [field]: err || undefined
      }));
    }
  }, [schema, values]);

  const resetForm = useCallback((nextValues = initialValues) => {
    setValues(nextValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const { isValid, errors: validationErrors } = validateForm(values, schema);
    setErrors(validationErrors);

    // Mark all fields in schema as touched
    const allTouched = Object.keys(schema).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);

    if (!isValid) {
      if (toastOnError) {
        const firstError = Object.values(validationErrors)[0];
        toast.error(firstError || 'Please fix the errors in the form before proceeding.');
      }
      return false;
    }

    if (!onSubmit) return true;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      return true;
    } catch (err) {
      console.error('Form submission error:', err);
      toast.error(err.message || 'Submission failed. Please check your inputs.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, schema, onSubmit, toastOnError]);

  return {
    values,
    setValues,
    errors,
    setErrors,
    touched,
    setTouched,
    isSubmitting,
    setIsSubmitting,
    setFieldValue,
    handleInputChange,
    handleBlur,
    handleSubmit,
    resetForm
  };
};

export default {
  formatCnic,
  formatPhone,
  validateRequired,
  validateEmail,
  validateCnic,
  validatePhone,
  validateNumber,
  validateUrl,
  validateDateRange,
  validateForm,
  useAdminForm
};
