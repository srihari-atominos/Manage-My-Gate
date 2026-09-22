import React from 'react';
import { View, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface SettingsRowProps {
  icon?: any;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  isDestructive?: boolean;
  isLast?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  badge,
  rightElement,
  showChevron = true,
  onPress,
  isDestructive = false,
  isLast = false,
  disabled = false,
  className,
}) => {
  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        className={cn(
          'flex-row items-center px-4 py-3.5',
          isDestructive ? 'active:bg-destructive/10' : 'active:bg-muted/40',
          disabled && 'opacity-60',
          className
        )}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      >
        {icon ? (
          <View
            style={iconBgColor ? { backgroundColor: iconBgColor } : undefined}
            className={cn(
              'h-9 w-9 rounded-full items-center justify-center me-3 shrink-0',
              !iconBgColor && (isDestructive ? 'bg-destructive/10 border border-destructive/20' : 'bg-primary/10 border border-primary/20')
            )}
          >
            <Icon
              as={icon}
              size={18}
              color={iconColor}
              className={cn(!iconColor && (isDestructive ? 'text-destructive' : 'text-primary'))}
            />
          </View>
        ) : null}

        <View className="flex-1 min-w-0 justify-center">
          <View className="flex-row items-center gap-2">
            <Text
              className={cn(
                'text-sm font-semibold tracking-tight',
                isDestructive ? 'text-destructive' : 'text-foreground'
              )}
              numberOfLines={1}
            >
              {title}
            </Text>
            {badge ? (
              <View className="bg-primary/15 px-2 py-0.5 rounded-full border border-primary/20">
                <Text className="text-[10px] font-bold text-primary">{badge}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text className="text-xs text-muted-foreground mt-0.5 leading-4" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightElement ? (
          <View className="ms-2 shrink-0">{rightElement}</View>
        ) : showChevron && onPress ? (
          <Icon as={ChevronRight} size={18} className="text-muted-foreground shrink-0 ms-2" />
        ) : null}
      </Pressable>

      {!isLast && <View className="h-px bg-border/60 mx-4" />}
    </>
  );
};

export default SettingsRow;
