import { Alert, Platform } from 'react-native';

export interface AlertButtonOption {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert utility.
 * In React Native Web, Alert.alert is an empty no-op.
 * This utility bridges Alert.alert to window.alert / window.confirm on Web,
 * while utilizing native Alert.alert on iOS and Android.
 */
export const showCrossPlatformAlert = (
  title: string,
  message?: string,
  buttons?: AlertButtonOption[]
) => {
  const combinedText = [title, message].filter(Boolean).join('\n\n');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (!buttons || buttons.length <= 1) {
      window.alert(combinedText);
      if (buttons && buttons.length === 1 && buttons[0].onPress) {
        buttons[0].onPress();
      }
      return;
    }

    // Multiple buttons on Web -> use window.confirm
    const confirmed = window.confirm(combinedText);
    if (confirmed) {
      const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[0];
      if (confirmBtn?.onPress) confirmBtn.onPress();
    } else {
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      if (cancelBtn?.onPress) cancelBtn.onPress();
    }
    return;
  }

  Alert.alert(title, message, buttons as any);
};

export default showCrossPlatformAlert;
