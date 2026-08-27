import React from 'react';
import { Text, TextProps } from 'react-native';
import { cn } from '../../lib/utils';

export interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption' | 'label';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'error' | 'success' | 'warning' | 'inverse';
  className?: string;
}

export const Typography = ({
  variant = 'body1',
  weight = 'regular',
  color = 'primary',
  className,
  ...props
}: TypographyProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1': return 'text-4xl leading-[44px]';
      case 'h2': return 'text-3xl leading-[38px]';
      case 'h3': return 'text-2xl leading-[32px]';
      case 'h4': return 'text-xl leading-[28px]';
      case 'body1': return 'text-base leading-[24px]';
      case 'body2': return 'text-sm leading-[20px]';
      case 'caption': return 'text-xs leading-[16px]';
      case 'label': return 'text-sm tracking-wide uppercase';
      default: return 'text-base';
    }
  };

  const getWeightStyles = () => {
    switch (weight) {
      case 'regular': return 'font-normal';
      case 'medium': return 'font-medium';
      case 'semibold': return 'font-semibold';
      case 'bold': return 'font-bold';
      default: return 'font-normal';
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case 'primary': return 'text-slate-900 dark:text-slate-100';
      case 'secondary': return 'text-slate-700 dark:text-slate-300';
      case 'muted': return 'text-slate-500 dark:text-slate-400';
      case 'error': return 'text-red-500 dark:text-red-400';
      case 'success': return 'text-emerald-500 dark:text-emerald-400';
      case 'warning': return 'text-amber-500 dark:text-amber-400';
      case 'inverse': return 'text-white dark:text-slate-900';
      default: return 'text-slate-900 dark:text-slate-100';
    }
  };

  return (
    <Text
      className={cn(
        getVariantStyles(),
        getWeightStyles(),
        getColorStyles(),
        className
      )}
      {...props}
    />
  );
};
