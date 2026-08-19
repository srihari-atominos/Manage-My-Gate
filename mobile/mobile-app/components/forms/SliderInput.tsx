import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';
// Note: In real app, we would use @react-native-community/slider
// import Slider from '@react-native-community/slider';

export interface SliderInputProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export const SliderInput = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className,
}: SliderInputProps) => {
  // Mock structural implementation of a slider
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <View className={cn('w-full py-2', className)}>
      <View className="flex-row items-center justify-between mb-2">
        {Boolean(label) && (
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </Text>
        )}
        <Text className="text-sm font-bold font-mono text-primary">
          {value}
        </Text>
      </View>
      
      <View className="h-10 justify-center">
        {/* Track */}
        <View className="absolute left-0 right-0 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
        
        {/* Filled Track */}
        <View 
          className="absolute left-0 h-1.5 rounded-full bg-primary" 
          style={{ width: `${percent}%` }}
        />
        
        {/* Thumb */}
        <View 
          className="absolute h-6 w-6 rounded-full bg-white shadow-md border border-slate-200 dark:border-slate-700"
          style={{ left: `${Math.max(0, percent - 5)}%` }} // Adjust for thumb width approximation
        />
      </View>
    </View>
  );
};
