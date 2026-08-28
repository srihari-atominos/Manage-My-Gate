import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface OfflineBannerProps {
  isVisible: boolean;
  className?: string;
}

export const OfflineBanner = ({ isVisible, className }: OfflineBannerProps) => {
  const insets = useSafeAreaInsets();
  
  if (!isVisible) return null;

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 16) }}
      className={cn(
        'absolute left-0 right-0 top-0 z-50 flex-row items-center justify-center bg-red-500 pb-2 shadow-sm',
        className
      )}
    >
      <WifiOff size={16} className="text-white mr-2" />
      <Text className="text-sm font-semibold text-white">
        No Internet Connection
      </Text>
    </View>
  );
};
