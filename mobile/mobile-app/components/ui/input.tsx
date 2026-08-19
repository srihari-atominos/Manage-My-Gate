import * as React from 'react';
import { TextInput, View, Text, TouchableOpacity, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

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
      <View className="w-full gap-1.5">
        {Boolean(label) && (
          <Text className="text-foreground font-semibold text-sm">
            {label}
          </Text>
        )}

        <View className="relative flex-row items-center border border-border bg-card rounded-xl px-3.5 focus:border-primary">
          {leftIcon && <View className="mr-2.5">{leftIcon}</View>}

          <TextInput
            ref={ref}
            secureTextEntry={isPassword ? secureTextEntry : props.secureTextEntry}
            placeholderTextColor={props.placeholderTextColor || iconColor}
            className={`flex-1 text-foreground py-3.5 text-sm ${className}`}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              onPress={() => setSecureTextEntry((prev) => !prev)}
              activeOpacity={0.7}
              className="p-1 ml-2"
            >
              {secureTextEntry ? (
                <EyeOff size={18} color={iconColor} />
              ) : (
                <Eye size={18} color={iconColor} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <Text className="text-rose-500 text-xs font-semibold mt-0.5">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';
export default Input;

