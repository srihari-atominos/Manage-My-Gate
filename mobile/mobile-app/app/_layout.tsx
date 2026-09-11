import '../src/utils/cryptoPolyfill';
import '@/global.css';
import React, { useEffect } from 'react';

// Suppress synchronous console logs in production release builds to prevent Hermes JNI logcat bottlenecks
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

import { PortalHost } from '@rn-primitives/portal';
import { Stack, useSegments, useRouter, useGlobalSearchParams, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { Provider, useDispatch, useSelector } from 'react-redux';
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
import storage from '../src/utils/storage';
import i18n from '../src/utils/i18n';
import * as SplashScreen from 'expo-splash-screen';
import useAutoUpdate from '../src/hooks/useAutoUpdate';
import usePushNotifications from '../src/features/notification/hooks/usePushNotifications';
import { clearPendingRoute } from '../src/features/notification/store/notificationSlice';
import { useGlobalAppSocket } from '../src/hooks/useGlobalAppSocket';
import { getDeferredHandoffContext } from '../src/features/auth/services/deferredDeepLinkService';

// Prevent splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync().catch(() => {});

export {
  ErrorBoundary,
} from 'expo-router';

// AuthRouteGuard runs inside Provider/ThemeProvider context
function AuthRouteGuard() {
  const dispatch = useDispatch();
  const { isAuthenticated, isInitialized, user, bootstrap } = useAuth();
  const { setColorScheme } = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const searchParams = useGlobalSearchParams<{ intent?: string; token?: string; code?: string; [key: string]: any }>();
  const rootNavigationState = useRootNavigationState();
  const pendingRoute = useSelector((state: any) => state.notification?.pendingRoute);

  // Initialize global real-time Socket.io engine
  useGlobalAppSocket();

  // Check and apply EAS Over-The-Air (OTA) updates automatically
  useAutoUpdate();

  // Initialize and listen to device push notifications
  usePushNotifications();

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

    const isExplicitNonInviteAuthRoute = inAuthGroup && currentRoute && currentRoute !== 'accept-invite';

    const hasTokenParam = !!(searchParams?.token || searchParams?.code);
    const isWebInviteUrl =
      typeof window !== 'undefined' &&
      typeof window.location !== 'undefined' &&
      window.location?.pathname &&
      (window.location.pathname.startsWith('/invite/') ||
       window.location.pathname === '/accept-invite' ||
       window.location.pathname.startsWith('/(auth)/accept-invite'));

    const isInviteRoute =
      !isExplicitNonInviteAuthRoute &&
      (firstSegment === 'invite' ||
        firstSegment === 'accept-invite' ||
        (inAuthGroup && currentRoute === 'accept-invite') ||
        (isRoot && (hasTokenParam || isWebInviteUrl)));

    if (isInviteRoute) {
      if (firstSegment === 'invite') {
        return;
      }
      if (firstSegment !== '(auth)' || currentRoute !== 'accept-invite') {
        let tokenToPass = searchParams?.token || searchParams?.code;
        if (!tokenToPass && typeof window !== 'undefined' && window.location?.href) {
          const match = window.location.href.match(/[\/?&](?:token|code)=([^&#]+)|\/invite\/(?:app\/|web\/)?([a-f0-9]{32,64}|[^/?&#]+)/i);
          if (match) {
            tokenToPass = match[1] || match[2];
          }
        }
        setTimeout(() => {
          router.replace({
            pathname: '/(auth)/accept-invite',
            params: { ...searchParams, ...(tokenToPass ? { token: tokenToPass } : {}) },
          });
        }, 0);
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

    // On root route (/ or index), app/index.tsx handles initial redirect cleanly. Avoid racing.
    if (isRoot) {
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      // Check for deferred handoff or invitation token from Google Play Install Referrer on first launch
      getDeferredHandoffContext()
        .then((context) => {
          setTimeout(() => {
            if (context) {
              if (context.type === 'handoff') {
                router.replace(`/invite/handoff/${context.value}` as any);
              } else {
                router.replace({
                  pathname: '/(auth)/accept-invite',
                  params: { token: context.value },
                });
              }
            } else {
              router.replace('/(auth)/login');
            }
          }, 0);
        })
        .catch(() => {
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 0);
        });
    } else if (isAuthenticated) {
      if (!hasOrg) {
        if (!isOnboardingRoute) {
          setTimeout(() => {
            router.replace('/(auth)/setup-organization');
          }, 0);
        }
      } else if (pendingRoute) {
        console.log('[AuthRouteGuard] Navigating to pending notification destination:', pendingRoute);
        dispatch(clearPendingRoute());
        setTimeout(() => {
          router.replace(pendingRoute as any);
        }, 0);
      }
    }
  }, [isAuthenticated, isInitialized, rootNavigationState?.key, segments, user, isCreateOrgIntent, pendingRoute, dispatch]);

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
        <View className={colorScheme === 'dark' ? 'dark flex-1 bg-background' : 'flex-1 bg-background'}>
          <Provider store={store}>
            <BottomSheetModalProvider>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }} />
              <AuthRouteGuard />
              <PortalHost />
            </BottomSheetModalProvider>
          </Provider>
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
