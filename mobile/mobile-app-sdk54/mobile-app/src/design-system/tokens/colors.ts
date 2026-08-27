import { THEME } from '../../../lib/theme';

export const colors = {
  light: {
    ...THEME.light,
    status: {
      success: { DEFAULT: '#16a34a', light: '#dcfce7', foreground: '#15803d' },
      warning: { DEFAULT: '#d97706', light: '#fef3c7', foreground: '#b45309' },
      danger:  { DEFAULT: '#dc2626', light: '#fee2e2', foreground: '#b91c1c' },
      info:    { DEFAULT: '#2563eb', light: '#dbeafe', foreground: '#1d4ed8' },
      neutral: { DEFAULT: '#6b7280', light: '#f3f4f6', foreground: '#374151' },
      critical:{ DEFAULT: '#9333ea', light: '#f3e8ff', foreground: '#7e22ce' },
    },
  },
  dark: {
    ...THEME.dark,
    status: {
      success: { DEFAULT: '#22c55e', light: '#052e16', foreground: '#86efac' },
      warning: { DEFAULT: '#f59e0b', light: '#451a03', foreground: '#fde68a' },
      danger:  { DEFAULT: '#ef4444', light: '#450a0a', foreground: '#fca5a5' },
      info:    { DEFAULT: '#3b82f6', light: '#172554', foreground: '#93c5fd' },
      neutral: { DEFAULT: '#737c88', light: '#181d23', foreground: '#a7afba' },
      critical:{ DEFAULT: '#a855f7', light: '#3b0764', foreground: '#d8b4fe' },
    },
  },
} as const;

export type ColorTheme = typeof colors.light;
