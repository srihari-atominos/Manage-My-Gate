import {
  BASE_DEVICE_WIDTH,
  DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
  getDeviceCategory,
  scaleFontSize,
  getAdaptiveFontMetric,
  adaptiveTypography,
} from '../responsiveTypography';

describe('Responsive Typography & Phone Adaptive Scaling', () => {
  describe('Device Categorization', () => {
    it('correctly classifies compact phones (< 375px)', () => {
      expect(getDeviceCategory(320)).toBe('compact'); // iPhone SE (1st gen)
      expect(getDeviceCategory(360)).toBe('compact'); // Standard compact Android
      expect(getDeviceCategory(374)).toBe('compact');
    });

    it('correctly classifies standard phones (375px - 414px)', () => {
      expect(getDeviceCategory(375)).toBe('standard'); // iPhone 6/7/8/SE2/X
      expect(getDeviceCategory(390)).toBe('standard'); // iPhone 12/13/14/15
      expect(getDeviceCategory(414)).toBe('standard'); // iPhone 8 Plus, 11
    });

    it('correctly classifies large phones / phablets (415px - 600px)', () => {
      expect(getDeviceCategory(428)).toBe('large'); // iPhone 13/14 Pro Max
      expect(getDeviceCategory(430)).toBe('large'); // iPhone 15/16 Pro Max
      expect(getDeviceCategory(500)).toBe('large');
      expect(getDeviceCategory(600)).toBe('large');
    });

    it('correctly classifies tablets (> 600px)', () => {
      expect(getDeviceCategory(768)).toBe('tablet'); // iPad Mini / iPad
      expect(getDeviceCategory(1024)).toBe('tablet');
    });
  });

  describe('Adaptive Font Sizing', () => {
    it('maintains 1:1 scale on the baseline device width (390px)', () => {
      const baseSize = 16;
      const scaled = scaleFontSize(baseSize, 0.5, BASE_DEVICE_WIDTH);
      expect(scaled).toBe(baseSize);
    });

    it('scales font size down moderately on compact screens (360px)', () => {
      const baseSize = 24;
      const scaled = scaleFontSize(baseSize, 0.5, 360);
      expect(scaled).toBeLessThanOrEqual(baseSize);
      expect(scaled).toBeGreaterThanOrEqual(Math.floor(baseSize * 0.9));
    });

    it('scales font size up gently on large phones (430px)', () => {
      const baseSize = 20;
      const scaled = scaleFontSize(baseSize, 0.5, 430);
      expect(scaled).toBeGreaterThanOrEqual(baseSize);
      expect(scaled).toBeLessThanOrEqual(Math.ceil(baseSize * 1.1));
    });

    it('caps maximum scale on tablets to avoid oversized typography', () => {
      const baseSize = 18;
      const scaled = scaleFontSize(baseSize, 0.5, 1200);
      // Maximum clamped ratio is 1.15 with 0.5 factor -> ~1.075x
      expect(scaled).toBeLessThanOrEqual(Math.ceil(baseSize * 1.15));
    });
  });

  describe('Adaptive Font Metrics (Line Height & Pairings)', () => {
    it('produces proportional line heights', () => {
      const metric = getAdaptiveFontMetric(16, 1.4);
      expect(metric.fontSize).toBeGreaterThan(0);
      expect(metric.lineHeight).toBeGreaterThan(metric.fontSize);
    });
  });

  describe('Adaptive Typography Presets', () => {
    it('provides valid adaptive text styles across heading hierarchy', () => {
      const h1 = adaptiveTypography.h1(390);
      const h2 = adaptiveTypography.h2(390);
      const h3 = adaptiveTypography.h3(390);
      const body = adaptiveTypography.body(390);
      const caption = adaptiveTypography.caption(390);

      expect(h1.fontSize).toBeGreaterThan(h2.fontSize as number);
      expect(h2.fontSize).toBeGreaterThan(h3.fontSize as number);
      expect(h3.fontSize).toBeGreaterThan(body.fontSize as number);
      expect(body.fontSize).toBeGreaterThan(caption.fontSize as number);
    });
  });

  describe('Accessibility Constraints', () => {
    it('enforces a safe default max font size multiplier', () => {
      expect(DEFAULT_MAX_FONT_SIZE_MULTIPLIER).toBe(1.35);
      expect(DEFAULT_MAX_FONT_SIZE_MULTIPLIER).toBeLessThan(1.5);
    });
  });
});
