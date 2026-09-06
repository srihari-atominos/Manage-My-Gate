import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { ArrowUpRight, ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from '@/src/utils/i18n';

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
  containerClassName = 'w-1/3 px-1 py-1',
  showArrow = false,
}) => {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 90 });
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
        style={animatedStyle}
        className="bg-card border border-border/70 dark:border-border/60 rounded-2xl p-3 h-[134px] justify-between relative overflow-hidden active:bg-secondary/70 shadow-sm"
      >
        {/* Top Row: Tailored Feature Icon Container + Optional Due Badge / Arrow */}
        <View className="flex-row items-center justify-between w-full">
          <View
            className={`w-14 h-14 items-center justify-center ${
              iconShapeClass || 'rounded-[19px]'
            } ${
              iconBgColor || 'bg-secondary'
            }`}
          >
            {icon}
          </View>

          {showArrow ? (
            <View className="w-5 h-5 rounded-full bg-secondary items-center justify-center border border-border/40 shrink-0">
              <ArrowUpRight size={11} className="text-muted-foreground" />
            </View>
          ) : null}
        </View>

        {/* Bottom Block: Balanced Label, Subtitle, and Subtle Chevron */}
        <View className="w-full">
          <Text
            numberOfLines={2}
            className="text-[12.5px] font-bold font-sans text-foreground leading-[16px] tracking-tight"
          >
            {translatedLabel}
          </Text>

          <View className="flex-row items-center justify-between mt-1">
            {translatedSubtitle ? (
              <Text
                numberOfLines={1}
                className="text-[10.5px] font-medium font-sans text-muted-foreground leading-[14px] flex-1 mr-1"
              >
                {translatedSubtitle}
              </Text>
            ) : <View className="flex-1" />}

            <ChevronRight size={13} color="#94A3B8" className="shrink-0 -mr-0.5" />
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
};

export default ActionTile;
