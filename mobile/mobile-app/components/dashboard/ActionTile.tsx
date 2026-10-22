import React from 'react';
import { View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Text } from '../ui/text';
import { ArrowUpRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation, default as i18n } from '../../src/utils/i18n';
import { useColorScheme } from 'nativewind';

export type SmartCardStatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SmartCardStatusBadge {
  label: string;
  variant?: SmartCardStatusVariant;
  dot?: boolean;
}

export interface ActionTileProps {
  icon: React.ReactNode;
  iconIsImage?: boolean;
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
  compact?: boolean;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  iconIsImage = false,
  label,
  subtitle,
  metaValue,
  onPress,
  badge,
  badgeColor,
  iconBgColor,
  iconShapeClass,
  containerClassName = 'w-[31.6%]',
  showArrow = false,
  isAccent = false,
  accentBg,
  compact = false,
}) => {
  const { translateText, language } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isAndroid = Platform.OS === 'android';
  const { width: screenWidth } = useWindowDimensions();
  const isNarrowScreen = screenWidth <= 350;
  const iconBoxSize = compact ? (isNarrowScreen ? 52 : 58) : (isNarrowScreen ? 64 : 70);
  const iconBoxRadius = compact ? 14 : 18;
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

  return (
    <View className={`items-center justify-start ${containerClassName}`}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ alignItems: 'center', width: '100%' }}
        accessibilityRole="button"
        accessibilityLabel={`${translatedLabel}${translatedSubtitle ? ` ${translatedSubtitle}` : ''}`}>
        <Animated.View style={[animatedStyle, { alignItems: 'center', width: '100%' }]}>
          {/* Squircle Icon Box */}
          <View
            style={{
              width: iconBoxSize,
              height: iconBoxSize,
              borderRadius: iconBoxRadius,
              backgroundColor: iconIsImage
                ? 'transparent'
                : isAccent
                ? accentBg || (isDark ? '#FF7B3D' : '#FF7A3D')
                : isDark
                  ? '#1C1C20'
                  : '#FFFFFF',
              borderColor: iconIsImage
                ? 'transparent'
                : isAccent
                ? isDark
                  ? 'rgba(255, 106, 0, 0.4)'
                  : 'rgba(234, 88, 12, 0.4)'
                : isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(234, 88, 12, 0.12)',
              borderWidth: iconIsImage ? 0 : 1,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              ...(iconIsImage
                ? {}
                : isAndroid
                ? {
                    elevation: compact ? 1.5 : 2,
                    shadowColor: '#000000',
                  }
                : {
                    shadowColor: isDark ? '#000000' : '#EA580C',
                    shadowOffset: { width: 0, height: compact ? 1.5 : 2 },
                    shadowOpacity: isDark ? 0.35 : 0.08,
                    shadowRadius: compact ? 4 : 5,
                  }),
            }}>
            {badge ? (
              <View
                style={{
                  position: 'absolute',
                  top: compact ? -3 : -4,
                  right: compact ? -3 : -4,
                  backgroundColor: badgeColor || '#EA580C',
                  paddingHorizontal: compact ? 4 : 5,
                  paddingVertical: 1,
                  borderRadius: compact ? 6 : 8,
                  zIndex: 20,
                }}>
                <Text style={{ fontSize: compact ? 8.5 : 9.5, fontWeight: '700', color: '#FFFFFF' }}>{badge}</Text>
              </View>
            ) : null}

            {showArrow ? (
              <View className={`absolute right-1 top-1 z-10 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} items-center justify-center rounded-full border border-border/40 bg-secondary`}>
                <ArrowUpRight size={compact ? 8 : 9} className="text-muted-foreground" />
              </View>
            ) : null}

            {/* Centered feature icon or image */}
            <View className="items-center justify-center">{icon}</View>
          </View>

          {/* Clean Label Container Below Squircle */}
          <View
            className={`${compact ? 'mt-1.5' : 'mt-2'} w-full ${
              compact
                ? isNarrowScreen ? 'min-h-[28px]' : 'min-h-[30px]'
                : isNarrowScreen ? 'min-h-[36px]' : 'min-h-[38px]'
            } items-center justify-start px-0.5`}>
            <Text
              numberOfLines={2}
              style={
                language === 'ar'
                  ? {
                      fontSize: compact ? (isNarrowScreen ? 10.5 : 11) : (isNarrowScreen ? 12 : 12.5),
                      lineHeight: compact ? (isNarrowScreen ? 13.5 : 14) : (isNarrowScreen ? 16 : 17),
                    }
                  : isNarrowScreen
                    ? {
                        fontSize: compact ? 10.5 : 13,
                        lineHeight: compact ? 13.5 : 17,
                      }
                    : compact
                      ? {
                          fontSize: 11.5,
                          lineHeight: 14.5,
                        }
                      : undefined
              }
              className={`text-center font-sans tracking-tight text-foreground ${
                compact ? 'font-bold text-[11.5px] leading-[14.5px]' : 'font-extrabold text-[14px] leading-[18px]'
              }`}>
              {translatedLabel}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default ActionTile;
