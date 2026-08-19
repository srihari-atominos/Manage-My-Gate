import * as React from 'react';
import { View, Pressable, Platform, Image } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { cva } from 'class-variance-authority';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface ListCardProps extends Omit<React.ComponentPropsWithoutRef<typeof Pressable>, 'title'> {
  title: string;
  subtitle?: string;
  leftIcon?: string;               // Lucide icon name
  leftImage?: string;              // Image URL for left square
  backgroundImage?: string;        // Full card background image URL
  leftIconBgColor?: string;        // icon container bg hex
  leftIconColor?: string;          // icon color hex
  status?: { label: string; variant: StatusVariant };
  secondaryBadge?: { label: string; variant: StatusVariant };
  timestamp?: string | Date;       // shows relative time (e.g., '2h ago')
  rightContent?: React.ReactNode;  // custom right slot (amount, chevron)
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
}

export function formatRelativeTime(date: string | Date): string {
  if (!date) return '';
  const past = new Date(date);
  if (isNaN(past.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return past.toLocaleDateString();
}

const listCardVariants = cva(
  cn(
    'bg-card rounded-lg border border-border mb-2 p-3 flex-row items-center active:bg-accent/50 active:opacity-90',
    Platform.select({
      web: 'transition-colors cursor-pointer select-none',
    })
  ),
  {
    variants: {},
    defaultVariants: {},
  }
);

const ListCard = React.forwardRef<View, ListCardProps>(
  (
    {
      title,
      subtitle,
      leftIcon,
      leftImage,
      backgroundImage,
      leftIconBgColor = '#dbeafe',
      leftIconColor = '#2563eb',
      status,
      secondaryBadge,
      timestamp,
      rightContent,
      onPress,
      onLongPress,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const DynamicIcon = leftIcon ? (LucideIcons as Record<string, any>)[leftIcon] : undefined;

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        className={cn(listCardVariants(), 'overflow-hidden', className)}
        style={style}
        accessibilityRole={rightContent !== undefined ? undefined : 'button'}
        {...props}
      >
        {/* Background Image & Overlay */}
        {backgroundImage ? (
          <>
            <Image
              source={{ uri: backgroundImage }}
              className="absolute inset-0 w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/60" />
          </>
        ) : null}

        {/* Left Icon / Image Container */}
        {leftImage ? (
          <Image
            source={{ uri: leftImage }}
            className="w-10 h-10 rounded-lg shrink-0 mr-3"
            resizeMode="cover"
          />
        ) : DynamicIcon ? (
          <View
            className="w-10 h-10 rounded-lg items-center justify-center shrink-0 mr-3"
            style={{ backgroundColor: leftIconBgColor }}
          >
            <Icon as={DynamicIcon} size={20} color={leftIconColor} />
          </View>
        ) : null}

        {/* Middle Details */}
        <View className="flex-1 justify-center">
          <Text variant="default" className={cn("font-semibold", backgroundImage ? "text-white" : "text-foreground")} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="muted" numberOfLines={1} className={cn("mt-0.5", backgroundImage ? "text-white/80" : "text-muted-foreground")}>
              {subtitle}
            </Text>
          ) : null}
          {timestamp ? (
            <Text variant="muted" className={cn("text-xs mt-0.5", backgroundImage ? "text-white/60" : "text-muted-foreground")}>
              {formatRelativeTime(timestamp)}
            </Text>
          ) : null}
        </View>

        {/* Right Action / Badges */}
        <View className="items-end justify-center gap-1 ml-2 shrink-0">
          {rightContent !== undefined ? (
            rightContent
          ) : (
            <Icon as={ChevronRight} size={18} className={backgroundImage ? "text-white/70" : "text-muted-foreground"} />
          )}
          {status ? (
            <StatusBadge label={status.label} variant={status.variant} size="sm" />
          ) : null}
          {secondaryBadge ? (
            <StatusBadge label={secondaryBadge.label} variant={secondaryBadge.variant} size="sm" />
          ) : null}
        </View>
      </Pressable>
    );
  }
);

ListCard.displayName = 'ListCard';

export { ListCard, listCardVariants };
