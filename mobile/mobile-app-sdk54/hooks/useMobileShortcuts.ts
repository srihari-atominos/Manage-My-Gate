import { useRef, useCallback, useState } from 'react';
import { Clipboard, Alert } from 'react-native';

export interface DoubleTapOptions {
  onDoubleTap?: () => void;
  onSingleTap?: () => void;
  delayMs?: number;
}

export function useMobileShortcuts() {
  const lastTapRef = useRef<number>(0);

  const handleDoubleTap = useCallback(
    ({ onDoubleTap, onSingleTap, delayMs = 300 }: DoubleTapOptions) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = delayMs;

      if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        lastTapRef.current = 0;
        if (onDoubleTap) {
          onDoubleTap();
        }
      } else {
        lastTapRef.current = now;
        if (onSingleTap) {
          setTimeout(() => {
            if (lastTapRef.current === now) {
              onSingleTap();
            }
          }, DOUBLE_TAP_DELAY);
        }
      }
    },
    []
  );

  const copyToClipboard = useCallback((text: string, label = 'Copied') => {
    if (!text) return;
    Clipboard.setString(text);
    Alert.alert(label, `"${text}" copied to clipboard.`);
  }, []);

  return {
    handleDoubleTap,
    copyToClipboard,
  };
}
