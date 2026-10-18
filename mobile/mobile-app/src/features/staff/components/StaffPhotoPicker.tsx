import React, { useState } from 'react';
import { confirmPickerDisclosure } from '@/src/utils/pickerDisclosure';
import { View, Pressable, Alert, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/src/utils/i18n';
import type { StaffPhotoFile } from '../services/staffService';
import { StaffCameraCaptureModal } from './StaffCameraCaptureModal';

export const MAX_STAFF_PHOTO_BYTES = 2 * 1024 * 1024;

interface StaffPhotoPickerProps {
  /** Locally chosen photo (preview) or an already saved photo URL. */
  photo: StaffPhotoFile | null;
  existingUrl?: string | null;
  onChange: (photo: StaffPhotoFile | null) => void;
  disabled?: boolean;
  label?: string;
  /** Stacked, centred layout for forms (large avatar, short actions). Default is a compact row. */
  centered?: boolean;
}

/**
 * Optional staff photo chooser: camera or gallery, square crop, compressed on the device.
 * The server re-validates the file (real image type, 2 MB), so this only has to be convenient.
 */
export const StaffPhotoPicker: React.FC<StaffPhotoPickerProps> = ({
  photo,
  existingUrl,
  onChange,
  disabled = false,
  label,
  centered = false,
}) => {
  const { t } = useTranslation();
  const [cameraOpen, setCameraOpen] = useState(false);
  const previewUri = photo?.uri || existingUrl || undefined;

  const accept = (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.fileSize && asset.fileSize > MAX_STAFF_PHOTO_BYTES) {
      Alert.alert(
        t('file_too_large', 'File Too Large'),
        t('staff_photo_max_size', 'Please choose a photo under 2 MB.')
      );
      return;
    }
    onChange({
      uri: asset.uri,
      name: asset.fileName || `staff_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
    });
  };

  const pickFromWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e: any) => {
      const file: File | undefined = e.target?.files?.[0];
      if (!file) return;
      if (file.size > MAX_STAFF_PHOTO_BYTES) {
        Alert.alert(
          t('file_too_large', 'File Too Large'),
          t('staff_photo_max_size', 'Please choose a photo under 2 MB.')
        );
        return;
      }
      onChange({ uri: URL.createObjectURL(file), name: file.name, type: file.type || 'image/jpeg', size: file.size, file });
    };
    input.click();
  };

  const launchLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          t('permission_needed', 'Permission Needed'),
          t('photos_perm_desc_staff', 'Photo library permission is required to choose a staff photo.')
        );
        return;
      }
      if (!(await confirmPickerDisclosure('photo'))) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!result.canceled && result.assets?.[0]) accept(result.assets[0]);
    } catch (err) {
      console.error('[StaffPhotoPicker] error:', err);
      Alert.alert(t('error', 'Error'), t('staff_photo_pick_failed', 'Could not open the photo picker.'));
    }
  };

  const openCamera = () => {
    if (!disabled) setCameraOpen(true);
  };

  const chooseExisting = () => {
    if (disabled) return;
    if (Platform.OS === 'web') pickFromWeb();
    else launchLibrary();
  };

  if (centered) {
    return (
      <View className="items-center">
        <Pressable
          onPress={openCamera}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t('take_photo', 'Take Photo')}
        >
          <View className="h-24 w-24 rounded-full bg-muted/70 border-2 border-dashed border-border items-center justify-center overflow-hidden">
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={{ width: 96, height: 96 }} resizeMode="cover" />
            ) : (
              <Camera size={30} className="text-muted-foreground" />
            )}
          </View>
          <View className="absolute bottom-0 end-0 h-8 w-8 rounded-full bg-primary items-center justify-center border-2 border-card">
            <Camera size={14} color="#ffffff" />
          </View>
        </Pressable>

        <Text className="text-sm font-semibold text-foreground mt-2.5">
          {label || t('staff_photo', 'Staff photo')}
          <Text className="text-xs font-normal text-muted-foreground"> {t('optional', '(optional)')}</Text>
        </Text>

        <View className="flex-row items-center gap-5 mt-1.5">
          <Pressable onPress={openCamera} disabled={disabled} className="flex-row items-center">
            <Camera size={14} className="text-primary me-1" />
            <Text className="text-xs font-bold text-primary">
              {previewUri ? t('retake_photo', 'Retake') : t('take_photo', 'Take photo')}
            </Text>
          </Pressable>
          <Pressable onPress={chooseExisting} disabled={disabled} className="flex-row items-center">
            <ImageIcon size={14} className="text-primary me-1" />
            <Text className="text-xs font-bold text-primary">
              {Platform.OS === 'web' ? t('upload_file', 'Upload') : t('choose_from_gallery', 'Gallery')}
            </Text>
          </Pressable>
          {photo ? (
            <Pressable onPress={() => onChange(null)} disabled={disabled} className="flex-row items-center">
              <Trash2 size={14} className="text-destructive me-1" />
              <Text className="text-xs font-bold text-destructive">{t('remove', 'Remove')}</Text>
            </Pressable>
          ) : null}
        </View>

        <StaffCameraCaptureModal
          visible={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCaptured={(captured) => onChange(captured)}
        />
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={openCamera}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('take_photo', 'Take Photo')}
        className="h-20 w-20 rounded-full bg-muted/60 border border-dashed border-border items-center justify-center overflow-hidden"
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={{ width: 80, height: 80 }} resizeMode="cover" />
        ) : (
          <Camera size={28} className="text-muted-foreground" />
        )}
      </Pressable>

      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">
          {label || t('staff_photo_optional', 'Staff photo (optional)')}
        </Text>
        <Text className="text-[11px] text-muted-foreground mt-0.5">
          {t('staff_photo_hint', 'Helps the gate guard recognise this person. JPEG, PNG or WebP, up to 2 MB.')}
        </Text>
        <View className="flex-row items-center flex-wrap gap-x-4 gap-y-1 mt-2">
          <Pressable onPress={openCamera} disabled={disabled} className="flex-row items-center">
            <Camera size={14} className="text-primary me-1" />
            <Text className="text-xs font-bold text-primary">
              {previewUri ? t('retake_photo', 'Retake') : t('take_photo', 'Take photo')}
            </Text>
          </Pressable>
          <Pressable onPress={chooseExisting} disabled={disabled} className="flex-row items-center">
            <ImageIcon size={14} className="text-primary me-1" />
            <Text className="text-xs font-bold text-primary">
              {Platform.OS === 'web' ? t('upload_file', 'Upload file') : t('choose_from_gallery', 'Gallery')}
            </Text>
          </Pressable>
          {photo ? (
            <Pressable onPress={() => onChange(null)} disabled={disabled} className="flex-row items-center">
              <Trash2 size={14} className="text-destructive me-1" />
              <Text className="text-xs font-bold text-destructive">{t('remove', 'Remove')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <StaffCameraCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={(captured) => onChange(captured)}
      />
    </View>
  );
};

export default StaffPhotoPicker;
