import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Platform,
  useWindowDimensions,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  type SharedValue,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { Text } from './text';
import {
  calculateSnapTarget,
  calculateArcOffsets,
  clamp,
} from '../../src/utils/draggablePhysics';

export interface SpeedDialAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }> | React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface DraggableSpeedDialProps {
  actions: SpeedDialAction[];
  mainIcon?: React.ComponentType<{ size?: number; className?: string; color?: string }> | React.ReactNode;
  initialBottom?: number;
  initialRight?: number;
  fabSize?: number;
  accessibilityLabel?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export const DraggableSpeedDial: React.FC<DraggableSpeedDialProps> = ({
  actions,
  mainIcon = Plus,
  initialBottom = 24,
  initialRight = 20,
  fabSize = 58,
  accessibilityLabel = 'Quick action menu',
  onOpenChange,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [isOpen, setIsOpen] = useState(false);
  const [restingSide, setRestingSide] = useState<'left' | 'right'>('right');
  const reduceMotion = useReducedMotion();

  // Measure container height dynamically so boundaries adapt to any screen layout
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const minX = 16;
  const maxX = Math.max(screenWidth - fabSize - 16, minX);

  const minY = 16;
  const maxY = useMemo(() => {
    if (containerHeight > 0) {
      return Math.max(containerHeight - fabSize - 16, minY + 60);
    }
    return Math.max(screenHeight - insets.top - insets.bottom - 140 - fabSize, minY + 60);
  }, [containerHeight, screenHeight, insets.top, insets.bottom, fabSize]);

  // Initial resting coordinates
  const defaultInitialX = Math.max(screenWidth - fabSize - initialRight, minX);
  const defaultInitialY = useMemo(() => {
    const totalH = containerHeight > 0 ? containerHeight : (screenHeight - insets.top - insets.bottom - 140);
    return clamp(totalH - fabSize - initialBottom, minY, maxY);
  }, [containerHeight, screenHeight, insets.top, insets.bottom, fabSize, initialBottom, minY, maxY]);

  const translateX = useSharedValue(defaultInitialX);
  const translateY = useSharedValue(defaultInitialY);
  const startX = useSharedValue(defaultInitialX);
  const startY = useSharedValue(defaultInitialY);

  const scale = useSharedValue(1.0);
  const isDragging = useSharedValue(false);
  const dialProgress = useSharedValue(0);

  // Debounce ref to prevent accidental double-toggle when both Gesture & Pressable trigger
  const lastToggleTime = useRef<number>(0);

  const closeDial = useCallback(() => {
    setIsOpen(false);
    dialProgress.value = reduceMotion ? 0 : withTiming(0, { duration: 180 });
    if (onOpenChange) onOpenChange(false);
  }, [dialProgress, onOpenChange, reduceMotion]);

  useEffect(() => {
    if (!isOpen) return;

    const onBackPress = () => {
      closeDial();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [isOpen, closeDial]);

  const toggleDial = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTime.current < 250) {
      return;
    }
    lastToggleTime.current = now;

    setIsOpen((prev) => {
      const next = !prev;
      dialProgress.value = reduceMotion
        ? (next ? 1 : 0)
        : withSpring(next ? 1 : 0, {
            damping: 15,
            stiffness: 180,
          });
      if (onOpenChange) onOpenChange(next);
      return next;
    });
  }, [dialProgress, onOpenChange, reduceMotion]);

  const updateRestingSide = useCallback((side: 'left' | 'right') => {
    setRestingSide(side);
  }, []);

  // Pan Gesture: Only activates after moving at least 8px so clicks/taps are never intercepted
  const panGesture = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      'worklet';
      startX.value = translateX.value;
      startY.value = translateY.value;
      isDragging.value = true;
      scale.value = reduceMotion ? 1.12 : withSpring(1.12, { damping: 12, stiffness: 200 });

      // Auto-close dial if user starts dragging
      dialProgress.value = reduceMotion ? 0 : withTiming(0, { duration: 120 });
    })
    .onUpdate((event) => {
      'worklet';
      const targetX = startX.value + event.translationX;
      const targetY = startY.value + event.translationY;

      translateX.value = clamp(targetX, minX, maxX);
      translateY.value = clamp(targetY, minY, maxY);
    })
    .onEnd((event) => {
      'worklet';
      isDragging.value = false;
      scale.value = reduceMotion ? 1 : withSpring(1.0, { damping: 15, stiffness: 220 });

      const snapX = calculateSnapTarget(
        translateX.value,
        screenWidth,
        fabSize,
        16,
        event.velocityX
      );
      const finalX = clamp(snapX, minX, maxX);

      const boundedVelocityX = clamp(event.velocityX, -800, 800);
      const boundedVelocityY = clamp(event.velocityY, -800, 800);

      translateX.value = reduceMotion
        ? finalX
        : withSpring(finalX, {
            velocity: boundedVelocityX,
            damping: 20,
            stiffness: 220,
            overshootClamping: true,
          });

      const finalY = clamp(translateY.value, minY, maxY);
      translateY.value = reduceMotion
        ? finalY
        : withSpring(finalY, {
            velocity: boundedVelocityY,
            damping: 20,
            stiffness: 220,
            overshootClamping: true,
          });

      const side: 'left' | 'right' = finalX < screenWidth / 2 ? 'left' : 'right';
      runOnJS(updateRestingSide)(side);
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      scale.value = reduceMotion ? 1 : withSpring(1.0, { damping: 15, stiffness: 220 });
    });

  // Tap Gesture: Quickly toggles open/close on touch release within 300ms
  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .maxDistance(8)
    .onEnd(() => {
      'worklet';
      runOnJS(toggleDial)();
    });

  // Compose gestures: tap wins on stationary click, pan wins when dragged > 8px
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Animated styles for the FAB
  const fabAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Animated style for FAB icon rotation on open/close
  const iconRotateStyle = useAnimatedStyle(() => {
    const rotation = interpolate(dialProgress.value, [0, 1], [0, 45]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const renderMainIcon = () => {
    if (React.isValidElement(mainIcon)) {
      return mainIcon;
    }
    if (typeof mainIcon === 'function') {
      const MainIconComp = mainIcon as React.ComponentType<{ size?: number; color?: string }>;
      return <MainIconComp size={26} color="#FFFFFF" />;
    }
    return <Plus size={26} color="#FFFFFF" />;
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 9990, overflow: 'visible' },
      ]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - containerHeight) > 2) {
          setContainerHeight(h);
        }
      }}
    >
      {/* Semi-transparent Dimmed Backdrop when Speed Dial is open */}
      {isOpen && (
        <Pressable
          onPress={closeDial}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              zIndex: 9990,
            },
          ]}
        />
      )}

      {/* Speed Dial Sub-Actions Container attached to current FAB Position */}
      <Animated.View
        pointerEvents={isOpen ? 'box-none' : 'none'}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: fabSize,
            height: fabSize,
            zIndex: 9995,
            overflow: 'visible',
          },
          fabAnimatedStyle,
        ]}
      >
        {actions.map((action, index) => {
          const isLeft = restingSide === 'left';
          const { targetX, targetY } = calculateArcOffsets(
            index,
            actions.length,
            isLeft
          );

          return (
            <SpeedDialActionItem
              key={action.id}
              action={action}
              targetX={targetX}
              targetY={targetY}
              progress={dialProgress}
              isLeft={isLeft}
              fabSize={fabSize}
              onPress={() => {
                closeDial();
                action.onPress();
              }}
            />
          );
        })}
      </Animated.View>

      {/* Main Draggable FAB Button */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: fabSize,
              height: fabSize,
              zIndex: 9999,
              overflow: 'visible',
            },
            fabAnimatedStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ expanded: isOpen }}
            onPress={toggleDial}
            className="w-full h-full rounded-full bg-primary items-center justify-center shadow-xl border border-primary/40 active:opacity-90"
            style={{
              elevation: 8,
              shadowColor: '#EA580C',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              cursor: Platform.OS === 'web' ? 'pointer' : undefined,
            }}
          >
            <Animated.View style={iconRotateStyle}>
              {renderMainIcon()}
            </Animated.View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

