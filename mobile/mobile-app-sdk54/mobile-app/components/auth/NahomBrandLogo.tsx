import React from 'react';
import { View, Image, Dimensions, Animated, Easing } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface NahomBrandLogoProps {
  size?: number;
}

// 1. Top Gated Community Network Emblem Illustration (100% Transparent Background)
export const NahomEmblem: React.FC<NahomBrandLogoProps> = ({ size = 120 }) => {
  const height = size * 0.615; // 557 / 905 aspect ratio
  return (
    <View className="items-center justify-center self-center bg-transparent">
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

// 2. NAHOM App Name Graphic (100% Transparent Background - Charcoal & Vibrant Orange Brand)
export const NahomTitle: React.FC<{ width?: number }> = ({ width }) => {
  const TITLE_WIDTH = width || Math.min(SCREEN_WIDTH - 80, 220);
  const TITLE_HEIGHT = TITLE_WIDTH * 0.165; // 123 / 745 aspect ratio

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
export const NahomWordmark: React.FC<{ width?: number; showSubtext?: boolean }> = ({
  width,
  showSubtext = false,
}) => {
  return (
    <View className="items-center justify-center self-center mt-2 bg-transparent">
      {/* App Name & Graphic Lockup */}
      <NahomTitle width={width} />

      {/* Optional subtext */}
      {showSubtext && (
        <>
          <View className="mt-1.5">
            <NahomAbbreviation />
          </View>
          <View className="mt-2">
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
