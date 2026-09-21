import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '../ui/text';
import { ArrowUpRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation, default as i18n } from '../../src/utils/i18n';
import { useColorScheme } from 'nativewind';

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
  progress?: number;
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
  containerClassName = 'w-[22.8%]',
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
    scale.value = withTiming(0.95, { duration: 90 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const displaySubtitle = metaValue || subtitle;
  const translatedLabel = i18n.translateText(label);
  const translatedSubtitle = displaySubtitle ? i18n.translateText(displaySubtitle) : '';

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
            borderWidth: 1,
            borderRadius: 16,
            minHeight: 96,
            paddingHorizontal: 4,
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
            ...(isAndroid
              ? {
                  elevation: 2,
                  shadowColor: '#000000',
                }
              : {
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 4,
                }),
          },
        ]}
        className="w-full relative overflow-hidden active:bg-secondary/70 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={`${translatedLabel}${translatedSubtitle ? ` ${translatedSubtitle}` : ''}`}
      >
        {/* Top-Right Anchored Badge / Arrow */}
        {badge ? (
          <View
            style={badgeColor ? { backgroundColor: badgeColor } : undefined}
            className={`absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full ${
              !badgeColor ? 'bg-primary' : ''
            } items-center justify-center z-10`}
          >
            <Text className="text-[7.5px] font-black font-sans text-white tracking-wide uppercase">
              {badge}
            </Text>
          </View>
        ) : showArrow ? (
          <View className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-secondary items-center justify-center border border-border/40 z-10">
            <ArrowUpRight size={8} className="text-muted-foreground" />
          </View>
        ) : null}

        {/* Centered Line-Style Feature Icon */}
        <View
          className={`w-9 h-9 items-center justify-center mb-1.5 ${
            iconShapeClass || 'rounded-xl'
          } ${
            iconBgColor || 'bg-secondary'
          }`}
        >
          {icon}
        </View>

        {/* Centered Label */}
        <View className="w-full items-center justify-center px-0.5">
          <Text
            numberOfLines={2}
            style={i18n.getCurrentLanguage() === 'ar' ? { fontSize: 11, lineHeight: 14 } : undefined}
            className="text-[10.5px] font-semibold font-sans text-foreground text-center leading-[13px] tracking-tight"
          >
            {translatedLabel}
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );
};

export default ActionTile;
