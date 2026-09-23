export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

