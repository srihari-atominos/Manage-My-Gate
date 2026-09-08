import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface BottomNavScrollContextType {
  isCompact: boolean;
  setIsCompact: (compact: boolean) => void;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollHandlerProps: {
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
  };
}

const BottomNavScrollContext = createContext<BottomNavScrollContextType | null>(null);

// Global fallback ref and listener to enable scroll-shrink across screens without requiring nesting in provider
let globalIsCompact = false;
const globalListeners = new Set<(compact: boolean) => void>();

export const setGlobalBottomNavCompact = (compact: boolean) => {
  if (globalIsCompact !== compact) {
    globalIsCompact = compact;
    globalListeners.forEach((listener) => listener(compact));
  }
};

export const subscribeGlobalBottomNavCompact = (listener: (compact: boolean) => void) => {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
};

export const BottomNavScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCompact, setIsCompactState] = useState<boolean>(globalIsCompact);
  const lastScrollY = useRef<number>(0);

  const setIsCompact = useCallback((compact: boolean) => {
    setIsCompactState(compact);
    setGlobalBottomNavCompact(compact);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const delta = currentY - lastScrollY.current;

      // Always expand when pulled to the top of the screen
      if (currentY <= 15) {
        setIsCompact(false);
        lastScrollY.current = Math.max(0, currentY);
        return;
      }

      // Scrolling Down threshold: 16px -> Compact Navigation
      if (delta > 16) {
        setIsCompact(true);
        lastScrollY.current = currentY;
      }
      // Scrolling Up threshold: -16px -> Expand Navigation
      else if (delta < -16) {
        setIsCompact(false);
        lastScrollY.current = currentY;
      }
    },
    [setIsCompact]
  );

  const scrollHandlerProps = {
    onScroll: handleScroll,
    scrollEventThrottle: 16,
  };

  return (
    <BottomNavScrollContext.Provider
      value={{
        isCompact,
        setIsCompact,
        handleScroll,
        scrollHandlerProps,
      }}
    >
      {children}
    </BottomNavScrollContext.Provider>
  );
};

export const useBottomNavScroll = () => {
  const context = useContext(BottomNavScrollContext);
  const [compact, setCompact] = useState(globalIsCompact);
  const localLastY = useRef(0);

  React.useEffect(() => {
    return subscribeGlobalBottomNavCompact((val) => {
      setCompact(val);
    });
  }, []);

  const handleLocalScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const delta = currentY - localLastY.current;

    if (currentY <= 15) {
      setGlobalBottomNavCompact(false);
      localLastY.current = Math.max(0, currentY);
      return;
    }

    if (delta > 16) {
      setGlobalBottomNavCompact(true);
      localLastY.current = currentY;
    } else if (delta < -16) {
      setGlobalBottomNavCompact(false);
      localLastY.current = currentY;
    }
  }, []);

  if (context) {
    return context;
  }

  return {
    isCompact: compact,
    setIsCompact: setGlobalBottomNavCompact,
    handleScroll: handleLocalScroll,
    scrollHandlerProps: {
      onScroll: handleLocalScroll,
      scrollEventThrottle: 16,
    },
  };
};

export default BottomNavScrollContext;
