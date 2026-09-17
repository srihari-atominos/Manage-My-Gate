export const typography = {
  fontSize: {
    xs: 14,
    sm: 16,
    base: 18,
    lg: 21,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
} as const;

export type TypographyToken = typeof typography;
