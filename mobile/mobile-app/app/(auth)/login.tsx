import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '../../components/layout/SafeAreaWrapper';
import { KeyboardAvoidingShell } from '../../components/layout/KeyboardAvoidingShell';
import { Typography } from '../../components/layout/Typography';
import { TextInput } from '../../components/forms/TextInput';
import { PasswordInput } from '../../components/forms/PasswordInput';
import { BiometricUnlockButton } from '../../components/auth/BiometricUnlockButton';
import { Button } from '../../components/ui/button';
import { SectionDivider } from '../../components/layout/SectionDivider';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Navigate to resident for demo purposes
    router.replace('/(resident)');
  };

  const handleBiometric = () => {
    // Navigate to visitor for demo purposes
    router.replace('/(visitor)');
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingShell contentContainerClassName="p-6 justify-center">
        <View className="mb-10 items-center">
          <View className="h-16 w-16 mb-4 rounded-2xl bg-primary items-center justify-center">
            <Typography variant="h3" color="inverse" weight="bold">G</Typography>
          </View>
          <Typography variant="h2" weight="bold">Manage My Gate</Typography>
          <Typography variant="body1" color="secondary" className="text-center mt-2">
            Sign in to manage your community access and operations.
          </Typography>
        </View>

        <View className="space-y-4 mb-6 gap-4">
          <TextInput
            label="Email or Phone Number"
            placeholder="Enter your credentials"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Button onPress={handleLogin} className="w-full mb-6 py-4">
          <Typography weight="bold" color="inverse">Sign In</Typography>
        </Button>

        <SectionDivider label="OR SIGN IN WITH" />

        <View className="mt-6 items-center">
          <BiometricUnlockButton onPress={handleBiometric} type="auto" />
        </View>
      </KeyboardAvoidingShell>
    </SafeAreaWrapper>
  );
}
