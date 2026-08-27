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
  variant?: string;
  leftIcon?: string | React.ComponentType<any>; // Lucide icon name or component
  leftImage?: string;              // Image URL for left square
  leftAvatar?: string;             // Avatar image URL
  leftAvatarFallback?: string;      // Fallback text avatar initials
  showChevron?: boolean;           // Toggle chevron right icon
  isLastItem?: boolean;
  disableRelativeTime?: boolean;
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
    'bg-card rounded-2xl border border-border/80 mb-3 p-3.5 flex-row items-center active:bg-secondary/60',
    Platform.select({
      web: 'transition-all cursor-pointer select-none hover:border-border',
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
      leftAvatar,
      leftAvatarFallback,
      showChevron,
      backgroundImage,
      leftIconBgColor = 'rgba(59, 130, 246, 0.12)',
      leftIconColor = '#3b82f6',
      status,
      secondaryBadge,
      timestamp,
      rightContent,
      children,
      onPress,
      onLongPress,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const DynamicIcon = typeof leftIcon === 'string' ? (LucideIcons as Record<string, any>)[leftIcon] : leftIcon;
    const showDefaultChevron = showChevron && rightContent === undefined;

    const renderCardHeader = () => (
      <View className="flex-row items-center w-full">
        {/* Left Avatar / Image / Icon Container */}
        {leftAvatar ? (
          <Image
            source={{ uri: leftAvatar }}
            className="w-10 h-10 rounded-full shrink-0 me-3 border border-border/50"
            resizeMode="cover"
          />
        ) : leftAvatarFallback ? (
          <View className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 items-center justify-center me-3 shrink-0">
            <Text className="text-xs font-bold text-primary">{leftAvatarFallback}</Text>
          </View>
        ) : leftImage ? (
          <Image
            source={{ uri: leftImage }}
            className="w-11 h-11 rounded-xl shrink-0 me-3.5"
            resizeMode="cover"
          />
        ) : DynamicIcon ? (
          <View
            className="w-11 h-11 rounded-xl items-center justify-center shrink-0 me-3.5 border border-border/50"
            style={{ backgroundColor: leftIconBgColor }}
          >
            <Icon as={DynamicIcon} size={20} color={leftIconColor} />
          </View>
        ) : null}

        {/* Middle Details */}
        <View className="flex-1 justify-center min-w-0">
          <Text variant="default" className={cn("font-semibold text-[15px] font-sans tracking-tight", backgroundImage ? "text-white" : "text-foreground")} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="muted" numberOfLines={1} className={cn("mt-0.5 text-[13px] font-sans font-medium", backgroundImage ? "text-white/80" : "text-muted-foreground")}>
              {subtitle}
            </Text>
          ) : null}
          {timestamp ? (
            <Text variant="muted" className={cn("text-[11px] font-sans mt-0.5", backgroundImage ? "text-white/60" : "text-muted-foreground/80")}>
              {formatRelativeTime(timestamp)}
            </Text>
          ) : null}
        </View>

        {/* Right Action / Badges */}
        <View className="items-end justify-center gap-1 ms-2 shrink-0">
          {status ? (
            <StatusBadge label={status.label} variant={status.variant} size="sm" />
          ) : null}
          {secondaryBadge ? (
            <StatusBadge label={secondaryBadge.label} variant={secondaryBadge.variant} size="sm" />
          ) : null}
          {rightContent !== undefined ? (
            rightContent
          ) : showDefaultChevron ? (
            <Icon as={ChevronRight} size={16} className={backgroundImage ? "text-white/70" : "text-muted-foreground"} />
          ) : null}
        </View>
      </View>
    );

    if (children) {
      return (
        <View
          ref={ref}
          className={cn("bg-card rounded-2xl border border-border/80 mb-3 p-3.5 overflow-hidden", className)}
          style={style as any}
        >
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
          >
            {renderCardHeader()}
          </Pressable>
          {typeof children === 'function' ? (children as any)({ pressed: false }) : children}
        </View>
      );
    }

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

        {renderCardHeader()}
      </Pressable>
    );
  }
);

ListCard.displayName = 'ListCard';

export { ListCard, listCardVariants };
