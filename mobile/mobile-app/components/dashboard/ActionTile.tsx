import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { ArrowUpRight, ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from '../../src/utils/i18n';

import { useColorScheme } from 'nativewind';
import { Platform } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type SmartCardStatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SmartCardStatusBadge {
  label: string;
  variant?: SmartCardStatusVariant;
  dot?: boolean;
}

export interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  metaValue?: string;
  statusBadge?: SmartCardStatusBadge | string;
  progress?: number; // 0 to 100
  footerText?: string;
  onPress: () => void;
  badge?: string;
  badgeColor?: string;
  iconBgColor?: string;
  iconShapeClass?: string;
  containerClassName?: string;
  showArrow?: boolean;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  label,
  subtitle,
  metaValue,
  onPress,
  badge,
  badgeColor,
  iconBgColor,
  iconShapeClass,
  containerClassName = 'w-[31.4%]',
  showArrow = false,
}) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isAndroid = Platform.OS === 'android';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 90 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const displaySubtitle = metaValue || subtitle;
  const translatedLabel = t(label, label);
  const translatedSubtitle = displaySubtitle ? t(displaySubtitle, displaySubtitle) : '';

  return (
    <View className={containerClassName}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animatedStyle,
          {
            backgroundColor: isDark ? '#181A20' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1.2,
            borderRadius: 18,
            height: 126,
            padding: 9.5,
            justifyContent: 'space-between',
            ...(isAndroid
              ? {
                  elevation: 2.5,
                  shadowColor: '#000000',
                }
              : {
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 6,
                }),
          },
        ]}
        className="w-full relative overflow-hidden active:bg-secondary/70"
        accessibilityRole="button"
        accessibilityLabel={`${translatedLabel} ${translatedSubtitle}`}
      >
        {/* Top Row: Tailored Feature Icon Container + Optional Badge / Arrow */}
        <View className="flex-row items-center justify-between w-full">
          <View
            className={`w-9 h-9 items-center justify-center ${
              iconShapeClass || 'rounded-xl'
            } ${
              iconBgColor || 'bg-secondary'
            }`}
          >
            {icon}
          </View>

          {badge ? (
            <View
              style={badgeColor ? { backgroundColor: badgeColor } : undefined}
              className={`px-1.5 py-0.5 rounded-full ${
                !badgeColor ? 'bg-primary' : ''
              } items-center justify-center`}
            >
              <Text className="text-[8px] font-extrabold font-sans text-white tracking-wide uppercase">
                {badge}
              </Text>
            </View>
          ) : showArrow ? (
            <View className="w-5 h-5 rounded-full bg-secondary items-center justify-center border border-border/40 shrink-0">
              <ArrowUpRight size={10} className="text-muted-foreground" />
            </View>
          ) : null}
        </View>

        {/* Bottom Block: Balanced Label, Subtitle, and Subtle Chevron */}
        <View className="w-full">
          <Text
            numberOfLines={2}
            className="text-[12px] font-bold font-sans text-foreground leading-[15px] tracking-tight"
          >
            {translatedLabel}
          </Text>

          <View className="flex-row items-center justify-between mt-0.5">
            {translatedSubtitle ? (
              <Text
                numberOfLines={1}
                className="text-[9.5px] font-medium font-sans text-muted-foreground leading-[12px] flex-1 mr-0.5"
              >
                {translatedSubtitle}
              </Text>
            ) : <View className="flex-1" />}

            <ChevronRight size={10} color="#94A3B8" className="shrink-0 -mr-0.5" />
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
};

export default ActionTile;

