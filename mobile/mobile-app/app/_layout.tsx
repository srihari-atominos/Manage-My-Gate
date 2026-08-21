// @ts-ignore
import '@/global.css';

import { PortalHost } from '@rn-primitives/portal';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { Provider } from 'react-redux';
import { store } from '../src/store/store';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/features/auth/hooks/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, bootstrap } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Run the session restoration thunk on startup
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  // Handle dynamic routing redirects depending on session state
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRoot = !segments[0];

    if (!isAuthenticated && !inAuthGroup) {
      // Direct unauthenticated users to sign in
      router.replace('/(auth)/login');
    } else if (isAuthenticated && (inAuthGroup || isRoot)) {
      // Direct authenticated users to their resident home dashboard
      router.replace('/(resident)/dashboard');
    }
  }, [isAuthenticated, isInitialized, segments]);

  if (!isInitialized) {
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
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }} />
            <PortalHost />
          </AppInitializer>
        </BottomSheetModalProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
