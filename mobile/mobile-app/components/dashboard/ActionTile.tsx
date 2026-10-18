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
  iconBgColor,
  iconShapeClass,
  containerClassName = 'w-[31.6%]',
  showArrow = false,
  isAccent = false,
  accentBg,
}) => {
  const { translateText, language } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isAndroid = Platform.OS === 'android';
  const { width: screenWidth } = useWindowDimensions();
  const isNarrowScreen = screenWidth <= 350;
  const iconBoxSize = isNarrowScreen ? 64 : 70;
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
              borderRadius: 18,
              backgroundColor: isAccent
                ? accentBg || (isDark ? '#FF7B3D' : '#FF7A3D')
                : isDark
                  ? '#1C1C20'
                  : '#FFFFFF',
              borderColor: isAccent
                ? isDark
                  ? 'rgba(255, 106, 0, 0.4)'
                  : 'rgba(234, 88, 12, 0.4)'
                : isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(234, 88, 12, 0.12)',
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              ...(isAndroid
                ? {
                    elevation: 2,
                    shadowColor: '#000000',
                  }
                : {
                    shadowColor: isDark ? '#000000' : '#EA580C',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.35 : 0.08,
                    shadowRadius: 5,
                  }),
            }}>
            {showArrow ? (
              <View className="absolute right-1 top-1 z-10 h-4 w-4 items-center justify-center rounded-full border border-border/40 bg-secondary">
                <ArrowUpRight size={9} className="text-muted-foreground" />
              </View>
            ) : null}

            {/* Centered Line Icon */}
            <View className="items-center justify-center">{icon}</View>
          </View>

          {/* Clean Label Container Below Squircle */}
          <View
            className={`mt-2 w-full ${isNarrowScreen ? 'min-h-[36px]' : 'min-h-[38px]'} items-center justify-start px-0.5`}>
            <Text
              numberOfLines={2}
              style={
                language === 'ar'
                  ? { fontSize: isNarrowScreen ? 12 : 12.5, lineHeight: isNarrowScreen ? 16 : 17 }
                  : isNarrowScreen
                    ? { fontSize: 13, lineHeight: 17 }
                    : undefined
              }
              className="text-center font-extrabold font-sans text-[14px] leading-[18px] tracking-tight text-foreground">
              {translatedLabel}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default ActionTile;
