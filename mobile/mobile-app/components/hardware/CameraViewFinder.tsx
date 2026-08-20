import React, { useEffect, useRef, useState } from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw } from 'lucide-react-native';
import { QRScannerOverlay } from './QRScannerOverlay';

export interface CameraViewFinderProps {
  onScan: (data: string) => void;
  instruction?: string;
  title?: string;
  isScanning?: boolean;
}

export const CameraViewFinder: React.FC<CameraViewFinderProps> = ({
  onScan,
  instruction = 'Position Amenity QR Code within Frame',
  title,
  isScanning = true,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  const startWebCamera = async () => {
    setCameraError(null);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
        setCameraActive(true);
      } else {
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(err.message || 'Camera permission denied or camera unavailable.');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (isScanning) {
      startWebCamera();
    }
    return () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track: any) => track.stop());
        } catch (e) {
          // ignore cleanup error
        }
      }
    };
  }, [isScanning]);

  return (
    <View className="h-64 w-full rounded-2xl overflow-hidden bg-black relative mb-4 border border-border justify-center items-center">
      {/* Web Live Video Stream */}
      {Platform.OS === 'web' ? (
        <View className="absolute inset-0 w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: cameraActive ? 'block' : 'none',
            }}
          />
        </View>
      ) : null}

      {/* Fallback Camera Placeholder / Error State */}
      {(!cameraActive || cameraError) && (
        <View className="p-4 items-center justify-center gap-2 text-center">
          <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mb-1">
            <CameraOff size={24} color="#ffffff" />
          </View>
          <Text className="text-white text-xs font-semibold text-center px-4">
            {cameraError || 'Camera Stream Offline'}
          </Text>
          <Button
            size="sm"
            variant="outline"
            onPress={startWebCamera}
            className="mt-1 bg-white/10 border-white/20"
          >
            <View className="flex-row items-center gap-1.5 px-2">
              <RefreshCw size={14} color="#ffffff" />
              <Text className="text-white text-xs font-bold">Enable Camera</Text>
            </View>
          </Button>
        </View>
      )}

      {/* Scanner Overlay Visual Corner Frame */}
      {cameraActive && (
        <QRScannerOverlay instruction={instruction} />
      )}
    </View>
  );
};

export default CameraViewFinder;
