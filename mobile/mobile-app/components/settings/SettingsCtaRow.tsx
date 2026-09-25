import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface SettingsCtaRowProps {
  label: string;
  subLabel?: string;
  buttonLabel?: string;
  onPress?: () => void;
  className?: string;
}

export const SettingsCtaRow: React.FC<SettingsCtaRowProps> = ({
  label,
  subLabel,
  buttonLabel,
  onPress,
  className,
}) => {
  return (
    <View
      className={cn(
        'mx-4 mt-3 bg-card border border-border rounded-2xl p-3.5 flex-row items-center justify-between gap-3 shadow-2xs',
        className
      )}
    >
      <View className="flex-1 min-w-0">
        <Text className="text-xs font-bold text-foreground font-sans" numberOfLines={1}>
          {label}
        </Text>
        {subLabel ? (
          <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
            {subLabel}
          </Text>
        ) : null}
      </View>

      {buttonLabel && onPress ? (
        <Pressable
          onPress={onPress}
          className="bg-primary px-3.5 py-1.5 rounded-full active:opacity-85 shadow-2xs shrink-0"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text className="text-xs font-bold text-white font-sans">{buttonLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default SettingsCtaRow;
