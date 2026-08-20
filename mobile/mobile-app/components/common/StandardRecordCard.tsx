import React from 'react';
import { View, Pressable, Image, Platform, type PressableProps } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface StandardRecordCardDateSquare {
  top: string;    // e.g. "24" or "WED"
  bottom: string; // e.g. "AUG" or "10:30 AM"
}

export interface StandardRecordCardProps extends Omit<PressableProps, 'title' | 'description'> {
  // Center Slot
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  description?: string | React.ReactNode;

  // Left Slot: Avatar, Icon, Date Square, or Custom Node
  leftAvatar?: string;
  leftAvatarFallback?: string;
  leftIcon?: string | LucideIcon;
  leftIconBgColor?: string;
  leftIconColor?: string;
  leftDateSquare?: StandardRecordCardDateSquare;
  leftContent?: React.ReactNode;

  // Right Slot: StatusBadge, Timestamp, Chevron, or Custom Action
  status?: { label: string; variant?: StatusVariant };
  statusBadge?: React.ReactNode;
  timestamp?: string | Date;
  showChevron?: boolean;
  rightContent?: React.ReactNode;

  // Variant & Interaction
  variant?: 'card' | 'row';
  className?: string;
  isLastItem?: boolean;
}

export function formatCardTimestamp(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString();
}

export const StandardRecordCard = React.forwardRef<View, StandardRecordCardProps>(
  (
    {
      title,
      subtitle,
      description,
      leftAvatar,
      leftAvatarFallback,
      leftIcon,
      leftIconBgColor,
      leftIconColor,
      leftDateSquare,
      leftContent,
      status,
      statusBadge,
      timestamp,
      showChevron = false,
      rightContent,
      variant = 'card',
      onPress,
      onLongPress,
      className,
      isLastItem = false,
      disabled = false,
      testID,
      ...props
    },
    ref
  ) => {
    // Resolve Lucide Icon if string or LucideIcon component
    const ResolvedIcon: LucideIcon | null = React.useMemo(() => {
      if (!leftIcon) return null;
      if (typeof leftIcon === 'string') {
        return (LucideIcons as Record<string, any>)[leftIcon] || null;
      }
      return leftIcon;
    }, [leftIcon]);

    const isCard = variant === 'card';
    const isInteractive = Boolean(onPress || onLongPress);

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled || !isInteractive}
        accessibilityRole={rightContent ? undefined : (isInteractive ? 'button' : undefined)}
        testID={testID}
        {...props}
        className={cn(
          isCard
            ? 'bg-card border border-border rounded-xl p-3 mb-2.5 shadow-xs flex-row items-center justify-between'
            : cn(
                'flex-row items-center justify-between bg-card px-4 py-3',
                !isLastItem && 'border-b border-border/40'
              ),
          isInteractive && 'active:opacity-80 active:bg-accent/40',
          disabled && 'opacity-50',
          Platform.select({
            web: isInteractive ? 'cursor-pointer select-none transition-all duration-150' : undefined,
          }),
          className
        )}
      >
        {/* 1. Left Slot: Avatar | Icon | Date Square | Custom Node */}
        <View className="flex-row items-center flex-1 min-w-0 me-3">
          {leftContent ? (
            <View className="me-3">{leftContent}</View>
          ) : leftAvatar ? (
            <View className="size-10 rounded-full bg-muted border border-border overflow-hidden me-3 items-center justify-center">
              <Image
                source={{ uri: leftAvatar }}
                className="w-full h-full"
                accessibilityLabel="Record Avatar"
              />
            </View>
          ) : leftAvatarFallback ? (
            <View className="size-10 rounded-full bg-primary/10 border border-primary/20 me-3 items-center justify-center">
              <Text className="text-xs font-bold text-primary">{leftAvatarFallback}</Text>
            </View>
          ) : leftDateSquare ? (
            <View className="size-11 rounded-xl bg-muted border border-border me-3 items-center justify-center p-1">
              <Text className="text-xs font-extrabold text-foreground leading-none">
                {leftDateSquare.top}
              </Text>
              <Text className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5 tracking-tighter">
                {leftDateSquare.bottom}
              </Text>
            </View>
          ) : ResolvedIcon ? (
            <View
              className={cn(
                'size-10 rounded-xl items-center justify-center me-3',
                leftIconBgColor || 'bg-primary/10 border border-primary/20'
              )}
            >
              <ResolvedIcon
                size={18}
                color={leftIconColor || 'hsl(var(--primary))'}
              />
            </View>
          ) : null}

          {/* 2. Center Slot: Title, Subtitle, Description */}
          <View className="flex-1 min-w-0 justify-center">
            {typeof title === 'string' ? (
              <Text
                className="text-sm font-bold text-foreground"
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : (
              title
            )}

            {subtitle ? (
              typeof subtitle === 'string' ? (
                <Text
                  className="text-xs font-semibold text-muted-foreground mt-0.5"
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : (
                subtitle
              )
            ) : null}

            {description ? (
              typeof description === 'string' ? (
                <Text
                  className="text-[11px] text-muted-foreground/80 mt-1"
                  numberOfLines={2}
                >
                  {description}
                </Text>
              ) : (
                description
              )
            ) : null}
          </View>
        </View>

        {/* 3. Right Slot: StatusBadge | Timestamp | Action CTA | Chevron */}
        <View className="flex-row items-center gap-2 shrink-0 ms-1">
          {timestamp ? (
            <Text className="text-[10px] font-medium text-muted-foreground/70">
              {formatCardTimestamp(timestamp)}
            </Text>
          ) : null}

          {status ? (
            <StatusBadge
              label={status.label}
              variant={status.variant || 'neutral'}
              size="sm"
            />
          ) : statusBadge ? (
            statusBadge
          ) : null}

          {rightContent}

          {showChevron ? (
            <ChevronRight size={18} className="text-muted-foreground/60" />
          ) : null}
        </View>
      </Pressable>
    );
  }
);

StandardRecordCard.displayName = 'StandardRecordCard';

export default StandardRecordCard;