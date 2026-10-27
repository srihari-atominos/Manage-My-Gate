import React from 'react';
import { TextProps } from 'react-native';
import { Text } from '../ui/text';
import { cn } from '../../lib/utils';

export interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption' | 'label';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'error' | 'success' | 'warning' | 'inverse';
  className?: string;
  adaptive?: boolean;
}

export const Typography = ({
  variant = 'body1',
  weight = 'regular',
  color = 'primary',
  className,
  adaptive = true,
  ...props
}: TypographyProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return 'text-2xl phone-sm:text-3xl phone-md:text-4xl';
      case 'h2':
        return 'text-xl phone-sm:text-2xl phone-md:text-3xl';
      case 'h3':
        return 'text-lg phone-sm:text-xl phone-md:text-2xl';
      case 'h4':
        return 'text-base phone-sm:text-lg phone-md:text-xl';
      case 'body1':
        return 'text-sm phone-md:text-base';
      case 'body2':
        return 'text-xs phone-md:text-sm';
      case 'caption':
        return 'text-caption phone-md:text-xs';
      case 'label':
        return 'text-caption phone-md:text-xs tracking-wider uppercase';
      default:
        return 'text-sm phone-md:text-base';
    }
  };

  const getWeightStyles = () => {
    switch (weight) {
      case 'regular':
        return 'font-sans';
      case 'medium':
        return 'font-medium';
      case 'semibold':
        return 'font-semibold';
      case 'bold':
        return 'font-bold';
      default:
        return 'font-sans';
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return 'text-foreground';
      case 'secondary':
        return 'text-foreground/80';
      case 'muted':
        return 'text-muted-foreground';
      case 'error':
        return 'text-destructive';
      case 'success':
        return 'text-status-success-foreground dark:text-status-success-dark';
      case 'warning':
        return 'text-status-warning-foreground dark:text-status-warning-dark';
      case 'inverse':
        return 'text-background';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Text
      className={cn(getVariantStyles(), getWeightStyles(), getColorStyles(), className)}
      adaptive={adaptive}
      {...props}
    />
  );
};
