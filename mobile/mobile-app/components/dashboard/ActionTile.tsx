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
  isAccent?: boolean;
  accentBg?: string;
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
  containerClassName = 'w-[23%]',
  showArrow = false,
  isAccent = false,
  accentBg,
}) => {
  const { translateText, language } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isAndroid = Platform.OS === 'android';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.94, { duration: 90 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const displaySubtitle = metaValue || subtitle;
  const translatedLabel = translateText(label);
  const translatedSubtitle = displaySubtitle ? translateText(displaySubtitle) : '';

  const isNumericBadge = Boolean(badge && badge.length <= 2 && /^\d+$/.test(badge));

  return (
    <View className={`items-center justify-start ${containerClassName}`}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, { alignItems: 'center', width: '100%' }]}
        accessibilityRole="button"
        accessibilityLabel={`${translatedLabel}${translatedSubtitle ? ` ${translatedSubtitle}` : ''}`}
      >
        {/* Squircle Icon Box */}
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            backgroundColor: isAccent
              ? accentBg || (isDark ? '#FF8A3D' : '#C2410C')
              : isDark
              ? '#242424'
              : '#FFFFFF',
            borderColor: isAccent
              ? isDark ? 'rgba(255, 138, 61, 0.4)' : 'rgba(194, 65, 12, 0.4)'
              : isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            ...(isAndroid
              ? {
                  elevation: 1.5,
                  shadowColor: '#000000',
                }
              : {
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1.5 },
                  shadowOpacity: isDark ? 0.25 : 0.05,
                  shadowRadius: 3,
                }),
          }}
        >
          {/* Circular Count Badge (e.g. "1") on Top-Right Corner */}
          {badge && isNumericBadge ? (
            <View
              style={badgeColor ? { backgroundColor: badgeColor } : undefined}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive border-2 border-card items-center justify-center z-20 shadow-xs"
            >
              <Text className="text-[9.5px] font-bold text-destructive-foreground font-sans leading-none">
                {badge}
              </Text>
            </View>
          ) : badge ? (
            /* Pill Text Badge (e.g. "New", "FAST") Anchored to Top */
            <View
              style={badgeColor ? { backgroundColor: badgeColor } : undefined}
              className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-primary items-center justify-center z-20 shadow-xs"
            >
              <Text className="text-[8px] font-black font-sans text-primary-foreground tracking-wider uppercase leading-none">
                {badge}
              </Text>
            </View>
          ) : showArrow ? (
            <View className="absolute top-1 right-1 w-4 h-4 rounded-full bg-secondary items-center justify-center border border-border/40 z-10">
              <ArrowUpRight size={9} className="text-muted-foreground" />
            </View>
          ) : null}

          {/* Centered Line Icon */}
          <View className="items-center justify-center">
            {icon}
          </View>
        </View>

        {/* Clean Label Container Below Squircle */}
        <View className="w-full mt-1.5 min-h-[30px] justify-start items-center px-0.5">
          <Text
            numberOfLines={2}
            style={language === 'ar' ? { fontSize: 11, lineHeight: 14 } : undefined}
            className="text-[11.5px] font-medium font-sans text-foreground text-center leading-[14px] tracking-tight"
          >
            {translatedLabel}
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );
};

export default ActionTile;
