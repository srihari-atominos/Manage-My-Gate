import React from 'react';
import { View, Text as RNText, Image, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface NahomHouseHProps {
  width?: number;
  height?: number;
  color?: string;
  windowColor?: string;
}

// Custom House Symbol H for NAHOM typography
export const NahomHouseH: React.FC<NahomHouseHProps> = ({
  width = 26,
  height = 30,
  color = '#FF7A1A',
  windowColor = '#FFFFFF',
}) => {
  return (
    <View
      style={{
        width,
        height,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.75,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Svg
        width={width}
        height={height}
        viewBox="0 0 32 36"
        fill="none"
      >
      {/* Pitched House Roof with Overhang Eaves */}
      <Path
        d="M 3 13 L 16 3 L 29 13"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Stem of H */}
      <Path
        d="M 6.5 13 L 6.5 33"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* Right Stem of H */}
      <Path
        d="M 25.5 13 L 25.5 33"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* Horizontal Crossbar of H */}
      <Path
        d="M 6.5 25 L 25.5 25"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* 4-Pane Window inside Gable */}
      <Rect x="12" y="11" width="3.2" height="3.2" rx="0.5" fill={windowColor} />
      <Rect x="16.8" y="11" width="3.2" height="3.2" rx="0.5" fill={windowColor} />
      <Rect x="12" y="15.8" width="3.2" height="3.2" rx="0.5" fill={windowColor} />
      <Rect x="16.8" y="15.8" width="3.2" height="3.2" rx="0.5" fill={windowColor} />
    </Svg>
    </View>
  );
};

// Premium NAHOM App Name: N (Orange), A (White), H (Orange House), O (White), M (Orange)
export const NahomThemedTitle: React.FC<{
  fontSize?: number;
  variant?: 'standard' | 'house';
  textColor?: string;
  orangeColor?: string;
}> = ({
  fontSize = 28,
  variant = 'house',
  textColor = '#FFFFFF',
  orangeColor = '#FF8C1A',
}) => {
  const houseWidth = Math.round(fontSize * (26 / 26));
  const houseHeight = Math.round(fontSize * (29 / 26));
  const lineHeight = Math.round(fontSize * 1.3);
  const letterSpacing = 3;

  const shadowStyle = {
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  };

  return (
    <View
      className="flex-row items-center justify-center"
      style={{ height: lineHeight + 4, paddingVertical: 2 }}
      accessibilityRole="text"
      accessibilityLabel="NAHOM"
    >
      {/* N - Orange */}
      <RNText
        style={{
          color: orangeColor,
          fontSize: fontSize,
          fontWeight: '800',
          lineHeight: lineHeight,
          letterSpacing: letterSpacing,
          includeFontPadding: false,
          ...shadowStyle,
        }}
      >
        N
      </RNText>

      {/* A - White */}
      <RNText
        style={{
          color: textColor,
          fontSize: fontSize,
          fontWeight: '800',
          lineHeight: lineHeight,
          letterSpacing: letterSpacing,
          includeFontPadding: false,
          ...shadowStyle,
        }}
      >
        A
      </RNText>

      {/* H - house symbol - Orange color */}
      {variant === 'house' ? (
        <View style={{ marginHorizontal: 2, marginBottom: 1 }}>
          <NahomHouseH width={houseWidth} height={houseHeight} color={orangeColor} windowColor="#FFFFFF" />
        </View>
      ) : (
        <RNText
          style={{
            color: orangeColor,
            fontSize: fontSize,
            fontWeight: '800',
            lineHeight: lineHeight,
            letterSpacing: letterSpacing,
            includeFontPadding: false,
            ...shadowStyle,
          }}
        >
          H
        </RNText>
      )}

      {/* O - White */}
      <RNText
        style={{
          color: textColor,
          fontSize: fontSize,
          fontWeight: '800',
          lineHeight: lineHeight,
          letterSpacing: letterSpacing,
          includeFontPadding: false,
          ...shadowStyle,
        }}
      >
        O
      </RNText>

      {/* M - Orange */}
      <RNText
        style={{
          color: orangeColor,
          fontSize: fontSize,
          fontWeight: '800',
          lineHeight: lineHeight,
          letterSpacing: 0,
          includeFontPadding: false,
          ...shadowStyle,
        }}
      >
        M
      </RNText>
    </View>
  );
};

export interface NahomBrandLogoProps {
  size?: number;
  enableSweep?: boolean;
}

