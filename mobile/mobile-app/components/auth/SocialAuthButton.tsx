import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme, Modal } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface SocialAuthButtonProps {
  provider: 'google' | 'apple';
  onPress?: () => void;
  variant?: 'full' | 'compact';
  className?: string;
}

export const GoogleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

export const AppleIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color,
}) => {
  const isDark = useColorScheme() === 'dark';
  const fillColor = color || (isDark ? '#FFFFFF' : '#0F172A');

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor}>
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.93.04-2.02.63-2.67 1.38-.56.65-1.06 1.71-.93 2.74 1.04.08 2.07-.5 2.68-1.25z" />
    </Svg>
  );
};

export const SocialAuthButton = ({
  provider,
  onPress,
  variant = 'compact',
  className = '',
}: SocialAuthButtonProps) => {
  const [modalVisible, setModalVisible] = React.useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  const isGoogle = provider === 'google';
  const providerName = isGoogle ? 'Google' : 'Apple';

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.82}
        className={`flex-1 h-12 bg-white dark:bg-[#1E232E] border border-border/90 rounded-2xl flex-row items-center justify-center gap-2.5 shadow-xs active:bg-muted/40 ${className}`}
      >
        {isGoogle ? <GoogleIcon size={19} /> : <AppleIcon size={19} />}
        <Text className="text-xs font-bold text-slate-800 dark:text-white font-sans">
          {variant === 'full' ? `Sign in with ${providerName}` : providerName}
        </Text>
      </TouchableOpacity>

      {/* Themed Notice Popup Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-card border border-border/80 rounded-3xl p-6 items-center max-w-xs w-full shadow-2xl gap-3">
            {/* Icon Container */}
            <View className="w-14 h-14 rounded-2xl bg-muted/60 dark:bg-muted/30 items-center justify-center border border-border/80 shadow-xs">
              {isGoogle ? <GoogleIcon size={28} /> : <AppleIcon size={28} />}
            </View>

            {/* Title */}
            <Text className="text-base font-bold text-foreground text-center font-sans">
              {isGoogle ? 'Google OAuth' : 'Apple Sign-In'}
            </Text>

            {/* Description */}
            <Text className="text-xs text-muted-foreground text-center leading-relaxed font-sans px-1">
              {isGoogle
                ? 'Google OAuth is not integrated yet. Please sign in using your Email/Password or Phone OTP.'
                : 'Apple Sign-In is not integrated yet. Please sign in using your Email/Password or Phone OTP.'}
            </Text>

            {/* Dismiss CTA Button */}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              activeOpacity={0.85}
              className="mt-2 w-full h-11 bg-[#FF5E00] active:bg-[#E65100] rounded-xl items-center justify-center shadow-xs"
            >
              <Text className="font-bold text-white text-xs font-sans">
                Understood
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SocialAuthButton;
