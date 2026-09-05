import React, { useState, useRef } from 'react';
import { View, Pressable, TouchableOpacity, ScrollView, BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LucideIcons from 'lucide-react-native';
import { ChevronLeft, AlertCircle, Compass } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { RoleSwitchModal } from '../navigation/RoleSwitchModal';
import { VillaSwitchModal } from '../navigation/VillaSwitchModal';
import { GlobalNavModal } from '../navigation/GlobalNavModal';
import { BottomNavigationBar } from '../navigation/BottomNavigationBar';

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
  showBottomNav = false,
  hideBottomNav = false,
}: ScreenShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      {/* Header row (safe area inset top) */}
      <View
        style={{ paddingTop: topInsetPadding }}
        className="bg-card border-b border-border px-4 pb-3 shadow-xs"
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
                  } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history && window.history.length > 1) {
                    window.history.back();
                  } else {
                    router.back();
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
      </View>

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
      <View className="flex-1 bg-background">
        {loading && !hasChildren ? (
          <Skeleton variant="listItem" count={5} />
        ) : scrollable ? (
          <ScrollView 
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </View>

      {/* Global Easy Navigation Modal (Triggered from Compass Icon Button) */}
      <GlobalNavModal
        visible={showGlobalNavModal}
        onClose={() => setShowGlobalNavModal(false)}
      />

      {/* Role Context Switcher Modal (Triggered by Double Tap Gesture) */}
      <RoleSwitchModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSelectRole={() => {
          setShowRoleModal(false);
          setShowVillaModal(true);
        }}
      />

      {/* Villa Unit Context Switcher Modal */}
      <VillaSwitchModal
        visible={showVillaModal}
        onClose={() => setShowVillaModal(false)}
        activeVilla={selectedVilla}
        onSelectVilla={(v) => {
          setSelectedVilla(v);
          setShowVillaModal(false);
        }}
      />

      {/* Down Bar Navigation */}
      {showBottomNav && !hideBottomNav && <BottomNavigationBar />}
    </View>
  );
}
