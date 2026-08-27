export const dimensions = {
  touchTarget: 44,
  buttonHeight: {
    sm: 36,
    default: 44,
    lg: 52,
  },
  inputHeight: 48,
  iconSize: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 28,
    xl: 36,
  },
  headerHeight: 56,
} as const;

export type DimensionToken = typeof dimensions;
