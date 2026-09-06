import React, { useRef } from 'react';
import { View, PanResponder, TouchableOpacity } from 'react-native';
import { cn } from '@/lib/utils';

export interface SheetGrabHandleProps {
  onClose: () => void;
  className?: string;
  pillClassName?: string;
}

/**
 * Standardized Grab Handle for Bottom Sheets & Modals.
 * - Tap / click dismisses the sheet immediately.
 * - Dragging / swiping down dismisses the sheet.
 */
export const SheetGrabHandle: React.FC<SheetGrabHandleProps> = ({
  onClose,
  className,
  pillClassName,
}) => {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger if moving downward
        return gestureState.dy > 4;
      },
      onPanResponderRelease: (_, gestureState) => {
        // If pulled down more than 16px or with downward velocity, close
        if (gestureState.dy > 16 || gestureState.vy > 0.25) {
          onClose();
        } else if (Math.abs(gestureState.dy) < 6 && Math.abs(gestureState.dx) < 6) {
          // User clicked / tapped
          onClose();
        }
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      className={cn('w-full items-center pt-3 pb-1.5 bg-card', className)}
    >
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 36, right: 36 }}
        className="items-center justify-center py-1 px-4 cursor-pointer"
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
        accessibilityHint="Tap or swipe down to close"
      >
        <View className={cn('w-10 h-1.5 rounded-full bg-muted-foreground/35', pillClassName)} />
      </TouchableOpacity>
    </View>
  );
};

export default SheetGrabHandle;
