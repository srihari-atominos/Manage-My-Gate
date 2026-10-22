import * as React from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { AppleIcon } from '@/components/auth/SocialAuthButton';
import { useAppleAuthSession } from '../hooks/useAppleAuthSession';
import { AppLoader } from '@/components/ui/AppLoader';

export interface AppleSignInButtonProps {
  inviteToken?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  variant?: 'full' | 'compact' | 'glass' | 'navy';
  className?: string;
  style?: any;
}

export function AppleSignInButton(props: AppleSignInButtonProps = {}) {
  const { disabled = false, variant = 'glass', className = '', style, ...authOptions } = props;
  const { handleAppleSignIn, loading, isAvailable } = useAppleAuthSession(authOptions);
  const isNavy = variant === 'navy';
  const isCompact = variant === 'compact';
  const buttonHeight = isNavy ? 52 : isCompact ? 42 : 48;
  const buttonRadius = isCompact ? 21 : 28;
  const iconSize = isCompact ? 18 : 20;
  const fontSize = isCompact ? 13.5 : 14.5;
  const isDisabled = disabled || loading;

  // Keep the entry point visible on every platform. Only supported iOS
  // devices render Apple's native control; other devices receive a notice.
  if (Platform.OS !== 'ios' || !isAvailable) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign in with Apple"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={() => void handleAppleSignIn()}
        style={[
          isNavy
            ? {
                height: buttonHeight,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                borderColor: 'rgba(255, 255, 255, 0.22)',
                borderWidth: 1.2,
                borderRadius: buttonRadius,
              }
            : {
                height: buttonHeight,
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderWidth: 1.2,
                borderRadius: buttonRadius,
                shadowColor: '#64748B',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
              },
          style,
        ]}
        className={`w-full flex-row items-center justify-center gap-2 rounded-full px-3 ${isDisabled ? 'opacity-60' : ''} ${className}`}
      >
        <AppleIcon size={iconSize} color={isNavy ? '#FFFFFF' : '#0F172A'} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={!isNavy}
          minimumFontScale={0.8}
          style={{
            color: isNavy ? '#FFFFFF' : '#0F172A',
            fontSize,
            fontWeight: '600',
            flexShrink: 1,
            lineHeight: 18,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}
          className="text-sm font-semibold text-center"
        >
          {variant === 'full' ? 'Sign in with Apple' : 'Apple'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      pointerEvents={isDisabled ? 'none' : 'auto'}
      style={[
        {
          height: buttonHeight,
          borderRadius: buttonRadius,
          borderColor: isNavy ? 'rgba(255, 255, 255, 0.22)' : undefined,
          borderWidth: isNavy ? 1.2 : 0,
          backgroundColor: isNavy ? 'rgba(0, 0, 0, 0.45)' : undefined,
        },
        style,
      ]}
      className={`w-full flex-1 overflow-hidden rounded-full ${isDisabled ? 'opacity-60' : ''} ${className}`}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={isNavy ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={buttonRadius}
        style={{ width: '100%', height: buttonHeight, opacity: loading ? 0.6 : 1 }}
        onPress={() => {
          if (!isDisabled) void handleAppleSignIn();
        }}
      />
      {loading ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <AppLoader variant="inline" />
        </View>
      ) : null}
    </View>
  );
}

export default AppleSignInButton;
