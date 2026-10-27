import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { CameraOff, Check, RefreshCcw, SwitchCamera, X } from 'lucide-react-native';
import { Button } from '@/components/common/Button';
import { Text } from '@/components/ui/text';

export type ReceiptCaptureFile = {
  uri: string;
  name: string;
  type: string;
  file?: unknown;
};

type Preview = { uri: string; width?: number; height?: number };

interface ReceiptCameraCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCaptured: (file: ReceiptCaptureFile) => void;
}

/** Live, in-app camera capture for a community expense receipt. */
export function ReceiptCameraCaptureModal({
  visible,
  onClose,
  onCaptured,
}: ReceiptCameraCaptureModalProps) {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFacing('back');
    setCameraReady(false);
    setCapturing(false);
    setPreview(null);
    setError(null);
  }, [visible]);

  const capture = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (!photo?.uri) throw new Error('No image returned');
      setPreview({ uri: photo.uri, width: photo.width, height: photo.height });
    } catch {
      setError('Could not take the receipt photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const usePhoto = () => {
    if (!preview) return;
    onCaptured({
      uri: preview.uri,
      name: `receipt-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
  };

  const body = () => {
    if (!permission) {
      return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#ffffff" /></View>;
    }

    if (!permission.granted) {
      return (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <View className="h-14 w-14 rounded-full bg-white/10 items-center justify-center"><CameraOff size={28} color="#ffffff" /></View>
          <Text className="text-white text-center font-bold">Camera Access Required</Text>
          <Text className="text-white/70 text-center text-xs">Allow camera access to capture a receipt photo.</Text>
          <Button variant="outline" onPress={requestPermission} className="mt-2"><Text className="text-white font-bold">Allow Camera</Text></Button>
        </View>
      );
    }

    if (preview) {
      return <Image source={{ uri: preview.uri }} style={{ flex: 1 }} resizeMode="contain" />;
    }

    return (
      <CameraView
        ref={cameraRef}
        facing={facing}
        onCameraReady={() => setCameraReady(true)}
        style={{ flex: 1 }}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 pt-12 pb-3">
          <Pressable onPress={onClose} className="h-10 w-10 rounded-full bg-white/15 items-center justify-center" accessibilityRole="button" accessibilityLabel="Close receipt camera">
            <X size={20} color="#ffffff" />
          </Pressable>
          <Text className="text-white font-bold">Capture Receipt</Text>
          {!preview && permission?.granted ? (
            <Pressable
              onPress={() => { setCameraReady(false); setFacing((value) => value === 'back' ? 'front' : 'back'); }}
              className="h-10 w-10 rounded-full bg-white/15 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
            >
              <SwitchCamera size={20} color="#ffffff" />
            </Pressable>
          ) : <View className="h-10 w-10" />}
        </View>

        <View className="flex-1 bg-black">{body()}</View>

        <View className="items-center gap-3 bg-black px-6 pb-10 pt-4">
          {error ? <Text className="text-center text-xs text-red-400">{error}</Text> : null}
          {preview ? (
            <View className="w-full flex-row gap-3">
              <Button variant="outline" className="flex-1" onPress={() => setPreview(null)}><RefreshCcw size={16} color="#ffffff" /><Text className="ml-1.5 text-sm font-bold text-white">Retake</Text></Button>
              <Button className="flex-1" onPress={usePhoto}><Check size={16} color="#ffffff" /><Text className="ml-1.5 text-sm font-bold text-white">Use Photo</Text></Button>
            </View>
          ) : permission?.granted ? (
            <Pressable
              onPress={capture}
              disabled={!cameraReady || capturing}
              style={{ opacity: !cameraReady || capturing ? 0.5 : 1 }}
              className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white"
              accessibilityRole="button"
              accessibilityLabel="Capture receipt photo"
            >
              {capturing ? <ActivityIndicator color="#ffffff" /> : <View className="h-[56px] w-[56px] rounded-full bg-white" />}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default ReceiptCameraCaptureModal;