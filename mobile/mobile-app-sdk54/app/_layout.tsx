// @ts-ignore
import '@/global.css';

import React, { createContext, useContext, useEffect } from 'react';
import { NAV_THEME } from '@/lib/theme';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { Provider } from 'react-redux';
import { store } from '../src/store/store';
import { View, ActivityIndicator } from 'react-native';

const ThemeContext = createContext<any>(null);

function ThemeProvider({ value, children }: { value: any; children: React.ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
import { useAuth } from '../src/features/auth/hooks/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, bootstrap } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Run the session restoration thunk on startup
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  
  // Handle dynamic routing redirects depending on session state
  useEffect(() => {
    if (!isInitialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRoot = !segments[0];

    if (!isAuthenticated && !inAuthGroup) {
      // Direct unauthenticated users to sign in
      router.replace('/(auth)/login');
    } else if (isAuthenticated && (inAuthGroup || isRoot)) {
      // Direct authenticated users to their resident home dashboard
      router.replace('/(resident)/dashboard');
    }
  }, [isAuthenticated, isInitialized, fontsLoaded, segments]);

  if (!isInitialized || !fontsLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#03A9F4" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <BottomSheetModalProvider>
          <AppInitializer>
            <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }} />
              <PortalHost />
            </ThemeProvider>
          </AppInitializer>
        </BottomSheetModalProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
