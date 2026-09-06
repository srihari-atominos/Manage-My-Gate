import React from 'react';
import { View, Switch } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { type LucideIcon } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { useColorScheme } from 'nativewind';

export interface SettingToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  disabled?: boolean;
  isLastItem?: boolean;
  className?: string;
}

export const SettingToggleRow = ({
  label,
  description,
  value,
  onValueChange,
  icon: LeftIcon,
  iconBgColor,
  iconColor,
  disabled = false,
  isLastItem = false,
  className,
}: SettingToggleRowProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      className={cn(
        'flex-row items-center justify-between py-3.5',
        !isLastItem && 'border-b border-border/40',
        disabled && 'opacity-50',
        className
      )}
    >
      <View className="flex-row items-center flex-1 pe-3">
        {LeftIcon && (
          <View
            className={cn(
              'me-3 h-9 w-9 items-center justify-center rounded-xl shrink-0',
              iconBgColor || 'bg-primary/10 border border-primary/20'
            )}
          >
            <Icon
              as={LeftIcon}
              size={18}
              color={iconColor}
              className={!iconColor ? 'text-primary' : undefined}
            />
          </View>
        )}

        <View className="flex-1 justify-center min-w-0">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {label}
          </Text>
          {description ? (
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: isDark ? '#262626' : '#e5e5e5', true: '#03A9F4' }}
        thumbColor={value ? '#ffffff' : isDark ? '#a3a3a3' : '#f4f4f5'}
      />
    </View>
  );
};

export default SettingToggleRow;
