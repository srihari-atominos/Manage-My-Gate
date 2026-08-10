import React from 'react';
import { View, Text } from 'react-native';
import { ScanLine } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '../../lib/utils';

export interface QRScannerOverlayProps {
  instruction?: string;
  className?: string;
}

export const QRScannerOverlay = ({
  instruction = 'Align QR Code within frame',
  className,
}: QRScannerOverlayProps) => {
  const scanLineOffset = useSharedValue(0);

  React.useEffect(() => {
    scanLineOffset.value = withRepeat(
      withSequence(
        withTiming(200, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineOffset.value }],
  }));

  return (
    <View className={cn('absolute inset-0 items-center justify-center bg-black/60', className)}>
      <View className="items-center">
        <Text className="mb-6 font-semibold text-white tracking-widest uppercase">
          {instruction}
        </Text>
        
        {/* Scanner Frame */}
        <View className="relative h-64 w-64">
          {/* Corners */}
          <View className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-primary" />
          <View className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-primary" />
          <View className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-primary" />
          <View className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-primary" />
          
          {/* Animated Scan Line */}
          <Animated.View style={scanLineStyle} className="absolute left-4 right-4 h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(var(--color-primary),0.8)]" />
        </View>

        <View className="mt-8 flex-row items-center rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
          <ScanLine size={16} className="mr-2 text-white" />
          <Text className="text-sm font-medium text-white">Scanning...</Text>
        </View>
      </View>
    </View>
  );
};
