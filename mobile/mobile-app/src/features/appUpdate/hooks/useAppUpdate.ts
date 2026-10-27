import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  checkAppUpdateThunk,
  dismissOptionalPrompt,
  setDownloadProgress,
  setDownloadComplete,
  resetUpdateStatus,
} from '../store/appUpdateSlice';
import inAppUpdateManager, { InAppUpdateKind, InAppUpdateStatus } from '../services/inAppUpdateManager';

// Minimum interval between background foreground checks (4 hours)
const FOREGROUND_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export const useAppUpdate = () => {
  const dispatch = useDispatch<AppDispatch>();
  const appUpdateState = useSelector((state: RootState) => state.appUpdate);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const initialCheckPerformedRef = useRef(false);

  const {
    policy,
    isLoading,
    error,
    promptDismissed,
    lastCheckedAt,
    downloadProgress,
    isDownloading,
    isDownloaded,
    isOptionalModalVisible,
    isMandatoryModalVisible,
    playStoreUpdateAvailable,
  } = appUpdateState;

  /**
   * Run update check with throttling
   */
  const checkNow = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && lastCheckedAt && now - lastCheckedAt < FOREGROUND_CHECK_INTERVAL_MS) {
        return;
      }
      dispatch(checkAppUpdateThunk());
    },
    [dispatch, lastCheckedAt]
  );

  /**
   * Dismiss the optional prompt for this session
   */
  const dismissPrompt = useCallback(() => {
    dispatch(dismissOptionalPrompt());
  }, [dispatch]);

  /**
   * Start Google Play in-app update flow
   */
  const triggerUpdate = useCallback(
    async (kind: InAppUpdateKind = 'FLEXIBLE') => {
      dispatch(resetUpdateStatus());

      const handleStatusChange = (statusEvent: InAppUpdateStatus) => {
        if (statusEvent.status === 'DOWNLOADING') {
          dispatch(setDownloadProgress(statusEvent.progressPercent || 0));
        } else if (statusEvent.status === 'DOWNLOADED') {
          dispatch(setDownloadComplete());
        } else if (statusEvent.status === 'FAILED' || statusEvent.status === 'CANCELED') {
          dispatch(resetUpdateStatus());
        }
      };

      await inAppUpdateManager.startUpdate(kind, handleStatusChange);
    },
    [dispatch]
  );

  /**
   * Complete flexible update installation (app restarts)
   */
  const completeUpdate = useCallback(async () => {
    await inAppUpdateManager.completeFlexibleUpdate();
  }, []);

  /**
   * Direct user to the Google Play Store listing
   */
  const openPlayStore = useCallback(async () => {
    await inAppUpdateManager.openPlayStoreListing(policy?.storeUrl);
  }, [policy?.storeUrl]);

  // Initial check on startup (delayed slightly to keep startup silky smooth)
  useEffect(() => {
    if (initialCheckPerformedRef.current || Platform.OS === 'web') return;
    initialCheckPerformedRef.current = true;

    const startupTimer = setTimeout(() => {
      checkNow(false);
    }, 2500);

    return () => clearTimeout(startupTimer);
  }, [checkNow]);

  // Re-check when returning to foreground
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkNow(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkNow]);

  return {
    policy,
    isLoading,
    error,
    promptDismissed,
    downloadProgress,
    isDownloading,
    isDownloaded,
    isOptionalModalVisible,
    isMandatoryModalVisible,
    playStoreUpdateAvailable,
    checkNow,
    dismissPrompt,
    triggerUpdate,
    completeUpdate,
    openPlayStore,
  };
};

export default useAppUpdate;
