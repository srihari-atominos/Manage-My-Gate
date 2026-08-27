import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Globe, ChevronRight } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface LanguageSelectorProps {
  currentLanguage: string;
  onPress: () => void;
  className?: string;
}

export const LanguageSelector = ({
  currentLanguage,
  onPress,
  className,
}: LanguageSelectorProps) => {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-900',
        className
      )}
    >
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800">
          <Globe size={20} className="text-blue-500" />
        </View>
        <View>
          <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Language
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            {currentLanguage}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} className="text-slate-400" />
    </Pressable>
  );
};
