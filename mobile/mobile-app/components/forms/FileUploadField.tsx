import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { UploadCloud, File as FileIcon, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { ImagePreview } from '../common/ImagePreview';
import { useTranslation } from '../../src/utils/i18n';

export interface FileInfo {
  name: string;
  uri: string;
  type: 'image' | 'document' | 'other';
}

export interface FileUploadFieldProps {
  label?: string;
  files: FileInfo[];
  onUploadPress: () => void;
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
  className?: string;
}

export const FileUploadField = ({
  label,
  files,
  onUploadPress,
  onRemoveFile,
  maxFiles = 1,
  className,
}: FileUploadFieldProps) => {
  const { t, translateText } = useTranslation();

  return (
    <View className={cn('w-full', className)}>
      {Boolean(label) && (
        <Text className="mb-1.5 text-[13.5px] font-bold font-sans text-foreground">
          {translateText(label || '')}
        </Text>
      )}
      
      {files.length < maxFiles && (
        <Pressable
          onPress={onUploadPress}
          className="mb-3 items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-card/60 active:bg-secondary/60 py-6 shadow-2xs"
        >
          <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <UploadCloud size={20} className="text-primary" />
          </View>
          <Text className="text-[13.5px] font-bold font-sans text-primary">
            {t('tap_to_select_file', 'Tap to select file')}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            {t('supports_formats_file', 'Supports PDF, JPG, PNG')}
          </Text>
        </Pressable>
      )}

      {files.length > 0 && (
        <View className="gap-2">
          {files.map((file, index) => (
            <View 
              key={`${file.name}-${index}`} 
              className="flex-row items-center justify-between rounded-lg border border-border bg-card p-2"
            >
              <View className="flex-row items-center flex-1">
                {file.type === 'image' ? (
                  // Conceptual reference rendering
                  <View className="h-10 w-10 overflow-hidden rounded-md border border-border me-3">
                    <ImagePreview altText="Conceptual uploaded file" source={{ uri: file.uri }} className="h-full w-full rounded-none border-0" />
                  </View>
                ) : (
                  <View className="me-3 h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <FileIcon size={20} className="text-primary" />
                  </View>
                )}
                <View className="flex-1 pe-2">
                  <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => onRemoveFile(index)} className="p-2 bg-muted rounded-full">
                <X size={16} className="text-muted-foreground" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
