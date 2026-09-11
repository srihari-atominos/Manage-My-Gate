import React, { useState, useRef } from 'react';
import {
  View,
  Pressable,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LucideIcons from 'lucide-react-native';
import { ChevronLeft, AlertCircle, Compass } from 'lucide-react-native';
import { Text } from './text';
import { Icon } from './icon';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/utils';
import { RoleSwitchModal } from '../navigation/RoleSwitchModal';
import { VillaSwitchModal } from '../navigation/VillaSwitchModal';
import { GlobalNavModal } from '../navigation/GlobalNavModal';
import { BottomNavigationBar } from '../navigation/BottomNavigationBar';
import { useBottomNavScroll } from '../navigation/BottomNavScrollContext';

export interface ScreenShellProps {
  title: string;
  subtitle?: string;
  iconName?: string;             // Lucide icon name for header
  domainName?: string;
  sharedSlice?: string;
  permission?: string;
  showBackButton?: boolean;      // default true
  onBackPress?: () => void;
  headerRight?: React.ReactNode; // slot for action buttons (filter, add, etc.)
  children?: React.ReactNode;
  loading?: boolean;             // shows skeleton overlay
  error?: string | null;         // shows error banner with retry
  onRetry?: () => void;
  className?: string;
  enableHeaderDoubleTap?: boolean; // Mobile gesture: double-tap header to switch role/villa
  scrollable?: boolean;          // Wrap children in a ScrollView
  showBottomNav?: boolean;       // Render bottom navigation bar
  hideBottomNav?: boolean;       // Explicitly hide bottom navigation bar
  hideHeader?: boolean;          // Explicitly hide top navigation bar (for wizard flows with custom headers)
  collapsibleHeader?: boolean;   // Move top header up/down dynamically with scroll (default: true)
}

export function ScreenShell({
  title,
  subtitle,
  iconName,
  showBackButton = true,
  onBackPress,
  headerRight,
  children,
  loading = false,
  error = null,
  onRetry,
  className,
  enableHeaderDoubleTap = true,
  scrollable = false,
  showBottomNav = true,
  hideBottomNav = false,
  hideHeader = false,
  collapsibleHeader = true,
}: ScreenShellProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const insets = useSafeAreaInsets();
  const { isCompact, setIsCompact, scrollHandlerProps } = useBottomNavScroll();

  // Reset scroll compact state on route change so every screen begins fully expanded
  React.useEffect(() => {
    setIsCompact(false);
  }, [pathname, setIsCompact]);

  // Automated detection of sub-flows, creation wizards, scanners, checkouts, and detail action pages
  const isProfileScreen = pathname.includes('/profile');
  const isAuthScreen = pathname.includes('/(auth)') || pathname.includes('/login') || pathname.includes('/signup');
  const isSubFlowOrCreationScreen =
    pathname.includes('/create') ||
    pathname.includes('/wizard') ||
    pathname.includes('/scanner') ||
    pathname.includes('/booking/') ||
    pathname.includes('/checkout') ||
    pathname.includes('/raise-ticket') ||
    pathname.includes('/invite') ||
    pathname.includes('-pass') ||
    pathname.includes('/kid-exit');

  const shouldShowBottomNav =
    showBottomNav &&
    !hideBottomNav &&
    !isProfileScreen &&
    !isAuthScreen &&
    !isSubFlowOrCreationScreen;

  // Collapsible Header Animation (moves up on scroll down, moves down on scroll up)
  const headerTranslateY = useSharedValue(0);
  const headerMarginTop = useSharedValue(0);
  const headerOpacity = useSharedValue(1);

  React.useEffect(() => {
    if (collapsibleHeader) {
      headerTranslateY.value = withTiming(isCompact ? -80 : 0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      headerMarginTop.value = withTiming(isCompact ? -58 : 0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      headerOpacity.value = withTiming(isCompact ? 0 : 1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      headerTranslateY.value = 0;
      headerMarginTop.value = 0;
      headerOpacity.value = 1;
    }
  }, [isCompact, collapsibleHeader]);

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    marginTop: headerMarginTop.value,
    opacity: headerOpacity.value,
  }));

  const [showGlobalNavModal, setShowGlobalNavModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showVillaModal, setShowVillaModal] = useState(false);
  const [selectedVilla, setSelectedVilla] = useState('Villa 101');

  const lastTapRef = useRef<number>(0);

  // Hardware Back Button Handler for Android / Mobile devices
  React.useEffect(() => {
    if (!showBackButton) return;

    const onHardwareBack = () => {
      if (onBackPress) {
        onBackPress();
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [showBackButton, onBackPress, router]);

  // Mobile Gesture Shortcut: Double Tap Header Title to Switch Role / Villa Unit Context
  const handleHeaderPress = () => {
    if (!enableHeaderDoubleTap) return;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms

    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0;
      // Double tap triggered: Open Role / Villa switcher modal
      setShowRoleModal(true);
    } else {
      lastTapRef.current = now;
    }
  };

  const DynamicIcon = React.useMemo(() => {
    if (!iconName) return undefined;
    const icons = LucideIcons as Record<string, any>;
    return (
      icons[iconName] ||
      icons[iconName.replace('BarChart3', 'ChartColumn').replace('BarChart', 'ChartBar').replace('Sliders', 'SlidersHorizontal')] ||
      icons.Layers
    );
  }, [iconName]);

  const hasChildren = React.Children.toArray(children).filter(Boolean).length > 0;
  const topInsetPadding = Math.max(insets.top, 12);

  return (
    <View className={cn('flex-1 bg-background', className)}>
      {/* Top Status Bar Safe Area Spacer (fixed background color so status bar icons never clash) */}
      <View
        style={{ height: topInsetPadding }}
        className="bg-card z-30"
      />

      {/* Header row (animated collapsible header that moves up on scroll down, and down on scroll up) */}
      {!hideHeader && (
        <Animated.View
          style={[
            animatedHeaderStyle,
            { overflow: 'hidden' },
          ]}
          className="bg-card border-b border-border px-4 pb-3 shadow-xs z-30"
        >
          <View className="flex-row items-center justify-between gap-2 min-h-[44px]">
            <View className="flex-row items-center flex-1 me-2 min-w-0">
              {showBackButton && (
                <Pressable
                  onPress={() => {
                    if (onBackPress) {
                      onBackPress();
                    } else if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace('/(resident)/dashboard' as any);
                    }
                  }}
                  className="me-2 p-2 rounded-xl active:bg-secondary -ms-1 shrink-0 border border-transparent active:border-border/60"
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Icon as={ChevronLeft} size={20} className="text-foreground" />
                </Pressable>
              )}

              {DynamicIcon ? (
                <View className="me-2.5 size-9 rounded-xl bg-primary/15 items-center justify-center border border-primary/25 shrink-0">
                  <Icon as={DynamicIcon} size={18} className="text-primary" />
                </View>
              ) : null}

              {/* Double Tap Gesture Header Area */}
              <Pressable
                onPress={handleHeaderPress}
                className="flex-1 justify-center active:opacity-80 min-w-0"
                accessibilityHint="Double tap header title to switch active Role or Villa Unit"
              >
                <Text variant="large" numberOfLines={1} className="text-foreground font-bold tracking-tight shrink">
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="muted" numberOfLines={1} className="text-xs text-muted-foreground mt-0.5 font-medium shrink">
                    {subtitle}
                  </Text>
                ) : null}
              </Pressable>
            </View>

            {/* Header Right Action Slots + Global Navigation Trigger Button */}
            <View className="flex-row items-center gap-1.5 shrink-0">
              {headerRight ? headerRight : null}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowGlobalNavModal(true)}
                className="p-2 rounded-xl bg-secondary border border-border/80 items-center justify-center"
                accessibilityLabel="Global Easy Navigation"
              >
                <Icon as={Compass} size={18} className="text-foreground" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Error banner */}
      {error ? (
        <View className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 me-2">
            <Icon as={AlertCircle} size={18} className="text-destructive me-2.5 shrink-0" />
            <Text className="text-destructive text-xs font-medium flex-1" numberOfLines={2}>
              {error}
            </Text>
          </View>
          {onRetry ? (
            <Pressable
              onPress={onRetry}
              className="bg-destructive px-3 py-1.5 rounded-lg active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text className="text-destructive-foreground text-xs font-semibold">Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Main content area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        className="flex-1 bg-background"
      >
        {loading && !hasChildren ? (
          <Skeleton variant="listItem" count={5} />
        ) : scrollable ? (
          <ScrollView 
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            alwaysBounceVertical={true}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            {...scrollHandlerProps}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: shouldShowBottomNav ? Math.max(insets.bottom + 95, 120) : Math.max(insets.bottom, 24),
            }}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            className="flex-1 bg-background"
            style={{
              paddingBottom: shouldShowBottomNav ? (Platform.OS === 'ios' ? 84 : 68) : 0,
            }}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Global Easy Navigation Modal (Triggered from Compass Icon Button) */}
      {showGlobalNavModal && (
        <GlobalNavModal
          visible={showGlobalNavModal}
          onClose={() => setShowGlobalNavModal(false)}
        />
      )}

      {/* Role Context Switcher Modal (Triggered by Double Tap Gesture) */}
      {showRoleModal && (
        <RoleSwitchModal
          visible={showRoleModal}
          onClose={() => setShowRoleModal(false)}
        />
      )}

      {/* Villa Unit Context Switcher Modal */}
      {showVillaModal && (
        <VillaSwitchModal
          visible={showVillaModal}
          onClose={() => setShowVillaModal(false)}
          activeVilla={selectedVilla}
          onSelectVilla={(v) => setSelectedVilla(v)}
        />
      )}

      {/* Down Bar Navigation */}
      {shouldShowBottomNav && <BottomNavigationBar />}
    </View>
  );
}
