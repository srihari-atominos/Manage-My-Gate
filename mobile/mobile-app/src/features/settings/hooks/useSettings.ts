import { useState, useCallback, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { Alert, Platform, useColorScheme as useRNColorScheme } from 'react-native';
import storage from '../../../utils/storage';
import i18n, { LanguageCode, LANGUAGE_OPTIONS, useTranslation } from '../../../utils/i18n';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../auth/hooks/useAuth';
import deviceTokenService from '../../notification/services/deviceTokenService';
import pushNotificationService, {
  setPushNotificationEnabled,
  registerForPushNotificationsAsync,
} from '../../notification/services/pushNotificationService';
import * as Device from 'expo-device';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppPreferences {
  gateAlerts: boolean;
  maintenanceNotices: boolean;
  communityPolls: boolean;
  emergencyBroadcasts: boolean;
  biometricUnlock: boolean;
  requireGateApprovalPin: boolean;
}

let globalThemeMode: ThemeMode = 'light';
const themeListeners = new Set<(mode: ThemeMode) => void>();

export const useSettings = () => {
  const { user } = useAuth();
  const userId = user?.id || (user as any)?._id;
  const systemRNTheme = useRNColorScheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { t, languageCode, setLanguage } = useTranslation();

  const [themeMode, setThemeModeState] = useState<ThemeMode>(globalThemeMode);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);

  // Sync with global theme updates
  useEffect(() => {
    const listener = (mode: ThemeMode) => {
      setThemeModeState(mode);
    };
    themeListeners.add(listener);
    return () => {
      themeListeners.delete(listener);
    };
  }, []);

  const [preferences, setPreferences] = useState<AppPreferences>({
    gateAlerts: true,
    maintenanceNotices: true,
    communityPolls: true,
    emergencyBroadcasts: true,
    biometricUnlock: true,
    requireGateApprovalPin: false,
  });

  // Restore saved theme mode, language & preferences on mount
  useEffect(() => {
    const restoreSettings = async () => {
      try {
        const savedTheme = await storage.getItem('theme_preference');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          globalThemeMode = savedTheme as ThemeMode;
          setThemeModeState(savedTheme as ThemeMode);
          setColorScheme(savedTheme as 'light' | 'dark');
        } else if (savedTheme === 'system') {
          globalThemeMode = 'system';
          setThemeModeState('system');
          setColorScheme('system');
        } else {
          // Default to system theme on fresh install
          globalThemeMode = 'system';
          setThemeModeState('system');
          setColorScheme('system');
          await storage.setItem('theme_preference', 'system');
        }

        const preferenceKeys: (keyof AppPreferences)[] = [
          'gateAlerts',
          'maintenanceNotices',
          'communityPolls',
          'emergencyBroadcasts',
          'biometricUnlock',
          'requireGateApprovalPin',
        ];

        const restoredPrefs: Partial<AppPreferences> = {};
        for (const key of preferenceKeys) {
          const val = await storage.getItem(`setting_${key}`);
          if (val !== null && val !== undefined) {
            try {
              restoredPrefs[key] = JSON.parse(val);
            } catch {
              restoredPrefs[key] = val === 'true';
            }
          }
        }

        if (Object.keys(restoredPrefs).length > 0) {
          setPreferences((prev) => ({ ...prev, ...restoredPrefs }));
        }

        await i18n.initLanguage();
      } catch (err) {
        console.warn('Failed to restore settings:', err);
      }
    };
    restoreSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setThemeMode = useCallback(
    async (nextMode: ThemeMode) => {
      globalThemeMode = nextMode;
      setThemeModeState(nextMode);
      themeListeners.forEach((fn) => fn(nextMode));

      setColorScheme(nextMode);
      try {
        await storage.setItem('theme_preference', nextMode);
      } catch (err) {
        console.warn('Failed to save theme preference:', err);
      }
    },
    [setColorScheme, systemRNTheme]
  );

  const setLanguageCode = useCallback(async (code: LanguageCode) => {
    await setLanguage(code);
  }, [setLanguage]);

  const isDark = colorScheme === 'dark';

  const updatePreference = useCallback((key: keyof AppPreferences, value: boolean) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      storage.setItem(`setting_${key}`, JSON.stringify(value)).catch(() => {});
      return next;
    });

    if (key === 'gateAlerts') {
      (async () => {
        try {
          await setPushNotificationEnabled(value);
          if (!value) {
            // 1. User turned off push notifications: deactivate token on backend
            const cachedToken = await storage.getItem('device_push_token');
            if (cachedToken) {
              await deviceTokenService.unregisterToken(cachedToken, userId).catch(() => {});
            }
            // Deactivate all tokens for this user as defense-in-depth
            await apiClient.delete('/device-tokens').catch(() => {});
            // Sync user profile preference
            await apiClient.patch('/users/profile', {
              notificationPreferences: { push: false },
            }).catch(() => {});
            console.log('[useSettings] Push notifications deactivated across device and backend');
          } else {
            // 2. User re-enabled push notifications: register token with backend
            const token = await registerForPushNotificationsAsync();
            if (token && userId) {
              await deviceTokenService.registerToken(
                {
                  pushToken: token,
                  platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
                  deviceId: Device.osBuildId || Device.osInternalBuildId || undefined,
                  deviceModel: Device.modelName || undefined,
                },
                userId
              );
            }
            // Sync user profile preference
            await apiClient.patch('/users/profile', {
              notificationPreferences: { push: true },
            }).catch(() => {});
            console.log('[useSettings] Push notifications re-enabled and registered with backend');
          }
        } catch (err) {
          console.warn('[useSettings] Error updating push notification preference:', err);
        }
      })();
    }
  }, [userId]);

  const handleClearCache = useCallback(() => {
    const doClear = async () => {
      try {
        await storage.removeItem('community_pulse_mock_list');
        await storage.removeItem('community_pulse_mood');
        await storage.removeItem('community_pulse_question');
        if (Platform.OS === 'web') {
          window.alert(t('cache_cleared', 'Application cache cleared successfully.'));
        } else {
          Alert.alert(
            t('success', 'Success'),
            t('cache_cleared', 'Application cache cleared successfully.')
          );
        }
      } catch (e) {
        if (Platform.OS === 'web') {
          window.alert('Application cache cleared.');
        } else {
          Alert.alert('Notice', 'Application cache cleared.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to clear application cache and temporary storage?'
      );
      if (confirmed) {
        doClear();
      }
    } else {
      Alert.alert(
        t('clear_cache', 'Clear Application Cache'),
        'Are you sure you want to clear application cache and temporary storage?',
        [
          { text: t('cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('clear_cache', 'Clear Cache'),
            style: 'destructive',
            onPress: doClear,
          },
        ]
      );
    }
  }, [t]);

  const selectedLanguageOption =
    LANGUAGE_OPTIONS.find((opt) => opt.code === languageCode) || LANGUAGE_OPTIONS[0];

  return {
    isDark,
    themeMode,
    setThemeMode,
    languageCode,
    setLanguageCode,
    currentLanguageLabel: selectedLanguageOption.label,
    languageModalOpen,
    setLanguageModalOpen,
    preferences,
    updatePreference,
    handleClearCache,
    t,
  };
};

export default useSettings;
