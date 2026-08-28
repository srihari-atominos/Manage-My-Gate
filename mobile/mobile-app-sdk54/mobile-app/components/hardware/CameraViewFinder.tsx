import React, { useState } from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw, Zap, ZapOff } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QRScannerOverlay } from './QRScannerOverlay';

export interface CameraViewFinderProps {
  onScan: (data: string) => void;
  instruction?: string;
  isScanning?: boolean;
}

export const CameraViewFinder: React.FC<CameraViewFinderProps> = ({
  onScan,
  instruction = 'Position Amenity QR Code within Frame',
  isScanning = true,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

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
      <View className="h-64 w-full rounded-2xl overflow-hidden bg-black relative mb-4 border border-border justify-center items-center">
        <Text className="text-white text-xs font-semibold">Initializing camera...</Text>
      </View>
    );
  }

  // 2. Permission not granted state
  if (!permission.granted) {
    return (
      <View className="h-64 w-full rounded-2xl overflow-hidden bg-black relative mb-4 border border-border justify-center items-center p-4">
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
    <View className="h-64 w-full rounded-2xl overflow-hidden bg-black relative mb-4 border border-border justify-center items-center">
      <CameraView
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={isScanning && !scanned ? handleBarcodeScanned : undefined}
        style={{ width: '100%', height: '100%' }}
      />
      <QRScannerOverlay instruction={instruction} />

      {/* Quick Flashlight Torch Toggle Overlay */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setTorchOn(!torchOn)}
        className={`absolute top-3 right-3 z-30 p-2.5 rounded-full flex-row items-center gap-1.5 border shadow-md ${
          torchOn
            ? 'bg-amber-400 border-amber-300'
            : 'bg-black/60 border-white/20'
        }`}
      >
        {torchOn ? (
          <>
            <Zap size={16} color="#000" fill="#000" />
            <Text className="text-[11px] font-extrabold text-black">Flash ON</Text>
          </>
        ) : (
          <>
            <ZapOff size={16} color="#fff" />
            <Text className="text-[11px] font-bold text-white">Flash</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default CameraViewFinder;
