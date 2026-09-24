import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import { portalTheme } from './PortalTheme';
import DatePicker from '../ui/DatePicker';

// --- Animations ---
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// --- Modal System ---
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
`;

const ModalCard = styled(motion.div)`
  background: ${portalTheme.colors.bgElevated};
  border: 1px solid ${portalTheme.colors.borderMedium};
  border-radius: ${portalTheme.radii.lg};
  width: 100%;
  max-width: ${props => props.$maxWidth || '580px'};
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${portalTheme.shadows.dropdown};
  overflow: hidden;
  position: relative;

  @media (max-width: 640px) {
    max-height: 95vh;
    border-radius: ${portalTheme.radii.md};
  }
`;

const ModalHeaderWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  background: rgba(255, 255, 255, 0.02);
  gap: 16px;

  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .icon-badge {
    width: 38px;
    height: 38px;
    border-radius: ${portalTheme.radii.sm};
    background: ${portalTheme.colors.primaryLight};
    color: ${portalTheme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    flex-shrink: 0;
    border: 1px solid rgba(123, 31, 46, 0.25);
  }

  .titles {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: ${portalTheme.colors.textPrimary};
      font-family: ${portalTheme.fonts.heading};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    p {
      margin: 0;
      font-size: 0.82rem;
      color: ${portalTheme.colors.textMuted};
      line-height: 1.3;
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: ${portalTheme.colors.textMuted};
    cursor: pointer;
    font-size: 1.15rem;
    padding: 6px;
    border-radius: ${portalTheme.radii.sm};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: ${portalTheme.transitions.default};
    flex-shrink: 0;

    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }
  }
`;

