import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface BottomNavScrollContextType {
  isCompact: boolean;
  setIsCompact: (compact: boolean) => void;
  handleScroll: (event: any) => void;
  scrollHandlerProps: {
    onScroll: (event: any) => void;
    scrollEventThrottle: number;
  };
}

const BottomNavScrollContext = createContext<BottomNavScrollContextType | null>(null);

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

const extractScrollY = (event: any): number => {
  if (typeof event === 'number') return event;
  if (!event) return 0;
  if (typeof event.nativeEvent?.contentOffset?.y === 'number') {
    return event.nativeEvent.contentOffset.y;
  }
  if (typeof event.contentOffset?.y === 'number') {
    return event.contentOffset.y;
  }
  return 0;
};

export const BottomNavScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCompact, setIsCompactState] = useState<boolean>(globalIsCompact);
  const isCompactRef = useRef<boolean>(globalIsCompact);
  const lastScrollY = useRef<number>(0);
  const lastScrollTime = useRef<number>(0);

  const setIsCompact = useCallback((compact: boolean) => {
    if (isCompactRef.current === compact) return;
    isCompactRef.current = compact;
    setIsCompactState(compact);
    setGlobalBottomNavCompact(compact);
  }, []);

  const handleScroll = useCallback(
    (event: any) => {
      const currentY = extractScrollY(event);
      const now = Date.now();

      // Long-page smart threshold: Never hide bottom bar on top 180px of any page
      if (currentY <= 180) {
        if (globalIsCompact) {
          setIsCompact(false);
        }
        lastScrollY.current = Math.max(0, currentY);
        return;
      }

      // Throttle rapid state flip calls
      if (now - lastScrollTime.current < 90) {
        return;
      }

      const delta = currentY - lastScrollY.current;

      // Scrolling Down threshold: 45px of downward scroll
      if (delta > 45 && !globalIsCompact) {
        lastScrollTime.current = now;
        setIsCompact(true);
        lastScrollY.current = currentY;
      }
      // Scrolling Up threshold: 25px of upward scroll reveals the bar
      else if (delta < -25 && globalIsCompact) {
        lastScrollTime.current = now;
        setIsCompact(false);
        lastScrollY.current = currentY;
      }
    },
    [setIsCompact]
  );

  const scrollHandlerProps = {
    onScroll: handleScroll,
    scrollEventThrottle: 32,
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

/**
 * Dedicated hook for BottomNavigationBar: ONLY component that listens to compact visibility state.
 * Screens DO NOT use this, preventing unnecessary screen re-renders during scroll.
 */
export const useBottomNavCompact = () => {
  const [compact, setCompact] = useState(globalIsCompact);

  React.useEffect(() => {
    let isMounted = true;
    const unsub = subscribeGlobalBottomNavCompact((val) => {
      if (isMounted) {
        setCompact(val);
      }
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  return compact;
};

/**
 * Screen scroll hook: Provides stable onScroll handlers with ZERO React state updates.
 * Prevents re-rendering entire screen trees during scroll gestures.
 */
export const useBottomNavScroll = () => {
  const context = useContext(BottomNavScrollContext);
  const localLastY = useRef(0);
  const lastScrollTime = useRef(0);

  const handleLocalScroll = useCallback((event: any) => {
    const currentY = extractScrollY(event);
    const now = Date.now();

    if (currentY <= 180) {
      if (globalIsCompact) {
        setGlobalBottomNavCompact(false);
      }
      localLastY.current = Math.max(0, currentY);
      return;
    }

    if (now - lastScrollTime.current < 90) {
      return;
    }

    const delta = currentY - localLastY.current;

    if (delta > 45 && !globalIsCompact) {
      lastScrollTime.current = now;
      setGlobalBottomNavCompact(true);
      localLastY.current = currentY;
    } else if (delta < -25 && globalIsCompact) {
      lastScrollTime.current = now;
      setGlobalBottomNavCompact(false);
      localLastY.current = currentY;
    }
  }, []);

  if (context) {
    return context;
  }

  return {
    isCompact: globalIsCompact,
    setIsCompact: setGlobalBottomNavCompact,
    handleScroll: handleLocalScroll,
    scrollHandlerProps: {
      onScroll: handleLocalScroll,
      scrollEventThrottle: 32,
    },
  };
};

export default BottomNavScrollContext;
