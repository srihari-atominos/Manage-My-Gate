import { Dimensions, PixelRatio, useWindowDimensions, TextStyle } from 'react-native';

/**
 * Standard baseline design viewport width (based on modern standard smartphone: iPhone 13/14/15, Pixel).
 */
export const BASE_DEVICE_WIDTH = 390;

/**
 * Default maximum accessibility font scale multiplier.
 * Caps extreme font scaling (e.g. 200%-300% OS accessibility settings) to 135%
 * so high-density mobile buttons, navigation bars, and cards do not clip or break.
 */
export const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = 1.35;

export type DeviceCategory = 'compact' | 'standard' | 'large' | 'tablet';

/**
 * Classifies device viewport width into phone-responsive categories.
 * - compact: < 375px (iPhone SE, small Android devices)
 * - standard: 375px - 414px (standard iPhone 12/13/14/15, Galaxy S21/S22/S23)
 * - large: 415px - 600px (iPhone Plus/Pro Max, Galaxy Ultra)
 * - tablet: > 600px (iPads, Android tablets, Foldables unfolded)
 */
export function getDeviceCategory(width: number): DeviceCategory {
  if (width < 375) return 'compact';
  if (width <= 414) return 'standard';
  if (width <= 600) return 'large';
  return 'tablet';
}

/**
 * Scales a font size adaptively based on the device screen width.
 * Uses a moderate scaling algorithm with damping factor and safety bounds.
 *
 * @param size Target font size in points/pixels
 * @param factor Damping factor between 0 (no scale) and 1 (full linear scale). Default is 0.5.
 * @param customWidth Optional width override (defaults to current window width)
 */
export function scaleFontSize(size: number, factor = 0.5, customWidth?: number): number {
  const screenWidth = customWidth ?? Dimensions.get('window').width;

  // Clamped ratio bounds:
  // Compact phones (<375px) scale down gently (minimum 0.90x).
  // Large phones (415-600px) scale up gently (maximum 1.10x).
  // Tablets (>600px) are capped at 1.15x so typography remains balanced.
  const rawRatio = screenWidth / BASE_DEVICE_WIDTH;
  const clampedRatio = Math.min(Math.max(rawRatio, 0.9), 1.15);

  const scaledSize = size * clampedRatio;
  const result = size + (scaledSize - size) * factor;

  return Math.round(PixelRatio.roundToNearestPixel(result));
}

/**
 * Computes adaptive font size and line height pair for smooth vertical rhythm.
 */
export function getAdaptiveFontMetric(fontSize: number, lineHeightRatio = 1.35, factor = 0.5): {
  fontSize: number;
  lineHeight: number;
} {
  const scaledSize = scaleFontSize(fontSize, factor);
  const scaledLineHeight = Math.round(PixelRatio.roundToNearestPixel(scaledSize * lineHeightRatio));
  return {
    fontSize: scaledSize,
    lineHeight: scaledLineHeight,
  };
}

/**
 * Pre-calculated adaptive typography tokens for common UI hierarchies.
 */
export const adaptiveTypography = {
  h1: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(28, 0.6, customWidth),
    lineHeight: scaleFontSize(34, 0.6, customWidth),
  }),
  h2: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(24, 0.55, customWidth),
    lineHeight: scaleFontSize(30, 0.55, customWidth),
  }),
  h3: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(20, 0.5, customWidth),
    lineHeight: scaleFontSize(26, 0.5, customWidth),
  }),
  h4: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(18, 0.45, customWidth),
    lineHeight: scaleFontSize(24, 0.45, customWidth),
  }),
  body: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(16, 0.4, customWidth),
    lineHeight: scaleFontSize(22, 0.4, customWidth),
  }),
  callout: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(14.5, 0.35, customWidth),
    lineHeight: scaleFontSize(20, 0.35, customWidth),
  }),
  caption: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(12.5, 0.3, customWidth),
    lineHeight: scaleFontSize(17, 0.3, customWidth),
  }),
  micro: (customWidth?: number): TextStyle => ({
    fontSize: scaleFontSize(11, 0.25, customWidth),
    lineHeight: scaleFontSize(15, 0.25, customWidth),
  }),
};

/**
 * React Hook providing real-time responsive typography scaling and device categorization.
 * Re-computes whenever window dimensions or orientation changes.
 */
export function useResponsiveTypography() {
  const { width, height } = useWindowDimensions();
  const category = getDeviceCategory(width);

  return {
    width,
    height,
    category,
    isCompact: category === 'compact',
    isStandard: category === 'standard',
    isLarge: category === 'large',
    isTablet: category === 'tablet',
    scaleFontSize: (size: number, factor = 0.5) => scaleFontSize(size, factor, width),
    getAdaptiveMetric: (size: number, lineHeightRatio = 1.35, factor = 0.5) => {
      const scaledSize = scaleFontSize(size, factor, width);
      return {
        fontSize: scaledSize,
        lineHeight: Math.round(PixelRatio.roundToNearestPixel(scaledSize * lineHeightRatio)),
      };
    },
    maxFontSizeMultiplier: DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
  };
}
