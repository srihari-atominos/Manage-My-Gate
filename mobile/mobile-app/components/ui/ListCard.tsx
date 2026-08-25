import * as React from 'react';
import { View, Pressable, Platform, Image, type PressableProps } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { cva } from 'class-variance-authority';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface ListCardDateSquare {
  top: string;    // e.g. "24" or "WED"
  bottom: string; // e.g. "AUG" or "10:30 AM"
}

export interface ListCardProps extends Omit<PressableProps, 'title' | 'description' | 'children'> {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  description?: string | React.ReactNode;

  // Left Slot: Icon, Image, Avatar, Date Square, or Custom Node
  leftIcon?: string | LucideIcon;       // Lucide icon name string or LucideIcon component
  leftImage?: string;                   // Image URL for left square
  leftAvatar?: string;                  // Image URL for circular avatar
  leftAvatarFallback?: string;          // 2-letter initials for circular avatar fallback
  leftDateSquare?: ListCardDateSquare;  // Date badge with top/bottom text
  leftContent?: React.ReactNode;        // Custom left slot
  backgroundImage?: string;             // Full card background image URL
  leftIconBgColor?: string;             // icon container bg hex or Tailwind class
  leftIconColor?: string;               // icon color hex or theme token

  // Right Slot: StatusBadge, SecondaryBadge, Timestamp, Chevron, or Custom Action
  status?: { label: string; variant?: StatusVariant };
  secondaryBadge?: { label: string; variant?: StatusVariant };
  timestamp?: string | Date;            // shows relative time or formatted date
  showChevron?: boolean;                // explicitly show or hide chevron
  rightContent?: React.ReactNode;       // custom right slot (amount, cta button)

  // Layout & Interaction
  variant?: 'card' | 'row';             // 'card' (default with border & radius) or 'row' (border-b list row)
  isLastItem?: boolean;                 // for 'row' variant to suppress bottom border
  className?: string;
  children?: React.ReactNode | ((state: any) => React.ReactNode); // Child content rendered below the main row
}

export function formatRelativeTime(date: string | Date): string {
  if (!date) return '';
  const past = new Date(date);
  if (isNaN(past.getTime())) return String(date);

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
    'p-3 flex-col active:bg-accent/50 active:opacity-90',
    Platform.select({
      web: 'transition-colors cursor-pointer select-none',
    })
  ),
  {
    variants: {
      variant: {
        card: 'bg-card rounded-xl border border-border mb-2.5 shadow-xs',
        row: 'bg-card px-4 py-3',
      },
    },
    defaultVariants: {
      variant: 'card',
    },
  }
);

