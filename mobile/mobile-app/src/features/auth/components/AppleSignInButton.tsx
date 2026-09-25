import * as React from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { useAppleAuthSession } from '../hooks/useAppleAuthSession';

export interface AppleSignInButtonProps {
  inviteToken?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function AppleSignInButton(props: AppleSignInButtonProps = {}) {
  const { disabled = false, ...authOptions } = props;
  const { handleAppleSignIn, loading, isAvailable } = useAppleAuthSession(authOptions);

  // Apple provides its approved system control on iOS. Android and web still
  // show a standards-compliant Apple entry point so the auth choice is never
  // silently removed from a mobile preview. Their press handler explains the
  // required Services ID setup until the hosted Apple OAuth flow is enabled.
  if (Platform.OS !== 'ios' || !isAvailable) {
    return (
      <SocialAuthButton
        provider="apple"
        variant="full"
        onPress={handleAppleSignIn}
        loading={loading}
        disabled={disabled || loading}
      />
    );
  }

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      className={`h-12 w-full overflow-hidden rounded-xl ${disabled ? 'opacity-60' : ''}`}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={12}
        style={{ width: '100%', height: 48, opacity: loading ? 0.6 : 1 }}
        onPress={() => {
          if (!disabled) void handleAppleSignIn();
        }}
      />
      {loading ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

export default AppleSignInButton;
