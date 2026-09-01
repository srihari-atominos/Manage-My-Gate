import React, { forwardRef, isValidElement } from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react-native';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  leftIcon?: LucideIcon | React.ReactNode;
  rightIcon?: LucideIcon | React.ReactNode;
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
      leftIcon,
      rightIcon,
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
    const renderIcon = (icon: any, isLeft: boolean) => {
      if (!icon) return null;
      if (isValidElement(icon)) {
        return <View className={isLeft ? 'me-2.5 mt-0.5' : 'ms-2 mt-0.5'}>{icon}</View>;
      }
      const IconComponent = icon;
      return (
        <IconComponent
          size={18}
          className={cn(isLeft ? 'me-2.5' : 'ms-2', 'text-muted-foreground mt-0.5')}
          onPress={!isLeft ? onRightIconPress : undefined}
        />
      );
    };

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
          {renderIcon(leftIcon, true)}
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
          {rightIcon && (
            onRightIconPress && isValidElement(rightIcon) ? (
              <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7}>
                {renderIcon(rightIcon, false)}
              </TouchableOpacity>
            ) : (
              renderIcon(rightIcon, false)
            )
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
