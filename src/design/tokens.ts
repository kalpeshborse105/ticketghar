// MahaTicket (महाटिकिट) - Centralized Design System Tokens
// Single source of truth for colors, typography, sizing, radius, elevation, and animations

export const tokens = {
  colors: {
    primary: '#ea580c', // Regal Maharashtra theatre saffron-amber
    primaryHover: '#c2410c',
    primaryLight: '#fff7ed',
    primaryMuted: '#ea580c20',
    secondary: '#0284c7', // Slate sky blue
    secondaryHover: '#0369a1',
    background: '#0a0e17', // Solid, clean carbon black (no blurry glass)
    surface: '#111827', // Solid card and container surface
    surfaceElevated: '#1a2333', // Popups, drawers, modals
    surfaceHover: '#1f2b3e',
    border: '#243044', // Crisp clean border
    borderSubtle: '#1b2535',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    seatAvailable: '#1e293b',
    seatSelected: '#ea580c',
    seatHeld: '#ca8a04',
    seatBooked: '#334155',
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
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
  },
  typography: {
    fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  animation: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type ThemeTokens = typeof tokens;
