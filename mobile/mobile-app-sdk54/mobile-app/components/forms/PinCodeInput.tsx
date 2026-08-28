import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface PinCodeInputProps {
  length?: number;
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
  secure?: boolean;
  label?: string;
  className?: string;
}

export const PinCodeInput = ({
  length = 4,
  value,
  onValueChange,
  error = false,
  secure = true,
  label,
  className,
}: PinCodeInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < length; i++) {
      const char = value[i];
      const isCurrentFocus = value.length === i && isFocused;
      
      cells.push(
        <View
          key={i}
          className={cn(
            'h-12 w-12 items-center justify-center rounded-xl border-2 bg-card',
            isCurrentFocus ? 'border-primary' : 'border-border',
            error && 'border-destructive bg-destructive/5'
          )}
        >
          {char ? (
            secure ? (
              <View className="h-3 w-3 rounded-full bg-foreground" />
            ) : (
              <Text className="text-xl font-bold font-mono text-foreground">
                {char}
              </Text>
            )
          ) : null}
        </View>
      );
    }
    return cells;
  };

  return (
    <View className={cn('w-full', className)}>
      {Boolean(label) && (
        <Text className="mb-2 text-center text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      <Pressable
        className="flex-row justify-center gap-3"
        onPress={handlePress}
      >
        {renderCells()}
        
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onValueChange}
          maxLength={length}
          keyboardType="number-pad"
          className="absolute h-0 w-0 opacity-0"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </Pressable>
    </View>
  );
};
