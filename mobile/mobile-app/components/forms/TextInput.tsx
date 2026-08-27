import React, { forwardRef } from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, View, Text } from 'react-native';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react-native';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  required?: boolean;
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
        {Boolean(label) && (
          <Text className={cn('mb-1.5 text-sm font-medium text-foreground', labelClassName)}>
            {label}
          </Text>
        )}
        <View
          className={cn(
            'flex-row rounded-2xl border border-border/80 bg-card px-3.5 py-3 shadow-xs',
            props.multiline ? 'items-start' : 'items-center',
            Boolean(error) && 'border-destructive bg-destructive/5',
            className
          )}
        >
          {LeftIcon && <LeftIcon size={18} className="me-2.5 text-muted-foreground mt-0.5" />}
          <RNTextInput
            ref={ref}
            className={cn(
              'flex-1 text-[15px] font-sans text-foreground py-0 min-h-[24px]',
              inputClassName
            )}
            style={[{ outlineStyle: 'none', ...(props.multiline ? { textAlignVertical: 'top' } : {}) } as any, props.style]}
            placeholderTextColor="#737c88"
            {...props}
          />
          {RightIcon && (
            <RightIcon
              size={18}
              className="ms-2 text-muted-foreground mt-0.5"
              onPress={onRightIconPress}
            />
          )}
        </View>
        {Boolean(error) && (
          <Text className={cn('mt-1 text-xs text-destructive font-medium ms-1', errorClassName)}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';
