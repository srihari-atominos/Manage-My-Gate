import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import {
  Home,
  Users,
  LayoutGrid,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { useBottomNavScroll } from './BottomNavScrollContext';

export type MainTabKey = 'dashboard' | 'community' | 'all-features' | 'security' | 'profile';

interface TabItem {
  key: MainTabKey;
  label: string;
  route: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: any }>;
}

const TAB_ITEMS: TabItem[] = [
  {
    key: 'dashboard',
    label: 'Home',
    route: '/(resident)/dashboard',
    icon: Home,
  },
  {
    key: 'community',
    label: 'Community',
    route: '/(resident)/notices/active-board',
    icon: Users,
  },
  {
    key: 'all-features',
    label: 'View All',
    route: '/(resident)/all-features',
    icon: LayoutGrid,
  },
  {
    key: 'security',
    label: 'Security',
    route: '/(resident)/visitor',
    icon: ShieldCheck,
  },
  {
    key: 'profile',
    label: 'Profile',
    route: '/(resident)/profile',
    icon: User,
  },
];

const ACTIVE_ORANGE = '#FF6A00';

export interface BottomNavigationBarProps {
  scrollY?: any;
  isMinimized?: boolean;
}

interface InsetTabButtonProps {
  item: TabItem;
  isActive: boolean;
  onPress: () => void;
  isIOS: boolean;
  isDark: boolean;
  isCompact: boolean;
}

