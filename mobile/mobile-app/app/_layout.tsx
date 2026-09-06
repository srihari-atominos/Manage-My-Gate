import '@/global.css';
import React, { useEffect } from 'react';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, useSegments, useRouter, useGlobalSearchParams, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { Provider } from 'react-redux';
import { store } from '../src/store/store';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../src/features/auth/hooks/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import storage from '../src/utils/storage';
import i18n from '../src/utils/i18n';
import * as SplashScreen from 'expo-splash-screen';
import useGlobalAppSocket from '../src/hooks/useGlobalAppSocket';

// Prevent splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync().catch(() => {});

export {
  ErrorBoundary,
} from 'expo-router';

// AuthRouteGuard runs inside Provider/ThemeProvider context
function AuthRouteGuard() {
  const { isAuthenticated, isInitialized, user, bootstrap } = useAuth();
  const { setColorScheme } = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const searchParams = useGlobalSearchParams<{ intent?: string; token?: string }>();
  const rootNavigationState = useRootNavigationState();

  // Initialize global real-time Socket.io engine
  useGlobalAppSocket();

  const isCreateOrgIntent = searchParams.intent === 'create-org' || searchParams.intent === 'create';

  // Restore saved theme, language, and session restoration on startup (Mount once)
  useEffect(() => {
    bootstrap();
    const restorePreferences = async () => {
      try {
        const savedTheme = await storage.getItem('theme_preference');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setColorScheme(savedTheme);
        } else {
          setColorScheme('light');
          await storage.setItem('theme_preference', 'light');
        }
      } catch (e) {
        console.warn('Failed to restore theme on startup:', e);
      }
      try {
        await i18n.initLanguage();
      } catch (e) {
        console.warn('Failed to restore language preference on startup:', e);
      }
    };
    restorePreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle dynamic routing redirects depending on session state once navigation state is ready
  useEffect(() => {
    if (!rootNavigationState?.key || !isInitialized) return;

    const segs = (segments || []) as string[];
    const firstSegment = segs[0] as string | undefined;
    const currentRoute = segs[1] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    const isRoot = !firstSegment || firstSegment === 'index';
    const u = user as any;

    const hasTokenParam = !!searchParams?.token;
    const isWebInviteUrl =
      typeof window !== 'undefined' &&
      typeof window.location !== 'undefined' &&
      window.location?.href &&
      (window.location.href.includes('invite') || window.location.href.includes('token=') || window.location.hash.includes('invite'));

    const isInviteRoute =
      hasTokenParam ||
      isWebInviteUrl ||
      firstSegment === 'invite' ||
      firstSegment === 'accept-invite' ||
      (inAuthGroup && currentRoute === 'accept-invite');

    if (isInviteRoute) {
      if (firstSegment !== '(auth)' || currentRoute !== 'accept-invite') {
        router.replace({
          pathname: '/(auth)/accept-invite',
          params: searchParams,
        });
      }
      return;
    }

    const hasOrg = !!(
      u && (
        u.orgId ||
        u.activeOrgId ||
        u.organizationId ||
        (Array.isArray(u.availableWorkspaces) && u.availableWorkspaces.length > 0)
      )
    );
    const isOnboardingRoute = currentRoute === 'setup-organization' || currentRoute === 'select-features';

    if (!isAuthenticated && !inAuthGroup) {
      // Direct unauthenticated users to sign in
      router.replace('/(auth)/login');
    } else if (isAuthenticated) {
      if (!hasOrg) {
        // Authenticated user has no organization workspace -> direct to setup-organization
        if (!isOnboardingRoute) {
          router.replace('/(auth)/setup-organization');
        }
      } else if (isRoot) {
        // Authenticated user opening app cold at root -> route to dashboard
        router.replace('/(resident)/dashboard');
      }
    }
  }, [isAuthenticated, isInitialized, rootNavigationState?.key, segments, user, isCreateOrgIntent]);

  return null;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  useEffect(() => {
    // Unconditionally dismiss native splash overlay on mount so app interface is always visible
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#09090b' : '#ffffff' }}>
        <ActivityIndicator size="large" color="#03A9F4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <BottomSheetModalProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }} />
              <AuthRouteGuard />
              <PortalHost />
            </ThemeProvider>
          </BottomSheetModalProvider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
