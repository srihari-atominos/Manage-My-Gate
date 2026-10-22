import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Platform,
  Pressable,
  LayoutChangeEvent,
  Keyboard,
  AppState,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import {
  Home,
  LayoutGrid,
  Users,
  Settings,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { cn } from '../../lib/utils';
import { useBottomNavScroll, useBottomNavCompact } from './BottomNavScrollContext';

export type MainTabKey = 'dashboard' | 'view_all' | 'directory' | 'settings';

const normalizeRoute = (path: string): string => {
  if (!path) return '';
  return path
    .replace(/\/\([^)]+\)/g, '')
    .replace(/\/index$/, '')
    .replace(/\/$/, '') || '/';
};

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
    key: 'view_all',
    label: 'View All',
    route: '/(resident)/all-features',
    icon: LayoutGrid,
  },
  {
    key: 'directory',
    label: 'Directory',
    route: '/(resident)/directory',
    icon: Users,
  },
  {
    key: 'settings',
    label: 'Settings',
    route: '/(resident)/settings',
    icon: Settings,
  },
];

// Brand Theme Accent Active Color (vibrant orange matching reference)
const THEME_ACTIVE_LIGHT = '#FF6A00';
const THEME_ACTIVE_DARK = '#FF7A1A';

export interface BottomNavigationBarProps {
  scrollY?: SharedValue<number> | any;
  isMinimized?: boolean;
}

interface InsetTabButtonProps {
  item: TabItem;
  isActive: boolean;
  onPress?: () => void;
  onPressIn?: () => void;
  isDark: boolean;
}

import { useTranslation } from '../../src/utils/i18n';

