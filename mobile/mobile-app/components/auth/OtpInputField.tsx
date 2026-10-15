import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { cn } from '../../lib/utils';

export interface OtpInputFieldProps {
  length?: number;
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
  className?: string;
  cellClassName?: string;
  variant?: 'card' | 'light';
}

export const OtpInputField = ({
  length = 6,
  value = '',
  onValueChange,
  error = false,
  className,
  cellClassName,
  variant = 'card',
}: OtpInputFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const isLight = variant === 'light';
  const cellWidth = length >= 6 ? 46 : 56;
  const cellHeight = length >= 6 ? 52 : 56;

  const renderCells = () => {
    const cells = [];
    const safeValue = value || '';

    for (let i = 0; i < length; i++) {
      const char = safeValue[i] || '';
      const isCurrentFocus = safeValue.length === i && isFocused;

      cells.push(
        <View
          key={i}
          style={{
            width: cellWidth,
            height: cellHeight,
            minWidth: cellWidth,
            minHeight: cellHeight,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            backgroundColor: isLight ? '#FFFFFF' : undefined,
            borderWidth: isCurrentFocus ? 2 : 1,
            borderColor: error ? '#EF4444' : isCurrentFocus ? '#172B4D' : isLight ? '#E2E8F0' : undefined,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isLight ? 0.08 : 0.04,
            shadowRadius: 3,
            elevation: isLight ? 2 : 1,
          }}
          className={cn(
            !isLight && 'border border-border bg-card shadow-xs',
            !isLight && isCurrentFocus && 'border-[#172B4D] shadow-sm bg-primary/5',
            !isLight && error && 'border-destructive bg-destructive/10',
            cellClassName
          )}
        >
          <Text
            style={{
              fontSize: length >= 6 ? 22 : 25,
              fontWeight: '700',
              color: isLight ? '#0F172A' : undefined,
              textAlign: 'center',
              lineHeight: length >= 6 ? 26 : 30,
              includeFontPadding: false,
            }}
            className={cn(
              'font-bold font-sans text-center',
              !isLight && 'text-foreground'
            )}
          >
            {char}
          </Text>
        </View>
      );
    }
    return cells;
  };

  return (
    <Pressable
      className={cn('flex-row items-center justify-between relative w-full', className)}
      onPress={handlePress}
    >
      <View pointerEvents="none" className="flex-row items-center justify-between w-full">
        {renderCells()}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onValueChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.01,
          zIndex: 20,
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </Pressable>
  );
};

export default OtpInputField;
