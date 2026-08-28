import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { cn } from '../../lib/utils';

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
    <View className={cn('flex-row items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-900', className)}>
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800">
          {isDark ? (
            <Moon size={20} className="text-indigo-400" />
          ) : (
            <Sun size={20} className="text-amber-500" />
          )}
        </View>
        <View>
          <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Dark Mode
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            {isDark ? 'On' : 'Off'}
          </Text>
        </View>
      </View>
      <Switch
        value={isDark}
        onValueChange={onToggle}
        trackColor={{ false: '#cbd5e1', true: '#4f46e5' }} // slate-300, indigo-600
        thumbColor="#ffffff"
      />
    </View>
  );
};
