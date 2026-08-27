import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { ArrowUpRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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
  containerClassName = 'w-1/3 px-1 py-1',
  showArrow = false,
}) => {
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

  return (
    <View className={containerClassName}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        className="bg-card border border-border/80 rounded-2xl p-3 h-[122px] justify-between relative overflow-hidden active:bg-secondary/60 shadow-xs"
      >
        {/* Top Row: Icon Container + Optional Count Badge / Arrow */}
        <View className="flex-row items-center justify-between w-full">
          <View
            className={`w-10 h-10 rounded-[14px] items-center justify-center border border-border/40 ${
              iconBgColor || 'bg-secondary'
            }`}
          >
            {icon}
          </View>

          {badge ? (
            <View
              className={`px-1.5 py-0.5 rounded-full border border-card ${
                badgeColor || 'bg-destructive'
              }`}
            >
              <Text className="text-[9px] font-bold text-white font-sans">{badge}</Text>
            </View>
          ) : showArrow ? (
            <View className="w-5 h-5 rounded-full bg-secondary items-center justify-center border border-border/40 shrink-0">
              <ArrowUpRight size={10} className="text-muted-foreground" />
            </View>
          ) : null}
        </View>

        {/* Bottom Block: Balanced Label & Subtitle Text Hierarchy */}
        <View className="w-full justify-end">
          <Text
            numberOfLines={2}
            className="text-[12px] font-bold font-sans text-foreground leading-[16px] tracking-tight"
          >
            {label}
          </Text>

          {displaySubtitle ? (
            <Text
              numberOfLines={1}
              className="text-[10px] font-medium font-sans text-muted-foreground leading-[14px] mt-0.5"
            >
              {displaySubtitle}
            </Text>
          ) : null}
        </View>
      </AnimatedPressable>
    </View>
  );
};

export default ActionTile;
