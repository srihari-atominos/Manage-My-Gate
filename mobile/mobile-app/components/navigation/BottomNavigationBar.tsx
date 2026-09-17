import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  Pressable,
  LayoutChangeEvent,
  Keyboard,
  Dimensions,
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
  type SharedValue,
} from 'react-native-reanimated';
import { cn } from '../../lib/utils';
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

// Nahom Brand Orange Accent Color
const NAHOM_ORANGE = '#FF6A00';

export interface BottomNavigationBarProps {
  scrollY?: SharedValue<number> | any;
  isMinimized?: boolean;
}

interface AndroidTabButtonProps {
  item: TabItem;
  isActive: boolean;
  onPress?: () => void;
  isDark: boolean;
}

const AndroidTabButton: React.FC<AndroidTabButtonProps> = ({
  item,
  isActive,
  onPress,
  isDark,
}) => {
  const IconComponent = item.icon;
  const iconColor = isActive ? NAHOM_ORANGE : (isDark ? '#94A3B8' : '#64748B');
  const labelColor = isActive ? NAHOM_ORANGE : (isDark ? '#94A3B8' : '#64748B');
  const activePillBg = isDark ? 'rgba(255, 106, 0, 0.22)' : 'rgba(255, 106, 0, 0.12)';

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{
        color: isDark ? 'rgba(255, 106, 0, 0.2)' : 'rgba(0, 0, 0, 0.08)',
        borderless: true,
        radius: 26,
      }}
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      {/* Material 3 Active Indicator Pill */}
      <View
        style={{
          height: 26,
          width: 48,
          borderRadius: 13,
          backgroundColor: isActive ? activePillBg : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 2,
        }}
      >
        <IconComponent
          size={19}
          color={iconColor}
          strokeWidth={isActive ? 2.2 : 1.8}
        />
      </View>

      {/* Tab Label */}
      <Text
        style={{
          color: labelColor,
          fontSize: 10,
          lineHeight: 12,
          fontWeight: isActive ? '700' : '500',
          textAlign: 'center',
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.label}
      </Text>
    </Pressable>
  );
};

interface InsetTabButtonProps {
  item: TabItem;
  isActive: boolean;
  onPress?: () => void;
  isDark: boolean;
  isCompact: boolean;
}

