import React, { forwardRef, isValidElement, useState } from 'react';
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { cn } from '../../lib/utils';
import { LucideIcon, CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react-native';
import { ValidationStatus } from '../../src/utils/validation';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  status?: ValidationStatus;
  isValidating?: boolean;
  isValid?: boolean;
  helperText?: string;
  successMessage?: string;
  clearable?: boolean;
  onClear?: () => void;
  leftIcon?: LucideIcon | React.ReactNode;
  rightIcon?: LucideIcon | React.ReactNode;
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
      required,
      error,
      status = 'idle',
      isValidating = false,
      isValid = false,
      helperText,
      successMessage,
      clearable = false,
      onClear,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerClassName,
      labelClassName,
      inputClassName,
      errorClassName,
      helperClassName,
      className,
      value,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    // Determine effective validation status
    const effectiveStatus: ValidationStatus = error
      ? 'invalid'
      : isValidating
      ? 'validating'
      : isValid || status === 'valid'
      ? 'valid'
      : status;

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

    // Determine feedback text and color below the input
    let feedbackText: string | undefined = undefined;
    let feedbackType: 'error' | 'incomplete' | 'success' | 'validating' | 'helper' = 'helper';

    if (error) {
      feedbackText = error;
      feedbackType = 'error';
    } else if (effectiveStatus === 'incomplete' && helperText) {
      feedbackText = helperText;
      feedbackType = 'incomplete';
    } else if (effectiveStatus === 'validating') {
      feedbackText = helperText || 'Verifying...';
      feedbackType = 'validating';
    } else if (effectiveStatus === 'valid' && successMessage) {
      feedbackText = successMessage;
      feedbackType = 'success';
    } else if (helperText) {
      feedbackText = helperText;
      feedbackType = 'helper';
    }

    return (
      <View className={cn('w-full', containerClassName)}>
        {Boolean(label) && (
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className={cn('text-sm font-medium text-foreground', labelClassName)}>
              {label}
              {required && !label?.includes('*') && (
                <Text className="text-destructive font-bold"> *</Text>
              )}
            </Text>
            {effectiveStatus === 'valid' && !error && (
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                <Text className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Valid
                </Text>
              </View>
            )}
          </View>
        )}

        <View
          className={cn(
            'flex-row rounded-2xl border bg-card px-3.5 py-3 shadow-xs transition-colors',
            props.multiline ? 'items-start' : 'items-center',
            // Default border
            'border-border/80',
            // Focused state
            isFocused && !error && 'border-primary ring-2 ring-primary/20',
            // Incomplete status
            effectiveStatus === 'incomplete' && !error && 'border-amber-500/80 bg-amber-500/5',
            // Validating status
            effectiveStatus === 'validating' && 'border-primary/80 bg-primary/5',
            // Valid status
            effectiveStatus === 'valid' && !error && 'border-emerald-500/80 bg-emerald-500/5',
            // Error / Invalid status
            Boolean(error) && 'border-destructive bg-destructive/5 ring-1 ring-destructive/20',
            className
          )}
        >
          {renderIcon(leftIcon, true)}

          <RNTextInput
            ref={ref}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'flex-1 text-[15px] font-sans text-foreground py-0 min-h-[24px]',
              inputClassName
            )}
            style={[
              {
                outlineStyle: 'none',
                ...(props.multiline ? { textAlignVertical: 'top' } : {}),
              } as any,
              props.style,
            ]}
            placeholderTextColor="#737c88"
            accessibilityLabel={label || props.placeholder}
            accessibilityState={{
              disabled: props.editable === false,
            }}
            {...props}
          />

          {/* Quick Clear Icon */}
          {clearable && Boolean(value) && (
            <TouchableOpacity
              onPress={() => {
                if (onClear) onClear();
                if (props.onChangeText) props.onChangeText('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1 rounded-full bg-muted me-1"
              accessibilityRole="button"
              accessibilityLabel="Clear input"
            >
              <X size={13} className="text-muted-foreground" />
            </TouchableOpacity>
          )}

          {/* Right Accessories: Spinner, Valid Checkmark, or Custom rightIcon */}
          {isValidating ? (
            <View className="ms-2">
              <ActivityIndicator size="small" color="#FF5E00" />
            </View>
          ) : effectiveStatus === 'valid' && !rightIcon && !error ? (
            <View className="ms-2">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            </View>
          ) : rightIcon ? (
            onRightIconPress && isValidElement(rightIcon) ? (
              <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7}>
                {renderIcon(rightIcon, false)}
              </TouchableOpacity>
            ) : (
              renderIcon(rightIcon, false)
            )
          ) : null}
        </View>

        {/* Feedback / Error / Helper Text */}
        {Boolean(feedbackText) && (
          <View className="flex-row items-center mt-1 ms-1 gap-1">
            {feedbackType === 'error' && (
              <AlertCircle size={12} className="text-destructive shrink-0" />
            )}
            {feedbackType === 'incomplete' && (
              <AlertCircle size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            {feedbackType === 'success' && (
              <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <Text
              className={cn(
                'text-xs font-medium',
                feedbackType === 'error' && 'text-destructive font-semibold',
                feedbackType === 'incomplete' && 'text-amber-600 dark:text-amber-400',
                feedbackType === 'success' && 'text-emerald-600 dark:text-emerald-400 font-semibold',
                feedbackType === 'validating' && 'text-primary',
                feedbackType === 'helper' && 'text-muted-foreground',
                errorClassName,
                helperClassName
              )}
            >
              {feedbackText}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';
