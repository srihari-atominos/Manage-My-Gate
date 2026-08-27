import React from 'react';
import { View, Pressable } from 'react-native';
import { Star } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface RatingProps {
  rating: number; // 1 to maxRating
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export const Rating = ({
  rating,
  maxRating = 5,
  onRatingChange,
  size = 24,
  readOnly = false,
  className,
}: RatingProps) => {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      const isFilled = i <= rating;
      stars.push(
        <Pressable
          key={i}
          disabled={readOnly}
          onPress={() => !readOnly && onRatingChange && onRatingChange(i)}
          className="p-1"
          accessibilityRole={readOnly ? 'image' : 'button'}
          accessibilityLabel={`Rate ${i} stars`}
        >
          <Star
            size={size}
            className={cn(isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700')}
          />
        </Pressable>
      );
    }
    return stars;
  };

  return (
    <View className={cn('flex-row items-center', className)}>
      {renderStars()}
    </View>
  );
};
