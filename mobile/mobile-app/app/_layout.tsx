import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from '../src/store/store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthInitializer } from '../src/features/auth';
import '../global.css';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthInitializer>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(resident)" options={{ headerShown: false }} />
              <Stack.Screen name="(visitor)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
            </Stack>
          </AuthInitializer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

