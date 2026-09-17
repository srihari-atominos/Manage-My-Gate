import * as React from 'react';
import { TextInput, View, Text, TouchableOpacity, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { cn } from '../../lib/utils';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, isPassword = false, leftIcon, className = '', ...props }, ref) => {
    const [secureTextEntry, setSecureTextEntry] = React.useState(isPassword);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const iconColor = isDark ? '#9ca3af' : '#6b7280';

    return (
      <View className="w-full gap-1">
        {Boolean(label) && (
          <Text className="text-foreground font-medium text-[13px] ms-1">
            {label}
          </Text>
        )}

        <View className={cn(
          "relative flex-row items-center border border-border bg-card rounded-xl px-3 min-h-[42px] focus:border-primary",
          error ? "border-destructive bg-destructive/5" : ""
        )}>
          {leftIcon && <View className="me-2" pointerEvents="none">{leftIcon}</View>}

          <TextInput
            ref={ref}
            secureTextEntry={isPassword ? secureTextEntry : props.secureTextEntry}
            placeholderTextColor={props.placeholderTextColor || (isDark ? '#737c88' : '#9ca3af')}
            className={cn(`flex-1 text-foreground py-2 min-h-[38px] self-stretch text-[13.5px] font-sans`, className)}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              onPress={() => setSecureTextEntry((prev) => !prev)}
              activeOpacity={0.7}
              className="p-1 ms-1"
            >
              {secureTextEntry ? (
                <EyeOff size={16} color={iconColor} />
              ) : (
                <Eye size={16} color={iconColor} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <Text className="text-destructive text-xs font-medium ms-1">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';
export default Input;

