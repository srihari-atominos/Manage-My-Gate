import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Zap, ZapOff } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QRScannerOverlay } from './QRScannerOverlay';
import { cn } from '../../lib/utils';

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
  enableTorch,
  fullscreen = false,
  className,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [internalTorchOn, setInternalTorchOn] = useState(false);

  const torchActive = enableTorch !== undefined ? enableTorch : internalTorchOn;

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !isScanning || !data) return;
    setScanned(true);
    onScan(data.trim());
    // Cool down for 2.5s before allowing next scan
    setTimeout(() => {
      setScanned(false);
    }, 2500);
  };

  const containerClasses = fullscreen
    ? cn('absolute inset-0 w-full h-full bg-black relative justify-center items-center overflow-hidden', className)
    : cn('h-64 w-full rounded-2xl overflow-hidden bg-black relative border border-border justify-center items-center', className);

  // 1. Permission loading state
  if (!permission) {
    return (
      <View className={containerClasses}>
        <Text className="text-white text-xs font-semibold">Initializing camera...</Text>
      </View>
    );
  }

  // 2. Permission not granted state
  if (!permission.granted) {
    return (
      <View className={cn(containerClasses, 'p-4')}>
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

  // 3. Live Native Camera View with Flash Toggle
  return (
    <View className={containerClasses}>
      <CameraView
        facing="back"
        enableTorch={torchActive}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={isScanning && !scanned ? handleBarcodeScanned : undefined}
        style={{ width: '100%', height: '100%' }}
      />
      <QRScannerOverlay instruction={instruction} />

      {/* Compact Flashlight Torch Toggle Overlay (rendered if parent does not pass enableTorch) */}
      {enableTorch === undefined && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setInternalTorchOn(!internalTorchOn)}
          className={`absolute top-3 right-3 z-30 px-2.5 py-1.5 rounded-full flex-row items-center gap-1 border shadow-lg ${
            internalTorchOn
              ? 'bg-amber-400 border-amber-300 shadow-amber-500/40'
              : 'bg-black/75 border-white/30 shadow-black/50'
          }`}
        >
          {internalTorchOn ? (
            <>
              <Zap size={13} color="#000000" fill="#000000" strokeWidth={2.5} />
              <Text className="text-[10px] font-black text-black tracking-wider uppercase">Flash ON</Text>
            </>
          ) : (
            <>
              <ZapOff size={13} color="#ffffff" strokeWidth={2.5} />
              <Text className="text-[10px] font-bold text-white tracking-wider uppercase">Flash OFF</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CameraViewFinder;

