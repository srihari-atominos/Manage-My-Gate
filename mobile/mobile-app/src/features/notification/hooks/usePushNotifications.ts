import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../../auth/hooks/useAuth';
import { registerForPushNotificationsAsync } from '../services/pushNotificationService';
import deviceTokenService from '../services/deviceTokenService';
import { mapActionUrlToMobileRoute } from '../utils/notificationNavigation';

/**
 * Custom hook to register, manage, and handle push notifications for the authenticated user.
 */
export function usePushNotifications() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const currentTokenRef = useRef<string | null>(null);
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializePush() {
      if (!isAuthenticated || !user) return;

      try {
        const token = await registerForPushNotificationsAsync();
        if (!token || !isMounted) return;

        currentTokenRef.current = token;

        // Register token with backend database
        await deviceTokenService.registerToken({
          pushToken: token,
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          deviceId: Device.osBuildId || Device.osInternalBuildId || undefined,
          deviceModel: Device.modelName || undefined,
        });

        console.log('[usePushNotifications] Push token successfully registered with backend');
      } catch (err) {
        console.warn('[usePushNotifications] Failed to initialize push notifications:', err);
      }
    }

    if (isAuthenticated) {
      initializePush();
    } else if (currentTokenRef.current) {
      // Unregister token on logout
      const tokenToUnregister = currentTokenRef.current;
      currentTokenRef.current = null;
      deviceTokenService.unregisterToken(tokenToUnregister).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, user?._id]);

  // Set up listeners for incoming notifications and tap responses (deep-linking)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // 1. Triggered whenever a notification is received while the app is foregrounded
    notificationListenerRef.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('[usePushNotifications] Notification received in foreground:', notification?.request?.content?.title);
    });

    // 2. Triggered whenever a user taps on or interacts with a notification banner
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data;
      console.log('[usePushNotifications] User tapped notification with data:', data);

      const targetRoute = mapActionUrlToMobileRoute(
        typeof data?.actionUrl === 'string' ? data.actionUrl : undefined,
        typeof data?.type === 'string' ? data.type : undefined
      );
      try {
        router.push(targetRoute as any);
      } catch (navErr) {
        console.warn('[usePushNotifications] Navigation error for targetRoute:', targetRoute, navErr);
      }
    });

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [router]);
}

export default usePushNotifications;