// 1. Top 3D Modern Emblem (Clean Luxury Presentation with Zero UI Bleeding)
export const NahomEmblem: React.FC<NahomBrandLogoProps> = ({
  size = 104,
}) => {
  const height = Math.round(size * (573 / 545)); // exact 573 / 545 aspect ratio

  return (
    <View
      style={{
        width: size,
        height: height,
      }}
      className="items-center justify-center self-center bg-transparent"
    >
      <Image
        source={require('../../assets/images/nahom_emblem.png')}
        style={{
          width: size,
          height: height,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

// 2. NAHOM App Name Graphic (Original Typography - 100% Transparent Background)
export const NahomTitle: React.FC<{ width?: number }> = ({ width }) => {
  const TITLE_WIDTH = width || Math.min(SCREEN_WIDTH - 80, 215);
  const TITLE_HEIGHT = Math.round(TITLE_WIDTH * (117 / 703)); // exact 117 / 703 aspect ratio

  return (
    <View className="items-center justify-center self-center bg-transparent">
      <Image
        source={require('../../assets/images/nahom_title.png')}
        style={{
          width: TITLE_WIDTH,
          height: TITLE_HEIGHT,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

// 3. Brand Abbreviation (NEXUS AROUND HOME - 100% Transparent Background)
export const NahomAbbreviation: React.FC<{ width?: number }> = ({ width }) => {
  const ABBR_WIDTH = width || Math.min(SCREEN_WIDTH - 140, 168);
  const ABBR_HEIGHT = ABBR_WIDTH * 0.0764; // 55 / 720 aspect ratio

  return (
    <View className="items-center justify-center self-center bg-transparent">
      <Image
        source={require('../../assets/images/nahom_abbreviation.png')}
        style={{
          width: ABBR_WIDTH,
          height: ABBR_HEIGHT,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

// 4. Slogan (—— CONNECTED HARMONY ——)
export const NahomSlogan: React.FC<{ width?: number }> = ({ width }) => {
  const SLOGAN_WIDTH = width || Math.min(SCREEN_WIDTH - 120, 185);
  const SLOGAN_HEIGHT = SLOGAN_WIDTH * 0.0903; // 65 / 720 aspect ratio

  return (
    <View className="items-center justify-center self-center bg-transparent">
      <Image
        source={require('../../assets/images/nahom_slogan.png')}
        style={{
          width: SLOGAN_WIDTH,
          height: SLOGAN_HEIGHT,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

// 5. Unified Wordmark with Balanced Vertical Spacing
export const NahomWordmark: React.FC<{ width?: number; showSubtext?: boolean; marginTop?: number }> = ({
  width,
  showSubtext = false,
  marginTop = 0,
}) => {
  return (
    <View style={{ marginTop }} className="items-center justify-center self-center bg-transparent">
      {/* App Name & Graphic Lockup */}
      <NahomTitle width={width} />

      {/* Optional subtext */}
      {showSubtext && (
        <>
          <View className="mt-1">
            <NahomAbbreviation />
          </View>
          <View className="mt-1.5">
            <NahomSlogan />
          </View>
        </>
      )}
    </View>
  );
};

// 6. Full Brand Logo
export const NahomBrandLogo: React.FC<NahomBrandLogoProps> = ({ size = 140 }) => {
  return (
    <View className="items-center justify-center self-center bg-transparent">
      <NahomEmblem size={size} />
      <NahomWordmark />
    </View>
  );
};

import { ShieldCheck, Wifi, Sparkles, BellRing } from 'lucide-react-native';
import { Text } from '@/components/ui/text';

// 7. Compact Jumping / Juggling Multi-Color Bottom 4 Feature Trust Badges
export const NahomTrustBadges: React.FC = () => {
  const jump1 = React.useRef(new Animated.Value(0)).current;
  const jump2 = React.useRef(new Animated.Value(0)).current;
  const jump3 = React.useRef(new Animated.Value(0)).current;
  const jump4 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const createHop = (anim: Animated.Value) => {
      return Animated.sequence([
        Animated.timing(anim, {
          toValue: -4.5,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(anim, {
          toValue: 0,
          friction: 4,
          tension: 65,
          useNativeDriver: true,
        }),
      ]);
    };

    const juggleLoop = Animated.loop(
      Animated.sequence([
        createHop(jump1),
        createHop(jump2),
        createHop(jump3),
        createHop(jump4),
        Animated.delay(1000), // breath between juggle waves
      ])
    );

    juggleLoop.start();

    return () => juggleLoop.stop();
  }, []);

  return (
    <View className="bg-white/95 dark:bg-[#111827]/95 px-2.5 py-1.5 rounded-full border border-white/80 dark:border-white/20 shadow-xs flex-row items-center justify-between w-full max-w-[305px] self-center">
      {/* SECURE */}
      <Animated.View
        style={{ transform: [{ translateY: jump1 }] }}
        className="flex-row items-center gap-1"
      >
        <View className="size-4.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 items-center justify-center p-0.5">
          <ShieldCheck size={10} color="#059669" strokeWidth={2.5} />
        </View>
        <Text className="text-[8.5px] font-black text-[#059669] dark:text-[#34D399] tracking-tight uppercase">
          Secure
        </Text>
      </Animated.View>

      <View className="h-3 w-px bg-border/80" />

      {/* CONNECTED */}
      <Animated.View
        style={{ transform: [{ translateY: jump2 }] }}
        className="flex-row items-center gap-1"
      >
        <View className="size-4.5 rounded-full bg-blue-500/15 dark:bg-blue-500/25 items-center justify-center p-0.5">
          <Wifi size={10} color="#2563EB" strokeWidth={2.5} />
        </View>
        <Text className="text-[8.5px] font-black text-[#2563EB] dark:text-[#60A5FA] tracking-tight uppercase">
          Connected
        </Text>
      </Animated.View>

      <View className="h-3 w-px bg-border/80" />

      {/* CONVENIENT */}
      <Animated.View
        style={{ transform: [{ translateY: jump3 }] }}
        className="flex-row items-center gap-1"
      >
        <View className="size-4.5 rounded-full bg-amber-500/15 dark:bg-amber-500/25 items-center justify-center p-0.5">
          <Sparkles size={10} color="#D97706" strokeWidth={2.5} />
        </View>
        <Text className="text-[8.5px] font-black text-[#D97706] dark:text-[#FBBF24] tracking-tight uppercase">
          Convenient
        </Text>
      </Animated.View>

      <View className="h-3 w-px bg-border/80" />

      {/* ALERT */}
      <Animated.View
        style={{ transform: [{ translateY: jump4 }] }}
        className="flex-row items-center gap-1"
      >
        <View className="size-4.5 rounded-full bg-rose-500/15 dark:bg-rose-500/25 items-center justify-center p-0.5">
          <BellRing size={10} color="#E11D48" strokeWidth={2.5} />
        </View>
        <Text className="text-[8.5px] font-black text-[#E11D48] dark:text-[#FB7185] tracking-tight uppercase">
          Alert
        </Text>
      </Animated.View>
    </View>
  );
};

export default NahomBrandLogo;
