import React, { forwardRef, useState } from 'react';
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react-native';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  (
    {
      label,
      error,
      helperText,
      required = false,
      loading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconPress,
      containerClassName,
      labelClassName,
      inputClassName,
      errorClassName,
      helperClassName,
      className,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const placeholderColor = isDark ? '#737373' : '#a3a3a3';

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <View className={cn('w-full', containerClassName)}>
        {Boolean(label) && (
          <View className="mb-1.5 flex-row items-center">
            <Text className={cn('text-sm font-medium text-foreground', labelClassName)}>
              {label}
            </Text>
            {required && <Text className="ms-1 text-sm font-semibold text-destructive">*</Text>}
          </View>
        )}
        <View
          className={cn(
            'flex-row rounded-xl border bg-card px-3 py-2.5',
            isFocused ? 'border-primary' : 'border-border',
            props.multiline ? 'items-start' : 'items-center',
            Boolean(error) && 'border-destructive',
            props.editable === false && 'opacity-60 bg-muted/40',
            className
          )}
        >
          {LeftIcon && <LeftIcon size={20} className="me-2 text-muted-foreground mt-0.5" />}
          <RNTextInput
            ref={ref}
            className={cn(
              'flex-1 text-base text-foreground py-0 min-h-[24px]',
              inputClassName
            )}
            style={[
              { outlineStyle: 'none', ...(props.multiline ? { textAlignVertical: 'top' } : {}) } as any,
              props.style,
            ]}
            placeholderTextColor={placeholderColor}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {loading ? (
            <ActivityIndicator size="small" color={isDark ? '#e5e5e5' : '#171717'} className="ms-2" />
          ) : RightIcon ? (
            <RightIcon
              size={20}
              className="ms-2 text-muted-foreground mt-0.5"
              onPress={onRightIconPress}
            />
          ) : null}
        </View>
        {Boolean(error) ? (
          <Text className={cn('mt-1.5 text-xs text-destructive', errorClassName)}>
            {error}
          </Text>
        ) : Boolean(helperText) ? (
          <Text className={cn('mt-1.5 text-xs text-muted-foreground', helperClassName)}>
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';
export default TextInput;
