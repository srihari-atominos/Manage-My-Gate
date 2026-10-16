import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, Pressable, Image, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraOff, RefreshCcw, SwitchCamera, X, Check } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/src/utils/i18n';
import type { StaffPhotoFile } from '../services/staffService';

interface StaffCameraCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCaptured: (photo: StaffPhotoFile) => void;
}

// Square, modest resolution: plenty for recognising a face, and always far below the 2 MB server limit.
const OUTPUT_SIZE = 720;
const OUTPUT_QUALITY = 0.75;

/**
 * Live in-app camera for staff photos (native and web). The person is framed in a face guide, the photo
 * is taken with one tap, previewed, and only then accepted. The result is centre-cropped to a square and
 * compressed on the device before upload.
 */
export const StaffCameraCaptureModal: React.FC<StaffCameraCaptureModalProps> = ({ visible, onClose, onCaptured }) => {
  const { t } = useTranslation();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setPreview(null);
      setError(null);
      setCameraReady(false);
      setCapturing(false);
      setSaving(false);
      setFacing('front');
    }
  }, [visible]);

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (!pic?.uri) throw new Error('No image returned');
      setPreview({ uri: pic.uri, width: pic.width, height: pic.height });
    } catch {
      setError(t('staff_photo_capture_failed', 'Could not take the photo. Please try again.'));
    } finally {
      setCapturing(false);
    }
  };

  const handleUse = async () => {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      const { uri, width, height } = preview;
      const side = Math.min(width || OUTPUT_SIZE, height || OUTPUT_SIZE);
      const actions: ImageManipulator.Action[] = [];
      if (width && height) {
        actions.push({
          crop: { originX: Math.round((width - side) / 2), originY: Math.round((height - side) / 2), width: side, height: side },
        });
      }
      actions.push({ resize: { width: Math.min(OUTPUT_SIZE, side) } });
      const result = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: OUTPUT_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      onCaptured({ uri: result.uri, name: `staff_${Date.now()}.jpg`, type: 'image/jpeg' });
      onClose();
    } catch {
      setError(t('staff_photo_process_failed', 'Could not prepare the photo. Please retake it.'));
    } finally {
      setSaving(false);
    }
  };

  const renderBody = () => {
    if (!permission) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <View className="h-14 w-14 rounded-full bg-white/10 items-center justify-center">
            <CameraOff size={28} color="#ffffff" />
          </View>
          <Text className="text-white font-bold text-center">{t('camera_access_required', 'Camera Access Required')}</Text>
          <Text className="text-white/60 text-xs text-center">
            {t('staff_photo_camera_hint', 'Allow camera access to take a photo of the staff member.')}
          </Text>
          <Button variant="default" size="sm" onPress={requestPermission} className="mt-2">
            <Text className="text-white font-bold text-xs">{t('continue', 'Continue')}</Text>
          </Button>
        </View>
      );
    }

    if (preview) {
      return (
        <View className="flex-1 bg-black">
          <Image source={{ uri: preview.uri }} style={{ flex: 1 }} resizeMode="contain" />
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          facing={facing}
          onCameraReady={() => setCameraReady(true)}
          style={{ flex: 1 }}
        />
        {/* Face guide: keep the face inside the oval (the saved photo is cropped to the centre square). */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View
            style={{
              width: '68%',
              aspectRatio: 0.78,
              borderRadius: 999,
              borderWidth: 3,
              borderColor: 'rgba(255,255,255,0.85)',
              borderStyle: 'dashed',
            }}
          />
          <Text className="text-white/90 text-xs font-semibold mt-4 px-6 text-center">
            {t('staff_photo_frame_hint', 'Centre the face in the oval, with good light')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-3 z-10">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close', 'Close')}
            className="h-10 w-10 rounded-full bg-white/15 items-center justify-center"
          >
            <X size={20} color="#ffffff" />
          </Pressable>
          <Text className="text-white font-bold">{t('staff_photo', 'Staff Photo')}</Text>
          {!preview && permission?.granted ? (
            <Pressable
              onPress={() => {
                setCameraReady(false);
                setFacing((f) => (f === 'front' ? 'back' : 'front'));
              }}
              accessibilityRole="button"
              accessibilityLabel={t('switch_camera', 'Switch camera')}
              className="h-10 w-10 rounded-full bg-white/15 items-center justify-center"
            >
              <SwitchCamera size={20} color="#ffffff" />
            </Pressable>
          ) : (
            <View className="h-10 w-10" />
          )}
        </View>

        <View className="flex-1">{renderBody()}</View>

        {/* Controls */}
        <View className="px-6 pt-4 pb-10 items-center gap-3 bg-black">
          {error ? <Text className="text-red-400 text-xs text-center">{error}</Text> : null}

          {preview ? (
            <View className="flex-row items-center gap-3 w-full">
              <Button variant="outline" className="flex-1" onPress={() => setPreview(null)} disabled={saving}>
                <RefreshCcw size={16} color="#ffffff" />
                <Text className="text-white font-bold text-sm ms-1.5">{t('retake', 'Retake')}</Text>
              </Button>
              <Button variant="default" className="flex-1" onPress={handleUse} disabled={saving}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Check size={16} color="#ffffff" />}
                <Text className="text-white font-bold text-sm ms-1.5">
                  {saving ? t('saving', 'Saving...') : t('use_photo', 'Use Photo')}
                </Text>
              </Button>
            </View>
          ) : permission?.granted ? (
            <Pressable
              onPress={handleCapture}
              disabled={!cameraReady || capturing}
              accessibilityRole="button"
              accessibilityLabel={t('take_photo', 'Take Photo')}
              style={{ opacity: !cameraReady || capturing ? 0.5 : 1 }}
              className="h-[72px] w-[72px] rounded-full border-4 border-white items-center justify-center"
            >
              {capturing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View className="h-[56px] w-[56px] rounded-full bg-white" />
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default StaffCameraCaptureModal;
