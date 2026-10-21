/** Plain CJS theme tokens — light mode (web parity) */
const COLORS = {
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#F97316',
  accent: '#E11D48',
  accentGold: '#F59E0B',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surface2: '#F1F5F9',
  surface3: '#E2E8F0',
  overlay: 'rgba(15,23,42,0.45)',
  text: '#0F172A',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  success: '#059669',
  successBg: 'rgba(5,150,105,0.12)',
  warning: '#D97706',
  warningBg: 'rgba(217,119,6,0.12)',
  danger: '#DC2626',
  dangerBg: 'rgba(220,38,38,0.12)',
  info: '#2563EB',
  seatAvailable: '#FFFFFF',
  seatAvailableBorder: '#CBD5E1',
  seatSelected: '#EA580C',
  seatSelectedBorder: '#C2410C',
  seatBooked: '#E2E8F0',
  seatBookedBorder: '#CBD5E1',
  seatHeld: '#FBBF24',
  seatHeldBorder: '#F59E0B',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  white: '#FFFFFF',
  black: '#0F172A',
  transparent: 'transparent',
};

const GRADIENTS = {
  primary: ['#EA580C', '#F97316'],
  dark: ['#0F172A', '#1E293B'],
  card: ['#FFFFFF', '#F8FAFC'],
  hero: ['transparent', 'rgba(15,23,42,0.75)'],
  saffron: ['#EA580C', '#F59E0B'],
  brand: ['#EA580C', '#E11D48'],
  success: ['#059669', '#10B981'],
};

const TYPOGRAPHY = {
  fontBold: 'System',
  fontMedium: 'System',
  fontRegular: 'System',
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#EA580C',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
};

const ANIMATION = {
  fast: 100,
  normal: 180,
  slow: 280,
};

const theme = {COLORS, GRADIENTS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS};

module.exports = {
  __esModule: true,
  COLORS,
  GRADIENTS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ANIMATION,
  theme,
  default: theme,
};
