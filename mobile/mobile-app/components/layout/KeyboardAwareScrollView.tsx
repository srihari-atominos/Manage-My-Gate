import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  TextInput as RNTextInput,
  findNodeHandle,
  UIManager,
  NativeModules,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { useKeyboard } from './useKeyboard';

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  extraScrollHeight?: number;
  enableAutoScroll?: boolean;
}

export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  (
    {
      children,
      extraScrollHeight = 40,
      enableAutoScroll = true,
      contentContainerStyle,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = 'on-drag',
      showsVerticalScrollIndicator = false,
      ...props
    },
    ref
  ) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const containerRef = useRef<View>(null);
    const { keyboardShown, keyboardHeight } = useKeyboard();

    useImperativeHandle(ref, () => scrollViewRef.current as ScrollView);

    // Keep the keyboard fixed and scroll only the focused field into view.
    // This avoids the whole page jumping when a lower form field receives focus.
    useEffect(() => {
      if (Platform.OS === 'web') return;

      const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
        const focusedInput = RNTextInput.State.currentlyFocusedInput?.();
        const focusedHandle = focusedInput ? findNodeHandle(focusedInput as any) : null;
        const scrollHandle = findNodeHandle(scrollViewRef.current);
        if (!focusedHandle || !scrollHandle) return;
        const visibleKeyboardHeight = event.endCoordinates?.height || keyboardHeight;

        setTimeout(() => {
          UIManager.measureLayout(
            focusedHandle,
            scrollHandle,
            () => undefined,
            (_x, y, _width, height) => {
              const desiredTop = Math.max(0, y + height - visibleKeyboardHeight - extraScrollHeight);
              scrollViewRef.current?.scrollTo({ y: desiredTop, animated: true });
            },
          );
        }, 80);
      });

      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
      const hideSubscription = Keyboard.addListener(hideEvent, () => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }, [extraScrollHeight, keyboardHeight]);

    const dismissAnyKeyboard = () => {
      Keyboard.dismiss();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    const scrollView = (
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        automaticallyAdjustKeyboardInsets={false}
        decelerationRate="normal"
        scrollEventThrottle={16}
        alwaysBounceVertical={false}
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        overScrollMode="never"
        contentContainerStyle={[
          { flexGrow: 1 },
          contentContainerStyle,
        ]}
        {...props}
      >
        <View
          ref={containerRef}
          style={{ flexGrow: 1 }}
        >
          {children}
        </View>
      </ScrollView>
    );

    return scrollView;
  }
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';
export default KeyboardAwareScrollView;
