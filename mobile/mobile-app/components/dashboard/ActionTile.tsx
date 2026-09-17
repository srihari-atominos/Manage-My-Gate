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
            borderRadius: 22,
            height: 140,
            paddingHorizontal: 9,
            paddingVertical: 10,
            justifyContent: 'space-between',
            ...(isAndroid
              ? {
                  elevation: 2.5,
                  shadowColor: '#000000',
                }
              : {
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1.5 },
                  shadowOpacity: isDark ? 0.25 : 0.05,
                  shadowRadius: 5,
                }),
          },
        ]}
        className="w-full relative overflow-hidden active:bg-secondary/70"
        accessibilityRole="button"
        accessibilityLabel={`${translatedLabel} ${translatedSubtitle}`}
      >
        {/* Optional Badge / Arrow placed in top-right corner */}
        {badge ? (
          <View
            style={badgeColor ? { backgroundColor: badgeColor } : undefined}
            className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full ${
              !badgeColor ? 'bg-primary' : ''
            } items-center justify-center z-10`}
          >
            <Text className="text-[7.5px] font-extrabold font-sans text-white tracking-wide uppercase">
              {badge}
            </Text>
          </View>
        ) : showArrow ? (
          <View className="absolute top-2 right-2 w-4 h-4 rounded-full bg-secondary items-center justify-center border border-border/40 z-10">
            <ArrowUpRight size={8} className="text-muted-foreground" />
          </View>
        ) : null}

        {/* Center: Prominent Enlarged Feature Icon Container */}
        <View className="w-full items-center pt-1">
          <View
            className={`w-12 h-12 items-center justify-center ${
              iconShapeClass || 'rounded-[18px]'
            } ${
              iconBgColor || 'bg-secondary'
            }`}
          >
            {icon}
          </View>
        </View>

        {/* Bottom Block: Left-aligned Title & Subtitle with Chevron */}
        <View className="w-full pb-0.5">
          <Text
            numberOfLines={2}
            className="text-[12px] font-bold font-sans text-foreground leading-[15px] tracking-tight text-start"
          >
            {translatedLabel}
          </Text>

          <View className="flex-row items-center justify-between mt-1 w-full">
            {translatedSubtitle ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="text-[9.5px] font-medium font-sans text-muted-foreground leading-[12px] flex-1 me-1 text-start"
              >
                {translatedSubtitle}
              </Text>
            ) : (
              <View className="flex-1" />
            )}

            <ChevronRight size={10} color="#94A3B8" className="shrink-0" />
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
};

export default ActionTile;