const InsetTabButton: React.FC<InsetTabButtonProps> = ({
  item,
  isActive,
  onPress,
  isDark,
  isCompact,
}) => {
  const IconComponent = item.icon;
  const pressScale = useSharedValue(1.0);
  const pressBlur = useSharedValue(0);
  const compactScale = useSharedValue(isCompact ? 0.92 : 1.0);
  const labelOpacity = useSharedValue(isCompact ? 0 : 1.0);
  const labelHeight = useSharedValue(isCompact ? 0 : 13);

  useEffect(() => {
    compactScale.value = withTiming(isCompact ? 0.92 : 1.0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
    labelOpacity.value = withTiming(isCompact ? 0 : 1.0, {
      duration: 130,
      easing: Easing.out(Easing.cubic),
    });
    labelHeight.value = withTiming(isCompact ? 0 : 13, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [isCompact, compactScale, labelOpacity, labelHeight]);

  // Zooming & motion-blur opacity effect on touch
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * compactScale.value }],
    opacity: interpolate(pressBlur.value, [0, 1], [isActive ? 1.0 : 0.72, 0.88]),
  }));

  // Animated blur/glow halo behind icon on touch
  const animatedHaloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressBlur.value, [0, 1], [0, isDark ? 0.70 : 0.45]),
    transform: [{ scale: interpolate(pressBlur.value, [0, 1], [0.6, 1.4]) }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    height: labelHeight.value,
    marginTop: labelOpacity.value > 0.1 ? 2 : 0,
    overflow: 'hidden',
  }));

  // Active state drives zoom and blur glow (for both tap and slide)
  useEffect(() => {
    if (isActive) {
      pressScale.value = withSpring(1.22, { damping: 13, stiffness: 320 });
      pressBlur.value = withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) });
    } else {
      pressScale.value = withSpring(1.0, { damping: 15, stiffness: 280 });
      pressBlur.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
    }
  }, [isActive, pressScale, pressBlur]);

  // Icons & labels: Active uses Nahom Orange; inactive uses clear readable neutral
  const iconColor = isActive ? NAHOM_ORANGE : (isDark ? '#94A3B8' : '#64748B');
  const labelColor = isActive ? NAHOM_ORANGE : (isDark ? '#94A3B8' : '#64748B');

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPress}
      className="flex-1 items-center justify-center h-full select-none z-10"
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      <View className="items-center justify-center py-0.5 relative">
        {/* Animated Zoom & Blur Glow Aura */}
        <Animated.View
          style={[
            animatedHaloStyle,
            {
              position: 'absolute',
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? 'rgba(255, 106, 0, 0.38)' : 'rgba(255, 106, 0, 0.28)',
              shadowColor: NAHOM_ORANGE,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: 12,
              elevation: 4,
            },
          ]}
          pointerEvents="none"
        />

        {/* Icon: Visibly bigger than label text (25px vs 9.5px) */}
        <Animated.View style={animatedIconStyle} className="items-center justify-center">
          <IconComponent
            size={isCompact ? 21 : 25}
            color={iconColor}
            strokeWidth={isActive ? 2.4 : 1.9}
          />
        </Animated.View>

        {/* Icon Name: Compact font size underneath */}
        <Animated.View style={animatedLabelStyle} className="items-center justify-center">
          <Text
            style={{
              color: labelColor,
            }}
            className={cn(
              'text-[9.5px] tracking-tight text-center leading-[11px]',
              isActive ? 'font-bold' : 'font-medium'
            )}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </Animated.View>
      </View>
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

  const containerHeight = useSharedValue(isCompact ? 48 : 64);

  useEffect(() => {
    containerHeight.value = withTiming(isCompact ? 48 : 64, {
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

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const navTranslateY = useSharedValue(0);

  useEffect(() => {
    const shouldHide = isCompact || isKeyboardVisible;
    navTranslateY.value = withTiming(shouldHide ? (isIOS ? 140 : 120) : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [isCompact, isKeyboardVisible, isIOS, navTranslateY]);

  const barAnimatedStyle = useAnimatedStyle(() => {
    const baseStyle: any = {
      height: isIOS ? containerHeight.value : undefined,
    };

    const transforms: any[] = [{ translateY: navTranslateY.value }];

    if (isIOS && scrollY) {
      const scale = interpolate(
        scrollY.value,
        [0, 60, 150],
        [1.0, 0.96, 0.92],
        Extrapolation.CLAMP
      );
      const scrollYTranslate = interpolate(
        scrollY.value,
        [0, 80],
        [0, 4],
        Extrapolation.CLAMP
      );
      transforms.push({ scale }, { translateY: scrollYTranslate });
    }

    baseStyle.transform = transforms;
    return baseStyle;
  });

  const [containerWidth, setContainerWidth] = useState(0);

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
    try {
      router.replace(item.route as any);
    } catch {
      router.navigate(item.route as any);
    }
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

  // Safe area bottom inset support for all iPhone sizes and Android
  const bottomInset = Math.max(insets.bottom, isIOS ? 14 : 10) + 6;

  // Theme-aware styles:
  // Dark mode: velvety black-charcoal (#101114)
  // Light mode: solid / frosted crisp white (#FFFFFF) with high visibility and contrast
  const containerBg = isDark ? 'rgba(16, 17, 20, 0.98)' : '#FFFFFF';
  const containerBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const containerBorderTop = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.90)';
  const containerBorderBottom = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.08)';

  // Active capsule (switching option):
  // Dark mode: contrasting dark charcoal capsule (#303238)
  // Light mode: soft brand orange tint capsule
  const activeCapsuleBg = isDark ? 'rgba(48, 50, 56, 0.92)' : 'rgba(255, 106, 0, 0.12)';
  const activeCapsuleBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 106, 0, 0.22)';

  // Native Android Navigation Bar (Material 3 dock)
  // Space below for Android phone default nav buttons (3-button navigation: Back, Home, Recent Apps or gesture bar)
  // Fits all Android devices (Vivo, Oppo, Samsung, Xiaomi, Motorola, etc.)
  if (!isIOS) {
    const androidNavButtonSpace = Math.max(insets.bottom, 8) + (insets.bottom > 0 ? 2 : 1);
    const androidBarBg = isDark ? '#121316' : '#FFFFFF';
    const androidBorderTop = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';

    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            backgroundColor: androidBarBg,
            borderTopWidth: 1,
            borderTopColor: androidBorderTop,
            paddingBottom: androidNavButtonSpace,
            elevation: 12,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: isDark ? 0.35 : 0.06,
            shadowRadius: 6,
            zIndex: 50,
            pointerEvents: isKeyboardVisible ? 'none' : 'auto',
          },
          barAnimatedStyle,
        ]}
      >
        <View
          style={{
            height: 52,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingHorizontal: 4,
          }}
        >
          {TAB_ITEMS.map((item) => (
            <AndroidTabButton
              key={item.key}
              item={item}
              isActive={selectedTabKey === item.key}
              onPress={() => handleTabPress(item)}
              isDark={isDark}
            />
          ))}
        </View>
      </Animated.View>
    );
  }

  // iOS UI: Preserved untouched floating pill design
  return (
    <View
      style={{
        bottom: bottomInset,
        width: '100%',
        pointerEvents: isKeyboardVisible ? 'none' : 'box-none',
      }}
      className="absolute left-0 right-0 items-center justify-center px-4 z-50"
    >
      <View style={{ width: '100%', maxWidth: 410, alignItems: 'center' }}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            onLayout={handleLayout}
            style={[
              barAnimatedStyle,
              {
                width: '100%',
                maxWidth: 410,
                backgroundColor: containerBg,
                borderColor: containerBorder,
                borderTopColor: containerBorderTop,
                borderBottomColor: containerBorderBottom,
                borderWidth: 1.2,
                borderRadius: 36,
                elevation: isDark ? 12 : 8,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDark ? 0.50 : 0.12,
                shadowRadius: isDark ? 22 : 16,
              },
            ]}
            className="h-[64px] px-1.5 flex-row items-center justify-between relative overflow-hidden"
          >
            {/* Subtle Specular Top Highlight Line (Dark mode only) */}
            {isDark && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 20,
                  right: 20,
                  height: 1.2,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 1,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Active Tab: Switching Capsule */}
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  slidingPillStyle,
                  {
                    position: 'absolute',
                    left: horizontalPadding,
                    top: isCompact ? 3 : 5,
                    bottom: isCompact ? 3 : 5,
                    borderRadius: 24,
                    backgroundColor: activeCapsuleBg,
                    borderWidth: isDark ? 1 : 1,
                    borderColor: activeCapsuleBorder,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.25 : 0.04,
                    shadowRadius: 4,
                    elevation: isDark ? 2 : 1,
                    pointerEvents: 'none',
                  },
                ]}
              />
            )}

            {/* Tab Navigation Items */}
            {TAB_ITEMS.map((item) => (
              <InsetTabButton
                key={item.key}
                item={item}
                isActive={selectedTabKey === item.key}
                onPress={() => handleTabPress(item)}
                isDark={isDark}
                isCompact={isCompact}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

export default BottomNavigationBar;
