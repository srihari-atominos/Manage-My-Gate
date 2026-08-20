import React, { useState, useRef } from 'react';
import { View, Pressable, TouchableOpacity } from 'react-native';
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

export interface ScreenShellProps {
  title: string;
  subtitle?: string;
  iconName?: string;             // Lucide icon name for header
  showBackButton?: boolean;      // default true
  headerRight?: React.ReactNode; // slot for action buttons (filter, add, etc.)
  children?: React.ReactNode;
  loading?: boolean;             // shows skeleton overlay
  error?: string | null;         // shows error banner with retry
  onRetry?: () => void;
  className?: string;
  enableHeaderDoubleTap?: boolean; // Mobile gesture: double-tap header to switch role/villa
}

export function ScreenShell({
  title,
  subtitle,
  iconName,
  showBackButton = true,
  headerRight,
  children,
  loading = false,
  error = null,
  onRetry,
  className,
  enableHeaderDoubleTap = true,
}: ScreenShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showGlobalNavModal, setShowGlobalNavModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showVillaModal, setShowVillaModal] = useState(false);
  const [selectedVilla, setSelectedVilla] = useState('Villa 101');

  const lastTapRef = useRef<number>(0);

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

  const DynamicIcon = iconName ? (LucideIcons as Record<string, any>)[iconName] : undefined;
  const hasChildren = React.Children.toArray(children).filter(Boolean).length > 0;
  const topInsetPadding = Math.max(insets.top, 12);

  return (
    <View className={cn('flex-1 bg-background', className)}>
      {/* Header row (safe area inset top) */}
      <View
        style={{ paddingTop: topInsetPadding }}
        className="bg-background border-b border-border px-4 pb-3"
      >
        <View className="flex-row items-center justify-between gap-2 min-h-[44px]">
          <View className="flex-row items-center flex-1 me-2">
            {showBackButton && (
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(resident)/all-features' as any);
                  }
                }}
                className="me-2.5 p-1.5 rounded-full active:bg-muted/60 dark:active:bg-muted/40 -ms-1.5 shrink-0"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Icon as={ChevronLeft} size={22} className="text-foreground" />
              </Pressable>
            )}

            {DynamicIcon ? (
              <View className="me-2.5 size-8 rounded-lg bg-primary/10 items-center justify-center border border-primary/20 shrink-0">
                <Icon as={DynamicIcon} size={18} className="text-primary" />
              </View>
            ) : null}

            {/* Double Tap Gesture Header Area */}
            <Pressable
              onPress={handleHeaderPress}
              className="flex-1 justify-center active:opacity-80"
              accessibilityHint="Double tap header title to switch active Role or Villa Unit"
            >
              <Text variant="large" numberOfLines={1} className="text-foreground font-bold">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="muted" numberOfLines={1} className="text-xs text-muted-foreground mt-0.5">
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
              className="p-2 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center"
              accessibilityLabel="Global Easy Navigation"
            >
              <Icon as={Compass} size={18} className="text-primary" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Error banner */}
      {error ? (
        <View className="bg-[#fee2e2] dark:bg-[#450a0a] border-b border-red-200 dark:border-red-900/50 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 me-2">
            <Icon as={AlertCircle} size={18} className="text-red-600 dark:text-red-400 me-2.5 shrink-0" />
            <Text className="text-red-800 dark:text-red-200 text-xs font-medium flex-1" numberOfLines={2}>
              {error}
            </Text>
          </View>
          {onRetry ? (
            <Pressable
              onPress={onRetry}
              className="bg-red-600 dark:bg-red-700 px-3 py-1.5 rounded-lg active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Text className="text-white text-xs font-semibold">Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Main content area */}
      <View className="flex-1 bg-background">
        {loading && !hasChildren ? (
          <Skeleton variant="listItem" count={5} />
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
    </View>
  );
}
