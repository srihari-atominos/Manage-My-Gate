import { useState, useCallback } from 'react';
import { useColorScheme } from 'nativewind';
import { Alert } from 'react-native';

export interface AppPreferences {
  gateAlerts: boolean;
  maintenanceNotices: boolean;
  communityPolls: boolean;
  emergencyBroadcasts: boolean;
  biometricUnlock: boolean;
  requireGateApprovalPin: boolean;
}

export const useSettings = () => {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [preferences, setPreferences] = useState<AppPreferences>({
    gateAlerts: true,
    maintenanceNotices: true,
    communityPolls: true,
    emergencyBroadcasts: true,
    biometricUnlock: true,
    requireGateApprovalPin: false,
  });

  const [currentLanguage, setCurrentLanguage] = useState('English (US)');
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [usedSpace, setUsedSpace] = useState('14.2 MB');
  const totalSpace = '128 GB';
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'undetermined'>('granted');

  const toggleTheme = useCallback(
    (nextDark: boolean) => {
      setColorScheme(nextDark ? 'dark' : 'light');
    },
    [setColorScheme]
  );

  const updatePreference = useCallback(
    (key: keyof AppPreferences, value: boolean) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Application Cache',
      'This will delete cached offline passes, temporary ticket images, and diagnostic logs. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => {
            setUsedSpace('1.8 MB');
            Alert.alert('Success', 'Application cache cleared successfully.');
          },
        },
      ]
    );
  }, []);

  const handleRequestPush = useCallback(() => {
    Alert.alert(
      'Push Notifications',
      'System notification permission is already active for Manage-My-Gate.',
      [{ text: 'OK' }]
    );
  }, []);

  return {
    isDark,
    toggleTheme,
    preferences,
    updatePreference,
    currentLanguage,
    setCurrentLanguage,
    languageModalOpen,
    setLanguageModalOpen,
    usedSpace,
    totalSpace,
    pushStatus,
    handleClearCache,
    handleRequestPush,
  };
};

export default useSettings;
