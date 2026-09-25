export const typography = {
  fontSize: {
    '2xs': 11,
    xs: 12.5,
    sm: 14,
    base: 15.5,
    lg: 17.5,
    xl: 19.5,
    '2xl': 23,
    '3xl': 27,
    '4xl': 32,
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