interface SpeedDialActionItemProps {
  action: SpeedDialAction;
  targetX: number;
  targetY: number;
  progress: SharedValue<number>;
  isLeft: boolean;
  fabSize: number;
  onPress: () => void;
}

const SpeedDialActionItem: React.FC<SpeedDialActionItemProps> = ({
  action,
  targetX,
  targetY,
  progress,
  isLeft,
  fabSize,
  onPress,
}) => {
  const itemStyle = useAnimatedStyle(() => {
    const transX = interpolate(progress.value, [0, 1], [0, targetX]);
    const transY = interpolate(progress.value, [0, 1], [0, targetY]);
    const opacity = interpolate(progress.value, [0, 0.35, 1], [0, 0.5, 1]);
    const scale = interpolate(progress.value, [0, 0.7, 1], [0.3, 1.1, 1]);

    return {
      transform: [{ translateX: transX }, { translateY: transY }, { scale }],
      opacity,
    };
  });

  const renderActionIcon = () => {
    if (React.isValidElement(action.icon)) {
      return action.icon;
    }
    if (typeof action.icon === 'function') {
      const IconComponent = action.icon as React.ComponentType<{
        size?: number;
        className?: string;
        color?: string;
      }>;
      return <IconComponent size={20} className="text-primary" color="hsl(var(--primary))" />;
    }
    return null;
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 4,
          left: 4,
          width: 50,
          height: 50,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9996,
          overflow: 'visible',
        },
        itemStyle,
      ]}
    >
      {/* Position-Aware Pill Label: Inward facing so it never clips off screen */}
      <View
        style={{
          position: 'absolute',
          [isLeft ? 'left' : 'right']: 56,
          alignItems: isLeft ? 'flex-start' : 'flex-end',
          justifyContent: 'center',
          minWidth: 100,
        }}
      >
        <View className="bg-card px-3 py-1.5 rounded-xl border border-border/70 shadow-sm" style={{ elevation: 3 }}>
          <Text
            numberOfLines={1}
            className="text-foreground text-caption font-bold tracking-tight"
            style={Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : undefined}
          >
            {action.label}
          </Text>
        </View>
      </View>

      {/* Sub-Action Button */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        className="w-[48px] h-[48px] rounded-full bg-secondary border border-border/80 items-center justify-center shadow-md active:bg-secondary/80"
        style={{
          elevation: 4,
          cursor: Platform.OS === 'web' ? 'pointer' : undefined,
        }}
      >
        {renderActionIcon()}
      </Pressable>
    </Animated.View>
  );
};

export default DraggableSpeedDial;
