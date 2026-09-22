import React from 'react';
import { View, Pressable } from 'react-native';
import { Moon, Sun, Smartphone } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { ThemeMode } from '@/src/features/settings/hooks/useSettings';
import { useTranslation } from '@/src/utils/i18n';

export interface ThemeToggleSwitchProps {
  themeMode: ThemeMode;
  onSelectMode: (mode: ThemeMode) => void;
  className?: string;
  t?: (key: string, fallback?: string) => string;
}

export const ThemeToggleSwitch = ({
  themeMode,
  onSelectMode,
  className,
  t: customT,
}: ThemeToggleSwitchProps) => {
  const { t: hookT } = useTranslation();
  const t = customT || hookT;

  const activeLabel =
    themeMode === 'system'
      ? t('system_default', 'Phone Default')
      : themeMode === 'dark'
      ? t('dark_mode', 'Dark Mode')
      : t('light_mode', 'Light Mode');

  const OPTIONS: Array<{ mode: ThemeMode; labelKey: string; fallback: string; icon: any }> = [
    { mode: 'light', labelKey: 'light', fallback: 'Light', icon: Sun },
    { mode: 'system', labelKey: 'auto', fallback: 'Auto', icon: Smartphone },
    { mode: 'dark', labelKey: 'dark', fallback: 'Dark', icon: Moon },
  ];

  return (
    <View className={cn('p-4 gap-3', className)}>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shrink-0">
          {themeMode === 'system' ? (
            <Icon as={Smartphone} size={18} className="text-primary" />
          ) : themeMode === 'dark' ? (
            <Icon as={Moon} size={18} className="text-primary" />
          ) : (
            <Icon as={Sun} size={18} className="text-amber-500" />
          )}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-foreground font-sans">
            {t('theme_mode', 'Theme Mode')}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            {activeLabel}
          </Text>
        </View>
      </View>

      {/* 3-Way Segmented Selector */}
      <View className="flex-row bg-muted/40 border border-border p-1 rounded-xl">
        {OPTIONS.map((opt) => {
          const isSelected = themeMode === opt.mode;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => onSelectMode(opt.mode)}
              className={cn(
                'flex-1 flex-row items-center justify-center py-2.5 rounded-lg gap-1.5',
                isSelected
                  ? 'bg-card border border-border shadow-2xs'
                  : 'bg-transparent active:bg-muted/60'
              )}
              accessibilityRole="button"
              accessibilityLabel={t(opt.labelKey, opt.fallback)}
            >
              <Icon
                as={opt.icon}
                size={14}
                color={isSelected ? '#FF6A00' : '#94a3b8'}
              />
              <Text
                className={cn(
                  'text-xs font-sans',
                  isSelected ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                )}
              >
                {t(opt.labelKey, opt.fallback)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default ThemeToggleSwitch;
