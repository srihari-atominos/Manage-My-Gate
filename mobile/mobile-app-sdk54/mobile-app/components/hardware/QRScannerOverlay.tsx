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
    <View className={cn('absolute inset-0 items-center justify-center bg-black/75', className)}>
      <View className="items-center">
        <Text className="mb-6 font-bold text-xs font-sans text-emerald-400 tracking-widest uppercase">
          {instruction}
        </Text>
        
        {/* Scanner Frame */}
        <View className="relative h-64 w-64 rounded-2xl overflow-hidden border border-emerald-500/20 bg-emerald-950/10">
          {/* HUD Corners */}
          <View className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-emerald-400 rounded-tl-xl" />
          <View className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-emerald-400 rounded-tr-xl" />
          <View className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-xl" />
          <View className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-emerald-400 rounded-br-xl" />
          
          {/* Animated Scan Line */}
          <Animated.View style={scanLineStyle} className="absolute left-2 right-2 h-0.5 bg-emerald-400" />
        </View>

        <View className="mt-8 flex-row items-center rounded-full bg-black/60 border border-emerald-500/30 px-4 py-2">
          <ScanLine size={15} className="me-2 text-emerald-400" />
          <Text className="text-xs font-bold font-sans text-emerald-400 tracking-wide uppercase">HUD Active • Scanning</Text>
        </View>
      </View>
    </View>
  );
};