const InsetTabButton: React.FC<InsetTabButtonProps> = ({
  item,
  isActive,
  onPress,
  isDark,
  isIOS,
  isCompact,
}) => {
  const IconComponent = item.icon;
  const pressScale = useSharedValue(1.0);
  const compactScale = useSharedValue(isCompact ? 0.9 : 1.0);
  const labelOpacity = useSharedValue(isCompact ? 0 : 1.0);
  const labelHeight = useSharedValue(isCompact ? 0 : 13);

  useEffect(() => {
    compactScale.value = withTiming(isCompact ? 0.9 : 1.0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    labelOpacity.value = withTiming(isCompact ? 0 : 1.0, {
      duration: 160,
    });
    labelHeight.value = withTiming(isCompact ? 0 : 13, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [isCompact, compactScale, labelOpacity, labelHeight]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * compactScale.value }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    height: labelHeight.value,
    marginTop: labelOpacity.value > 0.1 ? 2 : 0,
    overflow: 'hidden',
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(1.16, { damping: 11, stiffness: 280 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1.0, { damping: 13, stiffness: 220 });
  };

  const activeColor = ACTIVE_ORANGE;
  const inactiveColor = isDark ? '#D4D4D8' : (isIOS ? '#0F172A' : '#374151');
  const itemColor = isActive ? activeColor : inactiveColor;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="flex-1 items-center justify-center h-full select-none z-10"
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      <Animated.View style={animatedIconStyle} className="items-center justify-center py-0.5">
        <IconComponent
          size={isCompact ? 19 : 22}
          color={itemColor}
          strokeWidth={isActive ? 2.4 : (isIOS ? 2.0 : 1.8)}
          style={{ opacity: isActive ? 1.0 : (isIOS ? 0.90 : 0.80) }}
        />
        <Animated.View style={animatedLabelStyle} className="items-center justify-center">
          <Text
            style={{
              color: itemColor,
              opacity: isActive ? 1.0 : (isIOS ? 0.90 : 0.80),
            }}
            className={cn(
              'text-[10px] font-sans tracking-tight text-center',
              isActive ? 'font-bold' : (isIOS ? 'font-bold' : 'font-semibold')
            )}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  scrollY,
}) => {
  const router = useRouter();
  const pathname = usePathname() || '';
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const { isCompact } = useBottomNavScroll();

  const [containerWidth, setContainerWidth] = useState(0);

  const containerHeight = useSharedValue(isCompact ? 46 : 64);

  useEffect(() => {
    containerHeight.value = withTiming(isCompact ? 46 : 64, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [isCompact, containerHeight]);

  const activeTab: MainTabKey = useMemo(() => {
    if (pathname.includes('/visitor')) return 'security';
    if (pathname.includes('/notices') || pathname.includes('/directory') || pathname.includes('/polls') || pathname.includes('/notes')) return 'community';
    if (pathname.includes('/profile') || pathname.includes('/settings')) return 'profile';
    if (pathname.includes('/all-features') || pathname.includes('/amenities') || pathname.includes('/billing') || pathname.includes('/complaints') || pathname.includes('/admin')) return 'all-features';
    return 'dashboard';
  }, [pathname]);

  const [selectedTabKey, setSelectedTabKey] = useState<MainTabKey>(activeTab);

  useEffect(() => {
    setSelectedTabKey(activeTab);
  }, [activeTab]);

  const isNavigatingRef = useRef(false);

  const barAnimatedStyle = useAnimatedStyle(() => {
    const baseStyle: any = {
      height: containerHeight.value,
    };

    if (scrollY) {
      const scale = interpolate(
        scrollY.value,
        [0, 60, 150],
        [1.0, 0.95, 0.90],
        Extrapolation.CLAMP
      );
      const translateY = interpolate(
        scrollY.value,
        [0, 80],
        [0, 6],
        Extrapolation.CLAMP
      );
      baseStyle.transform = [{ scale }, { translateY }];
    }
    return baseStyle;
  });

  const horizontalPadding = 6;
  const availableWidth = containerWidth > 0 ? containerWidth - (horizontalPadding * 2) : 0;
  const tabWidth = availableWidth > 0 ? availableWidth / TAB_ITEMS.length : 0;

  const activeIndex = useMemo(() => {
    const idx = TAB_ITEMS.findIndex((item) => item.key === selectedTabKey);
    return idx >= 0 ? idx : 0;
  }, [selectedTabKey]);

  const slideX = useSharedValue(0);
  const pillScaleX = useSharedValue(1.0);
  const tabWidthShared = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const isDraggingShared = useSharedValue(false);

  const FAST_SPRING = useMemo(
    () => ({
      damping: 26,
      stiffness: 420,
      mass: 0.45,
    }),
    []
  );

  useEffect(() => {
    if (!isDraggingShared.value && tabWidth > 0) {
      slideX.value = withSpring(activeIndex * tabWidth, FAST_SPRING);
      pillScaleX.value = withSequence(
        withTiming(1.08, { duration: 60 }),
        withSpring(1.0, { damping: 16, stiffness: 350 })
      );
    }
  }, [activeIndex, tabWidth, slideX, pillScaleX, isDraggingShared, FAST_SPRING]);

  const slidingPillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: slideX.value },
      { scaleX: pillScaleX.value },
    ],
    width: tabWidth,
  }));

  const navigateToTab = useCallback((item: TabItem) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setTimeout(() => {
      try {
        router.navigate(item.route as any);
      } catch {
        router.replace(item.route as any);
      } finally {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 120);
      }
    }, 16);
  }, [router]);

  const handleTabPress = useCallback((item: TabItem) => {
    if (isDraggingShared.value) return;
    if (item.key === selectedTabKey) return;

    // Trigger instant slide without waiting for useEffect
    const targetIdx = TAB_ITEMS.findIndex((t) => t.key === item.key);
    if (targetIdx >= 0 && tabWidth > 0) {
      slideX.value = withSpring(targetIdx * tabWidth, FAST_SPRING);
      pillScaleX.value = withSequence(
        withTiming(1.08, { duration: 60 }),
        withSpring(1.0, { damping: 16, stiffness: 350 })
      );
    }

    setSelectedTabKey(item.key);
    navigateToTab(item);
  }, [isDraggingShared, selectedTabKey, tabWidth, slideX, pillScaleX, FAST_SPRING, navigateToTab]);

  const onDragEnd = useCallback((targetIndex: number) => {
    const item = TAB_ITEMS[targetIndex];
    if (item) {
      setSelectedTabKey(item.key);
      navigateToTab(item);
    }
  }, [navigateToTab]);

  const onHoverTab = useCallback((hoveredIndex: number) => {
    const item = TAB_ITEMS[hoveredIndex];
    if (item) {
      setSelectedTabKey(item.key);
    }
  }, []);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-5, 5])
      .failOffsetY([-12, 12])
      .onStart(() => {
        'worklet';
        isDraggingShared.value = true;
        dragStartX.value = slideX.value;
        pillScaleX.value = withTiming(1.12, { duration: 40 });
      })
      .onUpdate((event) => {
        'worklet';
        if (tabWidthShared.value <= 0) return;
        const maxX = (TAB_ITEMS.length - 1) * tabWidthShared.value;
        const nextX = Math.min(Math.max(dragStartX.value + event.translationX, 0), maxX);
        slideX.value = nextX;

        const currentHovered = Math.min(
          Math.max(Math.round(nextX / tabWidthShared.value), 0),
          TAB_ITEMS.length - 1
        );
        runOnJS(onHoverTab)(currentHovered);
      })
      .onEnd(() => {
        'worklet';
        isDraggingShared.value = false;
        pillScaleX.value = withSpring(1.0, { damping: 16, stiffness: 350 });
        if (tabWidthShared.value <= 0) return;
        const targetIndex = Math.min(
          Math.max(Math.round(slideX.value / tabWidthShared.value), 0),
          TAB_ITEMS.length - 1
        );
        slideX.value = withSpring(targetIndex * tabWidthShared.value, {
          damping: 26,
          stiffness: 420,
          mass: 0.45,
        });
        runOnJS(onDragEnd)(targetIndex);
      });
  }, [slideX, pillScaleX, tabWidthShared, dragStartX, isDraggingShared, onDragEnd, onHoverTab]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
      const computedTabWidth = (w - (horizontalPadding * 2)) / TAB_ITEMS.length;
      tabWidthShared.value = computedTabWidth;
    }
  };

  const bottomInset = Math.max(insets.bottom + 8, isIOS ? 20 : 16);

  return (
    <View
      pointerEvents="box-none"
      style={{
        bottom: bottomInset,
      }}
      className="absolute left-0 right-0 items-center justify-center px-4 z-50 pointer-events-box-none"
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          onLayout={handleLayout}
          style={[
            barAnimatedStyle,
            {
              backgroundColor: isDark
                ? isIOS
                  ? 'rgba(15, 17, 23, 0.35)'
                  : 'rgba(24, 26, 32, 0.78)'
                : isIOS
                ? 'rgba(255, 255, 255, 0.28)'
                : 'rgba(255, 255, 255, 0.74)',
              borderColor: isDark
                ? isIOS
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(255, 255, 255, 0.22)'
                : isIOS
                ? 'rgba(255, 255, 255, 0.75)'
                : 'rgba(255, 255, 255, 0.75)',
              borderTopColor: isDark
                ? isIOS
                  ? 'rgba(255, 255, 255, 0.50)'
                  : 'rgba(255, 255, 255, 0.45)'
                : isIOS
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              borderBottomColor: isDark
                ? isIOS
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.12)'
                : isIOS
                ? 'rgba(255, 255, 255, 0.35)'
                : 'rgba(0, 0, 0, 0.06)',
              borderWidth: 1.2,
              borderRadius: 30,
              elevation: isIOS ? 0 : 8,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? (isIOS ? 0.35 : 0.45) : (isIOS ? 0.08 : 0.12),
              shadowRadius: isIOS ? 25 : 20,
            },
          ]}
          className="w-full max-w-[410px] h-[64px] px-1.5 flex-row items-center justify-between relative overflow-hidden"
        >
          {/* Glossy Upper Half Reflection Sheen */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '44%',
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : (isIOS ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.24)'),
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
            }}
            pointerEvents="none"
          />

          {/* Glossy Specular Top Highlight Line */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 16,
              right: 16,
              height: 1.5,
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.40)'
                : 'rgba(255, 255, 255, 0.95)',
              borderRadius: 1,
            }}
            pointerEvents="none"
          />

          {tabWidth > 0 && (
            <Animated.View
              style={[
                slidingPillStyle,
                {
                  position: 'absolute',
                  left: horizontalPadding,
                  top: isCompact ? 3 : 6,
                  bottom: isCompact ? 3 : 6,
                  borderRadius: 22,
                  backgroundColor: isDark
                    ? 'rgba(255, 106, 0, 0.22)'
                    : (isIOS ? 'rgba(255, 106, 0, 0.18)' : 'rgba(255, 106, 0, 0.14)'),
                  borderWidth: 1,
                  borderColor: isDark
                    ? 'rgba(255, 106, 0, 0.45)'
                    : (isIOS ? 'rgba(255, 106, 0, 0.38)' : 'rgba(255, 106, 0, 0.30)'),
                  borderTopColor: isDark
                    ? 'rgba(255, 138, 61, 0.65)'
                    : (isIOS ? 'rgba(255, 138, 61, 0.70)' : 'rgba(255, 138, 61, 0.55)'),
                  shadowColor: ACTIVE_ORANGE,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.35 : 0.18,
                  shadowRadius: 6,
                },
              ]}
              pointerEvents="none"
            />
          )}

          {TAB_ITEMS.map((item) => (
            <InsetTabButton
              key={item.key}
              item={item}
              isActive={selectedTabKey === item.key}
              onPress={() => handleTabPress(item)}
              isIOS={isIOS}
              isDark={isDark}
              isCompact={isCompact}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default BottomNavigationBar;