const InsetTabButton = React.memo(function InsetTabButton({
  item,
  isActive,
  onPress,
  onPressIn,
  isDark,
}: InsetTabButtonProps) {
  const { t, language } = useTranslation();
  const IconComponent = item.icon;
  const isArabic = language === 'ar';
  const isNarrowScreen = Dimensions.get('window').width <= 350;
  const tabFontSize = isNarrowScreen ? 10.5 : isArabic ? 12 : 11;
  const tabLineHeight = isNarrowScreen ? 14 : isArabic ? 16 : 14;

  const activeScale = useSharedValue(isActive ? 1 : 0.85);
  const activeOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    activeScale.value = withTiming(isActive ? 1 : 0.85, { duration: 180 });
    activeOpacity.value = withTiming(isActive ? 1 : 0, { duration: 160 });
  }, [isActive, activeScale, activeOpacity]);

  const animatedSquircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: activeScale.value }],
    opacity: activeOpacity.value,
  }));

  // Brand active orange from Ventorex/Nahom design system
  const activeColor = isDark ? THEME_ACTIVE_DARK : THEME_ACTIVE_LIGHT;
  // Inactive clean grey with high contrast against frosted glass
  const inactiveColor = isDark ? '#94A3B8' : '#64748B';
  const labelColor = isActive ? activeColor : inactiveColor;
  const translatedLabel = item.key === 'settings'
    ? t('settings', 'Settings')
    : item.key === 'directory'
    ? t('directory', 'Directory')
    : t(item.key === 'dashboard' ? 'home' : item.key, item.label);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      android_ripple={{
        color: isDark ? 'rgba(255, 122, 26, 0.16)' : 'rgba(255, 122, 26, 0.12)',
        borderless: true,
        radius: 36,
      }}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        paddingVertical: 3,
        zIndex: 10,
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={translatedLabel}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Icon Container with glowing orange squircle when active */}
        <View
          style={{
            width: 56,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Animated Glowing Orange Gradient Squircle */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 17,
                overflow: 'hidden',
                shadowColor: '#FF6A00',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.55 : 0.40,
                shadowRadius: 10,
                elevation: 6,
              },
              animatedSquircleStyle,
            ]}
          >
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id={`navActiveGrad_${item.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFA133" />
                  <Stop offset="50%" stopColor="#FF7A1A" />
                  <Stop offset="100%" stopColor="#FF4D00" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={17} fill={`url(#navActiveGrad_${item.key})`} />
            </Svg>
          </Animated.View>

          {/* Icon: White when active, grey outline when inactive */}
          <View style={{ zIndex: 10, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <IconComponent
              size={20}
              color={isActive ? '#FFFFFF' : inactiveColor}
              strokeWidth={isActive ? 2.4 : 1.9}
            />
          </View>
        </View>

        {/* Tab Label */}
        <Text
          style={{
            color: labelColor,
            fontSize: tabFontSize,
            lineHeight: tabLineHeight,
            marginTop: 3,
            fontWeight: isActive ? '700' : '500',
            textAlign: 'center',
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {translatedLabel}
        </Text>

        {/* Active Orange Underline Indicator */}
        <View
          style={{
            width: 14,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: isActive ? activeColor : 'transparent',
            marginTop: 2,
          }}
        />
      </View>
    </Pressable>
  );
});

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  scrollY,
}) => {
  const router = useRouter();
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const pathname = usePathname() || '';
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isCompact = useBottomNavCompact();
  const { setIsCompact } = useBottomNavScroll();

  // Breadth (width) dimensions — comfortable pill accommodating 4 tabs cleanly
  const FULL_BREADTH = Math.min(SCREEN_WIDTH - 28, 362);
  const containerBreadth = useSharedValue(FULL_BREADTH);

  const activeTab: MainTabKey = useMemo(() => {
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/all-features')) return 'view_all';
    if (pathname.includes('/directory')) return 'directory';
    return 'dashboard';
  }, [pathname]);

  const [selectedTabKey, setSelectedTabKey] = useState<MainTabKey>(activeTab);

  useEffect(() => {
    setSelectedTabKey(activeTab);
  }, [activeTab]);

  // The compact (hidden) flag is global and only changes when a ScrollView reports a scroll. A screen that is
  // too short to scroll (like the dashboard) never reports one, so a bar hidden on the previous screen used to
  // stay hidden for good. Every screen that shows the bar must therefore start with it visible.
  useEffect(() => {
    setIsCompact(false);
  }, [pathname, setIsCompact]);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    // Some Android devices never deliver "keyboard hidden" (dismissed by the back gesture, from a modal, or
    // when the app returns from the background), which left the bar hidden and untouchable. Re-sync from the
    // real keyboard state whenever the app comes back or the screen changes.
    const syncKeyboardState = () => {
      const visible = typeof Keyboard.isVisible === 'function' ? Keyboard.isVisible() : false;
      setIsKeyboardVisible(visible);
    };
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncKeyboardState();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (typeof Keyboard.isVisible === 'function' && !Keyboard.isVisible()) {
      setIsKeyboardVisible(false);
    }
  }, [pathname]);

  const navTranslateY = useSharedValue(0);

  useEffect(() => {
    // Hide completely if keyboard is visible OR if scrolling down (isCompact)
    const shouldHide = isKeyboardVisible || isCompact;
    
    navTranslateY.value = withTiming(shouldHide ? (isIOS ? 140 : 120) : 0, {
      duration: 80,
      easing: Easing.out(Easing.exp),
    });
  }, [isKeyboardVisible, isCompact, isIOS, navTranslateY]);

  const barAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: containerBreadth.value,
      
                
      transform: [{ translateY: navTranslateY.value }],
    };
  });

  const navTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: navTranslateY.value }],
  }));

  const [containerWidth, setContainerWidth] = useState(0);

  const horizontalPadding = 6;
  const availableWidth = containerWidth > 0 ? containerWidth - (horizontalPadding * 2) : 0;
  const tabWidth = availableWidth > 0 ? availableWidth / TAB_ITEMS.length : 0;

  const activeIndex = useMemo(() => {
    const idx = TAB_ITEMS.findIndex((item) => item.key === selectedTabKey);
    return idx >= 0 ? idx : 0;
  }, [selectedTabKey]);

  const activeTabRatio = useSharedValue(activeIndex);
  const pillScaleX = useSharedValue(1.0);
  const dragStartRatio = useSharedValue(activeIndex);
  const isDraggingShared = useSharedValue(false);
  // Sync ratio when activeIndex changes
  useEffect(() => {
    if (!isDraggingShared.value) {
      activeTabRatio.value = withTiming(activeIndex, { duration: 70 });
      pillScaleX.value = withTiming(1, { duration: 50 });
    }
  }, [activeIndex, isDraggingShared, activeTabRatio, pillScaleX]);

  const slidingPillStyle = useAnimatedStyle(() => {
    const currentTabW = (containerBreadth.value - horizontalPadding * 2) / TAB_ITEMS.length;
    return {
      transform: [
        { translateX: activeTabRatio.value * currentTabW },
        { scaleX: pillScaleX.value },
      ],
      width: currentTabW,
    };
  });

  const androidSlidingPillStyle = useAnimatedStyle(() => {
    const androidTabWidth = (SCREEN_WIDTH - 8) / TAB_ITEMS.length;
    return {
      transform: [{ translateX: activeTabRatio.value * androidTabWidth }],
    };
  });

  const lastNavTimeRef = useRef<number>(0);

  const navigateToTab = useCallback((item: TabItem) => {
    router.navigate(item.route as any);
  }, [router]);

  const handleTabPress = useCallback((item: TabItem) => {
    if (isDraggingShared.value) return;

    const currentNorm = normalizeRoute(pathname);
    const targetNorm = normalizeRoute(item.route);

    // ROOT CAUSE FIX: If the user is ALREADY on the exact screen for this tab,
    // DO NOT NAVIGATE. This stops re-opening and re-mounting the same page.
    if (currentNorm === targetNorm) {
      return;
    }

    // Debounce rapid successive taps to prevent queued transitions
    const now = Date.now();
    if (now - lastNavTimeRef.current < 350) {
      return;
    }
    lastNavTimeRef.current = now;

    const targetIdx = TAB_ITEMS.findIndex((t) => t.key === item.key);
    if (targetIdx >= 0) {
      activeTabRatio.value = withTiming(targetIdx, { duration: 60 });
    }

    setSelectedTabKey(item.key);
    navigateToTab(item);
  }, [isDraggingShared, pathname, activeTabRatio, navigateToTab]);

  const onDragEnd = useCallback((targetIndex: number) => {
    const item = TAB_ITEMS[targetIndex];
    if (item && item.key !== selectedTabKey) {
      setSelectedTabKey(item.key);
      navigateToTab(item);
    }
  }, [navigateToTab, selectedTabKey]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-5, 5])
      .failOffsetY([-12, 12])
      .onStart(() => {
        'worklet';
        isDraggingShared.value = true;
        dragStartRatio.value = activeTabRatio.value;
        pillScaleX.value = withTiming(1.04, { duration: 40 });
      })
      .onUpdate((event) => {
        'worklet';
        const activeTabW = (containerBreadth.value - horizontalPadding * 2) / TAB_ITEMS.length;
        if (activeTabW <= 0) return;
        const deltaRatio = event.translationX / activeTabW;
        const nextRatio = Math.min(Math.max(dragStartRatio.value + deltaRatio, 0), TAB_ITEMS.length - 1);
        activeTabRatio.value = nextRatio;
      })
      .onEnd(() => {
        'worklet';
        isDraggingShared.value = false;
        pillScaleX.value = withTiming(1, { duration: 50 });
        const targetIndex = Math.min(
          Math.max(Math.round(activeTabRatio.value), 0),
          TAB_ITEMS.length - 1
        );
        activeTabRatio.value = withTiming(targetIndex, { duration: 60 });
        runOnJS(onDragEnd)(targetIndex);
      });
  }, [activeTabRatio, pillScaleX, containerBreadth, dragStartRatio, isDraggingShared, onDragEnd]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  };

  // Safe area bottom inset support for all iPhone sizes and Android
  const bottomInset = Math.max(insets.bottom, isIOS ? 10 : 6) + 4;

  // Transparent frosted glass theme styling matching reference screenshot:
  const glassBg = isDark
    ? (Platform.OS === 'android' ? 'rgba(20, 22, 28, 0.90)' : 'rgba(22, 24, 30, 0.74)')
    : (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.82)');

  const containerBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)';
  const containerBorderTop = isDark ? 'rgba(255, 255, 255, 0.22)' : '#FFFFFF';
  const containerBorderBottom = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';

  // Prevent duplicate rendering when screen is inactive in the navigation stack
  if (!isScreenFocused) {
    return null;
  }

  return (
    <View
      style={{
        bottom: bottomInset,
        pointerEvents: isKeyboardVisible ? 'none' : 'box-none',
      }}
      className="absolute left-0 right-0 items-center justify-center z-50"
    >
      <View style={{ width: FULL_BREADTH, alignItems: 'center' }}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            onLayout={handleLayout}
            style={[
              {
                height: 66,
                overflow: 'hidden',
                backgroundColor: glassBg,
                borderColor: containerBorder,
                borderTopColor: containerBorderTop,
                borderBottomColor: containerBorderBottom,
                borderWidth: 1.2,
                borderRadius: 33,
                elevation: isDark ? 10 : 8,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: isDark ? 8 : 6 },
                shadowOpacity: isDark ? 0.40 : 0.08,
                shadowRadius: isDark ? 24 : 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 8,
                ...Platform.select({
                  web: {
                    backdropFilter: 'blur(25px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(25px) saturate(190%)',
                  } as any,
                  default: {},
                }),
              },
              barAnimatedStyle,
            ]}
          >
            <BlurView
              intensity={isDark ? 65 : 75}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />

            {/* Specular Top Rim Highlight Line */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 28,
                right: 28,
                height: 1.2,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.95)',
                borderRadius: 1,
                pointerEvents: 'none',
              }}
            />

            {/* Tab Navigation Items */}
            {TAB_ITEMS.map((item) => (
              <InsetTabButton
                key={item.key}
                item={item}
                isActive={selectedTabKey === item.key}
                onPress={() => handleTabPress(item)}
                onPressIn={() => router.prefetch(item.route as any)}
                isDark={isDark}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

export default BottomNavigationBar;
