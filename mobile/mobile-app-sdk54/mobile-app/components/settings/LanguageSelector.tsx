import React from 'react';
import { View, Pressable } from 'react-native';
import { Globe, ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

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
        'flex-row items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs active:bg-accent/50',
        className
      )}
      accessibilityRole="button"
      accessibilityLabel={`Select Language, currently ${currentLanguage}`}
    >
      <View className="flex-row items-center">
        <View className="me-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <Globe size={20} className="text-primary" />
        </View>
        <View>
          <Text className="text-base font-semibold text-foreground">
            Language
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            {currentLanguage}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} className="text-muted-foreground" />
    </Pressable>
  );
};

