import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Camera, CameraOff, RefreshCw } from 'lucide-react-native';
import { QRScannerOverlay } from './QRScannerOverlay';
import { cn } from '../../lib/utils';

export interface CameraViewFinderProps {
  onScan?: (data: string) => void;
  instruction?: string;
  title?: string;
  isScanning?: boolean;
  enableTorch?: boolean;
  className?: string;
  fullscreen?: boolean;
}

export const CameraViewFinder: React.FC<CameraViewFinderProps> = ({
  onScan,
  instruction = 'Position QR Code within Frame',
  title,
  isScanning = true,
  enableTorch = false,
  className,
  fullscreen = false,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const scannedRef = useRef<boolean>(false);

  const startWebCamera = useCallback(async () => {
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
      }
    } catch (err: any) {
      console.warn('Web Camera access error:', err);
      setCameraError(err.message || 'Camera access permission was denied or camera is unavailable.');
      setCameraActive(false);
    }
  }, []);

  // Request permissions on native mount if not granted
  useEffect(() => {
    if (Platform.OS !== 'web' && isScanning) {
      if (!permission?.granted) {
        requestPermission().then((res) => {
          if (res?.granted) {
            setCameraActive(true);
            setCameraError(null);
          } else {
            setCameraActive(false);
            setCameraError('Camera access permission is required to scan QR passes.');
          }
        });
      } else {
        setCameraActive(true);
        setCameraError(null);
      }
    }
  }, [isScanning, permission?.granted, requestPermission]);

  useEffect(() => {
    if (Platform.OS === 'web' && isScanning) {
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
  }, [isScanning, startWebCamera]);

  const handleNativeBarcodeScanned = (scanningResult: { data: string }) => {
    if (onScan && isScanning && !scannedRef.current) {
      scannedRef.current = true;
      onScan(scanningResult.data);
      // Reset scan flag after 2 seconds to prevent rapid firing
      setTimeout(() => {
        scannedRef.current = false;
      }, 2000);
    }
  };

  const handlePermissionRequest = async () => {
    if (Platform.OS === 'web') {
      startWebCamera();
    } else {
      const res = await requestPermission();
      if (res?.granted) {
        setCameraActive(true);
        setCameraError(null);
      } else {
        setCameraActive(false);
        setCameraError('Camera access permission was denied. Please allow camera access in device settings.');
      }
    }
  };

  const isNativeCameraActive = Platform.OS !== 'web' && permission?.granted && isScanning;
  const isWebCameraActive = Platform.OS === 'web' && cameraActive && isScanning;
  const isActive = isNativeCameraActive || isWebCameraActive;

  return (
    <View
      className={cn(
        'w-full bg-black relative justify-center items-center overflow-hidden border border-border',
        fullscreen ? 'flex-1 inset-0 absolute h-full rounded-none border-0' : 'h-64 rounded-2xl mb-4',
        className
      )}
    >
      {/* Native Camera Viewport (iOS & Android) */}
      {Platform.OS !== 'web' && permission?.granted && isScanning ? (
        <View className="absolute inset-0 w-full h-full">
          <CameraView
            style={{ width: '100%', height: '100%' }}
            facing="back"
            enableTorch={enableTorch}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleNativeBarcodeScanned}
          />
        </View>
      ) : null}

      {/* Web Live Video Stream Viewport */}
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

      {/* Camera Permission Denied / Offline Banner State */}
      {Boolean(cameraError) && (
        <View className="z-30 p-6 w-full max-w-sm items-center justify-center gap-3">
          <ErrorBanner
            title="Camera Permission Required"
            message={cameraError || 'Camera stream is unavailable.'}
            onRetry={handlePermissionRequest}
            retryLabel="Enable Camera"
            className="w-full"
          />
        </View>
      )}

      {/* Fallback Camera Placeholder if not active and no error */}
      {!isActive && !cameraError && (
        <View className="p-6 items-center justify-center gap-3 z-20">
          <View className="w-14 h-14 rounded-full bg-muted/40 border border-border/30 items-center justify-center mb-1">
            <Icon as={CameraOff} size={26} className="text-muted-foreground" />
          </View>
          <Text className="text-foreground text-xs font-semibold text-center px-4">
            Camera stream inactive
          </Text>
          <Button
            size="sm"
            variant="outline"
            onPress={handlePermissionRequest}
            className="mt-1 border-border bg-card/80"
          >
            <Icon as={RefreshCw} size={14} className="me-1.5 text-foreground" />
            <Text className="text-foreground text-xs font-bold">Start Camera</Text>
          </Button>
        </View>
      )}

      {/* Optical Scanner Reticle Overlay */}
      {isActive && (
        <QRScannerOverlay instruction={instruction} />
      )}
    </View>
  );
};

export default CameraViewFinder;
