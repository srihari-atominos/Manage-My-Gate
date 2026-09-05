import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from './useAuth';
import { router } from 'expo-router';
import { Alert } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_GOOGLE_CLIENT_ID = '610778456829-edvpd6gcav2u31jo0p2aeligfopvqfbo.apps.googleusercontent.com';

export function useGoogleAuthSession() {
  const { loginWithGoogle, loading } = useAuth();
  const [authInProgress, setAuthInProgress] = React.useState(false);

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleClientId;

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'managemygate',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    iosClientId,
    androidClientId,
    redirectUri,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (idToken) {
        setAuthInProgress(true);
        loginWithGoogle(idToken)
          .then((res: any) => {
            if (res?.payload?.isNewUser) {
              const googleData = res.payload.googleData || {};
              router.push({
                pathname: '/(auth)/register',
                params: {
                  email: googleData.email || '',
                  name: googleData.name || '',
                  isGoogleSso: 'true',
                },
              });
            }
          })
          .catch((err: any) => {
            console.error('[GoogleSignIn] Backend login error:', err);
            Alert.alert(
              'Google Sign-In Failed',
              typeof err === 'string' ? err : err?.message || 'Login failed'
            );
          })
          .finally(() => {
            setAuthInProgress(false);
          });
      } else {
        console.warn('[GoogleSignIn] Success response received but ID Token missing:', response);
      }
    } else if (response?.type === 'error') {
      console.error('[GoogleSignIn] Auth Session Error:', response.error);
      Alert.alert(
        'Google Sign-In Error',
        response.error?.message || 'Authentication session failed.'
      );
    }
  }, [response, loginWithGoogle]);

  const handleGoogleSignIn = React.useCallback(async () => {
    try {
      if (!request) {
        Alert.alert(
          'Google Sign-In',
          'Google Sign-In is initializing. Please try again in a moment.'
        );
        return;
      }
      await promptAsync();
    } catch (err: any) {
      console.error('[GoogleSignIn] Prompt error:', err);
      Alert.alert('Google Sign-In Error', err?.message || 'Could not start Google Sign-In.');
    }
  }, [request, promptAsync]);

  return {
    handleGoogleSignIn,
    loading: loading || authInProgress,
    disabled: !request || loading || authInProgress,
  };
}

export default useGoogleAuthSession;
