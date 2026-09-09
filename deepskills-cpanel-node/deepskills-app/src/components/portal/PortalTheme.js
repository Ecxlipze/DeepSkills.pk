// DeepSkills Portal Unified Design Tokens
export const portalTheme = {
  colors: {
    primary: '#7B1F2E',
    primaryHover: '#9B283B',
    primaryActive: '#631825',
    primaryLight: 'rgba(123, 31, 46, 0.14)',
    primaryGlow: 'rgba(123, 31, 46, 0.35)',
    primaryGradient: 'linear-gradient(135deg, #7B1F2E 0%, #b32d43 100%)',
    primaryBorderGradient: 'linear-gradient(135deg, rgba(123, 31, 46, 0.4), rgba(255, 255, 255, 0.2), rgba(123, 31, 46, 0.4))',

    // Surfaces & Glassmorphism
    bgBase: '#07080a',
    bgSidebar: 'rgba(11, 13, 18, 0.94)',
    bgTopbar: 'rgba(11, 13, 18, 0.85)',
    bgCard: 'rgba(17, 19, 26, 0.72)',
    bgCardHover: 'rgba(23, 26, 36, 0.85)',
    bgElevated: 'rgba(24, 27, 38, 0.96)',
    bgInput: 'rgba(255, 255, 255, 0.04)',
    bgInputFocus: 'rgba(255, 255, 255, 0.07)',

    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.07)',
    borderMedium: 'rgba(255, 255, 255, 0.12)',
    borderGlow: 'rgba(123, 31, 46, 0.35)',

    // Text
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.45)',
    textDim: 'rgba(255, 255, 255, 0.25)',

    // Semantics
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.14)',
    successText: '#34D399',

    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.14)',
    warningText: '#FBBF24',

    danger: '#EF4444',
    dangerLight: 'rgba(239, 68, 68, 0.14)',
    dangerText: '#F87171',

    info: '#3B82F6',
    infoLight: 'rgba(59, 130, 246, 0.14)',
    infoText: '#60A5FA',

    purple: '#8B5CF6',
    purpleLight: 'rgba(139, 92, 246, 0.14)',
    purpleText: '#A78BFA',
  },

  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    pill: '9999px',
  },

  shadows: {
    card: '0 4px 24px -2px rgba(0, 0, 0, 0.6), 0 2px 8px -2px rgba(0, 0, 0, 0.4)',
    glow: '0 0 30px rgba(123, 31, 46, 0.22)',
    dropdown: '0 12px 32px rgba(0, 0, 0, 0.75), 0 4px 12px rgba(0, 0, 0, 0.5)',
  },

  fonts: {
    heading: "'Asimovian', 'Inter', sans-serif",
    body: "'Inter', sans-serif",
  },

  transitions: {
    default: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  }
};

export default portalTheme;
