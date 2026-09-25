import * as React from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAppleAuthSession } from '../hooks/useAppleAuthSession';

export interface AppleSignInButtonProps {
  inviteToken?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function AppleSignInButton(props: AppleSignInButtonProps = {}) {
  const { handleAppleSignIn, loading, isAvailable } = useAppleAuthSession(props);

  // Apple only permits this native control on iOS. Android keeps its complete,
  // native auth experience without exposing a button that cannot complete.
  if (Platform.OS !== 'ios' || !isAvailable) return null;

  return (
    <View className="h-12 w-full overflow-hidden rounded-xl bg-black">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={{ width: '100%', height: 48, opacity: loading ? 0.6 : 1 }}
        onPress={handleAppleSignIn}
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
