import React from 'react';
import { View, ScrollView, ImageSourcePropType } from 'react-native';
import { ImagePreview } from './ImagePreview';
import { cn } from '../../lib/utils';

export interface ImageCarouselProps {
  images: Array<{ id: string; source: ImageSourcePropType | null; alt: string }>;
  imageWidth?: number;
  imageHeight?: number;
  className?: string;
}

export const ImageCarousel = ({
  images,
  imageWidth = 250,
  imageHeight = 150,
  className,
}: ImageCarouselProps) => {
  return (
    <View className={cn(className)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {images.map((image, index) => (
          <View key={image.id} className={cn('mr-4', index === images.length - 1 && 'mr-0')}>
            <ImagePreview
              source={image.source}
              altText={image.alt}
              width={imageWidth}
              height={imageHeight}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
