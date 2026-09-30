// MahaTicket (महाटिकिट) - Centralized Design System Tokens
// Single source of truth for colors, typography, sizing, radius, elevation, and animations
// Premium LIGHT soft-neutral UI with controlled accent colors

export const tokens = {
  colors: {
    // Primary: Elegant violet-indigo (controlled, not overwhelming)
    primary: '#6366f1', // Indigo-500
    primaryHover: '#4f46e5', // Indigo-600
    primaryLight: '#eef2ff', // Indigo-50
    primaryMuted: '#6366f120',
    
    // Secondary/Accent: Complementary amber for CTAs
    accent: '#f59e0b', // Amber-500
    accentHover: '#d97706', // Amber-600
    accentLight: '#fef3c7', // Amber-50
    
    // Light neutral backgrounds
    background: '#fafafa', // Neutral-50
    surface: '#ffffff', // Pure white cards
    surfaceElevated: '#f5f5f5', // Neutral-100 for elevated surfaces
    surfaceHover: '#e5e5e5', // Neutral-200
    
    // Borders: subtle, clean
    border: '#e5e7eb', // Gray-200
    borderSubtle: '#f3f4f6', // Gray-100
    borderStrong: '#d1d5db', // Gray-300
    
    // Text hierarchy
    textPrimary: '#111827', // Gray-900
    textSecondary: '#6b7280', // Gray-500
    textMuted: '#9ca3af', // Gray-400
    
    // Status colors
    success: '#10b981', // Emerald-500
    warning: '#f59e0b', // Amber-500
    error: '#ef4444', // Red-500
    info: '#3b82f6', // Blue-500
    
    // Seat map colors (light theme)
    seatAvailable: '#f5f5f5', // Neutral-100
    seatAvailableBorder: '#d1d5db', // Gray-300
    seatSelected: '#6366f1', // Primary
    seatHeld: '#fbbf24', // Amber-400
    seatBooked: '#e5e7eb', // Gray-200
    seatBookedText: '#9ca3af', // Gray-400
  },
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
  typography: {
    fontSans: 'var(--font-outfit), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontDevanagari: 'var(--font-noto-sans-devanagari), system-ui, sans-serif',
  },
  animation: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type ThemeTokens = typeof tokens;
