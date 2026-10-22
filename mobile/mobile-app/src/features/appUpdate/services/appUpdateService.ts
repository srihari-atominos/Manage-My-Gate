import apiClient from '../../../services/apiClient';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface AppReleasePolicy {
  platform: string;
  applicationId: string;
  hasUpdate: boolean;
  action: 'NONE' | 'OPTIONAL' | 'MANDATORY';
  isSupported: boolean;
  latestVersion: string | null;
  latestVersionCode: number | null;
  releaseType: 'NORMAL' | 'IMPORTANT' | 'CRITICAL' | null;
  releaseNotes: string[];
  gracePeriodDays: number;
  gracePeriodDeadline: string | null;
  daysRemaining: number | null;
  minSupportedVersion: string | null;
  minSupportedVersionCode: number | null;
  storeUrl: string;
}

export const DEFAULT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom';

/**
 * Fetch current application release policy from the backend
 */
export const fetchAppUpdatePolicy = async (): Promise<AppReleasePolicy> => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const applicationId = 'com.atominosconsulting.nahom';
  const version = Constants.expoConfig?.version || '1.0.8';
  const versionCode = Constants.expoConfig?.android?.versionCode || 30;

  const response = await apiClient.get('/app-updates/policy', {
    params: {
      platform,
      applicationId,
      version,
      versionCode,
    },
  });

  const data = response?.data?.data || response?.data;
  return data as AppReleasePolicy;
};

export default {
  fetchAppUpdatePolicy,
  DEFAULT_PLAY_STORE_URL,
};
