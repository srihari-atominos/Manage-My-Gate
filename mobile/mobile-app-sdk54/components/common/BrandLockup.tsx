import React from 'react';
import { View, Image, Text, StyleProp, ViewStyle } from 'react-native';

export type BrandLockupVariant = 'horizontal' | 'vertical';
export type BrandLockupSize = 'compact' | 'default' | 'large';

export interface BrandLockupProps {
  variant?: BrandLockupVariant;
  size?: BrandLockupSize;
  showTagline?: boolean;
  inverted?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({
  variant = 'horizontal',
  size = 'default',
  showTagline = false,
  inverted = false,
  style,
  className = '',
}) => {
  // Dimension & typography configurations
  const dimensions = React.useMemo(() => {
    switch (size) {
      case 'compact':
        return {
          emblemWidth: variant === 'horizontal' ? 26 : 48,
          titleSize: variant === 'horizontal' ? 16 : 18,
          taglineSize: 9,
          gap: variant === 'horizontal' ? 8 : 4,
        };
      case 'large':
        return {
          emblemWidth: variant === 'horizontal' ? 44 : 96,
          titleSize: variant === 'horizontal' ? 26 : 30,
          taglineSize: 11,
          gap: variant === 'horizontal' ? 12 : 8,
        };
      case 'default':
      default:
        return {
          emblemWidth: variant === 'horizontal' ? 34 : 70,
          titleSize: variant === 'horizontal' ? 20 : 24,
          taglineSize: 10,
          gap: variant === 'horizontal' ? 10 : 6,
        };
    }
  }, [size, variant]);

  const emblemHeight = dimensions.emblemWidth * 0.615;

  const textColorClass = inverted
    ? 'text-white'
    : 'text-[#1E232E] dark:text-white';

  const taglineColorClass = inverted
    ? 'text-orange-200/90'
    : 'text-[#FF5E00] dark:text-orange-400';

  if (variant === 'vertical') {
    return (
      <View
        style={style}
        className={`items-center justify-center ${className}`}
      >
        {/* Unified Monogram / Emblem */}
        <Image
          source={require('../../assets/images/nahom_emblem.png')}
          style={{
            width: dimensions.emblemWidth,
            height: emblemHeight,
          }}
          resizeMode="contain"
        />

        {/* Unified NAHOM Wordmark Header */}
        <View style={{ marginTop: dimensions.gap }} className="items-center justify-center">
          <Text
            style={{ fontSize: dimensions.titleSize, letterSpacing: 1.5 }}
            className={`font-black font-sans leading-tight ${textColorClass} uppercase`}
          >
            NAH<Text className="text-[#FF5E00]">O</Text>M
          </Text>

          {showTagline && (
            <View className="items-center mt-1">
              <Text
                style={{ fontSize: dimensions.taglineSize, letterSpacing: 0.8 }}
                className={`font-bold font-sans text-center ${taglineColorClass} uppercase`}
              >
                Nexus Around Home
              </Text>
              <Text
                style={{ fontSize: dimensions.taglineSize * 0.9, letterSpacing: 0.5 }}
                className="font-semibold font-sans text-center text-muted-foreground mt-0.5"
              >
                Connected Harmony & Security
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Horizontal Lockup (Monogram + Wordmark Lockup side-by-side)
  return (
    <View
      style={style}
      className={`flex-row items-center ${className}`}
    >
      <Image
        source={require('../../assets/images/nahom_emblem.png')}
        style={{
          width: dimensions.emblemWidth,
          height: emblemHeight,
        }}
        resizeMode="contain"
      />

      <View style={{ marginLeft: dimensions.gap }} className="justify-center">
        <Text
          style={{ fontSize: dimensions.titleSize, letterSpacing: 1.2 }}
          className={`font-black font-sans leading-none ${textColorClass} uppercase`}
        >
          NAH<Text className="text-[#FF5E00]">O</Text>M
        </Text>

        {showTagline && (
          <Text
            style={{ fontSize: dimensions.taglineSize, letterSpacing: 0.4 }}
            className={`font-bold font-sans ${taglineColorClass} mt-0.5 uppercase`}
          >
            Nexus Around Home
          </Text>
        )}
      </View>
    </View>
  );
};

export default BrandLockup;
