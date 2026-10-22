import { compareVersions, calculateRemainingDays } from '../utils/versionUtils';
import appUpdateReducer, {
  checkAppUpdateThunk,
  dismissOptionalPrompt,
  showOptionalPrompt,
  setDownloadProgress,
  setDownloadComplete,
  resetUpdateStatus,
  AppUpdateState,
} from '../store/appUpdateSlice';
import { inAppUpdateManager } from '../services/inAppUpdateManager';
import { Linking, Platform } from 'react-native';
import apiClient from '../../../services/apiClient';

jest.mock('../../../services/apiClient');
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.8',
    android: {
      versionCode: 30,
    },
  },
  executionEnvironment: 'bare',
}));

describe('AppUpdate — Version Utilities', () => {
  it('correctly compares version numbers (1.10.0 > 1.9.0)', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('1.0.8', '1.0.8')).toBe(0);
    expect(compareVersions('2.0.0', '1.99.9')).toBeGreaterThan(0);
  });

  it('calculates remaining days in grace period accurately', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRemainingDays(futureDate)).toBe(5);

    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRemainingDays(pastDate)).toBe(0);

    expect(calculateRemainingDays(null)).toBe(0);
  });
});

describe('AppUpdate — Redux Slice & State Transitions', () => {
  const initialSliceState: AppUpdateState = {
    policy: null,
    isLoading: false,
    error: null,
    promptDismissed: false,
    lastCheckedAt: null,
    downloadProgress: 0,
    isDownloading: false,
    isDownloaded: false,
    isOptionalModalVisible: false,
    isMandatoryModalVisible: false,
    playStoreUpdateAvailable: false,
  };

  it('handles optional prompt dismissal', () => {
    const activeState: AppUpdateState = {
      ...initialSliceState,
      isOptionalModalVisible: true,
      promptDismissed: false,
    };

    const nextState = appUpdateReducer(activeState, dismissOptionalPrompt());
    expect(nextState.isOptionalModalVisible).toBe(false);
    expect(nextState.promptDismissed).toBe(true);
  });

  it('handles download progress updates', () => {
    const nextState = appUpdateReducer(initialSliceState, setDownloadProgress(45));
    expect(nextState.isDownloading).toBe(true);
    expect(nextState.downloadProgress).toBe(45);
  });

  it('handles download complete transition', () => {
    const downloadingState: AppUpdateState = {
      ...initialSliceState,
      isDownloading: true,
      downloadProgress: 75,
    };

    const nextState = appUpdateReducer(downloadingState, setDownloadComplete());
    expect(nextState.isDownloading).toBe(false);
    expect(nextState.isDownloaded).toBe(true);
    expect(nextState.downloadProgress).toBe(100);
  });

  it('resets update status after install or cancel', () => {
    const downloadedState: AppUpdateState = {
      ...initialSliceState,
      isDownloaded: true,
      downloadProgress: 100,
    };

    const nextState = appUpdateReducer(downloadedState, resetUpdateStatus());
    expect(nextState.isDownloaded).toBe(false);
    expect(nextState.downloadProgress).toBe(0);
  });

  it('displays optional modal when policy is OPTIONAL and hasUpdate=true', () => {
    const mockPolicyPayload = {
      policy: {
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        hasUpdate: true,
        action: 'OPTIONAL' as const,
        isSupported: true,
        latestVersion: '1.2.0',
        latestVersionCode: 32,
        releaseType: 'NORMAL' as const,
        releaseNotes: ['Feature improvements'],
        gracePeriodDays: 0,
        gracePeriodDeadline: null,
        daysRemaining: null,
        minSupportedVersion: null,
        minSupportedVersionCode: null,
        storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
      },
      playStoreAvailable: true,
    };

    const action = {
      type: checkAppUpdateThunk.fulfilled.type,
      payload: mockPolicyPayload,
    };

    const nextState = appUpdateReducer(initialSliceState, action);
    expect(nextState.isOptionalModalVisible).toBe(true);
    expect(nextState.isMandatoryModalVisible).toBe(false);
    expect(nextState.policy?.latestVersion).toBe('1.2.0');
  });

  it('displays mandatory blocking modal when policy is MANDATORY', () => {
    const mockCriticalPayload = {
      policy: {
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        hasUpdate: true,
        action: 'MANDATORY' as const,
        isSupported: false,
        latestVersion: '1.2.0',
        latestVersionCode: 32,
        releaseType: 'CRITICAL' as const,
        releaseNotes: ['Critical security upgrade'],
        gracePeriodDays: 0,
        gracePeriodDeadline: null,
        daysRemaining: 0,
        minSupportedVersion: null,
        minSupportedVersionCode: null,
        storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
      },
      playStoreAvailable: true,
    };

    const action = {
      type: checkAppUpdateThunk.fulfilled.type,
      payload: mockCriticalPayload,
    };

    const nextState = appUpdateReducer(initialSliceState, action);
    expect(nextState.isMandatoryModalVisible).toBe(true);
    expect(nextState.isOptionalModalVisible).toBe(false);
  });

  it('handles backend service failure gracefully (fails open without crashing)', () => {
    const action = {
      type: checkAppUpdateThunk.rejected.type,
      payload: 'Network Error',
    };

    const nextState = appUpdateReducer(initialSliceState, action);
    expect(nextState.isLoading).toBe(false);
    expect(nextState.error).toBe('Network Error');
    expect(nextState.isMandatoryModalVisible).toBe(false);
    expect(nextState.isOptionalModalVisible).toBe(false);
  });
});

describe('AppUpdate — InAppUpdateManager Fallbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens Google Play Store URL when native update is not available on platform or in dev', async () => {
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false as any);

    const opened = await inAppUpdateManager.openPlayStoreListing('https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom');
    expect(opened).toBe(true);
    expect(openUrlSpy).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom');
  });
});
