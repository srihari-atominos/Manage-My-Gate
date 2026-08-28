import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import * as React from 'react';
import { View } from 'react-native';

export interface TimelineItemProps {
  senderName: string;
  content: string;
  timestamp: string;
  type?: 'comment' | 'status_change' | 'system';
  isLast?: boolean;     // hides connector line
  className?: string;
}

export function formatTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (isNaN(d.getTime()) || diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export const DOT_COLORS: Record<NonNullable<TimelineItemProps['type']>, string> = {
  comment: '#2563eb',
  status_change: '#16a34a',
  system: '#737373',
};

const timelineItemVariants = cva(
  'flex-row',
  {
    variants: {
      type: {
        comment: '',
        status_change: '',
        system: '',
      },
    },
    defaultVariants: {
      type: 'comment',
    },
  }
);

const TimelineItem = React.forwardRef<View, TimelineItemProps>(
  (
    {
      senderName,
      content,
      timestamp,
      type = 'comment',
      isLast = false,
      className,
    },
    ref
  ) => {
    const dotColor = DOT_COLORS[type] || DOT_COLORS.comment;
    const formattedTime = formatTime(timestamp);

    return (
      <View
        ref={ref}
        className={cn(timelineItemVariants({ type }), className)}
      >
        {/* Left Indicator Column: Circle dot & vertical line connector */}
        <View className="items-center shrink-0">
          <View
            className="w-2 h-2 rounded-full mt-1.5"
            style={{ backgroundColor: dotColor }}
          />
          {!isLast ? (
            <View className="w-[2px] bg-border flex-1 mt-1" />
          ) : null}
        </View>

        {/* Right Side Content */}
        <View className="ml-3 flex-1 pb-4">
          <Text variant="default" className="font-semibold text-sm">
            {senderName}
          </Text>
          <Text variant="default" className="text-sm text-foreground mt-1">
            {content}
          </Text>
          <Text variant="muted" className="text-xs mt-1">
            {formattedTime}
          </Text>
        </View>
      </View>
    );
  }
);

TimelineItem.displayName = 'TimelineItem';

export { TimelineItem, timelineItemVariants };
