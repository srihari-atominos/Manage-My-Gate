import { useState, useCallback, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { Alert, Platform, useColorScheme as useRNColorScheme } from 'react-native';
import storage from '../../../utils/storage';
import i18n, { LanguageCode, LANGUAGE_OPTIONS } from '../../../utils/i18n';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppPreferences {
  gateAlerts: boolean;
  maintenanceNotices: boolean;
  communityPolls: boolean;
  emergencyBroadcasts: boolean;
  biometricUnlock: boolean;
  requireGateApprovalPin: boolean;
}

export const useSettings = () => {
  const systemRNTheme = useRNColorScheme();
  const { colorScheme, setColorScheme } = useColorScheme();

  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [languageCode, setLanguageCodeState] = useState<LanguageCode>('en');
  const [languageModalOpen, setLanguageModalOpen] = useState(false);

  const [preferences, setPreferences] = useState<AppPreferences>({
    gateAlerts: true,
    maintenanceNotices: true,
    communityPolls: true,
    emergencyBroadcasts: true,
    biometricUnlock: true,
    requireGateApprovalPin: false,
  });

  // Restore saved theme mode & language on mount
  useEffect(() => {
    const restoreSettings = async () => {
      try {
        const savedTheme = await storage.getItem('theme_preference');
        if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
          setThemeModeState(savedTheme as ThemeMode);
          if (savedTheme === 'system') {
            setColorScheme(systemRNTheme === 'dark' ? 'dark' : 'light');
          } else {
            setColorScheme(savedTheme);
          }
        } else {
          // Default to Phone System Default on fresh install
          setThemeModeState('system');
          setColorScheme(systemRNTheme === 'dark' ? 'dark' : 'light');
        }

        const lang = await i18n.initLanguage();
        setLanguageCodeState(lang);
      } catch (err) {
        console.warn('Failed to restore settings:', err);
      }
    };
    restoreSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setThemeMode = useCallback(
    async (nextMode: ThemeMode) => {
      setThemeModeState(nextMode);
      if (nextMode === 'system') {
        const effectiveTheme = systemRNTheme === 'dark' ? 'dark' : 'light';
        setColorScheme(effectiveTheme);
      } else {
        setColorScheme(nextMode);
      }
      try {
        await storage.setItem('theme_preference', nextMode);
      } catch (err) {
        console.warn('Failed to save theme preference:', err);
      }
    },
    [setColorScheme, systemRNTheme]
  );

  const setLanguageCode = useCallback(async (code: LanguageCode) => {
    setLanguageCodeState(code);
    await i18n.setLanguage(code);
  }, []);

  const isDark = colorScheme === 'dark';

  const updatePreference = useCallback((key: keyof AppPreferences, value: boolean) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      storage.setItem(`setting_${key}`, JSON.stringify(value)).catch(() => {});
      return next;
    });
  }, []);

  const handleClearCache = useCallback(() => {
    const doClear = async () => {
      try {
        await storage.removeItem('community_pulse_mock_list');
        await storage.removeItem('community_pulse_mood');
        await storage.removeItem('community_pulse_question');
        if (Platform.OS === 'web') {
          window.alert(i18n.t('cache_cleared', 'Application cache cleared successfully.'));
        } else {
          Alert.alert(
            i18n.t('success', 'Success'),
            i18n.t('cache_cleared', 'Application cache cleared successfully.')
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
        i18n.t('clear_cache', 'Clear Application Cache'),
        'Are you sure you want to clear application cache and temporary storage?',
        [
          { text: i18n.t('cancel', 'Cancel'), style: 'cancel' },
          {
            text: i18n.t('clear_cache', 'Clear Cache'),
            style: 'destructive',
            onPress: doClear,
          },
        ]
      );
    }
  }, []);

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
    t: i18n.t,
  };
};

export default useSettings;
