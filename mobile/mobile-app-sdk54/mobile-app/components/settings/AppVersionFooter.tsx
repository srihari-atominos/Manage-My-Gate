import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';
// Note: In real app, import from expo-constants
// import Constants from 'expo-constants';

export interface AppVersionFooterProps {
  className?: string;
}

export const AppVersionFooter = ({ className }: AppVersionFooterProps) => {
  // Mock version for structural purposes
  const version = '1.0.0';
  const buildNumber = '42';

  return (
    <View className={cn('py-6 items-center justify-center', className)}>
      <Text className="text-sm font-semibold text-slate-400 dark:text-slate-500">
        Manage My Gate Enterprise
      </Text>
      <Text className="mt-1 text-xs text-slate-400 dark:text-slate-600 font-mono">
        Version {version} ({buildNumber})
      </Text>
    </View>
  );
};