const ListCard = React.forwardRef<View, ListCardProps>(
  (
    {
      title,
      subtitle,
      description,
      leftIcon,
      leftImage,
      leftAvatar,
      leftAvatarFallback,
      leftDateSquare,
      leftContent,
      backgroundImage,
      leftIconBgColor,
      leftIconColor,
      status,
      secondaryBadge,
      timestamp,
      showChevron,
      rightContent,
      variant = 'card',
      isLastItem = false,
      onPress,
      onLongPress,
      disabled = false,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    // Resolve Lucide Icon if string or LucideIcon component
    const DynamicIcon: LucideIcon | undefined = React.useMemo(() => {
      if (!leftIcon) return undefined;
      if (typeof leftIcon === 'string') {
        return (LucideIcons as Record<string, any>)[leftIcon] || undefined;
      }
      return leftIcon;
    }, [leftIcon]);

    const isCard = variant === 'card';
    const isInteractive = Boolean(onPress || onLongPress);
    const isCustomBgClass = leftIconBgColor && leftIconBgColor.startsWith('bg-');
    const hasChildren = Boolean(children);
    const hasCustomRightContent = rightContent !== undefined;

    // Helper to render the Left Slot
    const renderLeftSlot = () => {
      if (leftContent) {
        return <View className="me-3 shrink-0">{leftContent}</View>;
      }
      if (leftImage) {
        return (
          <Image
            source={{ uri: leftImage }}
            className="w-10 h-10 rounded-lg shrink-0 me-3"
            resizeMode="cover"
          />
        );
      }
      if (leftAvatar) {
        return (
          <View className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden me-3 items-center justify-center shrink-0">
            <Image
              source={{ uri: leftAvatar }}
              className="w-full h-full"
              accessibilityLabel="Record Avatar"
            />
          </View>
        );
      }
      if (leftAvatarFallback) {
        return (
          <View className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 me-3 items-center justify-center shrink-0">
            <Text className="text-xs font-bold text-primary">{leftAvatarFallback}</Text>
          </View>
        );
      }
      if (leftDateSquare) {
        return (
          <View className="w-11 h-11 rounded-xl bg-muted border border-border me-3 items-center justify-center p-1 shrink-0">
            <Text className="text-xs font-extrabold text-foreground leading-none">
              {leftDateSquare.top}
            </Text>
            <Text className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5 tracking-tighter">
              {leftDateSquare.bottom}
            </Text>
          </View>
        );
      }
      if (DynamicIcon) {
        return (
          <View
            className={cn(
              "w-10 h-10 rounded-xl items-center justify-center shrink-0 me-3",
              isCustomBgClass ? leftIconBgColor : !leftIconBgColor && "bg-primary/10 border border-primary/20"
            )}
            style={leftIconBgColor && !isCustomBgClass ? { backgroundColor: leftIconBgColor } : undefined}
          >
            <Icon
              as={DynamicIcon}
              size={18}
              color={leftIconColor}
              className={!leftIconColor ? "text-primary" : undefined}
            />
          </View>
        );
      }
      return null;
    };

    // Helper to render Middle Details
    const renderMiddleDetails = () => {
      return (
        <View className="flex-1 justify-center min-w-0">
          {typeof title === 'string' ? (
            <Text
              variant="default"
              className={cn("font-semibold text-sm", backgroundImage ? "text-white" : "text-foreground")}
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
                variant="muted"
                numberOfLines={1}
                className={cn("mt-0.5 text-xs font-medium", backgroundImage ? "text-white/80" : "text-muted-foreground")}
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
                variant="muted"
                numberOfLines={2}
                className={cn("mt-0.5 text-[11px] text-muted-foreground/80", backgroundImage && "text-white/70")}
              >
                {description}
              </Text>
            ) : (
              description
            )
          ) : null}

          {timestamp && !isCard ? (
            <Text
              variant="muted"
              className={cn("text-[10px] mt-0.5", backgroundImage ? "text-white/60" : "text-muted-foreground/70")}
            >
              {formatRelativeTime(timestamp)}
            </Text>
          ) : null}
        </View>
      );
    };

    // Helper to render Right Slot
    const renderRightSlot = () => {
      return (
        <View className="items-end justify-center gap-1 ms-2 shrink-0">
          {timestamp && isCard ? (
            <Text
              variant="muted"
              className={cn("text-[10px] font-medium", backgroundImage ? "text-white/60" : "text-muted-foreground/70")}
            >
              {formatRelativeTime(timestamp)}
            </Text>
          ) : null}

          {hasCustomRightContent ? (
            rightContent
          ) : showChevron !== false && (
            <Icon
              as={ChevronRight}
              size={18}
              className={backgroundImage ? "text-white/70" : "text-muted-foreground/60"}
            />
          )}

          {status ? (
            <StatusBadge
              label={status.label}
              variant={status.variant || 'neutral'}
              size="sm"
            />
          ) : null}

          {secondaryBadge ? (
            <StatusBadge
              label={secondaryBadge.label}
              variant={secondaryBadge.variant || 'neutral'}
              size="sm"
            />
          ) : null}
        </View>
      );
    };

    // Background Image Element
    const renderBackground = () => {
      if (!backgroundImage) return null;
      return (
        <>
          <Image
            source={{ uri: backgroundImage }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/60" />
        </>
      );
    };

    const resolvedStyle = typeof style === 'function' ? (style as any)({ pressed: false }) : style;

    // Case 1: Complex Card (has children or custom interactive right content)
    // Prevents HTML DOM invalid nesting (<button> inside <button>) on web.
    if (hasChildren || (hasCustomRightContent && isInteractive)) {
      return (
        <View
          ref={ref}
          className={cn(
            listCardVariants({ variant }),
            !isCard && !isLastItem && 'border-b border-border/40',
            disabled && 'opacity-50',
            'overflow-hidden',
            className
          )}
          style={resolvedStyle}
          {...props}
        >
          {renderBackground()}

          {/* Main Top Row */}
          {isInteractive ? (
            <View className="flex-row items-center w-full">
              {hasCustomRightContent ? (
                <>
                  <Pressable
                    onPress={onPress}
                    onLongPress={onLongPress}
                    disabled={disabled}
                    accessibilityRole="button"
                    className="flex-1 flex-row items-center active:opacity-75 cursor-pointer"
                  >
                    {renderLeftSlot()}
                    {renderMiddleDetails()}
                  </Pressable>
                  {renderRightSlot()}
                </>
              ) : (
                <Pressable
                  onPress={onPress}
                  onLongPress={onLongPress}
                  disabled={disabled}
                  accessibilityRole="button"
                  className="flex-row items-center w-full active:opacity-75 cursor-pointer"
                >
                  {renderLeftSlot()}
                  {renderMiddleDetails()}
                  {renderRightSlot()}
                </Pressable>
              )}
            </View>
          ) : (
            <View className="flex-row items-center w-full">
              {renderLeftSlot()}
              {renderMiddleDetails()}
              {renderRightSlot()}
            </View>
          )}

          {/* Children / Bottom Actions Slot */}
          {hasChildren && (
            <View className="w-full mt-2.5">
              {typeof children === 'function' ? (children as any)({ pressed: false }) : children}
            </View>
          )}
        </View>
      );
    }

    // Case 2: Simple Card without Children / Custom Right Actions
    if (isInteractive) {
      return (
        <Pressable
          ref={ref}
          onPress={onPress}
          onLongPress={onLongPress}
          disabled={disabled}
          accessibilityRole="button"
          className={cn(
            listCardVariants({ variant }),
            'active:bg-accent/50 active:opacity-90',
            Platform.select({ web: 'cursor-pointer' }),
            !isCard && !isLastItem && 'border-b border-border/40',
            disabled && 'opacity-50',
            'overflow-hidden',
            className
          )}
          style={style}
          {...props}
        >
          {renderBackground()}

          <View className="flex-row items-center w-full">
            {renderLeftSlot()}
            {renderMiddleDetails()}
            {renderRightSlot()}
          </View>
        </Pressable>
      );
    }

    // Case 3: Simple Static View
    return (
      <View
        ref={ref}
        className={cn(
          listCardVariants({ variant }),
          !isCard && !isLastItem && 'border-b border-border/40',
          disabled && 'opacity-50',
          'overflow-hidden',
          className
        )}
        style={resolvedStyle}
        {...props}
      >
        {renderBackground()}

        <View className="flex-row items-center w-full">
          {renderLeftSlot()}
          {renderMiddleDetails()}
          {renderRightSlot()}
        </View>
      </View>
    );
  }
);

ListCard.displayName = 'ListCard';

export { ListCard, listCardVariants };
export default ListCard;
