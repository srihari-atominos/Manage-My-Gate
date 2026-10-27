/**
 * Boundary clamping, magnetic edge-snapping, and radial arc calculation helpers
 * for draggable Floating Action Buttons and interactive speed dials.
 */

export interface DragBoundaries {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function clamp(val: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

/**
 * Calculates horizontal snap target based on which half of the screen the button is on,
 * or user fling velocity. Always strictly clamped between min and max edge margins.
 */
export function calculateSnapTarget(
  currentX: number,
  screenWidth: number,
  buttonWidth: number,
  edgeMargin = 16,
  velocityX = 0
): number {
  'worklet';
  const minSnap = edgeMargin;
  const maxSnap = Math.max(screenWidth - buttonWidth - edgeMargin, minSnap);
  const screenCenter = screenWidth / 2;

  // Significant flick/fling velocity overrides resting center position
  if (velocityX < -450) {
    return minSnap; // Fling to Left
  }
  if (velocityX > 450) {
    return maxSnap; // Fling to Right
  }

  const buttonCenter = currentX + buttonWidth / 2;
  if (buttonCenter < screenCenter) {
    return minSnap; // Snap to Left
  }
  return maxSnap; // Snap to Right
}

/**
 * Determines whether the floating element is resting closer to the left or right edge.
 */
export function getRestingSide(
  currentX: number,
  screenWidth: number,
  buttonWidth: number
): 'left' | 'right' {
  'worklet';
  const buttonCenter = currentX + buttonWidth / 2;
  return buttonCenter < screenWidth / 2 ? 'left' : 'right';
}

/**
 * Calculates safe vertical boundaries so floating buttons never go behind
 * the top navigation header or underneath the bottom navigation bar.
 */
export function calculateVerticalBounds(
  screenHeight: number,
  topInset: number,
  bottomInset: number,
  buttonHeight: number,
  headerHeight = 56,
  bottomNavHeight = 84
): { minY: number; maxY: number } {
  'worklet';
  const minY = Math.max(topInset + headerHeight + 8, 16);
  const maxY = Math.max(screenHeight - bottomInset - bottomNavHeight - buttonHeight - 12, minY + 50);
  return { minY, maxY };
}

/**
 * Calculates radial elliptical arc curve offsets for speed dial sub-actions.
 * When resting on the right side of the screen, the actions fan out in an arc to the top-left.
 * When resting on the left side of the screen, the actions fan out in an arc to the top-right.
 */
export function calculateArcOffsets(
  index: number,
  totalCount: number,
  isLeft: boolean,
  rx = 115,
  ry = 135
): { targetX: number; targetY: number } {
  'worklet';
  if (totalCount <= 1) {
    return { targetX: 0, targetY: -80 };
  }

  // Pre-tuned harmonious curve coordinates for 3-action speed dial
  if (totalCount === 3) {
    const points = [
      { x: 0, y: -135 },    // Action 1: straight up (90 deg)
      { x: 75, y: -85 },    // Action 2: diagonal curve (~45 deg)
      { x: 115, y: -18 },   // Action 3: horizontal curve (~10 deg)
    ];
    const pt = points[index] ?? points[0];
    const signedX = pt.x === 0 ? 0 : (isLeft ? pt.x : -pt.x);
    return {
      targetX: signedX,
      targetY: pt.y,
    };
  }

  // Dynamic elliptical arc distribution for N items
  const startAngle = Math.PI / 2; // 90 degrees (top)
  const endAngle = Math.PI * 0.95; // ~170 degrees (inward horizontal)
  const step = (endAngle - startAngle) / Math.max(totalCount - 1, 1);
  const angle = startAngle + index * step;

  const rawX = Math.cos(angle) * rx;
  const rawY = -Math.sin(angle) * ry;
  const normalizedX = Math.abs(rawX) < 0.001 ? 0 : rawX;

  return {
    targetX: isLeft ? -normalizedX : normalizedX,
    targetY: rawY,
  };
}
