import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/utils';
// Note: SVG icons for social platforms usually imported here
// Using basic Lucide icons for structural representation
import { Check, Mail } from 'lucide-react-native'; 

export interface SocialAuthButtonProps {
  provider: 'google' | 'apple' | 'microsoft';
  onPress: () => void;
  className?: string;
}

export const SocialAuthButton = ({
  provider,
  onPress,
  className,
}: SocialAuthButtonProps) => {
  const getProviderDetails = () => {
    switch (provider) {
      case 'google':
        return { label: 'Continue with Google', icon: <Mail size={20} className="text-red-500" /> };
      case 'apple':
        return { label: 'Continue with Apple', icon: <Check size={20} className="text-slate-900 dark:text-white" /> };
      case 'microsoft':
        return { label: 'Continue with Microsoft', icon: <Check size={20} className="text-blue-500" /> };
      default:
        return { label: 'Continue', icon: null };
    }
  };

  const { label, icon } = getProviderDetails();

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-center rounded-xl border border-border bg-card p-3.5 shadow-xs active:bg-secondary',
        className
      )}
    >
      <View className="absolute start-4">
        {icon}
      </View>
      <Text className="text-[15px] font-semibold font-sans text-foreground">
        {label}
      </Text>
    </Pressable>
  );
};
