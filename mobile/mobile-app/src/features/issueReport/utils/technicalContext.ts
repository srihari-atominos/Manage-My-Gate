import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { TechnicalContext } from '../types/issueReport.types';

/**
 * Automatically captures client technical context without requiring manual resident input.
 * Provides resilient fallbacks across Android, iOS, Web, and Expo Go.
 */
export const getTechnicalContext = (): TechnicalContext => {
  const platform: 'android' | 'ios' | 'web' =
    Platform.OS === 'ios'
      ? 'ios'
      : Platform.OS === 'android'
      ? 'android'
      : 'web';

  let appVersion = '1.0.0';
  try {
    appVersion =
      Application.nativeApplicationVersion ||
      Application.nativeBuildVersion ||
      '1.0.0';
  } catch {
    appVersion = '1.0.0';
  }

  let deviceModel = 'Mobile Device';
  try {
    deviceModel =
      Device.modelName ||
      Device.deviceName ||
      (Platform.OS === 'web' ? 'Web Browser' : 'Mobile Device');
  } catch {
    deviceModel = Platform.OS === 'web' ? 'Web Browser' : 'Mobile Device';
  }

  let osVersion = '';
  try {
    osVersion =
      Device.osVersion ||
      (typeof Platform.Version === 'string'
        ? Platform.Version
        : String(Platform.Version ?? ''));
  } catch {
    osVersion = String(Platform.Version ?? '');
  }

  return {
    appVersion: String(appVersion).slice(0, 50),
    platform,
    deviceModel: String(deviceModel).slice(0, 100),
    osVersion: String(osVersion).slice(0, 50),
  };
};
