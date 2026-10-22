import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { isExpoGo, registerForPushNotificationsAsync, isPushNotificationEnabled } from '../services/pushNotificationService';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../../auth/hooks/useAuth';
import deviceTokenService from '../services/deviceTokenService';
import {
  resolveNotificationRoute,
  isDuplicateNotification,
} from '../utils/notificationNavigation';
import {
  setPendingRoute,
  setLastHandledNotificationId,
  addRealTimeNotification,
} from '../store/notificationSlice';
import { checkAppUpdateThunk, showOptionalPrompt } from '../../appUpdate/store/appUpdateSlice';

// The native module cannot load in Expo Go; use a lazy require in development builds.
const Notifications: any = isExpoGo ? null : require('expo-notifications');

/**
 * Custom hook to register, manage, and handle push notifications for the authenticated user.
 * Supports Cold-Start resolution, background/foreground tap handling, and race-condition prevention.
 */
export function usePushNotifications() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();
  const currentTokenRef = useRef<string | null>(null);
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);
  const coldStartCheckedRef = useRef(false);

  const userId = user?.id || (user as any)?._id;

  // 1. Asynchronous Token Registration & Lifecycle Management
  if (isExpoGo) return;
  useEffect(() => {
    let isMounted = true;

    async function initializePush() {
      if (!isAuthenticated || !userId) return;

      try {
        const isEnabled = await isPushNotificationEnabled();
        if (!isEnabled) {
          console.log('[usePushNotifications] Push notifications disabled in settings; skipping active token registration with backend');
          return;
        }

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
            appVersion: Constants.expoConfig?.version || '1.0.8',
            versionCode: Constants.expoConfig?.android?.versionCode || 30,
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
    if (isExpoGo || Platform.OS === 'web' || coldStartCheckedRef.current) return;
    coldStartCheckedRef.current = true;

    async function checkColdStartNotification() {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (!lastResponse) return;

        const data = lastResponse.notification?.request?.content?.data;
        const notifId = data?.notificationId || lastResponse.notification?.request?.identifier;

        if (isDuplicateNotification(notifId)) return;

        console.log('[usePushNotifications] Cold start notification tap detected:', { notifId, data });
        if (data?.type === 'APP_UPDATE') {
          dispatch(checkAppUpdateThunk() as any);
          dispatch(showOptionalPrompt());
        }

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
    if (isExpoGo || Platform.OS === 'web') return;

    try {
      // A. Received while app is in foreground
      notificationListenerRef.current = Notifications.addNotificationReceivedListener(async (notification: any) => {
        const isEnabled = await isPushNotificationEnabled();
        if (!isEnabled) {
          console.log('[usePushNotifications] Suppressing incoming foreground notification; push disabled in settings');
          return;
        }

        console.log('[usePushNotifications] Foreground notification received by Android system:', notification?.request?.content?.title);
        const content = notification?.request?.content;
        const data = content?.data || {};
        const notifId = data?.notificationId || notification?.request?.identifier;
        if (notifId && isDuplicateNotification(notifId)) return;

        if (data?.type === 'APP_UPDATE') {
          dispatch(checkAppUpdateThunk() as any);
        }

        const formattedNotification: any = {
          id: notifId,
          _id: notifId,
          title: data?.inboxTitle || content?.title || 'Nahom Alert',
          body: data?.inboxBody || content?.body || '',
          type: data?.type || 'INFO',
          actionUrl: data?.actionUrl || null,
          metadata: data,
          createdAt: data?.createdAt || new Date().toISOString(),
          isRead: false,
        };
        dispatch(addRealTimeNotification(formattedNotification));
      });

      // B. User tapped notification while app was running or in background
      responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response?.notification?.request?.content?.data;
        const notifId = data?.notificationId || response?.notification?.request?.identifier;

        if (isDuplicateNotification(notifId)) return;

        console.log('[usePushNotifications] Notification response tapped with data:', { notifId, data });
        if (data?.type === 'APP_UPDATE') {
          dispatch(checkAppUpdateThunk() as any);
          dispatch(showOptionalPrompt());
        }

        const targetRoute = resolveNotificationRoute(data);

        dispatch(setLastHandledNotificationId(notifId));
        dispatch(setPendingRoute(targetRoute));

        if (!isAuthenticated) {
          console.log('[usePushNotifications] User unauthenticated; queued pending route:', targetRoute);
        }
      });
    } catch (err) {
      console.warn('[usePushNotifications] Error attaching notification listeners:', err);
    }

    return () => {
      try {
        if (notificationListenerRef.current) {
          notificationListenerRef.current.remove();
        }
        if (responseListenerRef.current) {
          responseListenerRef.current.remove();
        }
      } catch (_) {}
    };
  }, [isAuthenticated, dispatch]);
}

export default usePushNotifications;
