import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface SettingsCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  containerClassName?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  children,
  title,
  className,
  containerClassName,
}) => {
  return (
    <View className={cn('mx-4 mt-5', containerClassName)}>
      {title ? (
        <Text className="text-xs font-bold text-muted-foreground uppercase px-1 mb-2 tracking-wider font-sans">
          {title}
        </Text>
      ) : null}
      <View
        className={cn(
          'bg-card rounded-2xl border border-border overflow-hidden shadow-xs',
          className
        )}
      >
        {children}
      </View>
    </View>
  );
};

export default SettingsCard;
