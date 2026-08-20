import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type ActionTileBadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';

export const ACTION_TILE_BADGE_STYLES: Record<ActionTileBadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-primary', text: 'text-primary-foreground' },
  success: { bg: 'bg-status-success', text: 'text-white' },
  warning: { bg: 'bg-status-warning', text: 'text-white' },
  destructive: { bg: 'bg-destructive', text: 'text-destructive-foreground' },
  info: { bg: 'bg-status-info', text: 'text-white' },
};

export interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  badge?: string | number;
  badgeVariant?: ActionTileBadgeVariant;
  badgeClassName?: string;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  label,
  onPress,
  badge,
  badgeVariant = 'default',
  badgeClassName,
  disabled = false,
  className,
  containerClassName = 'w-1/4 p-1',
}) => {
  const badgeStyles = ACTION_TILE_BADGE_STYLES[badgeVariant] || ACTION_TILE_BADGE_STYLES.default;

  return (
    <View className={containerClassName}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={cn(
          'h-auto min-h-[84px] w-full flex-col items-center justify-center p-2.5 gap-y-1.5 rounded-2xl relative border border-border bg-card shadow-xs active:bg-accent active:opacity-80',
          disabled && 'opacity-50',
          className
        )}
      >
        {badge !== undefined && badge !== null && badge !== '' ? (
          <View
            className={cn(
              'absolute -top-1.5 end-1 px-1.5 py-0.5 rounded-full z-10',
              badgeStyles.bg,
              badgeClassName
            )}
          >
            <Text className={cn('text-[9px] font-bold leading-none', badgeStyles.text)}>
              {badge}
            </Text>
          </View>
        ) : null}

        <View className="size-9 rounded-xl bg-muted/60 items-center justify-center shrink-0 pointer-events-none">
          {icon}
        </View>

        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          ellipsizeMode="tail"
          className="text-[11px] font-semibold text-foreground text-center leading-tight ps-0.5 pe-0.5"
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
};

export default ActionTile;

