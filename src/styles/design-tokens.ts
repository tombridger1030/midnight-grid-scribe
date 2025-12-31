/**
 * Noctisium Design System Tokens
 * 
 * A command center for ambitious founders on a mission.
 * Visual language: Futuristic, dystopian, electric.
 */

export const colors = {
  // === CORE PALETTE ===
  
  // Primary: Electric Cyan - Power, clarity, advanced tech
  primary: {
    DEFAULT: '#00F0FF',
    50: '#E6FEFF',
    100: '#B3FCFF',
    200: '#80FAFF',
    300: '#4DF7FF',
    400: '#1AF5FF',
    500: '#00F0FF', // Main
    600: '#00C4D4',
    700: '#0098A8',
    800: '#006C7D',
    900: '#004051',
    muted: '#0A8F9A',
    glow: 'rgba(0, 240, 255, 0.5)',
  },

  // Success: Neon Green - Progress, velocity, wins
  success: {
    DEFAULT: '#00FF88',
    50: '#E6FFF2',
    100: '#B3FFDB',
    200: '#80FFC4',
    300: '#4DFFAD',
    400: '#1AFF96',
    500: '#00FF88', // Main
    600: '#00D970',
    700: '#00B35C',
    800: '#008C48',
    900: '#006634',
    muted: '#0A9A5A',
    glow: 'rgba(0, 255, 136, 0.5)',
  },

  // Warning: Amber - Attention, approaching limits
  warning: {
    DEFAULT: '#FFB800',
    50: '#FFF8E6',
    100: '#FFEDB3',
    200: '#FFE280',
    300: '#FFD74D',
    400: '#FFCC1A',
    500: '#FFB800', // Main
    600: '#D99D00',
    700: '#B38200',
    800: '#8C6600',
    900: '#664B00',
    muted: '#9A7A0A',
    glow: 'rgba(255, 184, 0, 0.5)',
  },

  // Danger: Crimson - Errors only (sparingly used)
  danger: {
    DEFAULT: '#FF3366',
    50: '#FFE6EC',
    100: '#FFB3C4',
    200: '#FF809D',
    300: '#FF4D75',
    400: '#FF1A4E',
    500: '#FF3366', // Main
    600: '#D92B57',
    700: '#B32448',
    800: '#8C1C39',
    900: '#66142A',
    muted: '#9A2A4A',
    glow: 'rgba(255, 51, 102, 0.5)',
  },

  // === BACKGROUNDS ===
  background: {
    primary: '#000000',    // True black - main background
    secondary: '#0A0A0A',  // Slightly lifted - cards
    tertiary: '#141414',   // Elevated surfaces - modals, dropdowns
    elevated: '#1A1A1A',   // Highest elevation
    hover: '#1F1F1F',      // Hover states
  },

  // === TEXT ===
  text: {
    primary: '#E8E8E8',    // Main text - off-white
    secondary: '#A0A0A0',  // Secondary text
    muted: '#6B6B6B',      // Muted text, labels
    disabled: '#404040',   // Disabled state
    inverse: '#000000',    // Text on light backgrounds
  },

  // === BORDERS & LINES ===
  border: {
    DEFAULT: '#1F1F1F',    // Subtle borders
    muted: '#141414',      // Very subtle
    accent: '#2A2A2A',     // Slightly visible
    focus: '#00F0FF',      // Focus state
  },

  // === SEMANTIC (for status indicators) ===
  status: {
    excellent: '#00FF88',  // Green
    good: '#00F0FF',       // Cyan
    fair: '#FFB800',       // Amber
    poor: '#FF3366',       // Red (sparingly)
    neutral: '#6B6B6B',    // Gray
  },

  // === RANK COLORS ===
  rank: {
    bronze: '#CD7F32',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
    grandmaster: '#FF00FF',
  },

  // === CHART COLORS ===
  chart: {
    line1: '#00F0FF',      // Primary cyan
    line2: '#00FF88',      // Green
    line3: '#FFB800',      // Amber
    line4: '#FF3366',      // Red
    line5: '#9D4EDD',      // Purple
    grid: '#1F1F1F',
    axis: '#404040',
  },
} as const;

export const typography = {
  // Font families
  fontFamily: {
    mono: ['JetBrains Mono', 'Fira Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    display: ['Space Grotesk', 'system-ui', 'sans-serif'],
    body: ['Inter', 'system-ui', 'sans-serif'],
  },

  // Font sizes (rem)
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export const spacing = {
  // Base spacing scale (rem)
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
  glow: {
    cyan: '0 0 20px rgba(0, 240, 255, 0.3)',
    green: '0 0 20px rgba(0, 255, 136, 0.3)',
    amber: '0 0 20px rgba(255, 184, 0, 0.3)',
    red: '0 0 20px rgba(255, 51, 102, 0.3)',
  },
} as const;

export const animation = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easings
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

export const zIndex = {
  behind: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 9999,
} as const;

// === CSS VARIABLE NAMES ===
// These map to CSS custom properties for use in Tailwind/CSS

export const cssVariables = {
  // Colors
  '--color-primary': colors.primary.DEFAULT,
  '--color-primary-muted': colors.primary.muted,
  '--color-primary-glow': colors.primary.glow,
  
  '--color-success': colors.success.DEFAULT,
  '--color-success-muted': colors.success.muted,
  '--color-success-glow': colors.success.glow,
  
  '--color-warning': colors.warning.DEFAULT,
  '--color-warning-muted': colors.warning.muted,
  '--color-warning-glow': colors.warning.glow,
  
  '--color-danger': colors.danger.DEFAULT,
  '--color-danger-muted': colors.danger.muted,
  '--color-danger-glow': colors.danger.glow,
  
  '--bg-primary': colors.background.primary,
  '--bg-secondary': colors.background.secondary,
  '--bg-tertiary': colors.background.tertiary,
  '--bg-elevated': colors.background.elevated,
  '--bg-hover': colors.background.hover,
  
  '--text-primary': colors.text.primary,
  '--text-secondary': colors.text.secondary,
  '--text-muted': colors.text.muted,
  '--text-disabled': colors.text.disabled,
  
  '--border-default': colors.border.DEFAULT,
  '--border-muted': colors.border.muted,
  '--border-accent': colors.border.accent,
  '--border-focus': colors.border.focus,
} as const;

// Export everything as a unified theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  zIndex,
  cssVariables,
} as const;

export default theme;
