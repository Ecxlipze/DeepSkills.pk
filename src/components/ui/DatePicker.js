import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { css } from 'styled-components';
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaTimes,
  FaCheck
} from 'react-icons/fa';
import { portalTheme } from '../portal/PortalTheme';

// --- Date Math & Validation Helpers ---
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toDateStr(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isValidDateString(str) {
  if (!str || typeof str !== 'string') return false;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseDate(str) {
  if (!isValidDateString(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

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
      : props.$isOpen
      ? (portalTheme?.colors?.primary || '#7B1F2E')
      : (portalTheme?.colors?.borderMedium || 'rgba(255, 255, 255, 0.12)')};
  transition: all 0.2s ease;
  box-shadow: ${props =>
    props.$hasError
      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
      : props.$isOpen
      ? '0 0 0 3px rgba(123, 31, 46, 0.2)'
      : 'none'};

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
  padding: 0 42px 0 12px;
  box-sizing: border-box;
  color-scheme: dark;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};

  &::placeholder {
    color: ${portalTheme?.colors?.textMuted || 'rgba(255, 255, 255, 0.4)'};
  }

  &::-webkit-calendar-picker-indicator {
    opacity: 0;
    width: 0;
    margin: 0;
    padding: 0;
    pointer-events: none;
  }
`;

const CalendarToggleBtn = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: none;
  background: ${props => (props.$isOpen ? (portalTheme?.colors?.primaryLight || 'rgba(123, 31, 46, 0.25)') : 'transparent')};
  color: ${props => (props.$isOpen ? '#ffffff' : (portalTheme?.colors?.textSecondary || 'rgba(255, 255, 255, 0.65)'))};
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${portalTheme?.colors?.primaryLight || 'rgba(123, 31, 46, 0.25)'};
    color: #ffffff;
  }

  svg {
    font-size: 1rem;
  }
`;

const CalendarPopover = styled.div`
  position: absolute;
  ${props => (props.$flipUp ? 'bottom: calc(100% + 6px);' : 'top: calc(100% + 6px);')}
  left: 0;
  width: 310px;
  max-width: 95vw;
  background: #11141c;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(123, 31, 46, 0.2);
  z-index: 99999;
  padding: 14px;
  color: #ffffff;
  user-select: none;
  animation: popoverFadeIn 0.18s ease-out;

  @keyframes popoverFadeIn {
    from {
      opacity: 0;
      transform: translateY(${props => (props.$flipUp ? '6px' : '-6px')});
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 12px;
`;

const NavBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  svg {
    font-size: 0.75rem;
  }
`;

const HeaderSelectors = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HeaderSelect = styled.select`
  background: #1a1e29;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${portalTheme?.colors?.primary || '#7B1F2E'};
  }

  option {
    background: #11141c;
    color: #ffffff;
  }
`;

const WeekdaysRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 6px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
`;

const DayCell = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: ${props => (props.$isSelected ? '700' : '500')};
  border: none;
  background: ${props =>
    props.$isSelected
      ? (portalTheme?.colors?.primary || '#7B1F2E')
      : props.$isToday
      ? 'rgba(226, 177, 122, 0.15)'
      : 'transparent'};
  color: ${props =>
    props.$isDisabled
      ? 'rgba(255, 255, 255, 0.2)'
      : props.$isOtherMonth
      ? 'rgba(255, 255, 255, 0.25)'
      : props.$isSelected
      ? '#ffffff'
      : props.$isToday
      ? '#e2b17a'
      : 'rgba(255, 255, 255, 0.85)'};
  outline: ${props => (props.$isToday && !props.$isSelected ? '1px dashed #e2b17a' : 'none')};
  cursor: ${props => (props.$isDisabled ? 'not-allowed' : 'pointer')};
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    ${props =>
      !props.$isSelected &&
      css`
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      `}
  }
`;

const CalendarFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const FooterBtn = styled.button`
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 5px;
  border: none;
  background: ${props =>
    props.$primary
      ? (portalTheme?.colors?.primaryLight || 'rgba(123, 31, 46, 0.3)')
      : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => (props.$primary ? '#ffffff' : 'rgba(255, 255, 255, 0.7)')};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${props =>
      props.$primary
        ? (portalTheme?.colors?.primary || '#7B1F2E')
        : 'rgba(255, 255, 255, 0.12)'};
    color: #ffffff;
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

  const [isOpen, setIsOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  const containerRef = useRef(null);
  const internalInputRef = useRef(null);
  const inputRef = forwardedRef || internalInputRef;

  // Track viewing year and month in the calendar
  const initialView = parseDate(currentValue) || parseDate(getTodayStr());
  const [viewYear, setViewYear] = useState(initialView?.year || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView?.month || new Date().getMonth() + 1);

  // Sync view when currentValue changes to a valid date
  useEffect(() => {
    if (isValidDateString(currentValue)) {
      const parsed = parseDate(currentValue);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      }
    }
  }, [currentValue]);

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

  // Handle open/close and positioning
  const toggleCalendar = () => {
    if (disabled) return;
    if (!isOpen) {
      // Calculate flip up/down based on viewport
      if (containerRef.current && typeof window !== 'undefined') {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setFlipUp(spaceBelow < 330 && rect.top > 330);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setTouched(true);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Handle selecting a date
  const handleSelectDate = (dateStr) => {
    if (disabled) return;

    if (!isControlled) {
      setInternalValue(dateStr);
    }

    setTouched(true);
    setIsOpen(false);

    if (onChange) {
      onChange({
        target: {
          name: name || '',
          value: dateStr
        }
      });
    }
  };

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

  const displayError = errorMessage || localError || (hasError ? 'Invalid date' : '');

  // Calendar navigation
  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(y => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(y => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Build grid days
  const todayStr = getTodayStr();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  // Previous month trailing days
  const prevMonthYear = viewMonth === 1 ? viewYear - 1 : viewYear;
  const prevMonthNum = viewMonth === 1 ? 12 : viewMonth - 1;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthNum);

  const cells = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateStr = toDateStr(prevMonthYear, prevMonthNum, d);
    cells.push({
      dateStr,
      day: d,
      isOtherMonth: true,
      isDisabled: true
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    const isOutMin = min && dateStr < min;
    const isOutMax = max && dateStr > max;
    const isDisabled = Boolean(isOutMin || isOutMax);

    cells.push({
      dateStr,
      day: d,
      isOtherMonth: false,
      isDisabled,
      isSelected: dateStr === currentValue,
      isToday: dateStr === todayStr
    });
  }

  // Next month leading days to complete grid rows
  const remainingCells = 42 - cells.length; // 6 rows * 7
  const nextMonthYear = viewMonth === 12 ? viewYear + 1 : viewYear;
  const nextMonthNum = viewMonth === 12 ? 1 : viewMonth + 1;
  for (let d = 1; d <= remainingCells && cells.length < 35; d++) {
    const dateStr = toDateStr(nextMonthYear, nextMonthNum, d);
    cells.push({
      dateStr,
      day: d,
      isOtherMonth: true,
      isDisabled: true
    });
  }

  // Generate Year options from 1920 to 2040
  const yearOptions = [];
  const minYear = min ? parseInt(min.slice(0, 4), 10) : 1920;
  const maxYear = max ? parseInt(max.slice(0, 4), 10) : 2040;
  const startY = Math.min(1920, minYear);
  const endY = Math.max(2040, maxYear);
  for (let y = endY; y >= startY; y--) {
    yearOptions.push(y);
  }

  return (
    <RootContainer ref={containerRef} className={className} style={style}>
      <InputWrapper
        $hasError={Boolean(displayError)}
        $isOpen={isOpen}
        $disabled={disabled}
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
          onClick={toggleCalendar}
          {...restProps}
        />
        <CalendarToggleBtn
          type="button"
          tabIndex={-1}
          aria-label="Open calendar"
          $isOpen={isOpen}
          disabled={disabled}
          onClick={toggleCalendar}
        >
          <FaCalendarAlt />
        </CalendarToggleBtn>
      </InputWrapper>

      {isOpen && (
        <CalendarPopover $flipUp={flipUp} role="dialog" aria-label="Calendar">
          <CalendarHeader>
            <NavBtn type="button" onClick={prevMonth} aria-label="Previous Month">
              <FaChevronLeft />
            </NavBtn>

            <HeaderSelectors>
              <HeaderSelect
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                aria-label="Select month"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </HeaderSelect>

              <HeaderSelect
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                aria-label="Select year"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </HeaderSelect>
            </HeaderSelectors>

            <NavBtn type="button" onClick={nextMonth} aria-label="Next Month">
              <FaChevronRight />
            </NavBtn>
          </CalendarHeader>

          <WeekdaysRow>
            {WEEKDAY_NAMES.map(day => (
              <div key={day}>{day}</div>
            ))}
          </WeekdaysRow>

          <DaysGrid>
            {cells.map((cell, idx) => (
              <DayCell
                key={`${cell.dateStr}-${idx}`}
                type="button"
                disabled={cell.isDisabled}
                $isDisabled={cell.isDisabled}
                $isOtherMonth={cell.isOtherMonth}
                $isSelected={cell.isSelected}
                $isToday={cell.isToday}
                onClick={() => !cell.isDisabled && handleSelectDate(cell.dateStr)}
              >
                {cell.day}
              </DayCell>
            ))}
          </DaysGrid>

          <CalendarFooter>
            <FooterBtn
              type="button"
              $primary
              onClick={() => {
                const today = getTodayStr();
                if ((!min || today >= min) && (!max || today <= max)) {
                  handleSelectDate(today);
                }
              }}
            >
              Today
            </FooterBtn>

            {!required && currentValue && (
              <FooterBtn
                type="button"
                onClick={() => handleSelectDate('')}
              >
                Clear
              </FooterBtn>
            )}

            <FooterBtn type="button" onClick={() => setIsOpen(false)}>
              Close
            </FooterBtn>
          </CalendarFooter>
        </CalendarPopover>
      )}

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
