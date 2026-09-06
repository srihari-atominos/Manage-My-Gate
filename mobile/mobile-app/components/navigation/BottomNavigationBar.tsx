import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Platform,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import {
  Home,
  ShieldCheck,
  Sparkles,
  CreditCard,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';

export type MainTabKey = 'dashboard' | 'visitor' | 'amenities' | 'billing';

interface TabItem {
  key: MainTabKey;
  label: string;
  route: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

const TAB_ITEMS: TabItem[] = [
  {
    key: 'dashboard',
    label: 'Home',
    route: '/(resident)/dashboard',
    icon: Home,
  },
  {
    key: 'visitor',
    label: 'Visitors',
    route: '/(resident)/visitor',
    icon: ShieldCheck,
  },
  {
    key: 'amenities',
    label: 'Amenities',
    route: '/(resident)/amenities/dashboard',
    icon: Sparkles,
  },
  {
    key: 'billing',
    label: 'Billing',
    route: '/(resident)/billing',
    icon: CreditCard,
  },
];

const ACTIVE_ORANGE = '#FF6A00';

// Global memory to preserve sliding position across route transitions without jumping
let globalLastActiveX = -1;
let globalLastCapsuleWidth = 72;

interface TabButtonProps {
  item: TabItem;
  isActive: boolean;
  isDark: boolean;
  isIOS: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  item,
  isActive,
  isDark,
  isIOS,
  onPress,
}) => {
  const IconComponent = item.icon;
  const zoomScale = useSharedValue(isActive ? 1.12 : 1.0);

  useEffect(() => {
    zoomScale.value = withTiming(isActive ? 1.12 : 1.0, {
      duration: 170,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, zoomScale]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoomScale.value }],
  }));

  const inactiveIconColor = isDark ? '#9CA3AF' : '#8E8E93';
  const inactiveTextColor = isDark ? '#9CA3AF' : '#8E8E93';

  const iconColor = isActive ? ACTIVE_ORANGE : inactiveIconColor;
  const textColor = isActive ? ACTIVE_ORANGE : inactiveTextColor;

  const content = (
    <View className="items-center justify-center py-1">
      {/* Icon Area */}
      <Animated.View style={animatedIconStyle} className="items-center justify-center">
        <IconComponent
          size={isActive ? 22 : 21}
          color={iconColor}
          strokeWidth={isActive ? 2.3 : 1.9}
        />
      </Animated.View>

      {/* Label Underneath (Inside the full active capsule) */}
      <Text
        style={{ color: textColor }}
        className={cn(
          'text-[10px] font-sans tracking-tight mt-1 text-center',
          isActive ? 'font-bold' : 'font-medium'
        )}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </View>
  );

  if (isIOS) {
    return (
      <Pressable
        onPress={onPress}
        className="py-1 items-center justify-center h-[52px] z-10 select-none w-full"
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={item.label}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="py-1 items-center justify-center h-[52px] z-10 w-full"
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      {content}
    </TouchableOpacity>
  );
};

