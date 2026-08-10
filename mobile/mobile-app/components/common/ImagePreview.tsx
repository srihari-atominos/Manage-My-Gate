import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface ImagePreviewProps {
  source?: ImageSourcePropType | null;
  altText: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

/**
 * ImagePreview
 * 
 * CRITICAL NOTE: Any images rendered by this component (uploaded by users or provided by the system)
 * are treated STRICTLY as conceptual references to generate variations or to indicate state.
 * They are not meant to be replicated exactly or verified for exact pixel matching.
 */
export const ImagePreview = ({
  source,
  altText,
  width = '100%',
  height = 200,
  className,
}: ImagePreviewProps) => {
  return (
    <View
      style={{ width: width as any, height: height as any }}
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-muted items-center justify-center',
        className
      )}
    >
      {source ? (
        <Image
          source={source}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityLabel={altText}
        />
      ) : (
        <View className="items-center justify-center p-4">
          <ImageIcon size={40} className="mb-2 text-slate-300 dark:text-slate-700" />
          <Text className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            [Conceptual Reference]
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
            {altText || 'Image goes here'}
          </Text>
        </View>
      )}
    </View>
  );
};
