import React from 'react';
import { View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Text } from '../ui/text';
import { ArrowUpRight } from 'lucide-react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from '../../src/utils/i18n';
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

  // Detect grid density (4-column vs 3-column)
  const isFourColumn =
    containerClassName.includes('23') ||
    containerClassName.includes('24') ||
    containerClassName.includes('w-1/4');

  // Adaptive squircle dimensions based on screen width and column density
  const isNarrowScreen = screenWidth <= 375;
  const isLargeScreen = screenWidth >= 420;

  const iconBoxSize = isFourColumn
    ? isNarrowScreen
      ? 54
      : isLargeScreen
        ? 62
        : 58
    : isNarrowScreen
      ? 62
      : isLargeScreen
        ? 70
        : 66;

  // Single UI-thread shared value (0 = raised, 1 = pressed) drives both the tile
  // and its icon using transform-only styles; no layout or shadow animation.
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(pressed.value, [0, 1], [0, 1], Extrapolation.CLAMP) },
      { scale: interpolate(pressed.value, [0, 1], [1, 0.95], Extrapolation.CLAMP) },
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.92], Extrapolation.CLAMP) }],
  }));

  const handlePressIn = () => {
    if (!reduceMotion) {
      pressed.value = withTiming(1, { duration: 80 });
    }
  };

  const handlePressOut = () => {
    if (!reduceMotion) {
      pressed.value = withTiming(0, { duration: 140 });
    }
  };

  const displaySubtitle = metaValue || subtitle;
  const translatedLabel = translateText(label);
  const translatedSubtitle = displaySubtitle ? translateText(displaySubtitle) : '';

  // Responsive single-line font size computation so all titles fit on the exact same line
  const isLong = translatedLabel.length > 12;
  const isMedium = translatedLabel.length > 9;
  const singleLineFontSize = isFourColumn
    ? isLong
      ? 10
      : isMedium
        ? 10.5
        : 11.5
    : isLong
      ? 11.5
      : 12.5;

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
              borderRadius: isFourColumn ? 16 : 18,
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
              // Subtle raised lip; fixed-size box so layout is unchanged.
              borderBottomWidth: 2,
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

            {/* Centered Line Icon with proportional sizing */}
            <Animated.View className="items-center justify-center" style={iconAnimatedStyle}>
              {icon}
            </Animated.View>
          </View>

          {/* Label Container: Strictly 1 line without wrapping to the next line */}
          <View className="mt-1.5 w-full items-center justify-center px-0.5">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={isFourColumn ? 0.65 : 0.62}
              style={[
                {
                  fontSize: singleLineFontSize,
                  lineHeight: singleLineFontSize + 3,
                  textAlign: 'center',
                  ...(Platform.OS === 'web'
                    ? {
                        whiteSpace: 'nowrap' as any,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'keep-all',
                      }
                    : {}),
                },
                language === 'ar'
                  ? { fontSize: Math.max(singleLineFontSize, 10.5) }
                  : undefined,
              ]}
              className="w-full text-center font-bold tracking-tight text-foreground">
              {translatedLabel}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default ActionTile;
