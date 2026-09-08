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
    <View
      className={cn(
        'flex-row items-center h-10 rounded-xl border border-border bg-card overflow-hidden shrink-0',
        className
      )}
    >
      <Pressable
        onPress={handleDecrement}
        disabled={value <= min}
        className={cn('w-10 h-10 items-center justify-center active:bg-secondary', value <= min && 'opacity-40')}
        accessibilityLabel="Decrease count"
      >
        <Minus size={16} className="text-foreground" />
      </Pressable>
      
      <View className="w-11 h-10 items-center justify-center border-x border-border bg-muted/20">
        <Text className="text-sm font-bold text-foreground">
          {value}
        </Text>
      </View>
      
      <Pressable
        onPress={handleIncrement}
        disabled={value >= max}
        className={cn('w-10 h-10 items-center justify-center active:bg-secondary', value >= max && 'opacity-40')}
        accessibilityLabel="Increase count"
      >
        <Plus size={16} className="text-foreground" />
      </Pressable>
    </View>
  );
};
