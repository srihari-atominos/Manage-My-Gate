import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure how incoming notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Configure Android notification channels with high priority sound and vibration.
 */
export async function setupAndroidNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('billing', {
      name: 'Billing & Payment Reminders',
      description: 'Alerts regarding invoices, maintenance dues, and payment confirmations',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Community Alerts',
      description: 'Standard notices, visitor approvals, and community messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });
  }
}

/**
 * Request notification permissions and fetch the unique Expo push token.
 * Returns null if running on a simulator/emulator without push support or if permission is denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      console.log('[PushNotificationService] Push notifications not supported on Web target');
      return null;
    }

    await setupAndroidNotificationChannels();

    if (!Device.isDevice) {
      console.log('[PushNotificationService] Running on simulator/emulator; remote push notifications require a physical device.');
      // Return a development placeholder token so testing flows work in simulators
      return 'ExponentPushToken[SIMULATOR_DEV_TOKEN_MANAGE_MY_GATE]';
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotificationService] Notification permission was not granted by user.');
      return null;
    }

    // Resolve projectId from expo constants if available
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    console.log('[PushNotificationService] Acquired Expo Push Token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.warn('[PushNotificationService] Failed to get Expo push token:', error);
    return null;
  }
}

export default {
  setupAndroidNotificationChannels,
  registerForPushNotificationsAsync,
};
