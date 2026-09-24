import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { Platform, BackHandler, ToastAndroid } from 'react-native';
import { useDoubleBackToExit } from '../useDoubleBackToExit';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => {
        return callback();
      }, [callback]);
    },
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
    }),
  };
});

describe('useDoubleBackToExit', () => {
  let backHandlerCallback: (() => boolean) | null = null;
  let exitAppMock: jest.Mock;
  let toastMock: jest.Mock;
  let removeListenerMock: jest.Mock;

  beforeEach(() => {
    backHandlerCallback = null;
    exitAppMock = jest.fn();
    toastMock = jest.fn();
    removeListenerMock = jest.fn();

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = handler as () => boolean;
      }
      return { remove: removeListenerMock } as any;
    });
    jest.spyOn(BackHandler, 'exitApp').mockImplementation(exitAppMock);

    (ToastAndroid as any).show = toastMock;
    (ToastAndroid as any).SHORT = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    });

    it('attaches a hardwareBackPress listener on Android', async () => {
      await renderHook(() => useDoubleBackToExit());
      expect(BackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function)
      );
      expect(backHandlerCallback).not.toBeNull();
    });

    it('shows toast on first back press and does NOT exit the app', async () => {
      await renderHook(() => useDoubleBackToExit());
      expect(backHandlerCallback).not.toBeNull();

      let result = false;
      await act(async () => {
        result = backHandlerCallback!();
      });

      expect(result).toBe(true);
      expect(toastMock).toHaveBeenCalledWith('Press back again to exit', 0);
      expect(exitAppMock).not.toHaveBeenCalled();
    });

    it('exits the app if back is pressed again within 2 seconds', async () => {
      await renderHook(() => useDoubleBackToExit({ timeoutMs: 2000 }));
      expect(backHandlerCallback).not.toBeNull();

      // First press
      await act(async () => {
        backHandlerCallback!();
      });
      expect(toastMock).toHaveBeenCalledTimes(1);
      expect(exitAppMock).not.toHaveBeenCalled();

      // Immediate second press (< 2000ms)
      await act(async () => {
        backHandlerCallback!();
      });

      expect(exitAppMock).toHaveBeenCalledTimes(1);
    });

    it('resets and shows toast again if back is pressed after timeout', async () => {
      jest.useFakeTimers();
      await renderHook(() => useDoubleBackToExit({ timeoutMs: 2000 }));
      expect(backHandlerCallback).not.toBeNull();

      // First press
      await act(async () => {
        backHandlerCallback!();
      });
      expect(toastMock).toHaveBeenCalledTimes(1);

      // Advance time beyond 2000ms timeout
      await act(async () => {
        jest.advanceTimersByTime(2500);
      });

      // Press again after timeout
      await act(async () => {
        backHandlerCallback!();
      });

      // Should show toast again instead of exiting
      expect(toastMock).toHaveBeenCalledTimes(2);
      expect(exitAppMock).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('intercepts back press when onBeforeExitCheck returns true', async () => {
      const onBeforeExitCheck = jest.fn(() => true);
      await renderHook(() => useDoubleBackToExit({ onBeforeExitCheck }));

      let result = false;
      await act(async () => {
        result = backHandlerCallback!();
      });

      expect(result).toBe(true);
      expect(onBeforeExitCheck).toHaveBeenCalled();
      expect(toastMock).not.toHaveBeenCalled();
      expect(exitAppMock).not.toHaveBeenCalled();
    });

    it('proceeds with exit check when onBeforeExitCheck returns false', async () => {
      const onBeforeExitCheck = jest.fn(() => false);
      await renderHook(() => useDoubleBackToExit({ onBeforeExitCheck }));

      await act(async () => {
        backHandlerCallback!();
      });

      expect(onBeforeExitCheck).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith('Press back again to exit', 0);
      expect(exitAppMock).not.toHaveBeenCalled();
    });

    it('removes listener on unmount', async () => {
      const hook = await renderHook(() => useDoubleBackToExit());
      await act(async () => {
        hook.unmount();
      });

      expect(removeListenerMock).toHaveBeenCalled();
    });
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    it('does NOT attach hardwareBackPress listener on iOS', async () => {
      await renderHook(() => useDoubleBackToExit());
      expect(BackHandler.addEventListener).not.toHaveBeenCalled();
    });
  });
});
