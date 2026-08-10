import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { cn } from '../../lib/utils';

export interface OtpInputFieldProps {
  length?: number;
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
  className?: string;
}

export const OtpInputField = ({
  length = 6,
  value,
  onValueChange,
  error = false,
  className,
}: OtpInputFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < length; i++) {
      const char = value[i] || '';
      const isCurrentFocus = value.length === i && isFocused;
      
      cells.push(
        <View
          key={i}
          className={cn(
            'h-14 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
            isCurrentFocus && 'border-primary ring-2 ring-primary/20',
            error && 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
          )}
        >
          <TextInput
            value={char}
            editable={false}
            className="text-2xl font-bold text-slate-900 dark:text-slate-100"
          />
        </View>
      );
    }
    return cells;
  };

  return (
    <Pressable
      className={cn('flex-row items-center justify-between', className)}
      onPress={handlePress}
    >
      {renderCells()}
      
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onValueChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        className="absolute h-0 w-0 opacity-0"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </Pressable>
  );
};
