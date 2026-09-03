import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Button } from '@/components/ui/button';
import { Text, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

// Microsoft Entra ID Discovery
const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
};

export function MicrosoftSignInButton() {
  const { loginWithMicrosoft, loading } = useAuth();

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'managemygate',
    path: 'auth-spa'
  });
  
  React.useEffect(() => {
    console.log('[MicrosoftSignIn] Redirect URI:', redirectUri);
  }, [redirectUri]);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || 'your-client-id',
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  React.useEffect(() => {
    console.log("--- MICROSOFT AUTH RESPONSE ---", response);
    if (response?.type === 'success') {
      const { code } = response.params;
      if (code && request?.codeVerifier) {
        AuthSession.exchangeCodeAsync(
          {
            clientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || 'your-client-id',
            code,
            redirectUri: redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          discovery
        )
          .then((tokenResponse: any) => {
            const tokenToUse = tokenResponse.idToken || tokenResponse.accessToken;
            console.log("Extracted Token:", tokenToUse ? "Token Found!" : "No Token Found!");
            
            if (tokenToUse) {
              loginWithMicrosoft(tokenToUse)
                .catch((err: any) => {
                  console.error("Backend Error:", err);
                  Alert.alert('Microsoft Login Failed', typeof err === 'string' ? err : (err.message || 'Unknown error. Please check your network connection or try again.'));
                });
            } else {
              console.warn("Token exchange succeeded but no token was returned:", tokenResponse);
            }
          })
          .catch((err: any) => {
            console.error("Token Exchange Error:", err);
            Alert.alert('Microsoft Login Error', 'Failed to exchange authorization code for token.');
          });
      } else {
        console.warn("Login success but no code or codeVerifier was found:", response.params);
      }
    } else if (response?.type === 'error') {
      console.error("Auth Session Error:", response.error);
      Alert.alert('Microsoft Login Error', response.error?.message || 'Authentication session failed.');
    }
  }, [response, request, loginWithMicrosoft]);

  return (
    <Button
      className="h-12 w-full rounded-xl flex-row items-center justify-center bg-[#2f2f2f] dark:bg-[#1f1f1f] border border-border px-3"
      onPress={() => promptAsync()}
      disabled={!request || loading}
      loading={loading}
    >
      <Text className="text-white text-base me-2 shrink-0">❖</Text>
      <Text className="text-white font-semibold text-sm">Microsoft</Text>
    </Button>
  );
}
