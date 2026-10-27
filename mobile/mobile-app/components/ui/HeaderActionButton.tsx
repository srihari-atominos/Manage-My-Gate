import React from 'react';
import { ActivityIndicator, Pressable, PressableProps } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Text } from './text';
import { cn } from '@/lib/utils';

interface HeaderActionButtonProps extends Omit<PressableProps, 'children'> {
  /** Optional text label. Omit for icon-only compact button. */
  label?: string;
  icon: LucideIcon;
  loading?: boolean;
  className?: string;
}

export function HeaderActionButton({
  label,
  icon: ActionIcon,
  loading = false,
  className,
  disabled,
  ...props
}: HeaderActionButtonProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#F9FAFB' : '#111827';

  return (
    <Pressable
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={disabled || loading}
      className={cn(
        label
          ? 'h-11 min-w-11 max-w-[132px] shrink flex-row items-center justify-center gap-1.5 rounded-full border border-border/80 bg-card px-3 shadow-xs active:bg-secondary'
          : 'h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card shadow-xs active:bg-secondary',
        (disabled || loading) && 'opacity-70',
        className
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <ActionIcon size={16} color={iconColor} strokeWidth={2.5} />
      )}
      {label ? (
        <Text
          className="min-w-0 shrink text-[13px] font-extrabold text-foreground"
          numberOfLines={1}
          minimumFontScale={0.75}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default HeaderActionButton;
