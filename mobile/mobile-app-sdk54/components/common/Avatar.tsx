import React from 'react';
import { View, Text, Image, ImageSourcePropType, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';
import { User } from 'lucide-react-native';

export interface AvatarProps extends ViewProps {
  source?: ImageSourcePropType | null;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export const Avatar = ({
  source,
  fallback,
  size = 'md',
  className,
  imageClassName,
  fallbackClassName,
  ...props
}: AvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl',
  };

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full bg-primary/10 border border-primary/20',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {source ? (
        <Image
          source={source}
          className={cn('h-full w-full', imageClassName)}
          accessibilityRole="image"
        />
      ) : fallback ? (
        <Text
          className={cn(
            'font-bold font-sans uppercase text-primary',
            textSizes[size],
            fallbackClassName
          )}
        >
          {fallback.substring(0, 2)}
        </Text>
      ) : (
        <User size={iconSizes[size]} className="text-muted-foreground" />
      )}
    </View>
  );
};
