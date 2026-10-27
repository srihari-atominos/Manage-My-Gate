import React, { forwardRef, isValidElement, useState } from 'react';
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { cn } from '../../lib/utils';
import { LucideIcon, CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react-native';
import { ValidationStatus } from '../../src/utils/validation';
import { useTranslation } from '../../src/utils/i18n';
import { AppLoader } from '@/components/ui/AppLoader';
import { DEFAULT_MAX_FONT_SIZE_MULTIPLIER } from '../../src/utils/responsiveTypography';
import { useColorScheme } from 'nativewind';

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
  rightIconColor?: string;
  onRightIconPress?: () => void;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
  feedbackContainerClassName?: string;
  wrapperStyle?: any;
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
      rightIconColor,
      onRightIconPress,
      containerClassName,
      labelClassName,
      inputClassName,
      errorClassName,
      helperClassName,
      feedbackContainerClassName,
      wrapperStyle,
      className,
      value,
      onFocus,
      onBlur,
      maxFontSizeMultiplier = DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
      ...props
    },
    ref
  ) => {
    const { translateText, t } = useTranslation();
    const { colorScheme } = useColorScheme();
    const [isFocused, setIsFocused] = useState(false);
    const placeholderColor = colorScheme === 'dark' ? '#AAB4C4' : '#5F6B7A';

    const handleFocus = (e: any) => {
      setIsFocused(true);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const target = e?.target;
        if (target && typeof target.scrollIntoView === 'function') {
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }
      }
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
        return (
          <View
            pointerEvents={isLeft ? 'none' : undefined}
            style={isLeft ? { marginRight: 12, alignItems: 'center', justifyContent: 'center' } : { marginLeft: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            {icon}
          </View>
        );
      }
      const IconComponent = icon;
      return (
        <View
          pointerEvents={isLeft ? 'none' : (!isLeft && onRightIconPress ? 'auto' : 'none')}
          style={isLeft ? { marginRight: 12, alignItems: 'center', justifyContent: 'center' } : { marginLeft: 10, alignItems: 'center', justifyContent: 'center' }}
        >
          <IconComponent
            size={18}
            className={rightIconColor ? undefined : 'text-muted-foreground'}
            color={rightIconColor}
            onPress={!isLeft ? onRightIconPress : undefined}
          />
        </View>
      );
    };

    // Determine feedback text and color below the input
    let feedbackText: string | undefined = undefined;
    let feedbackType: 'error' | 'incomplete' | 'success' | 'validating' | 'helper' = 'helper';

    if (error) {
      feedbackText = translateText(error);
      feedbackType = 'error';
    } else if (effectiveStatus === 'incomplete' && helperText) {
      feedbackText = translateText(helperText);
      feedbackType = 'incomplete';
    } else if (effectiveStatus === 'validating') {
      feedbackText = helperText ? translateText(helperText) : t('verifying', 'Verifying...');
      feedbackType = 'validating';
    } else if (effectiveStatus === 'valid' && successMessage) {
      feedbackText = translateText(successMessage);
      feedbackType = 'success';
    } else if (helperText) {
      feedbackText = translateText(helperText);
      feedbackType = 'helper';
    }

    const translatedPlaceholder = props.placeholder ? translateText(props.placeholder) : undefined;
    const translatedLabel = label ? translateText(label) : undefined;
    const hasFontFamily = Boolean(
      inputClassName &&
        (inputClassName.includes('font-sans') ||
          inputClassName.includes('font-medium') ||
          inputClassName.includes('font-semibold') ||
          inputClassName.includes('font-bold') ||
          inputClassName.includes('font-mono'))
    );

    return (
      <View className={cn('w-full', containerClassName)}>
        {Boolean(translatedLabel) && (
          <View className="flex-row items-center justify-between gap-2 mb-1.5">
            <Text
              className={cn('flex-1 min-w-0 text-xs font-bold text-foreground', labelClassName)}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{ fontWeight: 'bold' }}
            >
              {translatedLabel}
              {required && !label?.includes('*') && (
                <Text className="text-destructive font-bold"> *</Text>
              )}
            </Text>
            {effectiveStatus === 'valid' && !error && (
              <View className="flex-row items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                <Text className="text-caption font-bold text-emerald-600 dark:text-emerald-400">
                  {t('valid', 'Valid')}
                </Text>
              </View>
            )}
          </View>
        )}

        <View
          style={wrapperStyle}
          className={cn(
            'flex-row rounded-2xl border bg-card dark:bg-[#1C1C20] px-3.5 py-3 shadow-2xs transition-colors',
            props.multiline ? 'items-start' : 'items-center',
            // Default border
            'border-border/80 dark:border-border/50',
            // Keep focus visually calm: native focus rings/bright orange halos
            // are distracting while typing, especially inside sheets on Android.
            isFocused && !error && 'border-border/80 bg-card',
            // Incomplete status
            effectiveStatus === 'incomplete' && !error && 'border-amber-500/80 bg-amber-500/5',
            // Validating status
            effectiveStatus === 'validating' && 'border-primary/80 bg-primary/5',
            // Valid status
            effectiveStatus === 'valid' && !error && 'border-emerald-500/80 bg-emerald-500/5',
            // Error / Invalid status
            Boolean(error) && 'border-destructive bg-destructive/5 shadow-sm',
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
              'min-w-0 flex-1 text-[13.5px] text-foreground self-stretch outline-none focus:outline-none focus-visible:outline-none',
              !hasFontFamily && 'font-sans',
              props.multiline ? 'py-0 min-h-[88px]' : 'py-1.5 min-h-[38px]',
              inputClassName
            )}
            style={[
              {
                outline: 'none',
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
                backgroundColor: 'transparent',
                paddingHorizontal: 4,
                paddingVertical: Platform.OS === 'ios' ? 4 : 2,
                textAlign: (props.style as any)?.textAlign || 'left',
                includeFontPadding: false,
                textAlignVertical: props.multiline ? 'top' : 'center',
              } as any,
              props.style,
            ]}
            placeholderTextColor={placeholderColor}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            accessibilityLabel={translatedLabel || translatedPlaceholder}
            accessibilityState={{
              disabled: props.editable === false,
            }}
            {...props}
            placeholder={translatedPlaceholder}
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
              <AppLoader variant="inline" />
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
          <View className={cn("flex-row items-center gap-1", feedbackContainerClassName || "mt-1 ms-1")}>
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
                'flex-1 min-w-0 text-xs font-medium',
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
