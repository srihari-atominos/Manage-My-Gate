import { useCallback, useRef } from 'react';
import { Platform, BackHandler, ToastAndroid } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from '@/src/utils/i18n';

export interface UseDoubleBackToExitOptions {
  /**
   * Whether double-back exit is enabled.
   * Defaults to true (only takes effect on Android).
   */
  enabled?: boolean;

  /**
   * Custom toast message.
   * Defaults to localized 'Press back again to exit'.
   */
  exitMessage?: string;

  /**
   * Timeout window in milliseconds between consecutive back presses.
   * Defaults to 2000ms (2 seconds).
   */
  timeoutMs?: number;

  /**
   * Optional pre-exit interceptor.
   * If this callback returns `true` (e.g. closing an open modal or bottom sheet),
   * the exit logic is skipped and the exit state is reset.
   */
  onBeforeExitCheck?: () => boolean;
}

/**
 * Android-only hook that prompts the user with "Press back again to exit"
 * when hardware back is pressed on root dashboard/home screens.
 *
 * iOS and other platforms are completely untouched.
 */
export function useDoubleBackToExit({
  enabled = true,
  exitMessage,
  timeoutMs = 2000,
  onBeforeExitCheck,
}: UseDoubleBackToExitOptions = {}) {
  const { t } = useTranslation();
  const lastBackPressTimeRef = useRef<number>(0);
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetExitState = useCallback(() => {
    lastBackPressTimeRef.current = 0;
    if (backTimerRef.current) {
      clearTimeout(backTimerRef.current);
      backTimerRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // ONLY active on Android and when enabled
      if (Platform.OS !== 'android' || !enabled) {
        return;
      }

      const onHardwareBack = () => {
        // 1. Check if a modal or sheet is open
        if (onBeforeExitCheck && onBeforeExitCheck()) {
          resetExitState();
          return true;
        }

        const now = Date.now();
        // 2. Check if pressed within the 2-second timeout
        if (now - lastBackPressTimeRef.current < timeoutMs) {
          resetExitState();
          BackHandler.exitApp();
          return true;
        }

        // 3. First press: Record timestamp and show lightweight toast
        lastBackPressTimeRef.current = now;
        const msg = exitMessage || t('press_back_again_to_exit', 'Press back again to exit');

        if (typeof ToastAndroid !== 'undefined' && ToastAndroid.show) {
          ToastAndroid.show(msg, ToastAndroid.SHORT);
        }

        // 4. Set single timer to reset state after timeout
        if (backTimerRef.current) {
          clearTimeout(backTimerRef.current);
        }
        backTimerRef.current = setTimeout(() => {
          lastBackPressTimeRef.current = 0;
          backTimerRef.current = null;
        }, timeoutMs);

        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);

      return () => {
        subscription.remove();
        resetExitState();
      };
    }, [enabled, exitMessage, timeoutMs, onBeforeExitCheck, resetExitState, t])
  );

  return { resetExitState };
}

export default useDoubleBackToExit;
