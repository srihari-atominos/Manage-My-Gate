import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Keeps a screen's data current without relying only on real-time events.
 * Calls `refresh` when the screen regains focus (coming back from another screen) and when the app
 * returns from the background while the screen is showing. Calls are throttled, and the screen's own
 * initial load counts as a run, so opening a screen never fetches twice.
 */
export function useRefreshOnFocus(refresh: () => void, minIntervalMs = 15000) {
  const refreshRef = useRef(refresh);
  const lastRunRef = useRef(Date.now());
  const focusedRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const run = useCallback(() => {
    const now = Date.now();
    if (now - lastRunRef.current < minIntervalMs) return;
    lastRunRef.current = now;
    refreshRef.current();
  }, [minIntervalMs]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      run();
      return () => {
        focusedRef.current = false;
      };
    }, [run])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && focusedRef.current) run();
    });
    return () => subscription.remove();
  }, [run]);
}

export default useRefreshOnFocus;
