import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QRScannerOverlay } from './QRScannerOverlay';
import { cn } from '@/lib/utils';

export interface CameraViewFinderProps {
  onScan: (data: string) => void;
  instruction?: string;
  isScanning?: boolean;
  enableTorch?: boolean;
  fullscreen?: boolean;
  className?: string;
}

export const CameraViewFinder: React.FC<CameraViewFinderProps> = ({
  onScan,
  instruction = 'Position Amenity QR Code within Frame',
  isScanning = true,
  enableTorch = false,
  fullscreen = false,
  className,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const containerClasses = fullscreen
    ? 'flex-1 w-full h-full inset-0 absolute bg-black justify-center items-center'
    : 'h-64 w-full rounded-2xl overflow-hidden bg-black relative mb-4 border border-border justify-center items-center';

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !isScanning || !data) return;
    setScanned(true);
    onScan(data.trim());
    // Cool down for 2.5s before allowing next scan
    setTimeout(() => {
      setScanned(false);
    }, 2500);
  };

  // 1. Permission loading state
  if (!permission) {
    return (
      <View className={cn(containerClasses, className)}>
        <Text className="text-white text-xs font-semibold">Initializing camera...</Text>
      </View>
    );
  }

  // 2. Permission not granted state
  if (!permission.granted) {
    return (
      <View className={cn(containerClasses, 'p-4', className)}>
        <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mb-2">
          <CameraOff size={24} color="#ffffff" />
        </View>
        <Text className="text-white text-sm font-bold text-center mb-1">
          Camera Permission Required
        </Text>
        <Text className="text-white/60 text-xs text-center px-4 mb-3">
          Camera access is required to scan facility entry QR passes.
        </Text>
        <Button
          size="sm"
          variant="default"
          onPress={requestPermission}
          className="bg-primary px-4 py-2 rounded-xl"
        >
          <View className="flex-row items-center gap-1.5">
            <Camera size={14} color="#ffffff" />
            <Text className="text-white text-xs font-bold">Grant Permission</Text>
          </View>
        </Button>
      </View>
    );
  }

  // 3. Live Native Camera View
  return (
    <View className={cn(containerClasses, className)}>
      <CameraView
        facing="back"
        enableTorch={Boolean(enableTorch)}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={isScanning && !scanned ? handleBarcodeScanned : undefined}
        style={{ width: '100%', height: '100%' }}
      />
      <QRScannerOverlay instruction={instruction} />
    </View>
  );
};

export default CameraViewFinder;
