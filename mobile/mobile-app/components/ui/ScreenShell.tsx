import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LucideIcons from 'lucide-react-native';
import {
  ChevronLeft,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export interface ScreenShellProps {
  title: string;
  subtitle?: string;
  iconName?: string;             // Lucide icon name for header
  showBackButton?: boolean;      // default true
  headerRight?: React.ReactNode; // slot for action buttons (secondary tools, filter, etc.)
  children?: React.ReactNode;
  loading?: boolean;             // shows skeleton overlay
  error?: string | null;         // shows error banner with retry
  onRetry?: () => void;
  className?: string;

  // Domain Architecture & RBAC Metadata
  permission?: string;           // e.g., 'billing:dashboard' or 'complaints:dashboard'
  permissionGranted?: boolean;   // default true
  syncStatus?: 'live' | 'connected' | 'syncing' | 'offline' | string;
  domainName?: string;           // e.g., 'Complaints & Maintenance', 'Amenities'
  sharedSlice?: string;          // e.g., 'complaintSlice.js', 'billingSlice.ts'
  domainBadge?: string;          // e.g., 'Active Sub-Feature', 'Executive'
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
  permission,
  permissionGranted = true,
  syncStatus,
  domainName,
  sharedSlice,
  domainBadge,
}: ScreenShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Dynamic Lucide icon lookup for iconName prop
  const DynamicIcon = iconName ? (LucideIcons as Record<string, any>)[iconName] : undefined;

  // Determine if valid children are present
  const hasChildren = React.Children.toArray(children).filter(Boolean).length > 0;

  const topInsetPadding = Math.max(insets.top, 12);

  // Handle RBAC Permission Denied State
  if (permission && permissionGranted === false) {
    return (
      <View className={cn('flex-1 bg-background', className)}>
        <View
          style={{ paddingTop: topInsetPadding }}
          className="bg-background border-b border-border px-4 pb-3"
        >
          <View className="flex-row items-center min-h-[44px]">
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
            <View className="flex-1 justify-center">
              <Text variant="large" numberOfLines={1} className="text-foreground font-semibold">
                {title}
              </Text>
              <Text variant="muted" numberOfLines={1} className="text-xs text-muted-foreground mt-0.5">
                Access Restricted
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-1 bg-background p-6 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-destructive/10 items-center justify-center mb-4 border border-destructive/20">
            <Icon as={ShieldAlert} size={32} className="text-destructive" />
          </View>
          <Text className="text-xl font-bold text-foreground text-center mb-2">Access Denied</Text>
          <Text className="text-sm text-muted-foreground text-center mb-6 px-4">
            You do not have the required permission (
            <Text className="font-mono text-xs font-bold text-foreground">{permission}</Text>) to view this dashboard.
          </Text>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(resident)/all-features' as any);
              }
            }}
            className="bg-primary px-6 py-3 rounded-xl active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Text className="text-primary-foreground font-bold text-sm">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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

            <View className="flex-1 justify-center">
              <Text variant="large" numberOfLines={1} className="text-foreground font-semibold">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="muted" numberOfLines={1} className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {headerRight ? (
            <View className="shrink-0 justify-center items-end">
              {headerRight}
            </View>
          ) : null}
        </View>
      </View>

      {/* Error banner (appears between header and content) */}
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
        {loading ? (
          <Skeleton variant="listItem" count={5} />
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export default ScreenShell;
