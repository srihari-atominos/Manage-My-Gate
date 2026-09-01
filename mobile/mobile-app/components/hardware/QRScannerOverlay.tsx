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
        withTiming(220, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineOffset.value }],
  }));

  return (
    <View className={cn('absolute inset-0 pointer-events-none z-10 flex-col items-center justify-between', className)}>
      {/* Top Vignette Overlay with Instruction Badge */}
      <View className="w-full flex-1 bg-black/40 items-center justify-end pb-3 px-4">
        <View className="bg-black/70 border border-emerald-500/40 px-4 py-1.5 rounded-full shadow-lg">
          <Text className="font-bold text-xs font-sans text-emerald-400 tracking-widest uppercase text-center">
            {instruction}
          </Text>
        </View>
      </View>

      {/* Middle Row with Clear Aperture Viewfinder & Side Backdrops */}
      <View className="w-full flex-row items-center justify-center">
        {/* Left Dark Vignette */}
        <View className="flex-1 bg-black/40 h-60" />

        {/* Center Scanner Viewfinder Frame (100% Clear Viewport) */}
        <View className="relative h-60 w-60 rounded-2xl overflow-hidden border border-emerald-400/40 bg-transparent shadow-2xl">
          {/* HUD Corner Brackets */}
          <View className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-emerald-400 rounded-tl-xl z-20" />
          <View className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-emerald-400 rounded-tr-xl z-20" />
          <View className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl z-20" />
          <View className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl z-20" />

          {/* Animated Scanning Laser */}
          <Animated.View style={scanLineStyle} className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-md shadow-emerald-400" />
        </View>

        {/* Right Dark Vignette */}
        <View className="flex-1 bg-black/40 h-60" />
      </View>

      {/* Bottom Vignette Overlay with HUD Status Badge */}
      <View className="w-full flex-1 bg-black/40 items-center justify-start pt-3 px-4">
        <View className="flex-row items-center rounded-full bg-black/70 border border-emerald-500/40 px-4 py-1.5 shadow-lg">
          <ScanLine size={14} className="me-2 text-emerald-400" />
          <Text className="text-[11px] font-bold font-sans text-emerald-400 tracking-wide uppercase">
            HUD Active • Optical Scan
          </Text>
        </View>
      </View>
    </View>
  );
};

