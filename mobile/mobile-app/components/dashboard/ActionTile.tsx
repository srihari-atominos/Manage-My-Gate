import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../ui/text';
import { ArrowUpRight, ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation, default as i18n } from '../../src/utils/i18n';

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
            borderRadius: 14,
            height: 96,
            paddingHorizontal: 5,
            paddingVertical: 7,
            alignItems: 'center',
            justifyContent: 'center',
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
        className="w-full relative overflow-hidden active:bg-secondary/70 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={`${translatedLabel} ${translatedSubtitle}`}
      >
        {/* Optional Badge / Arrow placed in top-right corner */}
        {badge ? (
          <View
            style={badgeColor ? { backgroundColor: badgeColor } : undefined}
            className={`absolute top-1.5 end-1.5 px-1.5 py-0.5 rounded-full ${
              !badgeColor ? 'bg-primary' : ''
            } items-center justify-center z-10`}
          >
            <Text className="text-[7px] font-extrabold font-sans text-white tracking-wide uppercase">
              {badge}
            </Text>
          </View>
        ) : showArrow ? (
          <View className="absolute top-1.5 end-1.5 w-3.5 h-3.5 rounded-full bg-secondary items-center justify-center border border-border/40 z-10">
            <ArrowUpRight size={8} className="text-muted-foreground" />
          </View>
        ) : null}

        {/* Center: Refined Feature Icon Container */}
        <View
          className={`w-9 h-9 items-center justify-center mb-1.5 ${
            iconShapeClass || 'rounded-xl'
          } ${
            iconBgColor || 'bg-secondary'
          }`}
        >
          {icon}
        </View>

        {/* Center: Balanced Label and Subtitle */}
        <View className="w-full items-center justify-center px-0.5">
          <Text
            numberOfLines={2}
            style={i18n.getCurrentLanguage() === 'ar' ? { fontSize: 11.5, lineHeight: 14.5 } : undefined}
            className="text-[10.5px] font-bold font-sans text-foreground text-center leading-[13px] tracking-tight"
          >
            {translatedLabel}
          </Text>

          {translatedSubtitle ? (
            <Text
              numberOfLines={1}
              style={i18n.getCurrentLanguage() === 'ar' ? { fontSize: 9.5, lineHeight: 13 } : undefined}
              className="text-[9px] font-medium font-sans text-muted-foreground text-center leading-[11px] mt-0.5"
            >
              {translatedSubtitle}
            </Text>
          ) : null}
        </View>
      </AnimatedPressable>
    </View>
  );
};

export default ActionTile;

