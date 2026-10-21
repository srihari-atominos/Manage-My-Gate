import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import type { PermissionResponse } from 'expo';

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';
const loadContacts = () => require('expo-contacts') as typeof import('expo-contacts');

export const useContactsPermissionFlow = () => {
  const [permission, setPermission] = useState<PermissionResponse | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [settingsHint, setSettingsHint] = useState<string | null>(null);
  const settingsOpenedRef = useRef(false);

  const readPermission = useCallback(async () => {
    if (!isSupported) return null;
    const current = await loadContacts().getPermissionsAsync();
    setPermission(current);
    return current;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void readPermission().then((current) => {
        if (!current) return;
        if (current.granted) {
          settingsOpenedRef.current = false;
          setPromptVisible(false);
          setSettingsHint(null);
        } else if (settingsOpenedRef.current) {
          settingsOpenedRef.current = false;
          setSettingsHint('Turn on Contacts for this app, then come back.');
        }
      });
    });
    return () => subscription.remove();
  }, [readPermission]);

  const openSettings = useCallback(() => {
    settingsOpenedRef.current = true;
    setPromptVisible(false);
    setSettingsHint('Turn on Contacts for this app, then come back.');
    void Linking.openSettings();
  }, []);

  const acceptContactsAccess = useCallback(async () => {
    const current = permission || (await readPermission());
    if (!current) return;

    if (current.granted) {
      setPromptVisible(false);
      return;
    }

    if (String(current.status) === 'restricted') {
      setPromptVisible(false);
      Alert.alert(
        'Contacts access is restricted',
        'Contacts access is restricted on this device. A device administrator must allow it before contacts can be used.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (current.status === 'undetermined' && current.canAskAgain) {
      const requested = await loadContacts().requestPermissionsAsync();
      setPermission(requested);
      setPromptVisible(false);
      if (!requested.granted) setSettingsHint('You can turn on Contacts later in Settings to use contact access.');
      return;
    }

    openSettings();
  }, [openSettings, permission, readPermission]);

  const requestContactsAccess = useCallback(async () => {
    const current = permission || (await readPermission());
    if (!current) return false;
    if (current.granted) return true;
    setPromptVisible(true);
    return false;
  }, [permission, readPermission]);

  const denyContactsAccess = useCallback(() => {
    setPromptVisible(false);
    setSettingsHint('You can turn on Contacts later in Settings to use contact access.');
  }, []);

  return {
    permission,
    promptVisible,
    settingsHint,
    requestContactsAccess,
    acceptContactsAccess,
    denyContactsAccess,
  };
};

export default useContactsPermissionFlow;
