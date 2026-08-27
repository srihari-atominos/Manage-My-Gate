import React, { useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { ImagePreview } from '../common/ImagePreview';

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  imageAlt: string;
}

export interface OnboardingCarouselProps {
  slides: OnboardingSlide[];
  onComplete: () => void;
  className?: string;
}

export const OnboardingCarousel = ({
  slides,
  onComplete,
  className,
}: OnboardingCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = useWindowDimensions();
  
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // In a real app with FlatList/ScrollView, we would scroll to the next index here
    } else {
      onComplete();
    }
  };

  if (!slides.length) return null;

  const currentSlide = slides[currentIndex];

  return (
    <View className={cn('flex-1 bg-background', className)}>
      <View className="flex-1 items-center justify-center p-6">
        <ImagePreview 
          altText={currentSlide.imageAlt}
          width={width * 0.8}
          height={width * 0.8}
          className="mb-8 rounded-2xl"
        />
        <Text className="mb-4 text-center text-2xl font-bold text-foreground">
          {currentSlide.title}
        </Text>
        <Text className="text-center text-base text-muted-foreground px-4">
          {currentSlide.description}
        </Text>
      </View>
      
      <View className="p-6 pb-12">
        <View className="mb-8 flex-row justify-center space-x-2">
          {slides.map((_, index) => (
            <View
              key={index}
              className={cn(
                'h-2 rounded-full transition-all',
                index === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-muted'
              )}
            />
          ))}
        </View>
        <Button onPress={handleNext} className="w-full">
          {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
};
