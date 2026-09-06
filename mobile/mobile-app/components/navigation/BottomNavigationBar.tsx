import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Platform,
  Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';

export type MainTabKey = 'dashboard' | 'community' | 'all-features' | 'security' | 'profile';

interface TabItem {
  key: MainTabKey;
  label: string;
  route: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  isCenter?: boolean;
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
    isCenter: true,
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

const BRAND_ORANGE = '#FF6A00';

interface StandardTabButtonProps {
  item: TabItem;
  isActive: boolean;
  isDark: boolean;
  isIOS: boolean;
  onPress: () => void;
}

const StandardTabButton: React.FC<StandardTabButtonProps> = ({
  item,
  isActive,
  isDark,
  isIOS,
  onPress,
}) => {
  const IconComponent = item.icon;
  const zoomScale = useSharedValue(isActive ? 1.08 : 1.0);

  useEffect(() => {
    zoomScale.value = withTiming(isActive ? 1.08 : 1.0, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, zoomScale]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoomScale.value }],
  }));

  const inactiveColor = isDark ? '#9CA3AF' : '#8E8E93';
  const activeColor = BRAND_ORANGE;

  const content = (
    <View className="items-center justify-center py-1">
      <Animated.View style={animatedIconStyle} className="items-center justify-center">
        <IconComponent
          size={20}
          color={isActive ? activeColor : inactiveColor}
          strokeWidth={isActive ? 2.4 : 1.8}
        />
      </Animated.View>

      <Text
        style={{ color: isActive ? activeColor : inactiveColor }}
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
        className="py-1 items-center justify-center h-[52px] select-none w-full"
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
      className="py-1 items-center justify-center h-[52px] w-full"
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      {content}
    </TouchableOpacity>
  );
};

interface CenterElevatedButtonProps {
  item: TabItem;
  isActive: boolean;
  isDark: boolean;
  isIOS: boolean;
  onPress: () => void;
}

const CenterElevatedButton: React.FC<CenterElevatedButtonProps> = ({
  item,
  isActive,
  isDark,
  isIOS,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.92, { duration: 90 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const content = (
    <View className="items-center justify-center -mt-6">
      {/* Elevated Circular Action Button */}
      <Animated.View
        style={[
          animatedStyle,
          {
            shadowColor: BRAND_ORANGE,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.38,
            shadowRadius: 10,
            elevation: 8,
          },
        ]}
        className="w-[50px] h-[50px] rounded-full bg-[#FF6A00] items-center justify-center border-2 border-card"
      >
        <LayoutGrid size={22} color="#FFFFFF" strokeWidth={2.4} />
      </Animated.View>

      {/* Label underneath */}
      <Text
        style={{ color: isActive ? BRAND_ORANGE : isDark ? '#9CA3AF' : '#64748B' }}
        className={cn(
          'text-[10px] font-sans tracking-tight mt-1 text-center',
          isActive ? 'font-bold' : 'font-semibold'
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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="items-center justify-center z-20 w-full"
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel="View All Modules"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      className="items-center justify-center z-20 w-full"
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel="View All Modules"
    >
      {content}
    </TouchableOpacity>
  );
};

export const BottomNavigationBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname() || '';
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';

  // Determine active tab from pathname
  const activeTab: MainTabKey = useMemo(() => {
    if (pathname.includes('/all-features')) return 'all-features';
    if (pathname.includes('/visitor')) return 'security';
    if (pathname.includes('/notices') || pathname.includes('/directory') || pathname.includes('/polls')) return 'community';
    if (pathname.includes('/profile') || pathname.includes('/settings')) return 'profile';
    if (pathname.includes('/dashboard') || pathname === '/' || pathname === '/(resident)') return 'dashboard';
    return 'dashboard';
  }, [pathname]);

  const [selectedTabKey, setSelectedTabKey] = useState<MainTabKey>(activeTab);

  useEffect(() => {
    setSelectedTabKey(activeTab);
  }, [activeTab]);

  const isNavigatingRef = useRef(false);

  const handleTabPress = (item: TabItem) => {
    setSelectedTabKey(item.key);

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
        }, 150);
      }
    }, 60);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingBottom: Math.max(insets.bottom, isIOS ? 12 : 8),
      }}
      className="absolute bottom-0 left-0 right-0 items-center justify-center px-4 z-50 pointer-events-box-none"
    >
      {/* Floating 5-Item Navigation Bar with Elevated Center Slot */}
      <View
        style={{
          backgroundColor: isIOS
            ? isDark
              ? 'rgba(22, 23, 27, 0.94)'
              : 'rgba(255, 255, 255, 0.96)'
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
        className="w-full max-w-[410px] h-[64px] px-2 py-1 flex-row items-center justify-between relative overflow-visible"
      >
        {/* 5 Symmetrical Tab Items */}
        {TAB_ITEMS.map((item) => {
          const isActive = selectedTabKey === item.key;

          if (item.isCenter) {
            return (
              <View key={item.key} className="flex-1 items-center justify-center overflow-visible">
                <CenterElevatedButton
                  item={item}
                  isActive={isActive}
                  isDark={isDark}
                  isIOS={isIOS}
                  onPress={() => handleTabPress(item)}
                />
              </View>
            );
          }

          return (
            <View key={item.key} className="flex-1 items-center justify-center">
              <StandardTabButton
                item={item}
                isActive={isActive}
                isDark={isDark}
                isIOS={isIOS}
                onPress={() => handleTabPress(item)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default BottomNavigationBar;


