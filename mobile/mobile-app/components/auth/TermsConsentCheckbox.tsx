import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface TermsConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onPressTerms: () => void;
  onPressPrivacy: () => void;
  className?: string;
}

export const TermsConsentCheckbox = ({
  checked,
  onCheckedChange,
  onPressTerms,
  onPressPrivacy,
  className,
}: TermsConsentCheckboxProps) => {
  return (
    <View className={cn('flex-row items-start', className)}>
      <Pressable
        onPress={() => onCheckedChange(!checked)}
        className={cn(
          'mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-md border',
          checked 
            ? 'border-primary bg-primary' 
            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
        )}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        {checked && <Check size={14} className="text-white" />}
      </Pressable>
      
      <Text className="flex-1 text-sm text-slate-600 dark:text-slate-400 leading-5">
        I agree to the{' '}
        <Text 
          onPress={onPressTerms}
          className="font-semibold text-primary underline"
        >
          Terms of Service
        </Text>
        {' '}and{' '}
        <Text 
          onPress={onPressPrivacy}
          className="font-semibold text-primary underline"
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
};
