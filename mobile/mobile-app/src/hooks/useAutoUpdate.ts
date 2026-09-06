import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert } from 'react-native';

/**
 * useAutoUpdate
 * Automatically checks for OTA (Over-The-Air) updates from EAS in production builds.
 * When a new update is fetched, prompts the user to reload immediately or applies on next restart.
 */
export function useAutoUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync();
          if (fetched.isNew) {
            Alert.alert(
              'Update Available',
              'A new update is ready. Would you like to restart now to apply it?',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Restart Now',
                  onPress: async () => {
                    await Updates.reloadAsync();
                  },
                },
              ]
            );
          }
        }
      } catch (error) {
        // Silently catch network/offline errors during update checks
        console.log('[AutoUpdate] Check skipped or failed:', error);
      }
    }

    checkForUpdates();
  }, []);
}

export default useAutoUpdate;
