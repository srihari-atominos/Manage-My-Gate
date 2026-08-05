import * as React from 'react';
import { View, Pressable, Alert, AlertButton, Platform } from 'react-native';
import { Image, FileText, X, Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface Attachment {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

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

function isImageFile(type: string, name: string): boolean {
  if (type && type.toLowerCase().startsWith('image')) return true;
  const ext = name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(ext || '');
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

      const title = 'Add Attachment';
      const message = 'Choose an option to attach a file:';

      const handleSelect = (optionName: string, isDoc: boolean) => {
        console.log(
          `[AttachmentPicker] Selected option '${optionName}'. Note: Install expo-image-picker or expo-document-picker for native device pickers.`
        );
        const mockFile: Attachment = {
          uri: `https://example.com/attachment-${Date.now()}.${isDoc ? 'pdf' : 'jpg'}`,
          name: isDoc
            ? `Document_${attachments.length + 1}.pdf`
            : `Photo_${attachments.length + 1}.jpg`,
          type: isDoc ? 'application/pdf' : 'image/jpeg',
          size: Math.floor(Math.random() * 2000000) + 150000,
        };
        onAdd([mockFile]);
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

      if (Platform.OS === 'web') {
        const choice = window.prompt(
          `${title}\n${message}\nType option: ${buttons.map((b) => b.text).join(', ')}`
        );
        if (choice && choice !== 'Cancel') {
          const isDoc = choice.toLowerCase().includes('doc');
          handleSelect(choice, isDoc);
        }
      } else {
        Alert.alert(title, message, buttons);
      }
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
              const isImg = isImageFile(file.type, file.name);
              const formattedSize = formatFileSize(file.size);

              return (
                <View
                  key={`${file.uri}-${index}`}
                  className="flex-row items-center justify-between bg-muted rounded-md p-2 mb-2"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded bg-background items-center justify-center mr-2.5 shrink-0 border border-border/40">
                      <Icon
                        as={isImg ? Image : FileText}
                        size={16}
                        className="text-foreground"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-xs font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {file.name}
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