const ModalBodyWrapper = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;

  /* Subtle Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
  }
`;

const ModalFooterWrapper = styled.div`
  padding: 16px 24px;
  border-top: 1px solid ${portalTheme.colors.borderSubtle};
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
`;

export const AdminModal = ({
  isOpen,
  open,
  onClose,
  maxWidth = '580px',
  children,
  className
}) => {
  const isVisible = Boolean(isOpen ?? open);
  return (
    <AnimatePresence>
      {isVisible && (
      <ModalOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={className}
      >
        <ModalCard
          $maxWidth={maxWidth}
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </ModalCard>
      </ModalOverlay>
    )}
  </AnimatePresence>
  );
};

export const AdminModalHeader = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children
}) => (
  <ModalHeaderWrapper>
    <div className="header-content">
      {Icon && (
        <div className="icon-badge">
          {React.isValidElement(Icon) ? Icon : <Icon />}
        </div>
      )}
      <div className="titles">
        {title && <h3>{title}</h3>}
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
    {onClose && (
      <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
        <FaTimes />
      </button>
    )}
  </ModalHeaderWrapper>
);

export const AdminModalBody = ({ children, style, className }) => (
  <ModalBodyWrapper style={style} className={className}>
    {children}
  </ModalBodyWrapper>
);

export const AdminModalFooter = ({ children, style, className }) => (
  <ModalFooterWrapper style={style} className={className}>
    {children}
  </ModalFooterWrapper>
);

// --- Form Controls & Fields ---
export const FormFieldWrapper = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
  position: relative;
`;

export const FormLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${portalTheme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 4px;
  letter-spacing: 0.01em;

  .req {
    color: ${portalTheme.colors.danger};
    font-weight: 700;
  }
`;

export const FormError = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: ${portalTheme.colors.dangerText};
  font-weight: 500;
  margin-top: 2px;
  animation: fadeIn 0.2s ease-in-out;

  svg {
    font-size: 0.78rem;
    flex-shrink: 0;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-2px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const FormHelperText = styled.div`
  font-size: 0.78rem;
  color: ${portalTheme.colors.textMuted};
  line-height: 1.35;
  margin-top: 2px;
`;

const controlCommonStyles = css`
  box-sizing: border-box;
  width: 100%;
  padding: 10px 14px;
  background: ${portalTheme.colors.bgInput};
  border: 1px solid ${props => props.$hasError ? portalTheme.colors.danger : portalTheme.colors.borderSubtle};
  border-radius: ${portalTheme.radii.sm};
  color: ${portalTheme.colors.textPrimary};
  font-size: 0.9rem;
  font-family: ${portalTheme.fonts.body};
  outline: none;
  transition: ${portalTheme.transitions.default};

  &::placeholder {
    color: ${portalTheme.colors.textDim};
  }

  &:hover:not(:disabled) {
    border-color: ${props => props.$hasError ? portalTheme.colors.danger : portalTheme.colors.borderMedium};
    background: ${portalTheme.colors.bgInputFocus};
  }

  &:focus {
    border-color: ${props => props.$hasError ? portalTheme.colors.danger : portalTheme.colors.primary};
    background: ${portalTheme.colors.bgInputFocus};
    box-shadow: ${props => props.$hasError 
      ? '0 0 0 3px rgba(239, 68, 68, 0.15)' 
      : '0 0 0 3px rgba(123, 31, 46, 0.2)'};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.02);
  }
`;

export const AdminInput = styled.input`
  ${controlCommonStyles}
  height: 42px;

  &[type="date"],
  &[type="datetime-local"] {
    color-scheme: dark;
    cursor: pointer;

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
  }
`;

export const AdminDatePicker = DatePicker;

export const AdminSelect = styled.select`
  ${controlCommonStyles}
  height: 42px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255, 255, 255, 0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 14px;
  padding-right: 36px;

  option {
    background: #111318;
    color: #fff;
    padding: 8px;
  }
`;

export const AdminTextarea = styled.textarea`
  ${controlCommonStyles}
  min-height: 85px;
  resize: vertical;
  line-height: 1.45;
`;

export const FormField = ({
  label,
  required,
  error,
  hint,
  id,
  children,
  style,
  className
}) => (
  <FormFieldWrapper style={style} className={className}>
    {label && (
      <FormLabel htmlFor={id}>
        {label}
        {required && <span className="req">*</span>}
      </FormLabel>
    )}
    {children}
    {error && (
      <FormError>
        <FaExclamationCircle />
        <span>{error}</span>
      </FormError>
    )}
    {!error && hint && <FormHelperText>{hint}</FormHelperText>}
  </FormFieldWrapper>
);

// --- Grid & Row Layouts ---
export const FormGrid = styled.div`
  box-sizing: border-box;
  display: grid;
  grid-template-columns: ${props => {
    const cols = props.$columns || props.columns;
    if (!cols || cols === 2 || cols === '2') return 'repeat(2, minmax(0, 1fr))';
    if (typeof cols === 'number') return `repeat(${cols}, minmax(0, 1fr))`;
    if (typeof cols === 'string' && (cols.includes('fr') || cols.includes('%') || cols.includes('px'))) return cols;
    return `repeat(${cols}, minmax(0, 1fr))`;
  }};
  gap: ${props => props.$gap || props.gap || '16px'};
  width: 100%;

  @media (max-width: ${props => props.$breakPoint || '640px'}) {
    grid-template-columns: 1fr;
  }
`;

export const FormRow = styled.div`
  box-sizing: border-box;
  display: flex;
  gap: ${props => props.$gap || props.gap || '14px'};
  align-items: ${props => props.$align || 'flex-start'};
  flex-wrap: ${props => props.$wrap ? 'wrap' : 'nowrap'};
  width: 100%;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const FormSection = styled.div`
  margin: 10px 0 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};

  h4 {
    margin: 0 0 3px;
    font-size: 0.95rem;
    font-weight: 700;
    color: ${portalTheme.colors.textPrimary};
  }

  p {
    margin: 0;
    font-size: 0.8rem;
    color: ${portalTheme.colors.textMuted};
  }
`;

// --- Checkbox & Toggle ---
const CheckboxWrapper = styled.label`
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-size: 0.88rem;
  color: ${portalTheme.colors.textSecondary};

  input[type="checkbox"] {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid ${portalTheme.colors.borderMedium};
    background: ${portalTheme.colors.bgInput};
    cursor: pointer;
    display: inline-grid;
    place-content: center;
    transition: ${portalTheme.transitions.default};
    margin-top: 2px;
    flex-shrink: 0;

    &:checked {
      background: ${portalTheme.colors.primary};
      border-color: ${portalTheme.colors.primary};

      &::before {
        content: '';
        width: 10px;
        height: 6px;
        border-left: 2px solid #fff;
        border-bottom: 2px solid #fff;
        transform: rotate(-45deg) translate(1px, -1px);
      }
    }

    &:focus {
      box-shadow: 0 0 0 2px rgba(123, 31, 46, 0.35);
    }
  }

  .label-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    small {
      font-size: 0.78rem;
      color: ${portalTheme.colors.textMuted};
    }
  }
`;

export const AdminCheckbox = ({ label, description, checked, onChange, disabled, style, className }) => (
  <CheckboxWrapper style={style} className={className}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <div className="label-text">
      <span>{label}</span>
      {description && <small>{description}</small>}
    </div>
  </CheckboxWrapper>
);

const ToggleSwitch = styled.div`
  width: 44px;
  height: 24px;
  background: ${props => props.$checked ? portalTheme.colors.primary : 'rgba(255, 255, 255, 0.12)'};
  border-radius: ${portalTheme.radii.pill};
  position: relative;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.$checked ? '23px' : '3px'};
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    transition: ${portalTheme.transitions.default};
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
`;

export const AdminToggle = ({ checked, onChange, label, style, className }) => (
  <div
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', ...style }}
    className={className}
    onClick={onChange}
  >
    {label && <span style={{ fontSize: '0.88rem', color: portalTheme.colors.textSecondary, fontWeight: 500 }}>{label}</span>}
    <ToggleSwitch $checked={checked} />
  </div>
);

// --- Buttons ---
const getButtonVariantStyles = ($variant) => {
  switch ($variant) {
    case 'secondary':
      return css`
        background: rgba(255, 255, 255, 0.06);
        color: ${portalTheme.colors.textPrimary};
        border: 1px solid ${portalTheme.colors.borderSubtle};

        &:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: ${portalTheme.colors.borderMedium};
        }
      `;
    case 'danger':
      return css`
        background: rgba(239, 68, 68, 0.15);
        color: ${portalTheme.colors.dangerText};
        border: 1px solid rgba(239, 68, 68, 0.3);

        &:hover:not(:disabled) {
          background: ${portalTheme.colors.danger};
          color: #fff;
        }
      `;
    case 'outline':
      return css`
        background: transparent;
        color: ${portalTheme.colors.textSecondary};
        border: 1px solid ${portalTheme.colors.borderMedium};

        &:hover:not(:disabled) {
          border-color: ${portalTheme.colors.primary};
          color: #fff;
        }
      `;
    case 'primary':
    default:
      return css`
        background: ${portalTheme.colors.primaryGradient};
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 2px 10px rgba(123, 31, 46, 0.3);

        &:hover:not(:disabled) {
          filter: brightness(1.1);
          box-shadow: 0 4px 16px rgba(123, 31, 46, 0.45);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }
      `;
  }
};

export const AdminButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${props => props.$size === 'sm' ? '7px 12px' : props.$size === 'lg' ? '12px 24px' : '9px 18px'};
  font-size: ${props => props.$size === 'sm' ? '0.82rem' : props.$size === 'lg' ? '1rem' : '0.88rem'};
  font-weight: 600;
  border-radius: ${portalTheme.radii.sm};
  cursor: pointer;
  transition: ${portalTheme.transitions.default};
  font-family: ${portalTheme.fonts.body};
  white-space: nowrap;

  ${props => getButtonVariantStyles(props.$variant)}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    filter: none !important;
  }

  .spinner {
    animation: ${spin} 0.8s linear infinite;
  }
`;

export default {
  AdminModal,
  AdminModalHeader,
  AdminModalBody,
  AdminModalFooter,
  FormField,
  FormLabel,
  FormError,
  FormHelperText,
  AdminInput,
  AdminDatePicker,
  DatePicker,
  AdminSelect,
  AdminTextarea,
  AdminCheckbox,
  AdminToggle,
  AdminButton,
  FormGrid,
  FormRow,
  FormSection
};
