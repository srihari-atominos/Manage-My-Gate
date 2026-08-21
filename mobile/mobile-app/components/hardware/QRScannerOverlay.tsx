import React from 'react';
import { View } from 'react-native';
import { ScanLine } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
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
  }, [scanLineOffset]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineOffset.value }],
  }));

  return (
    <View className={cn('absolute inset-0 items-center justify-center bg-black/60', className)}>
      <View className="items-center px-6">
        <Text className="mb-6 font-bold text-primary-foreground tracking-widest uppercase text-center text-xs">
          {instruction}
        </Text>
        
        {/* Scanner Reticle Frame */}
        <View className="relative h-64 w-64">
          {/* Reticle Corners with Primary Accent */}
          <View className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-primary rounded-tl-lg" />
          <View className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-primary rounded-tr-lg" />
          <View className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-primary rounded-bl-lg" />
          <View className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-primary rounded-br-lg" />
          
          {/* Animated Scan Line */}
          <Animated.View
            style={scanLineStyle}
            className="absolute left-4 right-4 h-0.5 bg-primary shadow-sm"
          />
        </View>

        {/* Status indicator pill */}
        <View className="mt-8 flex-row items-center rounded-full bg-black/40 border border-white/20 px-4 py-2 backdrop-blur-md">
          <Icon as={ScanLine} size={16} className="me-2 text-primary-foreground" />
          <Text className="text-xs font-semibold text-primary-foreground">
            Scanning Optical Code...
          </Text>
        </View>
      </View>
    </View>
  );
};

export default QRScannerOverlay;
