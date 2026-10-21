import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { Camera, useCameraPermissions } from 'expo-camera';

export const useCameraPermissionFlow = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [settingsHint, setSettingsHint] = useState<string | null>(null);
  const [settingsPromptVisible, setSettingsPromptVisible] = useState(false);
  const settingsOpenedRef = useRef(false);

  const refreshAfterSettings = useCallback(async () => {
    const latest = await Camera.getCameraPermissionsAsync();

    if (latest.granted) {
      settingsOpenedRef.current = false;
      setSettingsHint(null);
      // Refresh the permission response held by useCameraPermissions so the
      // scanner renders immediately after returning from Settings.
      await requestPermission();
      return;
    }

    if (settingsOpenedRef.current) {
      settingsOpenedRef.current = false;
      setSettingsHint('Turn on Camera for this app, then come back.');
    }
  }, [requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshAfterSettings();
      }
    });

    return () => subscription.remove();
  }, [refreshAfterSettings]);

  const openSettings = useCallback(() => {
    settingsOpenedRef.current = true;
    setSettingsHint('Turn on Camera for this app, then come back.');
    void Linking.openSettings();
  }, []);

  const dismissSettingsPrompt = useCallback(() => {
    setSettingsPromptVisible(false);
    setSettingsHint('You can turn on camera access later in Settings to use the scanner.');
  }, []);

  const confirmSettingsPrompt = useCallback(() => {
    setSettingsPromptVisible(false);
    openSettings();
  }, [openSettings]);

  const requestCameraAccess = useCallback(async () => {
    const current = permission || (await Camera.getCameraPermissionsAsync());
    if (current.granted) return true;

    if (current.status === 'undetermined') {
      const requested = await requestPermission();
      if (requested.granted) setSettingsHint(null);
      return requested.granted;
    }

    // Expo's typed PermissionStatus omits iOS's restricted value, but a native
    // permission response can still expose it on managed/native builds.
    if (String(current.status) === 'restricted') {
      Alert.alert(
        'Camera access is restricted',
        'Camera access is restricted on this device. A device administrator must allow it before scanning can be used.',
        [{ text: 'OK' }]
      );
      return false;
    }

    setSettingsPromptVisible(true);
    return false;
  }, [permission, requestPermission]);

  return {
    permission,
    requestCameraAccess,
    settingsHint,
    settingsPromptVisible,
    dismissSettingsPrompt,
    confirmSettingsPrompt,
  };
};

export default useCameraPermissionFlow;
