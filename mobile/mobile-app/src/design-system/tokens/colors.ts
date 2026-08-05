import { THEME } from '../../../lib/theme';

export const colors = {
  light: {
    ...THEME.light,
    status: {
      success: { DEFAULT: '#16a34a', light: '#dcfce7', foreground: '#15803d' },
      warning: { DEFAULT: '#ea580c', light: '#ffedd5', foreground: '#c2410c' },
      danger:  { DEFAULT: '#dc2626', light: '#fee2e2', foreground: '#b91c1c' },
      info:    { DEFAULT: '#2563eb', light: '#dbeafe', foreground: '#1d4ed8' },
      neutral: { DEFAULT: '#737373', light: '#f5f5f5', foreground: '#525252' },
      critical:{ DEFAULT: '#9333ea', light: '#f3e8ff', foreground: '#7e22ce' },
    },
  },
  dark: {
    ...THEME.dark,
    status: {
      success: { DEFAULT: '#16a34a', light: '#052e16', foreground: '#86efac' },
      warning: { DEFAULT: '#ea580c', light: '#431407', foreground: '#fdba74' },
      danger:  { DEFAULT: '#dc2626', light: '#450a0a', foreground: '#fca5a5' },
      info:    { DEFAULT: '#2563eb', light: '#172554', foreground: '#93c5fd' },
      neutral: { DEFAULT: '#737373', light: '#262626', foreground: '#a3a3a3' },
      critical:{ DEFAULT: '#9333ea', light: '#3b0764', foreground: '#c084fc' },
    },
  },
} as const;

export type ColorTheme = typeof colors.light;
