import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
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
  className?: string;
  fullscreen?: boolean;
}

export const CameraViewFinder: React.FC<CameraViewFinderProps> = ({
  onScan,
  instruction = 'Position QR Code within Frame',
  title,
  isScanning = true,
  className,
  fullscreen = false,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

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
      } else {
        // Native camera fallback or simulation indicator
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(err.message || 'Camera access permission was denied or camera is unavailable.');
      setCameraActive(false);
    }
  }, []);

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
  }, [isScanning, startWebCamera]);

  return (
    <View
      className={cn(
        'w-full bg-black relative justify-center items-center overflow-hidden border border-border',
        fullscreen ? 'flex-1 inset-0 absolute h-full rounded-none border-0' : 'h-64 rounded-2xl mb-4',
        className
      )}
    >
      {/* Live Video Stream Viewport */}
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
            onRetry={startWebCamera}
            retryLabel="Enable Camera"
            className="w-full"
          />
        </View>
      )}

      {/* Fallback Camera Placeholder if not active and no error */}
      {!cameraActive && !cameraError && (
        <View className="p-6 items-center justify-center gap-3">
          <View className="w-14 h-14 rounded-full bg-muted/40 border border-border/30 items-center justify-center mb-1">
            <Icon as={CameraOff} size={26} className="text-muted-foreground" />
          </View>
          <Text className="text-foreground text-xs font-semibold text-center px-4">
            Camera stream inactive
          </Text>
          <Button
            size="sm"
            variant="outline"
            onPress={startWebCamera}
            className="mt-1 border-border bg-card/80"
          >
            <Icon as={RefreshCw} size={14} className="me-1.5 text-foreground" />
            <Text className="text-foreground text-xs font-bold">Start Camera</Text>
          </Button>
        </View>
      )}

      {/* Optical Scanner Reticle Overlay */}
      {cameraActive && (
        <QRScannerOverlay instruction={instruction} />
      )}
    </View>
  );
};

export default CameraViewFinder;
