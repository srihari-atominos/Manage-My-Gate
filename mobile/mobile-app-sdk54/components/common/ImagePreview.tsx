import React, { useState } from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface ImagePreviewProps {
  source?: ImageSourcePropType | null | any;
  altText: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const ImagePreview = ({
  source,
  altText,
  width = '100%',
  height = 200,
  className,
}: ImagePreviewProps) => {
  const [hasError, setHasError] = useState(false);

  return (
    <View
      style={{ width: width as any, height: height as any }}
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-muted items-center justify-center',
        className
      )}
    >
      {source && !hasError ? (
        <Image
          source={source}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessibilityLabel={altText}
          onError={(e) => {
            console.error('ImagePreview load error for:', source);
            setHasError(true);
          }}
        />
      ) : (
        <View className="items-center justify-center p-4">
          <ImageIcon size={40} className="mb-2 text-slate-300 dark:text-slate-700" />
          <Text className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            [Failed to Load Image]
          </Text>
          <Text className="mt-1 text-center text-[10px] text-slate-400 dark:text-slate-500 px-2" numberOfLines={3}>
            {source && source.uri ? source.uri : (altText || 'Image goes here')}
          </Text>
        </View>
      )}
    </View>
  );
};
