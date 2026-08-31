import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface AppVersionFooterProps {
  className?: string;
}

export const AppVersionFooter = ({ className }: AppVersionFooterProps) => {
  const version = '2.4.0';
  const buildNumber = '1042';

  return (
    <View className={cn('py-6 items-center justify-center', className)}>
      <Text className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
        Manage My Gate Enterprise
      </Text>
      <Text className="mt-1 text-[11px] text-muted-foreground/70 font-mono">
        v{version} (Build {buildNumber}) • Smart Gate OS
      </Text>
    </View>
  );
};

