import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import storage from '../../../utils/storage';

export const isExpoGo =
  (Constants as any)?.executionEnvironment === 'storeClient' ||
  (Constants as any)?.appOwnership === 'expo' ||
  Boolean((Constants as any)?.expoGoConfig);


// Importing expo-notifications throws in Expo Go on Android as of SDK 53.
const Notifications: any = isExpoGo ? null : require('expo-notifications');
/**
 * Checks whether push notifications are enabled by the user in settings.
 * Defaults to true if unconfigured.
 */
export async function isPushNotificationEnabled(): Promise<boolean> {
  try {
    const val = await storage.getItem('setting_gateAlerts');
    if (val === 'false') {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Persists the user's push notification enabled state.
 */
export async function setPushNotificationEnabled(enabled: boolean): Promise<void> {
  try {
    await storage.setItem('setting_gateAlerts', JSON.stringify(enabled));
  } catch (err) {
    console.warn('[PushNotificationService] Failed to set push enabled state:', err);
  }
}

// Configure how incoming notifications are handled when the app is in the foreground
if (Platform.OS !== 'web' && !(Platform.OS === 'android' && isExpoGo)) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        const enabled = await isPushNotificationEnabled();
        return {
          shouldShowAlert: enabled,
          shouldPlaySound: enabled,
          shouldSetBadge: enabled,
          shouldShowBanner: enabled,
          shouldShowList: enabled,
          priority: enabled
            ? Notifications.AndroidNotificationPriority.MAX
            : Notifications.AndroidNotificationPriority.MIN,
        };
      },
    });
  } catch (err) {
    console.warn('[PushNotificationService] Failed to set notification handler:', err);
  }
}

let channelsInitialized = false;

/**
 * Configure Android notification channels with high priority, appropriate sounds, and vibrations.
 * Uses stable channel IDs matching backend dispatch rules.
 */
export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== 'android' || isExpoGo || channelsInitialized || typeof Notifications?.setNotificationChannelAsync !== 'function') {
    return;
  }

  try {
    // 1. General & Community Announcements
    await Notifications.setNotificationChannelAsync('general', {
      name: 'General Community Alerts',
      description: 'Standard notices, announcements, and system alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6A00',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // 2. Default alias for backwards compatibility
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Alerts',
      description: 'Default community and system alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // 3. Visitor Management & Gate Approvals (MAX importance for urgent approvals)
    await Notifications.setNotificationChannelAsync('visitors', {
      name: 'Visitor & Gate Requests',
      description: 'Urgent gate approvals, visitor check-ins, and guest arrivals',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#2563EB',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // 4. Billing, Invoices & Maintenance Payments
    await Notifications.setNotificationChannelAsync('billing', {
      name: 'Billing & Payment Reminders',
      description: 'Alerts regarding invoices, maintenance dues, and payment confirmations',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16A34A',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // 5. Complaints & Maintenance Issues
    await Notifications.setNotificationChannelAsync('complaints', {
      name: 'Complaints & Maintenance',
      description: 'Maintenance tickets, technician assignments, and issue resolutions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // 6. Resident & Community Messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Community Messages',
      description: 'Direct communications between residents, guards, and community admins',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    // 7. Community & Workspace Invitations (MAX importance for urgent access decisions)
    await Notifications.setNotificationChannelAsync('invitations', {
      name: 'Invitations & Access Approvals',
      description: 'Community invitations requiring acceptance or decline',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#2563EB',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    channelsInitialized = true;
    console.log('[PushNotificationService] Android notification channels successfully configured');
  } catch (error) {
    console.warn('[PushNotificationService] Error setting up Android notification channels:', error);
  }
}

export type NotificationPermissionsStatus = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;

/**
 * Check current notification permissions without prompting user.
 */
export async function checkNotificationPermissions(): Promise<NotificationPermissionsStatus | null> {
  try {
    if (Platform.OS === 'web') return null;
    return await Notifications.getPermissionsAsync();
  } catch (error) {
    console.warn('[PushNotificationService] Error checking permissions:', error);
    return null;
  }
}

/**
 * Request notification permissions from user, respecting previous denials to avoid nagging.
 * @param forcePrompt - If true, bypasses the previous request check.
 */
export async function requestNotificationPermissionsAsync(forcePrompt = false): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;

    const currentStatus = await Notifications.getPermissionsAsync();
    if (currentStatus?.status === 'granted') {
      return true;
    }

    const alreadyRequested = await storage.getItem('notification_permission_requested');
    if (!forcePrompt && alreadyRequested === 'true' && currentStatus?.status === 'denied' && !currentStatus?.canAskAgain) {
      console.log('[PushNotificationService] Notification permission previously denied and cannot ask again without settings change.');
      return false;
    }

    await storage.setItem('notification_permission_requested', 'true');
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    const status = result?.status;
    console.log('[PushNotificationService] Permission request result:', status);
    return status === 'granted';
  } catch (error) {
    console.warn('[PushNotificationService] Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Request notification permissions and fetch the unique Expo push token.
 * Returns null if running on a simulator/emulator without push support or if permission is denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return null;
    }

    await setupAndroidNotificationChannels();

    if (!Device.isDevice) {
      console.log('[PushNotificationService] Running on simulator/emulator; returning dev placeholder token.');
      const devToken = 'ExponentPushToken[SIMULATOR_DEV_TOKEN_MANAGE_MY_GATE]';
      storage.setItem('device_push_token', devToken).catch(() => {});
      return devToken;
    }

    if (Platform.OS === 'android' && isExpoGo) {
      console.log('[PushNotificationService] Running in Expo Go on Android (SDK 53+ lacks native remote push in client); returning dev placeholder token.');
      const devToken = 'ExponentPushToken[EXPO_GO_DEV_TOKEN_MANAGE_MY_GATE]';
      storage.setItem('device_push_token', devToken).catch(() => {});
      return devToken;
    }

    const isGranted = await requestNotificationPermissionsAsync(false);
    if (!isGranted) {
      console.log('[PushNotificationService] Notification permission not granted; push notifications inactive.');
      return null;
    }

    // Resolve projectId from expo constants or explicit EAS project ID
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      '94a573d9-5e93-4827-8fbd-605e0ef3a50a';

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const token = tokenData?.data || null;
    if (token) {
      storage.setItem('device_push_token', token).catch(() => {});
    }
    console.log('[PushNotificationService] Acquired Expo Push Token:', token);
    return token;
  } catch (error) {
    console.warn('[PushNotificationService] Failed to get Expo push token:', error);
    return null;
  }
}

export default {
  setupAndroidNotificationChannels,
  checkNotificationPermissions,
  requestNotificationPermissionsAsync,
  registerForPushNotificationsAsync,
  isPushNotificationEnabled,
  setPushNotificationEnabled,
};






