import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { UploadCloud, File as FileIcon, X } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { ImagePreview } from '../common/ImagePreview';

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

/**
 * FileUploadField
 * 
 * CRITICAL NOTE: Any images rendered by this component (uploaded by users)
 * are treated STRICTLY as conceptual references. They are not meant to be replicated exactly.
 */
export const FileUploadField = ({
  label,
  files,
  onUploadPress,
  onRemoveFile,
  maxFiles = 1,
  className,
}: FileUploadFieldProps) => {
  return (
    <View className={cn('w-full', className)}>
      {Boolean(label) && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Text>
      )}
      
      {files.length < maxFiles && (
        <Pressable
          onPress={onUploadPress}
          className="mb-3 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
            <UploadCloud size={20} className="text-slate-500" />
          </View>
          <Text className="text-sm font-medium text-primary">
            Tap to select file
          </Text>
          <Text className="mt-1 text-xs text-slate-500">
            Supports PDF, JPG, PNG
          </Text>
        </Pressable>
      )}

      {files.length > 0 && (
        <View className="gap-2">
          {files.map((file, index) => (
            <View 
              key={`${file.name}-${index}`} 
              className="flex-row items-center justify-between rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
            >
              <View className="flex-row items-center flex-1">
                {file.type === 'image' ? (
                  // Conceptual reference rendering
                  <View className="h-10 w-10 overflow-hidden rounded-md border border-slate-100 mr-3">
                    <ImagePreview altText="Conceptual uploaded file" source={{ uri: file.uri }} className="h-full w-full rounded-none border-0" />
                  </View>
                ) : (
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                    <FileIcon size={20} className="text-blue-500" />
                  </View>
                )}
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-medium text-slate-900 dark:text-slate-100" numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => onRemoveFile(index)} className="p-2 bg-slate-50 rounded-full dark:bg-slate-800">
                <X size={16} className="text-slate-500" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
