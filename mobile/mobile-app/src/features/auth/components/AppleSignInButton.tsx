import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Text, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { AppleIcon } from '@/components/auth/SocialAuthButton';

import { useColorScheme } from 'nativewind';

export function AppleSignInButton() {
  const { loading } = useAuth();
  const { colorScheme } = useColorScheme();

  const handlePress = () => {
    Alert.alert(
      'Apple ID Sign-In',
      'Apple Sign-In is not configured yet. Please sign in using your Email/Password or Phone OTP.'
    );
  };

  return (
    <Button
      className="h-12 w-full rounded-xl flex-row items-center justify-center bg-black dark:bg-white border border-border px-3"
      onPress={handlePress}
      disabled={loading}
      loading={loading}
    >
      <AppleIcon size={18} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
      <Text className="text-white dark:text-black font-semibold text-sm ms-2">
        Apple
      </Text>
    </Button>
  );
}

export default AppleSignInButton;
