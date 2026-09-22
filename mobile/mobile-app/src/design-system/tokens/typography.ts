export const typography = {
  fontSize: {
    '2xs': 10,
    xs: 11.5,
    sm: 13,
    base: 14.5,
    lg: 16.5,
    xl: 18.5,
    '2xl': 21,
    '3xl': 25,
    '4xl': 30,
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
