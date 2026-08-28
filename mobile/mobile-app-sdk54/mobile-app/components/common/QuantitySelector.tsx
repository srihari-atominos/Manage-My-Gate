import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
}

export const QuantitySelector = ({
  value,
  min = 1,
  max = 99,
  onChange,
  className,
}: QuantitySelectorProps) => {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <View className={cn('flex-row items-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900', className)}>
      <Pressable
        onPress={handleDecrement}
        disabled={value <= min}
        className={cn('p-2', value <= min && 'opacity-50')}
      >
        <Minus size={16} className="text-slate-700 dark:text-slate-300" />
      </Pressable>
      
      <View className="w-10 items-center justify-center border-l border-r border-slate-200 dark:border-slate-800 h-full">
        <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {value}
        </Text>
      </View>
      
      <Pressable
        onPress={handleIncrement}
        disabled={value >= max}
        className={cn('p-2', value >= max && 'opacity-50')}
      >
        <Plus size={16} className="text-slate-700 dark:text-slate-300" />
      </Pressable>
    </View>
  );
};
