import {
  clamp,
  calculateSnapTarget,
  getRestingSide,
  calculateVerticalBounds,
  calculateArcOffsets,
} from '../draggablePhysics';

describe('Draggable Physics & Magnetic Edge Snapping', () => {
  const SCREEN_WIDTH = 390;
  const SCREEN_HEIGHT = 844;
  const BUTTON_SIZE = 56;
  const EDGE_MARGIN = 16;

  describe('clamp', () => {
    it('restricts values within min and max', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(150, 0, 100)).toBe(100);
    });
  });

  describe('calculateSnapTarget', () => {
    it('snaps to left edge when released on the left half of the screen', () => {
      const target = calculateSnapTarget(50, SCREEN_WIDTH, BUTTON_SIZE, EDGE_MARGIN);
      expect(target).toBe(EDGE_MARGIN); // 16
    });

    it('snaps to right edge when released on the right half of the screen', () => {
      const target = calculateSnapTarget(300, SCREEN_WIDTH, BUTTON_SIZE, EDGE_MARGIN);
      expect(target).toBe(SCREEN_WIDTH - BUTTON_SIZE - EDGE_MARGIN); // 390 - 56 - 16 = 318
    });

    it('handles custom edge margins', () => {
      const customMargin = 20;
      const target = calculateSnapTarget(30, SCREEN_WIDTH, BUTTON_SIZE, customMargin);
      expect(target).toBe(customMargin);
    });

    it('snaps to left edge on strong leftward flick velocity even from the right half', () => {
      const target = calculateSnapTarget(280, SCREEN_WIDTH, BUTTON_SIZE, EDGE_MARGIN, -600);
      expect(target).toBe(EDGE_MARGIN);
    });

    it('snaps to right edge on strong rightward flick velocity even from the left half', () => {
      const target = calculateSnapTarget(80, SCREEN_WIDTH, BUTTON_SIZE, EDGE_MARGIN, 600);
      expect(target).toBe(SCREEN_WIDTH - BUTTON_SIZE - EDGE_MARGIN);
    });
  });

  describe('getRestingSide', () => {
    it('identifies left resting side correctly', () => {
      expect(getRestingSide(16, SCREEN_WIDTH, BUTTON_SIZE)).toBe('left');
    });

    it('identifies right resting side correctly', () => {
      expect(getRestingSide(318, SCREEN_WIDTH, BUTTON_SIZE)).toBe('right');
    });
  });

  describe('calculateVerticalBounds', () => {
    it('properly clears top header and bottom navigation bar', () => {
      const topInset = 47;
      const bottomInset = 34;
      const { minY, maxY } = calculateVerticalBounds(
        SCREEN_HEIGHT,
        topInset,
        bottomInset,
        BUTTON_SIZE,
        56,
        84
      );

      expect(minY).toBe(111);
      expect(maxY).toBe(658);
      expect(maxY).toBeGreaterThan(minY);
    });
  });

  describe('calculateArcOffsets (Curve radial fan-out)', () => {
    it('generates an inward top-left curved arc when docked on the right side', () => {
      const item0 = calculateArcOffsets(0, 3, false); // false = right side
      const item1 = calculateArcOffsets(1, 3, false);
      const item2 = calculateArcOffsets(2, 3, false);

      // Item 0: straight up
      expect(item0.targetX).toBe(0);
      expect(item0.targetY).toBe(-135);

      // Item 1: diagonal curve to the left
      expect(item1.targetX).toBe(-75);
      expect(item1.targetY).toBe(-85);

      // Item 2: horizontal curve to the left
      expect(item2.targetX).toBe(-115);
      expect(item2.targetY).toBe(-18);
    });

    it('mirrors the curved arc to the top-right when docked on the left side', () => {
      const item0 = calculateArcOffsets(0, 3, true); // true = left side
      const item1 = calculateArcOffsets(1, 3, true);
      const item2 = calculateArcOffsets(2, 3, true);

      expect(item0.targetX).toBe(0);
      expect(item0.targetY).toBe(-135);

      expect(item1.targetX).toBe(75);
      expect(item1.targetY).toBe(-85);

      expect(item2.targetX).toBe(115);
      expect(item2.targetY).toBe(-18);
    });
  });
});
