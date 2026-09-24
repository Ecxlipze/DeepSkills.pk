import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { FaExclamationCircle } from 'react-icons/fa';
import { portalTheme } from '../portal/PortalTheme.js';
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  pad2,
  toDateStr,
  getTodayStr,
  isValidDateString,
  parseDate
} from '../../utils/dateUtils.js';

export {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  pad2,
  toDateStr,
  getTodayStr,
  isValidDateString,
  parseDate
};

// --- Styled Components ---
const RootContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: 8px;
  background: ${portalTheme?.colors?.bgInput || 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${props =>
    props.$hasError
      ? (portalTheme?.colors?.danger || '#EF4444')
      : (portalTheme?.colors?.borderMedium || 'rgba(255, 255, 255, 0.12)')};
  transition: all 0.2s ease;
  box-shadow: ${props =>
    props.$hasError
      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
      : 'none'};

  &:focus-within {
    border-color: ${props =>
      props.$hasError
        ? (portalTheme?.colors?.danger || '#EF4444')
        : (portalTheme?.colors?.primary || '#7B1F2E')};
    box-shadow: ${props =>
      props.$hasError
        ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
        : '0 0 0 3px rgba(123, 31, 46, 0.2)'};
  }

  &:hover {
    border-color: ${props =>
      props.$hasError
        ? (portalTheme?.colors?.danger || '#EF4444')
        : 'rgba(255, 255, 255, 0.25)'};
  }

  ${props =>
    props.$disabled &&
    css`
      opacity: 0.55;
      cursor: not-allowed;
      background: rgba(255, 255, 255, 0.02);
    `}
`;

const StyledInput = styled.input`
  width: 100%;
  height: 42px;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 0 12px;
  box-sizing: border-box;
  color-scheme: dark;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};

  &::placeholder {
    color: ${portalTheme?.colors?.textMuted || 'rgba(255, 255, 255, 0.4)'};
  }

  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    filter: invert(0.85);
    opacity: 0.85;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      filter: invert(1);
      opacity: 1;
    }
  }
`;

const ErrorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  font-size: 0.8rem;
  color: ${portalTheme?.colors?.danger || '#EF4444'};

  svg {
    flex-shrink: 0;
  }
`;

export const DatePicker = React.forwardRef(function DatePicker(
  {
    value,
    defaultValue,
    onChange,
    onBlur,
    min,
    max,
    name,
    id,
    placeholder = 'YYYY-MM-DD',
    required = false,
    disabled = false,
    hasError = false,
    errorMessage = '',
    validate,
    className,
    style,
    title,
    autoFocus,
    'aria-label': ariaLabel,
    ...restProps
  },
  forwardedRef
) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const currentValue = isControlled ? (value || '') : internalValue;

  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  const internalInputRef = useRef(null);
  const inputRef = forwardedRef || internalInputRef;

  // Validation logic
  const runValidation = useCallback(
    (val) => {
      if (!val) {
        if (required && touched) {
          return 'This date is required.';
        }
        return '';
      }

      if (!isValidDateString(val)) {
        return 'Please enter a valid date (YYYY-MM-DD).';
      }

      if (min && val < min) {
        return `Date cannot be earlier than ${min}.`;
      }

      if (max && val > max) {
        return `Date cannot be later than ${max}.`;
      }

      if (typeof validate === 'function') {
        const customRes = validate(val);
        if (customRes) return customRes;
      }

      return '';
    },
    [required, touched, min, max, validate]
  );

  useEffect(() => {
    const err = runValidation(currentValue);
    setLocalError(err);
  }, [currentValue, runValidation]);

  // Handle manual input change
  const handleInputChange = (e) => {
    const val = e.target.value;
    if (!isControlled) {
      setInternalValue(val);
    }
    if (onChange) {
      onChange(e);
    }
  };

  const handleBlur = (e) => {
    setTouched(true);
    if (onBlur) {
      onBlur(e);
    }
  };

  // Open default browser calendar picker when clicked
  const handleOpenPicker = () => {
    if (disabled) return;
    const el = (forwardedRef && forwardedRef.current) ? forwardedRef.current : internalInputRef.current;
    if (el) {
      try {
        if (typeof el.showPicker === 'function') {
          el.showPicker();
        }
      } catch (_) {
        el.focus();
      }
    }
  };

  const displayError = errorMessage || localError || (hasError ? 'Invalid date' : '');

  return (
    <RootContainer className={className} style={style}>
      <InputWrapper
        $hasError={Boolean(displayError)}
        $disabled={disabled}
        onClick={handleOpenPicker}
      >
        <StyledInput
          ref={inputRef}
          type="date"
          name={name}
          id={id}
          value={currentValue}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          title={title}
          autoFocus={autoFocus}
          aria-label={ariaLabel || placeholder}
          aria-invalid={Boolean(displayError)}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onClick={handleOpenPicker}
          {...restProps}
        />
      </InputWrapper>

      {displayError && (
        <ErrorRow role="alert">
          <FaExclamationCircle />
          <span>{displayError}</span>
        </ErrorRow>
      )}
    </RootContainer>
  );
});

export default DatePicker;
