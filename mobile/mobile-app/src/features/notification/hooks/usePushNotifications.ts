import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '../../auth/hooks/useAuth';
import { registerForPushNotificationsAsync } from '../services/pushNotificationService';
import deviceTokenService from '../services/deviceTokenService';
import {
  resolveNotificationRoute,
  isDuplicateNotification,
} from '../utils/notificationNavigation';
import {
  setPendingRoute,
  setLastHandledNotificationId,
} from '../store/notificationSlice';

/**
 * Custom hook to register, manage, and handle push notifications for the authenticated user.
 * Supports Cold-Start resolution, background/foreground tap handling, and race-condition prevention.
 */
export function usePushNotifications() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();
  const currentTokenRef = useRef<string | null>(null);
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);
  const coldStartCheckedRef = useRef(false);

  const userId = user?.id || (user as any)?._id;

  // 1. Asynchronous Token Registration & Lifecycle Management
  useEffect(() => {
    let isMounted = true;

    async function initializePush() {
      if (!isAuthenticated || !userId) return;

      try {
        const token = await registerForPushNotificationsAsync();
        if (!token || !isMounted) return;

        currentTokenRef.current = token;

        // Register token with backend database (caches locally to avoid duplicate calls)
        await deviceTokenService.registerToken(
          {
            pushToken: token,
            platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
            deviceId: Device.osBuildId || Device.osInternalBuildId || undefined,
            deviceModel: Device.modelName || undefined,
          },
          userId
        );

        console.log('[usePushNotifications] Push token active & synced with backend');
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
      deviceTokenService.unregisterToken(tokenToUnregister, userId).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, userId]);

  // 2. Cold-Start Check: Detect if application was launched by tapping a notification
  useEffect(() => {
    if (Platform.OS === 'web' || coldStartCheckedRef.current) return;
    coldStartCheckedRef.current = true;

    async function checkColdStartNotification() {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (!lastResponse) return;

        const data = lastResponse.notification?.request?.content?.data;
        const notifId = data?.notificationId || lastResponse.notification?.request?.identifier;

        if (isDuplicateNotification(notifId)) return;

        console.log('[usePushNotifications] Cold start notification tap detected:', { notifId, data });
        const targetRoute = resolveNotificationRoute(data);

        dispatch(setPendingRoute(targetRoute));
        dispatch(setLastHandledNotificationId(notifId));
      } catch (err) {
        console.warn('[usePushNotifications] Error checking cold start notification:', err);
      }
    }

    checkColdStartNotification();
  }, [dispatch]);

  // 3. Foreground & Background Notification Listeners
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // A. Received while app is in foreground
    notificationListenerRef.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('[usePushNotifications] Foreground notification received by Android system:', notification?.request?.content?.title);
    });

    // B. User tapped notification while app was running or in background
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data;
      const notifId = data?.notificationId || response?.notification?.request?.identifier;

      if (isDuplicateNotification(notifId)) return;

      console.log('[usePushNotifications] Notification response tapped with data:', { notifId, data });
      const targetRoute = resolveNotificationRoute(data);

      dispatch(setLastHandledNotificationId(notifId));

      if (isAuthenticated) {
        try {
          router.push(targetRoute as any);
        } catch (navErr) {
          console.warn('[usePushNotifications] Navigation error for targetRoute:', targetRoute, navErr);
          router.push('/(resident)/notifications' as any);
        }
      } else {
        // User not logged in: queue route for post-authentication navigation
        console.log('[usePushNotifications] User unauthenticated; queuing pending route:', targetRoute);
        dispatch(setPendingRoute(targetRoute));
        router.replace('/(auth)/login' as any);
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
  }, [isAuthenticated, router, dispatch]);
}

export default usePushNotifications;

