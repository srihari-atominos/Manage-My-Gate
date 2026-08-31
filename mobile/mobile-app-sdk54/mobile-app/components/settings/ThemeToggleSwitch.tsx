import React from 'react';
import { View, Pressable } from 'react-native';
import { Moon, Sun, Smartphone } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { ThemeMode } from '@/src/features/settings/hooks/useSettings';

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
  t,
}: ThemeToggleSwitchProps) => {
  const translate = t || ((_, fb) => fb || '');

  const activeLabel =
    themeMode === 'system'
      ? 'Phone Default'
      : themeMode === 'dark'
      ? 'Dark'
      : 'Light';

  const OPTIONS: Array<{ mode: ThemeMode; label: string; icon: any }> = [
    { mode: 'system', label: 'Auto', icon: Smartphone },
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <View className={cn('bg-card border border-border rounded-2xl p-4 gap-3 shadow-xs', className)}>
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shrink-0">
          {themeMode === 'system' ? (
            <Smartphone size={18} className="text-primary" />
          ) : themeMode === 'dark' ? (
            <Moon size={18} className="text-primary" />
          ) : (
            <Sun size={18} className="text-amber-500" />
          )}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-bold text-foreground">
            {translate('theme_mode', 'Theme Mode')}
          </Text>
          <Text className="text-[11px] text-muted-foreground mt-0.5">
            {activeLabel}
          </Text>
        </View>
      </View>

      {/* 3-Way Segmented Selector */}
      <View className="flex-row bg-muted/40 border border-border p-1 rounded-xl">
        {OPTIONS.map((opt) => {
          const isSelected = themeMode === opt.mode;
          const IconComp = opt.icon;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => onSelectMode(opt.mode)}
              className={cn(
                'flex-1 flex-row items-center justify-center py-2.5 rounded-lg gap-1.5',
                isSelected
                  ? 'bg-card border border-border shadow-sm'
                  : 'bg-transparent active:bg-muted/60'
              )}
            >
              <IconComp
                size={14}
                className={isSelected ? 'text-primary' : 'text-muted-foreground'}
              />
              <Text
                className={cn(
                  'text-xs',
                  isSelected ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                )}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default ThemeToggleSwitch;
