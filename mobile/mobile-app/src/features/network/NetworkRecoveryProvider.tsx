import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, CloudOff, RefreshCw } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import {
  getNetworkStatus,
  refreshNetworkStatus,
  startNetworkMonitoring,
  subscribeNetworkStatus,
  type NetworkStatus,
} from '@/src/services/networkStatus';

const NetworkStatusContext = createContext<NetworkStatus>(getNetworkStatus());

export const useNetworkStatus = () => useContext(NetworkStatusContext);

/** Runs `callback` each time connectivity is restored (not on first mount). */
export const useReconnectEffect = (callback: () => void) => {
  const { recoveredAt } = useNetworkStatus();
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;
  const seen = React.useRef(recoveredAt);
  useEffect(() => {
    if (recoveredAt && recoveredAt !== seen.current) {
      seen.current = recoveredAt;
      callbackRef.current();
    }
  }, [recoveredAt]);
};

/** True while the global connectivity banner is on screen (it already covers the status-bar inset). */
export const useIsNetworkBannerVisible = () => {
  const network = useNetworkStatus();
  return !network.isOnline || Boolean(network.issue);
};

function GlobalNetworkBanner() {
  const network = useNetworkStatus();
  const [checking, setChecking] = useState(false);
  const insets = useSafeAreaInsets();
  if (network.isOnline && !network.issue) return null;

  const offline = !network.isOnline || network.issue === 'offline';
  const Icon = offline ? WifiOff : CloudOff;
  const message = offline
    ? "You're offline. Saved information stays available."
    : network.issue === 'timeout'
      ? 'Connection is taking longer than usual.'
      : 'Service is temporarily unavailable.';
  const detail = offline
    ? 'Check your internet connection to continue.'
    : network.issue === 'timeout'
      ? 'Your information is safe. You can try again shortly.'
      : 'Your information is safe. Please try again shortly.';
  // Nahom's warm ivory/orange theme, so the notice reads as part of the app rather than a system overlay
  const palette = offline
    ? { backgroundColor: '#FFF1E3', borderColor: '#FFD6B0', iconColor: '#E8590C', textColor: '#7A3A0E' }
    : { backgroundColor: '#FFF8EF', borderColor: '#F3DFC2', iconColor: '#B8741A', textColor: '#6B4A1F' };

  const checkConnection = async () => {
    setChecking(true);
    try {
      await refreshNetworkStatus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <View
      className="px-4 pb-2.5 flex-row items-center"
      style={{
        backgroundColor: palette.backgroundColor,
        borderBottomColor: palette.borderColor,
        borderBottomWidth: 1,
        // Sit below the status bar / notch; screens drop their own top inset while this shows.
        paddingTop: Math.max(insets.top, 8) + 6,
      }}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon size={17} color={palette.iconColor} />
      <View className="ms-2 flex-1">
        <Text className="text-xs font-bold" style={{ color: palette.textColor }}>{message}</Text>
        <Text className="text-[11px] mt-0.5" style={{ color: palette.textColor }}>{detail}</Text>
      </View>
      {offline ? <TouchableOpacity
        onPress={checkConnection}
        disabled={checking}
        className="ms-3 min-h-8 px-2.5 rounded-lg items-center justify-center flex-row"
        style={{ backgroundColor: '#FFFFFF', borderColor: palette.borderColor, borderWidth: 1, opacity: checking ? 0.65 : 1 }}
        accessibilityRole="button"
        accessibilityLabel="Check connection"
      >
        <RefreshCw size={13} color={palette.iconColor} />
        <Text className="ms-1 text-[11px] font-bold" style={{ color: palette.textColor }}>
          {checking ? 'Checking' : 'Check'}
        </Text>
      </TouchableOpacity> : null}
    </View>
  );
}

export const NetworkRecoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const network = useSyncExternalStore(subscribeNetworkStatus, getNetworkStatus, getNetworkStatus);

  useEffect(() => {
    const unsubscribe = startNetworkMonitoring();
    return () => unsubscribe();
  }, []);

  const insets = useSafeAreaInsets();
  const bannerVisible = !network.isOnline || Boolean(network.issue);
  // While the banner covers the status bar, every screen below it must not reserve that inset again.
  const childInsets = useMemo(
    () => (bannerVisible ? { ...insets, top: 0 } : insets),
    [bannerVisible, insets]
  );

  return (
    <NetworkStatusContext.Provider value={network}>
      <GlobalNetworkBanner />
      <SafeAreaInsetsContext.Provider value={childInsets}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </NetworkStatusContext.Provider>
  );
};

export default NetworkRecoveryProvider;