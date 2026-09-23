import React from 'react';
import { View, Pressable } from 'react-native';
import { Globe, ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';

export interface LanguageSelectorProps {
  currentLanguage: string;
  onPress: () => void;
  className?: string;
  isLast?: boolean;
}

export const LanguageSelector = ({
  currentLanguage,
  onPress,
  className,
  isLast = false,
}: LanguageSelectorProps) => {
  const { t } = useTranslation();

  return (
    <>
      <Pressable
        onPress={onPress}
        className={cn(
          'flex-row items-center justify-between px-4 py-3.5 active:bg-muted/40',
          className
        )}
        accessibilityRole="button"
        accessibilityLabel={`${t('language', 'Language')}, ${currentLanguage}`}
      >
        <View className="flex-row items-center flex-1 min-w-0">
          <View className="me-3 h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shrink-0">
            <Icon as={Globe} size={18} className="text-primary" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-foreground font-sans" numberOfLines={1}>
              {t('language', 'Language')}
            </Text>
            <Text skipTranslate className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
              {currentLanguage}
            </Text>
          </View>
        </View>
        <Icon as={ChevronRight} size={18} className="text-muted-foreground shrink-0 ms-2" />
      </Pressable>
      {!isLast && <View className="h-px bg-border/60 mx-4" />}
    </>
  );
};

export default LanguageSelector;
