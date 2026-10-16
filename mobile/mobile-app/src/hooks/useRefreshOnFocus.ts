import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getNetworkStatus, subscribeNetworkStatus } from '@/src/services/networkStatus';

/** Keeps a focused screen current on navigation, app resume, and device-network recovery. */
export function useRefreshOnFocus(refresh: () => void, minIntervalMs = 15000) {
  const refreshRef = useRef(refresh);
  const lastRunRef = useRef(Date.now());
  const focusedRef = useRef(false);
  const recoveryRef = useRef(getNetworkStatus().recoveredAt);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const run = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastRunRef.current < minIntervalMs) return;
    lastRunRef.current = now;
    refreshRef.current();
  }, [minIntervalMs]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    run();
    return () => { focusedRef.current = false; };
  }, [run]));

  useEffect(() => {
    const unsubscribe = subscribeNetworkStatus(() => {
      const recoveredAt = getNetworkStatus().recoveredAt;
      if (recoveredAt && recoveredAt !== recoveryRef.current) {
        recoveryRef.current = recoveredAt;
        if (focusedRef.current) run(true);
      }
    });
    return () => { unsubscribe(); };
  }, [run]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && focusedRef.current) run();
    });
    return () => subscription.remove();
  }, [run]);
}

export default useRefreshOnFocus;
