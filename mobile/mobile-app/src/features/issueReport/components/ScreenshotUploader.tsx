import React from 'react';
import {
  View,
  Pressable,
  Alert,
  AlertButton,
  Platform,
  Image as RNImage,
} from 'react-native';
import { Camera, Image as ImageIcon, X, Paperclip } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';
import { ScreenshotFile } from '../types/issueReport.types';
import { ISSUE_REPORT_CONSTRAINTS } from '../constants/issueReport.constants';

export interface ScreenshotUploaderProps {
  screenshot: ScreenshotFile | null;
  onSelect: (file: ScreenshotFile) => void;
  onRemove: () => void;
  error?: string;
  disabled?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({
  screenshot,
  onSelect,
  onRemove,
  error,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const handlePickPress = async () => {
    if (disabled) return;

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          if (file.size > ISSUE_REPORT_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
            Alert.alert(
              t('file_too_large', 'File Too Large'),
              t('screenshot_max_size', 'Screenshot must not exceed 10 MB.')
            );
            return;
          }

          onSelect({
            uri: URL.createObjectURL(file),
            name: file.name,
            type: file.type || 'image/png',
            size: file.size,
            file,
          });
        }
      };

      input.click();
      return;
    }

    const launchCamera = async () => {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert(
            t('permission_needed', 'Permission Needed'),
            t('camera_perm_desc', 'Camera permission is required to capture a screenshot.')
          );
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]) {
          const asset = result.assets[0];
          if (asset.fileSize && asset.fileSize > ISSUE_REPORT_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
            Alert.alert(
              t('file_too_large', 'File Too Large'),
              t('screenshot_max_size', 'Screenshot must not exceed 10 MB.')
            );
            return;
          }

          onSelect({
            uri: asset.uri,
            name: asset.fileName || `screenshot_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            size: asset.fileSize,
          });
        }
      } catch (err) {
        console.error('[ScreenshotUploader] Camera error:', err);
      }
    };

    const launchLibrary = async () => {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert(
            t('permission_needed', 'Permission Needed'),
            t('photos_perm_desc', 'Photo library permission is required to choose a screenshot.')
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]) {
          const asset = result.assets[0];
          if (asset.fileSize && asset.fileSize > ISSUE_REPORT_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
            Alert.alert(
              t('file_too_large', 'File Too Large'),
              t('screenshot_max_size', 'Screenshot must not exceed 10 MB.')
            );
            return;
          }

          onSelect({
            uri: asset.uri,
            name: asset.fileName || `screenshot_${Date.now()}.png`,
            type: asset.mimeType || 'image/png',
            size: asset.fileSize,
          });
        }
      } catch (err) {
        console.error('[ScreenshotUploader] Library error:', err);
      }
    };

    const buttons: AlertButton[] = [
      {
        text: t('take_photo', 'Take Photo'),
        onPress: launchCamera,
      },
      {
        text: t('choose_from_library', 'Choose from Library'),
        onPress: launchLibrary,
      },
      {
        text: t('cancel', 'Cancel'),
        style: 'cancel',
      },
    ];

    Alert.alert(
      t('add_screenshot', 'Add Screenshot'),
      t('choose_image_source', 'Select an image source:'),
      buttons
    );
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-foreground uppercase tracking-wider font-sans">
          {t('screenshot_optional', 'Screenshot (Optional)')}
        </Text>
        <Text className="text-[11px] text-muted-foreground font-sans">
          {t('max_10mb_image', 'Max 10 MB • JPG, PNG, WebP')}
        </Text>
      </View>

      {screenshot ? (
        <View className="flex-row items-center justify-between bg-card border border-border rounded-2xl p-3 shadow-xs">
          <View className="flex-row items-center flex-1 me-3">
            <View className="w-12 h-12 rounded-xl bg-muted overflow-hidden border border-border/60 me-3 shrink-0 items-center justify-center">
              <RNImage
                source={{ uri: screenshot.uri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>

            <View className="flex-1">
              <Text
                className="text-xs font-bold text-foreground font-sans"
                numberOfLines={1}
              >
                {screenshot.name}
              </Text>
              {screenshot.size ? (
                <Text className="text-[11px] text-muted-foreground font-sans mt-0.5">
                  {formatBytes(screenshot.size)}
                </Text>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={onRemove}
            disabled={disabled}
            accessibilityLabel={t('remove_screenshot', 'Remove screenshot')}
            accessibilityRole="button"
            className="w-8 h-8 rounded-full bg-muted/80 items-center justify-center active:bg-destructive/20"
          >
            <Icon as={X} size={16} className="text-muted-foreground active:text-destructive" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={handlePickPress}
          disabled={disabled}
          accessibilityLabel={t('add_screenshot', 'Add Screenshot')}
          accessibilityRole="button"
          className={cn(
            'flex-row items-center justify-center gap-2 border border-dashed border-border rounded-2xl py-3.5 px-4 bg-card/60 active:bg-muted/40 transition-all',
            disabled && 'opacity-60'
          )}
        >
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
            <Icon as={ImageIcon} size={16} className="text-primary" />
          </View>
          <Text className="text-xs font-bold text-primary font-sans">
            {t('add_screenshot_cta', '+ Add Screenshot')}
          </Text>
        </Pressable>
      )}

      {error ? (
        <Text className="text-xs text-destructive font-sans mt-0.5">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default ScreenshotUploader;