export const BottomNavigationBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname() || '';
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';

  // Dynamic Billing route based on user roles / permissions
  const billingRoute = useMemo(() => {
    const permissions = user?.permissions || [];
    const userRole = (user?.role || '').toLowerCase();
    const hasAdminAccess =
      permissions.includes('billing:dashboard') ||
      permissions.includes('billing:assessment_manager') ||
      userRole === 'admin' ||
      userRole === 'accountant' ||
      userRole === 'treasury';

    return hasAdminAccess ? '/(resident)/admin/billing' : '/(resident)/billing/my-dues';
  }, [user]);

  // Determine active tab from pathname
  const activeTab: MainTabKey = useMemo(() => {
    if (pathname.includes('/visitor')) return 'visitor';
    if (pathname.includes('/amenities')) return 'amenities';
    if (pathname.includes('/billing')) return 'billing';
    if (pathname.includes('/dashboard')) return 'dashboard';
    return 'dashboard';
  }, [pathname]);

  // Local optimistic state for immediate responsiveness on tap
  const [selectedTabKey, setSelectedTabKey] = useState<MainTabKey>(activeTab);

  useEffect(() => {
    setSelectedTabKey(activeTab);
  }, [activeTab]);

  const currentActiveIndex = TAB_ITEMS.findIndex((t) => t.key === selectedTabKey);

  // Layout storage for exact measured coordinates of all 4 tabs
  const tabLayoutsRef = useRef<{ [key: number]: { x: number; width: number } }>({});
  const [hasMeasured, setHasMeasured] = useState(false);

  // Shared animated values for X translation and width expansion
  const shiftOffset = useSharedValue(globalLastActiveX >= 0 ? globalLastActiveX : 0);
  const capsuleWidthValue = useSharedValue(globalLastCapsuleWidth > 0 ? globalLastCapsuleWidth : 72);
  const isInitializedRef = useRef(globalLastActiveX >= 0);

  const animateToTab = (index: number) => {
    const layout = tabLayoutsRef.current[index];
    if (!layout) return;

    const capsuleW = Math.min(layout.width - 4, 76);
    const targetX = layout.x + (layout.width - capsuleW) / 2;

    if (!isInitializedRef.current) {
      shiftOffset.value = targetX;
      capsuleWidthValue.value = capsuleW;
      isInitializedRef.current = true;
    } else {
      shiftOffset.value = withTiming(targetX, {
        duration: 190,
        easing: Easing.out(Easing.cubic),
      });
      capsuleWidthValue.value = withTiming(capsuleW, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
      });
    }

    globalLastActiveX = targetX;
    globalLastCapsuleWidth = capsuleW;
  };

  const onTabLayout = (index: number, layout: { x: number; width: number }) => {
    tabLayoutsRef.current[index] = layout;

    if (index === currentActiveIndex) {
      setHasMeasured(true);
      animateToTab(index);
    }
  };

  useEffect(() => {
    if (currentActiveIndex >= 0 && tabLayoutsRef.current[currentActiveIndex]) {
      animateToTab(currentActiveIndex);
    }
  }, [currentActiveIndex]);

  const animatedCapsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shiftOffset.value }],
    width: capsuleWidthValue.value,
  }));

  const isNavigatingRef = useRef(false);

  const handleTabPress = (item: TabItem, index: number) => {
    // 1. Immediately trigger visual sliding animation
    setSelectedTabKey(item.key);
    animateToTab(index);

    // 2. Prevent double-tap navigation storms
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    let targetRoute = item.route;
    if (item.key === 'billing') {
      targetRoute = billingRoute;
    }

    // 3. Short micro-delay so user visibly sees the capsule glide across before screen switches
    setTimeout(() => {
      try {
        router.navigate(targetRoute as any);
      } catch {
        router.replace(targetRoute as any);
      } finally {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 150);
      }
    }, 120);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingBottom: Math.max(insets.bottom, isIOS ? 12 : 8),
      }}
      className="absolute bottom-0 left-0 right-0 items-center justify-center px-4 z-50"
    >
      {/* Floating Pill Navigation Container */}
      <View
        style={{
          backgroundColor: isIOS
            ? isDark
              ? 'rgba(22, 23, 27, 0.92)'
              : 'rgba(255, 255, 255, 0.94)'
            : isDark
            ? '#18181B'
            : '#FFFFFF',
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          borderRadius: 36,
          elevation: isIOS ? 0 : 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.55 : 0.12,
          shadowRadius: 20,
        }}
        className="w-full max-w-[400px] h-[64px] px-3 py-1 flex-row items-center justify-between relative overflow-hidden"
      >
        {/* Persistent Single Animated Sliding Capsule (Encloses BOTH Icon and Label) */}
        <Animated.View
          style={[
            animatedCapsuleStyle,
            {
              position: 'absolute',
              top: 6,
              bottom: 6,
              borderRadius: 24,
              backgroundColor: isDark
                ? 'rgba(255, 106, 0, 0.18)'
                : 'rgba(255, 106, 0, 0.12)',
              borderColor: isDark
                ? 'rgba(255, 106, 0, 0.35)'
                : 'rgba(255, 106, 0, 0.25)',
              borderWidth: 1,
              shadowColor: ACTIVE_ORANGE,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.35 : 0.15,
              shadowRadius: 6,
              opacity: hasMeasured || globalLastActiveX >= 0 ? 1 : 0,
            },
          ]}
        />

        {/* 4 Feature Tab Items with Measured Layout Coordinates */}
        {TAB_ITEMS.map((item, index) => (
          <View
            key={item.key}
            className="flex-1 items-center justify-center"
            onLayout={(e) => onTabLayout(index, e.nativeEvent.layout)}
          >
            <TabButton
              item={item}
              isActive={selectedTabKey === item.key}
              isDark={isDark}
              isIOS={isIOS}
              onPress={() => handleTabPress(item, index)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

export default BottomNavigationBar;

