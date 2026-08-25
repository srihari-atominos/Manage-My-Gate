import React from 'react';
import { View, Switch } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface ThemeToggleSwitchProps {
  isDark: boolean;
  onToggle: (isDark: boolean) => void;
  className?: string;
}

export const ThemeToggleSwitch = ({
  isDark,
  onToggle,
  className,
}: ThemeToggleSwitchProps) => {
  return (
    <View
      className={cn(
        'flex-row items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs',
        className
      )}
    >
      <View className="flex-row items-center">
        <View className="me-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          {isDark ? (
            <Moon size={20} className="text-primary" />
          ) : (
            <Sun size={20} className="text-amber-500" />
          )}
        </View>
        <View>
          <Text className="text-base font-semibold text-foreground">
            Dark Mode
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            {isDark ? 'Active (Dark Theme)' : 'Inactive (Light Theme)'}
          </Text>
        </View>
      </View>
      <Switch
        value={isDark}
        onValueChange={onToggle}
        trackColor={{ false: '#737373', true: '#03A9F4' }}
        thumbColor={isDark ? '#ffffff' : '#f4f4f5'}
      />
    </View>
  );
};

