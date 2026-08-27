import React from 'react';
import { View, Image, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface NahomBrandLogoProps {
  size?: number;
}

// 1. Top Gated Community Network Emblem Illustration (100% Transparent Background)
export const NahomEmblem: React.FC<NahomBrandLogoProps> = ({ size = 140 }) => {
  const height = size * 0.674; // 465 / 690 aspect ratio
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

// 2. NAHOM App Name Graphic (100% Transparent Background)
export const NahomTitle: React.FC<{ width?: number }> = ({ width }) => {
  const TITLE_WIDTH = width || Math.min(SCREEN_WIDTH - 100, 205);
  const TITLE_HEIGHT = TITLE_WIDTH * 0.209; // 140 / 670 aspect ratio

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

// 3. Brand Abbreviation (NEXUS AROUND HOME - 100% Transparent Background with generous breathing space)
export const NahomAbbreviation: React.FC<{ width?: number }> = ({ width }) => {
  const ABBR_WIDTH = width || Math.min(SCREEN_WIDTH - 100, 205);
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

// 4. Slogan (—— CONNECTED HARMONY —— - Full display with ample height)
export const NahomSlogan: React.FC<{ width?: number }> = ({ width }) => {
  const SLOGAN_WIDTH = width || Math.min(SCREEN_WIDTH - 80, 225);
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
export const NahomWordmark: React.FC = () => {
  return (
    <View className="items-center justify-center self-center mt-3 bg-transparent">
      {/* App Name */}
      <NahomTitle />

      {/* Space between App Name and Abbreviation */}
      <View className="mt-2.5">
        <NahomAbbreviation />
      </View>

      {/* Space between Abbreviation and Slogan */}
      <View className="mt-3">
        <NahomSlogan />
      </View>
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

// 7. Subtle Bottom 4 Feature Trust Badges (SECURE, CONNECTED, CONVENIENT, ALERT - Transparent)
export const NahomTrustBadges: React.FC = () => {
  const BADGES_WIDTH = Math.min(SCREEN_WIDTH - 120, 210);
  const BADGES_HEIGHT = BADGES_WIDTH * 0.228;

  return (
    <View className="items-center justify-center self-center opacity-80 bg-transparent">
      <Image
        source={require('../../assets/images/nahom_badges.png')}
        style={{
          width: BADGES_WIDTH,
          height: BADGES_HEIGHT,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

export default NahomBrandLogo;
