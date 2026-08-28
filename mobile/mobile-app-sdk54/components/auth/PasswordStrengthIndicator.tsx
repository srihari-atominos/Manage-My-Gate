import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface PasswordStrengthIndicatorProps {
  password?: string;
  className?: string;
}

export const PasswordStrengthIndicator = ({
  password = '',
  className,
}: PasswordStrengthIndicatorProps) => {
  // Very basic strength calculation for structural purposes
  let strength = 0;
  if (password.length > 0) strength += 1;
  if (password.length > 7) strength += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;

  // Map 0-5 to 0-3 (Weak, Fair, Good, Strong)
  const strengthLevel = Math.min(Math.floor(strength / 1.5), 3);

  const getStrengthColor = (level: number) => {
    if (level === 0) return 'bg-slate-200 dark:bg-slate-800'; // Empty
    if (strengthLevel === 1) return level <= 1 ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-800'; // Weak
    if (strengthLevel === 2) return level <= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'; // Fair/Good
    return 'bg-emerald-500'; // Strong (3)
  };

  const getStrengthText = () => {
    if (password.length === 0) return '';
    if (strengthLevel === 1) return 'Weak';
    if (strengthLevel === 2) return 'Good';
    return 'Strong';
  };

  const getStrengthTextColor = () => {
    if (strengthLevel === 1) return 'text-red-500';
    if (strengthLevel === 2) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <View className={cn('w-full mt-2', className)}>
      <View className="flex-row items-center justify-between gap-2 mb-1">
        <View className={cn('h-1.5 flex-1 rounded-full', getStrengthColor(1))} />
        <View className={cn('h-1.5 flex-1 rounded-full', getStrengthColor(2))} />
        <View className={cn('h-1.5 flex-1 rounded-full', getStrengthColor(3))} />
      </View>
      {password.length > 0 && (
        <Text className={cn('text-xs text-right mt-1', getStrengthTextColor())}>
          {getStrengthText()}
        </Text>
      )}
    </View>
  );
};
