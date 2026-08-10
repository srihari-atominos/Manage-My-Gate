import React, { forwardRef } from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, View, Text } from 'react-native';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react-native';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  (
    {
      label,
      error,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconPress,
      containerClassName,
      labelClassName,
      inputClassName,
      errorClassName,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <View className={cn('w-full', containerClassName)}>
        {label && (
          <Text className={cn('mb-1.5 text-sm font-medium text-foreground', labelClassName)}>
            {label}
          </Text>
        )}
        <View
          className={cn(
            'flex-row items-center rounded-xl border border-border bg-card px-3 py-3',
            error && 'border-destructive',
            className
          )}
        >
          {LeftIcon && <LeftIcon size={20} className="me-2 text-muted-foreground" />}
          <RNTextInput
            ref={ref}
            className={cn(
              'flex-1 text-base text-foreground',
              inputClassName
            )}
            placeholderTextColor="#94a3b8"
            {...props}
          />
          {RightIcon && (
            <RightIcon
              size={20}
              className="ms-2 text-muted-foreground"
              onPress={onRightIconPress}
            />
          )}
        </View>
        {error && (
          <Text className={cn('mt-1.5 text-xs text-red-500', errorClassName)}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';
