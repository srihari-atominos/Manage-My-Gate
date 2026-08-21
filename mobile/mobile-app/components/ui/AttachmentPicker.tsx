import * as React from 'react';
import { View, Pressable, Alert, AlertButton, Platform, Image as RNImage } from 'react-native';
import { Image, FileText, X, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import apiClient from '@/src/services/apiClient';

export interface Attachment {
  uri?: string;
  url?: string;
  name?: string;
  filename?: string;
  type?: string;
  size?: number;
  file?: any;
}

export type AttachmentFile = Attachment;

export interface AttachmentPickerProps {
  attachments: Attachment[];
  onAdd: (files: Attachment[]) => void;
  onRemove: (index: number) => void;
  maxFiles?: number;
  accept?: 'images' | 'documents' | 'all';
  className?: string;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(type?: string, name?: string): boolean {
  if (type && type.toLowerCase().startsWith('image')) return true;
  if (!name) return false;
  const ext = name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(ext || '');
}

function getAbsoluteUrl(uri?: string) {
  if (!uri) return '';
  if (uri.startsWith('/')) {
    const apiBaseURL = apiClient.defaults.baseURL || '';
    // Strip /api, /api/v1, /api/v2, etc., from the end of the base URL
    const host = apiBaseURL.replace(/\/api(\/v\d+)?\/?$/, '');
    return `${host}${uri}`;
  }
  return uri;
}

export const AttachmentPicker = React.forwardRef<View, AttachmentPickerProps>(
  (
    {
      attachments = [],
      onAdd,
      onRemove,
      maxFiles = 5,
      accept = 'all',
      className,
      ...props
    },
    ref
  ) => {
    const isAtMax = attachments.length >= maxFiles;

    const handleAddPress = () => {
      if (isAtMax) return;

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = maxFiles > 1;
        if (accept === 'images') {
          input.accept = 'image/*';
        } else if (accept === 'documents') {
          input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
        } else {
          input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
        }
        
        input.onchange = (e: any) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const fileList: any[] = [];
            const remainingSlots = maxFiles - attachments.length;
            const filesToSelect = Math.min(files.length, remainingSlots);

            for (let i = 0; i < filesToSelect; i++) {
              const file = files[i];
              const fileObj = {
                uri: URL.createObjectURL(file),
                name: file.name,
                type: file.type,
                size: file.size,
                file: file, // Keep reference to raw File object for web uploading
                isRemote: false,
              };
              fileList.push(fileObj);
            }
            onAdd(fileList);
          }
        };
        input.click();
        return;
      }

      const title = 'Add Attachment';
      const message = 'Choose an option to attach a file:';

      const handleSelect = async (optionName: string, isDoc: boolean) => {
        try {
          if (isDoc) {
            const result = await DocumentPicker.getDocumentAsync({
              type: '*/*',
              multiple: maxFiles > 1,
            });
            if (!result.canceled && result.assets) {
              const newFiles = result.assets.slice(0, maxFiles - attachments.length).map(asset => ({
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType || 'application/octet-stream',
                size: asset.size,
                isRemote: false,
              }));
              onAdd(newFiles);
            }
          } else {
            const options: ImagePicker.ImagePickerOptions = {
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: maxFiles > 1,
              quality: 0.8,
            };
            
            let result;
            if (optionName === 'Take Photo') {
              const permission = await ImagePicker.requestCameraPermissionsAsync();
              if (permission.status !== 'granted') {
                Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
                return;
              }
              result = await ImagePicker.launchCameraAsync(options);
            } else {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (permission.status !== 'granted') {
                Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
                return;
              }
              result = await ImagePicker.launchImageLibraryAsync(options);
            }
            
            if (!result.canceled && result.assets) {
              const newFiles = result.assets.slice(0, maxFiles - attachments.length).map(asset => ({
                uri: asset.uri,
                name: asset.fileName || `photo_${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
                size: asset.fileSize,
                isRemote: false,
              }));
              onAdd(newFiles);
            }
          }
        } catch (error) {
          console.error('[AttachmentPicker] Error selecting file:', error);
          Alert.alert('Error', 'Failed to pick attachment');
        }
      };

      const buttons: AlertButton[] = [];

      if (accept === 'images' || accept === 'all') {
        buttons.push({
          text: 'Take Photo',
          onPress: () => handleSelect('Take Photo', false),
        });
        buttons.push({
          text: accept === 'images' ? 'Choose from Library' : 'Choose Photo',
          onPress: () => handleSelect('Choose Photo', false),
        });
      }

      if (accept === 'documents' || accept === 'all') {
        buttons.push({
          text: 'Choose Document',
          onPress: () => handleSelect('Choose Document', true),
        });
      }

      buttons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert(title, message, buttons);
    };

    return (
      <View
        ref={ref}
        className={cn(
          'border border-dashed border-border rounded-lg p-3 bg-card/40',
          className
        )}
        {...props}
      >
        {/* Attachment List */}
        {attachments.length > 0 && (
          <View className="mb-2">
            {attachments.map((file, index) => {
              const fileName = file.name || file.filename || 'Attachment';
              const fileType = file.type || '';
              const isImg = isImageFile(fileType, fileName);
              const formattedSize = formatFileSize(file.size);
              const resolvedUri = getAbsoluteUrl(file.uri || file.url);

              return (
                <View
                  key={`${resolvedUri}-${index}`}
                  className="flex-row items-center justify-between bg-muted rounded-md p-2 mb-2"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded bg-background items-center justify-center mr-2.5 shrink-0 border border-border/40 overflow-hidden">
                      {isImg && resolvedUri ? (
                        <RNImage 
                          source={{ uri: resolvedUri }} 
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Icon
                          as={FileText}
                          size={16}
                          className="text-foreground"
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-xs font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {fileName}
                      </Text>
                      {formattedSize ? (
                        <Text className="text-[10px] text-muted-foreground mt-0.5">
                          {formattedSize}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Pressable
                    onPress={() => onRemove(index)}
                    hitSlop={8}
                    className="p-1 rounded-full active:bg-destructive/20 shrink-0"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${file.name}`}
                  >
                    <Icon as={X} size={16} className="text-muted-foreground hover:text-destructive" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Add Button or Max Reached Indicator */}
        {!isAtMax ? (
          <Pressable
            onPress={handleAddPress}
            className={cn(
              'flex-row items-center justify-center p-3 rounded-md bg-muted/60 active:bg-muted border border-dashed border-border/60',
              Platform.select({ web: 'cursor-pointer select-none transition-colors' })
            )}
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
          >
            <Icon as={Plus} size={18} className="text-muted-foreground mr-1.5" />
            <Text className="text-sm font-medium text-muted-foreground">
              Add Attachment
            </Text>
          </Pressable>
        ) : (
          <View className="p-2 items-center justify-center">
            <Text className="text-xs text-muted-foreground font-medium">
              {attachments.length}/{maxFiles} files (Maximum reached)
            </Text>
          </View>
        )}
      </View>
    );
  }
);

AttachmentPicker.displayName = 'AttachmentPicker';

export default AttachmentPicker;
